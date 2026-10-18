import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,rm,copyFile,open} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,delimiter} from 'node:path';
import {createServer} from 'node:net';
import {get} from 'node:http';
import {spawn,execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {once} from 'node:events';
import {scryptSync,randomBytes} from 'node:crypto';
import {openDatabase} from './database.mjs';
const exec=promisify(execFile),pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
test('real API isolates owned media, authorizes reciprocal configured friends and revokes every delivery path',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'locat-owned-media-')),a='a'.repeat(32),b='b'.repeat(32),e='c'.repeat(32),password=randomBytes(24).toString('base64url');let child,active;
 const roots=[join(dir,'Alice-library'),join(dir,'Bob-library')],dbFile=join(dir,'synthetic.sqlite');
 async function stop(){if(child&&child.exitCode===null&&child.signalCode===null){const done=once(child,'exit');child.kill();const timer=setTimeout(()=>child.kill('SIGKILL'),3000);try{await done;}finally{clearTimeout(timer);}}}
 try{
  await Promise.all(roots.map(root=>mkdir(root)));await mkdir(join(dir,'web'));
  await exec('ffmpeg',['-v','error','-f','lavfi','-i','color=c=blue:s=160x90:r=10:d=1','-f','lavfi','-i','sine=frequency=440:duration=1','-c:v','libx264','-threads','1','-pix_fmt','yuv420p','-c:a','aac','-y',join(roots[0],'Alice.mkv')]);await copyFile(join(roots[0],'Alice.mkv'),join(roots[1],'Bob.mkv'));
  const huge=await open(join(roots[0],'Backpressure.mp4'),'wx');try{await huge.truncate(1024*1024*1024);}finally{await huge.close();}
  const db=openDatabase(dbFile);try{for(const [id,username] of [[a,'alice'],[b,'bob'],[e,'eve']]){const salt=randomBytes(16).toString('hex');db.addUser({id,username,displayName:username,salt,hash:scryptSync(password,salt,64).toString('hex')});}}finally{db.close();}
  const reservation=createServer();await new Promise(resolve=>reservation.listen(0,'127.0.0.1',resolve));const port=reservation.address().port;await new Promise(resolve=>reservation.close(resolve));const origin='http://127.0.0.1:'+port;
  const runtime=Object.fromEntries(['PATH','SystemRoot','WINDIR','TEMP','TMP','LANG'].filter(key=>process.env[key]!==undefined).map(key=>[key,process.env[key]]));
  async function start(policies){child=spawn(process.execPath,['server/index.mjs'],{env:{...runtime,LOCAT_HOST:'127.0.0.1',LOCAT_PORT:String(port),LOCAT_PUBLIC_ORIGIN:origin,LOCAT_DATABASE_FILE:dbFile,LOCAT_STATIC_DIR:join(dir,'web'),LOCAT_MEDIA_AUTHORIZED_ROOTS:roots.join(delimiter),LOCAT_MEDIA_LIBRARY_ACCESS:JSON.stringify(policies)},stdio:'ignore'});const deadline=Date.now()+15000;while(true){if(child.exitCode!==null)throw new Error('Synthetic ownership server exited');try{if((await fetch(origin+'/api/ready')).ok)return;}catch{}if(Date.now()>deadline)throw new Error('Ownership fixture readiness timed out');await pause(50);}}
  const policy=[{root:roots[0],ownerId:a,friendIds:[b]},{root:roots[1],ownerId:b,friendIds:[a]}];await start(policy);
  const request=(path,cookie,body,method=body?'POST':'GET')=>fetch(origin+path,{method,headers:{Origin:origin,...(cookie?{Cookie:cookie}:{}),...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})});
  async function login(username){const response=await request('/api/auth/login',undefined,{username,password});assert.equal(response.status,200);return response.headers.get('set-cookie').split(';')[0];}
  const alice=await login('alice'),eve=await login('eve');let bob=await login('bob');
  const snapshot=async cookie=>(await request('/api/media',cookie)).json();
  const mine=await snapshot(alice),his=await snapshot(bob);assert.equal(mine.items.length,2);assert.equal(his.items.length,1);assert.deepEqual((await snapshot(eve)).items,[]);assert.equal(mine.libraries.length,1);assert.ok(!JSON.stringify(mine).includes(dir));
  const movie=mine.items.find(item=>item.name==='Alice.mkv'),large=mine.items.find(item=>item.name==='Backpressure.mp4'),probe=movie.streamUrl.replace('/stream/','/probe/');
  async function denied(cookie){for(const [path,method] of [[movie.streamUrl,'GET'],[movie.streamUrl,'HEAD'],[probe,'GET'],[movie.streamUrl+'?mode=remux','GET'],[movie.streamUrl+'?mode=transcode','GET']])assert.equal((await request(path,cookie,undefined,method)).status,404,path);}
  await denied(bob);await denied(eve);assert.equal((await request(movie.streamUrl)).status,401);
  assert.equal((await request('/api/contacts/request',alice,{userId:b})).status,200);await denied(bob);assert.equal((await request('/api/contacts/respond',bob,{userId:a,accept:true})).status,200);
  assert.equal((await snapshot(bob)).items.length,3);assert.equal((await snapshot(alice)).items.length,3);
  const reciprocal=his.items[0].streamUrl;for(const suffix of ['', '?mode=transcode']){const reverse=await request(reciprocal+suffix,alice);assert.equal(reverse.status,200);assert.ok((await reverse.arrayBuffer()).byteLength>1000);}assert.equal((await request(reciprocal,eve)).status,404);
  for(const cookie of [alice,bob]){
   assert.equal((await request(probe,cookie)).status,200);
   const direct=await request(movie.streamUrl,cookie);assert.equal(direct.status,200);assert.ok((await direct.arrayBuffer()).byteLength>1000);
   const range=await fetch(origin+movie.streamUrl,{headers:{Cookie:cookie,Range:'bytes=0-9'}});assert.equal(range.status,206);assert.equal((await range.arrayBuffer()).byteLength,10);
   for(const mode of ['remux','transcode']){const output=await request(movie.streamUrl+'?mode='+mode,cookie);assert.equal(output.status,200);assert.ok((await output.arrayBuffer()).byteLength>1000);}
  }
  assert.equal((await request('/api/contacts/request',alice,{userId:e})).status,200);assert.equal((await request('/api/contacts/respond',eve,{userId:a,accept:true})).status,200);await denied(eve);assert.equal((await snapshot(eve)).libraries.length,0);
  const diagnostic=await (await request('/api/diagnostics',eve)).json();assert.equal(diagnostic.media.itemCount,0);assert.deepEqual(diagnostic.media.libraries,[]);
  active=await new Promise((resolve,reject)=>{const req=get(origin+large.streamUrl,{headers:{Cookie:bob}},resolve);req.once('error',reject);});assert.equal(active.statusCode,200);active.pause();
  const aborted=new Promise(resolve=>active.once('aborted',resolve));
  assert.equal((await request('/api/contacts/remove',alice,{userId:b})).status,200);await denied(bob);assert.equal((await snapshot(bob)).items.length,1);assert.equal((await request(reciprocal,alice)).status,404);assert.equal((await snapshot(alice)).items.length,2);
  await pause(1200);active.resume();let timer;try{await Promise.race([aborted,new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error('Revoked stream was not aborted')),3000);})]);}finally{clearTimeout(timer);active.destroy();active=null;}
  assert.equal((await request('/api/contacts/request',alice,{userId:b})).status,200);assert.equal((await request('/api/contacts/respond',bob,{userId:a,accept:true})).status,200);
  active=await new Promise((resolve,reject)=>{const req=get(origin+large.streamUrl,{headers:{Cookie:bob}},resolve);req.once('error',reject);});active.pause();const signedOut=new Promise(resolve=>active.once('aborted',resolve));
  assert.equal((await request('/api/auth/logout',bob,{})).status,200);assert.equal((await request(movie.streamUrl,bob)).status,401);
  await pause(1200);active.resume();try{await Promise.race([signedOut,new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error('Signed-out stream was not aborted')),3000);})]);}finally{clearTimeout(timer);active.destroy();active=null;}bob=await login('bob');
  await stop();await start([{...policy[0],friendIds:[]},policy[1]]);await denied(bob);assert.equal((await snapshot(bob)).items.length,1);
  await stop();await start([]);assert.deepEqual((await snapshot(alice)).items,[]);await denied(alice);
 }finally{active?.destroy();await stop();await rm(dir,{recursive:true,force:true});}
});
