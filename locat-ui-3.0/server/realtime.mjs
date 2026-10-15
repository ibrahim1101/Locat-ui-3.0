import {WebSocketServer,WebSocket} from 'ws';
import {createRateLimiter} from './rateLimit.mjs';
/** Session health only. No chat/module payload routing and no device-proof substitute. */
export function attachRealtime(server,{requestOrigin,sessionUser,heartbeatMs=10000,maxClients=256,maxPerAccount=8}){
 const wss=new WebSocketServer({noServer:true,maxPayload:1024,perMessageDeflate:false});
 const clients=new Map(),attempts=createRateLimiter(60),counts=new Map();
 function reject(socket,status){socket.end(`HTTP/1.1 ${status}\r\nConnection: close\r\nContent-Length: 0\r\n\r\n`);}
 function valid(ws,state){
  const user=sessionUser(state.request);
  if(!user||user.id!==state.userId){ws.close(4001,'Session expired');return false;}return true;
 }
 function send(ws,value){if(ws.readyState!==WebSocket.OPEN)return;if(ws.bufferedAmount>8192){ws.terminate();return;}ws.send(JSON.stringify(value));}
 function upgrade(req,socket,head){
  socket.on('error',()=>{});
  try{
   const origin=requestOrigin(req);
   if(!origin||req.headers.origin!==origin)return reject(socket,'403 Forbidden');
   if(req.url!=='/api/connect/socket')return reject(socket,'404 Not Found');
   if(attempts(req.socket.remoteAddress??'unknown'))return reject(socket,'429 Too Many Requests');
   const user=sessionUser(req);if(!user)return reject(socket,'401 Unauthorized');
   if(clients.size>=maxClients||(counts.get(user.id)??0)>=maxPerAccount)return reject(socket,'429 Too Many Requests');
   wss.handleUpgrade(req,socket,head,ws=>{
    const state={request:req,userId:user.id,alive:true,messages:0,window:Date.now()};clients.set(ws,state);counts.set(user.id,(counts.get(user.id)??0)+1);
    ws.on('error',()=>{});
    ws.on('close',()=>{clients.delete(ws);const count=(counts.get(user.id)??1)-1;if(count>0)counts.set(user.id,count);else counts.delete(user.id);});
    ws.on('pong',()=>{state.alive=true;});
    ws.on('message',(bytes,binary)=>{
     if(!valid(ws,state))return;
     if(Date.now()-state.window>=1000){state.messages=0;state.window=Date.now();}
     if(++state.messages>5){ws.close(4008,'Rate limit');return;}
     let input;try{input=JSON.parse(bytes.toString('utf8'));}catch{ws.close(4002,'Invalid message');return;}
     if(binary||!input||typeof input!=='object'||Array.isArray(input)||Object.keys(input).some(key=>!['type','id'].includes(key))||input.type!=='ping'||typeof input.id!=='string'||!/^[a-zA-Z0-9-]{1,64}$/.test(input.id)){ws.close(4002,'Unsupported message');return;}
     send(ws,{type:'pong',id:input.id});
    });
    send(ws,{type:'ready',protocolVersion:1,heartbeatMs});
   });
  }catch{reject(socket,'500 Internal Server Error');}
 }
 const timer=setInterval(()=>{
  for(const [ws,state] of clients){if(ws.readyState!==WebSocket.OPEN){ws.terminate();continue;}if(!valid(ws,state))continue;if(!state.alive){ws.terminate();continue;}state.alive=false;ws.ping();}
 },heartbeatMs);timer.unref();server.on('upgrade',upgrade);
 return {close(){clearInterval(timer);server.off('upgrade',upgrade);for(const ws of clients.keys())ws.terminate();wss.close();},size:()=>clients.size};
}
