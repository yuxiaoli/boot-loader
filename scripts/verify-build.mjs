import { readFile, access, readdir } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { destinations } from '../src/destinations.ts';

const base = '/boot-loader/';
const routes = ['index.html', 'visual/index.html', 'terminal/index.html'];
const version = JSON.parse(await readFile('dist/version.json', 'utf8'));
assert.match(version.commit, /^[a-f0-9]{40}$/);
for (const route of routes) {
  const html = await readFile(join('dist', route), 'utf8');
  assert.ok(html.includes(`content="${version.commit}"`), `${route}: revision meta`);
  assert.ok(html.includes('href="/boot-loader/visual/"'), `${route}: visual navigation`);
  assert.ok(html.includes('href="/boot-loader/terminal/"'), `${route}: terminal navigation`);
  assert.ok(!html.includes('<!--boot-loader-->'), `${route}: complete static markup`);
  assert.ok(!/<iframe\b/i.test(html), `${route}: no embed`);
  for (const os of destinations) {
    assert.ok(html.includes(`href="${os.live}"`), `${route}: live ${os.id}`);
    assert.ok(html.includes(`href="${os.source}"`), `${route}: source ${os.id}`);
  }
  for (const [, url] of html.matchAll(/(?:src|href)="([^"#]+)"/g)) {
    if (url.startsWith('https://')) continue;
    assert.ok(url.startsWith(base), `${route}: repository base ${url}`);
    const relative = url.slice(base.length);
    if (relative && !relative.endsWith('/')) await access(join('dist', relative));
  }
  assert.equal(html.includes('id="terminal-host"'), route !== 'visual/index.html', `${route}: terminal placement`);
  assert.ok(html.includes('id="screen-dialog"'), `${route}: screen available without preloading an iframe`);
  assert.ok(!html.includes('<code>os list</code>'), `${route}: ls-only list command`);
  console.log(`PASS ${base}${route.replace('index.html', '')}: static content, ${destinations.length * 2} destination links, no initial frame, local assets and revision`);
}
const home = await readFile('dist/index.html', 'utf8');
assert.match(home, /id="terminal"[\s\S]*<\/section><\/main>/, 'home terminal is last');
console.log(`PASS exact revision ${version.commit}; home terminal is the last section`);

const assets = await readdir('dist/assets');
const commandAssets = assets.filter(name => /^command-catalog-[A-Za-z0-9_-]+\.json$/.test(name));
assert.equal(commandAssets.length, 1, 'one content-hashed command catalogue asset');
const asset = commandAssets[0];
assert.equal(await readFile(join('dist/assets', asset), 'utf8'), await readFile('src/command-catalog.json', 'utf8'), 'catalogue asset matches bundled source');
const scripts = await Promise.all(assets.filter(name => name.endsWith('.js')).map(name => readFile(join('dist/assets', name), 'utf8')));
assert.ok(scripts.some(script => script.includes(`${base}assets/${asset}`)), 'built script references catalogue at repository base');
console.log(`PASS same-release command catalogue ${base}assets/${asset}`);

const fontAssets = assets.filter(name => name.endsWith('.flf'));
const sourceFonts = (await readdir('node_modules/figlet/fonts')).filter(name => name.endsWith('.flf'));
const uniqueFonts = new Set(await Promise.all(sourceFonts.map(async name => createHash('sha256').update(await readFile(join('node_modules/figlet/fonts',name))).digest('hex'))));
assert.equal(fontAssets.length, uniqueFonts.size, 'full pinned font corpus emitted as individual lazy assets (identical fonts deduplicated)');
const workers = assets.filter(name => /^tool-worker-.*\.js$/.test(name));
assert.equal(workers.length, 1, 'one lazy dedicated tool worker');
for (const name of assets.filter(name => /^(main|terminal)-.*\.js$/.test(name))) {
  const source = await readFile(join('dist/assets',name),'utf8');
  assert.ok(!source.includes('JavaScript FIGdriver.'), `${name}: renderer/CLI is not in initial app or terminal chunks`);
  assert.ok(!source.includes('flf2a'), `${name}: no font payload in initial app or terminal chunks`);
}
console.log(`PASS lazy tool worker and ${fontAssets.length} separate font assets`);
