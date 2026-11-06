import { afterEach, expect, test, vi } from 'vitest';

const deferred = vi.hoisted(() => {
  let release!: () => void;
  let releaseCatalog!: () => void;
  const ready = new Promise<void>((resolve) => { release = resolve; });
  const catalogReady = new Promise<void>((resolve) => { releaseCatalog = resolve; });
  const load = vi.fn(async () => { await catalogReady; return { commands: [] }; });
  return { ready, release, releaseCatalog, load, focus: vi.fn() };
});
vi.mock('../src/screen-session', () => ({ initializeScreenSession: vi.fn() }));
vi.mock('../src/terminal-appearance', () => ({ trackTerminalAppearance: vi.fn() }));
vi.mock('../src/terminal', async () => {
  await deferred.ready;
  return { mountTerminal: () => deferred.focus, loadTerminalCommandCatalog: deferred.load };
});
afterEach(() => vi.unstubAllGlobals());
test('focus requested during lazy loading is applied once after mount and later taps still work', async () => {
  let tapFocus!: () => void;
  vi.stubGlobal('window', { addEventListener() {} });
  vi.stubGlobal('document', {
    querySelectorAll: () => [],
    querySelector: (selector: string) => {
      if (selector === '#terminal-host') return {};
      if (selector === '#focus-terminal') return {
        addEventListener: (_event: string, listener: () => void) => { tapFocus = listener; },
      };
      return null;
    },
  });
  await import('../src/main');
  tapFocus();
  tapFocus();
  expect(deferred.focus).not.toHaveBeenCalled();
  deferred.release();
  await vi.waitFor(() => expect(deferred.load).toHaveBeenCalledOnce());
  expect(deferred.focus).not.toHaveBeenCalled();
  deferred.releaseCatalog();
  await vi.waitFor(() => expect(deferred.focus).toHaveBeenCalledTimes(1));
  tapFocus();
  expect(deferred.focus).toHaveBeenCalledTimes(2);
});
