import manifest from './manifest.json';
import { FigletWorker, type ToolRuntime } from './worker-client';
import { safeToolOutput, shellArgv } from './shell-argv';
import type { CommandResult } from '../commands';

const STORAGE_KEY = 'boot-loader:tools:v1';
export const toolDefinition = Object.freeze({id:'figlet',version:'1.12.0',adapter:'figlet-browser-v1',command:'figlet',description:'Render text with the npm FIGlet CLI'});
export function validateToolManifest(value:unknown):boolean {
  return JSON.stringify(value) === JSON.stringify({version:1,tools:[toolDefinition]});
}
export interface ToolStorage { getItem(key:string):string|null; setItem(key:string,value:string):void }
function browserStorage():ToolStorage|undefined { try{return globalThis.localStorage;}catch{return undefined;} }

/** Code-owned allowlist. Saved records enable tools, never supply executable code. */
export class ToolRegistry {
  private enabled = false;
  private generation = 0;
  private runtime?:ToolRuntime;
  private installing?:Promise<CommandResult>;
  private operations = new Set<AbortController>();
  private sessionOnly = false;
  private disposed = false;
  constructor(private storage:ToolStorage|undefined=browserStorage(), private factory:()=>ToolRuntime=()=>new FigletWorker(), private timeoutMs=15000) {
    if(!validateToolManifest(manifest))return;
    try {
      const saved=storage?.getItem(STORAGE_KEY);
      if(saved && saved.length<=1024) {
        const value=JSON.parse(saved);
        this.enabled=JSON.stringify(value)===JSON.stringify({version:1,tools:[{id:'figlet',version:toolDefinition.version}]});
      }
    }catch{this.sessionOnly=true;}
  }
  get commands():readonly typeof toolDefinition[] {return this.enabled?[toolDefinition]:[];}
  private save():boolean {
    try {
      if(!this.storage)throw Error('No storage');
      this.storage.setItem(STORAGE_KEY,JSON.stringify({version:1,tools:this.enabled?[{id:'figlet',version:toolDefinition.version}]:[]}));
      this.sessionOnly=false; return true;
    }catch{this.sessionOnly=true;return false;}
  }
  private async operation<T>(signal:AbortSignal|undefined, action:(runtime:ToolRuntime,signal:AbortSignal)=>Promise<T>):Promise<T> {
    if(this.disposed || signal?.aborted)throw Error('Command cancelled.');
    const controller=new AbortController(); this.operations.add(controller);
    let timer:ReturnType<typeof setTimeout>|undefined;
    const cancel=()=>controller.abort(); signal?.addEventListener('abort',cancel,{once:true});
    const interrupted=new Promise<never>((_,reject)=>{
      controller.signal.addEventListener('abort',()=>reject(Error('Command cancelled or timed out.')),{once:true});
      timer=setTimeout(cancel,this.timeoutMs);
    });
    try {this.runtime??=this.factory();return await Promise.race([action(this.runtime,controller.signal),interrupted]);}
    finally {clearTimeout(timer);signal?.removeEventListener('abort',cancel);this.operations.delete(controller);}
  }
  /** Reboot/pagehide cancel in-flight work while retaining committed enablement. */
  cancel():void {this.generation++;for(const operation of this.operations)operation.abort();this.operations.clear();this.runtime?.dispose();this.runtime=undefined;this.installing=undefined;}
  dispose():void {this.cancel();this.disposed=true;}
  handles(input:string):boolean {const name=input.trim().split(/\s/,1)[0].toLowerCase();return ['install','uninstall'].includes(name)||this.commands.some(item=>item.command===name);}
  async execute(input:string,signal?:AbortSignal):Promise<CommandResult> {
    if(input.length>2200)return {lines:['Command is too long (maximum 2200 characters).']};
    let args:string[];
    try{args=shellArgv(input);}catch(error){return {lines:[(error as Error).message]};}
    const command=args.shift()?.toLowerCase();
    if(command==='uninstall') {
      if(args.length!==1||args[0]!=='figlet')return {lines:['Usage: uninstall figlet']};
      this.cancel();this.enabled=false;
      return {lines:[this.save()?'Uninstalled figlet.':'Uninstalled figlet for this session. Storage is unavailable; a previously saved installation may return after reload.']};
    }
    if(command==='install') {
      if(args.length!==1||args[0]!=='figlet')return {lines:['Usage: install figlet (only trusted bundled tools are supported).']};
      if(this.enabled)return {lines:[`figlet is already enabled${this.sessionOnly?' for this session':''}.`]};
      if(this.installing)return this.installing;
      const generation=this.generation;
      const install=(async()=>{
        try {
          if(!validateToolManifest(manifest))throw Error('Invalid trusted tools manifest.');
          await this.operation(signal,(runtime,abort)=>runtime.load(abort));
          if(generation!==this.generation||signal?.aborted||this.disposed)throw Error('Command cancelled.');
          this.enabled=true;
          return {lines:[this.save()?'Installed figlet 1.12.0. Try: figlet hello':'Installed figlet 1.12.0 for this session only (storage unavailable). Try: figlet hello']};
        }catch(error){return {lines:[`Install failed: ${(error as Error).message}`]};}
      })();
      this.installing=install;
      void install.finally(()=>{if(this.installing===install)this.installing=undefined;});
      return install;
    }
    if(command!=='figlet'||!this.enabled)return {lines:['Tool is not installed. Use install figlet.']};
    const generation=this.generation;
    try {
      const output=await this.operation(signal,async(runtime,abort)=>{await runtime.load(abort);return runtime.run(args,abort);});
      if(generation!==this.generation||signal?.aborted||!this.enabled)throw Error('Command cancelled.');
      if(output.stdout.length+output.stderr.length>262144)throw Error('Tool output exceeded 256 KiB.');
      const text=safeToolOutput(output.stdout+output.stderr).replace(/\n$/,'');
      return {lines:text?text.split('\n'):[],exitCode:output.exitCode};
    }catch(error){return {lines:[`figlet: ${(error as Error).message}`],exitCode:1};}
  }
}
