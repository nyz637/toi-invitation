import { readFile, stat } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import viteConfig from '../vite.config.js';

const base = '/toi-invitation/';
assert.equal(viteConfig.base, base);
const html = await readFile('dist/index.html', 'utf8');
const assets = [...html.matchAll(/(?:src|href)="([^"]+)"/g)]
  .map(match => match[1])
  .filter(url => !/^(?:https?:|data:|#)/.test(url));
assert.ok(assets.some(url => url.endsWith('.js')), 'missing application bundle');
assert.ok(assets.some(url => url.endsWith('.css')), 'missing stylesheet');
assert.ok(assets.some(url => url.endsWith('favicon.svg')), 'missing favicon');

for (const asset of assets) {
  assert.ok(asset.startsWith(base), `asset does not respect Pages base: ${asset}`);
  assert.ok((await stat(resolve('dist', asset.slice(base.length)))).isFile());
  if (process.env.PREVIEW_URL) {
    const response = await fetch(new URL(asset, process.env.PREVIEW_URL));
    assert.equal(response.status, 200, `${asset} failed to load`);
    const type = response.headers.get('content-type');
    if (asset.endsWith('.js')) assert.match(type, /javascript/);
    if (asset.endsWith('.css')) assert.match(type, /text\/css/);
    if (asset.endsWith('.svg')) assert.match(type, /image\/svg\+xml/);
  }
  console.log(`PASS ${asset}`);
}
console.log('PASS GitHub Pages base and production resources');
