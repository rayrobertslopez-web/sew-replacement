const CACHE='sew-v28';
const CORE=['./','./index.html','./manifest.json','./icon.svg','./ocr/tesseract.min.js','./sew-data.js','./basketball.html','./three.min.js','./green.mp3','./backrooms.html','./vendor/three.module.min.js','./vendor/utils/BufferGeometryUtils.js','./vendor/loaders/GLTFLoader.js','./backrooms-entity.glb','./backrooms-level1.glb','./backrooms-logo.png','./music.html','./music-manifest.json','./music-icon-192.png','./music-icon-512.png'];
self.addEventListener('install',e=>{ e.waitUntil(caches.open(CACHE).then(c=>c.addAll(CORE)).then(()=>self.skipWaiting()).catch(()=>self.skipWaiting())); });
self.addEventListener('activate',e=>{ e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())); });
self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET') return;
  if(new URL(e.request.url).origin!==location.origin) return; // don't cache third-party calls (e.g. music.html's per-search iTunes lookups — each URL is one-time-use)
  const isNav = e.request.mode==='navigate' || (e.request.destination==='document');
  if(isNav){
    // network-first for pages (updates show; avoids stale-app trap), cache fallback offline.
    // cache under the request URL — not './index.html' — so basketball.html can't clobber the app shell
    e.respondWith(fetch(e.request).then(r=>{const cp=r.clone();caches.open(CACHE).then(c=>c.put(e.request,cp));return r;}).catch(()=>caches.match(e.request).then(m=>m||caches.match('./index.html'))));
  } else {
    // cache-first for assets (OCR engine, icons, three.js) — fast + offline once cached
    e.respondWith(caches.match(e.request).then(m=>m||fetch(e.request).then(r=>{const cp=r.clone();caches.open(CACHE).then(c=>c.put(e.request,cp));return r;})));
  }
});
