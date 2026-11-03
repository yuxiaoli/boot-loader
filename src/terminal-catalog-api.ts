import { parseTerminalCatalog } from './terminal-catalog';
import type { CatalogLoader } from './terminal-catalog-controls';

export const terminalApiBase = 'https://yuxiaoli.github.io/themes-catalog-api/';
type Obj = Record<string, unknown>;
type Entry = {id:string;name:string;path:string;source_id:string};
const object = (v:unknown):Obj => {if(!v || typeof v !== 'object' || Array.isArray(v)) throw Error('Invalid API object');return v as Obj;};
const text = (v:unknown):string => {if(typeof v !== 'string' || !v.trim() || v.length > 4096) throw Error('Invalid API text');return v;};

/** Static category index, with an explicit tri-state popularity policy.
 * Missing flags are unknown, never a reason to load the full catalogue. */
export function popularTerminalEntries(input:unknown): {entries:Entry[];revision:string;status:'complete'|'partial'} {
  const root=object(input);
  if(root.api_version !== '1' || root.category !== 'terminal') throw Error('Unsupported terminal API');
  if(!Array.isArray(root.entries) || root.entries.length > 50000) throw Error('Invalid API inventory');
  if(root.status !== 'complete' && root.status !== 'partial') throw Error('Invalid API status');
  const popularity=object(root.popularity);
  if(popularity.version !== '1') throw Error('Popular theme metadata is unavailable');
  const flags=object(popularity.flags), source=object(popularity.source);
  const revision=text(source.revision);
  if(!/^[a-f0-9]{40}$/.test(revision)) throw Error('Invalid popularity revision');
  if(!Array.isArray(popularity.order) || popularity.order.length>50000) throw Error('Invalid popularity order');
  const entries=new Map<string,Entry>();
  for(const value of root.entries) {
    const row=object(value),id=text(row.id);
    if(entries.has(id)) throw Error('Duplicate API identity');
    if(!/^[\x21-\x7e]+$/.test(id)) throw Error('Unsafe API identity');
    entries.set(id,{id,name:text(row.name),path:text(row.path),source_id:text(row.source_id)});
  }
  const selected:Entry[]=[], seen=new Set<string>();
  for(const value of popularity.order) {
    const id=text(value);if(seen.has(id))throw Error('Duplicate popular identity');seen.add(id);
    if(Object.hasOwn(flags,id) && flags[id] === true && entries.has(id)) selected.push(entries.get(id)!);
  }
  // A true flag omitted from order is malformed, not a silent omission.
  if([...entries.keys()].some(id=>Object.hasOwn(flags,id) && flags[id]===true && !seen.has(id))) throw Error('Incomplete popularity order');
  if(selected.length>2000)throw Error('Popular catalogue exceeds request limit');
  return {entries:selected,revision,status:root.status};
}

/** Only fetch known public API paths; no query-driven server filtering,
 * credentials, external redirects, persistence or private catalogue fallback. */
export function createPopularTerminalLoader(request:typeof fetch = fetch):CatalogLoader {
  return async()=>{
    const abort=new AbortController(), timer=setTimeout(()=>abort.abort(),30000);
    async function json(path:string) {
      if(!/^api\/v1\/terminal\/(?:index\.json|themes\/[a-f0-9]{64}\.json)$/.test(path)) throw Error('Unsafe API path');
      const response=await request(new URL(path,terminalApiBase),{signal:abort.signal,credentials:'omit',redirect:'error',cache:'no-cache'});
      if(!response.ok)throw Error(`Theme API HTTP ${response.status}`);
      const body=await response.text();if(body.length>8_000_000)throw Error('Theme API response too large');
      return {data:JSON.parse(body) as unknown,body};
    }
    try {
      const index=await json('api/v1/terminal/index.json'), selected=popularTerminalEntries(index.data);
      const digest=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(index.body))),b=>b.toString(16).padStart(2,'0')).join('');
      const themes:Obj[]=new Array(selected.entries.length), sources:Obj=Object.create(null);
      let next=0;
      await Promise.all(Array.from({length:Math.min(4,selected.entries.length)},async()=>{
        while(next<selected.entries.length) {
          const i=next++, entry=selected.entries[i], detail=object((await json(entry.path)).data);
          if(detail.api_version!=='1'||detail.category!=='terminal')throw Error('Invalid terminal detail');
          const theme=object(detail.theme), publication=object(theme.publication), license=object(theme.license);
          if(theme.id!==entry.id || theme.name!==entry.name || theme.source_id!==entry.source_id)throw Error('Theme detail identity mismatch');
          if(!Array.isArray(publication.license_documents)||!publication.license_documents.length||!publication.license_documents.every(p=>typeof p==='string'&&/^licenses\/[A-Za-z0-9.-]+\.txt$/.test(p)))throw Error('Missing publication license evidence');
          text(license.expression);const sourceUrl=text(publication.source_url), sourceRevision=text(publication.source_revision);
          if(!sourceUrl.startsWith('https://')||!/^[a-f0-9]{40}$/.test(sourceRevision))throw Error('Unpinned source evidence');
          const source={id:entry.source_id,url:sourceUrl,revision:sourceRevision};
          if(Object.hasOwn(sources,entry.source_id) && JSON.stringify(object(sources[entry.source_id]).source)!==JSON.stringify(source))throw Error('Mixed source revisions');
          sources[entry.source_id]={source};themes[i]=theme;
        }
      }));
      const data={schema_version:'2.0',kind:'terminal',status:selected.status,sources,themes};
      const revision=`API v1 ${digest}; popular ${selected.revision}`;
      const parsed=parseTerminalCatalog(data,revision);
      if(parsed.excluded.length)throw Error('Popular catalogue contains incompatible palettes');
      return {data,revision};
    } finally {clearTimeout(timer);abort.abort();}
  };
}
