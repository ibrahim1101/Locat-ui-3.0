/** Isolated real Vite/React StrictMode acceptance. Never uses an existing database/media source. */
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawn,execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {createServer} from 'node:net';
import {once} from 'node:events';
import {randomBytes} from 'node:crypto';
import {firefox,expect} from '@playwright/test';
const exec=promisify(execFile),origin='http://127.0.0.1:5173',children=[];
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
for(const port of [5173,8787]){
 const reservation=createServer();await new Promise((resolve,reject)=>reservation.once('error',reject).listen(port,'127.0.0.1',resolve));await new Promise(resolve=>reservation.close(resolve));
}
const dir=await mkdtemp(join(tmpdir(),'locat-cinema-dev-'));let browser;
try{
 const media=join(dir,'media');await mkdir(media);
 await exec('ffmpeg',['-v','error','-f','lavfi','-i','color=c=blue:s=160x90:r=10:d=4','-f','lavfi','-i','sine=frequency=440:duration=4','-c:v','libx264','-threads','1','-pix_fmt','yuv420p','-c:a','aac','-movflags','+faststart','-y',join(media,'StrictMode.mp4')],{timeout:30000});
 const runtime=Object.fromEntries(['PATH','SystemRoot','WINDIR','TEMP','TMP','LANG'].filter(key=>process.env[key]!==undefined).map(key=>[key,process.env[key]]));
 function start(args,env){const child=spawn(process.execPath,args,{env,stdio:'ignore'});children.push(child);return child;}
 start(['server/index.mjs'],{...runtime,LOCAT_HOST:'127.0.0.1',LOCAT_PORT:'8787',LOCAT_PUBLIC_ORIGIN:origin,LOCAT_DATABASE_FILE:join(dir,'synthetic.sqlite'),LOCAT_STATIC_DIR:dir,LOCAT_MEDIA_ACCESS_MODE:'authenticated',LOCAT_MEDIA_AUTHORIZED_ROOTS:media});
 start(['node_modules/vite/bin/vite.js','--host','127.0.0.1','--port','5173','--strictPort'],runtime);
 const deadline=Date.now()+30000;
 while(true){
  if(children.some(child=>child.exitCode!==null))throw new Error('Isolated development process exited');
  try{if((await fetch(origin+'/api/ready')).ok)break;}catch{}
  if(Date.now()>deadline)throw new Error('Development gateway readiness timed out');await pause(100);
 }
 const module=await (await fetch(origin+'/src/main.tsx')).text();assert.match(module,/jsxDEV/);assert.match(module,/StrictMode/);
 browser=await firefox.launch();const context=await browser.newContext({serviceWorkers:'block'}),page=await context.newPage(),errors=[],converted=[];
 page.on('pageerror',error=>errors.push(error.message));page.on('response',response=>{if(response.url().includes('/api/media/stream/')&&response.url().includes('mode=transcode'))converted.push(response.status());});
 await page.goto(origin);const username='dev_'+randomBytes(6).toString('hex'),password=randomBytes(24).toString('base64url');
 assert.equal(await page.evaluate(async input=>(await fetch('/api/auth/register',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(input)})).status,{username,password,displayName:'Synthetic development QA'}),201);
 await page.getByTestId('login-username').fill(username);await page.getByTestId('login-password').fill(password);await page.getByTestId('login-submit').click();await expect(page.getByTestId('entry-flow')).toHaveCount(0);await page.goto(origin+'/cinema');
 await page.getByRole('button').filter({hasText:'StrictMode.mp4'}).click();await expect(page.locator('video')).toHaveAttribute('src',/^\/api\/media\/stream\//);
 await expect.poll(()=>page.locator('video').evaluate(v=>v.readyState>=2&&v.videoWidth===160)).toBe(true);
 await page.getByTestId('video-player').hover();await page.getByTestId('player-play-toggle').click();await expect.poll(()=>page.locator('video').evaluate(v=>v.currentTime)).toBeGreaterThan(0.2);
 await page.getByTestId('video-player').hover();await page.getByRole('button',{name:'Playback options',exact:true}).click();await page.getByRole('dialog',{name:'Playback compatibility'}).getByRole('button',{name:'Convert to H.264/AAC · up to 1080p'}).click();
 await expect(page.locator('video')).toHaveAttribute('src',/mode=transcode/);await expect.poll(()=>page.locator('video').evaluate(v=>v.readyState>=2&&v.videoWidth===160)).toBe(true);await expect.poll(()=>page.locator('video').evaluate(v=>v.currentTime)).toBeGreaterThan(0.2);
 assert.ok(converted.includes(200));await expect(page.getByTestId('player-error')).toHaveCount(0);assert.deepEqual(errors,[]);
 await page.getByRole('button',{name:'Close player'}).click();await expect(page.locator('video')).toHaveCount(0);
 console.log(JSON.stringify({status:'passed',checks:['real Vite development jsxDEV/StrictMode','authorized synthetic server video survives ref replay','actual direct playback advances','converted replacement survives ref replay and advances','player close removes video'],limitations:['isolated loopback development only','no physical Windows/Pi/original movie acceptance']}));
}finally{
 await browser?.close();
 await Promise.all(children.map(async child=>{if(child.exitCode!==null)return;const closed=once(child,'exit');child.kill();const timer=setTimeout(()=>child.kill('SIGKILL'),2000);try{await closed;}finally{clearTimeout(timer);}}));
 await rm(dir,{recursive:true,force:true});
}
