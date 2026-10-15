/** Deterministic protocol identifiers only. This is not cryptographic key verification or account provisioning. */
function instance(serverId){if(typeof serverId!=='string'||!/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(serverId))throw new Error('Invalid Locat instance identity');return serverId.replaceAll('-','');}
function authority(serverName){let url;try{url=new URL('https://'+serverName);}catch{throw new Error('Invalid Matrix authority');}if(typeof serverName!=='string'||url.host!==serverName||url.username||url.password||url.pathname!=='/'||url.search||url.hash)throw new Error('Invalid Matrix authority');return serverName;}
export function managedMatrixIdentity(serverId,accountId,linkDeviceId,serverName){
 if(typeof accountId!=='string'||!/^[a-f0-9]{32}$/.test(accountId)||!Number.isSafeInteger(linkDeviceId)||linkDeviceId<1)throw new Error('Invalid managed account/device identity');
 const localpart='_locat_'+instance(serverId)+'_'+accountId;return{localpart,userId:'@'+localpart+':'+authority(serverName),deviceId:'LOCAT_'+linkDeviceId};
}
export function managedMatrixNamespace(serverId,serverName){const escaped=authority(serverName).replace(/[.*+?^${}()|[\]\\]/g,'\\$&');return '^@_locat_'+instance(serverId)+'_[a-f0-9]{32}:'+escaped+'$';}
