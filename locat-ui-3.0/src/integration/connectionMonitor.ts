export type ConnectionHealth = 'connected'|'unreachable';
/** One bounded readiness request at a time; network events bypass retry delay. No credentials or identity mutation. */
export function monitorConnection(report:(state:ConnectionHealth)=>void){
 let stopped=false,failures=0,timer:ReturnType<typeof setTimeout>|undefined,request:AbortController|null=null,again=false;
 async function probe(){
  if(stopped)return;
  if(request){again=true;return;}
  clearTimeout(timer);
  if(navigator.onLine===false){report('unreachable');return;}
  const controller=new AbortController();request=controller;const deadline=setTimeout(()=>controller.abort(),5000);
  let reachable:boolean;
  try{const response=await fetch('/api/ready',{cache:'no-store',credentials:'omit',signal:controller.signal});reachable=response.ok&&(await response.json()).app==='Locat';}catch{reachable=false;}finally{clearTimeout(deadline);request=null;}
  if(stopped)return;
  report(reachable?'connected':'unreachable');failures=reachable?0:Math.min(failures+1,6);
  const delay=reachable?15000:Math.min(30000,1000*2**(failures-1))*(0.8+Math.random()*0.4);
  timer=setTimeout(()=>void probe(),again?0:delay);again=false;
 }
 const online=()=>void probe();
 const offline=()=>{clearTimeout(timer);request?.abort();if(!stopped)report('unreachable');};
 const visible=()=>{if(document.visibilityState==='visible')void probe();};
 window.addEventListener('online',online);window.addEventListener('offline',offline);document.addEventListener('visibilitychange',visible);void probe();
 return()=>{stopped=true;clearTimeout(timer);request?.abort();window.removeEventListener('online',online);window.removeEventListener('offline',offline);document.removeEventListener('visibilitychange',visible);};
}
