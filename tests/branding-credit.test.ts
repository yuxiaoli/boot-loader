import { expect, it } from 'vitest';
import { renderPage } from '../src/render.ts';

it.each(['home', 'visual', 'terminal'] as const)('keeps the personal credit and source link on %s', (page) => {
  const html = renderPage(page);
  expect(html).toContain('Built by <a href="https://s.vectorindex.cloud/sean">Sean</a> with ❤️');
  expect(html).not.toContain('href="https://www.linkedin.com/in/yuxiaoli/"');
  expect(html).toContain('View source ↗');
});
