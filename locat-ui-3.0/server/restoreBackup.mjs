import {chmod,copyFile,constants,link,lstat,mkdtemp,open,rm} from 'node:fs/promises';
import {dirname,join,resolve} from 'node:path';
import {withVerifiedServerBackup} from './verifyBackup.mjs';

async function requireUnusedDestination(target){
 for(const suffix of ['', '-wal', '-shm', '-journal']){
  try{await lstat(target+suffix);}
  catch(error){if(error.code==='ENOENT')continue;throw error;}
  throw new Error('Restore destination or SQLite sidecar already exists; choose a new path');
 }
}

/** Restore only to an unused path; never activate a server or replace live data. */
export async function restoreServerBackup(filename,destination,{expectedSha256}={}){
 if(typeof destination!=='string'||!destination)throw new Error('Select a new restore destination');
 if(typeof expectedSha256!=='string'||!/^[a-fA-F0-9]{64}$/.test(expectedSha256))throw new Error('Restore requires an expected SHA-256 of exactly 64 hexadecimal characters');
 const target=resolve(destination);
 await requireUnusedDestination(target);
 // The verifier owns the stable snapshot. Never reread the caller's source path
 // after verification, where it could have been replaced or modified.
 return withVerifiedServerBackup(filename,{expectedSha256},async(report,snapshot)=>{
  let staging;
  try{
   staging=await mkdtemp(join(dirname(target),'.locat-restore-'));
   const restored=join(staging,'restored.sqlite');
   await copyFile(snapshot,restored,constants.COPYFILE_EXCL);
   await chmod(restored,0o600);
   const handle=await open(restored,constants.O_RDWR);
   try{await handle.sync();}finally{await handle.close();}
   await requireUnusedDestination(target);
   // Exclusive publication: a competing creator can never be overwritten.
   await link(restored,target);
   return {...report,operation:'restore-to-new-file',destination:target,activated:false};
  }catch(error){
   if(error.code==='EEXIST')throw new Error('Restore destination already exists; choose a new path');
   if(error.code)throw new Error('Restore could not be written; use a private existing directory on a filesystem with hard-link support');
   throw error;
  }finally{if(staging)await rm(staging,{recursive:true,force:true});}
 });
}
