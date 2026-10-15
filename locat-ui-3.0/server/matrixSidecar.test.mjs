import {test} from 'node:test';import assert from 'node:assert/strict';import {mkdtemp,readFile,stat,rm} from 'node:fs/promises';import {tmpdir} from 'node:os';import {join} from 'node:path';import {prepareMatrixSidecar} from '../tools/prepare-matrix-sidecar.mjs';
test('Matrix sidecar preparation closes registration/federation, isolates secrets and never overwrites existing configuration',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'locat-matrix-config-'));const target=join(dir,'private');try{
  await assert.rejects(prepareMatrixSidecar(target,'http://locat.test'),/HTTPS/);
  const result=await prepareMatrixSidecar(target,'https://locat.test');assert.equal(result.serverName,'locat.test');
  const raw=await readFile(join(target,'homeserver.json'),'utf8'),config=JSON.parse(raw),password=(await readFile(join(target,'postgres-password'),'utf8')).trim();assert.notEqual(config.database.args.password,password);const init=await readFile(join(target,'init.sql'),'utf8');assert.ok(init.includes('NOSUPERUSER NOCREATEDB NOCREATEROLE'));assert.ok(init.includes(config.database.args.password));assert.equal(config.enable_registration,false);assert.deepEqual(config.federation_domain_whitelist,[]);assert.deepEqual(config.listeners[0].resources[0].names,['client']);assert.ok(!JSON.stringify(result).includes(password));assert.equal(config.public_baseurl,'https://locat.test/');
  if(process.platform!=='win32'){assert.equal((await stat(target)).mode&0o777,0o700);assert.equal((await stat(join(target,'homeserver.json'))).mode&0o777,0o600);}
  await assert.rejects(prepareMatrixSidecar(target,'https://other.test'),{code:'EEXIST'});assert.equal(await readFile(join(target,'homeserver.json'),'utf8'),raw);
 }finally{await rm(dir,{recursive:true,force:true});}
});
