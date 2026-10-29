import {expect,test} from 'vitest';
import {CatalogSession,parseTerminalCatalog,searchCatalog} from '../src/terminal-catalog';
const ansi=Array.from({length:16},(_,i)=>`#${i.toString(16).repeat(6)}`);
function row(id='sample/one'){return {id,name:'Example',source_id:'sample',source_theme_id:id.slice(7),original:{variant:'light',author:'Fictional author'},originals:{catalog:'https://example.invalid/themes'},provenance:{revision:'example'},license:{expression:'Example only'},palette:{background:'#FFFFFF',foreground:'#111111',cursor:'#222222',accent:'#333333',ansi:[...ansi]}};}
function fixture(count=1){return {schema_version:'2.0',kind:'terminal',status:'complete',sources:{sample:{source:{id:'sample',url:'https://example.invalid/'}}},themes:Array.from({length:count},(_,i)=>row(`sample/${i}`))};}
test('preserves identity, evidence, mode and ANSI roles',()=>{
 const t=parseTerminalCatalog(fixture(),'test').themes[0];expect(t).toMatchObject({id:'sample/0',sourceThemeId:'0',mode:'light',evidence:{author:'Fictional author',license:{expression:'Example only'}}});
 expect(t.theme).toMatchObject({black:ansi[0],red:ansi[1],white:ansi[7],brightBlack:ansi[8],brightWhite:ansi[15],cursor:'#222222',selectionBackground:'#11111140'});
});
test('legacy family, unknown mode and accent cursor fallback',()=>{
 const r:any=row('example/default');delete r.palette.cursor;delete r.original;r.family_name='Example';r.mode='unknown';
 const c=parseTerminalCatalog({schema_version:'1.0',source:{id:'terminal',url:'https://example.invalid/'},status:'partial',themes:[r]},'legacy');
 expect(c.themes[0]).toMatchObject({id:'example/default',name:'Example / Example',mode:'unknown',sourceId:'terminal',theme:{cursor:'#333333'}});expect(c.status).toBe('partial');
});
test('rejects wrong kind/version, duplicate IDs and empty catalogue',()=>{
 for(const change of [{schema_version:'3.0'},{kind:'editor'},{themes:[]},{themes:[row(),row()]}])expect(()=>parseTerminalCatalog({...fixture(),...change},'test')).toThrow();
});
test('reports unsupported rows rather than hiding exclusions',()=>{
 const f:any=fixture(4);f.themes[1].palette.ansi.pop();f.themes[2].palette.foreground='url(javascript:alert(1))';f.themes[3].source_id='missing';
 const c=parseTerminalCatalog(f,'test');expect(c.themes).toHaveLength(1);expect(c.excluded.map(x=>x.index)).toEqual([1,2,3]);
});
test('all 1363 entries searchable with bounded pages',()=>{
 const c=parseTerminalCatalog(fixture(1363),'large');expect(searchCatalog(c,'').total).toBe(1363);expect(searchCatalog(c,'',0,1000).items).toHaveLength(100);
 expect(searchCatalog(c,'',1350).items).toHaveLength(13);expect(searchCatalog(c,'1362 LIGHT').items[0].id).toBe('sample/1362');expect(searchCatalog(c,'not present').items).toEqual([]);
});
test('failed refresh retains last-good/selection; removed IDs reset to fallback',async()=>{
 const s=new CatalogSession();await s.refresh(async()=>({data:fixture(),revision:'one'}));s.select('sample/0');
 await s.refresh(async()=>{throw Error('offline')});expect(s.current?.revision).toBe('one');expect(s.selectedId).toBe('sample/0');
 await s.refresh(async()=>({data:{...fixture(),kind:'editor'},revision:'bad'}));expect(s.current?.revision).toBe('one');
 await s.refresh(async()=>({data:{...fixture(),themes:[row('sample/new')]},revision:'two'}));expect(s.selectedId).toBeNull();expect(s.error).toBeNull();
});
test('slower old request cannot overwrite a newer refresh',async()=>{
 const s=new CatalogSession();let finish!:(value:any)=>void;const slow=s.refresh(()=>new Promise(resolve=>{finish=resolve}));
 await s.refresh(async()=>({data:fixture(),revision:'new'}));finish({data:fixture(),revision:'old'});await slow;expect(s.current?.revision).toBe('new');
});
test('preserves repeated ANSI colors and alpha; rejects a source-ID mismatch',()=>{
 const f:any=fixture();f.themes[0].palette.ansi=Array(16).fill('#11223388');
 const c=parseTerminalCatalog(f,'alpha');expect(c.themes[0].theme.brightWhite).toBe('#11223388');
 f.sources.sample.source.id='other';expect(()=>parseTerminalCatalog(f,'bad')).toThrow('No compatible');
});
test('newest failed request retains established last-good, not an older in-flight result',async()=>{
 const s=new CatalogSession();await s.refresh(async()=>({data:fixture(),revision:'initial'}));
 let finish!:(v:any)=>void;const older=s.refresh(()=>new Promise(resolve=>{finish=resolve}));
 await s.refresh(async()=>{throw Error('newest failed')});finish({data:fixture(),revision:'stale'});await older;
 expect(s.current?.revision).toBe('initial');expect(s.error).toBe('newest failed');
});
test('no successful first load leaves built-in fallback available and does not invent selection',async()=>{
 const s=new CatalogSession();await s.refresh(async()=>({data:{},revision:'invalid'}));
 expect(s.current).toBeNull();expect(s.select('sample/0')).toBe(false);expect(s.selectedId).toBeNull();
});
