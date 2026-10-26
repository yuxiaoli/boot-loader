import { expect, test } from 'vitest';
import { inputWindow } from '../src/editor';

test('long URL input remains intact with a visible cursor across small viewport resizing', () => {
  const value = 'open https://example.com/Case?value=' + 'a'.repeat(120);
  const end = inputWindow(value, value.length, 24);
  expect(end.text.length).toBeLessThanOrEqual(24);
  expect(end.cursor).toBe(24);
  expect(end.text).toBe(value.slice(-24));
  const middle = inputWindow(value, 15, 24);
  expect(middle.text).toContain('https://');
  expect(middle.cursor).toBe(15);
  expect(inputWindow(value, value.length, 100).text).toBe(value.slice(-100));
  expect(value.length).toBeGreaterThan(120);
});
