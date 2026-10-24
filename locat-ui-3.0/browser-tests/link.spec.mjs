import {test,expect} from '@playwright/test';
import {randomBytes} from 'node:crypto';
import {startBrowserFixture} from '../tools/browser-fixture.mjs';
let fixture;
test.beforeAll(async()=>{fixture=await startBrowserFixture();});
test.afterAll(async()=>{await fixture?.stop();});

test('two independent browser identities compare, approve, transfer text and multi-chunk file, then revoke',async({browser})=>{
 const contexts=[],writes=[];
 const username='link_'+randomBytes(6).toString('hex'),password=randomBytes(24).toString('base64url');
 async function open(name,register=false){
  const context=await browser.newContext({ignoreHTTPSErrors:true,serviceWorkers:'block',acceptDownloads:true});contexts.push(context);
  await context.route('**/*',route=>new URL(route.request().url()).origin===fixture.origin?route.continue():route.abort());
  const page=await context.newPage();
  page.on('request',request=>{if(new URL(request.url()).pathname==='/api/link/payload/chunk')writes.push(request.postData());});
  await page.goto(fixture.origin);await expect(page.getByTestId('login-submit')).toBeVisible();
  if(register){const result=await page.evaluate(async({username,password})=>{const response=await fetch('/api/auth/register',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username,password,displayName:'Synthetic Link account'})});return {status:response.status,data:await response.json()};},{username,password});expect(result.status,result.data.error).toBe(201);}
  await page.getByTestId('login-username').fill(username);await page.getByTestId('login-password').fill(password);await page.getByTestId('login-submit').click();await expect(page.getByTestId('entry-flow')).toHaveCount(0);
  await page.goto(fixture.origin+'/devices');await page.getByLabel("This browser's device name").fill(name);await page.getByRole('button',{name:'Save device name',exact:true}).click();await expect(page.getByRole('heading',{name:name+' · This browser',exact:true})).toBeVisible();
  return page;
 }
 const refresh=async page=>{await page.getByRole('button',{name:'Refresh',exact:true}).click();await expect(page.getByRole('button',{name:'Refresh',exact:true})).toBeEnabled();};
 const section=(page,name)=>page.getByRole('button',{name:new RegExp('^'+name)}).click();
 const card=(page,name)=>page.locator('article').filter({has:page.getByRole('heading',{name,exact:true})});
 try{
  const a=await open('Browser A',true),b=await open('Browser B');await refresh(a);
  await card(a,'Browser B').getByRole('button',{name:'Pair device',exact:true}).click();
  const first=a.getByRole('dialog',{name:'Compare both device screens',exact:true});await expect(first).toBeVisible();
  const code=await first.locator('p.font-mono').innerText();expect(code).toMatch(/^[A-Z0-9]+-[A-Z0-9]+$/);
  await refresh(b);await section(b,'Pairings');await b.getByRole('button',{name:'Review pairing',exact:true}).click();
  const second=b.getByRole('dialog',{name:'Compare both device screens',exact:true});await expect(second.locator('p.font-mono')).toHaveText(code);
  await first.getByRole('button',{name:'Codes match — approve on this device',exact:true}).click();await expect(first).toHaveCount(0);
  await expect(a.getByRole('button',{name:'Send to device',exact:true})).toHaveCount(0);
  await second.getByRole('button',{name:'Codes match — approve on this device',exact:true}).click();await expect(second).toHaveCount(0);await refresh(a);await section(a,'Pairings');
  const plaintext='Synthetic browser Link message '+randomBytes(24).toString('hex');
  await a.getByRole('button',{name:'Send to device',exact:true}).click();await a.getByLabel('Text to encrypt',{exact:true}).fill(plaintext);await a.getByRole('button',{name:'Encrypt and queue',exact:true}).click();await expect(a.getByRole('dialog',{name:'Send to Browser B',exact:true})).toHaveCount(0);
  await refresh(b);await section(b,'Transfers');const textDelivery=card(b,'Encrypted text');await expect(textDelivery.getByRole('button',{name:'Mark received',exact:true})).toBeDisabled();await textDelivery.getByRole('button',{name:'Decrypt message',exact:true}).click();
  const received=b.getByRole('dialog',{name:'Received Link message',exact:true});await expect(received.getByText(plaintext,{exact:true})).toBeVisible();await received.getByRole('button',{name:'Close',exact:true}).click();await textDelivery.getByRole('button',{name:'Mark received',exact:true}).click();await expect(textDelivery).toContainText('complete');
  // 8 MiB transfer across 33 encrypted 256 KiB chunks, including a partial final chunk.
  const bytes=randomBytes(32*256*1024+137),filename='synthetic-link.bin';
  let interrupted=false;const interruptChunk=async route=>{if(!interrupted&&route.request().postDataJSON().seq===10){interrupted=true;await route.abort('failed');return;}await route.continue();};
  await a.route('**/api/link/payload/chunk',interruptChunk);await section(a,'Pairings');await a.getByRole('button',{name:'Send to device',exact:true}).click();await a.getByRole('button',{name:'file',exact:true}).click();await a.getByLabel('Send encrypted Link file',{exact:true}).setInputFiles({name:filename,mimeType:'application/octet-stream',buffer:bytes});
  const senderDialog=a.getByRole('dialog',{name:'Send to Browser B',exact:true});await expect(senderDialog.getByRole('alert')).toBeVisible();expect(interrupted).toBe(true);await a.unroute('**/api/link/payload/chunk',interruptChunk);await senderDialog.getByRole('button',{name:'Close',exact:true}).click();await section(a,'Transfers');const senderTransfer=card(a,filename);await expect(senderTransfer).toContainText('10/33 encrypted chunks');
  const wrongBytes=Buffer.from(bytes);wrongBytes[11*256*1024+3]^=1;
  await senderTransfer.getByRole('button',{name:'Resume encrypted upload',exact:true}).click();await a.getByLabel('Choose the original file to resume encrypted upload',{exact:true}).setInputFiles({name:filename,mimeType:'application/octet-stream',buffer:wrongBytes});
  await expect(a.getByRole('alert')).toContainText('Selected file does not match the saved encrypted transfer.');expect(writes).toHaveLength(12);await expect(senderTransfer).toContainText('10/33 encrypted chunks');
  await senderTransfer.getByRole('button',{name:'Resume encrypted upload',exact:true}).click();await a.getByLabel('Choose the original file to resume encrypted upload',{exact:true}).setInputFiles({name:filename,mimeType:'application/octet-stream',buffer:bytes});await expect(senderTransfer).toContainText('queued');
  await refresh(b);await section(b,'Transfers');const fileDelivery=card(b,filename);await expect(fileDelivery).toContainText('33/33 encrypted chunks');await expect(fileDelivery.getByRole('button',{name:'Mark received',exact:true})).toBeDisabled();
  const downloadPromise=b.waitForEvent('download');await fileDelivery.getByRole('button',{name:'Download and verify file',exact:true}).click();const download=await downloadPromise;expect(download.suggestedFilename()).toBe(filename);const stream=await download.createReadStream();expect(stream).not.toBeNull();const parts=[];for await(const part of stream)parts.push(part);expect(Buffer.concat(parts).equals(bytes)).toBe(true);
  await fileDelivery.getByRole('button',{name:'Mark received',exact:true}).click();await expect(fileDelivery).toContainText('complete');expect(writes.length).toBe(45);expect(JSON.stringify(writes)).not.toContain(plaintext);
  await section(a,'Devices');await card(a,'Browser B').getByRole('button',{name:'Revoke device',exact:true}).click();await a.getByRole('button',{name:'Confirm device revocation',exact:true}).click();await expect(card(a,'Browser B')).toContainText('Revoked');
  await refresh(b);await expect(b.getByRole('alert')).toBeVisible();
  // An established account cookie cannot resurrect the revoked persisted key.
  await b.reload();await expect(b.getByRole('alert')).toBeVisible();await expect(b.getByRole('button',{name:'Send to device',exact:true})).toHaveCount(0);
 }finally{await Promise.all(contexts.map(context=>context.close()));}
});
