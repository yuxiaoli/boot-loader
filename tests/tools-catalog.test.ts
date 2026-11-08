import { afterEach, expect, test, vi } from 'vitest';
import manifest from '../src/tools/manifest.json';

afterEach(()=>{
  vi.doUnmock('../src/tools/manifest.json');
  vi.resetModules();
});

test('a future supported manifest package is listed, installable and independently retained',async()=>{
  // A synthetic package reuses the approved adapter; no second production package is added.
  const future={...manifest.tools[0],id:'future-tool',command:'future',version:'2.0.0',description:'Future package fixture'};
  const tools=[...manifest.tools,future];
  vi.doMock('../src/tools/manifest.json',()=>({default:{version:1,tools}}));
  const {ToolRegistry}=await import('../src/tools/registry');
  let saved:string|null=null;
  const storage={getItem:()=>saved,setItem:(_key:string,value:string)=>{saved=value;}};
  const runtime={load:vi.fn(async()=>{}),run:vi.fn(async()=>({stdout:'future output\n',stderr:'',exitCode:0})),dispose:vi.fn()};
  const registry=new ToolRegistry(storage,()=>runtime);
  const list=(await registry.execute('install --list')).lines;
  expect(list.slice(1,-1)).toEqual(tools.map(tool=>`  ${tool.id}@${tool.version}  ${tool.description}`));
  for(const tool of tools) {
    expect((await registry.execute(`install ${tool.id}`)).lines[0]).toContain(`Installed ${tool.id} ${tool.version}`);
  }
  expect(registry.commands.map(tool=>tool.command)).toEqual(tools.map(tool=>tool.command));
  expect(await registry.execute('future hello')).toEqual({lines:['future output'],exitCode:0});
  expect(new ToolRegistry(storage,()=>runtime).commands).toEqual(registry.commands);
  await registry.execute('uninstall future-tool');
  expect(registry.commands.map(tool=>tool.command)).toEqual(['figlet']);
  expect((await registry.execute('install --list')).lines).toEqual(list);
  registry.dispose();
});

test('future tool names are completed and protected from JSON command shadowing',async()=>{
  const future={...manifest.tools[0],id:'future-tool',command:'future'};
  vi.doMock('../src/tools/manifest.json',()=>({default:{version:1,tools:[...manifest.tools,future]}}));
  const {complete}=await import('../src/editor');
  const {parseCommandCatalog}=await import('../src/command-catalog');
  expect(complete('install future')).toEqual(['install future-tool']);
  expect(complete('uninstall future')).toEqual(['uninstall future-tool']);
  expect(()=>parseCommandCatalog(JSON.stringify({version:1,commands:[
    {name:'future',kind:'text',description:'Shadowed tool',lines:['wrong command']},
  ]}))).toThrow('Invalid command name');
});

test('manifest entries without a compiled adapter are neither listed nor installable',async()=>{
  const unsupported={...manifest.tools[0],id:'unsupported',command:'unsupported',adapter:'https://untrusted.example/tool.js'};
  vi.doMock('../src/tools/manifest.json',()=>({default:{version:1,tools:[...manifest.tools,unsupported]}}));
  const {ToolRegistry}=await import('../src/tools/registry');
  const {complete}=await import('../src/editor');
  const factory=vi.fn();
  const registry=new ToolRegistry({getItem:()=>null,setItem:vi.fn()},factory);
  expect((await registry.execute('install --list')).lines.join('\n')).not.toContain('unsupported');
  expect((await registry.execute('install unsupported')).lines[0]).toContain('Usage: install');
  expect(complete('install unsupported')).toEqual([]);
  expect(factory).not.toHaveBeenCalled();
});

test('a malformed bundled manifest fails closed before discovery, storage or installation',async()=>{
  const malformed={version:1,tools:[{...manifest.tools[0],url:'https://untrusted.example/tool.js'}]};
  vi.doMock('../src/tools/manifest.json',()=>({default:malformed}));
  const {ToolRegistry,validateToolManifest}=await import('../src/tools/registry');
  const storage={getItem:vi.fn(),setItem:vi.fn()};
  const factory=vi.fn();
  expect(validateToolManifest(malformed)).toBe(false);
  const registry=new ToolRegistry(storage,factory);
  expect((await registry.execute('install --list')).lines).toEqual(['Invalid trusted tools manifest.']);
  expect((await registry.execute('install figlet')).lines[0]).toContain('Usage: install');
  expect(storage.getItem).not.toHaveBeenCalled();
  expect(storage.setItem).not.toHaveBeenCalled();
  expect(factory).not.toHaveBeenCalled();
});
