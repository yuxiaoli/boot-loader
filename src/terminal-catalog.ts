import type { ITheme } from '@xterm/xterm';
export const consumerVersion = '1.0';
const roles = ['black','red','green','yellow','blue','magenta','cyan','white','brightBlack','brightRed','brightGreen','brightYellow','brightBlue','brightMagenta','brightCyan','brightWhite'] as const;
type Obj = Record<string, unknown>;
export interface CatalogTheme { id:string; name:string; mode:'dark'|'light'|'unknown'; sourceId:string; sourceThemeId:string; evidence:Readonly<Obj>; theme:ITheme }
export interface TerminalCatalog { consumerVersion:string; sourceVersion:'1.0'|'2.0'; revision:string; status:'complete'|'partial'; themes:readonly CatalogTheme[]; excluded:readonly {index:number;id:string|null;reason:string}[] }
function object(v:unknown):Obj { if(!v || typeof v!=='object'||Array.isArray(v)) throw Error('Expected object'); return v as Obj; }
function text(v:unknown):string { if(typeof v!=='string'||!v.trim()||v.length>4096) throw Error('Invalid text'); return v; }
function color(v:unknown):string { if(typeof v!=='string'||!/^#[\da-f]{6}([\da-f]{2})?$/i.test(v)) throw Error('Unsupported color'); return v; }
/** Renderer contract validation, not an archival schema/license certification.
 * Exclusions are reported; duplicate IDs reject an update rather than replacing a selection. */
export function parseTerminalCatalog(input:unknown, revision:string):TerminalCatalog {
  const root=object(input), v=root.schema_version; text(revision);
  if(v!=='1.0'&&v!=='2.0') throw Error('Unsupported catalogue version');
  if(v==='2.0'&&root.kind!=='terminal') throw Error('Not a terminal catalogue');
  const sources=v==='2.0'?object(root.sources):{terminal:{source:object(root.source)}};
  if(v==='1.0'&&object(root.source).id!=='terminal') throw Error('Not a terminal catalogue');
  if(root.status!=='complete'&&root.status!=='partial') throw Error('Invalid status');
  if(!Array.isArray(root.themes)||root.themes.length>50000) throw Error('Invalid catalogue size');
  const themes:CatalogTheme[]=[], excluded:{index:number;id:string|null;reason:string}[]=[], ids=new Set<string>();
  root.themes.forEach((value:unknown,index:number)=>{
    let row:Obj; try{row=object(value)}catch{excluded.push({index,id:null,reason:'Invalid record'});return;}
    const id=typeof row.id==='string'?row.id:null;
    if(id&&ids.has(id)) throw Error('Duplicate theme identity'); if(id) ids.add(id);
    try {
      text(id); const sourceId=v==='1.0'?'terminal':text(row.source_id);
      if(!Object.hasOwn(sources,sourceId)) throw Error('Missing source evidence');
      const source=object(object(sources[sourceId]).source); if(source.id!==sourceId) throw Error('Source identity mismatch'); text(source.url);
      const p=object(row.palette); if(!Array.isArray(p.ansi)||p.ansi.length!==16) throw Error('Expected ANSI16');
      const background=color(p.background), foreground=color(p.foreground), accent=color(p.accent);
      const theme:ITheme={background,foreground,cursor:p.cursor===undefined?accent:color(p.cursor),cursorAccent:background,
        // Derived consumer selection policy, not a lossless upstream role.
        selectionBackground:`${foreground.slice(0,7)}40`};
      roles.forEach((role,i)=>{theme[role]=color((p.ansi as unknown[])[i]);});
      const original=row.original?object(row.original):{}, sourceMode=row.mode??original.variant;
      themes.push({id:id!,name:row.family_name?`${text(row.family_name)} / ${text(row.name)}`:text(row.name),
        mode:sourceMode==='dark'||sourceMode==='light'?sourceMode:'unknown',sourceId,sourceThemeId:v==='1.0'?id!:text(row.source_theme_id),
        evidence:structuredClone({source,originals:row.originals??{},provenance:row.provenance??{},license:row.license??null,author:original.author??null,sourceMode:sourceMode??null}),theme});
    } catch(e) {excluded.push({index,id,reason:e instanceof Error?e.message:'Invalid palette'});}
  });
  if(!themes.length) throw Error('No compatible terminal palettes');
  return {consumerVersion,sourceVersion:v,revision,status:root.status,themes,excluded};
}
/** Every entry remains searchable; DOM consumers render at most 100 per page. */
export function searchCatalog(c:TerminalCatalog,query:string,offset=0,limit=50) {
  const terms=query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const matches=c.themes.filter(t=>{const h=`${t.name} ${t.id} ${t.sourceId} ${t.mode}`.toLowerCase();return terms.every(term=>h.includes(term));});
  const start=Number.isFinite(offset)?Math.max(0,Math.floor(offset)):0, size=Number.isFinite(limit)?Math.max(1,Math.min(100,Math.floor(limit))):50;
  return {total:matches.length,offset:start,items:matches.slice(start,start+size)};
}
/** Explicit caller-owned loader; no endpoint, storage or automatic network activity. */
export class CatalogSession {
  current:TerminalCatalog|null=null; selectedId:string|null=null; error:string|null=null; private generation=0;
  select(id:string):boolean {if(!this.current?.themes.some(t=>t.id===id))return false;this.selectedId=id;return true;}
  async refresh(load:()=>Promise<{data:unknown;revision:string}>):Promise<boolean> {
    const generation=++this.generation;
    try {const r=await load(),next=parseTerminalCatalog(r.data,r.revision);if(generation!==this.generation)return false;
      this.current=next;this.error=null;if(!next.themes.some(t=>t.id===this.selectedId))this.selectedId=null;return true;
    }catch(e){if(generation===this.generation)this.error=e instanceof Error?e.message:'Catalogue unavailable';return false;}
  }
}
