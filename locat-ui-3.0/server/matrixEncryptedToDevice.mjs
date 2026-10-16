const fail=(status,message)=>{throw Object.assign(new Error(message),{status});};
const object=value=>value&&typeof value==='object'&&!Array.isArray(value);
export function encryptedToDeviceRoute(path,method){return method==='PUT'&&/^\/_matrix\/client\/v3\/sendToDevice\/m\.room\.encrypted\/[A-Za-z0-9_][A-Za-z0-9_.-]{0,127}$/.test(path);}
/** Standard Olm envelopes only. No room keys or other plaintext content cross this endpoint. */
export function validateEncryptedToDevice(input,binding,resolveDevice){
 if(!object(input)||Object.keys(input).length!==1||!object(input.messages))fail(400,'Invalid encrypted device delivery');
 const targets=[];let total=0;
 for(const [userId,devices] of Object.entries(input.messages)){
  if(!/^@[^\s:]{1,255}:[^\s]{1,255}$/.test(userId)||!object(devices)||!Object.keys(devices).length)fail(400,'Invalid encrypted device recipient');
  for(const [deviceId,content] of Object.entries(devices)){
   if(++total>50)fail(400,'Encrypted device recipient limit exceeded');
   if(!deviceId||deviceId==='*'||deviceId.length>255)fail(400,'Choose an exact bound recipient device');
   const keys=resolveDevice(userId,deviceId);if(!keys)fail(403,'Encrypted delivery requires an active bound contact device');
   if(!object(content)||Object.keys(content).some(key=>!['algorithm','sender_key','ciphertext','org.matrix.msgid'].includes(key))||content.algorithm!=='m.olm.v1.curve25519-aes-sha2'||content.sender_key!==JSON.parse(binding.publicKeys).curve25519||!object(content.ciphertext))fail(400,'Invalid standard Olm device envelope');
   if(content['org.matrix.msgid']!==undefined&&(typeof content['org.matrix.msgid']!=='string'||!/^[A-Za-z0-9_-]{1,128}$/.test(content['org.matrix.msgid'])))fail(400,'Invalid encrypted device message identifier');
   const entries=Object.entries(content.ciphertext);if(entries.length!==1||entries[0][0]!==keys.curve25519)fail(400,'Encrypted device envelope does not match the recipient key');
   const envelope=entries[0][1];if(!object(envelope)||Object.keys(envelope).some(key=>!['type','body'].includes(key))||![0,1].includes(envelope.type)||typeof envelope.body!=='string'||!envelope.body||envelope.body.length>65536||!/^[A-Za-z0-9+/]+={0,2}$/.test(envelope.body))fail(400,'Invalid Olm ciphertext');
   targets.push({userId,deviceId,curve25519:keys.curve25519});
  }
 }
 if(!total)fail(400,'Choose an encrypted device recipient');return targets;
}
export function withheldToDeviceRoute(path,method){return method==='PUT'&&/^\/_matrix\/client\/v3\/sendToDevice\/m\.room_key\.withheld\/[A-Za-z0-9_][A-Za-z0-9_.-]{0,127}$/.test(path);}
export function validateWithheldToDevice(input,binding,resolveDevice,permitsRoom){
 if(!object(input)||Object.keys(input).length!==1||!object(input.messages))fail(400,'Invalid key-withheld notification');const targets=[];
 for(const [userId,devices] of Object.entries(input.messages)){
  if(!/^@[^\s:]{1,255}:[^\s]{1,255}$/.test(userId)||!object(devices))fail(400,'Invalid withheld recipient');
  for(const [deviceId,content] of Object.entries(devices)){
   if(targets.length>=50||!deviceId||deviceId==='*'||deviceId.length>255)fail(400,'Invalid withheld recipient limit');
   const keys=resolveDevice(userId,deviceId);if(!keys)fail(403,'Withheld notification requires an active bound contact device');
   if(!object(content)||Object.keys(content).some(key=>!['algorithm','sender_key','code','reason','room_id','session_id','from_device','org.matrix.msgid'].includes(key))||content.algorithm!=='m.megolm.v1.aes-sha2'||content.sender_key!==JSON.parse(binding.publicKeys).curve25519||!['m.blacklisted','m.unverified','m.unauthorised','m.unavailable','m.no_olm'].includes(content.code))fail(400,'Invalid standard withheld notification');
   if(content.from_device!==undefined&&content.from_device!==binding.matrixDeviceId)fail(400,'Withheld sender device mismatch');
   if(content['org.matrix.msgid']!==undefined&&(typeof content['org.matrix.msgid']!=='string'||!/^[A-Za-z0-9_-]{1,128}$/.test(content['org.matrix.msgid'])))fail(400,'Invalid withheld message identifier');
   if(content.room_id!==undefined&&!permitsRoom(content.room_id))fail(403,'Withheld room is unavailable');
   if(content.session_id!==undefined&&(typeof content.session_id!=='string'||!/^[A-Za-z0-9+/]{1,255}={0,2}$/.test(content.session_id))||content.code!=='m.no_olm'&&(typeof content.room_id!=='string'||typeof content.session_id!=='string'))fail(400,'Invalid withheld room/session');
   if(content.reason!==undefined&&(typeof content.reason!=='string'||content.reason.length>256))fail(400,'Invalid withheld reason');
   content.reason='Room key withheld: '+content.code;
   targets.push({userId,deviceId,curve25519:keys.curve25519});
  }
 }
 if(!targets.length)fail(400,'Choose a withheld recipient');return targets;
}
