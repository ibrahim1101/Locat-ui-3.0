/** Isolated production HTTPS fixture. Never accepts an existing server/database. */
import {createHash,generateKeyPairSync,randomBytes,scryptSync} from 'node:crypto';
import {spawn,execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {createServer} from 'node:net';
import {get} from 'node:https';
import {once} from 'node:events';
import {mkdtemp,readFile,writeFile,chmod,rm,mkdir,open} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {openDatabase} from '../server/database.mjs';
import {startBrowserSynapse} from './browser-synapse-fixture.mjs';
const exec=promisify(execFile),pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
export async function startBrowserFixture({matrix=false,media=false,mediaOwnership=false,identitySigning=false,hostname='127.0.0.1'}={}){
 if(!['127.0.0.1','localhost'].includes(hostname))throw new Error('Only isolated loopback fixture hostnames are allowed');
 const dir=await mkdtemp(join(tmpdir(),'locat-browser-')),cwd=fileURLToPath(new URL('../',import.meta.url));let child,synapse;
 async function stopGateway(){
  if(child?.pid&&child.exitCode===null&&child.signalCode===null){const exited=once(child,'exit');child.kill('SIGTERM');const timer=setTimeout(()=>child.kill('SIGKILL'),3000);try{await exited;}finally{clearTimeout(timer);}}
 }
 async function stop(){try{await stopGateway();}finally{try{await synapse?.stop();}finally{await rm(dir,{recursive:true,force:true});}}}

 try{
  const reservation=createServer();await new Promise((resolve,reject)=>reservation.once('error',reject).listen(0,'127.0.0.1',resolve));
  const port=reservation.address().port;await new Promise(resolve=>reservation.close(resolve));
  const origin='https://'+hostname+':'+port,key=join(dir,'fixture.key'),cert=join(dir,'fixture.crt');
  await exec('openssl',['req','-x509','-newkey','rsa:2048','-nodes','-keyout',key,'-out',cert,'-days','1','-subj','/CN=127.0.0.1','-addext','subjectAltName=IP:127.0.0.1,DNS:localhost']);await chmod(key,0o600);
  const identityKey=join(dir,'identity.pem');if(identitySigning){const pair=generateKeyPairSync('ed25519');await writeFile(identityKey,pair.privateKey.export({format:'pem',type:'pkcs8'}),{mode:0o600});await chmod(identityKey,0o600);}
  const ca=await readFile(cert),runtime=Object.fromEntries(['PATH','SystemRoot','WINDIR','TEMP','TMP','LANG'].filter(name=>process.env[name]!==undefined).map(name=>[name,process.env[name]]));
  if(matrix){const db=openDatabase(join(dir,'fixture.sqlite'));let serverId;try{serverId=db.serverId;}finally{db.close();}synapse=await startBrowserSynapse(dir,serverId);}
  let mediaFiles;
  if(media){
   const root=join(dir,'media');await mkdir(root);
   const h264=join(root,'Browser-H264.mkv'),hevc=join(root,'Browser-HEVC-4K.mkv'),large=join(dir,'Large-13GB.mkv');
   for(const [file,codec,size] of [[h264,'libx264','160x90'],[hevc,'libx265','3840x2160']]){
    await exec('ffmpeg',['-hide_banner','-loglevel','error','-f','lavfi','-i','color=c=blue:size='+size+':rate=2','-f','lavfi','-i','sine=frequency=440:sample_rate=48000','-t','1','-c:v',codec,'-threads','1','-preset','ultrafast','-pix_fmt','yuv420p',...(codec==='libx265'?['-x265-params','pools=1:frame-threads=1:log-level=error']:[]),'-c:a','aac','-y',file],{timeout:30000});
   }
   const sparse=await open(large,'wx');try{await sparse.truncate(13191223154);}finally{await sparse.close();}
   const seek=join(root,'Browser-Seek.mkv');
   await exec('ffmpeg',['-v','error','-f','lavfi','-i','color=c=red:s=160x90:r=10:d=2','-f','lavfi','-i','color=c=blue:s=160x90:r=10:d=2','-f','lavfi','-i','sine=frequency=440:duration=4','-filter_complex','[0:v][1:v]concat=n=2:v=1:a=0[v]','-map','[v]','-map','2:a','-c:v','libx264','-threads','1','-g','100','-sc_threshold','0','-c:a','aac','-y',seek],{timeout:30000});
   mediaFiles={root,h264,hevc,large,seek};
  }
  let mediaAccounts;
  if(mediaOwnership){
   if(!mediaFiles)throw new Error('Ownership acceptance requires synthetic media');
   mediaAccounts=['owner','friend','outsider'].map(username=>({username:'media_'+username,id:randomBytes(16).toString('hex'),password:randomBytes(24).toString('base64url')}));
   const db=openDatabase(join(dir,'fixture.sqlite'));try{for(const account of mediaAccounts){const salt=randomBytes(16).toString('hex');db.addUser({id:account.id,username:account.username,displayName:account.username,salt,hash:scryptSync(account.password,salt,64).toString('hex')});}}finally{db.close();}
  }
  let diagnostic='',startupError;
  const startGateway=()=>{startupError=undefined;child=spawn(process.execPath,['server/index.mjs'],{cwd,env:{...runtime,...synapse?.environment,LOCAT_HOST:'127.0.0.1',LOCAT_PORT:String(port),LOCAT_PUBLIC_ORIGIN:origin,LOCAT_TLS_KEY:key,LOCAT_TLS_CERT:cert,LOCAT_DATABASE_FILE:join(dir,'fixture.sqlite'),LOCAT_STATIC_DIR:join(cwd,'dist'),...(identitySigning?{LOCAT_IDENTITY_SIGNING_KEY_FILE:identityKey}:{}),...(mediaFiles?{LOCAT_MEDIA_AUTHORIZED_ROOTS:mediaFiles.root,...(mediaAccounts?{LOCAT_MEDIA_LIBRARY_ACCESS:JSON.stringify([{root:mediaFiles.root,ownerId:mediaAccounts[0].id,friendIds:[mediaAccounts[1].id]}])}:{LOCAT_MEDIA_ACCESS_MODE:'authenticated'})}:{})},stdio:['ignore','ignore','pipe']});
  child.stderr.on('data',chunk=>{diagnostic=(diagnostic+chunk).slice(-4000);});child.on('error',error=>{startupError=error;});};startGateway();
  const ready=()=>new Promise(resolve=>{
   const request=get(origin+'/api/ready',{ca,timeout:1000},response=>{response.on('error',()=>resolve(false));response.resume();resolve(response.statusCode===200);});
   request.on('timeout',()=>request.destroy());request.on('error',()=>resolve(false));
  });
  async function restartGateway(){await stopGateway();startGateway();const end=Date.now()+20000;while(Date.now()<end){if(startupError)throw startupError;if(child.exitCode!==null)throw new Error('Restarted gateway exited');if(await ready())return;await pause(100);}throw new Error('Restarted gateway readiness timed out');}
  async function replaceIdentityKey(){if(!identitySigning)throw new Error('Identity signing is not enabled for this fixture');const pair=generateKeyPairSync('ed25519'),der=pair.publicKey.export({type:'spki',format:'der'});await writeFile(identityKey,pair.privateKey.export({format:'pem',type:'pkcs8'}),{mode:0o600});await chmod(identityKey,0o600);await restartGateway();return createHash('sha256').update(der).digest('base64url');}
  const deadline=Date.now()+20000;
  while(Date.now()<deadline){
   if(startupError)throw startupError;if(child.exitCode!==null)throw new Error('Browser fixture server exited: '+diagnostic);
   if(await ready())return {origin,homeserverOrigin:synapse?.environment.LOCAT_MATRIX_UPSTREAM,inspectMatrixMedia:synapse?.inspectMedia,stop,mediaFiles,mediaAccounts,restartGateway,replaceIdentityKey,restartHomeserver:async()=>{if(!synapse)throw new Error('No synthetic homeserver is running');await synapse.restart();},assertNoMessagePlaintext:async markers=>{if(!Array.isArray(markers)||!markers.length||markers.length>10||markers.some(marker=>typeof marker!=='string'||marker.length<32||marker.length>1024))throw new Error('Use bounded unique synthetic markers');for(const file of ['fixture.sqlite','fixture.sqlite-wal',...(synapse?['browser-synapse.sqlite','browser-synapse.sqlite-wal']:[])]){let bytes;try{bytes=await readFile(join(dir,file));}catch(error){if(error.code==='ENOENT'&&file.endsWith('-wal'))continue;throw error;}if(markers.some(marker=>bytes.includes(Buffer.from(marker))))throw new Error('Synthetic message plaintext found in fixture persistence');}if(markers.some(marker=>diagnostic.includes(marker)))throw new Error('Synthetic message plaintext found in captured server diagnostics');}};await pause(100);
  }
  throw new Error('Browser fixture readiness timed out: '+diagnostic);
 }catch(error){await stop();throw error;}
}
