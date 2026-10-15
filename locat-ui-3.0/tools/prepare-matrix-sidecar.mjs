import {mkdir,writeFile,rm} from 'node:fs/promises';
import {resolve} from 'node:path';
import {randomBytes} from 'node:crypto';
import {pathToFileURL} from 'node:url';
/** Prepare only. Never starts services, changes DNS or replaces existing configuration. */
export async function prepareMatrixSidecar(directory,inputOrigin){
 const origin=new URL(inputOrigin);
 if(origin.protocol!=='https:'||origin.username||origin.password||origin.pathname!=='/'||origin.search||origin.hash)throw new Error('An exact HTTPS origin is required');
 const target=resolve(directory);await mkdir(target,{mode:0o700});
 try{
  const password=randomBytes(48).toString('base64url'),adminPassword=randomBytes(48).toString('base64url');
  const config={server_name:origin.host,public_baseurl:origin.origin+'/',report_stats:false,pid_file:'/data/homeserver.pid',listeners:[{port:8008,type:'http',tls:false,bind_addresses:['0.0.0.0'],resources:[{names:['client'],compress:false}]}],database:{name:'psycopg2',args:{user:'synapse',password,database:'synapse',host:'matrix-db',cp_min:5,cp_max:10}},media_store_path:'/data/media',signing_key_path:'/data/homeserver.signing.key',log_config:'/config/logging.json',enable_registration:false,enable_registration_without_verification:false,macaroon_secret_key:randomBytes(48).toString('base64url'),form_secret:randomBytes(48).toString('base64url'),trusted_key_servers:[],federation_domain_whitelist:[],enable_metrics:false};
  await writeFile(target+'/homeserver.json',JSON.stringify(config,null,2)+'\n',{mode:0o600,flag:'wx'});
  await writeFile(target+'/postgres-password',adminPassword+'\n',{mode:0o600,flag:'wx'});
  await writeFile(target+'/init.sql',`CREATE ROLE synapse LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE PASSWORD '${password}';\nCREATE DATABASE synapse OWNER synapse ENCODING 'UTF8' LC_COLLATE 'C' LC_CTYPE 'C' TEMPLATE template0;\n`,{mode:0o600,flag:'wx'});
  await writeFile(target+'/logging.json',JSON.stringify({version:1,formatters:{short:{format:'%(levelname)s %(name)s %(message)s'}},handlers:{console:{class:'logging.StreamHandler',formatter:'short'}},root:{level:'WARNING',handlers:['console']},disable_existing_loggers:false},null,2)+'\n',{mode:0o600,flag:'wx'});
  return {directory:target,origin:origin.origin,serverName:origin.host};
 }catch(error){await rm(target,{recursive:true,force:true});throw error;}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
 if(process.argv.length!==4)throw new Error('Usage: node tools/prepare-matrix-sidecar.mjs <new-private-directory> <https-origin>');
 await prepareMatrixSidecar(process.argv[2],process.argv[3]);console.log('Private Matrix sidecar configuration prepared. No service or DNS change was activated.');
}
