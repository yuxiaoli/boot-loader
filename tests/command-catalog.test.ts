import { expect, test, vi } from 'vitest';
import { parseCommandCatalog, loadCommandCatalog, defaultCommandCatalog } from '../src/command-catalog';
test('accepts a valid catalogue of the four commands', () => {
  const fixture = {version: 1, commands: [
    {name:'intro',kind:'text',description:'Welcome and getting started',lines:['Welcome']},
    {name:'about',kind:'text',description:'Project background and author',lines:['About']},
    {name:'time',kind:'handler',description:'Local time and browser time zone',handler:'time'},
    {name:'reload',kind:'handler',description:'Reload the current page',handler:'reload'},
  ]};
  expect(parseCommandCatalog(JSON.stringify(fixture))).toMatchObject(fixture);
});
test('rejects unsupported version', () => { expect(() => parseCommandCatalog('{"version":2,"commands":[]}')).toThrow(); });
test('rejects unknown document fields', () => { expect(() => parseCommandCatalog('{"version":1,"commands":[],"script":"alert(1)"}')).toThrow(); });

test('failed fetch selects the bundled fallback', async () => {
 vi.stubGlobal('location', {origin:'https://example.com',href:'https://example.com/boot-loader/'});
 expect(await loadCommandCatalog('https://example.com/config.json', vi.fn().mockRejectedValue(Error('offline')))).toBe(defaultCommandCatalog);
 vi.unstubAllGlobals();
});

test('accepts the released asset without invoking command effects', async () => {
 vi.stubGlobal('location', {origin:'https://example.com',href:'https://example.com/boot-loader/terminal/'});
 const raw = await import('../src/command-catalog.json');
 const response = new Response(JSON.stringify(raw.default), {status:200});
 Object.defineProperty(response,'url',{value:'https://example.com/boot-loader/commands.json'});
 const fetcher=vi.fn().mockResolvedValue(response);
 const result=await loadCommandCatalog('/boot-loader/commands.json',fetcher);
 expect(result.commands).toHaveLength(4);
 expect(fetcher).toHaveBeenCalledOnce();
 expect(fetcher.mock.calls[0][1]).toMatchObject({credentials:'omit',redirect:'error'});
 expect(Object.isFrozen(result.commands)).toBe(true);
 vi.unstubAllGlobals();
});
test('times out even when fetch ignores abort, and ignores late results', async () => {
 vi.stubGlobal('location', {origin:'https://example.com',href:'https://example.com/'});
 let settle!:(value:Response)=>void;
 const fetcher=vi.fn().mockImplementation(()=>new Promise<Response>(resolve=>{settle=resolve;}));
 const outcome=await loadCommandCatalog('/config.json',fetcher,10);
 expect(outcome).toBe(defaultCommandCatalog);
 expect(fetcher.mock.calls[0][1].signal.aborted).toBe(true);
 settle(new Response('{}'));
 vi.unstubAllGlobals();
});
test('rejects malformed, dangerous, duplicate and colliding definitions atomically', async () => {
 const raw=(await import('../src/command-catalog.json')).default;
 const mutations:((x:any)=>void)[]=[
  x=>{x.commands[0].name='BOOT';}, x=>{x.commands.push({...x.commands[0]});},
  x=>{x.commands[0].lines=['\u001b]2;bad'];}, x=>{x.commands[0].extra='x';},
  x=>{x.commands[2].handler='reload';}, x=>{x.commands[1].name='constructor';},
  x=>{x.commands[0].kind='script';}, x=>{x.commands[2].handler='unknown';},
  x=>{x.commands.push({name:'theme',kind:'text',description:'x',lines:['x']});},
  x=>{x.commands.push({name:'demo',kind:'handler',description:'x',handler:'time'});},
 ];
 for(const mutate of mutations){const x=structuredClone(raw);mutate(x);expect(()=>parseCommandCatalog(JSON.stringify(x))).toThrow();}
 expect(()=>parseCommandCatalog('{"version":1,"version":1,"commands":[]}')).toThrow();
});
test('rejects an overlong stream without accepting a partial catalogue', async () => {
 vi.stubGlobal('location', {origin:'https://example.com',href:'https://example.com/'});
 const response=new Response('x'.repeat(65537));Object.defineProperty(response,'url',{value:'https://example.com/config.json'});
 const fetcher=vi.fn().mockResolvedValue(response);
 expect(await loadCommandCatalog('/config.json',fetcher)).toBe(defaultCommandCatalog);
 expect(fetcher.mock.calls[0][1].signal.aborted).toBe(true);
 vi.unstubAllGlobals();
});
test('caller abort stops waiting even when a fetcher ignores cancellation', async () => {
 vi.stubGlobal('location', {origin:'https://example.com',href:'https://example.com/'});
 const controller=new AbortController();const fetcher=vi.fn().mockImplementation(()=>new Promise<Response>(()=>{}));
 const pending=loadCommandCatalog('/config.json',fetcher,10000,controller.signal);controller.abort();
 expect(await pending).toBe(defaultCommandCatalog);expect(fetcher.mock.calls[0][1].signal.aborted).toBe(true);
 vi.unstubAllGlobals();
});
test('accepts collision-free additional static names without executable capabilities', async () => {
 const raw=structuredClone((await import('../src/command-catalog.json')).default);
 raw.commands.push({name:'hello',kind:'text',description:'A greeting',lines:['Hi']} as typeof raw.commands[number]);
 const result=parseCommandCatalog(JSON.stringify(raw));
 expect(result.commands.find(x=>x.name==='hello')).toMatchObject({kind:'text',lines:['Hi']});
});
test('missing fetch or AbortController uses fallback rather than rejecting', async () => {
 vi.stubGlobal('location', {origin:'https://example.com',href:'https://example.com/'});
 vi.stubGlobal('fetch', undefined);
 await expect(loadCommandCatalog('/config.json')).resolves.toBe(defaultCommandCatalog);
 vi.stubGlobal('fetch', vi.fn()); vi.stubGlobal('AbortController', undefined);
 await expect(loadCommandCatalog('/config.json')).resolves.toBe(defaultCommandCatalog);
 vi.unstubAllGlobals();
});
test('late response after timeout never consumes its body', async () => {
 vi.stubGlobal('location', {origin:'https://example.com',href:'https://example.com/'});
 let settle!:(value:Response)=>void;
 const fetcher=vi.fn().mockImplementation(()=>new Promise<Response>(resolve=>{settle=resolve;}));
 const pending=loadCommandCatalog('/config.json',fetcher,10);
 expect(await pending).toBe(defaultCommandCatalog);
 const getReader=vi.fn();
 settle({ok:true,url:'https://example.com/config.json',headers:new Headers(),body:{getReader}} as unknown as Response);
 await new Promise(resolve=>setTimeout(resolve,0));
 expect(getReader).not.toHaveBeenCalled();
 vi.unstubAllGlobals();
});
test('validation does not depend on TextEncoder availability', async () => {
 const raw=(await import('../src/command-catalog.json')).default;
 vi.stubGlobal('TextEncoder',undefined);
 expect(()=>parseCommandCatalog(JSON.stringify(raw))).not.toThrow();
 vi.unstubAllGlobals();
});
test('non-OK, malformed and redirected responses fall back', async () => {
 vi.stubGlobal('location', {origin:'https://example.com',href:'https://example.com/'});
 const response=(body:string,status:number,url:string)=>{const r=new Response(body,{status});Object.defineProperty(r,'url',{value:url});return r;};
 for(const r of [response('{}',500,'https://example.com/config.json'),response('{',200,'https://example.com/config.json'),response('{}',200,'https://other.example/config.json')]) {
  expect(await loadCommandCatalog('/config.json',vi.fn().mockResolvedValue(r))).toBe(defaultCommandCatalog);
 }
 vi.unstubAllGlobals();
});
test('rejects prototype-sensitive object keys explicitly', async () => {
 const raw=(await import('../src/command-catalog.json')).default;
 const source=JSON.stringify(raw).replace('"version":1','"version":1,"__proto__":{"polluted":true}');
 expect(()=>parseCommandCatalog(source)).toThrow();
 expect(({} as Record<string,unknown>).polluted).toBeUndefined();
});
