import { isNativeHandlerId, type NativeHandlerId } from './native-handlers';
import bundled from './command-catalog.json';
import { parseUniqueJson } from './json-unique';

export type CommandDefinition = Readonly<{name:string; kind:'text'; description:string; lines:readonly string[]} | {name:string; kind:'handler'; description:string; handler:NativeHandlerId}>;
export type CommandCatalog = Readonly<{commands:readonly CommandDefinition[]}>;
const MAX_BYTES = 65536;
function utf8Length(value:string):number {
  let bytes=0;
  for(const char of value) { const cp=char.codePointAt(0)!; bytes+=cp<=0x7f?1:cp<=0x7ff?2:cp<=0xffff?3:4; }
  return bytes;
}
const reserved = new Set(['install','uninstall','figlet','boot','cat','cd','clear','cls','cwd','echo','help','load','ls','open','pwd','reboot','refit','set','source','theme','themes','constructor','prototype','__proto__']);
const own = (o:Record<string,unknown>, keys:string[]) => Object.keys(o).length === keys.length && keys.every(k => Object.hasOwn(o,k));
const object = (v:unknown):Record<string,unknown> => {if(!v || typeof v !== 'object' || Array.isArray(v)) throw Error('Expected object'); return v as Record<string,unknown>;};
const text = (v:unknown, max:number) => {if(typeof v !== 'string' || v.length > max || /[\x00-\x1f\x7f-\x9f]/.test(v)) throw Error('Invalid text'); return v;};
export function parseCommandCatalog(source:string):CommandCatalog {
  if(source.length > MAX_BYTES || utf8Length(source) > MAX_BYTES) throw Error('Catalogue too large');
  const root = object(parseUniqueJson(source));
  if(!own(root,['version','commands']) || root.version !== 1 || !Array.isArray(root.commands) || root.commands.length > 64) throw Error('Invalid catalogue');
  const seen=new Set<string>();
  const commands:CommandDefinition[] = root.commands.map((value:unknown) => {
    const row=object(value), name=text(row.name,32), description=text(row.description,100);
    if(!/^[a-z][a-z0-9-]{0,31}$/.test(name) || reserved.has(name) || seen.has(name) || !description.trim()) throw Error('Invalid command name');
    seen.add(name);
    if(row.kind === 'text') {
      if(!own(row,['name','kind','description','lines']) || !Array.isArray(row.lines) || row.lines.length > 100) throw Error('Invalid text command');
      const lines = row.lines.map((line:unknown) => text(line,1024));
      return Object.freeze({name,kind:'text' as const,description,lines:Object.freeze(lines)});
    }
    if(row.kind === 'handler') {
      if(!own(row,['name','kind','description','handler']) || !isNativeHandlerId(row.handler)) throw Error('Invalid handler');
      return Object.freeze({name,kind:'handler' as const,description,handler:row.handler as NativeHandlerId});
    }
    throw Error('Invalid kind');
  });
  return Object.freeze({version:1 as const,commands:Object.freeze(commands)});
}
export const defaultCommandCatalog = parseCommandCatalog(JSON.stringify(bundled));

export async function loadCommandCatalog(url:string, fetcher?:typeof fetch, timeoutMs = 1500, signal?:AbortSignal):Promise<CommandCatalog> {
  let timer:ReturnType<typeof setTimeout> | undefined;
  let stop: (() => void) | undefined;
  try {
    const fetchAsset = fetcher ?? globalThis.fetch;
    if(typeof fetchAsset !== 'function' || typeof AbortController !== 'function') return defaultCommandCatalog;
    const controller = new AbortController();
    const target = new URL(url, globalThis.location.href);
    if(target.origin !== globalThis.location.origin || target.username || target.password || !['http:','https:'].includes(target.protocol) || signal?.aborted) return defaultCommandCatalog;
    const cancelled = new Promise<CommandCatalog>(resolve => {
      stop = () => { controller.abort(); resolve(defaultCommandCatalog); };
      timer = setTimeout(stop, Math.max(0, timeoutMs));
      signal?.addEventListener('abort', stop, {once:true});
    });
    const request = (async () => {
      const response = await fetchAsset(target.href, {signal:controller.signal, credentials:'omit', redirect:'error'});
      if(controller.signal.aborted) throw Error('Request cancelled');
      if(!response.ok || response.url !== target.href || !response.body) throw Error('Invalid response');
      const length = response.headers.get('content-length');
      if(length && (!/^\d+$/.test(length) || Number(length) > MAX_BYTES)) throw Error('Response too large');
      const reader=response.body.getReader(), chunks:Uint8Array[]=[]; let count=0;
      const cancelReader = () => { void reader.cancel().catch(()=>{}); };
      controller.signal.addEventListener('abort', cancelReader, {once:true});
      try {
        for (;;) {
          const {value,done}=await reader.read(); if(done) break;
          if(controller.signal.aborted) throw Error('Request cancelled');
          count+=value.byteLength; if(count>MAX_BYTES) { controller.abort(); throw Error('Response too large'); }
          chunks.push(value);
        }
      } finally {controller.signal.removeEventListener('abort', cancelReader); reader.releaseLock();}
      if(controller.signal.aborted) throw Error('Request cancelled');
      const bytes=new Uint8Array(count); let offset=0; for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.byteLength;}
      return parseCommandCatalog(new TextDecoder('utf-8',{fatal:true}).decode(bytes));
    })().catch(()=>defaultCommandCatalog);
    return await Promise.race([request,cancelled]);
  } catch {return defaultCommandCatalog;}
  finally {if(timer!==undefined)clearTimeout(timer); if(stop)signal?.removeEventListener('abort',stop);}
}
