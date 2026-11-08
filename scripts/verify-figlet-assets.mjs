// Pin audit: this check deliberately fails when packages/fonts drift.
import assert from 'node:assert/strict';
import { readFile, readdir, stat } from 'node:fs/promises';
const packageJson = JSON.parse(await readFile('node_modules/figlet/package.json', 'utf8'));
assert.equal(packageJson.version, '1.12.0');
assert.equal(JSON.parse(await readFile('node_modules/commander/package.json', 'utf8')).version, '14.0.0');
const files = (await readdir('node_modules/figlet/fonts')).filter(name => name.endsWith('.flf'));
assert.equal(files.length, 332);
const sizes = await Promise.all(files.map(name => stat(`node_modules/figlet/fonts/${name}`).then(s => s.size)));
assert.ok(Math.max(...sizes) <= 2 * 1024 * 1024);
assert.equal(sizes.reduce((a, b) => a + b, 0), 9331271);
console.log('Verified figlet 1.12.0, Commander 14.0.0, all 332 fonts (9,331,271 bytes).');
