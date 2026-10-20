/** One uncertain transaction per exclusively owned account/device store. Never stores SDK events or drafts. */
export type PendingMatrixSend={peerId:string;roomId:string;transaction:string;devices:string;createdAt:number;attempts:number;body?:string;kind?:'attachment'|'reaction'};
export type MatrixOutbox=ReturnType<typeof createMatrixOutbox>;
export function createMatrixOutbox(scope:string,deviceId:string,senderKey:string){
 const name='locat-ui3-matrix-outbox:'+scope;
 function validate(row:PendingMatrixSend){
  if(!row||Object.keys(row).some(key=>!['peerId','roomId','transaction','devices','createdAt','attempts','body','kind'].includes(key))||(row.kind!==undefined&&!['attachment','reaction'].includes(row.kind))||(row.kind==='attachment'&&row.body!==undefined)||!/^[a-f0-9]{32}$/.test(row.peerId)||!/^![^\s/]{1,510}$/.test(row.roomId)||!/^locat_[a-f0-9-]{36}$/.test(row.transaction)||typeof row.devices!=='string'||row.devices.length>16384||!Number.isSafeInteger(row.createdAt)||row.createdAt<=0||!Number.isInteger(row.attempts)||row.attempts<0||row.attempts>3)throw new Error('Invalid encrypted retry record.');
  const devices:unknown=JSON.parse(row.devices);if(!Array.isArray(devices)||!devices.length||devices.length>100||devices.some(id=>typeof id!=='string'||!id||id.length>255))throw new Error('Invalid encrypted retry device scope.');
  if(row.body!==undefined)validateBody(row.body);
  return row;
 }
 function validateBody(body:string){
  if(typeof body!=='string'||body.length>70000)throw new Error('Invalid encrypted retry payload.');const value=JSON.parse(body);
  if(!value||Array.isArray(value))throw new Error('Only this device’s Megolm ciphertext can be stored for retry.');
  if(Object.keys(value).some(key=>!['algorithm','sender_key','ciphertext','session_id','device_id'].includes(key)))throw new Error('Encrypted retry payload contains unsupported clear fields.');
  if(value.algorithm!=='m.megolm.v1.aes-sha2')throw new Error('Encrypted retry payload has an unsupported algorithm.');
  if(value.device_id!==deviceId)throw new Error('Encrypted retry payload belongs to a different device.');
  if(value.sender_key!==senderKey)throw new Error('Encrypted retry payload belongs to a different sender key.');
  for(const key of ['sender_key','session_id','ciphertext'])if(typeof value[key]!=='string'||!value[key]||value[key].length>(key==='ciphertext'?65536:255)||!/^[A-Za-z0-9+/]+={0,2}$/.test(value[key]))throw new Error('Invalid encrypted retry encoding for '+key+'.');
 }
 async function access<T>(write:boolean,operation:(current:PendingMatrixSend|undefined,store:IDBObjectStore)=>T):Promise<T>{
  const db=await new Promise<IDBDatabase>((resolve,reject)=>{const request=indexedDB.open(name,2);request.onupgradeneeded=()=>{if(!request.result.objectStoreNames.contains('pending'))request.result.createObjectStore('pending');};request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);request.onblocked=()=>reject(new Error('Close other Locat tabs before opening encrypted retry storage.'));});
  try{return await new Promise<T>((resolve,reject)=>{const tx=db.transaction('pending',write?'readwrite':'readonly',write?{durability:'strict'}:undefined),store=tx.objectStore('pending'),request=store.get('current');let result:T,reason:unknown;request.onsuccess=()=>{try{result=operation(request.result===undefined?undefined:validate(request.result),store);}catch(error){reason=error;tx.abort();}};tx.oncomplete=()=>resolve(result);tx.onabort=()=>reject(reason??tx.error??new Error('Encrypted retry storage failed.'));tx.onerror=()=>reject(reason??tx.error);});}finally{db.close();}
 }
 function current(row:PendingMatrixSend|undefined,transaction:string){if(!row||row.transaction!==transaction)throw new Error('Encrypted retry transaction changed.');return row;}
 function replayable(row:PendingMatrixSend){if(Date.now()<row.createdAt||Date.now()-row.createdAt>300000||row.attempts>=3)throw new Error('Encrypted retry expired or reached its three-attempt limit. Inspect history before forgetting it.');}
 return {
  load:()=>access(false,row=>row),
  prepare:(value:Omit<PendingMatrixSend,'attempts'|'body'>)=>access(true,(row,store)=>{if(row)throw new Error('An uncertain encrypted send is pending. Review its original conversation first.');const fresh=validate({...value,attempts:0});store.put(fresh,'current');}),
  beforeSend:(roomId:string,transaction:string,body:string)=>access(true,(row,store)=>{const pending=current(row,transaction);if(pending.roomId!==roomId)throw new Error('Encrypted retry room changed.');replayable(pending);validateBody(body);if(pending.body!==undefined&&pending.body!==body)throw new Error('Encrypted retry ciphertext changed.');store.put(pending.kind==='attachment'?{...pending,attempts:pending.attempts+1}:{...pending,body,attempts:pending.attempts+1},'current');}),
  complete:(transaction:string)=>access(true,(row,store)=>{current(row,transaction);store.delete('current');}),
  check:replayable,
 };
}
