/** Original Locat private-store bounds, adapted without a schema-library dependency. */
export const PRIVATE_QUOTA=64*1024*1024, PRIVATE_MAX_OBJECTS=128, PRIVATE_FILE_LIMIT=2*1024*1024, PRIVATE_CIPHER_LIMIT=4*1024*1024, PRIVATE_KDF_ITERATIONS=600000;
const fail=()=>{throw Object.assign(new Error('Invalid encrypted private-store data'),{status:400});};
const object=(value,keys)=>{if(!value || typeof value!=='object' || Array.isArray(value) || Object.keys(value).some(key=>!keys.includes(key)))fail();};
const base64=(value,min,max)=>{
 if(typeof value!=='string' || value.length<min || value.length>max || value.length%4!==0)fail();
 if(!value.length)return;
 if(/[^A-Za-z0-9+/]/.test(value.slice(0,-4)) || !/^(?:[A-Za-z0-9+/]{4}|[A-Za-z0-9+/]{3}=|[A-Za-z0-9+/]{2}==)$/.test(value.slice(-4)))fail();
};
export const isPrivateId=value=>typeof value==='string' && /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(value);
export function validateEnvelope(value){object(value,['v','iv','data']);if(value.v!==1)fail();base64(value.iv,16,16);if(value.iv.includes("="))fail();base64(value.data,24,PRIVATE_CIPHER_LIMIT);return value;}
export function validateConfig(value){object(value,['v','storeId','salt','iterations','wrappedKey']);if(value.v!==1 || !isPrivateId(value.storeId) || value.iterations!==PRIVATE_KDF_ITERATIONS)fail();base64(value.salt,24,24);if(!value.salt.endsWith('=='))fail();validateEnvelope(value.wrappedKey);if(value.wrappedKey.data.length!==64 || value.wrappedKey.data.includes('='))fail();return value;}
/** Compare validated configurations independently of JSON property order. */
export function samePrivateConfig(a,b){
 validateConfig(a);validateConfig(b);
 return a.v===b.v&&a.storeId===b.storeId&&a.salt===b.salt&&a.iterations===b.iterations&&a.wrappedKey.v===b.wrappedKey.v&&a.wrappedKey.iv===b.wrappedKey.iv&&a.wrappedKey.data===b.wrappedKey.data;
}
export function validateEntry(value){
 const file=value?.kind==='file';object(value,file?['kind','name','folder','mime','bytes','data','createdAt']:['kind','name','folder','username','password','url','note','createdAt']);
 if(!['file','credential'].includes(value.kind) || !Number.isSafeInteger(value.createdAt) || value.createdAt<=0)fail();
 for(const [field,max] of Object.entries(file?{name:255,folder:200,mime:128}:{name:200,folder:200,username:500,password:4096,url:2048,note:16000}))if(typeof value[field]!=='string' || value[field].length>max)fail();
 if(!value.name.trim())fail();
 if(file){if(!Number.isSafeInteger(value.bytes) || value.bytes<0 || value.bytes>PRIVATE_FILE_LIMIT)fail();base64(value.data,0,4*Math.ceil(PRIVATE_FILE_LIMIT/3));}
 return value;
}
export function validateBackup(value,userId,module){
 object(value,['format','scope','config','objects']);object(value.scope,['userId','module']);
 if(value.format!=='locat-ui3-private-backup-v1'||value.scope.userId!==userId||value.scope.module!==module||!Array.isArray(value.objects)||value.objects.length>PRIVATE_MAX_OBJECTS)fail();
 validateConfig(value.config);let bytes=0;const ids=new Set();
 for(const row of value.objects){object(row,['id','revision','envelope']);if(!isPrivateId(row.id)||ids.has(row.id)||!Number.isSafeInteger(row.revision)||row.revision<1||row.revision>=1000000000)fail();ids.add(row.id);validateEnvelope(row.envelope);bytes+=JSON.stringify(row.envelope).length;}
 if(bytes>PRIVATE_QUOTA)fail();return value;
}
