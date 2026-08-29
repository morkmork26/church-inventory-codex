const CACHE='jilgm-v73';
const CORE_ASSETS=['./','/index.html','./logo.jpg','./icon-192.png','./icon-512.png'];
const CDN_ASSETS=['https://unpkg.com/html5-qrcode@2.3.8/html5-qrcode.min.js','https://cdn.jsdelivr.net/npm/qrcodejs@1.0.0/qrcode.min.js'];
self.addEventListener('install',e=>{
e.waitUntil(caches.open(CACHE).then(c=>{
CDN_ASSETS.forEach(u=>c.add(u).catch(()=>{}));
return c.addAll(CORE_ASSETS);
}));
self.skipWaiting();
});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))));self.clients.claim()});
self.addEventListener('fetch',e=>{
if(e.request.url.includes('script.google.com')||e.request.method==='POST'){e.respondWith(fetch(e.request));return}
e.respondWith(caches.match(e.request).then(r=>{
if(r)return r;
return fetch(e.request).then(response=>{
if(response.ok&&(e.request.url.includes('unpkg.com')||e.request.url.includes('cdn.jsdelivr.net'))){
const clone=response.clone();
caches.open(CACHE).then(c=>c.put(e.request,clone));
}
return response;
}).catch(()=>caches.match('./index.html'));
}));
});
