const CACHE="iroc-v16";
self.addEventListener("install",(e)=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(["/"])));self.skipWaiting();});
self.addEventListener("activate",(e)=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));});
self.addEventListener("fetch",(e)=>{if(e.request.url.includes("googleapis.com")||e.request.url.includes("google.com")){e.respondWith(fetch(e.request).catch(()=>new Response("",{status:503})));return;}e.respondWith(fetch(e.request).then(r=>{const c=r.clone();caches.open(CACHE).then(cache=>cache.put(e.request,c));return r;}).catch(()=>caches.match(e.request)));});
