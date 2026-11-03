import type { ITheme } from '@xterm/xterm';
import { CatalogSession } from './terminal-catalog';
import { terminalThemes } from './terminal-appearance';

export type CatalogLoader = () => Promise<{data: unknown; revision: string}>;
export type ThemeChoice = {id: string; name: string; label?: string};
let nextControlId = 0;

/** One searchable selector for built-ins and the caller's approved catalogue.
 * Loading, filtering and navigation never change the current palette. */
export function mountCatalogControls(root: HTMLElement, load: CatalogLoader, apply: (theme: ITheme | null) => void,
  changed: (themes: ThemeChoice[]) => void = () => {}) {
  const session = new CatalogSession(Object.keys(terminalThemes));
  let offset = 0, active = -1, builtinId = 'green';
  let disposed = false, expanded = false, loading = true;
  const pageSize = 50, id = `terminal-themes-${++nextControlId}`;
  root.classList.add('terminal-catalog');
  root.setAttribute('aria-label', 'Terminal theme catalogue');
  const label = document.createElement('label'); label.textContent = 'Theme ';
  const search = document.createElement('input');
  search.type = 'search'; search.setAttribute('aria-label', 'Search terminal themes');
  search.setAttribute('role', 'combobox'); search.setAttribute('aria-autocomplete', 'list');
  search.setAttribute('aria-controls', id); search.autocomplete = 'off';
  search.placeholder = 'Search themes'; label.append(search);
  const list = document.createElement('div'); list.id = id; list.setAttribute('role', 'listbox');
  list.setAttribute('aria-label', 'Terminal themes');
  const previous = document.createElement('button'); previous.type = 'button'; previous.textContent = 'Previous';
  const next = document.createElement('button'); next.type = 'button'; next.textContent = 'Next';
  const refresh = document.createElement('button'); refresh.type = 'button'; refresh.textContent = 'Refresh catalogue';
  const fallback = document.createElement('button'); fallback.type = 'button'; fallback.textContent = 'Use built-in theme';
  const status = document.createElement('p'); status.id = `${id}-status`; status.setAttribute('role', 'status'); status.setAttribute('aria-live', 'polite');
  const attribution = document.createElement('p'); attribution.id = `${id}-selected`; search.setAttribute('aria-describedby', `${status.id} ${attribution.id}`); attribution.className = 'terminal-catalog-source';
  const navigation = document.createElement('div'); navigation.className = 'terminal-catalog-navigation';
  navigation.append(previous, next, refresh, fallback);
  root.append(label, list, navigation, status, attribution);
  const listeners: (()=>void)[] = [];
  function on(target: HTMLElement, event: string, listener: (event: Event)=>void) {
    target.addEventListener(event, listener); listeners.push(()=>target.removeEventListener(event, listener));
  }
  const choices = (): ThemeChoice[] => [
    ...Object.entries(terminalThemes).map(([id, t]) => ({id, name: t.label})),
    ...(session.current?.themes.map(t => ({id: t.id, name: t.name, label: `${t.name} · ${t.sourceId} · ${t.mode}`})) ?? []),
  ];
  const selectedId = () => session.selectedId ?? builtinId;
  const matches = () => {
    const terms = search.value.trim().toLowerCase().split(/\s+/).filter(Boolean);
    return choices().filter(t => terms.every(s => `${t.label ?? t.name} ${t.id}`.toLowerCase().includes(s)));
  };
  function close() { expanded = false; active = -1; offset = 0; search.value = ''; draw(); }
  function select(id: string): boolean {
    if (disposed) return false;
    if (Object.hasOwn(terminalThemes, id)) {
      builtinId = id; session.selectedId = null; apply(terminalThemes[id].theme);
    } else if (session.select(id)) apply(session.current!.themes.find(t=>t.id===id)!.theme);
    else return false;
    close(); return true;
  }
  function draw() {
    if (disposed) return;
    const all = matches(), page = all.slice(offset, offset + pageSize);
    if (active >= page.length) active = page.length - 1;
    list.replaceChildren(); list.hidden = !expanded;
    search.setAttribute('aria-expanded', String(expanded));
    search.placeholder = choices().find(t => t.id === selectedId())?.name ?? 'Search themes';
    search.removeAttribute('aria-activedescendant');
    page.forEach((theme, i) => {
      const option = document.createElement('div'); option.id = `${id}-${i}`;
      option.setAttribute('role', 'option'); option.setAttribute('aria-selected', String(theme.id === selectedId()));
      option.textContent = theme.label ?? theme.name; option.dataset.themeId = theme.id;
      if (expanded && i === active) {option.classList.add('is-active'); search.setAttribute('aria-activedescendant', option.id);}
      // Keep input focus while selecting with a pointer.
      option.addEventListener('mousedown', e=>e.preventDefault());
      option.addEventListener('click', ()=>select(theme.id)); list.append(option);
    });
    previous.hidden = next.hidden = !expanded;
    previous.disabled = offset === 0; next.disabled = offset + pageSize >= all.length;
    refresh.disabled = loading;
    const catalog = session.current;
    const range = `${all.length ? offset + 1 : 0}–${Math.min(offset + pageSize, all.length)} of ${all.length} matches.`;
    status.textContent = `${range} ${loading ? 'Loading catalogue. ' : ''}${catalog ? `${catalog.themes.length} compatible catalogue themes; ${catalog.excluded.length} excluded. Source ${catalog.status}; revision ${catalog.revision}. ` : ''}${session.error ? `Catalogue unavailable: ${session.error}. ${catalog ? 'Retaining last-good catalogue. ' : ''}` : ''}${!catalog ? 'Built-in themes remain available.' : ''}`;
    const selected = catalog?.themes.find(t=>t.id===session.selectedId);
    if (selected) {
      const source = selected.evidence.source as Record<string, unknown>;
      const license = selected.evidence.license as Record<string, unknown> | null;
      attribution.textContent = `Selected: ${selected.name} · ${selected.id} · ${selected.mode}. Source: ${String(source.url)}${selected.evidence.author ? ` · ${String(selected.evidence.author)}` : ''}${license?.expression ? ` · ${String(license.expression)}` : ''}`;
    } else attribution.textContent = `Using the built-in theme: ${terminalThemes[builtinId].label}. Theme changes preserve commands and history.`;
  }
  async function reload() {
    loading = true; draw();
    const oldSelection = session.selectedId;
    const success = await session.refresh(load);
    if (disposed) return;
    loading = false;
    if (success) {
      offset = 0; active = -1;
      if (session.selectedId) apply(session.current!.themes.find(t=>t.id===session.selectedId)!.theme);
      else if (oldSelection) apply(terminalThemes[builtinId].theme);
      changed(choices());
    }
    draw();
  }
  on(search, 'input', ()=>{offset=0;active=-1;expanded=true;draw();});
  on(search, 'focus', ()=>{expanded=true;draw();});
  on(search, 'keydown', event=>{
    const e = event as KeyboardEvent;
    if (e.key === 'Escape') { e.preventDefault(); close(); return; }
    // Internal Tab may reach pagination; focusout closes only on leaving this control.
    if (e.key === 'PageDown' || e.key === 'PageUp') {
      e.preventDefault(); expanded = true;
      const total = matches().length;
      offset = Math.max(0, Math.min(Math.max(0, Math.floor((total - 1) / pageSize) * pageSize), offset + (e.key === 'PageDown' ? pageSize : -pageSize)));
      active = total ? 0 : -1; draw(); return;
    }
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault(); expanded=true;
      const count = matches().slice(offset,offset+pageSize).length;
      active = count ? (active < 0 ? (e.key === 'ArrowDown' ? 0 : count - 1) : (active + (e.key === 'ArrowDown' ? 1 : -1) + count) % count) : -1; draw();
      list.querySelector('.is-active')?.scrollIntoView?.({block:'nearest'});
    } else if (e.key === 'Enter' && expanded && active >= 0) {
      e.preventDefault(); const item = matches()[offset + active]; if(item) select(item.id);
    }
  });
  on(root, 'focusout', event=>{if(!root.contains((event as FocusEvent).relatedTarget as Node | null)) close();});
  on(previous, 'click', ()=>{offset=Math.max(0,offset-pageSize);active=-1;draw();});
  on(next, 'click', ()=>{offset+=pageSize;active=-1;draw();});
  on(fallback, 'click', ()=>{select(builtinId);});
  on(refresh, 'click', ()=>{void reload();});
  changed(choices()); draw(); void reload();
  return { select, choices, dispose() {disposed=true;listeners.forEach(remove=>remove());root.remove();},
    useBuiltin(id = 'green') {if(Object.hasOwn(terminalThemes,id)){builtinId=id;session.selectedId=null;draw();}} };
}
