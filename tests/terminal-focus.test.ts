import { afterEach, expect, test, vi } from 'vitest';
import { version } from '../package.json';

const handlers = vi.hoisted(() => ({
  output: [] as string[],
  key: undefined as ((event: KeyboardEvent) => boolean) | undefined,
  data: undefined as ((data: string) => void) | undefined,
}));
vi.mock('@xterm/xterm', () => ({ Terminal: class {
  cols = 80;
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
  const input = { setAttribute() {} };
  const doc = { activeElement: input as unknown };
  vi.stubGlobal('document', doc);
  vi.stubGlobal('window', { innerWidth: 1280, matchMedia: () => ({ matches: false }), addEventListener() {} });
  vi.stubGlobal('location', { origin: 'http://localhost' });
  vi.stubGlobal('ResizeObserver', class { observe() {} disconnect() {} });
  mountTerminal({ querySelector: () => input } as unknown as HTMLElement);
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
  const input = { setAttribute() {} };
  vi.stubGlobal('window', { innerWidth: 1280, matchMedia: () => ({ matches: false }), addEventListener() {} });
  vi.stubGlobal('location', { origin: 'http://localhost' });
  vi.stubGlobal('ResizeObserver', class { observe() {} disconnect() {} });
  mountTerminal({ querySelector: () => input } as unknown as HTMLElement);
  expect(handlers.output.join('')).toBe(
    `Boot Loader [Version ${version}]\r\nCopyright (c) Vector Index. All rights reserved.\r\n\r\nsystems $ `,
  );
});
