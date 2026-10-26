import { expect, test } from 'vitest';
import { complete, CompletionCycle } from '../src/editor';
import { executeCommand } from '../src/commands';
import { renderPage } from '../src/render';

test('canonical and argument completion respect command context, cwd, case and existing flags', () => {
  expect(complete('l')).toEqual(['ls']);
  expect(complete('o')).toEqual(['open']);
  expect(complete('cl')).toEqual(['clear','cls']);
  expect(complete('open $h', ['home','help'])).toEqual(['open $home','open $help']);
  expect(complete('open $H', ['home'])).toEqual([]);
  expect(complete('open $home --em', ['home'])).toEqual(['open $home --embed']);
  expect(complete('open --embed $h', ['home'])).toEqual(['open --embed $home']);
  expect(complete('open $home --embed ', ['home'])).toEqual([]);
  expect(complete('load $h', ['home'])).toEqual(['load $home']);
  expect(complete('boot --embed win')).toEqual(['boot --embed win12','boot --embed winxp','boot --embed win11']);
  expect(complete('boot win11 --embed ')).toEqual([]);
  expect(complete('cat w', [], '/systems')).toEqual(['cat win12','cat winxp','cat win11','cat webvm']);
  expect(complete('cat /R')).toEqual(['cat /README.txt']);
  expect(complete('cat /r')).toEqual([]);
  expect(complete('cat /systems/ub')).toEqual(['cat /systems/ubuntu']);
  expect(complete('cd ..', [], '/systems')).toEqual(['cd ../']);
  expect(complete('cd s', [], '/')).toEqual(['cd systems/']);
  expect(complete('cd /R')).toEqual([]);
  expect(complete('cat ../R', [], '/systems')).toEqual(['cat ../README.txt']);
  expect(complete('   bo')).toEqual(['   boot']);
  expect(complete('boot   w')).toEqual(['boot   win12','boot   winxp','boot   win11','boot   webvm']);
  expect(complete('')).toEqual([]);
  expect(complete('   ')).toEqual([]);
  expect(complete('not-a-command')).toEqual([]);
});

test('help and terminal routes advertise canonical open, cls and cycling without suggesting load', () => {
  const help = executeCommand('help').lines.join('\n');
  expect(help).toContain('open <URL|$name>');
  expect(help).toContain('clear / cls');
  expect(help).toContain('Tab: cycle');
  expect(help).not.toContain('load <');
  for (const page of ['home','terminal'] as const) {
    const html = renderPage(page);
    expect(html).toContain('open &lt;URL|$name&gt; [--embed]');
    expect(html).toContain('<code>cls</code>');
    expect(html).not.toContain('load &lt;URL');
  }
});

test('cycling stays anchored to the typed prefix, preserves the caret suffix, and resets after edits or context changes', () => {
  const cycle = new CompletionCycle();
  const context = { cwd:'/systems', variableNames:['home','help'] };
  let edit = { line:'boot w --embed', cursor:6 };
  for (const id of ['win12','winxp','win11','webvm','win12']) {
    edit = cycle.next(edit.line, edit.cursor, context)!;
    expect(edit).toEqual({line:`boot ${id} --embed`,cursor:5+id.length});
  }
  expect(cycle.next(edit.line, edit.cursor, context, -1)).toEqual({line:'boot webvm --embed',cursor:10});
  cycle.reset();
  expect(cycle.next('l',1,context)).toEqual({line:'ls',cursor:2});
  expect(cycle.next('ls',2,context)).toEqual({line:'ls',cursor:2});
  expect(cycle.next('nonsense',8,context)).toBeUndefined();
  expect(cycle.canComplete('',0,context)).toBe(false);
  expect(cycle.canComplete('nonsense',8,context)).toBe(false);
  const first = cycle.next('open $h',7,context)!;
  expect(first.line).toBe('open $home');
  expect(cycle.next(first.line,first.cursor,context)?.line).toBe('open $help');
  expect(cycle.next('open $he',8,context)?.line).toBe('open $help');
  expect(cycle.next('cat R',5,{cwd:'/'})).toEqual({line:'cat README.txt',cursor:14});
  expect(cycle.next('cat R',5,{cwd:'/systems'})).toBeUndefined();
  cycle.reset();
  expect(cycle.next('cl',2,context,-1)?.line).toBe('cls');
});
