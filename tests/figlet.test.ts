import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { spawnSync } from 'node:child_process';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { runInNewContext } from 'node:vm';
import { build } from 'vite';
import { figletCommanderCompatibility } from '../vite.config';
import { loadFiglet, runFiglet } from '../src/tools/figlet';
import { shellArgv } from '../src/tools/shell-argv';

const root = resolve('node_modules/figlet');
let browser: { runFiglet: typeof runFiglet };
beforeAll(async () => {
  const bundle = await build({ configFile: false, logLevel: 'silent', base: '/', plugins: [figletCommanderCompatibility()], build: {
    write: false, assetsInlineLimit: 0, rollupOptions: { input: resolve('src/tools/figlet.ts'), preserveEntrySignatures: 'strict', output: { format: 'iife', name: 'FigletAdapter' } },
  } });
  if (Array.isArray(bundle) || !('output' in bundle)) throw new Error('Expected one adapter bundle');
  const assets = new Map(bundle.output.filter(item => item.type === 'asset').map(item => ['/' + item.fileName, item.source]));
  const code = bundle.output.find(item => item.type === 'chunk');
  if (!code || code.type !== 'chunk') throw new Error('Missing adapter chunk');
  const location = new URL('https://bootloader.test/boot-loader/');
  const scope = { TextDecoder, Uint8Array, URL, location, fetch: async (url: string) => {
    const source = assets.get(decodeURIComponent(new URL(url).pathname));
    if (source === undefined) throw new Error(`Missing bundled asset ${url}`);
    const response = new Response(typeof source === 'string' ? source : new Uint8Array(source).buffer);
    Object.defineProperty(response, 'url', { value: url }); return response;
  }, FigletAdapter: undefined };
  runInNewContext(code.code, scope);
  browser = scope.FigletAdapter!;

  vi.stubGlobal('location', location);
  vi.stubGlobal('fetch', vi.fn(async (url: string, init?: RequestInit) => {
    init?.signal?.throwIfAborted();
    const name = decodeURIComponent(url.split('/').at(-1)!.split('?')[0]);
    expect(init).toMatchObject({ credentials: 'omit', redirect: 'error' });
    const response = new Response(readFileSync(`${root}/fonts/${name}`));
    Object.defineProperty(response, 'url', { value: url }); return response;
  }));
});
afterAll(() => vi.unstubAllGlobals());

const cases = [
  ['Hello'], ['Hello World'], ['-f', 'ANSI-Compact', 'Hi'], ['-i', 'ANSI-Compact'], ['-f', 'Dancing Font', 'Hello World'], ['--', '-hello'],
  ['--help'], ['-V'], ['--version'], [], [''], ['--list'], ['-l'], ['--info', 'Standard'], ['-i', 'Dancing Font'],
  ['-w', '20', 'Hello World'], ['--width=0', 'Hello World'], ['-w', 'oops', 'Hello'], ['-w', '-1', 'Hello'], ['-w', '12junk', 'Hello'],
  ['-h', 'full', '-v', 'full', 'Hi'], ['--horizontalLayout', 'fitted', '--verticalLayout', 'controlled smushing', 'Hi'],
  ['-h', 'invalid', 'Hi'], ['-v', 'invalid', 'Hi'], ['-fStandard', '-w40', 'Hi'], ['-lfStandard'],
  ['--list', '--info', 'Bogus', 'Hi'], ['--info', 'Standard', 'Hi'],
  ['--bogus'], ['-f'], ['-w'], ['-h'], ['-v'], ['-i'], ['one', 'two'], ['--fonts'],
  ['--font', 'Bogus', 'Hi'], ['--font=../Standard', 'Hi'], ['--width', '80', '--', '-V'],
];
describe('pinned npm FIGlet CLI differential baseline', () => {
  it('uses exact published dependency versions and full font corpus', async () => {
    expect(JSON.parse(readFileSync(`${root}/package.json`, 'utf8')).version).toBe('1.12.0');
    expect(JSON.parse(readFileSync('node_modules/commander/package.json', 'utf8')).version).toBe('14.0.0');
    const result = await runFiglet(['--list']);
    expect(result.stdout.split('\n').filter(line => line.startsWith('  '))).toHaveLength(readdirSync(`${root}/fonts`).filter(n => n.endsWith('.flf')).length);
  });
  for (const args of cases) it(`matches Node ${JSON.stringify(args)}`, async () => {
    const reference = spawnSync(process.execPath, [`${root}/bin/index.js`, ...args], { encoding: 'utf8', env: { ...process.env, NO_COLOR: '1' }, timeout: 5000 });
    expect(reference.error).toBeUndefined();
    const expected = { stdout: reference.stdout, stderr: reference.stderr, exitCode: reference.status };
    expect(await runFiglet(args)).toEqual(expected);
    expect(await browser.runFiglet(args)).toEqual(expected);
  });
  const shellCases: Array<[string, string[]]> = [
    [String.raw`figlet "C:\tmp"`, [String.raw`C:\tmp`]],
    [String.raw`figlet "say \"Hi\""`, ['say "Hi"']],
    [String.raw`figlet 'C:\tmp'`, [String.raw`C:\tmp`]],
    [String.raw`figlet He"llo Wo"'rld'`, ['Hello World']],
    [String.raw`figlet -f "Dancing Font" "Hello World"`, ['-f', 'Dancing Font', 'Hello World']],
  ];
  for (const [input, expectedArgv] of shellCases) it(`parses and renders raw shell input ${input}`, async () => {
    const argv = shellArgv(input).slice(1);
    expect(argv).toEqual(expectedArgv);
    const reference = spawnSync(process.execPath, [`${root}/bin/index.js`, ...expectedArgv], { encoding: 'utf8', env: { ...process.env, NO_COLOR: '1' }, timeout: 5000 });
    expect(reference.error).toBeUndefined();
    const expected = { stdout: reference.stdout, stderr: reference.stderr, exitCode: reference.status };
    expect(await runFiglet(argv)).toEqual(expected);
    expect(await browser.runFiglet(argv)).toEqual(expected);
  });
  it('explicitly bounds info missing-font errors without exposing Node paths', async () => {
    expect(await runFiglet(['--info', '../../secret'])).toEqual({ stdout: '', stderr: "Error loading font '../../secret': Unknown font: ../../secret\n", exitCode: 1 });
  });
  it('rejects changed asset URLs, HTTP errors, and oversized assets without caching failure', async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValueOnce(new Response('anything'));
    expect((await runFiglet(['-f', 'Small', 'Hi'])).stderr).toContain('URL changed');
    fetchMock.mockImplementationOnce(async (url) => {
      const response = new Response('not found', { status: 404 });
      Object.defineProperty(response, 'url', { value: url }); return response;
    });
    expect((await runFiglet(['-f', 'Small', 'Hi'])).stderr).toContain('HTTP 404');
    fetchMock.mockImplementationOnce(async (url) => {
      const response = new Response('too big', { headers: { 'content-length': '2097153' } });
      Object.defineProperty(response, 'url', { value: url }); return response;
    });
    expect((await runFiglet(['-f', 'Small', 'Hi'])).stderr).toContain('size limit');
    fetchMock.mockImplementationOnce(async (url) => {
      const response = new Response(new Uint8Array(2097153));
      Object.defineProperty(response, 'url', { value: url }); return response;
    });
    expect((await runFiglet(['-f', 'Small', 'Hi'])).stderr).toContain('size limit');
    expect((await runFiglet(['-f', 'Small', 'Hi'])).exitCode).toBe(0);
  });
  it('loads default font and respects aborted commands', async () => {
    await loadFiglet();
    const controller = new AbortController(); controller.abort();
    await expect(runFiglet(['hello'], controller.signal)).rejects.toThrow();
    await expect(loadFiglet(controller.signal)).rejects.toThrow();
  });
  it('reports network failures and retries instead of implicitly loading arbitrary fonts', async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockRejectedValueOnce(new Error('offline'));
    expect((await runFiglet(['-f', 'Slant', 'Hi'])).stderr).toContain('offline');
    expect((await runFiglet(['-f', 'Slant', 'Hi'])).exitCode).toBe(0);
  });
  it('loads every shipped font with metadata identical to the Node renderer', async () => {
    const reference = spawnSync(process.execPath, ['--input-type=module', '-e', `
      import figlet from 'figlet/node';
      const records = [];
      for (const name of (await figlet.fonts()).sort()) {
        records.push([name, await figlet.loadFont(name)]);
      }
      console.log(JSON.stringify(records));
    `], { encoding: 'utf8', maxBuffer: 4 * 1024 * 1024, timeout: 15000 });
    expect(reference.status, reference.stderr).toBe(0);
    const records = JSON.parse(reference.stdout) as Array<[string, unknown]>;
    expect(records).toHaveLength(332);
    for (const [name, metadata] of records) {
      expect(await browser.runFiglet(['--info', name]), name).toEqual({
        stdout: `Font: ${name}\nOptions: ${JSON.stringify(metadata, null, 2)}\n`, stderr: '', exitCode: 0,
      });
    }
  }, 30000);

});
