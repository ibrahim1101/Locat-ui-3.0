import {randomBytes} from 'node:crypto';
import {managedMatrixNamespace} from '../shared/matrixIdentity.mjs';
/** Server/operator tooling only. The returned object contains service secrets and must never reach a browser. */
export function createMatrixAppserviceRegistration(serverId,serverName){
 const namespace=managedMatrixNamespace(serverId,serverName);
 return {id:'locat-'+serverId,url:null,as_token:randomBytes(48).toString('base64url'),hs_token:randomBytes(48).toString('base64url'),sender_localpart:'_locat_'+serverId.replaceAll('-','')+'_service',rate_limited:true,receive_ephemeral:false,namespaces:{users:[{exclusive:true,regex:namespace}],aliases:[],rooms:[]}};
}

/** Validate an operator registration before any future provisioning request. Never widen the generated namespace. */
export function validateMatrixAppserviceRegistration(value,serverId,serverName){
 const namespace=managedMatrixNamespace(serverId,serverName);
 const invalid=()=>{throw new Error('Matrix application-service registration does not match this Locat instance');};
 if(!value||typeof value!=='object'||Array.isArray(value))invalid();
 const expectedSender='_locat_'+serverId.replaceAll('-','')+'_service';
 if(value.id!=='locat-'+serverId||value.url!==null||value.sender_localpart!==expectedSender||value.rate_limited!==true||value.receive_ephemeral!==false)invalid();
 for(const key of ['as_token','hs_token'])if(typeof value[key]!=='string'||!/^[A-Za-z0-9_-]{64,256}$/.test(value[key]))invalid();
 if(value.as_token===value.hs_token)invalid();
 const scopes=value.namespaces;
 if(!scopes||typeof scopes!=='object'||Array.isArray(scopes)||Object.keys(scopes).some(key=>!['users','aliases','rooms'].includes(key)))invalid();
 if(!Array.isArray(scopes.users)||scopes.users.length!==1||!Array.isArray(scopes.aliases)||scopes.aliases.length||!Array.isArray(scopes.rooms)||scopes.rooms.length)invalid();
 const user=scopes.users[0];if(!user||typeof user!=='object'||Object.keys(user).some(key=>!['exclusive','regex'].includes(key))||user.exclusive!==true||user.regex!==namespace)invalid();
 return {serviceToken:value.as_token};
}
