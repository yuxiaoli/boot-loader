import { afterEach, expect, test, vi } from 'vitest';

const deferred = vi.hoisted(() => {
  let release!: () => void;
  const ready = new Promise<void>((resolve) => { release = resolve; });
  return { ready, release, focus: vi.fn() };
});

vi.mock('../src/terminal', async () => {
  await deferred.ready;
  return { mountTerminal: () => deferred.focus };
});

afterEach(() => vi.unstubAllGlobals());

test('a focus request made while the terminal module loads is applied when it mounts', async () => {
  let tapFocus!: () => void;
  vi.stubGlobal('window', {});
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
  expect(deferred.focus).not.toHaveBeenCalled();
  deferred.release();
  await vi.waitFor(() => expect(deferred.focus).toHaveBeenCalledTimes(1));
});
