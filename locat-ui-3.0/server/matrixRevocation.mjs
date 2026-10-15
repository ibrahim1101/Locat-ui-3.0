import {randomUUID} from 'node:crypto';
/** Durable deletion intent. Never stores a Matrix bearer or service credential. */
export function matrixRevocationStore(sql){
 return {
  enqueue(userId,deviceId,now=Date.now()){
   // Called inside the Link revocation transaction, before the local grant expires.
   sql.prepare(`INSERT INTO matrixRevocations(userId,linkDeviceId,matrixUserId,matrixDeviceId,status,attempts,nextAttemptAt,leaseUntil,createdAt,updatedAt)
    SELECT userId,linkDeviceId,matrixUserId,matrixDeviceId,'pending',0,?,0,?,? FROM matrixBindings WHERE userId=? AND linkDeviceId=?
    ON CONFLICT(userId,linkDeviceId) DO NOTHING`).run(now,now,now,userId,deviceId);
  },
  claim(now=Date.now()){
   sql.exec('BEGIN IMMEDIATE');try{
    const row=sql.prepare("SELECT * FROM matrixRevocations WHERE status='pending' AND nextAttemptAt<=? AND leaseUntil<=? ORDER BY nextAttemptAt,createdAt LIMIT 1").get(now,now);
    if(!row){sql.exec('COMMIT');return null;}const leaseToken=randomUUID();
    sql.prepare('UPDATE matrixRevocations SET leaseToken=?,leaseUntil=?,attempts=attempts+1,updatedAt=? WHERE userId=? AND linkDeviceId=?').run(leaseToken,now+30000,now,row.userId,row.linkDeviceId);
    sql.exec('COMMIT');return {...row,leaseToken,attempts:row.attempts+1};
   }catch(error){sql.exec('ROLLBACK');throw error;}
  },
  revoked(job){return !!sql.prepare(`SELECT 1 FROM linkDevices d JOIN matrixBindings b ON b.userId=d.userId AND b.linkDeviceId=d.id
   WHERE d.userId=? AND d.id=? AND d.revokedAt IS NOT NULL AND b.matrixUserId=? AND b.matrixDeviceId=?`).get(job.userId,job.linkDeviceId,job.matrixUserId,job.matrixDeviceId);},
  finish(job,status,now=Date.now()){
   if(!['confirmed','manual','pending'].includes(status))throw new Error('Invalid Matrix cleanup state');
   const retry=now+Math.min(3600000,5000*2**Math.min(10,job.attempts-1));
   sql.exec('BEGIN IMMEDIATE');try{
    const changed=sql.prepare('UPDATE matrixRevocations SET status=?,leaseUntil=0,leaseToken=NULL,nextAttemptAt=?,updatedAt=? WHERE userId=? AND linkDeviceId=? AND leaseToken=?').run(status,status==='pending'?retry:now,now,job.userId,job.linkDeviceId,job.leaseToken).changes===1;
    if(changed&&status!=='pending')sql.prepare('INSERT INTO audit(userId,event,severity,createdAt) VALUES (?,?,?,?)').run(job.userId,status==='confirmed'?'matrix.device.revoked.by_link':'matrix.device.manual_cleanup',status==='confirmed'?'info':'warn',now);
    sql.exec('COMMIT');return changed;
   }catch(error){sql.exec('ROLLBACK');throw error;}
  },
  status(userId,deviceId){const row=sql.prepare('SELECT status,attempts,nextAttemptAt,updatedAt FROM matrixRevocations WHERE userId=? AND linkDeviceId=?').get(userId,deviceId);return row?{...row}:null;},
 };
}
/** One request at a time per process; database leases also isolate overlapping processes. */
export function createMatrixRevocationWorker({store,revoke,now=Date.now}){
 let stopped=false,running=null,timer=null;
 function drain(){if(stopped)return Promise.resolve();if(running)return running;
  running=(async()=>{for(let count=0;count<4&&!stopped;count++){
   const job=store.claim(now());if(!job)return;
   try{if(!store.revoked(job))throw Object.assign(new Error('Revocation target changed'),{manual:true});await revoke(job,()=>{if(!store.revoked(job))throw Object.assign(new Error('Revocation target changed'),{manual:true});});store.finish(job,'confirmed',now());}
   catch(error){store.finish(job,error?.manual?'manual':'pending',now());}
  }})().finally(()=>{running=null;});return running;
 }
 return {drain,start(){if(stopped||timer)return;const tick=()=>{void drain().catch(()=>{console.error('Matrix cleanup queue could not be processed; durable jobs remain pending.');});};timer=setInterval(tick,5000);timer.unref();tick();},async stop(){stopped=true;if(timer)clearInterval(timer);await running;}};
}
