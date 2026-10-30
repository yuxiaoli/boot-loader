import type { ITheme } from '@xterm/xterm';
import { CatalogSession, searchCatalog } from './terminal-catalog';

export type CatalogLoader = () => Promise<{data: unknown; revision: string}>;

/** Dependency-injected UI. Calling this is explicit activation; no endpoint or
 * private catalogue is embedded. All source strings render as plain text. */
export function mountCatalogControls(root: HTMLElement, load: CatalogLoader, apply: (theme: ITheme | null) => void) {
  const session = new CatalogSession();
  let offset = 0;
  let disposed = false;
  const pageSize = 50;
  root.classList.add('terminal-catalog');
  root.setAttribute('aria-label', 'Terminal theme catalogue');
  const searchLabel = document.createElement('label');
  searchLabel.textContent = 'Search themes ';
  const search = document.createElement('input');
  search.type = 'search'; search.setAttribute('aria-label', 'Search terminal themes');
  search.placeholder = 'Name, source or mode'; searchLabel.append(search);
  const selectLabel = document.createElement('label');
  selectLabel.textContent = 'Catalogue theme ';
  const select = document.createElement('select');
  select.setAttribute('aria-label', 'Catalogue theme'); selectLabel.append(select);
  const previous = document.createElement('button'); previous.type = 'button'; previous.textContent = 'Previous';
  const next = document.createElement('button'); next.type = 'button'; next.textContent = 'Next';
  const refresh = document.createElement('button'); refresh.type = 'button'; refresh.textContent = 'Refresh catalogue';
  const fallback = document.createElement('button'); fallback.type = 'button'; fallback.textContent = 'Use built-in theme';
  const status = document.createElement('p'); status.setAttribute('role', 'status'); status.setAttribute('aria-live', 'polite');
  const attribution = document.createElement('p'); attribution.className = 'terminal-catalog-source';
  const navigation = document.createElement('div'); navigation.className = 'terminal-catalog-navigation';
  navigation.append(previous, next, refresh, fallback);
  root.append(searchLabel, selectLabel, navigation, status, attribution);
  const listeners: (()=>void)[] = [];
  function on(target: HTMLElement, event: string, listener: ()=>void) {
    target.addEventListener(event, listener);
    listeners.push(()=>target.removeEventListener(event, listener));
  }
  function draw() {
    if (disposed) return;
    const catalog = session.current;
    select.replaceChildren(new Option('Choose a theme', ''));
    if (!catalog) {
      select.disabled = true; previous.disabled = true; next.disabled = true;
      status.textContent = session.error ? `Catalogue unavailable: ${session.error}. Built-in themes remain available.` : 'Loading catalogue; built-in themes remain available.';
      return;
    }
    const page = searchCatalog(catalog, search.value, offset, pageSize);
    for (const theme of page.items) select.append(new Option(`${theme.name} · ${theme.sourceId} · ${theme.mode}`, theme.id));
    // A selected item may be outside the filtered page. Keep the applied palette
    // rather than falsely displaying a different selected row.
    select.value = page.items.some(t=>t.id===session.selectedId) ? session.selectedId! : '';
    select.disabled = page.total === 0;
    previous.disabled = offset === 0; next.disabled = offset + pageSize >= page.total;
    const start = page.total ? offset + 1 : 0, end = Math.min(offset + pageSize, page.total);
    status.textContent = `${start}–${end} of ${page.total} matches; ${catalog.themes.length} compatible themes. ${catalog.excluded.length} excluded. Source ${catalog.status}; revision ${catalog.revision}.${session.error ? ` Refresh failed: ${session.error}; retaining last-good catalogue.` : ''}`;
    const selected = catalog.themes.find(t=>t.id===session.selectedId);
    if (selected) {
      const source = selected.evidence.source as Record<string, unknown>;
      const license = selected.evidence.license as Record<string, unknown> | null;
      attribution.textContent = `Selected: ${selected.name} · ${selected.id} · ${selected.mode}. Source: ${String(source.url)}${selected.evidence.author ? ` · ${String(selected.evidence.author)}` : ''}${license?.expression ? ` · ${String(license.expression)}` : ''}`;
    } else attribution.textContent = 'Using the built-in theme. Catalogue selections do not change commands or history.';
  }
  async function reload() {
    refresh.disabled = true;
    const oldSelection = session.selectedId;
    const success = await session.refresh(load);
    if (disposed) return;
    refresh.disabled = false;
    if (success) {
      offset = 0;
      if (session.selectedId) apply(session.current!.themes.find(t=>t.id===session.selectedId)!.theme);
      else if (oldSelection) apply(null);
    }
    draw();
  }
  on(search, 'input', ()=>{offset=0;draw();});
  on(previous, 'click', ()=>{offset=Math.max(0,offset-pageSize);draw();});
  on(next, 'click', ()=>{offset+=pageSize;draw();});
  on(select, 'change', ()=>{if(session.select(select.value)){apply(session.current!.themes.find(t=>t.id===select.value)!.theme);draw();}});
  on(fallback, 'click', ()=>{session.selectedId=null;apply(null);draw();});
  on(refresh, 'click', ()=>{void reload();});
  draw(); void reload();
  return { dispose() {disposed=true;listeners.forEach(remove=>remove());root.remove();},
    useBuiltin() {session.selectedId=null;draw();} };
}
