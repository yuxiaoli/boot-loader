import { destinations } from './destinations';

const commands = ['help', 'ls', 'pwd', 'cwd', 'cd', 'cat', 'echo', 'boot', 'load', 'set', 'time', 'source', 'clear'];
export function complete(line: string, variableNames: string[] = []): string[] {
  if (!line) return [];
  const lower = line.toLowerCase();
  let candidates = commands;
  if (lower.startsWith('boot ')) {
    const parts = lower.split(' ');
    if (parts[1] === '--embed' && parts.length > 2) candidates = destinations.map((os) => `boot --embed ${os.id}`);
    else if (destinations.some((os) => os.id === parts[1]) && parts.length > 2) candidates = [`boot ${parts[1]} --embed`];
    else candidates = [...destinations.map((os) => `boot ${os.id}`), 'boot --embed'];
  } else if (lower.startsWith('source ')) candidates = destinations.map((os) => `source ${os.id}`);
  else if (lower.startsWith('load $')) candidates = variableNames.map((name) => `load $${name}`);
  else if (/^(cd|cat|ls)\s/.test(lower)) candidates = ['/systems', '/README.txt', '/help.txt'].map((path) => `${lower.split(/\s/)[0]} ${path}`);
  return candidates.filter((value) => value.startsWith(lower));
}

/** Only printable ASCII is accepted; pasted lines can never execute commands. */
export function sanitizeInput(data: string): string {
  return data.replace(/\x1b\[[0-?]*[ -/]*[@-~]/g, '').replace(/[\r\n]+/g, ' ').replace(/[^\x20-\x7e]/g, '');
}

export function inputWindow(line: string, cursor: number, columns: number): { text: string; cursor: number } {
  const width = Math.max(1, columns);
  const start = Math.max(0, cursor - width);
  return { text: line.slice(start, start + width), cursor: cursor - start };
}

export class CommandHistory {
  private entries: string[] = [];
  private index = 0;
  private draft = '';
  add(line: string) {
    if (line && this.entries.at(-1) !== line) this.entries.push(line);
    if (this.entries.length > 100) this.entries.shift();
    this.index = this.entries.length;
    this.draft = '';
  }
  move(direction: -1 | 1, current: string): string {
    if (this.index === this.entries.length) this.draft = current;
    this.index = Math.max(0, Math.min(this.entries.length, this.index + direction));
    return this.entries[this.index] ?? this.draft;
  }
}
