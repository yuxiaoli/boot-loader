import { expect, test, vi } from 'vitest';
import { executeCommand, TerminalSession } from '../src/commands';

test('load preserves URL case, accepts only explicit web URLs and rejects recursion or credentials', () => {
  const session = new TerminalSession();
  expect(executeCommand('load https://example.com/Case?q=Value', session).screen?.url).toBe('https://example.com/Case?q=Value');
  expect(executeCommand('load http://example.com', session).screen?.url).toBe('http://example.com/');
  for (const value of ['', 'example.com', 'https://', 'https:///example.com', 'javascript:alert(1)', 'data:text/html,x', 'file:///etc/passwd', 'blob:https://example.com/id', 'https://user:pass@example.com', 'https://example.com\\@evil.com', 'https://example.com/a b', 'https://yuxiaoli.github.io/boot-loader/terminal/', 'https://yuxiaoli.github.io/%62oot-loader/']) {
    const result = executeCommand(`load ${value}`, session);
    expect(result.screen, value).toBeUndefined();
    expect(result.navigate, value).toBeUndefined();
    expect(result.lines.length, value).toBeGreaterThan(0);
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
  expect(executeCommand('load $home', session).screen?.url).toBe('https://example.com/Case');
  expect(executeCommand('load $missing', session).lines.join('\n')).toContain('Undefined variable');
  expect(executeCommand('load $home/path', session).screen).toBeUndefined();
  for (const input of ['set', 'set HOME=https://example.com', 'set __proto__=https://example.com', 'set constructor=https://example.com', 'set prototype=https://example.com', 'set x=$home', 'set x=javascript:alert(1)', 'set home = https://example.com']) expect(executeCommand(input, session).lines.join('\n')).not.toContain('Saved');
  for (let i = 0; i < 16; i++) executeCommand(`set v${i}=https://example.com`, session);
  expect(session.variables.size).toBe(16);
  expect(executeCommand('set overflow=https://example.com', session).lines.join('\n')).toContain('limit');
  expect(executeCommand('load $home', new TerminalSession()).screen).toBeUndefined();
});
