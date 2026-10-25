import { expect, test } from 'vitest';
import { terminalContext, terminalTheme } from '../src/terminal-appearance';
import { screenPolicy } from '../src/screen-policy';

test('terminal context follows focus and the visual viewport without recoloring the light top section', () => {
  expect(terminalTheme.cursor).toBe('rgba(17, 255, 0, 0.5)');
  expect(terminalTheme.foreground).toBe('#11FF00');
  expect(terminalTheme.background).toBe('#000000');
  expect(terminalContext('home', false, 900, 1600, 800)).toBe(false);
  expect(terminalContext('home', true, 900, 1600, 350)).toBe(true);
  expect(terminalContext('home', false, -500, 400, 350)).toBe(true);
  expect(terminalContext('terminal', false, 0, 1000, 350)).toBe(true);
  expect(terminalContext('visual', false, 0, 1000, 800)).toBe(false);
});

test('arbitrary frames stay opaque and framing constraints produce a user-controlled fallback', () => {
  expect(screenPolicy({url:'https://example.com/',label:'Example',kind:'custom'},'https://yuxiaoli.github.io/boot-loader/',false).sandbox).not.toContain('allow-same-origin');
  expect(screenPolicy({url:'https://example.com/',label:'Example',kind:'registry'},'https://yuxiaoli.github.io/boot-loader/',false).sandbox).not.toContain('allow-same-origin');
  expect(screenPolicy({url:'http://example.com/',label:'Example',kind:'custom'},'https://yuxiaoli.github.io/boot-loader/',false).reason).toContain('HTTP');
  expect(screenPolicy({url:'https://webvm.io/',label:'WebVM',kind:'custom'},'https://yuxiaoli.github.io/boot-loader/',false).reason).toContain('cross-origin');
});
