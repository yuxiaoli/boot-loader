/** xterm blends cursor alpha onto its black canvas; text stays fully opaque. */
export const terminalTheme = {
  background: '#000000',
  foreground: '#11FF00',
  cursor: 'rgba(17, 255, 0, 0.5)',
  cursorAccent: '#000000',
  selectionBackground: '#11ff0040',
};

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
