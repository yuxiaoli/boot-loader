import { expect, test, vi } from 'vitest';
import { executeCommand, TerminalSession } from '../src/commands';

test('open and its load alias use the same safe URL contract for direct and explicit embedded launches', () => {
  const session = new TerminalSession();
  const url = 'https://example.com/Case?q=Value';
  expect(executeCommand(`open ${url}`, session).navigate).toBe(url);
  expect(executeCommand(`open ${url}`, session).screen).toBeUndefined();
  expect(executeCommand(`open ${url} --embed`, session).screen).toEqual({url,label:'example.com',kind:'custom'});
  expect(executeCommand(`open --embed ${url}`, session)).toEqual(executeCommand(`open ${url} --embed`, session));
  expect(executeCommand('open http://example.com', session).navigate).toBe('http://example.com/');
  for (const suffix of [`${url}`, `${url} --embed`, '--embed', `${url} --unknown`, `${url} --embed --embed`, `${url} extra`]) {
    expect(executeCommand(`load ${suffix}`, session)).toEqual(executeCommand(`open ${suffix}`, session));
  }
  for (const command of ['open','load']) {
    for (const value of ['', 'example.com', 'https://', 'https:///example.com', 'javascript:alert(1)', 'data:text/html,x', 'file:///etc/passwd', 'blob:https://example.com/id', 'https://user:pass@example.com', 'https://example.com\\@evil.com', 'https://example.com/a b', 'https://yuxiaoli.github.io/boot-loader/terminal/', 'https://yuxiaoli.github.io/%62oot-loader/', `${url} --unknown`, `${url} --embed --embed`, '--embed']) {
      for (const mode of ['', ' --embed']) {
        const result = executeCommand(`${command} ${value}${mode}`, session);
        expect(result.screen, value).toBeUndefined();
        expect(result.navigate, value).toBeUndefined();
        expect(result.lines.length, value).toBeGreaterThan(0);
      }
    }
  }
});

test('time reads a fresh browser-local Date and actual Intl zone on every invocation', () => {
  vi.useFakeTimers();
  try {
    vi.setSystemTime(new Date('2026-10-25T12:00:00Z'));
    const first = executeCommand('time').lines.join('\n');
    expect(first).toContain(Intl.DateTimeFormat().resolvedOptions().timeZone);
    vi.advanceTimersByTime(60000);
    expect(executeCommand('time').lines.join('\n')).not.toBe(first);
  } finally { vi.useRealTimers(); }
});

test('URL variables are bounded session-only values with one explicit nonrecursive reference', () => {
  const session = new TerminalSession();
  expect(executeCommand('set home=https://example.com/Case', session).lines.join('\n')).toContain('Saved $home');
  expect(executeCommand('open $home', session).navigate).toBe('https://example.com/Case');
  expect(executeCommand('open $home --embed', session).screen?.url).toBe('https://example.com/Case');
  expect(executeCommand('load $home', session)).toEqual(executeCommand('open $home', session));
  expect(executeCommand('load $home --embed', session)).toEqual(executeCommand('open $home --embed', session));
  expect(executeCommand('open $missing', session).lines.join('\n')).toContain('Undefined variable');
  expect(executeCommand('open $home/path', session).navigate).toBeUndefined();
  for (const input of ['set', 'set HOME=https://example.com', 'set __proto__=https://example.com', 'set constructor=https://example.com', 'set prototype=https://example.com', 'set x=$home', 'set x=javascript:alert(1)', 'set home = https://example.com']) expect(executeCommand(input, session).lines.join('\n')).not.toContain('Saved');
  for (let i = 0; i < 16; i++) executeCommand(`set v${i}=https://example.com`, session);
  expect(session.variables.size).toBe(16);
  expect(executeCommand('set overflow=https://example.com', session).lines.join('\n')).toContain('limit');
  expect(executeCommand('open $home', new TerminalSession()).navigate).toBeUndefined();
});
