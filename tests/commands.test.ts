import { expect, test } from 'vitest';
import { executeCommand } from '../src/commands';
import { CommandHistory, complete, sanitizeInput } from '../src/editor';

test('boot commands resolve only the four configured desktops', () => {
  expect(executeCommand('boot macos').navigate).toBe('https://yuxiaoli.github.io/macos/');
  expect(executeCommand('boot win12').navigate).toBe('https://yuxiaoli.github.io/win12/');
  expect(executeCommand('boot winxp').navigate).toBe('https://yuxiaoli.github.io/winXP/');
  expect(executeCommand('boot daedalos').navigate).toBe('https://yuxiaoli.github.io/daedalOS/');
});

test('completion, history and pasted text preserve an editable safe command line', () => {
  expect(complete('bo')).toEqual(['boot']);
  expect(complete('boot w')).toEqual(['boot win12', 'boot winxp']);
  expect(complete('source mac')).toEqual(['source macos']);
  expect(complete('')).toEqual([]);
  const history = new CommandHistory();
  history.add('help'); history.add('os list');
  expect(history.move(-1, 'draft')).toBe('os list');
  expect(history.move(-1, '')).toBe('help');
  expect(history.move(1, '')).toBe('os list');
  expect(history.move(1, '')).toBe('draft');
  expect(sanitizeInput('help\r\nboot macos\x1b[31m')).toBe('help boot macos');
});

test('help, list, source and clear provide useful results without shell execution', () => {
  expect(executeCommand('help').lines.join('\n')).toContain('boot <system>');
  expect(executeCommand('os list').lines.join('\n')).toContain('winxp');
  expect(executeCommand('source').lines.join('\n')).toContain('https://github.com/yuxiaoli/boot-loader');
  expect(executeCommand('source WinXP').navigate).toBe('https://github.com/yuxiaoli/winXP');
  expect(executeCommand('clear').clear).toBe(true);
  expect(executeCommand('boot unknown').lines.join('\n')).toContain('Unknown system');
  expect(executeCommand('boot').lines.join('\n')).toContain('Usage:');
  expect(executeCommand('rm -rf /').lines.join('\n')).toContain('Unknown command');
  expect(executeCommand('boot macos; alert(1)').navigate).toBeUndefined();
  expect(executeCommand('  BOOT   MACOS  ').navigate).toBe('https://yuxiaoli.github.io/macos/');
  expect(executeCommand('').lines).toEqual([]);
});
