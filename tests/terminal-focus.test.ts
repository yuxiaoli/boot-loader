import { afterEach, expect, test, vi } from 'vitest';
import { version } from '../package.json';

const handlers = vi.hoisted(() => ({
  output: [] as string[],
  options: {} as Record<string, unknown>,
  key: undefined as ((event: KeyboardEvent) => boolean) | undefined,
  data: undefined as ((data: string) => void) | undefined,
}));
vi.mock('@xterm/xterm', () => ({ Terminal: class {
  cols = 80;
  options: Record<string, unknown>;
  constructor(options: Record<string, unknown>) { this.options = options; handlers.options = options; }
  loadAddon() {}
  open() {}
  write(value: string) { handlers.output.push(value); }
  writeln(value: string) { handlers.output.push(`${value}\r\n`); }
  attachCustomKeyEventHandler(callback: typeof handlers.key) { handlers.key = callback; }
  onData(callback: typeof handlers.data) { handlers.data = callback; }
  focus() {}
  dispose() {}
} }));
vi.mock('@xterm/addon-fit', () => ({ FitAddon: class { fit() {} } }));
vi.mock('../src/screen-session', () => ({ openComputer: vi.fn() }));
import { mountTerminal } from '../src/terminal';

afterEach(() => { vi.unstubAllGlobals(); handlers.output.length = 0; });

test('matching Tab and Shift+Tab retain terminal focus while empty, unmatched and outside Tab remain native', () => {
  const input = { setAttribute() {}, addEventListener() {} };
  const doc = { activeElement: input as unknown, querySelector: () => null };
  vi.stubGlobal('document', doc);
  vi.stubGlobal('window', { innerWidth: 1280, matchMedia: () => ({ matches: false, addEventListener() {}, removeEventListener() {} }), addEventListener() {} });
  vi.stubGlobal('location', { origin: 'http://localhost' });
  vi.stubGlobal('ResizeObserver', class { observe() {} disconnect() {} });
  mountTerminal({ querySelector: () => input, closest: () => null } as unknown as HTMLElement);
  const tab = (shiftKey = false) => Object.assign(new Event('keydown', { cancelable: true }), { key: 'Tab', shiftKey }) as KeyboardEvent;
  const empty = tab();
  expect(handlers.key!(empty)).toBe(false);
  expect(empty.defaultPrevented).toBe(false);
  handlers.data!('boot w');
  for (const reverse of [false, true]) {
    const event = tab(reverse);
    expect(handlers.key!(event)).toBe(true);
    expect(event.defaultPrevented).toBe(true);
  }
  doc.activeElement = {};
  const outside = tab();
  expect(handlers.key!(outside)).toBe(false);
  expect(outside.defaultPrevented).toBe(false);
  doc.activeElement = input;
  handlers.data!('\x15');
  handlers.data!('unmatched');
  const unmatched = tab(true);
  expect(handlers.key!(unmatched)).toBe(false);
  expect(unmatched.defaultPrevented).toBe(false);
});

test('initial banner uses package version and copyright, one blank line, then prompt only', () => {
  vi.stubGlobal('document', { querySelector: () => null });
  const input = { setAttribute() {}, addEventListener() {} };
  vi.stubGlobal('window', { innerWidth: 1280, matchMedia: () => ({ matches: false, addEventListener() {}, removeEventListener() {} }), addEventListener() {} });
  vi.stubGlobal('location', { origin: 'http://localhost' });
  vi.stubGlobal('ResizeObserver', class { observe() {} disconnect() {} });
  mountTerminal({ querySelector: () => input, closest: () => null } as unknown as HTMLElement);
  expect(handlers.output.join('')).toBe(
    `Boot Loader [Version ${version}]\r\nCopyright (c) Vector Index. All rights reserved.\r\n\r\nsystems> `,
  );
});

test('Escape discards draft without executing or erasing history; composing keys remain with IME', () => {
  const listeners: Record<string, () => void> = {};
  const input = { setAttribute() {}, addEventListener: (name: string, callback: () => void) => { listeners[name] = callback; } };
  vi.stubGlobal('document', { activeElement: input, querySelector: () => null });
  vi.stubGlobal('window', { innerWidth: 1280, matchMedia: () => ({ matches: false, addEventListener() {}, removeEventListener() {} }), addEventListener() {} });
  vi.stubGlobal('location', { origin: 'http://localhost' });
  vi.stubGlobal('ResizeObserver', class { observe() {} disconnect() {} });
  mountTerminal({ querySelector: () => input, closest: () => null } as unknown as HTMLElement);
  handlers.data!('echo retained'); handlers.data!('\r');
  handlers.data!('echo discarded'); handlers.data!('\x1b');
  expect(handlers.output.at(-1)).toBe('\r\x1b[2Ksystems> ');
  expect(handlers.output).not.toContain('discarded\r\n');
  handlers.data!('\x1b[A');
  expect(handlers.output.at(-1)).toBe('\r\x1b[2Ksystems> echo retained');
  handlers.data!('\x1b'); handlers.data!('\x1b[B');
  expect(handlers.output.at(-1)).toBe('\r\x1b[2Ksystems> ');
  handlers.data!('echo pending');
  listeners.compositionstart();
  const count = handlers.output.length;
  expect(handlers.key!({ key: 'Escape', isComposing: true } as KeyboardEvent)).toBe(false);
  handlers.data!('\x1b'); handlers.data!('\r');
  expect(handlers.output.length).toBe(count);
  listeners.compositionend(); handlers.data!('\x1b');
  expect(handlers.output.at(-1)).toBe('\r\x1b[2Ksystems> ');
});

test('accessible preset controls update options and motion preference without stealing focus', () => {
  const events: Record<string, () => void> = {};
  const input = { setAttribute: vi.fn(), addEventListener() {} };
  const font = { value: '', disabled: true, addEventListener: (_: string, callback: () => void) => { events.font = callback; } };
  const theme = { value: 'green', disabled: true, addEventListener: (_: string, callback: () => void) => { events.theme = callback; } };
  const motion = { matches: true, addEventListener: (_: string, callback: () => void) => { events.motion = callback; }, removeEventListener() {} };
  vi.stubGlobal('document', { activeElement: font, querySelector: (selector: string) => selector === '#terminal-font-size' ? font : selector === '#terminal-theme' ? theme : null });
  vi.stubGlobal('window', { innerWidth: 1280, matchMedia: () => motion, addEventListener() {} });
  vi.stubGlobal('location', { origin: 'http://localhost' });
  vi.stubGlobal('ResizeObserver', class { observe() {} disconnect() {} });
  mountTerminal({ querySelector: () => input, closest: () => null } as unknown as HTMLElement);
  expect(handlers.options).toMatchObject({ cursorStyle: 'block', cursorInactiveStyle: 'outline', cursorBlink: false, screenReaderMode: true });
  expect(input.setAttribute).toHaveBeenCalledWith('aria-label', 'Boot Loader command input');
  expect(font.disabled).toBe(false); expect(theme.disabled).toBe(false);
  font.value = '20'; events.font(); expect(handlers.options.fontSize).toBe(20);
  font.value = '999'; events.font(); expect(handlers.options.fontSize).toBe(20);
  theme.value = 'amber'; events.theme(); expect(handlers.options.theme).toMatchObject({ foreground: '#FFBF00' });
  motion.matches = false; events.motion(); expect(handlers.options.cursorBlink).toBe(true);
  expect(document.activeElement).toBe(font);
});
