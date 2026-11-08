import { expect, test, vi } from 'vitest';
import { ToolRegistry, toolDefinition, validateToolManifest } from '../src/tools/registry';
import { safeToolOutput, shellArgv } from '../src/tools/shell-argv';
import { TerminalSession, executeCommand, runCommand } from '../src/commands';
import { complete } from '../src/editor';
import type { ToolRuntime } from '../src/tools/worker-client';
import manifest from '../src/tools/manifest.json';
function setup(load:ToolRuntime['load']=async()=>{}) {
  let value:string|null=null;
  const storage={getItem:()=>value,setItem:(_key:string,next:string)=>{value=next;}};
  const runtime={load:vi.fn(load),run:vi.fn(async(_argv:string[],_signal:AbortSignal)=>({stdout:'  art  \n',stderr:'',exitCode:0})),dispose:vi.fn()};
  const registry=new ToolRegistry(storage,()=>runtime,100);
  return {registry,runtime,storage};
}
test('shell boundary preserves quotes, empty words, case, escapes and literal -- without expansion',()=>{
  expect(shellArgv(`figlet -f "Dancing Font" 'Hello World'`)).toEqual(['figlet','-f','Dancing Font','Hello World']);
  expect(shellArgv(`figlet '' -- -hello`)).toEqual(['figlet','','--','-hello']);
  expect(shellArgv('figlet Hello\\ World')).toEqual(['figlet','Hello World']);
  expect(shellArgv('figlet "$HOME"')).toEqual(['figlet','$HOME']);
  expect(shellArgv(String.raw`figlet "a\qb"`)).toEqual(['figlet',String.raw`a\qb`]);
  expect(()=>shellArgv('figlet "oops')).toThrow('Unclosed');
  expect(()=>shellArgv('figlet \\')).toThrow('Unfinished');
});
test('tool output strips terminal controls and keeps art whitespace',()=>{
  expect(safeToolOutput('  A  \r\n\x1b[31mB\x1b[0m\x1b]0;title\x07\x00')).toBe('  A  \nB');
});
test('manifest rejects unknown executable or asset fields',()=>{
  expect(validateToolManifest({version:1,tools:[toolDefinition]})).toBe(true);
  expect(validateToolManifest({version:1,tools:[{...toolDefinition,url:'https://evil.example'}]})).toBe(false);
});
test('install --list discovers every available package without loading or saving',async()=>{
  const {registry,runtime,storage}=setup();
  const read=vi.spyOn(storage,'getItem');
  const write=vi.spyOn(storage,'setItem');
  const session=new TerminalSession(undefined,undefined,registry);
  expect((await runCommand('install --list',session)).lines).toEqual([
    'Available trusted packages:',
    ...manifest.tools.map(tool=>`  ${tool.id}@${tool.version}  ${tool.description}`),
    'Use install <package> to enable a package.',
  ]);
  expect(registry.commands).toEqual([]);
  expect(read).not.toHaveBeenCalled();
  expect(write).not.toHaveBeenCalled();
  expect(runtime.load).not.toHaveBeenCalled();
  expect(runtime.run).not.toHaveBeenCalled();
  expect(runtime.dispose).not.toHaveBeenCalled();
});
test('listing and malformed list options preserve installed records and normal installation',async()=>{
  const {registry,runtime,storage}=setup();
  const originalList=await registry.execute('install --list');
  for(const tool of manifest.tools)await registry.execute(`install ${tool.id}`);
  const saved=storage.getItem();
  const write=vi.spyOn(storage,'setItem');
  const loads=runtime.load.mock.calls.length;
  for(const input of ['install --list','  INSTALL   --list  ', 'install "--list"']) {
    expect(await registry.execute(input)).toEqual(originalList);
    expect(registry.commands).toEqual(manifest.tools);
  }
  for(const input of ['install','install --list figlet','install figlet --list','install --list --list','install --unknown','install -l','install FIGLET','install arbitrary-npm-package']) {
    expect((await registry.execute(input)).lines[0]).toContain('Usage: install <package> | install --list');
  }
  expect(runtime.load).toHaveBeenCalledTimes(loads);
  expect(runtime.run).not.toHaveBeenCalled();
  expect(runtime.dispose).not.toHaveBeenCalled();
  expect(write).not.toHaveBeenCalled();
  expect(storage.getItem()).toBe(saved);
  const restored=new ToolRegistry(storage,()=>runtime);
  expect(await restored.execute('install --list')).toEqual(originalList);
  expect((await restored.execute('install figlet')).lines).toEqual(['figlet is already enabled.']);
  expect((await restored.execute('figlet hi')).exitCode).toBe(0);
  await restored.execute('uninstall figlet');
  expect(await restored.execute('install --list')).toEqual(originalList);
});
test('install, effective help/completion/dispatch, reboot retention, uninstall and reinstall',async()=>{
  const {registry,runtime,storage}=setup();
  const session=new TerminalSession(undefined,undefined,registry);
  expect(registry.commands).toEqual([]);
  await runCommand('install figlet',session);
  expect(runtime.load).toHaveBeenCalledOnce();
  await runCommand('install figlet',session);expect(runtime.load).toHaveBeenCalledOnce();
  expect(executeCommand('help',session).lines.join('\n')).toContain('Render text with the npm FIGlet CLI');
  expect(complete('fi',[],undefined,[],[],undefined,registry.commands.map(t=>t.command))).toEqual(['figlet']);
  expect(await runCommand('figlet "Hello World"',session)).toEqual({lines:['  art  '],exitCode:0});
  expect(runtime.run.mock.calls[0][0]).toEqual(['Hello World']);
  registry.cancel();expect(registry.commands).toHaveLength(1);
  expect(new ToolRegistry(storage,()=>runtime).commands).toHaveLength(1);
  await registry.execute('uninstall figlet');expect(registry.commands).toEqual([]);
  expect(new ToolRegistry(storage,()=>runtime).commands).toEqual([]);
  await registry.execute('install figlet');expect(registry.commands).toHaveLength(1);
});
test('duplicate pending installs are deduplicated and cancellation cannot commit late registration',async()=>{
  let resolve!:()=>void;
  const {registry,runtime}=setup(()=>new Promise<void>(r=>resolve=r));
  const a=registry.execute('install figlet');const b=registry.execute('install figlet');
  expect(runtime.load).toHaveBeenCalledOnce();
  registry.cancel();resolve();
  await Promise.all([a,b]);expect(registry.commands).toEqual([]);
});
test('uninstall and disposal invalidate pending installs, including ignored aborts',async()=>{
  for(const dispose of [false,true]) {
    let resolve!:()=>void; const {registry}=setup(()=>new Promise<void>(r=>resolve=r));
    const pending=registry.execute('install figlet');
    if(dispose)registry.dispose();else await registry.execute('uninstall figlet');
    resolve();await pending;expect(registry.commands).toEqual([]);
  }
});
test('failed loading and timeout fail closed and permit retry',async()=>{
  const {registry,runtime}=setup(async()=>{throw Error('missing font');});
  expect((await registry.execute('install figlet')).lines[0]).toContain('missing font');
  expect(registry.commands).toEqual([]);
  runtime.load.mockImplementationOnce(()=>new Promise(()=>{}));
  expect((await registry.execute('install figlet')).lines[0]).toContain('timed out');
  expect(registry.commands).toEqual([]);
  runtime.load.mockImplementation(async()=>{});
  await registry.execute('install figlet');expect(registry.commands).toHaveLength(1);
});
test('blocked storage is session-only and corrupt/incompatible/extra records are rejected',async()=>{
  const runtime=setup().runtime;
  const blocked=new ToolRegistry({getItem(){throw Error('denied');},setItem(){throw Error('denied');}},()=>runtime);
  expect((await blocked.execute('install figlet')).lines[0]).toContain('session only');
  for(const raw of ['bad',JSON.stringify({version:1,tools:[{id:'figlet',version:'0.0.0'}]}),JSON.stringify({version:1,tools:[{id:'figlet',version:'1.12.0',url:'bad'}]})]) {
    expect(new ToolRegistry({getItem:()=>raw,setItem(){}},()=>runtime).commands).toEqual([]);
  }
});
test('abort signal suppresses install and art output is bounded',async()=>{
  const {registry,runtime}=setup();const abort=new AbortController();abort.abort();
  await registry.execute('install figlet',abort.signal);expect(registry.commands).toEqual([]);
  await registry.execute('install figlet');
  runtime.run.mockResolvedValueOnce({stdout:'x'.repeat(262145),stderr:'',exitCode:0});
  expect((await registry.execute('figlet hi')).lines[0]).toContain('256 KiB');
});
