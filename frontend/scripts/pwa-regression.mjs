import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

const listeners = new Map();
const cached = new Map();
const removed = [];
let online = true;
let skipped = 0;
let claimed = 0;
const assets = ['/', '/index.html', '/assets/app.js'];
const source = readFileSync(new URL('./service-worker.js', import.meta.url), 'utf8')
  .replace('__PRECACHE_ASSETS__', JSON.stringify(assets)).replace('__CACHE_VERSION__', 'test');
runInNewContext(source, {
  URL,
  self: {
    location: { origin: 'https://example.test' },
    addEventListener: (type, listener) => listeners.set(type, listener),
    skipWaiting: () => { skipped++; },
    clients: { claim: async () => { claimed++; } },
  },
  caches: {
    open: async () => ({
      addAll: async (urls) => urls.forEach((url) => cached.set(url, { cached: url })),
      match: async (url) => cached.get(url),
    }),
    keys: async () => ['nextgenastro-shell-old', 'nextgenastro-shell-test', 'unrelated-cache'],
    delete: async (key) => { removed.push(key); return true; },
  },
  fetch: async (request) => {
    if (!online) throw new Error('Offline');
    return { network: request.url };
  },
});

const lifecycle = async (type) => {
  let completion;
  listeners.get(type)({ waitUntil: (promise) => { completion = promise; } });
  await completion;
};
const request = async (pathname, method = 'GET', mode = 'cors', origin = 'https://example.test') => {
  let response;
  listeners.get('fetch')({
    request: { url: origin + pathname, method, mode },
    respondWith: (promise) => { response = promise; },
  });
  return response;
};
await lifecycle('install');
assert.equal(cached.size, assets.length);
assert.equal(skipped, 0, 'Updates must wait for user approval');
assert.equal(await request('/api/chart', 'POST'), undefined);
assert.equal(await request('/api/places?q=Asansol'), undefined);
assert.equal(await request('/api/consultations', 'POST'), undefined);
assert.equal(await request('/assets/app.js', 'POST'), undefined);
assert.equal(await request('/assets/app.js', 'GET', 'cors', 'https://another.test'), undefined);
assert.equal((await request('/assets/app.js')).cached, '/assets/app.js');
assert.equal((await request('/some-page', 'GET', 'navigate')).network, 'https://example.test/some-page');
online = false;
assert.equal((await request('/some-page', 'GET', 'navigate')).cached, '/index.html');
assert.equal(await request('/api/chart', 'POST'), undefined);
await lifecycle('activate');
assert.deepEqual(removed, ['nextgenastro-shell-old']);
assert.equal(claimed, 1);
listeners.get('message')({ data: { type: 'SKIP_WAITING' } });
assert.equal(skipped, 1);
console.log('PWA regressions passed: shell caching, offline navigation, API/POST exclusion, update approval and scoped cache cleanup.');