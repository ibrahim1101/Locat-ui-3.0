/** Offline ingress validation and isolated Docker host-loopback acceptance. Never runs a tunnel. */
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,readFile,writeFile,chmod,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFile,spawn} from 'node:child_process';
import {promisify} from 'node:util';
import {once} from 'node:events';
import {createServer} from 'node:net';
import {request} from 'node:http';
import {prepareHostConnector} from './prepare-host-connector.mjs';
const exec=promisify(execFile),cwd=fileURLToPath(new URL('../',import.meta.url)),root=resolve(cwd,'..'),image='cloudflare/cloudflared:2026.10.1';
const localOnly=process.argv[2]==='--local-only';
if(process.argv.length>(localOnly?3:2))throw new Error('Usage: node tools/host-connector-acceptance.mjs [--local-only]');
if(process.platform!=='linux')throw new Error('Host connector Docker acceptance requires Linux Docker Engine');
const dir=await mkdtemp(join(tmpdir(),'locat-host-acceptance-'));let child;
try{
 const reservation=createServer();await new Promise(resolve=>reservation.listen(0,'127.0.0.1',resolve));const port=reservation.address().port;await new Promise(resolve=>reservation.close(resolve));
 const prepared=await prepareHostConnector(join(dir,'prepared'),'https://connector.locat.invalid','af719e87-188a-41b3-8a09-462ab627bd8c',{port});
 // Synthetic, unprivileged container reads only this non-secret configuration, never real credentials.
 await chmod(prepared.directory,0o755);await chmod(prepared.configFile,0o444);
 const credentialFile=join(dir,'synthetic-credentials.json');await writeFile(credentialFile,'{}\n',{mode:0o600});
 const runtime=Object.fromEntries(['PATH','HOME','DOCKER_HOST','DOCKER_CONFIG','XDG_RUNTIME_DIR'].filter(name=>process.env[name]!==undefined).map(name=>[name,process.env[name]]));
 if(!localOnly){
 const rendered=JSON.parse((await exec('docker',['compose','-f',join(root,'compose.cloudflare-host.yml'),'--profile','prepared-host-connector','config','--format','json'],{env:{...runtime,CLOUDFLARED_IMAGE:image,LOCAT_HOST_CONNECTOR_CONFIG_FILE:prepared.configFile,LOCAT_TUNNEL_CREDENTIALS_FILE:credentialFile}})).stdout);
 assert.deepEqual(Object.keys(rendered.services),['cloudflared']);const connector=rendered.services.cloudflared;
 assert.equal(connector.network_mode,'host');assert.ok(!connector.ports?.length);assert.equal(connector.read_only,true);assert.ok(connector.cap_drop.includes('ALL'));assert.ok(connector.security_opt.includes('no-new-privileges:true'));
 assert.equal(connector.volumes.length,1);assert.equal(connector.volumes[0].read_only,true);// Compose canonical JSON omits false-valued bind options. Explicit true must never pass.
 assert.equal(connector.volumes[0].bind.create_host_path??false,false);
 const offline=['run','--rm','--network','none','--read-only','--cap-drop','ALL','--security-opt','no-new-privileges:true','--mount',`type=bind,src=${prepared.configFile},dst=/etc/cloudflared/config.yml,readonly`,image,'tunnel','--config','/etc/cloudflared/config.yml','ingress'];
 await exec('docker',[...offline,'validate'],{timeout:120000});
 const match=(await exec('docker',[...offline,'rule','https://connector.locat.invalid/cinema'],{timeout:30000})).stdout;
 const denial=(await exec('docker',[...offline,'rule','https://unrelated.locat.invalid/'],{timeout:30000})).stdout;
 assert.match(match,/127\.0\.0\.1:/);assert.match(denial,/http_status:404/);
 }
 const web=join(dir,'web');await mkdir(web);await writeFile(join(web,'index.html'),'<title>Synthetic connector fixture</title>');
 child=spawn(process.execPath,['server/index.mjs'],{cwd,env:{PATH:process.env.PATH,LOCAT_HOST:'127.0.0.1',LOCAT_PORT:String(port),LOCAT_PUBLIC_ORIGIN:'https://connector.locat.invalid',LOCAT_TLS_TERMINATION:'proxy',LOCAT_PROXY_PEERS:'127.0.0.1',LOCAT_DATABASE_FILE:join(dir,'fixture.sqlite'),LOCAT_STATIC_DIR:web,LOCAT_MEDIA_AUTHORIZED_ROOTS:''},stdio:'ignore'});
 const ready=()=>new Promise(resolve=>{const req=request({hostname:'127.0.0.1',port,path:'/api/ready',headers:{Host:'connector.locat.invalid'}},res=>{res.resume();resolve(res.statusCode===200);});req.on('error',()=>resolve(false));req.setTimeout(1000,()=>req.destroy());req.end();});
 const deadline=Date.now()+20000;while(!await ready()){if(child.exitCode!==null||Date.now()>deadline)throw new Error('Isolated proxy gateway did not start');await new Promise(resolve=>setTimeout(resolve,100));}
 console.log((await exec(process.execPath,[fileURLToPath(new URL('./host-connector-client.mjs',import.meta.url)),String(port)],{cwd,timeout:30000})).stdout.trim());
 if(!localOnly){
 const client=await readFile(new URL('./host-connector-client.mjs',import.meta.url),'utf8');
 const result=await exec('docker',['run','--rm','--network','host','--read-only','--cap-drop','ALL','--security-opt','no-new-privileges:true','--user','65532:65532','node:24-bookworm-slim','node','--input-type=module','-e',client,String(port)],{timeout:120000});
 console.log(result.stdout.trim());console.log('Offline cloudflared ingress and Compose policy passed. No tunnel, DNS or public exposure activated.');
 }else console.log('Local proxy boundary passed. Docker host networking and cloudflared ingress were NOT tested in this local-only run.');
}finally{
 if(child?.pid&&child.exitCode===null){const exited=once(child,'exit');child.kill();const timer=setTimeout(()=>child.kill('SIGKILL'),3000);try{await exited;}finally{clearTimeout(timer);}}
 await rm(dir,{recursive:true,force:true});
}
