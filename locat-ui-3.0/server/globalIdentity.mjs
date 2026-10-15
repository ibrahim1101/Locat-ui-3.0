/** Address qualification only. Not federation or cryptographic identity verification. */
export function accountIdentity(user,origin,serverId){
 if(!origin)return null;
 const authority=new URL(origin).host;
 return {serverId,authority,address:`LC-${user.lcCode}@${authority}`,accountUri:`locat://${authority}/account/${user.id}`};
}
export function localDiscoveryQuery(input,origin){
 const query=input.trim().toLowerCase();
 if(query.length>350)throw Object.assign(new Error('Invalid identity'),{status:400});
 if(!query.includes('@'))return query;
 const parts=query.split('@');
 if(parts.length!==2||!parts[0]||!parts[1])throw Object.assign(new Error('Invalid qualified identity'),{status:400});
 if(!origin||parts[1]!==new URL(origin).host)throw Object.assign(new Error('Cross-server discovery is not enabled. Open the trusted homeserver to find its users.'),{status:501});
 return parts[0];
}
