import {backup} from 'node:sqlite';
import {mkdirSync,chmodSync,lstatSync,mkdtempSync,linkSync,rmSync} from 'node:fs';
import {dirname,resolve,join} from 'node:path';

function requireUnusedDestination(target){
 for(const suffix of ['', '-wal','-shm','-journal']){
  try{lstatSync(target+suffix);}
  catch(error){if(error.code==='ENOENT')continue;throw error;}
  throw new Error('Backup destination or SQLite sidecar already exists');
 }
}

/** Publish a complete SQLite online snapshot without replacing a destination. */
export async function writeServerSnapshot(sql,destination,{validateSnapshot}={}){
 const target=resolve(destination);
 requireUnusedDestination(target);
 mkdirSync(dirname(target),{recursive:true,mode:0o700});
 const staging=mkdtempSync(join(dirname(target),'.locat-backup-'));
 try{
  const snapshot=join(staging,'snapshot.sqlite');
  await backup(sql,snapshot);
  chmodSync(snapshot,0o600);
  const validation=validateSnapshot?await validateSnapshot(snapshot):undefined;
  requireUnusedDestination(target);
  // link is exclusive, including when another process creates the target.
  try{linkSync(snapshot,target);}
  catch(error){if(error.code==='EEXIST')throw new Error('Backup destination already exists');throw error;}
  return {destination:target,validation};
 }finally{rmSync(staging,{recursive:true,force:true});}
}
