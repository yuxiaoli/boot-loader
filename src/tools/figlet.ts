import figlet, { type FigletOptions, type FontMetadata } from 'figlet/browser';
import { Command, CommanderError } from 'commander';

export const FIGLET_VERSION = '1.12.0';
export type FigletResult = { stdout: string; stderr: string; exitCode: number };
const MAX_FONT_BYTES = 2 * 1024 * 1024;
const MAX_OUTPUT_CHARS = 256 * 1024;
// Vite emits the original files as individually hashed same-release assets. This
// eagerly imports URL strings only, never the font payloads. No user-built URLs.
const assets = import.meta.glob<string>('/node_modules/figlet/fonts/*.flf', { eager: true, query: '?url', import: 'default' });
const fonts = new Map(Object.entries(assets).map(([path, url]) => [path.slice(path.lastIndexOf('/') + 1, -4), url]));
const loaded = new Map<string, FontMetadata>();
figlet.defaults({ fetchFontIfMissing: false });

async function loadFont(requestedName: string, signal?: AbortSignal): Promise<FontMetadata> {
  // Pinned upstream src/renamed-fonts.js compatibility alias.
  const name = requestedName === 'ANSI-Compact' ? 'ANSI Compact' : requestedName;
  signal?.throwIfAborted();
  const cached = loaded.get(name);
  if (cached) return cached;
  const url = fonts.get(name);
  if (!url) throw Object.assign(new Error(`Unknown font: ${name}`), { code: 'ENOENT' });
  const target = new URL(url, globalThis.location.href);
  if (!['https:', 'http:'].includes(target.protocol) || target.origin !== globalThis.location.origin) throw new Error('Font assets must remain on the same origin.');
  const response = await fetch(target.href, { signal, credentials: 'omit', redirect: 'error' });
  if (response.redirected || response.url !== target.href) throw new Error('Font asset URL changed unexpectedly.');
  if (!response.ok) throw new Error(`Font asset unavailable (HTTP ${response.status}).`);
  if (Number(response.headers.get('content-length')) > MAX_FONT_BYTES) throw new Error('Font asset exceeds the size limit.');
  const reader = response.body?.getReader();
  if (!reader) throw new Error('Font asset has no readable body.');
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      signal?.throwIfAborted();
      const { value, done } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_FONT_BYTES) throw new Error('Font asset exceeds the size limit.');
      chunks.push(value);
    }
  } finally { await reader.cancel().catch(() => {}); }
  signal?.throwIfAborted();
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
  const metadata = figlet.parseFont(name, new TextDecoder('utf-8', { ignoreBOM: true }).decode(bytes));
  loaded.set(name, metadata);
  return metadata;
}

export async function loadFiglet(signal?: AbortSignal): Promise<void> { await loadFont('Standard', signal); }

/** Adapted from the pinned package's bin/index.js (MIT). Commander itself owns
 * option parsing/help/errors; only fonts, output and command-local exit differ. */
export async function runFiglet(argv: string[], signal?: AbortSignal): Promise<FigletResult> {
  const result: FigletResult = { stdout: '', stderr: '', exitCode: 0 };
  const write = (stream: 'stdout' | 'stderr', value: string) => {
    if (result.stdout.length + result.stderr.length + value.length > MAX_OUTPUT_CHARS) throw new Error('Output exceeds the browser limit (256 KiB).');
    result[stream] += value;
  };
  const program = new Command();
  program.configureOutput({ writeOut: value => write('stdout', value), writeErr: value => write('stderr', value), getOutHasColors: () => false, getErrHasColors: () => false });
  program.exitOverride();
  program
    .name('figlet')
    .description('JavaScript FIGdriver. Generates ASCII art from text using FIGlet fonts.')
    .version(FIGLET_VERSION)
    .argument('[text]', 'text to convert to ASCII art')
    .option('-f, --font <font>', 'font to use', 'Standard')
    .option('-w, --width <width>', 'output width', '80')
    .option('-h, --horizontalLayout <layout>', 'horizontal layout', 'default')
    .option('-v, --verticalLayout <layout>', 'vertical layout', 'default')
    .option('-l, --list', 'list available fonts')
    .option('-i, --info <font>', 'show font information')
    .action(async (text: string | undefined, options: { list?: boolean; info?: string; font: string; width: string; horizontalLayout: string; verticalLayout: string }) => {
      if (options.list) {
        write('stdout', `Available fonts:\n${[...fonts.keys()].sort().map(font => `  ${font}\n`).join('')}`);
        return;
      }
      if (options.info) {
        try {
          const metadata = await loadFont(options.info, signal);
          write('stdout', `Font: ${options.info}\nOptions: ${JSON.stringify(metadata, null, 2)}\n`);
        } catch (error) {
          signal?.throwIfAborted();
          write('stderr', `Error loading font '${options.info}': ${(error as Error).message}\n`);
          result.exitCode = 1;
        }
        return;
      }
      if (!text) { program.help(); return; }
      try {
        const figletOptions = { font: options.font, horizontalLayout: options.horizontalLayout, verticalLayout: options.verticalLayout, width: parseInt(options.width, 10) || 80 } as FigletOptions;
        await loadFont(options.font, signal);
        signal?.throwIfAborted();
        write('stdout', `${figlet.textSync(text, figletOptions)}\n`);
      } catch (error) {
        signal?.throwIfAborted();
        if ((error as { code?: string }).code === 'ENOENT') {
          write('stderr', `Font '${options.font}' not found.\nUse --list to see available fonts.\n`);
        } else { write('stderr', `Error: ${(error as Error).message}\n`); }
        result.exitCode = 1;
      }
    });
  try {
    signal?.throwIfAborted();
    if (argv.join(' ').length > 2200) throw new Error('Arguments exceed the browser limit (2200 characters).');
    await program.parseAsync(argv, { from: 'user' });
  } catch (error) {
    signal?.throwIfAborted();
    if (error instanceof CommanderError) result.exitCode = error.exitCode;
    else { result.stdout = ''; result.stderr = `Error: ${(error as Error).message}\n`; result.exitCode = 1; }
  }
  return result;
}
