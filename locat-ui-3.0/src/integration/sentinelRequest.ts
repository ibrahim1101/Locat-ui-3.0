export async function sentinelRequest(path:string,input?:unknown,signal?:AbortSignal,accountId?:string){
 if(signal?.aborted)throw new DOMException('Sentinel request cancelled','AbortError');
 const control=new AbortController(),cancel=()=>control.abort();let timedOut=false;
 signal?.addEventListener('abort',cancel,{once:true});
 const timer=setTimeout(()=>{timedOut=true;control.abort();},15000);
 try{
  const response=await fetch(path,{credentials:'same-origin',cache:'no-store',signal:control.signal,headers:{...(input===undefined?{}:{'Content-Type':'application/json'}),...(accountId?{'X-Locat-Account':accountId}:{})},...(input===undefined?{}:{method:'POST',body:JSON.stringify(input)})});
  const data=await response.json();if(!response.ok)throw new Error(data.error??'Sentinel request failed');return data;
 }catch(error){if(timedOut)throw new Error(input===undefined?'Sentinel request timed out. Retry when the server is reachable.':'Sentinel request timed out. The action may have completed; refresh before retrying.');throw error;}
 finally{clearTimeout(timer);signal?.removeEventListener('abort',cancel);}
}
