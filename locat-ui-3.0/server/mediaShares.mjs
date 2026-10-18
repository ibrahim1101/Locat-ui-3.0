/** Durable owner decisions override configured friend seeds, including after restart. */
export function mediaShareStore(sql){
 const read=sql.prepare('SELECT allowed FROM mediaShareOverrides WHERE libraryId=? AND ownerId=? AND friendId=?');
 return {
  decision:(libraryId,ownerId,friendId)=>{const row=read.get(libraryId,ownerId,friendId);return row?!!row.allowed:undefined;},
  list:(libraryId,ownerId)=>sql.prepare('SELECT friendId,allowed FROM mediaShareOverrides WHERE libraryId=? AND ownerId=? ORDER BY friendId').all(libraryId,ownerId).map(row=>({...row,allowed:!!row.allowed})),
  set(libraryId,ownerId,friendId,allowed){
   sql.exec('BEGIN IMMEDIATE');try{
    const old=read.get(libraryId,ownerId,friendId);
    if(!old&&sql.prepare('SELECT count(*) AS n FROM mediaShareOverrides WHERE libraryId=? AND ownerId=?').get(libraryId,ownerId).n>=128)throw Object.assign(new Error('This library has reached its sharing decision limit; contact the operator'),{status:409});
    if(!old||!!old.allowed!==allowed){
     sql.prepare('INSERT INTO mediaShareOverrides VALUES (?,?,?,?,?) ON CONFLICT(libraryId,ownerId,friendId) DO UPDATE SET allowed=excluded.allowed,updatedAt=excluded.updatedAt').run(libraryId,ownerId,friendId,Number(allowed),Date.now());
     sql.prepare('INSERT INTO audit(userId,event,severity,createdAt) VALUES (?,?,?,?)').run(ownerId,allowed?'media.share.granted':'media.share.revoked',allowed?'info':'warn',Date.now());
    }
    sql.exec('COMMIT');
   }catch(error){sql.exec('ROLLBACK');throw error;}
  },
 };
}
