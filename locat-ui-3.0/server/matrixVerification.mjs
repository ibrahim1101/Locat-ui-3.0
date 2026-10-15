const fail=(status,message)=>{throw Object.assign(new Error(message),{status});};
const base64=value=>typeof value==='string'&&/^[A-Za-z0-9+/]{43}$/.test(value);
const list=(value,allowed)=>Array.isArray(value)&&value.length>0&&value.length<=allowed.length&&new Set(value).size===value.length&&value.every(item=>allowed.includes(item));
const fields={request:['from_device','methods','timestamp','transaction_id'],ready:['from_device','methods','transaction_id'],start:['from_device','method','key_agreement_protocols','hashes','message_authentication_codes','short_authentication_string','transaction_id'],accept:['method','key_agreement_protocol','hash','message_authentication_code','short_authentication_string','commitment','transaction_id'],key:['key','transaction_id'],mac:['keys','mac','transaction_id'],done:['transaction_id'],cancel:['code','reason','transaction_id']};
export function verificationRoute(path){const match=/^\/_matrix\/client\/v3\/sendToDevice\/m\.key\.verification\.(request|ready|start|accept|key|mac|done|cancel)\/([A-Za-z0-9._~=-]{1,128})$/.exec(path);return match?{event:match[1],requestId:match[2]}:null;}
/** Routing/resource validation only. Matrix SDK/Rust owns transaction state, MACs, SAS and trust. */
export function validateMatrixVerification(event,input,binding){
 if(!fields[event]||!input||typeof input!=='object'||Array.isArray(input)||Object.keys(input).some(key=>key!=='messages')||!input.messages||typeof input.messages!=='object'||Array.isArray(input.messages)||Object.keys(input.messages).length!==1)fail(400,'Verification requires one explicit recipient');
 const [userId]=Object.keys(input.messages),devices=input.messages[userId];
 if(!userId.startsWith('@')||userId.length>512||!devices||typeof devices!=='object'||Array.isArray(devices)||Object.keys(devices).length!==1)fail(400,'Verification requires one explicit device');
 const [deviceId]=Object.keys(devices),content=devices[deviceId];if(!deviceId||deviceId==='*'||deviceId.length>255||!content||typeof content!=='object'||Array.isArray(content)||Object.keys(content).some(key=>!fields[event].includes(key)))fail(400,'Invalid verification content');
 if(typeof content.transaction_id!=='string'||!/^[A-Za-z0-9._~+=/-]{1,255}$/.test(content.transaction_id))fail(400,'Invalid verification transaction');
 if(['request','ready','start'].includes(event)&&content.from_device!==binding.matrixDeviceId)fail(403,'Verification sender device does not match its binding');
 if(['request','ready'].includes(event)&&!list(content.methods,['m.sas.v1']))fail(400,'Only standard SAS verification is enabled');
 if(event==='request'&&(!Number.isSafeInteger(content.timestamp)||Math.abs(Date.now()-content.timestamp)>10*60*1000))fail(400,'Verification request timestamp is outside the allowed window');
 if(event==='start'&&(content.method!=='m.sas.v1'||!list(content.key_agreement_protocols,['curve25519-hkdf-sha256'])||!list(content.hashes,['sha256'])||(!list(content.message_authentication_codes,['hkdf-hmac-sha256','hkdf-hmac-sha256.v2','org.matrix.msc3783.hkdf-hmac-sha256'])||!content.message_authentication_codes.includes('hkdf-hmac-sha256.v2'))||!list(content.short_authentication_string,['decimal','emoji'])))fail(400,'Unsupported SAS negotiation');
 if(event==='accept'&&((content.method!==undefined&&content.method!=='m.sas.v1')||content.key_agreement_protocol!=='curve25519-hkdf-sha256'||content.hash!=='sha256'||content.message_authentication_code!=='hkdf-hmac-sha256.v2'||!list(content.short_authentication_string,['decimal','emoji'])||!base64(content.commitment)))fail(400,'Unsupported SAS acceptance');
 if(event==='key'&&!base64(content.key))fail(400,'Invalid SAS public key');
 if(event==='mac'&&(!base64(content.keys)||!content.mac||typeof content.mac!=='object'||Array.isArray(content.mac)||Object.keys(content.mac).length<1||Object.keys(content.mac).length>3||Object.entries(content.mac).some(([key,value])=>!key.startsWith('ed25519:')||key.length>263||!base64(value))))fail(400,'Invalid SAS authentication data');
 if(event==='cancel'&&(typeof content.code!=='string'||!/^m\.[a-z_]{1,64}$/.test(content.code)||typeof content.reason!=='string'||content.reason.length>256))fail(400,'Invalid verification cancellation');
 return {userId,deviceId};
}
