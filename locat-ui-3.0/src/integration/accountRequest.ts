/** Account-owned calls: bounded decoding, caller cancellation and an expected-owner guard. */
export async function accountRequest(path:string,accountId:string,payload?:object,signal?:AbortSignal,method:'POST'|'PATCH'|'DELETE'='POST'){
 if(signal?.aborted)throw new DOMException('Account request cancelled','AbortError');
 const control=new AbortController(),cancel=()=>control.abort();let timedOut=false;
 signal?.addEventListener('abort',cancel,{once:true});const timer=setTimeout(()=>{timedOut=true;control.abort();},15000);
 try{const response=await fetch(path,{credentials:'same-origin',cache:'no-store',signal:control.signal,headers:{'X-Locat-Account':accountId,...(payload===undefined?{}:{'Content-Type':'application/json'})},...(payload===undefined?{}:{method,body:JSON.stringify(payload)})});const data=await response.json();if(!response.ok)throw new Error(data.error??'Account request failed');return data;}
 catch(error){if(timedOut)throw new Error(payload===undefined?'Account request timed out. Refresh when the server is reachable.':'Account request timed out. The change may have completed; refresh before trying again.',{cause:error});throw error;}
 finally{clearTimeout(timer);signal?.removeEventListener('abort',cancel);}
}
