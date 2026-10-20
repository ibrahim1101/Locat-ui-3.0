import {test,expect} from '@playwright/test';
import {randomBytes} from 'node:crypto';
import {startBrowserFixture} from '../tools/browser-fixture.mjs';
let fixture;
test.beforeAll(async()=>{fixture=await startBrowserFixture({identitySigning:true});});
test.afterAll(async()=>{await fixture?.stop();});

test('built UI, real cookie, nonextractable Link identity across reload and encrypted store round-trip',async({browser})=>{
 // Only the generated isolated fixture context permits its self-signed certificate.
 // This does not establish OS/browser certificate-trust acceptance.
 const context=await browser.newContext({ignoreHTTPSErrors:true,serviceWorkers:'block'});
 await context.route('**/*',route=>new URL(route.request().url()).origin===fixture.origin?route.continue():route.abort());
 const page=await context.newPage(),privateWrites=[],privateResponses=[];
 page.on('request',request=>{if(new URL(request.url()).pathname.startsWith('/api/private/')&&request.method()==='POST')privateWrites.push(request.postData());});
 page.on('response',response=>{const path=new URL(response.url()).pathname;if(path.startsWith('/api/private/'))privateResponses.push({path,status:response.status()});});
 const password=randomBytes(24).toString('base64url'),username='browser_'+randomBytes(6).toString('hex');
 try{
  await page.goto(fixture.origin);
  await expect(page.getByTestId('login-submit')).toBeVisible();
  const registered=await page.evaluate(async({username,password})=>{
   const response=await fetch('/api/auth/register',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify({username,password,displayName:'Synthetic browser account'})});
   const data=await response.json();return {status:response.status,user:data.user,error:data.error};
  },{username,password});expect(registered.status,registered.error).toBe(201);
  await page.getByTestId('login-username').fill(username);await page.getByTestId('login-password').fill(password);await page.getByTestId('login-submit').click();
  await expect(page.getByTestId('entry-flow')).toHaveCount(0);
  const cookie=(await context.cookies(fixture.origin)).find(row=>row.name==='locat_session');
  expect(cookie?.secure).toBe(true);expect(cookie?.httpOnly).toBe(true);expect(cookie?.sameSite).toBe('Strict');
  expect(await page.evaluate(()=>document.cookie.includes('locat_session'))).toBe(false);
  expect(await page.evaluate(()=>({secure:isSecureContext,crypto:!!crypto.subtle,indexedDB:!!indexedDB,locks:!!navigator.locks}))).toEqual({secure:true,crypto:true,indexedDB:true,locks:true});
  expect(await page.evaluate(()=>navigator.locks.request('locat-browser-acceptance',()=>true))).toBe(true);
  await page.goto(fixture.origin+'/settings');await expect(page.getByText('Your server identity')).toBeVisible();
  const authorityDetails=page.getByText(/Authority signature/);await authorityDetails.click();
  await expect(page.getByRole('button',{name:'Pin after comparison'})).toBeDisabled();
  await expect(page.getByText(/Both discovery and account signatures are valid/)).toBeVisible();
  await page.getByLabel(/I independently compared this fingerprint/).check();await page.getByRole('button',{name:'Pin after comparison'}).click();
  await expect(page.getByText('Authority fingerprint pinned for this account in this browser.')).toBeVisible();
  await page.reload();await page.getByText(/Authority signature/).click();await expect(page.getByText(/Authority key continuity · pinned/)).toBeVisible();
  await page.goto(fixture.origin+'/devices');await expect(page.getByLabel("This browser's device name")).toBeVisible();
  const identity=await page.evaluate(async accountId=>{
   const db=await new Promise((resolve,reject)=>{const request=indexedDB.open('locat-ui3-link:'+accountId,1);request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);});
   try{return await new Promise((resolve,reject)=>{const tx=db.transaction('identity','readonly'),request=tx.objectStore('identity').get('current');tx.oncomplete=()=>resolve({publicKey:request.result.publicKeyB64,extractable:request.result.privateKey.extractable});tx.onerror=()=>reject(tx.error);});}finally{db.close();}
  },registered.user.id);expect(identity.extractable).toBe(false);expect(identity.publicKey.length).toBeGreaterThan(40);
  await page.reload();await expect(page.getByLabel("This browser's device name")).toBeVisible();
  const persistedKey=await page.evaluate(async accountId=>{
   const db=await new Promise((resolve,reject)=>{const request=indexedDB.open('locat-ui3-link:'+accountId,1);request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);});
   try{return await new Promise((resolve,reject)=>{const tx=db.transaction('identity','readonly'),request=tx.objectStore('identity').get('current');tx.oncomplete=()=>resolve(request.result.publicKeyB64);tx.onerror=()=>reject(tx.error);});}finally{db.close();}
  },registered.user.id);expect(persistedKey).toBe(identity.publicKey);
  await page.goto(fixture.origin+'/files/secrets');await page.bringToFront();
  const phrase='Synthetic private phrase '+randomBytes(12).toString('hex'),next='Synthetic changed phrase '+randomBytes(12).toString('hex');
  await page.getByLabel('Private-store passphrase',{exact:true}).fill(phrase);await page.getByLabel('Confirm private-store passphrase',{exact:true}).fill(phrase);await page.getByRole('button',{name:'Create encrypted store',exact:true}).click();
  await page.getByRole('button',{name:'Add credential or note',exact:true}).click();await page.getByLabel('Entry name',{exact:true}).fill('Browser retained secret');await page.getByLabel('Password',{exact:true}).fill('synthetic secret value');await page.getByRole('button',{name:'Encrypt and save',exact:true}).click();
  await expect(page.getByRole('heading',{name:'Browser retained secret',exact:true})).toBeVisible();
  await page.getByRole('button',{name:'Change store passphrase',exact:true}).click();await page.getByLabel('Current store passphrase',{exact:true}).fill(phrase);await page.getByLabel('New store passphrase',{exact:true}).fill(next);await page.getByLabel('Confirm new store passphrase',{exact:true}).fill(next);await page.getByRole('button',{name:'Change passphrase and lock',exact:true}).click();
  await expect(page.getByText('Private-store passphrase changed. Unlock with the new passphrase and download a fresh encrypted backup.',{exact:true})).toBeVisible();await expect(page.getByRole('heading',{name:'Browser retained secret',exact:true})).toHaveCount(0);
  await page.reload();await page.getByLabel('Private-store passphrase',{exact:true}).fill(next);await page.getByRole('button',{name:'Unlock store',exact:true}).click();await expect(page.getByRole('heading',{name:'Browser retained secret',exact:true})).toBeVisible();
  for(const plaintext of [phrase,next,'Browser retained secret','synthetic secret value'])expect(JSON.stringify(privateWrites)).not.toContain(plaintext);
  await page.getByRole('button',{name:'Lock now',exact:true}).click();await expect(page.getByRole('heading',{name:'Browser retained secret',exact:true})).toHaveCount(0);
 }catch(error){
  // Include only state/validation flags and server error text, never field values or request bodies.
  const state=await page.evaluate(()=>({visibility:document.visibilityState,alerts:[...document.querySelectorAll('[role="alert"]')].map(node=>node.textContent),dialogs:[...document.querySelectorAll('[role="dialog"] h2')].map(node=>node.textContent),invalidInputs:[...document.querySelectorAll('input:invalid')].map(node=>({id:node.id,missing:node.validity.valueMissing,short:node.validity.tooShort})),working:[...document.querySelectorAll('button')].some(node=>node.textContent==='Working…')})).catch(()=>({unavailable:true}));
  throw new Error('Browser foundation failed; state='+JSON.stringify(state)+'; privateResponses='+JSON.stringify(privateResponses),{cause:error});
 }finally{await context.close();}
});
