import manifest from './manifest.json';
import type { ToolRuntime } from './worker-client';
import { trustedTools, toolRuntimeFactories, validateToolManifest, type ToolDefinition } from './catalog';
import { safeToolOutput, shellArgv } from './shell-argv';
import type { CommandResult } from '../commands';

const STORAGE_KEY = 'boot-loader:tools:v1';
export { validateToolManifest } from './catalog';
export const toolDefinition = trustedTools.find(tool=>tool.id==='figlet')!;
export interface ToolStorage { getItem(key:string):string|null; setItem(key:string,value:string):void }
function browserStorage():ToolStorage|undefined { try{return globalThis.localStorage;}catch{return undefined;} }

/** Code-owned allowlist. Saved records enable tools, never supply executable code. */
export class ToolRegistry {
  private enabled = new Set<string>();
  private generation = 0;
  private runtimes = new Map<string,ToolRuntime>();
  private installing = new Map<string,Promise<CommandResult>>();
  private operations = new Set<AbortController>();
  private sessionOnly = false;
  private disposed = false;
  constructor(private storage:ToolStorage|undefined=browserStorage(), private factory:(tool:ToolDefinition)=>ToolRuntime=tool=>toolRuntimeFactories[tool.adapter](), private timeoutMs=15000) {
    if(!validateToolManifest(manifest))return;
    try {
      const saved=storage?.getItem(STORAGE_KEY);
      if(saved && saved.length<=1024) {
        const value=JSON.parse(saved);
        if(value?.version===1&&Array.isArray(value.tools)) {
          const tools=trustedTools.filter(tool=>value.tools.some((record:unknown)=>JSON.stringify(record)===JSON.stringify({id:tool.id,version:tool.version})));
          if(JSON.stringify(value)===JSON.stringify({version:1,tools:tools.map(({id,version})=>({id,version}))}))this.enabled=new Set(tools.map(tool=>tool.id));
        }
      }
    }catch{this.sessionOnly=true;}
  }
  get commands():readonly ToolDefinition[] {return trustedTools.filter(tool=>this.enabled.has(tool.id));}
  private save():boolean {
    try {
      if(!this.storage)throw Error('No storage');
      this.storage.setItem(STORAGE_KEY,JSON.stringify({version:1,tools:this.commands.map(({id,version})=>({id,version}))}));
      this.sessionOnly=false; return true;
    }catch{this.sessionOnly=true;return false;}
  }
  private async operation<T>(tool:ToolDefinition, signal:AbortSignal|undefined, action:(runtime:ToolRuntime,signal:AbortSignal)=>Promise<T>):Promise<T> {
    if(this.disposed || signal?.aborted)throw Error('Command cancelled.');
    const controller=new AbortController(); this.operations.add(controller);
    let timer:ReturnType<typeof setTimeout>|undefined;
    const cancel=()=>controller.abort(); signal?.addEventListener('abort',cancel,{once:true});
    const interrupted=new Promise<never>((_,reject)=>{
      controller.signal.addEventListener('abort',()=>reject(Error('Command cancelled or timed out.')),{once:true});
      timer=setTimeout(cancel,this.timeoutMs);
    });
    try {
      let runtime=this.runtimes.get(tool.id);
      if(!runtime){runtime=this.factory(tool);this.runtimes.set(tool.id,runtime);}
      return await Promise.race([action(runtime,controller.signal),interrupted]);
    }
    finally {clearTimeout(timer);signal?.removeEventListener('abort',cancel);this.operations.delete(controller);}
  }
  /** Reboot/pagehide cancel in-flight work while retaining committed enablement. */
  cancel():void {this.generation++;for(const operation of this.operations)operation.abort();this.operations.clear();for(const runtime of this.runtimes.values())runtime.dispose();this.runtimes.clear();this.installing.clear();}
  dispose():void {this.cancel();this.disposed=true;}
  handles(input:string):boolean {const name=input.trim().split(/\s/,1)[0].toLowerCase();return ['install','uninstall'].includes(name)||this.commands.some(item=>item.command===name);}
  async execute(input:string,signal?:AbortSignal):Promise<CommandResult> {
    if(input.length>2200)return {lines:['Command is too long (maximum 2200 characters).']};
    let args:string[];
    try{args=shellArgv(input);}catch(error){return {lines:[(error as Error).message]};}
    const command=args.shift()?.toLowerCase();
    if(command==='uninstall') {
      const tool=trustedTools.find(tool=>tool.id===args[0]);
      if(args.length!==1||!tool)return {lines:['Usage: uninstall <package>']};
      this.cancel();this.enabled.delete(tool.id);
      return {lines:[this.save()?`Uninstalled ${tool.id}.`:`Uninstalled ${tool.id} for this session. Storage is unavailable; a previously saved installation may return after reload.`]};
    }
    if(command==='install') {
      if(args.length===1&&args[0]==='--list'&&!validateToolManifest(manifest))return {lines:['Invalid trusted tools manifest.']};
      if(args.length===1&&args[0]==='--list')return {lines:[
        'Available trusted packages:',
        ...trustedTools.map(tool=>`  ${tool.id}@${tool.version}  ${tool.description}`),
        'Use install <package> to enable a package.',
      ]};
      const tool=trustedTools.find(tool=>tool.id===args[0]);
      if(args.length!==1||!tool)return {lines:['Usage: install <package> | install --list (only trusted bundled tools are supported).']};
      if(this.enabled.has(tool.id))return {lines:[`${tool.id} is already enabled${this.sessionOnly?' for this session':''}.`]};
      const pending=this.installing.get(tool.id);
      if(pending)return pending;
      const generation=this.generation;
      const install=(async()=>{
        try {
          if(!validateToolManifest(manifest))throw Error('Invalid trusted tools manifest.');
          await this.operation(tool,signal,(runtime,abort)=>runtime.load(abort));
          if(generation!==this.generation||signal?.aborted||this.disposed)throw Error('Command cancelled.');
          this.enabled.add(tool.id);
          const saved=this.save();
          return {lines:[`Installed ${tool.id} ${tool.version}${saved?'':' for this session only (storage unavailable)'}. Try: ${tool.command} hello`]};
        }catch(error){return {lines:[`Install failed: ${(error as Error).message}`]};}
      })();
      this.installing.set(tool.id,install);
      void install.finally(()=>{if(this.installing.get(tool.id)===install)this.installing.delete(tool.id);});
      return install;
    }
    const tool=trustedTools.find(tool=>tool.command===command);
    if(!tool||!this.enabled.has(tool.id))return {lines:[`Tool is not installed. Use install ${tool?.id??'<package>'}.`]};
    const generation=this.generation;
    try {
      const output=await this.operation(tool,signal,async(runtime,abort)=>{await runtime.load(abort);return runtime.run(args,abort);});
      if(generation!==this.generation||signal?.aborted||!this.enabled.has(tool.id))throw Error('Command cancelled.');
      if(output.stdout.length+output.stderr.length>262144)throw Error('Tool output exceeded 256 KiB.');
      const text=safeToolOutput(output.stdout+output.stderr).replace(/\n$/,'');
      return {lines:text?text.split('\n'):[],exitCode:output.exitCode};
    }catch(error){return {lines:[`${tool.command}: ${(error as Error).message}`],exitCode:1};}
  }
}
