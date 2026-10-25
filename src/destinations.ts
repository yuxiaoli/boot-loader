export interface Destination {
  id: string;
  name: string;
  live: string;
  source: string;
  note: string;
  detail: string;
  code: string;
  directOnly?: string;
}

/** Shared by the static selector, simulated filesystem and terminal commands. */
export const destinations: Destination[] = [
  { id: 'daedalos', name: 'daedalOS', live: 'https://yuxiaoli.github.io/daedalOS/', source: 'https://github.com/yuxiaoli/daedalOS', note: 'A desktop without boundaries.', detail: 'Explore a full desktop environment, right in your browser.', code: '01' },
  { id: 'macos', name: 'macOS', live: 'https://yuxiaoli.github.io/macos/', source: 'https://github.com/yuxiaoli/macos', note: 'A familiar kind of different.', detail: 'Step into a browser-based take on the Mac desktop.', code: '02' },
  { id: 'win12', name: 'Win12', live: 'https://win12-online.github.io/win12/boot.html', source: 'https://github.com/yuxiaoli/win12', note: 'A glimpse of what comes next.', detail: 'Boot the Windows 12 web desktop.', code: '03' },
  { id: 'winxp', name: 'WinXP', live: 'https://yuxiaoli.github.io/winXP/', source: 'https://github.com/yuxiaoli/winXP', note: 'Some things never get old.', detail: 'Revisit a familiar desktop from another era.', code: '04' },
  { id: 'win11', name: 'Windows 11', live: 'https://yuxiaoli.github.io/Windows-11-Web/', source: 'https://github.com/yuxiaoli/Windows-11-Web/tree/develop', note: 'A modern Windows-inspired desktop.', detail: 'A community Windows 11 desktop built with Preact.', code: '05' },
  { id: 'webvm', name: 'WebVM', live: 'https://webvm.io/', source: 'https://github.com/leaningtech/webvm', note: 'A Linux VM for the browser.', detail: 'WebVM requires a cross-origin-isolated page. Open it directly for its WebAssembly runtime.', code: '06', directOnly: 'WebVM requires cross-origin isolation for its WebAssembly runtime. This static Pages host cannot provide that inside a frame. Open it in this tab.' },
  { id: 'ubuntu', name: 'Ubuntu', live: 'https://yuxiaoli.github.io/ubuntu-web/', source: 'https://github.com/yuxiaoli/ubuntu-web/tree/develop', note: 'A Linux desktop, in the browser.', detail: 'Explore the personalized Ubuntu web desktop.', code: '07' },
];
export const repositoryUrl = 'https://github.com/yuxiaoli/boot-loader';
export const findDestination = (id: string) => destinations.find((os) => os.id === id.toLowerCase());
