export type ServerIdentityAttestation={kind:'locat.server.v1';version:1;serverId:string;origin:string;keyId:string;publicKey:string;signature:string};
export type IdentityKeyRotation={kind:'locat.rotation.v1';version:1;serverId:string;origin:string;fromKeyId:string;fromPublicKey:string;toKeyId:string;signature:string};
export type ServerDiscovery = {app:'Locat';protocolVersion:1;serverId:string;origin:string;identity?:(ServerIdentityAttestation&{rotation?:IdentityKeyRotation})|null;capabilities:{sameOriginApi:boolean;privateMessaging:boolean;federation:boolean;webSocket:boolean;authenticatedIdentity?:boolean}};
/** Validate navigation targets. App keys/data are origin-scoped; browser cookies are host-scoped. */
export function homeserverOrigin(input:string):string {
  let url:URL;try{url=new URL(input.trim());}catch{throw new Error('Enter a complete HTTPS server address.');}
  if(url.username||url.password||url.pathname!=='/'||url.search||url.hash)throw new Error('Use a server origin without credentials, paths or query parameters.');
  const loopback=['localhost','127.0.0.1','[::1]'].includes(url.hostname);
  if(url.protocol!=='https:'&&!(url.protocol==='http:'&&loopback))throw new Error('HTTPS is required except for loopback development.');
  return url.origin;
}
export async function discoverHomeserver(input:string,signal?:AbortSignal):Promise<ServerDiscovery>{
  const origin=homeserverOrigin(input);
  const response=await fetch(origin+'/.well-known/locat',{credentials:'omit',cache:'no-store',redirect:'error',signal:signal??AbortSignal.timeout(5000)});
  if(!response.ok)throw new Error('Server discovery failed. Check the address, certificate and connection.');
  if(Number(response.headers.get('content-length')??0)>8192)throw new Error('Invalid server discovery response.');
  // Bound streamed responses as well as advertised lengths, before parsing.
  const reader=response.body?.getReader();if(!reader)throw new Error('Empty discovery response.');
  let size=0;const chunks:Uint8Array[]=[];
  try{while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>8192)throw new Error('Invalid server discovery response.');chunks.push(value);}}finally{await reader.cancel();}
  const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}
  let data:ServerDiscovery;try{data=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));}catch{throw new Error('Invalid server discovery response.');}
  if(data?.app!=='Locat'||data.protocolVersion!==1||data.origin!==origin||!/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(data.serverId)||!data.capabilities||typeof data.capabilities.sameOriginApi!=='boolean'||!data.capabilities.sameOriginApi||[data.capabilities.privateMessaging,data.capabilities.federation,data.capabilities.webSocket].some(value=>typeof value!=='boolean'))throw new Error('This address does not offer a compatible Locat server.');
  return data;
}
