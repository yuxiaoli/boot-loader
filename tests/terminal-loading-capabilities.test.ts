import { afterEach, expect, test, vi } from 'vitest';

const mock = vi.hoisted(() => ({ load: vi.fn(async () => ({ commands: [] })), mount: vi.fn(() => vi.fn()) }));
vi.mock('../src/screen-session', () => ({ initializeScreenSession: vi.fn() }));
vi.mock('../src/terminal-appearance', () => ({ trackTerminalAppearance: vi.fn() }));
vi.mock('../src/terminal', () => ({ loadTerminalCommandCatalog: mock.load, mountTerminal: mock.mount }));
vi.mock('../src/terminal-catalog-api', () => ({ createPopularTerminalLoader: vi.fn() }));
afterEach(() => vi.unstubAllGlobals());

test('initialization can use a fallback when AbortController is unavailable', async () => {
  vi.stubGlobal('AbortController', undefined);
  vi.stubGlobal('window', { addEventListener() {} });
  vi.stubGlobal('document', { querySelectorAll: () => [], querySelector: (selector: string) => selector === '#terminal-host' ? {} : null });
  await import('../src/main');
  await vi.waitFor(() => expect(mock.mount).toHaveBeenCalledOnce());
});
