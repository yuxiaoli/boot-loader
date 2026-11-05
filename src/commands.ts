import { destinations, findDestination, repositoryUrl } from './destinations';
import { validateLoadUrl } from './load-url';
import { terminalThemes } from './terminal-appearance';
import { defaultCommandCatalog, type CommandCatalog } from './command-catalog';

export type ScreenRequest = { url: string; label: string; kind: 'registry' | 'custom'; directOnly?: string };
export function themeSlug(name: string): string { return name.trim().toLowerCase().replace(/\s+/g, '-'); }
export type CommandResult = { lines: string[]; navigate?: string; screen?: ScreenRequest; clear?: boolean; themeId?: string; refit?: boolean; refreshThemes?: boolean; reboot?: boolean; reload?: boolean };
type Node = { kind: 'directory' } | { kind: 'file'; lines: string[] };

function defaultText(name: 'intro' | 'about'): string[] {
  const command = defaultCommandCatalog.commands.find((item) => item.name === name);
  return command?.kind === 'text' ? [...command.lines] : [];
}
export const introLines = defaultText('intro');
export const aboutLines = defaultText('about');

// Each code-owned help row also declares its completion-visible names. The
// accepted `load` alias stays deliberately absent from both surfaces.
const helpRows: ReadonlyArray<{ line: string; names?: readonly string[]; configured?: string }> = [
  { line: 'A simulated shell. No real files or commands.' },
  { line: '', configured: 'intro' },
  { line: '', configured: 'about' },
  { line: '  ls [path]        List virtual contents', names: ['ls'] },
  { line: '  pwd / cwd        Show the virtual directory', names: ['pwd', 'cwd'] },
  { line: '  cd [path]        Change directory (home: /systems)', names: ['cd'] },
  { line: '  cat <path>       Read a virtual text file', names: ['cat'] },
  { line: '  echo <text>      Print literal text', names: ['echo'] },
  { line: '  boot <system>    Open a system in this tab', names: ['boot'] },
  { line: '  open <URL|$name> Open a webpage in this tab', names: ['open'] },
  { line: '    --embed        Use the computer screen instead' },
  { line: '  set name=<URL>   Save a session-only URL', names: ['set'] },
  { line: '', configured: 'time' },
  { line: '  themes [search]  List available terminal themes', names: ['themes'] },
  { line: '  themes refresh   Reload the theme catalogue' },
  { line: '  theme <slug>     Apply a theme (Tab completes slugs)', names: ['theme'] },
  { line: '  theme default    Restore the built-in theme' },
  { line: '  reboot           Start a fresh terminal session', names: ['reboot'] },
  { line: '', configured: 'reload' },
  { line: '  refit            Fit terminal to current viewport', names: ['refit'] },
  { line: '  source [system]  Show sources or open one', names: ['source'] },
  { line: '  clear / cls      Clear the display', names: ['clear', 'cls'] },
  { line: '  help             Show this guide', names: ['help'] },
  { line: '' },
  { line: 'Try: ls | cd .. | cat README.txt | boot win11' },
  { line: `Systems: ${destinations.map((os) => os.id).join(', ')}` },
  { line: 'set home=https://example.com then open $home' },
  { line: 'Variable names: lowercase a-z, digits, underscore;' },
  { line: 'start with a letter. Names are case-sensitive.' },
  { line: 'Up/Down: history | Ctrl+C: cancel' },
  { line: 'Tab: cycle matches | Shift+Tab: reverse' },
  { line: 'Empty or unmatched Tab leaves the terminal.' },
];
export const codeOwnedCommandNames = Object.freeze(helpRows.flatMap((row) => row.names ?? []));

function effectiveHelpLines(catalog: CommandCatalog): string[] {
  const builtins = new Set(['intro', 'about', 'time', 'reload']);
  const format = (name: string, description: string) => `  ${name}${' '.repeat(Math.max(1, 17 - name.length))}${description}`;
  const lines = helpRows.map((row) => {
    const configured = row.configured && catalog.commands.find((item) => item.name === row.configured);
    return configured ? format(configured.name, configured.description) : row.line;
  });
  const extras = catalog.commands.filter((item) => !builtins.has(item.name)).map((item) => format(item.name, item.description));
  lines.splice(lines.indexOf('  help             Show this guide') + 1, 0, ...extras);
  return lines;
}
export const helpLines = effectiveHelpLines(defaultCommandCatalog);

const readme = [
  'Boot Loader is a simulated browser shell.',
  'All files, directories and variables are virtual.',
  'No host files, OS environment or processes are used.',
  `/systems contains the ${destinations.length} launchable systems.`,
  'boot <id> opens that system in this tab.',
  'boot <id> --embed tries its computer screen.',
  'open <URL> opens a webpage in this tab.',
  'open <URL> --embed tries a restricted screen.',
  'clear and cls clear the display.',
  'Some pages require a direct tab. Nothing is proxied.',
  'Session state disappears when this page reloads.',
];
const nodes = new Map<string, Node>([
  ['/', { kind: 'directory' }], ['/systems', { kind: 'directory' }],
  ['/README.txt', { kind: 'file', lines: readme }],
  ['/help.txt', { kind: 'file', lines: [] }],
  ...destinations.map((os): [string, Node] => [`/systems/${os.id}`, { kind: 'file', lines: [os.name, os.live, `Source: ${os.source}`, `Launch: boot ${os.id}`, `Screen: boot ${os.id} --embed`] }]),
]);

export function resolveVirtualPath(path: string, cwd: string): string | undefined {
  if (path.length > 256 || /[\x00-\x1f\\:]/.test(path)) return;
  const parts = (path.startsWith('/') ? path : `${cwd}/${path}`).split('/');
  const normalized: string[] = [];
  for (const part of parts) {
    if (!part || part === '.') continue;
    if (part === '..') normalized.pop(); else normalized.push(part);
  }
  return `/${normalized.join('/')}`;
}

/** Complete only entries in the same virtual filesystem used by ls/cd/cat. */
export function virtualPathCompletions(prefix: string, cwd: string, directoriesOnly = false): string[] {
  if (prefix.length > 256) return [];
  const slash = prefix.lastIndexOf('/');
  const directory = prefix.slice(0, slash + 1);
  const name = prefix.slice(slash + 1);
  const parent = resolveVirtualPath(directory || '.', cwd);
  if (!parent || nodes.get(parent)?.kind !== 'directory') return [];
  const candidates: string[] = [];
  if (name.startsWith('.')) candidates.push('./', '../');
  else if (directoriesOnly && !name && parent !== '/') candidates.push('../');
  for (const [path, node] of nodes) {
    if (path === '/' || (path.slice(0, path.lastIndexOf('/')) || '/') !== parent) continue;
    if (directoriesOnly && node.kind !== 'directory') continue;
    candidates.push(`${path.slice(path.lastIndexOf('/') + 1)}${node.kind === 'directory' ? '/' : ''}`);
  }
  return candidates.filter((value) => value.startsWith(name)).map((value) => directory + value);
}

/** No browser storage, host environment, evaluation or external filesystem. */
export class TerminalSession {
  cwd = '/systems';
  themes = Object.entries(terminalThemes).map(([id, t]) => ({ id, name: t.label }));
  readonly variables = new Map<string, string>();
  constructor(readonly siteUrl = 'https://yuxiaoli.github.io/boot-loader/', readonly catalog: CommandCatalog = defaultCommandCatalog) {}
  get prompt() { return `${this.cwd}> `; }
}

export function executeCommand(input: string, session = new TerminalSession()): CommandResult {
  if (input.length > 2200) return { lines: ['Command is too long (maximum 2200 characters).'] };
  const parsed = /^(\S+)(?:\s+([\s\S]*))?$/.exec(input.trim());
  if (!parsed) return { lines: [] };
  const command = parsed[1].toLowerCase();
  const argument = parsed[2]?.trim() ?? '';
  const args = argument ? argument.split(/\s+/) : [];
  const configured = session.catalog.commands.find((item) => item.name === command);
  if (configured?.kind === 'text') return { lines: args.length ? [`Usage: ${command}`] : [...configured.lines] };
  if (configured?.kind === 'handler') {
    if (args.length) return { lines: [`Usage: ${command}`] };
    if (configured.handler === 'time') return { lines: [new Date().toLocaleString(undefined, { timeZoneName: 'short' }), `Time zone: ${Intl.DateTimeFormat().resolvedOptions().timeZone}`] };
    if (configured.handler === 'reload') return { lines: [], reload: true };
  }
  if (command === 'themes') {
    if (argument === 'refresh') return { lines: ['Refreshing theme catalogue...'], refreshThemes: true };
    const terms = argument.toLowerCase().split(/\s+/).filter(Boolean);
    const counts = new Map<string, number>();
    for (const theme of session.themes) {
      const slug = themeSlug(theme.name);
      counts.set(slug, (counts.get(slug) ?? 0) + 1);
    }
    const matches = session.themes.filter(t => terms.every(q => `${t.id} ${t.name} ${themeSlug(t.name)}`.toLowerCase().includes(q)));
    return { lines: matches.length ? matches.map(t => {
      const slug = themeSlug(t.name);
      const note = slug === 'default' ? ' (reserved; use selector)' : (counts.get(slug) ?? 0) > 1 ? ' (ambiguous; use selector)' : '';
      return `${slug}  ${t.name}${note}`.replace(/[\x00-\x1f\x7f-\x9f]/g, '');
    }) : ['No matching themes.'] };
  }
  if (command === 'theme') {
    if (!argument) return { lines: ['Usage: theme <slug> (use themes to list slugs)'] };
    if (argument === 'default') return { lines: ['Theme: Classic green'], themeId: 'green' };
    const slugs = session.themes.filter(t => themeSlug(t.name) === argument);
    if (slugs.length > 1) return { lines: ['Ambiguous theme slug; select a theme in the selector:', ...slugs.map(t => t.name.replace(/[\x00-\x1f\x7f-\x9f]/g, ''))] };
    const theme = slugs[0];
    return theme ? { lines: [`Theme: ${theme.name}`.replace(/[\x00-\x1f\x7f-\x9f]/g, '')], themeId: theme.id } : { lines: [`Unknown theme: ${argument}`, 'Use themes to list available slugs.'] };
  }
  if (command === 'refit') return args.length ? { lines: ['Usage: refit'] } : { lines: ['Terminal fitted to the current viewport.'], refit: true };
  if (command === 'reboot') return args.length ? { lines: ['Usage: reboot'] } : { lines: [], reboot: true };
  if (command === 'help') return { lines: args.length ? ['Usage: help'] : effectiveHelpLines(session.catalog) };
  if (command === 'clear' || command === 'cls') return args.length ? { lines: ['Usage: clear'] } : { lines: [], clear: true };
  if (command === 'pwd' || command === 'cwd') return { lines: args.length ? [`Usage: ${command}`] : [session.cwd] };
  if (command === 'echo') return { lines: [argument] };
  if (command === 'set') {
    const assignment = /^([a-z][a-z0-9_]{0,31})=(\S+)$/.exec(argument);
    if (!assignment || ['constructor', 'prototype', '__proto__'].includes(assignment[1])) return { lines: ['Usage: set name=<URL> (lowercase names, up to 32 characters).'] };
    const [, name, value] = assignment;
    const validated = validateLoadUrl(value, session.siteUrl);
    if ('error' in validated) return { lines: [validated.error] };
    if (!session.variables.has(name) && session.variables.size >= 16) return { lines: ['Session variable limit reached (16). Reload to reset.'] };
    session.variables.set(name, validated.url);
    return { lines: [`Saved $${name} for this session.`] };
  }
  if (command === 'open' || command === 'load') {
    const usage = ['Usage: open <URL|$name> [--embed]'];
    const embed = args.includes('--embed');
    const unknownOption = args.find((arg) => arg.startsWith('-') && arg !== '--embed');
    if (unknownOption) return { lines: [`Unknown open option: ${unknownOption}`, ...usage] };
    const values = args.filter((arg) => arg !== '--embed');
    if (values.length !== 1 || args.length !== (embed ? 2 : 1)) return { lines: usage };
    let value = values[0];
    if (value.startsWith('$')) {
      const reference = /^\$([a-z][a-z0-9_]{0,31})$/.exec(value);
      if (!reference) return { lines: ['Use one explicit variable reference, for example open $home.'] };
      const stored = session.variables.get(reference[1]);
      if (!stored) return { lines: [`Undefined variable: $${reference[1]}`] };
      value = stored;
    }
    const validated = validateLoadUrl(value, session.siteUrl);
    if ('error' in validated) return { lines: [validated.error] };
    const label = new URL(validated.url).hostname;
    return embed
      ? { lines: ['Opening the computer screen. Some pages require a direct tab.'], screen: { url: validated.url, label, kind: 'custom' } }
      : { lines: [`Opening ${label}...`], navigate: validated.url };
  }
  if (command === 'ls' || command === 'cd' || command === 'cat') {
    if (args.length > 1 || (command === 'cat' && !argument)) return { lines: [`Usage: ${command} ${command === 'cat' ? '<path>' : '[path]'}`] };
    const path = resolveVirtualPath(argument || (command === 'cd' ? '/systems' : session.cwd), session.cwd);
    const node = path ? nodes.get(path) : undefined;
    if (!node || !path) return { lines: ['No such path in the virtual filesystem.'] };
    if (command === 'cd') {
      if (node.kind !== 'directory') return { lines: ['Not a directory.'] };
      session.cwd = path; return { lines: [] };
    }
    if (command === 'cat') return { lines: node.kind === 'file' ? (path === '/help.txt' ? effectiveHelpLines(session.catalog) : [...node.lines]) : ['Is a directory. Use ls to list it.'] };
    if (node.kind === 'file') return { lines: [path.split('/').at(-1)!] };
    if (path === '/systems') return { lines: destinations.map((os) => `  ${os.id.padEnd(10)} ${os.name}`) };
    return { lines: ['  systems/', '  README.txt', '  help.txt'] };
  }
  if (command === 'source' && !argument) return { lines: [`Boot Loader: ${repositoryUrl}`, ...destinations.map((os) => `${os.name}: ${os.source}`), 'Use source <system> to open a repository.'] };
  if (command === 'boot' || command === 'source') {
    const embed = command === 'boot' && args.includes('--embed');
    const ids = embed ? args.filter((arg) => arg !== '--embed') : args;
    const usage = [`Usage: ${command} <system>${command === 'boot' ? ' [--embed]' : ''}`, `Systems: ${destinations.map((os) => os.id).join(', ')}`];
    if (command === 'boot') {
      const unknownOption = args.find((arg) => arg.startsWith('-') && arg !== '--embed');
      if (unknownOption) return { lines: [`Unknown boot option: ${unknownOption}`, ...usage] };
    }
    if (ids.length !== 1 || args.length !== (embed ? 2 : 1)) return { lines: usage };
    const os = findDestination(ids[0]);
    if (!os) return { lines: [`Unknown system: ${ids[0]}`, 'Run ls /systems to see available systems.'] };
    if (embed) return { lines: [`Opening ${os.name} in the computer screen...`], screen: { url: os.live, label: os.name, kind: 'registry', directOnly: os.directOnly } };
    return { lines: [`Opening ${os.name}${command === 'source' ? ' source' : ''}...`], navigate: command === 'source' ? os.source : os.live };
  }
  return { lines: [`Unknown command: ${command}`, 'Type help for available commands.'] };
}
