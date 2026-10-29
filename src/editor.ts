import { destinations, findDestination } from './destinations';
import { virtualPathCompletions } from './commands';

const commands = ['boot', 'cat', 'cd', 'clear', 'cls', 'cwd', 'echo', 'help', 'ls', 'open', 'pwd', 'set', 'source', 'time'];
export function complete(line: string, variableNames: string[] = [], cwd = '/systems'): string[] {
  if (!line.trim()) return [];
  const start = line.search(/\S*$/);
  const head = line.slice(0, start);
  const token = line.slice(start);
  const previous = head.trim().split(/\s+/).filter(Boolean);
  if (!previous.length) return commands.filter((value) => value.startsWith(token.toLowerCase())).map((value) => head + value);
  const command = previous[0].toLowerCase();
  const args = previous.slice(1);
  let candidates: string[] = [];
  if (command === 'boot' || command === 'open' || command === 'load') {
    if (args.some((value) => value.startsWith('-') && value !== '--embed') || args.filter((value) => value === '--embed').length > 1) return [];
    const values = args.filter((value) => value !== '--embed');
    if (values.length > 1 || (command === 'boot' && values.length === 1 && !findDestination(values[0]))) return [];
    if (!values.length) candidates = command === 'boot' ? destinations.map((os) => os.id) : variableNames.map((name) => `$${name}`);
    if (!args.includes('--embed')) candidates.push('--embed');
  } else if (command === 'source' && !args.length) candidates = destinations.map((os) => os.id);
  else if (['cd', 'cat', 'ls'].includes(command) && !args.length) return virtualPathCompletions(token, cwd, command === 'cd').map((value) => head + value);
  return candidates.filter((value) => value.startsWith(value.startsWith('$') ? token : token.toLowerCase())).map((value) => head + value);
}

type CompletionEdit = { line: string; cursor: number };
type CompletionContext = { cwd?: string; variableNames?: string[] };

/** A cycle belongs to the original prefix until input, caret or context changes. */
export class CompletionCycle {
  private active?: { key: string; edits: CompletionEdit[]; index: number; result: CompletionEdit };
  reset(): void { this.active = undefined; }
  private key(context: CompletionContext): string { return JSON.stringify([context.cwd ?? '/systems', context.variableNames ?? []]); }
  private current(line: string, cursor: number, context: CompletionContext): boolean {
    return !!this.active && this.active.key === this.key(context) && this.active.result.line === line && this.active.result.cursor === cursor;
  }
  canComplete(line: string, cursor: number, context: CompletionContext): boolean {
    return this.current(line, cursor, context) || complete(line.slice(0, cursor), context.variableNames, context.cwd).length > 0;
  }
  next(line: string, cursor: number, context: CompletionContext, direction: -1 | 1 = 1): CompletionEdit | undefined {
    if (this.current(line, cursor, context)) {
      const active = this.active!;
      active.index = (active.index + direction + active.edits.length) % active.edits.length;
      active.result = active.edits[active.index];
      return { ...active.result };
    }
    const edits = complete(line.slice(0, cursor), context.variableNames, context.cwd).map((value) => ({ line: value + line.slice(cursor), cursor: value.length }));
    if (!edits.length) { this.reset(); return; }
    const index = direction === 1 ? 0 : edits.length - 1;
    this.active = { key: this.key(context), edits, index, result: edits[index] };
    return { ...edits[index] };
  }
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
  resetNavigation(): void { this.index = this.entries.length; this.draft = ''; }
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
