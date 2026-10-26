const CACHE='locat-shell-v1';
const DB='locat-share-handoffs-v1';
const STORE='handoffs';
const MAX_BYTES=1_500_000;
const MAX_FORM_BYTES=5_000_000;
const MAX_AGE=60*60_000;
const MAX_PENDING=10;

function openHandoffs(){return new Promise((resolve,reject)=>{const request=indexedDB.open(DB,1);request.onupgradeneeded=()=>request.result.createObjectStore(STORE,{keyPath:'id'});request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);});}
async function transact(mode,callback){const db=await openHandoffs();try{return await new Promise((resolve,reject)=>{const tx=db.transaction(STORE,mode),result=callback(tx.objectStore(STORE));tx.oncomplete=()=>resolve(result);tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error);});}finally{db.close();}}
async function storeHandoff(record){return transact('readwrite',store=>{const request=store.getAll();request.onsuccess=()=>{const old=request.result.filter(item=>Date.now()-item.createdAt<=MAX_AGE).sort((a,b)=>a.createdAt-b.createdAt);for(const item of request.result)if(Date.now()-item.createdAt>MAX_AGE)store.delete(item.id);while(old.length>=MAX_PENDING)store.delete(old.shift().id);store.add(record);};});}
async function stage(request){
 if(!request.headers.get('content-type')?.startsWith('application/x-www-form-urlencoded'))return new Response('Unsupported share format.',{status:415,headers:{'Cache-Control':'no-store'}});
 const length=Number(request.headers.get('content-length'));if(Number.isFinite(length)&&length>MAX_FORM_BYTES)return new Response('The shared form is larger than Locat supports.',{status:413,headers:{'Cache-Control':'no-store'}});
 const reader=request.body?.getReader();if(!reader)return new Response('The shared form could not be read.',{status:400,headers:{'Cache-Control':'no-store'}});
 const chunks=[];let size=0;for(;;){const{done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>MAX_FORM_BYTES){await reader.cancel();return new Response('The shared form is larger than Locat supports.',{status:413,headers:{'Cache-Control':'no-store'}});}chunks.push(value);}
 const body=new Uint8Array(size);let offset=0;for(const chunk of chunks){body.set(chunk,offset);offset+=chunk.byteLength;}const form=new URLSearchParams(new TextDecoder().decode(body)),title=String(form.get('title')??'').trim().slice(0,500),text=String(form.get('text')??''),url=String(form.get('url')??'').trim().slice(0,4096);
 const review=[title,text,url].filter(Boolean).join('\n\n');if(!review)return new Response('Nothing to review was shared with Locat.',{status:400,headers:{'Content-Type':'text/plain; charset=utf-8','Cache-Control':'no-store'}});
 if(new TextEncoder().encode(review).byteLength>MAX_BYTES)return new Response('The shared text is larger than Locat supports.',{status:413,headers:{'Content-Type':'text/plain; charset=utf-8','Cache-Control':'no-store'}});
 const id=crypto.randomUUID(),record={id,title,text,url,review,createdAt:Date.now()};await storeHandoff(record);
 return new Response(null,{status:303,headers:{Location:new URL('/share?handoff='+encodeURIComponent(id),self.location.origin).href,'Cache-Control':'no-store'}});
}
async function consume(id){const db=await openHandoffs();try{return await new Promise((resolve,reject)=>{const tx=db.transaction(STORE,'readwrite'),request=tx.objectStore(STORE).get(id);let found=null;request.onsuccess=()=>{const record=request.result;if(record){tx.objectStore(STORE).delete(id);if(Date.now()-record.createdAt<=MAX_AGE)found=record;}};tx.oncomplete=()=>resolve(found);tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error);});}finally{db.close();}}
async function shell(){const response=await fetch('/',{cache:'no-store'});if(!response.ok)throw new Error('App shell unavailable');const cache=await caches.open(CACHE);await cache.put('/',response.clone());const html=await response.text(),urls=new Set(['/manifest.webmanifest','/icon-192.png','/icon-512.png']);for(const match of html.matchAll(/(?:src|href)="(\/[^"?#]+)"/g))urls.add(match[1]);
 for(const url of [...urls]){if(url.endsWith('.wasm'))continue;try{const asset=await fetch(url);if(asset.ok){await cache.put(url,asset.clone());if(url.endsWith('.css')){const css=await asset.text();for(const font of css.matchAll(/url\(["']?(\/[^)"']+)["']?\)/g))urls.add(font[1]);}}}catch{}}
 for(const url of urls){if(await cache.match(url))continue;try{const asset=await fetch(url);if(asset.ok&&new URL(url,self.location.origin).origin===self.location.origin)await cache.put(url,asset);}catch{}}
}
self.addEventListener('install',event=>event.waitUntil((async()=>{try{await shell();}finally{await self.skipWaiting();}})()));
self.addEventListener('activate',event=>event.waitUntil((async()=>{for(const key of await caches.keys())if(key.startsWith('locat-shell-')&&key!==CACHE)await caches.delete(key);await self.clients.claim();})()));
self.addEventListener('message',event=>{if(event.data?.type!=='locat-share-consume'||typeof event.data.id!=='string')return;const port=event.ports[0];if(!port)return;event.waitUntil(consume(event.data.id).then(record=>{if(!record)port.postMessage({ok:false});else port.postMessage({ok:true,record});}).catch(()=>port.postMessage({ok:false})));});
self.addEventListener('fetch',event=>{
 const request=event.request,url=new URL(request.url);if(url.origin!==self.location.origin)return;
 if(request.method==='POST'&&url.pathname==='/share-target'){event.respondWith(stage(request));return;}
 if(request.method!=='GET'||url.pathname.startsWith('/api/'))return;
 if(request.mode==='navigate'){event.respondWith(fetch(request).catch(async()=>await caches.match('/')??new Response('Locat is offline and the app shell is unavailable.',{status:503})));return;}
 event.respondWith(fetch(request).catch(async()=>await caches.match(request)??Response.error()));
});
