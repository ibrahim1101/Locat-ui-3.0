export type PwaShareHandoff={title:string;text:string;url:string;review:string;createdAt:number};

export async function consumePwaShareHandoff(id:string):Promise<PwaShareHandoff|null>{
 if(!/^[a-f0-9-]{36}$/i.test(id)||!('serviceWorker'in navigator))return null;
 let timer=0;
 try{
  const registration=await Promise.race([navigator.serviceWorker.ready,new Promise<never>((_,reject)=>{timer=window.setTimeout(()=>reject(new Error('The locally shared text could not be opened.')),5000);})]),worker=navigator.serviceWorker.controller??registration.active;
  if(!worker)return null;
  return await new Promise((resolve,reject)=>{const channel=new MessageChannel();window.clearTimeout(timer);timer=window.setTimeout(()=>{channel.port1.close();reject(new Error('The locally shared text could not be opened.'));},5000);channel.port1.onmessage=event=>{window.clearTimeout(timer);channel.port1.close();resolve(event.data?.ok?event.data.record as PwaShareHandoff:null);};worker.postMessage({type:'locat-share-consume',id},[channel.port2]);});
 }finally{window.clearTimeout(timer);}
}
