import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,writeFile,chmod,symlink,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';import {join} from 'node:path';
import {createMatrixAppserviceRegistration} from './matrixAppserviceConfig.mjs';
import {loadMatrixAppserviceFile} from './matrixAppserviceFile.mjs';
test('private application-service loader bounds input and rejects exposed, foreign and symbolic files',async()=>{
 const root=await mkdtemp(join(tmpdir(),'locat-as-')),path=join(root,'registration.json'),server='e4aca6da-f98e-40cc-890e-cc577dc6c0bc',name='matrix.test';
 const registration=createMatrixAppserviceRegistration(server,name);
 try{
  await writeFile(path,JSON.stringify(registration),{mode:0o600});
  assert.deepEqual(await loadMatrixAppserviceFile(path,server,name),{serviceToken:registration.as_token});
  await assert.rejects(loadMatrixAppserviceFile(path,server,'foreign.test'),/Cannot load/);
  if(process.platform!=='win32'){
   await chmod(path,0o644);await assert.rejects(loadMatrixAppserviceFile(path,server,name),/Cannot load/);await chmod(path,0o600);
   const alias=join(root,'alias');await symlink(path,alias);await assert.rejects(loadMatrixAppserviceFile(alias,server,name),/Cannot load/);
  }
  await writeFile(path,'x'.repeat(16385));await assert.rejects(loadMatrixAppserviceFile(path,server,name),/Cannot load/);
  await writeFile(path,'{invalid');await assert.rejects(loadMatrixAppserviceFile(path,server,name),/Cannot load/);
  await assert.rejects(loadMatrixAppserviceFile(root,server,name),/Cannot load/);
 }finally{await rm(root,{recursive:true,force:true});}
});
