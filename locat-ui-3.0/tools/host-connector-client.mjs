// Synthetic acceptance client, also executed inside a Linux host-network container.
import assert from 'node:assert/strict';
import {request} from 'node:http';
import {randomBytes} from 'node:crypto';
const port=Number(process.argv.at(-1)),origin='https://connector.locat.invalid',host='connector.locat.invalid';
if(!Number.isInteger(port)||port<1024||port>65535)throw new Error('An isolated fixture port is required');
function http(path,{method='GET',body,cookie,requestHost=host,requestOrigin=origin}={}){
 return new Promise((resolve,reject)=>{
  const text=body===undefined?undefined:JSON.stringify(body);
  const req=request({hostname:'127.0.0.1',port,path,method,headers:{Host:requestHost,Origin:requestOrigin,...(cookie?{Cookie:cookie}:{}),...(text?{'Content-Type':'application/json','Content-Length':Buffer.byteLength(text)}:{})}},res=>{let bytes=0;res.on('data',chunk=>{bytes+=chunk.length;if(bytes>65536)req.destroy(new Error('Oversized fixture response'));});res.on('end',()=>resolve({status:res.statusCode,cookies:res.headers['set-cookie']??[]}));res.on('error',reject);});
  req.setTimeout(5000,()=>req.destroy(new Error('Fixture request timeout')));req.on('error',reject);req.end(text);
 });
}
function upgrade(cookie,requestOrigin=origin){
 return new Promise((resolve,reject)=>{
  const req=request({hostname:'127.0.0.1',port,path:'/api/connect/socket',headers:{Host:host,Origin:requestOrigin,Connection:'Upgrade',Upgrade:'websocket','Sec-WebSocket-Version':'13','Sec-WebSocket-Key':randomBytes(16).toString('base64'),...(cookie?{Cookie:cookie}:{})}});
  req.setTimeout(5000,()=>req.destroy(new Error('Fixture upgrade timeout')));req.on('error',reject);
  req.on('upgrade',(res,socket)=>{socket.destroy();resolve(res.statusCode);});req.on('response',res=>{res.resume();res.on('end',()=>resolve(res.statusCode));res.on('error',reject);});req.end();
 });
}
assert.equal((await http('/api/ready')).status,200);
assert.equal((await http('/api/ready',{requestHost:'wrong.locat.invalid'})).status,403);
const account={username:'connector_'+randomBytes(6).toString('hex'),password:randomBytes(24).toString('base64url'),displayName:'Synthetic connector'};
assert.equal((await http('/api/auth/register',{method:'POST',body:account})).status,201);
assert.equal((await http('/api/auth/login',{method:'POST',body:account,requestOrigin:'https://wrong.locat.invalid'})).status,403);
const login=await http('/api/auth/login',{method:'POST',body:account});assert.equal(login.status,200);
assert.ok(login.cookies.some(value=>/; Secure(?:;|$)/.test(value)&&/HttpOnly/.test(value)));
const cookie=login.cookies[0].split(';')[0];assert.equal((await http('/api/auth/me',{cookie})).status,200);
assert.equal(await upgrade(),401);assert.equal(await upgrade(cookie,'https://wrong.locat.invalid'),403);assert.equal(await upgrade(cookie),101);
assert.equal((await http('/api/auth/logout',{method:'POST',cookie,body:{}})).status,200);assert.equal(await upgrade(cookie),401);
console.log('Synthetic host connector: exact Host/Origin, Secure session, authenticated WebSocket and revocation passed.');
