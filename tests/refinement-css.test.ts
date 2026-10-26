import { readFileSync } from 'node:fs';
import { expect, test } from 'vitest';

// Structural guards, not browser/computed-style or interaction verification.
const terminal = readFileSync(new URL('../src/terminal-shell.css', import.meta.url), 'utf8');
const visual = readFileSync(new URL('../src/visual-refinement.css', import.meta.url), 'utf8');

test('only the legacy terminal viewport suppresses native scrollbar controls', () => {
  expect(terminal).toContain('#terminal-host .xterm-viewport{overflow-y:hidden;scrollbar-width:none}');
  expect(terminal).toContain('#terminal-host .xterm-viewport::-webkit-scrollbar{display:none;width:0;height:0}');
  expect(terminal).toContain('#terminal-host .xterm-scrollable-element > .scrollbar.vertical > .slider{box-sizing:border-box;padding-inline:4px;background-clip:content-box;border-radius:7px}');
  expect(terminal).not.toMatch(/\.xterm-scrollable-element[^{}]*\{[^}]*(?:display:\s*none|pointer-events:\s*none)/);
});

test('selector keyboard focus has an internal underline, including forced colors', () => {
  expect(visual).toContain('.system-choice:focus-visible{outline:none}');
  expect(visual).toContain('.system-choice:focus-visible .system-name{text-decoration-line:underline;text-decoration-thickness:2px;text-underline-offset:.22em}');
  expect(visual).toContain('@media(forced-colors:active){.system-choice:focus-visible .system-name{text-decoration-color:CanvasText}}');
  expect(visual).not.toMatch(/(?:^|[,}])button:focus-visible\{[^}]*outline:none/);
});
