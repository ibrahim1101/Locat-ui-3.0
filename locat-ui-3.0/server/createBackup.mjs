import {DatabaseSync} from 'node:sqlite';
import {lstat} from 'node:fs/promises';
import {resolve} from 'node:path';
import {writeServerSnapshot} from './backupSnapshot.mjs';
import {verifyServerBackup} from './verifyBackup.mjs';

/** Operator backup: no startup migrations or missing-source database creation. */
export async function createServerBackup(filename,destination){
 if(typeof filename!=='string'||!filename||typeof destination!=='string'||!destination)throw new Error('Select an existing source database and a new backup destination');
 let sql;
 try{
  const source=resolve(filename),info=await lstat(source);
  if(!info.isFile()||info.isSymbolicLink())throw new Error('Backup source must be a regular database file');
  sql=new DatabaseSync(source,{readOnly:true});
  sql.exec('PRAGMA query_only=ON;PRAGMA trusted_schema=OFF;');
  // Online backup includes committed WAL data. Validate the completed snapshot,
  // not the changing live source, and publish only after it passes.
  const result=await writeServerSnapshot(sql,destination,{validateSnapshot:verifyServerBackup});
  return {...result.validation,operation:'create-server-backup',destination:result.destination};
 }catch(error){if(error.code)throw new Error('Server backup could not be read or written');throw error;}
 finally{sql?.close();}
}
