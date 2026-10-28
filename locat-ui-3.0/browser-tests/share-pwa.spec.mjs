import {test,expect} from '@playwright/test';
import {randomBytes} from 'node:crypto';
import {startBrowserFixture} from '../tools/browser-fixture.mjs';

let fixture;
test.beforeAll(async()=>{fixture=await startBrowserFixture();});
test.afterAll(async()=>{await fixture?.stop();});

test('PWA share target stays local and signed-out recipients can open encrypted links',async({browser})=>{
 const context=await browser.newContext({ignoreHTTPSErrors:true,serviceWorkers:'allow'}),page=await context.newPage(),apiWrites=[],shareRequests=[];
 await context.route('**/*',route=>new URL(route.request().url()).origin===fixture.origin?route.continue():route.abort());
 page.on('request',request=>{if(new URL(request.url()).pathname.startsWith('/api/share')&&request.method()!=='GET')apiWrites.push({path:new URL(request.url()).pathname,body:request.postData()});});
 page.on('request',request=>{if(new URL(request.url()).pathname.startsWith('/api/share'))shareRequests.push(new URL(request.url()).pathname);});
 const username='share_'+randomBytes(6).toString('hex'),password='Synthetic share password '+randomBytes(24).toString('hex'),marker='Synthetic local handoff '+randomBytes(24).toString('hex');
 try{
  await page.goto(fixture.origin);
  const registration=await page.evaluate(async({username,password})=>{const response=await fetch('/api/auth/register',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify({username,password,displayName:'Share recipient'})});return response.status;},{username,password});
  expect(registration).toBe(201);
  await page.evaluate(async()=>{await navigator.serviceWorker.ready;});await expect.poll(()=>page.evaluate(()=>navigator.serviceWorker.controller?.state??null)).toBe('activated');
  await Promise.all([page.waitForURL(/\/share\?handoff=[a-f0-9-]{36}$/i),page.evaluate(({marker})=>{const form=document.createElement('form');form.method='POST';form.action='/share-target';form.enctype='application/x-www-form-urlencoded';for(const[name,value]of[['title','Incoming note'],['text',marker],['url','https://example.invalid/item']]){const input=document.createElement('input');input.name=name;input.value=value;form.append(input);}document.body.append(form);form.submit();},{marker})]);
  const handoffId=new URL(page.url()).searchParams.get('handoff');expect(handoffId).toMatch(/^[a-f0-9-]{36}$/i);
  await expect(page).toHaveURL(/\/share\?handoff=[a-f0-9-]{36}$/i);
  await expect(page.getByTestId('login-submit')).toBeVisible();
  await page.getByTestId('login-username').fill(username);await page.getByTestId('login-password').fill(password);await page.getByTestId('login-submit').click();
  await expect(page.getByLabel('Message')).toHaveValue('Incoming note\n\n'+marker+'\n\nhttps://example.invalid/item');
  await expect(page.getByRole('status')).toHaveTextContent('Shared text staged locally. Review it before creating the encrypted link.');
  expect(apiWrites).toEqual([]);
  const response=await page.evaluate(async id=>{const worker=navigator.serviceWorker.controller;if(!worker)throw new Error('The active service worker is unavailable for the one-time handoff check.');const channel=new MessageChannel();return await new Promise((resolve,reject)=>{const timer=setTimeout(()=>{channel.port1.close();reject(new Error('The service worker did not answer the one-time handoff check within 10 seconds.'));},10000);channel.port1.onmessage=event=>{clearTimeout(timer);channel.port1.close();resolve(event.data);};worker.postMessage({type:'locat-share-consume',id},[channel.port2]);});},handoffId);
  expect(response).toEqual({ok:false});
  const publicText='Account-free encrypted recipient '+randomBytes(12).toString('hex'),shared=await page.evaluate(async text=>{const raw=crypto.getRandomValues(new Uint8Array(32)),iv=crypto.getRandomValues(new Uint8Array(12)),key=await crypto.subtle.importKey('raw',raw,'AES-GCM',false,['encrypt']),ciphertext=new Uint8Array(await crypto.subtle.encrypt({name:'AES-GCM',iv},key,new TextEncoder().encode(text))),base64=bytes=>{let binary='';for(const byte of bytes)binary+=String.fromCharCode(byte);return btoa(binary);},url=bytes=>base64(bytes).replaceAll('+','-').replaceAll('/','_').replace(/=+$/,'');const response=await fetch('/api/share',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify({iv:base64(iv),ciphertext:base64(ciphertext),ttlHours:1,downloadLimit:1}),signal:AbortSignal.timeout(15000)}),data=await response.json();return{status:response.status,id:data.share?.id,secret:url(raw)};},publicText);
  expect(shared.status).toBe(201);await context.clearCookies();await page.goto(fixture.origin+'/share#'+shared.id+'.'+shared.secret);await expect(page.getByText(publicText,{exact:true})).toBeVisible();expect(shareRequests).toContain('/api/share/'+shared.id);expect(shareRequests.every(path=>!path.includes(shared.secret))).toBe(true);
 }finally{await context.close();}
});
