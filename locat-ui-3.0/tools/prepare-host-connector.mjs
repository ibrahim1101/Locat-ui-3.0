import {mkdir,writeFile,rm,realpath} from 'node:fs/promises';
import {resolve,dirname,basename,sep} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {isIP} from 'node:net';

/** Configuration only: never creates credentials, contacts Cloudflare or starts a tunnel. */
export function hostConnectorConfiguration(inputOrigin,tunnelId,{port=8787,metricsPort=2000}={}){
 const origin=new URL(inputOrigin);
 if(origin.protocol!=='https:'||origin.username||origin.password||origin.pathname!=='/'||origin.search||origin.hash||origin.port
  ||isIP(origin.hostname)||!origin.hostname.includes('.')||!/^[a-z0-9.-]+$/.test(origin.hostname)||origin.hostname.split('.').some(label=>!label||label.length>63||label.startsWith('-')||label.endsWith('-')))
  throw new Error('An exact HTTPS DNS origin on port 443 is required');
 if(typeof tunnelId!=='string'||!/^([a-f0-9]{8}-)([a-f0-9]{4}-){3}[a-f0-9]{12}$/i.test(tunnelId))throw new Error('An existing tunnel UUID is required');
 if(![port,metricsPort].every(value=>Number.isInteger(value)&&value>=1024&&value<=65535)||port===metricsPort)throw new Error('Distinct unprivileged backend and metrics ports are required');
 return {tunnel:tunnelId.toLowerCase(),'credentials-file':'/run/secrets/tunnel_credentials',metrics:'127.0.0.1:'+metricsPort,ingress:[{hostname:origin.hostname,service:'http://127.0.0.1:'+port,originRequest:{httpHostHeader:origin.host,connectTimeout:'10s'}},{service:'http_status:404'}]};
}

export async function prepareHostConnector(directory,inputOrigin,tunnelId,options){
 const config=hostConnectorConfiguration(inputOrigin,tunnelId,options);
 const target=resolve(directory),repository=await realpath(resolve(dirname(fileURLToPath(import.meta.url)),'../..'));
 const parent=await realpath(dirname(target)),canonical=resolve(parent,basename(target));
 if(canonical===repository||canonical.startsWith(repository+sep))throw new Error('Private connector configuration must be outside the source repository');
 await mkdir(target,{mode:0o700});
 try{const configFile=resolve(target,'host-connector.yml');await writeFile(configFile,JSON.stringify(config,null,2)+'\n',{mode:0o600,flag:'wx'});return {directory:target,configFile,origin:new URL(inputOrigin).origin};}
 catch(error){await rm(target,{recursive:true,force:true});throw error;}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
 if(process.argv.length!==5)throw new Error('Usage: node tools/prepare-host-connector.mjs <new-private-directory> <https-origin> <existing-tunnel-uuid>');
 await prepareHostConnector(process.argv[2],process.argv[3],process.argv[4]);
 console.log('Private host connector configuration prepared. No credentials, DNS or public service changed.');
}
