export type RealtimeState='connecting'|'connected'|'reconnecting'|'unavailable'|'session-expired';
/** Browser-managed same-origin cookie authentication. No token in URL or custom message payload. */
export function connectRealtime(report:(state:RealtimeState)=>void,expired:()=>void){
 if(typeof WebSocket==='undefined'){report('unavailable');return()=>{};}
 let stopped=false,socket:WebSocket|null=null,retry:ReturnType<typeof setTimeout>|undefined,deadline:ReturnType<typeof setTimeout>|undefined,pulse:ReturnType<typeof setInterval>|undefined,failures=0,pending:string|null=null,sequence=0;
 function clear(){clearTimeout(deadline);clearInterval(pulse);pending=null;}
 function open(){
  if(stopped)return;
  if(socket&&(socket.readyState===WebSocket.OPEN||socket.readyState===WebSocket.CONNECTING))return;
  clearTimeout(retry);report(failures?'reconnecting':'connecting');
  const url=new URL('/api/connect/socket',window.location.href);url.protocol=url.protocol==='https:'?'wss:':'ws:';
  let ws:WebSocket;try{ws=new WebSocket(url);}catch{report('unavailable');retry=setTimeout(open,30000);return;}socket=ws;
  deadline=setTimeout(()=>ws.close(),5000);
  ws.onmessage=event=>{
   if(stopped||socket!==ws)return;
   if(typeof event.data!=='string'||event.data.length>4096){ws.close(4002,'Invalid server frame');return;}
   let data;try{data=JSON.parse(event.data);}catch{ws.close(4002,'Invalid server frame');return;}
   if(data?.type==='ready'&&data.protocolVersion===1&&!pulse){
    clearTimeout(deadline);failures=0;report('connected');
    pulse=setInterval(()=>{if(pending||ws.bufferedAmount>8192){ws.close();return;}pending=String(++sequence);ws.send(JSON.stringify({type:'ping',id:pending}));deadline=setTimeout(()=>ws.close(),10000);},15000);
   }else if(data?.type==='pong'&&pending&&data.id===pending){pending=null;clearTimeout(deadline);}
   else{ws.close(4002,'Unsupported server frame');}
  };
  ws.onerror=()=>{ws.close();};
  ws.onclose=event=>{
   if(socket!==ws)return;socket=null;clear();if(stopped)return;
   if(event.code===4001){stopped=true;report('session-expired');expired();return;}
   failures=Math.min(failures+1,6);report('reconnecting');retry=setTimeout(open,Math.min(30000,1000*2**(failures-1))*(0.8+Math.random()*0.4));
  };
 }
 const online=()=>{if(!socket)open();};const offline=()=>socket?.close();
 window.addEventListener('online',online);window.addEventListener('offline',offline);open();
 return()=>{stopped=true;clearTimeout(retry);clear();window.removeEventListener('online',online);window.removeEventListener('offline',offline);const old=socket;socket=null;old?.close();};
}
