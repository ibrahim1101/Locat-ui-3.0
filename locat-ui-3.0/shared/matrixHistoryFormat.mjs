export const MAX_HISTORY_FILE=32*1024*1024,MAX_HISTORY_JSON=16*1024*1024,MAX_HISTORY_ENTRIES=10000;
const header='-----BEGIN MEGOLM SESSION DATA-----',footer='-----END MEGOLM SESSION DATA-----';
/** Resource/format preflight only. Authentication and decryption belong to Matrix's crypto library. */
export function inspectHistoryFile(input){
 if(typeof input!=='string'||input.length>MAX_HISTORY_FILE||new TextEncoder().encode(input).byteLength>MAX_HISTORY_FILE)throw new Error('History file exceeds the 32 MiB limit.');
 const text=input.trim();if(!text.startsWith(header+'\n')&&!text.startsWith(header+'\r\n')||!text.endsWith(footer))throw new Error('Choose a standard encrypted Matrix history-key file.');
 const base64=text.slice(header.length,-footer.length).replace(/[\r\n]/g,'');
 if(!/^[A-Za-z0-9+/]+={0,2}$/.test(base64)||base64.length%4===1)throw new Error('Invalid encrypted history file encoding.');
 let bytes;try{bytes=Uint8Array.from(atob(base64),c=>c.charCodeAt(0));}catch{throw new Error('Invalid encrypted history file encoding.');}
 if(bytes.length<70||bytes[0]!==1)throw new Error('Unsupported or incomplete encrypted history file.');
 // Matrix v1: version(1), salt(16), IV(16), derivation rounds(4, big endian).
 const rounds=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength).getUint32(33,false);
 if(rounds<10000||rounds>2000000)throw new Error('History file derivation cost is outside the supported 10,000–2,000,000 round range.');
 return {rounds};
}
export function inspectHistoryKeys(json){
 if(typeof json!=='string'||json.length>MAX_HISTORY_JSON||new TextEncoder().encode(json).byteLength>MAX_HISTORY_JSON)throw new Error('Decrypted history exceeds the 16 MiB limit.');
 let entries;try{entries=JSON.parse(json);}catch{throw new Error('Invalid decrypted history data.');}
 if(!Array.isArray(entries)||!entries.length||entries.length>MAX_HISTORY_ENTRIES)throw new Error('Import requires between 1 and 10,000 history-key entries.');
 for(const entry of entries){
  if(!entry||typeof entry!=='object'||Array.isArray(entry)||entry.algorithm!=='m.megolm.v1.aes-sha2'||typeof entry.room_id!=='string'||!entry.room_id.startsWith('!')||entry.room_id.length>1024||typeof entry.session_id!=='string'||entry.session_id.length>1024||!entry.session_id||typeof entry.sender_key!=='string'||entry.sender_key.length>1024||!entry.sender_key||typeof entry.session_key!=='string'||!entry.session_key||entry.session_key.length>8192)throw new Error('Unsupported or incomplete history-key entry.');
 }
 return {entries:entries.length};
}
