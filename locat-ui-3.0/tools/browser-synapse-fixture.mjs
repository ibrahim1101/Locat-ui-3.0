/** Private helper: a fresh pinned loopback Synapse, never an existing homeserver. */
import {spawn,execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {createServer} from 'node:net';
import {once} from 'node:events';
import {writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {randomBytes} from 'node:crypto';
import {createMatrixAppserviceRegistration} from '../server/matrixAppserviceConfig.mjs';
const exec=promisify(execFile),pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
export async function startBrowserSynapse(dir,serverId){
 const python=process.env.LOCAT_TEST_SYNAPSE_PYTHON;if(!python)throw new Error('Browser Matrix acceptance requires an isolated pinned Synapse Python environment');
 const runtime=Object.fromEntries(['PATH','SystemRoot','WINDIR','TEMP','TMP','LANG'].filter(name=>process.env[name]!==undefined).map(name=>[name,process.env[name]]));
 const version=await exec(python,['-c','import synapse;print(synapse.__version__)'],{env:runtime});if(version.stdout.trim()!=='1.163.0')throw new Error('Browser acceptance requires matrix-synapse==1.163.0');
 const reservation=createServer();await new Promise((resolve,reject)=>reservation.once('error',reject).listen(0,'127.0.0.1',resolve));const port=reservation.address().port;await new Promise(resolve=>reservation.close(resolve));
 const baseUrl='http://127.0.0.1:'+port,serverName='locat-browser.invalid',registration=join(dir,'browser-appservice.json'),logging=join(dir,'browser-synapse-logging.json'),config=join(dir,'browser-homeserver.json');
 await writeFile(registration,JSON.stringify(createMatrixAppserviceRegistration(serverId,serverName)),{mode:0o600});
 await writeFile(logging,JSON.stringify({version:1,handlers:{null:{class:'logging.NullHandler'}},root:{level:'WARNING',handlers:['null']},disable_existing_loggers:false}),{mode:0o600});
 await writeFile(config,JSON.stringify({app_service_config_files:[registration],server_name:serverName,public_baseurl:baseUrl,report_stats:false,pid_file:join(dir,'browser-synapse.pid'),listeners:[{port,type:'http',tls:false,bind_addresses:['127.0.0.1'],resources:[{names:['client'],compress:false}]}],database:{name:'sqlite3',args:{database:join(dir,'browser-synapse.sqlite')}},media_store_path:join(dir,'browser-synapse-media'),signing_key_path:join(dir,'browser-synapse.key'),log_config:logging,enable_registration:false,macaroon_secret_key:randomBytes(32).toString('hex'),trusted_key_servers:[],federation_domain_whitelist:[],rc_login:{address:{per_second:100,burst_count:100},account:{per_second:100,burst_count:100},failed_attempts:{per_second:100,burst_count:100}}}),{mode:0o600});
 await exec(python,['-m','synapse.app.homeserver','--config-path',config,'--generate-keys'],{cwd:dir,env:runtime,timeout:30000});
 const child=spawn(python,['-m','synapse.app.homeserver','--config-path',config],{cwd:dir,env:runtime,stdio:'ignore'});let startupError;child.on('error',error=>{startupError=error;});
 async function stop(){if(child.pid&&child.exitCode===null&&child.signalCode===null){const exited=once(child,'exit');child.kill('SIGTERM');const timer=setTimeout(()=>child.kill('SIGKILL'),3000);try{await exited;}finally{clearTimeout(timer);}}}
 try{
  const deadline=Date.now()+30000;
  while(Date.now()<deadline){if(startupError)throw startupError;if(child.exitCode!==null)throw new Error('Isolated browser Synapse exited');try{if((await fetch(baseUrl+'/_matrix/client/versions',{signal:AbortSignal.timeout(1000)})).ok)return {stop,environment:{LOCAT_MATRIX_UPSTREAM:baseUrl,LOCAT_MATRIX_SERVER_NAME:serverName,LOCAT_MATRIX_APPSERVICE_FILE:registration}};}catch{/* Startup only; never sends account data or follows an external origin. */}await pause(100);}
  throw new Error('Isolated browser Synapse readiness timed out');
 }catch(error){await stop();throw error;}
}
