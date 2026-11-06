import { expect, test } from 'vitest';
import { parseUniqueJson } from '../src/json-unique';

test('rejects duplicate object keys after escape decoding', () => {
  expect(() => parseUniqueJson('{"name":1,"\\u006eame":2}')).toThrow();
});

test('checks each nested object independently and preserves valid JSON values', () => {
  expect(() => parseUniqueJson('{"items":[{"x":1,"x":2}]}')).toThrow();
  const source = '{"items":[{"x":"comma, brace} and \\\"quote\\\""},{"x":null}],"flag":true,"n":-2.5e+4}';
  expect(parseUniqueJson(source)).toEqual(JSON.parse(source));
  expect(() => parseUniqueJson('{"x":1,}')).toThrow();
});
