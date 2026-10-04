# Progressive Web App

NextGenAstro can be installed from its HTTPS website without Android Studio or Xcode.

## Installation

- Android: open the site in Chrome and select **Install app** when offered, or use the browser's install menu.
- iPhone/iPad: open the site in Safari, choose **Share > Add to Home Screen**, and enable **Open as Web App** if offered.
- Desktop: compatible browsers offer installation in the app or address bar.

Installation is not an App Store or Play Store submission. Store distribution is a separate process.

## Offline Behavior

The production build precaches HTML, bundled JavaScript/CSS, the manifest and icons after the first successful online visit. Later offline launches show the app shell and saved birth-detail records. Calculating or reopening a chart from saved birth details still requires the backend. New charts, place search, Panchang, matching, transit data and consultation submissions require a connection.

The service worker does not cache API requests, POST bodies, chart responses or consultation data. Saved charts retain their existing browser-local storage behavior. Browser or OS storage eviction can remove cached files or saved details, so offline storage is not a backup.

Updates install in the background and wait for **Reload**. Reloading resets the open chart; save its birth details first. Old app caches are removed only when the new worker activates. The Vercel configuration prevents long-lived caching of the worker and manifest.

## Development And Verification

Run `node scripts/pwa-regression.mjs` from the frontend folder for worker contract tests.

Service-worker registration is production-only. Run the frontend build, then `npm run preview -- --host 127.0.0.1 --port 4173` to test locally. HTTPS is required in deployment; localhost is allowed for development. Check the manifest, icon responses and active worker, then disable the network and reload after the shell cache is ready. Confirm `/api/` requests are absent from Cache Storage.

Icons are committed PNG assets. Regenerate them on Windows with `frontend/scripts/generate-pwa-icons.ps1`.

The PWA adds browser installation and an offline shell, not native platform capabilities or guaranteed background execution. Validate home-screen installation on physical Android and iOS devices before release.