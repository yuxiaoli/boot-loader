import type { ScreenRequest } from './commands';
import { destinations, findDestination } from './destinations';
import { screenPolicy } from './screen-policy';

let launch: ((request: ScreenRequest, trigger?: HTMLElement) => void) | undefined;
export function openComputer(request: ScreenRequest, trigger?: HTMLElement): void { launch?.(request, trigger); }

export function initializeScreenSession(): void {
  const dialog = document.querySelector<HTMLDialogElement>('#screen-dialog');
  if (!dialog) return;
  const slot = dialog.querySelector<HTMLElement>('#screen-slot')!;
  const status = dialog.querySelector<HTMLElement>('#screen-status')!;
  const title = dialog.querySelector<HTMLElement>('#screen-title')!;
  const direct = dialog.querySelector<HTMLAnchorElement>('#screen-open')!;
  const select = dialog.querySelector<HTMLSelectElement>('#screen-system')!;
  const closeButton = dialog.querySelector<HTMLButtonElement>('#screen-close')!;
  let frame: HTMLIFrameElement | undefined;
  let timer: number | undefined;
  let previousFocus: HTMLElement | undefined;
  let originalHash = '';
  let generation = 0;
  const disposeFrame = () => {
    generation++;
    window.clearTimeout(timer);
    frame?.remove(); frame = undefined; slot.replaceChildren();
  };
  const close = (back = true) => {
    disposeFrame();
    if (dialog.open) dialog.close();
    document.documentElement.classList.remove('screen-open');
    previousFocus?.focus({ preventScroll: true });
    if (back && history.state?.bootLoaderScreen) history.back();
  };
  launch = (request, trigger) => {
    const first = !dialog.open;
    if (first) {
      previousFocus = trigger ?? (document.activeElement instanceof HTMLElement ? document.activeElement : undefined);
      originalHash = location.hash;
      history.pushState({ bootLoaderScreen: true }, '', '#computer');
      dialog.showModal();
      document.documentElement.classList.add('screen-open');
    }
    disposeFrame();
    const thisGeneration = generation;
    title.textContent = request.label;
    direct.href = request.url;
    select.value = request.kind === 'registry' ? destinations.find((os) => os.live === request.url)?.id ?? '' : '';
    const policy = screenPolicy(request, location.href, window.crossOriginIsolated);
    if (policy.reason) {
      status.textContent = policy.reason;
      const message = document.createElement('p'); message.className = 'screen-message'; message.textContent = 'This page needs a direct tab.'; slot.append(message);
      dialog.dataset.state = 'direct';
    } else {
      dialog.dataset.state = 'loading';
      status.textContent = 'Loading the requested page. Direct opening remains available below.';
      frame = document.createElement('iframe');
      frame.loading = 'eager';
      frame.title = `${request.label} in the computer screen`;
      frame.setAttribute('sandbox', policy.sandbox);
      frame.referrerPolicy = 'no-referrer';
      frame.allow = "camera 'none'; microphone 'none'; geolocation 'none'; payment 'none'; clipboard-read 'none'; clipboard-write 'none'";
      frame.addEventListener('load', () => {
        if (generation !== thisGeneration) return;
        // Appending a frame can also emit a load for its initial empty document.
        if (frame?.contentDocument?.URL === 'about:blank') return;
        window.clearTimeout(timer);
        dialog.dataset.state = 'responded';
        status.textContent = 'The frame responded. If the app is blank or does not work here, open the page in this tab.';
      });
      frame.addEventListener('error', () => {
        if (generation !== thisGeneration) return;
        window.clearTimeout(timer); dialog.dataset.state = 'error';
        status.textContent = 'The browser reported a loading error. You can open the page directly.';
      });
      slot.append(frame);
      frame.src = request.url;
      timer = window.setTimeout(() => {
        if (generation !== thisGeneration) return;
        dialog.dataset.state = 'unconfirmed';
        status.textContent = 'This page is taking longer than expected, or may refuse embedding. Continue waiting or open it directly.';
      }, 12000);
    }
    if (first) closeButton.focus({ preventScroll: true });
  };
  for (const button of document.querySelectorAll<HTMLButtonElement>('[data-embed]')) button.addEventListener('click', () => {
    const os = findDestination(button.dataset.embed!);
    if (os) openComputer({ url: os.live, label: os.name, kind: 'registry', directOnly: os.directOnly }, button);
  });
  select.addEventListener('change', () => {
    const os = findDestination(select.value);
    if (os) openComputer({ url: os.live, label: os.name, kind: 'registry', directOnly: os.directOnly });
  });
  closeButton.addEventListener('click', () => close());
  dialog.querySelector('#screen-return')?.addEventListener('click', () => close());
  dialog.addEventListener('cancel', (event) => { event.preventDefault(); close(); });
  window.addEventListener('popstate', () => { if (dialog.open) close(false); });
  window.addEventListener('pagehide', () => { disposeFrame(); if (dialog.open) dialog.close(); document.documentElement.classList.remove('screen-open'); });
  window.addEventListener('pageshow', () => {
    if (!dialog.open && history.state?.bootLoaderScreen) history.replaceState(null, '', `${location.pathname}${location.search}${originalHash}`);
  });
}
