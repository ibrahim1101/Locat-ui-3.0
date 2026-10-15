import {randomUUID} from 'node:crypto';
const fail=(status,message)=>{throw Object.assign(new Error(message),{status});};
/** Records managed-device intent before upstream issuance, without persisting tokens. */
export function managedMatrixDeviceStore(sql,revocations){
 const current=(userId,actor)=>sql.prepare('SELECT * FROM matrixManagedDevices WHERE userId=? AND linkDeviceId=?').get(userId,actor);
 return {current,
  begin(userId,actor,identity,now=Date.now()){
   sql.exec('BEGIN IMMEDIATE');try{
    const device=sql.prepare('SELECT revokedAt FROM linkDevices WHERE userId=? AND id=?').get(userId,actor);if(!device||device.revokedAt!==null)fail(403,'Device identity is unavailable');
    const account=sql.prepare('SELECT matrixUserId FROM matrixAccounts WHERE userId=?').get(userId),binding=sql.prepare('SELECT matrixUserId,matrixDeviceId FROM matrixBindings WHERE userId=? AND linkDeviceId=?').get(userId,actor),previous=current(userId,actor);
    if(account&&account.matrixUserId!==identity.userId||binding&&(binding.matrixUserId!==identity.userId||binding.matrixDeviceId!==identity.deviceId)||previous&&(previous.matrixUserId!==identity.userId||previous.matrixDeviceId!==identity.deviceId))fail(409,'Managed device identity changed; explicit migration is required');
    if(previous?.operationUntil>now)fail(409,'A managed device operation is already running');
    const operationToken=randomUUID();
    sql.prepare('INSERT INTO matrixAccounts VALUES(?,?,?) ON CONFLICT(userId) DO NOTHING').run(userId,identity.userId,now);
    sql.prepare(`INSERT INTO matrixManagedDevices(userId,linkDeviceId,matrixUserId,matrixDeviceId,operationToken,operationUntil,createdAt,updatedAt) VALUES(?,?,?,?,?,?,?,?)
     ON CONFLICT(userId,linkDeviceId) DO UPDATE SET operationToken=excluded.operationToken,operationUntil=excluded.operationUntil,updatedAt=excluded.updatedAt`).run(userId,actor,identity.userId,identity.deviceId,operationToken,now+60000,now,now);
    sql.exec('COMMIT');return {userId,linkDeviceId:actor,operationToken};
   }catch(error){sql.exec('ROLLBACK');throw error;}
  },
  check(operation,now=Date.now()){
   const value=current(operation.userId,operation.linkDeviceId);if(!value||value.operationToken!==operation.operationToken||value.operationUntil<=now)fail(409,'Managed device operation expired or changed');
  },
  finish(operation,now=Date.now()){
   sql.exec('BEGIN IMMEDIATE');try{
    const changed=sql.prepare('UPDATE matrixManagedDevices SET operationToken=NULL,operationUntil=0,updatedAt=? WHERE userId=? AND linkDeviceId=? AND operationToken=?').run(now,operation.userId,operation.linkDeviceId,operation.operationToken).changes===1;
    const revoked=sql.prepare('SELECT 1 FROM linkDevices WHERE userId=? AND id=? AND revokedAt IS NOT NULL').get(operation.userId,operation.linkDeviceId);
    // A late upstream response can follow an expired operation lease and prior deletion.
    // Re-arm cleanup after that operation settles; invalidate any stale worker completion.
    if(changed&&revoked){const value=current(operation.userId,operation.linkDeviceId);revocations.enqueue(operation.userId,operation.linkDeviceId,now);sql.prepare("UPDATE matrixRevocations SET status='pending',nextAttemptAt=?,leaseUntil=0,leaseToken=NULL,updatedAt=? WHERE userId=? AND linkDeviceId=? AND matrixUserId=? AND matrixDeviceId=?").run(now,now,operation.userId,operation.linkDeviceId,value.matrixUserId,value.matrixDeviceId);}
    sql.exec('COMMIT');return changed;
   }catch(error){sql.exec('ROLLBACK');throw error;}
  },
  status(userId,actor,now=Date.now()){const value=current(userId,actor);return value?{matrixUserId:value.matrixUserId,deviceId:value.matrixDeviceId,operationActive:value.operationUntil>now}:null;},
 };
}
