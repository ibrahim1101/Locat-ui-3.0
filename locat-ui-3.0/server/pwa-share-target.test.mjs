import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {runInNewContext} from 'node:vm';
import {webcrypto} from 'node:crypto';
import {indexedDB} from 'fake-indexeddb';

const script=await readFile(new URL('../public/sw.js',import.meta.url),'utf8');
function serviceWorker(){
 const listeners=new Map(),self={location:{origin:'https://locat.test'},clients:{claim:async()=>{}},skipWaiting:async()=>{},addEventListener:(type,listener)=>listeners.set(type,listener)};
 let now=Date.now();const ClockDate=class extends Date{static now(){return now;}};
 const context={self,indexedDB,crypto:webcrypto,URL,URLSearchParams,Request,Response,TextEncoder,TextDecoder,Uint8Array,Date:ClockDate,caches:{keys:async()=>[],open:async()=>({put:async()=>{},match:async()=>null})},fetch:async()=>new Response('shell')};
 runInNewContext(script,context);
 async function post(body,contentType='application/x-www-form-urlencoded'){
  const request=new Request('https://locat.test/share-target',{method:'POST',headers:{'Content-Type':contentType},body}),event={request,response:null,respondWith(value){this.response=value;}};
  listeners.get('fetch')(event);return event.response;
 }
 async function consume(id){
  let result;const event={data:{type:'locat-share-consume',id},ports:[{postMessage:value=>{result=value;}}],waitUntil(promise){this.promise=promise;}};
  listeners.get('message')(event);await event.promise;return JSON.parse(JSON.stringify(result));
 }
 return{post,consume,advance:ms=>{now+=ms;}};
}

test('PWA share target bounds input, stages local-only records, caps the queue, and consumes once',async()=>{
 const sw=serviceWorker(),staged=[];
 for(let index=0;index<11;index++){
  const response=await sw.post(new URLSearchParams({title:'Note '+index,text:'Private text '+index,url:''}).toString());
  assert.equal(response.status,303);assert.equal(response.headers.get('cache-control'),'no-store');
  staged.push(new URL(response.headers.get('location')).searchParams.get('handoff'));
  sw.advance(1);
 }
 assert.match(staged[10],/^[a-f0-9-]{36}$/i);
 assert.deepEqual(await sw.consume(staged[0]),{ok:false});
 assert.deepEqual((await sw.consume(staged[10])).record.review,'Note 10\n\nPrivate text 10');
 assert.deepEqual(await sw.consume(staged[10]),{ok:false});
 const expiredResponse=await sw.post(new URLSearchParams({title:'Expires',text:'after one hour',url:''}).toString()),expiredId=new URL(expiredResponse.headers.get('location')).searchParams.get('handoff');sw.advance(60*60_000+1);assert.deepEqual(await sw.consume(expiredId),{ok:false});
 assert.equal((await sw.post('title=x','multipart/form-data; boundary=unsafe')).status,415);
 assert.equal((await sw.post('title=x&text='+('a'.repeat(1_500_001)))).status,413);
 assert.equal((await sw.post('x'.repeat(5_000_001))).status,413);
 assert.equal((await sw.post('title=&text=&url=')).status,400);
});
