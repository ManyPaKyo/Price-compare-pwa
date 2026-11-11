const V = 'pc-v5';
const SHELL = ['./', 'index.html', 'manifest.webmanifest', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/favicon.svg'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(V).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => !k.startsWith(V)).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const r = e.request;
  if (r.method !== 'GET') return;
  const u = new URL(r.url);

  if (u.origin === location.origin) {
    // หน้าเว็บ: ลองโหลดจากเน็ตก่อนเพื่อให้ได้เวอร์ชันล่าสุด ถ้าออฟไลน์ใช้ที่เก็บไว้
    if (r.mode === 'navigate') {
      e.respondWith(
        fetch(r).then(res => {
          const copy = res.clone();
          caches.open(V).then(c => c.put('index.html', copy));
          return res;
        }).catch(() => caches.match('index.html'))
      );
      return;
    }
    // ไฟล์อื่นในเว็บ: ใช้ที่เก็บไว้ก่อน
    e.respondWith(
      caches.match(r).then(m => m || fetch(r).then(res => {
        const copy = res.clone();
        caches.open(V).then(c => c.put(r, copy));
        return res;
      }))
    );
    return;
  }

  // ฟอนต์จาก Google: เก็บไว้ใช้ออฟไลน์
  if (u.hostname.endsWith('googleapis.com') || u.hostname.endsWith('gstatic.com')) {
    e.respondWith(
      caches.open(V + '-fonts').then(c => c.match(r).then(m => {
        const net = fetch(r).then(res => { c.put(r, res.clone()); return res; }).catch(() => m);
        return m || net;
      }))
    );
  }
});
