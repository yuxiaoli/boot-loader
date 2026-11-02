import { expect, test } from 'vitest';
import { executeCommand, TerminalSession } from '../src/commands';
import { complete, CompletionCycle } from '../src/editor';
import { renderPage } from '../src/render';

test('intro offers safe first steps while about gives the approved public project story', () => {
  const intro = executeCommand('intro').lines.join('\n');
  expect(intro).toContain('Welcome. Curiosity has a desktop now.');
  expect(intro).toContain("I'm Sean.");
  expect(intro).toContain('simulated shell');
  expect(intro).toContain('boot win11');
  expect(intro).toContain('direct tab');
  expect(intro).toContain('help');
  const about = executeCommand('about').lines.join('\n');
  expect(about).toContain('Built by Sean.');
  expect(about).toContain('open-source communities');
  expect(about).toContain('experience lives in the details');
  expect(about).toContain('https://vectorindex.cloud');
  expect(about).toContain('https://github.com/yuxiaoli/boot-loader');
  expect(about).not.toBe(intro);
});

test.each(['intro', 'about'])('%s is repeatable, case-insensitive and read-only from any virtual directory', (command) => {
  const session = new TerminalSession();
  executeCommand('set home=https://example.com', session);
  const expected = executeCommand(command, session);
  for (const directory of ['/', '/systems']) {
    executeCommand(`cd ${directory}`, session);
    expect(executeCommand(`  ${command.toUpperCase()}  `, session)).toEqual(expected);
    expect(Object.keys(expected)).toEqual(['lines']);
    expect(session.cwd).toBe(directory);
    expect([...session.variables]).toEqual([['home', 'https://example.com/']]);
    for (const argument of ['extra', '--embed', '; boot win11']) {
      expect(executeCommand(`${command} ${argument}`, session)).toEqual({ lines: [`Usage: ${command}`] });
    }
  }
  expected.lines.push('caller mutation');
  expect(executeCommand(command).lines).not.toContain('caller mutation');
});

test('help and both terminal routes expose intro/about without replacing the command reference', () => {
  const help = executeCommand('help').lines.join('\n');
  expect(help).toContain('intro');
  expect(help).toContain('about');
  expect(help).toContain('boot <system>');
  expect(executeCommand('cat /help.txt').lines).toEqual(executeCommand('help').lines);
  for (const route of ['home', 'terminal'] as const) {
    const html = renderPage(route);
    expect(html).toContain('<code>intro</code> to begin');
    expect(html).toContain('<code>about</code> for the story');
    expect(html).toContain('<code>help</code> for commands');
  }
  expect(complete('in')).toEqual(['intro']);
  expect(complete('AB')).toEqual(['about']);
  expect(complete('intro ')).toEqual([]);
  expect(complete('about ')).toEqual([]);
  expect(new CompletionCycle().next('in', 2, {}, -1)).toEqual({ line: 'intro', cursor: 5 });
  expect(executeCommand('github').lines[0]).toContain('Unknown command');
  expect(executeCommand('linkedin').lines[0]).toContain('Unknown command');
});
