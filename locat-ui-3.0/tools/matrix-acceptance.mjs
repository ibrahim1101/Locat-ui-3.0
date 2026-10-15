import {openDatabase} from '../server/database.mjs';
import {matrixProvider,matrixTokenHash} from '../server/matrixBinding.mjs';
/** Isolated synthetic acceptance only. Never points at an existing homeserver/account. */
import assert from 'node:assert/strict';
import {mkdtemp,writeFile,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawn,execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {createServer} from 'node:net';
import {once} from 'node:events';
import {randomBytes} from 'node:crypto';
import {createClient,MatrixEvent} from 'matrix-js-sdk';
const exec=promisify(execFile),python=process.env.LOCAT_TEST_SYNAPSE_PYTHON;
if(!python)throw new Error('Set LOCAT_TEST_SYNAPSE_PYTHON to an isolated Python environment with matrix-synapse==1.163.0');
const version=await exec(python,['-c','import synapse;print(synapse.__version__)']);assert.equal(version.stdout.trim(),'1.163.0','Use the pinned test Synapse version');
const dir=await mkdtemp(join(tmpdir(),'locat-matrix-acceptance-'));let child,locat;const clients=[];
const quiet={trace(){},debug(){},info(){},warn(){},error(){},getChild(){return this;}};
const {logger}=await import('matrix-js-sdk/lib/logger.js');for(const level of ['trace','debug','info','warn','error','log'])logger[level]=()=>{};logger.getChild=()=>quiet;
const networks=new Map();
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function until(test,label,ms=30000){const end=Date.now()+ms;while(Date.now()<end){if(await test())return;await pause(100);}throw new Error('Timed out: '+label);}
try{
 const reservation=createServer();await new Promise(resolve=>reservation.listen(0,'127.0.0.1',resolve));const port=reservation.address().port;await new Promise(resolve=>reservation.close(resolve));const baseUrl='http://127.0.0.1:'+port;
 const config=join(dir,'homeserver.json'),database=join(dir,'test.sqlite');
 const logging=join(dir,'logging.json');await writeFile(logging,JSON.stringify({version:1,handlers:{null:{class:'logging.NullHandler'}},root:{level:'WARNING',handlers:['null']},disable_existing_loggers:false}),{mode:0o600});
 await writeFile(config,JSON.stringify({server_name:'locat-test.invalid',public_baseurl:baseUrl,report_stats:false,pid_file:join(dir,'synapse.pid'),listeners:[{port,type:'http',tls:false,bind_addresses:['127.0.0.1'],resources:[{names:['client'],compress:false}]}],database:{name:'sqlite3',args:{database}},media_store_path:join(dir,'media'),signing_key_path:join(dir,'signing.key'),log_config:logging,enable_registration:true,enable_registration_without_verification:true,registration_shared_secret:randomBytes(32).toString('hex'),macaroon_secret_key:randomBytes(32).toString('hex'),trusted_key_servers:[],federation_domain_whitelist:[],rc_registration:{per_second:100,burst_count:100},rc_login:{address:{per_second:100,burst_count:100},account:{per_second:100,burst_count:100},failed_attempts:{per_second:100,burst_count:100}}}),{mode:0o600});
 await exec(python,['-m','synapse.app.homeserver','--config-path',config,'--generate-keys'],{cwd:dir});
 child=spawn(python,['-m','synapse.app.homeserver','--config-path',config],{cwd:dir,stdio:'ignore'});
 await until(async()=>{if(child.exitCode!==null)throw new Error('Test homeserver exited');try{return (await fetch(baseUrl+'/_matrix/client/versions',{signal:AbortSignal.timeout(1000)})).ok;}catch{return false;}},'test homeserver startup');
 async function register(username){const response=await fetch(baseUrl+'/_matrix/client/v3/register',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username,password:randomBytes(32).toString('hex'),auth:{type:'m.login.dummy'}})});assert.equal(response.status,200,'Synthetic registration');return response.json();}
 locat=openDatabase(join(dir,'locat-binding.sqlite'));
 const provider=matrixProvider({LOCAT_MATRIX_UPSTREAM:baseUrl,LOCAT_MATRIX_SERVER_NAME:'locat-test.invalid'});
 async function client(account){const network={online:true,pending:new Set()};networks.set(account.user_id,network);const fetchFn=async(input,init)=>{if(!network.online)throw new Error('Synthetic offline client');const control=new AbortController();network.pending.add(control);try{return await fetch(input,{...init,signal:init?.signal?AbortSignal.any([init.signal,control.signal]):control.signal});}finally{network.pending.delete(control);}};const c=createClient({fetchFn,baseUrl,accessToken:account.access_token,userId:account.user_id,deviceId:account.device_id,logger:quiet});clients.push(c);await c.initRustCrypto({useIndexedDB:false});const rust=await import('@matrix-org/matrix-sdk-crypto-wasm');new rust.Tracing(rust.LoggerLevel.Error).turnOff();
 const accountId=account.user_id.includes('alice')?'a'.repeat(32):'b'.repeat(32);locat.addUser({id:accountId,username:accountId.slice(0,3),displayName:'Synthetic',salt:'synthetic-salt',hash:'synthetic-hash'});const device=locat.link.register(accountId,'Synthetic browser','web','synthetic-public-'+accountId).id;
 const publicKeys=await c.getCrypto().getOwnDeviceKeys(),binding={userId:account.user_id,deviceId:account.device_id,accessToken:account.access_token,publicKeys};const inspected=await provider.inspect(account.access_token);locat.matrixBindings.bind(accountId,device,matrixTokenHash('synthetic-locat-session'),binding,inspected);assert.equal(locat.matrixBindings.authorize(accountId,device,matrixTokenHash('synthetic-locat-session'),account.access_token).matrixDeviceId,account.device_id);
 await c.startClient({initialSyncLimit:20});await until(()=>c.getSyncState()==='PREPARED'||c.getSyncState()==='SYNCING','client initial sync');return c;}
 const aliceAccount=await register('alice'),bobAccount=await register('bob');const alice=await client(aliceAccount),bob=await client(bobAccount);
 const room=(await alice.createRoom({visibility:'private',preset:'private_chat',invite:[bobAccount.user_id],initial_state:[{type:'m.room.encryption',state_key:'',content:{algorithm:'m.megolm.v1.aes-sha2'}}]})).room_id;
 await bob.joinRoom(room);await until(()=>alice.getRoom(room)?.getMember(bobAccount.user_id)?.membership==='join'&&bob.getRoom(room)?.getMyMembership()==='join','room membership');
 // Synthetic out-of-band comparison: never mark a device trusted merely because the homeserver says so.
 async function verify(observer,peer){const devices=await observer.getCrypto().getUserDeviceInfo([peer.getUserId()],true);const own=await peer.getCrypto().getOwnDeviceKeys();const remote=devices.get(peer.getUserId())?.get(peer.getDeviceId());assert.ok(remote,'Peer device published');assert.equal(remote.getFingerprint(),own.ed25519);await observer.getCrypto().setDeviceVerified(peer.getUserId(),peer.getDeviceId(),true);assert.equal((await observer.getCrypto().getDeviceVerificationStatus(peer.getUserId(),peer.getDeviceId())).isVerified(),true);}
 await verify(alice,bob);await verify(bob,alice);alice.getCrypto().globalBlacklistUnverifiedDevices=true;bob.getCrypto().globalBlacklistUnverifiedDevices=true;
 const marker='LOCAT_SYNTHETIC_PRIVATE_'+randomBytes(16).toString('hex');const first=await alice.sendTextMessage(room,marker);
 async function decrypted(c,id){const event=c.getRoom(room)?.findEventById(id);if(!event)return null;await c.decryptEventIfNeeded(event);return event.getContent().body;}
 await until(async()=>await decrypted(bob,first.event_id)===marker,'live encrypted delivery');
 const raw=await alice.fetchRoomEvent(room,first.event_id);assert.equal(raw.type,'m.room.encrypted');assert.ok(!JSON.stringify(raw).includes(marker),'Transport must contain ciphertext');
 const bobNetwork=networks.get(bobAccount.user_id);bobNetwork.online=false;for(const request of bobNetwork.pending)request.abort();
 const offline=marker+'_OFFLINE';const second=await alice.sendTextMessage(room,offline);
 await pause(500);assert.notEqual(await decrypted(bob,second.event_id),offline,'Disconnected recipient must not receive early');
 // Restart the actual homeserver with the same test database while the recipient is disconnected.
 child.kill();await Promise.race([once(child,'exit'),pause(5000)]);if(child.exitCode===null&&child.signalCode===null){child.kill('SIGKILL');await once(child,'exit');}
 child=spawn(python,['-m','synapse.app.homeserver','--config-path',config],{cwd:dir,stdio:'ignore'});
 await until(async()=>{if(child.exitCode!==null)throw new Error('Restarted test homeserver exited');try{return (await fetch(baseUrl+'/_matrix/client/versions',{signal:AbortSignal.timeout(1000)})).ok;}catch{return false;}},'homeserver recovery');
 bobNetwork.online=true;await until(async()=>await decrypted(bob,second.event_id)===offline,'offline recipient delivery',60000);
 assert.equal(bob.getRoom(room).getLiveTimeline().getEvents().filter(event=>event.getId()===second.event_id).length,1,'Timeline must suppress duplicate event IDs');
 const cipher=raw.content.ciphertext;const tampered=new MatrixEvent({...raw,event_id:'$synthetic-tamper',content:{...raw.content,ciphertext:cipher.slice(0,12)+(cipher[12]==='A'?'B':'A')+cipher.slice(13)}});
 await bob.decryptEventIfNeeded(tampered);assert.equal(tampered.isDecryptionFailure(),true,'Modified ciphertext must not decrypt');
 // Server storage, including SQLite WAL, must not contain the unique synthetic content marker.
 for(const file of [database,database+'-wal']){let bytes;try{bytes=await readFile(file);}catch(error){if(error.code==='ENOENT')continue;throw error;}assert.equal(bytes.includes(Buffer.from(marker)),false,'Server database must not contain message plaintext');}
 console.log(JSON.stringify({status:'passed',sdk:'44.0.0',synapse:'1.163.0',checks:['real Rust crypto and fresh device binding','manual peer fingerprint comparison','verified device trust','live Megolm ciphertext and decryption','offline delivery after actual server restart','timeline duplicate suppression','ciphertext tamper rejection','database and WAL plaintext scan'],limitations:['ephemeral client crypto store','no automated account provisioning or live chat UI','no cross-signing/SAS/recovery acceptance','no federation or public-network acceptance']}));
}finally{
 for(const client of clients)client.stopClient();locat?.close();
 if(child&&child.exitCode===null&&child.signalCode===null){child.kill();await Promise.race([once(child,'exit'),pause(5000)]);if(child.exitCode===null&&child.signalCode===null){child.kill('SIGKILL');await once(child,'exit');}}
 await rm(dir,{recursive:true,force:true});
}

// This standalone synthetic harness owns no work after client/server teardown and fixture removal.
// SDK retry timers may remain scheduled after stopClient; do not leave the CI process running.
process.exit(0);
