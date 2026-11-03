import {expect,test,vi} from 'vitest';
import {createPopularTerminalLoader,popularTerminalEntries,terminalApiBase} from '../src/terminal-catalog-api';
import {parseTerminalCatalog} from '../src/terminal-catalog';
const id=`gogh/${'a'.repeat(64)}`,other=`gogh/${'b'.repeat(64)}`,path=`api/v1/terminal/themes/${'c'.repeat(64)}.json`;
const entry={id,name:'Synthetic popular',source_id:'gogh',path};
function index(){return {api_version:'1',category:'terminal',status:'partial',entries:[entry,{...entry,id:other,name:'Not popular'}],popularity:{version:'1',flags:{[id]:true,[other]:false},order:[id],source:{revision:'d'.repeat(40)}}};}
function detail(){return {api_version:'1',category:'terminal',theme:{id,name:entry.name,source_id:'gogh',source_theme_id:'a'.repeat(64),palette:{background:'#112233',foreground:'#FFFFFF',cursor:'#FF0000',accent:'#FF0000',ansi:Array(16).fill('#AABBCC')},license:{expression:'MIT'},publication:{source_url:'https://example.invalid/source',source_revision:'e'.repeat(40),license_documents:['licenses/MIT.txt']},original:{author:'Synthetic author',variant:'dark'}}};}
function loader(i:unknown=index(),d:unknown=detail()) {
 const request=vi.fn(async(url:URL|RequestInfo,options?:RequestInit)=>{
  expect(String(url).startsWith(terminalApiBase)).toBe(true);expect(options).toMatchObject({credentials:'omit',redirect:'error'});
  return new Response(JSON.stringify(String(url).endsWith('/index.json')?i:d),{status:200});
 });return {request,load:createPopularTerminalLoader(request as typeof fetch)};
}
test('only explicit true terminal flags intersected with entries are selected, in declared order',()=>{
 expect(popularTerminalEntries(index()).entries).toEqual([entry]);
 const unknown=index();delete (unknown.popularity.flags as Record<string,boolean>)[id];
 expect(popularTerminalEntries(unknown).entries).toEqual([]);
 const none=index();none.popularity.flags[id]=false;expect(popularTerminalEntries(none).entries).toEqual([]);
});
test('missing popularity, editor category, unknown version, duplicates and incomplete order fail closed',()=>{
 for(const mutate of [(i:any)=>delete i.popularity,(i:any)=>i.category='editor',(i:any)=>i.popularity.version='2',(i:any)=>i.entries.push(entry),(i:any)=>i.popularity.order=[]]){
  const i=index();mutate(i);expect(()=>popularTerminalEntries(i)).toThrow();
 }
});
test('approved detail maps ANSI16/cursor exactly with source/author/license preserved; fetches only popular',async()=>{
 const {request,load}=loader();const result=await load();expect(request).toHaveBeenCalledTimes(2);
 const parsed=parseTerminalCatalog(result.data,result.revision);expect(parsed.themes).toHaveLength(1);
 expect(parsed.themes[0]).toMatchObject({id,sourceId:'gogh',mode:'dark',theme:{background:'#112233',cursor:'#FF0000',brightWhite:'#AABBCC'},evidence:{author:'Synthetic author',license:{expression:'MIT'}}});
 expect(result.revision).toContain('API v1');
});
test('unknown popularity never falls back to full catalogue or detail fetches',async()=>{
 const i=index();i.popularity.flags[id]=false;const {request,load}=loader(i);
 const result=await load();expect(request).toHaveBeenCalledTimes(1);expect(parseTerminalCatalog(result.data,result.revision).themes).toHaveLength(0);
});
test('unsafe paths and mismatched details cannot become palettes',async()=>{
 for(const badPath of ['https://evil.invalid/palette','../private.json','api/v1/editor/themes/'+ 'c'.repeat(64)+'.json',path+'?popular=true']){
  const i=index();i.entries[0]={...entry,path:badPath};const {request,load}=loader(i);await expect(load()).rejects.toThrow('Unsafe API path');expect(request).toHaveBeenCalledTimes(1);
 }
 const wrong=detail();wrong.theme.id=other;await expect(loader(index(),wrong).load()).rejects.toThrow('identity mismatch');
});
test('invalid colors, missing license evidence and unpinned sources reject the refresh',async()=>{
 for(const mutate of [(d:any)=>d.theme.palette.ansi=[],(d:any)=>d.theme.palette.cursor='red',(d:any)=>d.theme.publication.license_documents=[],(d:any)=>d.theme.publication.source_revision='main']){
  const d=detail();mutate(d);await expect(loader(index(),d).load()).rejects.toThrow();
 }
});
test('HTTP failure rejects, allowing CatalogSession to retain last-good selection',async()=>{
 const request=vi.fn(async()=>new Response('Unavailable',{status:503}));await expect(createPopularTerminalLoader(request as typeof fetch)()).rejects.toThrow('HTTP 503');
});

test('identities, paths and revisions require exact end-of-input, including trailing line breaks',async()=>{
 for(const suffix of ['\n','\r\n']) {
  const i=index();i.entries[0]={...entry,id:id+suffix};expect(()=>popularTerminalEntries(i)).toThrow('Unsafe API identity');
  const r=index();r.popularity.source.revision+=suffix;expect(()=>popularTerminalEntries(r)).toThrow('revision');
  const p=index();p.entries[0]={...entry,path:path+suffix};await expect(loader(p).load()).rejects.toThrow('Unsafe API path');
 }
});
