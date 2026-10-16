export class LinkResponseError extends Error { constructor(readonly status:number,message:string){super(message);this.name="LinkResponseError";} }
/** Deadline includes body decoding; cancellation never retries a mutation. */
export async function linkRequest(path:string,input?:unknown,proof?:string,signal?:AbortSignal,accountId?:string){
 if(signal?.aborted)throw new DOMException('Link request cancelled','AbortError');
 const controller=new AbortController();let timedOut=false;
 const cancel=()=>controller.abort();signal?.addEventListener('abort',cancel,{once:true});
 const timer=setTimeout(()=>{timedOut=true;controller.abort();},15000);
 try{
  const response=await fetch('/api/link/'+path,{signal:controller.signal,credentials:'same-origin',cache:'no-store',headers:{...(input===undefined?{}:{'Content-Type':'application/json'}),...(proof?{'X-Locat-Device-Proof':proof}:{}),...(accountId?{'X-Locat-Account':accountId}:{})},...(input===undefined?{}:{method:'POST',body:JSON.stringify(input)})});
  const data=await response.json();if(!response.ok)throw new LinkResponseError(response.status,data.error??'Device operation failed');return data;
 }catch(error){if(timedOut)throw new Error(input===undefined?'Link request timed out. Refresh when the server is reachable.':'Link request timed out. The action may have completed; refresh before trying again.');throw error;}
 finally{clearTimeout(timer);signal?.removeEventListener('abort',cancel);}
}
