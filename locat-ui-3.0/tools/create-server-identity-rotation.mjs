#!/usr/bin/env node
import { lstatSync,openSync,readFileSync,closeSync,writeFileSync,fsyncSync } from 'node:fs';
import { isAbsolute } from 'node:path';
import { createPrivateKey } from 'node:crypto';
import { createIdentityRotation } from '../server/globalIdentity.mjs';

const [oldPath,newPath,origin,serverId,target]=process.argv.slice(2);
function privateKey(path){
 if(!isAbsolute(path??''))throw new Error('absolute path required');
 const metadata=lstatSync(path);if(metadata.isSymbolicLink()||!metadata.isFile()||(process.platform!=='win32'&&(metadata.mode&0o077)!==0))throw new Error('protected file required');
 const key=createPrivateKey(readFileSync(path));if(key.asymmetricKeyType!=='ed25519')throw new Error('Ed25519 required');return key;
}
if(process.argv.length!==7||!isAbsolute(target??'')){
 process.stderr.write('Usage: node tools/create-server-identity-rotation.mjs /absolute/old.pem /absolute/new.pem https://authority.example SERVER_UUID /absolute/rotation.json\n');
 process.exitCode=2;
}else{
 let fd;
 try{
  const url=new URL(origin);if(url.origin!==origin||url.username||url.password||url.pathname!=='/'||url.search||url.hash||!(url.protocol==='https:'||(url.protocol==='http:'&&['localhost','127.0.0.1','[::1]'].includes(url.hostname))))throw new Error('canonical origin required');
  if(!/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(serverId??''))throw new Error('valid server ID required');
  const rotation=createIdentityRotation(origin,serverId,privateKey(oldPath),privateKey(newPath));
  fd=openSync(target,'wx',0o600);writeFileSync(fd,JSON.stringify(rotation)+'\n',{encoding:'utf8'});fsyncSync(fd);closeSync(fd);fd=undefined;
  process.stdout.write('Created a signed authority-key handoff. Configure the new private key and this rotation manifest, deploy together, then remove the manifest after clients have refreshed.\n');
 }catch{
  if(fd!==undefined)try{closeSync(fd);}catch{}
  process.stderr.write('Could not create the rotation manifest. Check protected key paths, canonical origin, server ID and unused output path.\n');
  process.exitCode=1;
 }
}
