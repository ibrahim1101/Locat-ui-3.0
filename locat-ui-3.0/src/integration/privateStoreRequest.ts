/** Bound the complete fetch/body operation and preserve caller cancellation. */
export async function privateStoreRequest(path:string,input?:unknown,signal?:AbortSignal,accountId?:string){
 if(signal?.aborted)throw new DOMException('Private-store request cancelled','AbortError');
 const controller=new AbortController();let timedOut=false;
 const cancel=()=>controller.abort();signal?.addEventListener('abort',cancel,{once:true});
 const deadline=setTimeout(()=>{timedOut=true;controller.abort();},15000);
 try{
  const response=await fetch(path,{credentials:'same-origin',cache:'no-store',signal:controller.signal,headers:{...(input===undefined?{}:{'Content-Type':'application/json'}),...(accountId?{'X-Locat-Account':accountId}:{})},...(input===undefined?{}:{method:'POST',body:JSON.stringify(input)})});
  const data=await response.json();
  if(!response.ok)throw new Error(data.error??'Private-store request failed');
  return data;
 }catch(error){
  if(timedOut)throw new Error(input===undefined?'Encrypted-store request timed out. Try again when the server is reachable.':'Encrypted-store request timed out. A change may have completed; lock and unlock to refresh before retrying.');
  throw error;
 }finally{clearTimeout(deadline);signal?.removeEventListener('abort',cancel);}
}
