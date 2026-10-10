import { useEffect, useState } from 'react';
import { Download, RefreshCw, WifiOff, X } from 'lucide-react';

interface InstallEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function PwaControls() {
  const [installEvent, setInstallEvent] = useState<InstallEvent | null>(null);
  const [installed, setInstalled] = useState(() => window.matchMedia('(display-mode: standalone)').matches
    || (navigator as Navigator & { standalone?: boolean }).standalone === true);
  const [offline, setOffline] = useState(!navigator.onLine);
  const [waiting, setWaiting] = useState<ServiceWorker | null>(null);
  const [help, setHelp] = useState(false);
  const [failure, setFailure] = useState('');
  const ios = /iPad|iPhone|iPod/.test(navigator.userAgent)
    || navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1;

  useEffect(() => {
    const beforeInstall = (event: Event) => {
      event.preventDefault();
      setInstallEvent(event as InstallEvent);
    };
    const afterInstall = () => { setInstalled(true); setInstallEvent(null); setHelp(false); };
    const online = () => setOffline(false);
    const disconnected = () => setOffline(true);
    window.addEventListener('beforeinstallprompt', beforeInstall);
    window.addEventListener('appinstalled', afterInstall);
    window.addEventListener('online', online);
    window.addEventListener('offline', disconnected);
    return () => {
      window.removeEventListener('beforeinstallprompt', beforeInstall);
      window.removeEventListener('appinstalled', afterInstall);
      window.removeEventListener('online', online);
      window.removeEventListener('offline', disconnected);
    };
  }, []);

  useEffect(() => {
    if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return;
    let active = true;
    let registration: ServiceWorkerRegistration | undefined;
    let installing: ServiceWorker | null = null;
    const ready = () => {
      if (active && registration?.waiting && navigator.serviceWorker.controller) setWaiting(registration.waiting);
    };
    const stateChanged = () => ready();
    const updateFound = () => {
      installing?.removeEventListener('statechange', stateChanged);
      installing = registration?.installing ?? null;
      installing?.addEventListener('statechange', stateChanged);
    };
    const checkUpdate = () => {
      if (navigator.onLine) void registration?.update().catch(() => {});
    };
    void navigator.serviceWorker.register('/sw.js', { updateViaCache: 'none' }).then((result) => {
      if (!active) return;
      registration = result;
      registration.addEventListener('updatefound', updateFound);
      updateFound();
      ready();
    }).catch(() => { if (active) setFailure('Offline setup unavailable. You can still use the app online.'); });
    window.addEventListener('focus', checkUpdate);
    return () => {
      active = false;
      window.removeEventListener('focus', checkUpdate);
      registration?.removeEventListener('updatefound', updateFound);
      installing?.removeEventListener('statechange', stateChanged);
    };
  }, []);

  const install = async () => {
    if (!installEvent) { setHelp(true); return; }
    try {
      await installEvent.prompt();
      const choice = await installEvent.userChoice;
      if (choice.outcome === 'accepted') setInstalled(true);
      setInstallEvent(null);
    } catch {
      setFailure('Installation could not start. Try your browser\'s install menu.');
    }
  };

  const update = () => {
    if (!waiting) return;
    navigator.serviceWorker.addEventListener('controllerchange', () => window.location.reload(), { once: true });
    waiting.postMessage({ type: 'SKIP_WAITING' });
  };

  return (
    <div className="pwa-controls">
      {!installed && (installEvent || ios) && <button type="button" className="pwa-action" onClick={() => void install()}><Download size={16} aria-hidden />Install app</button>}
      {offline && <span className="pwa-status" role="status"><WifiOff size={16} aria-hidden />Offline. Calculations and live data need a connection.</span>}
      {waiting && <div className="pwa-status" role="status"><span>Update available. Reload clears the open chart.</span><button type="button" className="pwa-action" onClick={update}><RefreshCw size={16} aria-hidden />Reload</button></div>}
      {failure && <span className="pwa-status" role="status">{failure}<button type="button" className="pwa-action" aria-label="Dismiss message" title="Dismiss message" onClick={() => setFailure('')}><X size={16} /></button></span>}
      {help && <details className="pwa-install-help" open><summary>Install on iPhone or iPad</summary><p>Open this site in Safari, tap Share, then Add to Home Screen. Enable Open as Web App if offered.</p><button type="button" className="pwa-action" onClick={() => setHelp(false)}><X size={16} aria-hidden />Close</button></details>}
    </div>
  );
}
