/** The single source of truth for every visual link and terminal command. */
export const destinations = [
  { id: 'daedalos', name: 'daedalOS', path: 'daedalOS', note: 'A desktop without boundaries.', detail: 'Explore a full desktop environment, right in your browser.', year: 'WEB DESKTOP', code: '01' },
  { id: 'macos', name: 'macOS', path: 'macos', note: 'A familiar kind of different.', detail: 'Step into a browser-based take on the Mac desktop.', year: 'APPLE INSPIRED', code: '02' },
  { id: 'win12', name: 'Win12', path: 'win12', note: 'A glimpse of what comes next.', detail: 'Explore a community vision of a future Windows desktop.', year: 'FUTURE CONCEPT', code: '03' },
  { id: 'winxp', name: 'WinXP', path: 'winXP', note: 'Some things never get old.', detail: 'Revisit a familiar desktop from another era.', year: 'RETRO CLASSIC', code: '04' },
].map((os) => ({ ...os, live: `https://yuxiaoli.github.io/${os.path}/`, source: `https://github.com/yuxiaoli/${os.path}` }));

export type Destination = (typeof destinations)[number];
export const repositoryUrl = 'https://github.com/yuxiaoli/boot-loader';
export const findDestination = (id: string) => destinations.find((os) => os.id === id.toLowerCase());
