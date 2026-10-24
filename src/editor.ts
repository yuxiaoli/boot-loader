import { destinations } from './destinations';

const commands = ['help', 'os list', 'boot', 'source', 'clear'];
export function complete(line: string): string[] {
  if (!line) return [];
  const lower = line.toLowerCase();
  const candidates = /^(boot|source)\s/.test(lower)
    ? destinations.map((os) => `${lower.split(/\s/)[0]} ${os.id}`)
    : commands;
  return candidates.filter((value) => value.startsWith(lower));
}

/** Only printable ASCII is accepted; pasted lines can never execute commands. */
export function sanitizeInput(data: string): string {
  return data.replace(/\x1b\[[0-?]*[ -/]*[@-~]/g, '').replace(/[\r\n]+/g, ' ').replace(/[^\x20-\x7e]/g, '');
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
