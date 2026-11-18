// きょうの服と天気 — service worker
// アプリ本体はキャッシュから即表示し、裏で最新版を取得して次回起動時に反映する。
// 天気API（open-meteo.com）はキャッシュせず常にネットワークへ。
const VERSION = 'fuku-v3';
const SHELL = ['./', './index.html', './apple-touch-icon.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.hostname.endsWith('open-meteo.com')) return;

  // Google Fonts: cache-first
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    e.respondWith(
      caches.open(VERSION).then(async c => {
        const hit = await c.match(req);
        if (hit) return hit;
        const res = await fetch(req);
        if (res.ok || res.type === 'opaque') c.put(req, res.clone());
        return res;
      })
    );
    return;
  }

  // App shell: stale-while-revalidate
  if (url.origin === location.origin) {
    e.respondWith(
      caches.open(VERSION).then(async c => {
        const hit = await c.match(req, {ignoreSearch: true});
        const net = fetch(req).then(res => { if (res.ok) c.put(req, res.clone()); return res; }).catch(() => hit);
        return hit || net;
      })
    );
  }
});
