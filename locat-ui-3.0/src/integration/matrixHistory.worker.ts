import {initAsync,OlmMachine} from '@matrix-org/matrix-sdk-crypto-wasm';
// Dedicated, one-shot worker. Neither passphrase nor plaintext key export leaves this browser.
self.onmessage=async(event:MessageEvent<{roomKeys:string;passphrase:string}>)=>{
 try{
  const {roomKeys,passphrase}=event.data;
  if(typeof roomKeys!=='string'||roomKeys.length>16*1024*1024||new TextEncoder().encode(roomKeys).byteLength>16*1024*1024||typeof passphrase!=='string'||passphrase.length<12||passphrase.length>1024)throw new Error('Invalid history export');
  await initAsync();const encrypted=OlmMachine.encryptExportedRoomKeys(roomKeys,passphrase,500000);
  self.postMessage({encrypted});
 }catch{self.postMessage({error:'History keys could not be encrypted.'});}
};
