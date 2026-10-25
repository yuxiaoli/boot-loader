import { expect, test } from 'vitest';
import { executeCommand, TerminalSession } from '../src/commands';
import { CommandHistory, complete, sanitizeInput } from '../src/editor';

test('boot requires an explicit ID and resolves all six systems independently of selection', () => {
  expect(executeCommand('boot macos').navigate).toBe('https://yuxiaoli.github.io/macos/');
  expect(executeCommand('boot win12').navigate).toBe('https://yuxiaoli.github.io/win12/');
  expect(executeCommand('boot winxp').navigate).toBe('https://yuxiaoli.github.io/winXP/');
  expect(executeCommand('boot daedalos').navigate).toBe('https://yuxiaoli.github.io/daedalOS/');
  expect(executeCommand('boot WIN11').navigate).toBe('https://win11.vercel.app/');
  expect(executeCommand('boot webvm').navigate).toBe('https://webvm.io/');
  expect(executeCommand('boot').navigate).toBeUndefined();
  expect(executeCommand('boot').lines.join('\n')).toContain('Usage: boot <system>');
});

test('completion, history and pasted text preserve an editable safe command line', () => {
  expect(complete('bo')).toEqual(['boot']);
  expect(complete('boot w')).toEqual(['boot win12', 'boot winxp', 'boot win11', 'boot webvm']);
  expect(complete('source mac')).toEqual(['source macos']);
  expect(complete('')).toEqual([]);
  const history = new CommandHistory();
  history.add('help'); history.add('ls');
  expect(history.move(-1, 'draft')).toBe('ls');
  expect(history.move(-1, '')).toBe('help');
  expect(history.move(1, '')).toBe('ls');
  expect(history.move(1, '')).toBe('draft');
  expect(sanitizeInput('help\r\nboot macos\x1b[31m')).toBe('help boot macos');
});

test('help, list, source and clear provide useful results without shell execution', () => {
  expect(executeCommand('help').lines.join('\n')).toContain('boot <system>');
  expect(executeCommand('ls').lines.join('\n')).toContain('winxp');
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

test('a session starts among six systems and navigates a virtual filesystem safely', () => {
  const session = new TerminalSession();
  expect(executeCommand('pwd', session).lines).toEqual(['/systems']);
  expect(executeCommand('ls', session).lines).toHaveLength(6);
  expect(executeCommand('os list', session).lines.join('\n')).toContain('Unknown command');
  executeCommand('cd ..', session);
  expect(executeCommand('cwd', session).lines).toEqual(['/']);
  expect(executeCommand('ls', session).lines.join('\n')).toContain('README.txt');
  expect(executeCommand('cat README.txt', session).lines.join('\n')).toContain('simulated');
  expect(executeCommand('boot win11', session).navigate).toBe('https://win11.vercel.app/');
  executeCommand('cd ./systems/../systems', session);
  expect(executeCommand('pwd', session).lines).toEqual(['/systems']);
  expect(executeCommand('cd win11', session).lines.join('\n')).toContain('Not a directory');
  expect(executeCommand('cd missing', session).lines.join('\n')).toContain('No such path');
  executeCommand('cd /../../', session);
  expect(executeCommand('pwd', session).lines).toEqual(['/']);
  expect(executeCommand('cat /etc/passwd', session).lines.join('\n')).toContain('No such path');
  expect(executeCommand('echo $(whoami)', session).lines).toEqual(['$(whoami)']);
});
