import { destinations, findDestination, repositoryUrl } from './destinations';

export type CommandResult = { lines: string[]; navigate?: string; clear?: boolean };

export function executeCommand(input: string): CommandResult {
  const [command, ...args] = input.trim().toLowerCase().split(/\s+/);
  if (!command) return { lines: [] };
  if (command === 'help' && args.length === 0) return { lines: [
    'Available commands',
    '  help             Show this guide',
    '  os list          List the four systems',
    '  boot <system>    Open a browser desktop',
    '  source [system]  Show sources or open one repository',
    '  clear            Clear the terminal',
    '',
    'Systems: daedalos, macos, win12, winxp',
    'Up/Down: history | Tab: complete | Ctrl+C: cancel',
    'Tab on an empty prompt or Shift+Tab: leave the terminal',
  ] };
  if (command === 'clear' && args.length === 0) return { lines: [], clear: true };
  if (command === 'os') {
    if (args.length === 1 && args[0] === 'list') return { lines: destinations.map((os) => `  ${os.id.padEnd(10)} ${os.name}`) };
    return { lines: ['Usage: os list'] };
  }
  if (command === 'source' && args.length === 0) return { lines: [
    `Boot Loader: ${repositoryUrl}`,
    ...destinations.map((os) => `${os.name}: ${os.source}`),
    'Use source <system> to open a repository.',
  ] };
  if (command === 'boot' || command === 'source') {
    if (args.length !== 1) return { lines: [`Usage: ${command} <system>`, 'Systems: daedalos, macos, win12, winxp'] };
    const os = findDestination(args[0]);
    if (!os) return { lines: [`Unknown system: ${args[0]}`, 'Run os list to see available systems.'] };
    return { lines: [`Opening ${os.name}${command === 'source' ? ' source' : ''}...`], navigate: command === 'source' ? os.source : os.live };
  }
  return { lines: [`Unknown command: ${command}`, 'Type help for available commands.'] };
}
