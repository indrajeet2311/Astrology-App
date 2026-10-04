import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

export default defineConfig({
	plugins: [react(), {
		name: 'nextgenastro-offline-shell',
		apply: 'build',
		generateBundle(_options, bundle) {
			const assets = ['/', '/index.html', '/manifest.webmanifest', '/icons/icon-192.png', '/icons/icon-512.png', '/icons/maskable-512.png', '/icons/apple-touch-icon.png',
				...Object.keys(bundle).map((filename) => `/${filename}`)];
			const version = createHash('sha256').update(JSON.stringify(assets)).update(String(Date.now())).digest('hex').slice(0, 16);
			const template = readFileSync(new URL('./scripts/service-worker.js', import.meta.url), 'utf8');
			this.emitFile({ type: 'asset', fileName: 'sw.js', source: template
				.replace('__PRECACHE_ASSETS__', JSON.stringify(assets))
				.replace('__CACHE_VERSION__', version) });
		},
	}],
	server: { proxy: { '/api': 'http://localhost:8080' } },
	preview: { proxy: { '/api': 'http://localhost:8080' } },
});
