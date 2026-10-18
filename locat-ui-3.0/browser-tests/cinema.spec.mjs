import {test,expect} from '@playwright/test';
import {randomBytes} from 'node:crypto';
import {startBrowserFixture} from '../tools/browser-fixture.mjs';
let fixture;
test.beforeAll(async()=>{fixture=await startBrowserFixture({media:true});});
test.afterAll(async()=>{await fixture?.stop();});
test('Cinema: real storage guards, clickable controls, server metadata and compatible HEVC conversion',async({browser})=>{
 test.setTimeout(120000);
 const context=await browser.newContext({ignoreHTTPSErrors:true,serviceWorkers:'block'}),page=await context.newPage();
 const external=[],streams=[],errors=[];
 await context.route('**/*',route=>{if(new URL(route.request().url()).origin===fixture.origin)return route.continue();external.push(true);return route.abort();});
 page.on('response',response=>{if(new URL(response.url()).pathname.startsWith('/api/media/stream/'))console.log('Cinema stream response',new URL(response.url()).search,response.status(),response.headers()['content-type']);});
 page.on('requestfailed',request=>{if(new URL(request.url()).pathname.startsWith('/api/media/stream/'))console.log('Cinema stream failure',new URL(request.url()).search,request.failure());});
 page.on('pageerror',error=>errors.push(error.message));page.on('request',request=>{if(new URL(request.url()).pathname.startsWith('/api/media/stream/'))streams.push(request.url());});
 try{
  const username='cinema_'+randomBytes(6).toString('hex'),password=randomBytes(24).toString('base64url');await page.goto(fixture.origin);
  const account=await page.evaluate(async input=>{const response=await fetch('/api/auth/register',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(input)});return {status:response.status,...await response.json()};},{username,password,displayName:'Cinema QA'});expect(account.status).toBe(201);
  await page.getByTestId('login-username').fill(username);await page.getByTestId('login-password').fill(password);await page.getByTestId('login-submit').click();await expect(page.getByTestId('entry-flow')).toHaveCount(0);await page.goto(fixture.origin+'/cinema');
  await page.getByLabel('Import Cinema files').setInputFiles(fixture.mediaFiles.large);await expect(page.getByRole('alert').filter({hasText:'256 MiB'})).toBeVisible();
  const count=await page.evaluate(async owner=>{const db=await new Promise((resolve,reject)=>{const request=indexedDB.open('locat-ui3-media:'+owner);request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);});try{return await new Promise((resolve,reject)=>{const tx=db.transaction('items'),request=tx.objectStore('items').count();tx.oncomplete=()=>resolve(request.result);tx.onabort=()=>reject(tx.error);});}finally{db.close();}},account.user.id);expect(count).toBe(0);
  await page.getByLabel('Open Cinema video without copying').setInputFiles(fixture.mediaFiles.h264);await expect(page.getByTestId('video-player')).toBeVisible();await page.getByRole('button',{name:'Close player'}).click();await page.reload();await expect(page.getByText(/Device · session only/)).toHaveCount(0);
  await page.getByRole('button').filter({hasText:'Browser-H264.mkv'}).click();await page.getByTestId('video-player').hover();await page.getByRole('button',{name:'Playback options',exact:true}).click();let dialog=page.getByRole('dialog',{name:'Playback compatibility'});
  await expect(dialog.getByText(/h264 \/ aac/)).toBeVisible();const remux=dialog.getByRole('button',{name:'Remux · copy streams into MP4'});await expect(remux).toBeEnabled();await remux.focus();await page.keyboard.press('Space');await expect(dialog).toHaveCount(0);
  await expect.poll(()=>streams.some(url=>url.includes('mode=remux'))).toBe(true);await expect.poll(()=>page.locator('video').evaluate(video=>video.readyState)).toBeGreaterThanOrEqual(1);
  await page.getByTestId('video-player').hover();await page.getByRole('button',{name:'Playback options',exact:true}).click();dialog=page.getByRole('dialog',{name:'Playback compatibility'});await dialog.getByRole('button',{name:'Direct playback · supports seeking'}).click();await expect(dialog).toHaveCount(0);await expect(page.locator('video')).toHaveAttribute('src',/^[^?]+$/);
  await page.getByRole('button',{name:'Close player'}).click();await page.getByRole('button').filter({hasText:'Browser-HEVC-4K.mkv'}).click();await page.getByRole('button',{name:'Stream info'}).click();const info=page.getByRole('dialog',{name:'Stream details'});await expect(info.getByText('hevc · 3840×2160',{exact:true})).toBeVisible();expect(await info.innerText()).not.toContain('undefined');await info.getByRole('button',{name:'Close',exact:true}).last().click();
  await page.getByTestId('video-player').hover();await page.getByRole('button',{name:'Playback options',exact:true}).click();dialog=page.getByRole('dialog',{name:'Playback compatibility'});await expect(dialog.getByRole('button',{name:'Remux · copy streams into MP4'})).toBeDisabled();await expect(dialog.getByText(/Remux keeps the original codec/)).toBeVisible();
  const convert=dialog.getByRole('button',{name:'Convert to H.264/AAC · up to 1080p'});await convert.focus();await page.keyboard.press('Enter');await expect(dialog).toHaveCount(0);await expect.poll(()=>streams.some(url=>url.includes('mode=transcode'))).toBe(true);await expect.poll(()=>page.locator('video').evaluate(video=>({ready:video.readyState,width:video.videoWidth,height:video.videoHeight})) ,{timeout:30000}).toEqual({ready:4,width:1920,height:1080});
  const before=streams.filter(url=>url.includes('mode=transcode')).length;
  await page.getByTestId('video-player').hover();await page.getByRole('button',{name:'Playback options',exact:true}).click();await page.getByRole('dialog',{name:'Playback compatibility'}).getByRole('button',{name:'Convert to H.264/AAC · up to 1080p'}).click();await expect.poll(()=>streams.filter(url=>url.includes('mode=transcode')).length).toBeGreaterThan(before);
  await expect(page.getByLabel('Seek',{exact:true})).toBeEnabled();await expect(page.getByTestId('player-error')).toHaveCount(0);expect(errors).toEqual([]);expect(external).toEqual([]);
  await page.route('**/api/media/stream/*?mode=transcode',route=>route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({error:'FFmpeg is unavailable'})}));
  await page.getByTestId('video-player').hover();await page.getByRole('button',{name:'Playback options',exact:true}).click();await page.getByRole('dialog',{name:'Playback compatibility'}).getByRole('button',{name:'Convert to H.264/AAC · up to 1080p'}).click();await expect(page.getByTestId('player-error')).toContainText('Server conversion could not be played');
 }catch(error){console.log('Cinema native failure',await page.locator('video').evaluate(v=>({src:v.getAttribute('src'),ready:v.readyState,network:v.networkState,paused:v.paused,ended:v.ended,time:v.currentTime,duration:v.duration,preload:v.preload,buffered:v.buffered.length,error:v.error?{code:v.error.code,message:v.error.message}:null})).catch(()=>null));console.log('Cinema player error text',await page.getByTestId('player-error').allTextContents());throw error;}finally{await context.close();}
});

test('Cinema converted timeline restarts at the requested scene and preserves paused playback',async({browser})=>{
 const context=await browser.newContext({ignoreHTTPSErrors:true,serviceWorkers:'block'}),page=await context.newPage();
 try{
  const username='seek_'+randomBytes(6).toString('hex'),password=randomBytes(24).toString('base64url');await page.goto(fixture.origin);
  expect(await page.evaluate(async input=>(await fetch('/api/auth/register',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(input)})).status,{username,password,displayName:'Seek QA'})).toBe(201);
  await page.getByTestId('login-username').fill(username);await page.getByTestId('login-password').fill(password);await page.getByTestId('login-submit').click();await expect(page.getByTestId('entry-flow')).toHaveCount(0);await page.goto(fixture.origin+'/cinema');
  await page.getByRole('button').filter({hasText:'Browser-Seek.mkv'}).click();await page.getByTestId('video-player').hover();await page.getByRole('button',{name:'Playback options',exact:true}).click();await page.getByRole('dialog',{name:'Playback compatibility'}).getByRole('button',{name:'Convert to H.264/AAC · up to 1080p'}).click();
  await expect.poll(()=>page.locator('video').evaluate(v=>v.readyState)).toBe(4);
  await page.locator('video').evaluate(v=>v.pause());
  const seek=page.getByLabel('Seek',{exact:true});await seek.focus();await page.keyboard.press('Home');
  await expect.poll(()=>page.locator('video').evaluate(v=>v.readyState>=2&&v.videoWidth===160&&v.videoHeight===90)).toBe(true);
  await seek.focus();await page.keyboard.press('ArrowRight');await expect(page.locator('video')).toHaveAttribute('src',/start=1/);await expect.poll(()=>page.locator('video').evaluate(v=>v.readyState>=2&&v.videoWidth===160&&v.videoHeight===90)).toBe(true);
  const red=await page.locator('video').evaluate(v=>{const c=document.createElement('canvas');c.width=c.height=1;const x=c.getContext('2d');x.drawImage(v,0,0,1,1);return [...x.getImageData(0,0,1,1).data];});expect(red[0]).toBeGreaterThan(200);expect(red[2]).toBeLessThan(40);
  await seek.focus();await page.keyboard.press('ArrowRight');await expect(page.locator('video')).toHaveAttribute('src',/start=2/);await expect.poll(()=>page.locator('video').evaluate(v=>v.readyState>=2&&v.videoWidth===160&&v.videoHeight===90)).toBe(true);
  const frame=await page.locator('video').evaluate(v=>{const canvas=document.createElement('canvas');canvas.width=canvas.height=1;const ctx=canvas.getContext('2d');ctx.drawImage(v,0,0,1,1);return {paused:v.paused,time:v.currentTime,pixel:[...ctx.getImageData(0,0,1,1).data]};});
  expect(frame.paused).toBe(true);expect(frame.time).toBeLessThan(0.5);expect(frame.pixel[2]).toBeGreaterThan(200);expect(frame.pixel[0]).toBeLessThan(40);
  await page.getByTestId('video-player').hover();await page.getByTestId('player-play-toggle').click();await expect.poll(()=>page.locator('video').evaluate(v=>v.currentTime)).toBeGreaterThan(0.25);
  await expect(page.getByTestId('player-error')).toHaveCount(0);
 }finally{await context.close();}
});
