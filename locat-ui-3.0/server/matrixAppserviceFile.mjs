import {open,constants} from 'node:fs/promises';
import {validateMatrixAppserviceRegistration} from './matrixAppserviceConfig.mjs';
/** Server only: no environment-provided raw credential, symlink traversal or public file permissions. */
export async function loadMatrixAppserviceFile(path,serverId,serverName){
 if(typeof path!=='string'||!path)throw new Error('Configure a private Matrix application-service file');
 let handle;
 try{
  handle=await open(path,constants.O_RDONLY|constants.O_NOFOLLOW);
  const stat=await handle.stat();
  if(!stat.isFile()||stat.size>16384||stat.size<2||process.platform!=='win32'&&(stat.mode&0o077)!==0)throw new Error('Invalid private file');
  // Read a bounded amount even if the file grows after stat.
  const buffer=Buffer.alloc(16385);let length=0;
  while(length<buffer.length){const {bytesRead}=await handle.read(buffer,length,buffer.length-length,null);if(!bytesRead)break;length+=bytesRead;}
  if(length>16384)throw new Error('Invalid private file');
  const value=JSON.parse(new TextDecoder('utf8',{fatal:true}).decode(buffer.subarray(0,length)));
  return validateMatrixAppserviceRegistration(value,serverId,serverName);
 }catch{throw new Error('Cannot load a private Matrix application-service registration for this instance');}
 finally{await handle?.close();}
}
