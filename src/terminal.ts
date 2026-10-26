import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import '@xterm/xterm/css/xterm.css';
import { executeCommand, TerminalSession } from './commands';
import { CommandHistory, CompletionCycle, inputWindow, sanitizeInput } from './editor';
import { terminalTheme } from './terminal-appearance';
import { openComputer } from './screen-session';
import { destinations } from './destinations';

export function mountTerminal(host: HTMLElement): () => void {
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const term = new Terminal({
    theme: terminalTheme,
    fontFamily: '"Cascadia Mono", "SFMono-Regular", Consolas, "Liberation Mono", monospace',
    fontSize: window.innerWidth < 640 ? 13 : 15,
    lineHeight: 1.25,
    cursorBlink: !reducedMotion,
    cursorStyle: 'underline',
    cursorInactiveStyle: 'underline',
    screenReaderMode: true,
    convertEol: true,
    scrollback: 400,
    allowProposedApi: false,
  });
  const fit = new FitAddon();
  term.loadAddon(fit);
  term.open(host);
  const input = host.querySelector<HTMLTextAreaElement>('textarea')!;
  input.setAttribute('aria-label', 'Boot Loader command input');
  fit.fit();
  let line = '';
  let cursor = 0;
  const history = new CommandHistory();
  const completion = new CompletionCycle();
  const session = new TerminalSession(new URL(import.meta.env.BASE_URL, location.origin).href);
  const maxLength = () => 2200;
  const completionContext = () => ({ cwd: session.cwd, variableNames: [...session.variables.keys()] });
  const writePrompt = () => term.write(session.prompt);
  const redraw = () => {
    const view = inputWindow(line, cursor, Math.max(1, term.cols - session.prompt.length - 1));
    term.write(`\r\x1b[2K${session.prompt}${view.text}`);
    if (view.text.length > view.cursor) term.write(`\x1b[${view.text.length - view.cursor}D`);
  };
  const reset = () => { line = ''; cursor = 0; completion.reset(); };
  const submit = () => {
    term.write('\r\n');
    history.add(line.trim());
    const result = executeCommand(line, session);
    if (result.clear) term.write('\x1b[2J\x1b[3J\x1b[H');
    result.lines.forEach((output) => term.writeln(output));
    reset();
    writePrompt();
    if (result.navigate) window.location.assign(result.navigate);
    if (result.screen) openComputer(result.screen, host.querySelector('textarea') ?? undefined);
  };
  term.writeln('BOOT LOADER [1.0]');
  term.writeln(`${destinations.length} systems. A simulated shell.`);
  term.writeln('');
  term.writeln('Type help for commands.');
  term.writeln('Try: ls | boot win11');
  term.writeln('');
  writePrompt();
  term.attachCustomKeyEventHandler((event) => {
    // Only a focused console with matches captures Tab, in either direction.
    if (event.key === 'Tab') {
      const capture = document.activeElement === input && completion.canComplete(line, cursor, completionContext());
      // xterm's screen-reader mode leaves Shift+Tab's native focus action enabled.
      if (capture) event.preventDefault();
      return capture;
    }
    return true;
  });
  term.onData((data) => {
    if (data === '\t' || data === '\x1b[Z') {
      const edit = completion.next(line, cursor, completionContext(), data === '\t' ? 1 : -1);
      if (edit && edit.line.length <= maxLength()) { line = edit.line; cursor = edit.cursor; redraw(); }
      else completion.reset();
      return;
    }
    // Edits, caret movement, history and command submission start a new cycle.
    completion.reset();
    if (data === '\r') { submit(); return; }
    if (data === '\x03') { term.write('^C\r\n'); reset(); writePrompt(); return; }
    if (data === '\x0c') { term.write('\x1b[2J\x1b[3J\x1b[H'); redraw(); return; }
    if (data === '\x1b[A' || data === '\x1b[B') { line = history.move(data === '\x1b[A' ? -1 : 1, line).slice(0, maxLength()); cursor = line.length; redraw(); return; }
    if (data === '\x1b[D') { cursor = Math.max(0, cursor - 1); redraw(); return; }
    if (data === '\x1b[C') { cursor = Math.min(line.length, cursor + 1); redraw(); return; }
    if (data === '\x01' || data === '\x1b[H' || data === '\x1b[1~') { cursor = 0; redraw(); return; }
    if (data === '\x05' || data === '\x1b[F' || data === '\x1b[4~') { cursor = line.length; redraw(); return; }
    if (data === '\x7f' || data === '\b') { if (cursor > 0) { line = line.slice(0, cursor - 1) + line.slice(cursor); cursor--; redraw(); } return; }
    if (data === '\x1b[3~') { line = line.slice(0, cursor) + line.slice(cursor + 1); redraw(); return; }
    if (data === '\x15') { reset(); redraw(); return; }
    if (data.startsWith('\x1b') && !data.includes('\r') && !data.includes('\n')) return;
    const text = sanitizeInput(data).slice(0, maxLength() - line.length);
    if (text) { line = line.slice(0, cursor) + text + line.slice(cursor); cursor += text.length; redraw(); }
  });
  const observer = new ResizeObserver(() => {
    fit.fit();
    redraw();
  });
  observer.observe(host);
  window.addEventListener('pagehide', (event) => {
    // A cached Back navigation must restore a working console.
    if (!event.persisted) { observer.disconnect(); term.dispose(); }
  });
  return () => term.focus();
}
