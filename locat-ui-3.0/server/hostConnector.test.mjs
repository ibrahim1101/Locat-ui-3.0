import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,stat,rm,writeFile,symlink} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {hostConnectorConfiguration,prepareHostConnector} from '../tools/prepare-host-connector.mjs';
const uuid='af719e87-188a-41b3-8a09-462ab627bd8c';
test('host connector routes only one exact origin to private Locat, with loopback metrics and catch-all denial',()=>{
 const config=hostConnectorConfiguration('https://chat.example.invalid',uuid,{port:18787,metricsPort:12000});
 assert.equal(config.metrics,'127.0.0.1:12000');assert.equal(config.ingress.length,2);
 assert.deepEqual(config.ingress[0],{hostname:'chat.example.invalid',service:'http://127.0.0.1:18787',originRequest:{httpHostHeader:'chat.example.invalid',connectTimeout:'10s'}});
 assert.deepEqual(config.ingress[1],{service:'http_status:404'});
 for(const origin of ['http://chat.example.invalid','https://user:pass@chat.example.invalid','https://chat.example.invalid/path','https://chat.example.invalid?x=y','https://chat.example.invalid#x','https://127.0.0.1','https://localhost','https://*.example.invalid','https://chat.example.invalid:8443'])assert.throws(()=>hostConnectorConfiguration(origin,uuid));
 assert.throws(()=>hostConnectorConfiguration('https://chat.example.invalid','not-a-tunnel'));
 for(const options of [{port:22},{metricsPort:0},{port:2000},{port:NaN}])assert.throws(()=>hostConnectorConfiguration('https://chat.example.invalid',uuid,options));
});
test('private preparation never replaces existing configuration and rejects source-tree/symlink destinations',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'locat-host-config-'));
 try{
  const target=join(dir,'prepared'),result=await prepareHostConnector(target,'https://chat.example.invalid',uuid);
  const before=await readFile(result.configFile,'utf8');assert.equal(JSON.parse(before).tunnel,uuid);
  if(process.platform!=='win32'){assert.equal((await stat(target)).mode&0o777,0o700);assert.equal((await stat(result.configFile)).mode&0o777,0o600);}
  await writeFile(join(target,'keep'),'operator data');await assert.rejects(prepareHostConnector(target,'https://chat.example.invalid',uuid));assert.equal(await readFile(result.configFile,'utf8'),before);assert.equal(await readFile(join(target,'keep'),'utf8'),'operator data');
  await assert.rejects(prepareHostConnector(fileURLToPath(new URL('../host-connector-private-test',import.meta.url)),'https://chat.example.invalid',uuid),/outside/);
  if(process.platform!=='win32'){await symlink(new URL('../',import.meta.url),join(dir,'source'));await assert.rejects(prepareHostConnector(join(dir,'source','private-test'),'https://chat.example.invalid',uuid),/outside/);}
 }finally{await rm(dir,{recursive:true,force:true});}
});
