import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import '@xterm/xterm/css/xterm.css';
import { executeCommand } from './commands';
import { CommandHistory, complete, sanitizeInput } from './editor';

export function mountTerminal(host: HTMLElement): () => void {
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const term = new Terminal({
    theme: { background: '#000000', foreground: '#11FF00', cursor: '#11FF00', cursorAccent: '#000000', selectionBackground: '#11ff0040' },
    fontFamily: '"Cascadia Mono", "SFMono-Regular", Consolas, "Liberation Mono", monospace',
    fontSize: window.innerWidth < 640 ? 13 : 15,
    lineHeight: 1.5,
    cursorBlink: !reducedMotion,
    cursorStyle: 'block',
    screenReaderMode: true,
    convertEol: true,
    scrollback: 400,
    allowProposedApi: false,
  });
  const fit = new FitAddon();
  term.loadAddon(fit);
  term.open(host);
  host.querySelector('textarea')?.setAttribute('aria-label', 'Boot Loader command input');
  fit.fit();
  let line = '';
  let cursor = 0;
  const history = new CommandHistory();
  const prompt = 'boot> ';
  const maxLength = () => Math.max(10, Math.min(120, term.cols - prompt.length - 1));
  const redraw = () => {
    term.write(`\r\x1b[2K${prompt}${line}`);
    if (line.length > cursor) term.write(`\x1b[${line.length - cursor}D`);
  };
  const reset = () => { line = ''; cursor = 0; };
  const submit = () => {
    term.write('\r\n');
    history.add(line.trim());
    const result = executeCommand(line);
    if (result.clear) term.write('\x1b[2J\x1b[3J\x1b[H');
    result.lines.forEach((output) => term.writeln(output));
    reset();
    term.write(prompt);
    if (result.navigate) window.location.assign(result.navigate);
  };
  term.writeln('BOOT LOADER [1.0]');
  term.writeln('Four systems. One command away.');
  term.writeln('');
  term.writeln('Type help for commands.');
  term.writeln('Try: boot macos');
  term.writeln('');
  term.write(prompt);
  term.attachCustomKeyEventHandler((event) => {
    // Empty-prompt Tab and Shift+Tab retain normal browser focus navigation.
    if (event.key === 'Tab' && (event.shiftKey || !line || complete(line).length === 0)) return false;
    return true;
  });
  term.onData((data) => {
    if (data === '\r') { submit(); return; }
    if (data === '\x03') { term.write('^C\r\n'); reset(); term.write(prompt); return; }
    if (data === '\x0c') { term.write('\x1b[2J\x1b[3J\x1b[H'); redraw(); return; }
    if (data === '\x1b[A' || data === '\x1b[B') { line = history.move(data === '\x1b[A' ? -1 : 1, line).slice(0, maxLength()); cursor = line.length; redraw(); return; }
    if (data === '\x1b[D') { cursor = Math.max(0, cursor - 1); redraw(); return; }
    if (data === '\x1b[C') { cursor = Math.min(line.length, cursor + 1); redraw(); return; }
    if (data === '\x01' || data === '\x1b[H' || data === '\x1b[1~') { cursor = 0; redraw(); return; }
    if (data === '\x05' || data === '\x1b[F' || data === '\x1b[4~') { cursor = line.length; redraw(); return; }
    if (data === '\x7f' || data === '\b') { if (cursor > 0) { line = line.slice(0, cursor - 1) + line.slice(cursor); cursor--; redraw(); } return; }
    if (data === '\x1b[3~') { line = line.slice(0, cursor) + line.slice(cursor + 1); redraw(); return; }
    if (data === '\x15') { reset(); redraw(); return; }
    if (data === '\t') {
      const matches = complete(line);
      if (matches.length === 1) { line = matches[0].slice(0, maxLength()); cursor = line.length; }
      else if (matches.length > 1) { term.write('\r\n'); term.writeln(matches.join('  ')); }
      redraw(); return;
    }
    if (data.startsWith('\x1b') && !data.includes('\r') && !data.includes('\n')) return;
    const text = sanitizeInput(data).slice(0, maxLength() - line.length);
    if (text) { line = line.slice(0, cursor) + text + line.slice(cursor); cursor += text.length; redraw(); }
  });
  const observer = new ResizeObserver(() => {
    fit.fit();
    const cropped = line.slice(0, maxLength());
    if (cropped !== line) { line = cropped; cursor = Math.min(cursor, line.length); redraw(); }
  });
  observer.observe(host);
  window.addEventListener('pagehide', (event) => {
    // A cached Back navigation must restore a working console.
    if (!event.persisted) { observer.disconnect(); term.dispose(); }
  });
  return () => term.focus();
}
