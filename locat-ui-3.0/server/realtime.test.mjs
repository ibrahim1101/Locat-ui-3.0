import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {once} from 'node:events';
import WebSocket from 'ws';
import {attachRealtime} from './realtime.mjs';

test('real-time health enforces session/origin/path, bounds connections and messages, and revokes live sessions',async()=>{
 const server=createServer((_req,res)=>res.end());const sessions=new Map([['alice','a'],['bob','b']]);
 const origin='https://locat.test';const realtime=attachRealtime(server,{requestOrigin:req=>req.headers.host==='locat.test'?origin:null,sessionUser:req=>sessions.has(req.headers.cookie)?{id:sessions.get(req.headers.cookie)}:null,heartbeatMs:30,maxPerAccount:1});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const target='ws://127.0.0.1:'+server.address().port;const all=[];
 function connect(cookie='alice',extra={},path='/api/connect/socket') {const ws=new WebSocket(target+path,{headers:{Host:'locat.test',Origin:origin,Cookie:cookie,...extra}});all.push(ws);return ws;}
 async function denied(cookie,extra,path){const ws=connect(cookie,extra,path);ws.on('error',()=>{});return (await once(ws,'unexpected-response'))[1].statusCode;}
 try{
  assert.equal(await denied('missing'),401);assert.equal(await denied('alice',{Origin:'https://evil.test'}),403);assert.equal(await denied('alice',{Host:'evil.test'}),403);assert.equal(await denied('alice',{},'/api/connect/socket?token=x'),404);
  const alice=connect();const hello=JSON.parse((await once(alice,'message'))[0]);assert.equal(hello.type,'ready');assert.equal(hello.protocolVersion,1);
  assert.equal(await denied('alice'),429);
  const bob=connect('bob');await once(bob,'message');assert.equal(realtime.size(),2);
  const pong=once(alice,'message');alice.send(JSON.stringify({type:'ping',id:'check-1'}));assert.deepEqual(JSON.parse((await pong)[0]),{type:'pong',id:'check-1'});
  const bobClosed=once(bob,'close');bob.send(JSON.stringify({type:'message',plaintext:'synthetic-secret'}));assert.equal((await bobClosed)[0],4002);
  const revoked=once(alice,'close');sessions.delete('alice');assert.equal((await revoked)[0],4001);
  sessions.set('alice','a');const oversized=connect();await once(oversized,'message');oversized.on('error',()=>{});const largeClosed=once(oversized,'close');oversized.send('x'.repeat(1025));assert.equal((await largeClosed)[0],1009);
 }finally{for(const ws of all)ws.terminate();realtime.close();await new Promise(resolve=>server.close(resolve));}
});
