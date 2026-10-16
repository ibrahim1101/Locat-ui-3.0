/** Isolated production HTTPS fixture. Never accepts an existing server/database. */
import {spawn,execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {createServer} from 'node:net';
import {get} from 'node:https';
import {once} from 'node:events';
import {mkdtemp,readFile,chmod,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {openDatabase} from '../server/database.mjs';
import {startBrowserSynapse} from './browser-synapse-fixture.mjs';
const exec=promisify(execFile),pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
export async function startBrowserFixture({matrix=false}={}){
 const dir=await mkdtemp(join(tmpdir(),'locat-browser-')),cwd=fileURLToPath(new URL('../',import.meta.url));let child,synapse;
 async function stopGateway(){
  if(child?.pid&&child.exitCode===null&&child.signalCode===null){const exited=once(child,'exit');child.kill('SIGTERM');const timer=setTimeout(()=>child.kill('SIGKILL'),3000);try{await exited;}finally{clearTimeout(timer);}}
 }
 async function stop(){try{await stopGateway();}finally{try{await synapse?.stop();}finally{await rm(dir,{recursive:true,force:true});}}}

 try{
  const reservation=createServer();await new Promise((resolve,reject)=>reservation.once('error',reject).listen(0,'127.0.0.1',resolve));
  const port=reservation.address().port;await new Promise(resolve=>reservation.close(resolve));
  const origin='https://127.0.0.1:'+port,key=join(dir,'fixture.key'),cert=join(dir,'fixture.crt');
  await exec('openssl',['req','-x509','-newkey','rsa:2048','-nodes','-keyout',key,'-out',cert,'-days','1','-subj','/CN=127.0.0.1','-addext','subjectAltName=IP:127.0.0.1']);await chmod(key,0o600);
  const ca=await readFile(cert),runtime=Object.fromEntries(['PATH','SystemRoot','WINDIR','TEMP','TMP','LANG'].filter(name=>process.env[name]!==undefined).map(name=>[name,process.env[name]]));
  if(matrix){const db=openDatabase(join(dir,'fixture.sqlite'));let serverId;try{serverId=db.serverId;}finally{db.close();}synapse=await startBrowserSynapse(dir,serverId);}
  let diagnostic='',startupError;
  const startGateway=()=>{startupError=undefined;child=spawn(process.execPath,['server/index.mjs'],{cwd,env:{...runtime,...synapse?.environment,LOCAT_HOST:'127.0.0.1',LOCAT_PORT:String(port),LOCAT_PUBLIC_ORIGIN:origin,LOCAT_TLS_KEY:key,LOCAT_TLS_CERT:cert,LOCAT_DATABASE_FILE:join(dir,'fixture.sqlite'),LOCAT_STATIC_DIR:join(cwd,'dist')},stdio:['ignore','ignore','pipe']});
  child.stderr.on('data',chunk=>{diagnostic=(diagnostic+chunk).slice(-4000);});child.on('error',error=>{startupError=error;});};startGateway();
  const ready=()=>new Promise(resolve=>{
   const request=get(origin+'/api/ready',{ca,timeout:1000},response=>{response.on('error',()=>resolve(false));response.resume();resolve(response.statusCode===200);});
   request.on('timeout',()=>request.destroy());request.on('error',()=>resolve(false));
  });
  const deadline=Date.now()+20000;
  while(Date.now()<deadline){
   if(startupError)throw startupError;if(child.exitCode!==null)throw new Error('Browser fixture server exited: '+diagnostic);
   if(await ready())return {origin,stop,restartGateway:async()=>{await stopGateway();startGateway();const end=Date.now()+20000;while(Date.now()<end){if(startupError)throw startupError;if(child.exitCode!==null)throw new Error('Restarted gateway exited');if(await ready())return;await pause(100);}throw new Error('Restarted gateway readiness timed out');},restartHomeserver:async()=>{if(!synapse)throw new Error('No synthetic homeserver is running');await synapse.restart();},assertNoMessagePlaintext:async markers=>{if(!Array.isArray(markers)||!markers.length||markers.length>10||markers.some(marker=>typeof marker!=='string'||marker.length<32||marker.length>1024))throw new Error('Use bounded unique synthetic markers');for(const file of ['fixture.sqlite','fixture.sqlite-wal',...(synapse?['browser-synapse.sqlite','browser-synapse.sqlite-wal']:[])]){let bytes;try{bytes=await readFile(join(dir,file));}catch(error){if(error.code==='ENOENT'&&file.endsWith('-wal'))continue;throw error;}if(markers.some(marker=>bytes.includes(Buffer.from(marker))))throw new Error('Synthetic message plaintext found in fixture persistence');}if(markers.some(marker=>diagnostic.includes(marker)))throw new Error('Synthetic message plaintext found in captured server diagnostics');}};await pause(100);
  }
  throw new Error('Browser fixture readiness timed out: '+diagnostic);
 }catch(error){await stop();throw error;}
}
