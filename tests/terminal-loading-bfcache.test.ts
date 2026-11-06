import { afterEach, expect, test, vi } from 'vitest';

const pending = vi.hoisted(() => {
  let release!: () => void;
  const ready = new Promise<void>(resolve => { release = resolve; });
  return { ready, release, load: vi.fn(async (_signal?: AbortSignal) => { await ready; return { commands: [] }; }), mount: vi.fn(() => vi.fn()) };
});
vi.mock('../src/screen-session', () => ({ initializeScreenSession: vi.fn() }));
vi.mock('../src/terminal-appearance', () => ({ trackTerminalAppearance: vi.fn() }));
vi.mock('../src/terminal', () => ({ loadTerminalCommandCatalog: pending.load, mountTerminal: pending.mount }));
vi.mock('../src/terminal-catalog-api', () => ({ createPopularTerminalLoader: vi.fn() }));
afterEach(() => vi.unstubAllGlobals());

test('a cached pagehide leaves pending initialization usable', async () => {
  let pagehide!: (event: { persisted: boolean }) => void;
  vi.stubGlobal('window', { addEventListener: (name: string, callback: typeof pagehide) => { if (name === 'pagehide') pagehide = callback; } });
  vi.stubGlobal('document', { querySelectorAll: () => [], querySelector: (selector: string) => selector === '#terminal-host' ? {} : null });
  await import('../src/main');
  await vi.waitFor(() => expect(pending.load).toHaveBeenCalledOnce());
  pagehide({ persisted: true });
  expect(pending.load.mock.calls[0][0]?.aborted).toBe(false);
  pending.release();
  await vi.waitFor(() => expect(pending.mount).toHaveBeenCalledOnce());
});
