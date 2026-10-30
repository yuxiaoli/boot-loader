import './style.css';
import './visual-refinement.css';
import './screen.css';
import { destinations } from './destinations';
import { initializeScreenSession } from './screen-session';
import { trackTerminalAppearance } from './terminal-appearance';

initializeScreenSession();
trackTerminalAppearance();

const selectButtons = Array.from(document.querySelectorAll<HTMLButtonElement>('[data-select]'));
function selectSystem(id: string, focus = false) {
  const os = destinations.find((item) => item.id === id);
  if (!os) return;
  selectButtons.forEach((button) => {
    const active = button.dataset.select === id;
    button.setAttribute('aria-pressed', String(active));
    button.closest('.system-row')?.classList.toggle('is-selected', active);
    if (active && focus) button.focus({ preventScroll: true });
  });
  document.querySelector('[data-screen-name]')!.textContent = os.name;
  document.querySelector('[data-screen-command]')!.textContent = `> boot ${os.id}_`;
  document.querySelector('.selected-description')!.textContent = os.detail;
}
selectButtons.forEach((button, i) => {
  button.addEventListener('click', () => selectSystem(button.dataset.select!));
  button.addEventListener('keydown', (event) => {
    const index = event.key === 'ArrowDown' ? (i + 1) % selectButtons.length : event.key === 'ArrowUp' ? (i - 1 + selectButtons.length) % selectButtons.length : event.key === 'Home' ? 0 : event.key === 'End' ? selectButtons.length - 1 : -1;
    if (index < 0) return;
    event.preventDefault();
    selectSystem(selectButtons[index].dataset.select!, true);
  });
});

const host = document.querySelector<HTMLElement>('#terminal-host');
if (host) {
  let requested = false;
  let pendingFocus = false;
  let focusConsole: (() => void) | undefined;
  const loadConsole = async (focus = false) => {
    pendingFocus ||= focus;
    if (requested) {
      if (pendingFocus && focusConsole) { focusConsole(); pendingFocus = false; }
      return;
    }
    requested = true;
    try {
      const { mountTerminal } = await import('./terminal');
      focusConsole = mountTerminal(host);
      document.querySelector('#terminal-loading')?.remove();
      if (pendingFocus) { focusConsole(); pendingFocus = false; }
    } catch {
      requested = false;
      const status = document.querySelector<HTMLElement>('#terminal-loading');
      if (status) {
        status.hidden = false;
        status.textContent = 'Console could not load. Use the desktop links below, or select Focus terminal to retry.';
      }
    }
  };
  document.querySelector('#focus-terminal')?.addEventListener('click', () => { void loadConsole(true); });
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) { void loadConsole(); observer.disconnect(); }
    }, { rootMargin: '100px' });
    observer.observe(host);
  } else { void loadConsole(); }
}
