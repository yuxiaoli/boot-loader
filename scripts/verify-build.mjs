import { readFile, access } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { join } from 'node:path';

const base = '/boot-loader/';
const routes = ['index.html', 'visual/index.html', 'terminal/index.html'];
const paths = ['daedalOS', 'macos', 'win12', 'winXP'];
const version = JSON.parse(await readFile('dist/version.json', 'utf8'));
assert.match(version.commit, /^[a-f0-9]{40}$/);
for (const route of routes) {
  const html = await readFile(join('dist', route), 'utf8');
  assert.ok(html.includes(`content="${version.commit}"`), `${route}: revision meta`);
  assert.ok(html.includes('href="/boot-loader/visual/"'), `${route}: visual navigation`);
  assert.ok(html.includes('href="/boot-loader/terminal/"'), `${route}: terminal navigation`);
  assert.ok(!html.includes('<!--boot-loader-->'), `${route}: complete static markup`);
  assert.ok(!/<iframe\b/i.test(html), `${route}: no embed`);
  for (const osPath of paths) {
    assert.ok(html.includes(`href="https://yuxiaoli.github.io/${osPath}/"`), `${route}: live ${osPath}`);
    assert.ok(html.includes(`href="https://github.com/yuxiaoli/${osPath}"`), `${route}: source ${osPath}`);
  }
  for (const [, url] of html.matchAll(/(?:src|href)="([^"#]+)"/g)) {
    if (url.startsWith('https://')) continue;
    assert.ok(url.startsWith(base), `${route}: repository base ${url}`);
    const relative = url.slice(base.length);
    if (relative && !relative.endsWith('/')) await access(join('dist', relative));
  }
  assert.equal(html.includes('id="terminal-host"'), route !== 'visual/index.html', `${route}: terminal placement`);
  console.log(`PASS ${base}${route.replace('index.html', '')}: static content, all eight destinations, local assets and revision`);
}
const home = await readFile('dist/index.html', 'utf8');
assert.match(home, /id="terminal"[\s\S]*<\/section><\/main>/, 'home terminal is last');
console.log(`PASS exact revision ${version.commit}; home terminal is the last section`);
