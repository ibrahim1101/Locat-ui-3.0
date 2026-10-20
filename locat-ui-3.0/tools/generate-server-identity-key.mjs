#!/usr/bin/env node
import { generateKeyPairSync } from 'node:crypto';
import { closeSync, fsyncSync, openSync, writeFileSync } from 'node:fs';
import { isAbsolute } from 'node:path';

const target=process.argv[2];
if(process.argv.length!==3||!isAbsolute(target??'')){
 process.stderr.write('Usage: node tools/generate-server-identity-key.mjs /absolute/path/to/locat-identity.pem\n');
 process.exitCode=2;
}else{
 let fd;
 try{
  const pair=generateKeyPairSync('ed25519');
  const pem=pair.privateKey.export({format:'pem',type:'pkcs8'});
  fd=openSync(target,'wx',0o600);
  writeFileSync(fd,pem,{encoding:'utf8'});
  fsyncSync(fd);closeSync(fd);fd=undefined;
  process.stdout.write('Created an Ed25519 Locat authority key. Keep this file owner-only and include it in a separately protected recovery plan.\n');
 }catch{
  if(fd!==undefined)try{closeSync(fd);}catch{}
  process.stderr.write('Could not create the identity key. Check the parent directory and choose a new, unused absolute path.\n');
  process.exitCode=1;
 }
}
