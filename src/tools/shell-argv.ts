/** Shell-like quoting only: no expansion, operators, subprocesses or evaluation. */
export function shellArgv(source: string): string[] {
  const args: string[] = []; let word = '', quote = '', started = false;
  for (let i = 0; i < source.length; i++) {
    const char = source[i];
    if (char === '\\' && quote !== "'") {
      if (++i === source.length) throw Error('Unfinished escape.');
      const escaped = source[i];
      // Inside double quotes, ordinary backslashes remain literal, as in a shell.
      word += quote === '"' && !['\\', '"', '$', '`'].includes(escaped) ? `\\${escaped}` : escaped;
      started = true;
    } else if (quote) {
      if (char === quote) quote = ''; else word += char;
    } else if (char === '"' || char === "'") { quote = char; started = true; }
    else if (/\s/.test(char)) { if (started) args.push(word); word = ''; started = false; }
    else { word += char; started = true; }
  }
  if (quote) throw Error('Unclosed quote.');
  if (started) args.push(word);
  return args;
}

/** Remove terminal escape sequences and controls, keeping art whitespace. */
export function safeToolOutput(value: string): string {
  return value.replace(/\x1b\][^\x07\x1b]*(?:\x07|\x1b\\|$)/g, '')
    .replace(/\x1b\[[0-?]*[ -/]*[@-~]/g, '')
    .replace(/\x1b[ -/]*[@-~]/g, '')
    .replace(/\r\n?/g, '\n').replace(/[\x00-\x08\x0b-\x1f\x7f-\x9f]/g, '');
}
