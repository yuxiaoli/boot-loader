import { afterEach, expect, test, vi } from 'vitest';
import { initializeTerminalHeight, terminalThemes } from '../src/terminal-appearance';
import { renderPage } from '../src/render';

afterEach(() => vi.unstubAllGlobals());
test('standalone gets initial remaining viewport; embedded height is untouched and no resize listener registered', () => {
  const addEventListener = vi.fn();
  vi.stubGlobal('window', { innerHeight: 900, visualViewport: { height: 800, offsetTop: 10 }, addEventListener });
  vi.stubGlobal('getComputedStyle', () => ({ marginBottom: '20px' }));
  const host = { closest: () => ({}), style: { height: '' }, getBoundingClientRect: () => ({ top: 300 }) };
  initializeTerminalHeight(host as unknown as HTMLElement);
  expect(host.style.height).toBe('489px');
  window.innerHeight = 400;
  expect(host.style.height).toBe('489px');
  expect(addEventListener).not.toHaveBeenCalled();
  const embedded = { closest: () => null, style: { height: '320px' } };
  initializeTerminalHeight(embedded as unknown as HTMLElement);
  expect(embedded.style.height).toBe('320px');
});
test('named themes are extensible without color inputs and preserve footer credit', () => {
  const html = renderPage('terminal');
  for (const [id, preset] of Object.entries(terminalThemes)) expect(html).toContain(`<option value="${id}">${preset.label}</option>`);
  expect(html).not.toContain('type="color"');
  expect(html).toContain('aria-label="Terminal font size"');
  expect(html).toContain('Built by <a href="https://www.linkedin.com/in/yuxiaoli/">Sean</a> with ❤️');
});
