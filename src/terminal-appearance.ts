import type { ITheme } from '@xterm/xterm';

/** xterm blends cursor alpha onto its black canvas; text stays fully opaque. */
export const terminalTheme = {
  background: '#000000',
  foreground: '#11FF00',
  cursor: 'rgba(17, 255, 0, 0.5)',
  cursorAccent: '#000000',
  selectionBackground: '#11ff0040',
  // xterm otherwise derives these from the bright green foreground.
  scrollbarSliderBackground: '#ffffff33',
  scrollbarSliderHoverBackground: '#ffffff66',
  scrollbarSliderActiveBackground: '#ffffff80',
};

/** Add named presets here; controls and renderer share this registry. */
export const terminalThemes: Record<string, { label: string; theme: ITheme }> = {
  green: { label: 'Classic green', theme: terminalTheme },
  amber: { label: 'Amber', theme: { ...terminalTheme, foreground: '#FFBF00', cursor: '#FFBF0080', selectionBackground: '#FFBF0040' } },
  white: { label: 'Soft white', theme: { ...terminalTheme, foreground: '#E6E6E6', cursor: '#E6E6E680', selectionBackground: '#E6E6E640' } },
};
export const terminalFontSizes = [12, 13, 15, 17, 20, 24];

/** Freeze the standalone host's initial available height; subsequent fits only resize columns/rows. */
export function initializeTerminalHeight(host: HTMLElement): void {
  if (!host.closest('.standalone-terminal')) return;
  const viewport = window.visualViewport;
  const bottom = (viewport?.offsetTop ?? 0) + (viewport?.height ?? window.innerHeight);
  const margin = Number.parseFloat(getComputedStyle(host).marginBottom) || 0;
  host.style.height = `${Math.max(80, Math.floor(bottom - host.getBoundingClientRect().top - margin - 1))}px`;
}

export function terminalContext(page: string | undefined, focused: boolean, top: number, bottom: number, height: number): boolean {
  return page === 'terminal' || focused || (page === 'home' && top < height * 0.55 && bottom > height * 0.45);
}

export function trackTerminalAppearance(): void {
  const root = document.documentElement;
  const section = document.querySelector<HTMLElement>('#terminal');
  if (!root || !section) return;
  let scheduled = false;
  const update = () => {
    scheduled = false;
    const viewport = window.visualViewport;
    const offset = viewport?.offsetTop ?? 0;
    const rect = section.getBoundingClientRect();
    const focused = section.contains(document.activeElement);
    const dark = terminalContext(document.body.dataset.page, focused, rect.top - offset, rect.bottom - offset, viewport?.height ?? window.innerHeight);
    root.classList.toggle('terminal-active', dark);
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#000000' : '#f5f5f7');
  };
  const schedule = () => { if (!scheduled) { scheduled = true; requestAnimationFrame(update); } };
  document.addEventListener('focusin', schedule);
  document.addEventListener('focusout', schedule);
  window.addEventListener('scroll', schedule, { passive: true });
  window.addEventListener('resize', schedule);
  window.visualViewport?.addEventListener('resize', schedule);
  window.visualViewport?.addEventListener('scroll', schedule);
  window.addEventListener('pageshow', schedule);
  update();
}
