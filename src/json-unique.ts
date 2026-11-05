export function parseUniqueJson(source: string): unknown {
  // Validate syntax before scanning. The scan detects repeated decoded keys,
  // which JSON.parse would otherwise silently overwrite.
  const parsed: unknown = JSON.parse(source);
  let index = 0;
  const whitespace = () => { while (/[\x20\t\r\n]/.test(source[index] ?? '')) index++; };
  const string = (): string => {
    const start = index++;
    while (index < source.length) {
      const character = source[index++];
      if (character === '\\') { index++; continue; }
      if (character === '"') return JSON.parse(source.slice(start, index)) as string;
    }
    throw new SyntaxError('Unterminated string');
  };
  const value = (depth: number): void => {
    if (depth > 64) throw new SyntaxError('JSON nesting exceeds limit');
    whitespace();
    if (source[index] === '"') { string(); return; }
    if (source[index] === '{') {
      index++; whitespace();
      const keys = new Set<string>();
      if (source[index] === '}') { index++; return; }
      for (;;) {
        whitespace(); const key = string();
        if (keys.has(key)) throw new SyntaxError('Duplicate object key');
        keys.add(key); whitespace(); index++; // colon, checked by JSON.parse
        value(depth + 1); whitespace();
        if (source[index++] === '}') return;
      }
    }
    if (source[index] === '[') {
      index++; whitespace();
      if (source[index] === ']') { index++; return; }
      for (;;) {
        value(depth + 1); whitespace();
        if (source[index++] === ']') return;
      }
    }
    while (index < source.length && !/[\x20\t\r\n,\]}]/.test(source[index])) index++;
  };
  value(0);
  return parsed;
}
