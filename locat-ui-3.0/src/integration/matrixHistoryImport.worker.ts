import {initAsync,OlmMachine} from '@matrix-org/matrix-sdk-crypto-wasm';
import {inspectHistoryFile,inspectHistoryKeys} from '../../shared/matrixHistoryFormat.mjs';
self.onmessage=async(event:MessageEvent<{encrypted:string;passphrase:string}>)=>{
 try{const {encrypted,passphrase}=event.data;inspectHistoryFile(encrypted);if(typeof passphrase!=='string'||!passphrase||passphrase.length>1024)throw new Error('Invalid passphrase');await initAsync();const json=OlmMachine.decryptExportedRoomKeys(encrypted,passphrase);const {entries}=inspectHistoryKeys(json);self.postMessage({json,entries});}
 catch{self.postMessage({error:'The history file could not be decrypted or validated. Check the passphrase and file.'});}
};
