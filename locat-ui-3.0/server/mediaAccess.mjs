import {createHash} from 'node:crypto';
import {basename} from 'node:path';
import {resolve,delimiter} from 'node:path';
const accountId=/^[a-f0-9]{32}$/;
/** Operator policy only. No browser request can add a root or assign an owner. */
export function createMediaAccess(store,env=process.env){
 const roots=(env.LOCAT_MEDIA_AUTHORIZED_ROOTS??'').split(delimiter).filter(Boolean).map(root=>resolve(root));
 if(roots.length>16||new Set(roots).size!==roots.length)throw new Error('Media roots must be unique and bounded');
 const mode=env.LOCAT_MEDIA_ACCESS_MODE??'owned';
 if(!['owned','authenticated'].includes(mode))throw new Error('Invalid media access mode');
 const raw=env.LOCAT_MEDIA_LIBRARY_ACCESS??'[]';
 if(raw.length>65536)throw new Error('Media access policy exceeds its limit');
 let policies;try{policies=JSON.parse(raw);}catch{throw new Error('Invalid media access policy JSON');}
 if(!Array.isArray(policies)||policies.length>16)throw new Error('Invalid media access policy');
 if(mode==='authenticated'&&policies.length)throw new Error('Legacy media access cannot be combined with ownership policy');
 const owned=new Map();
 for(const policy of policies){
  if(!policy||typeof policy!=='object'||Array.isArray(policy)||Object.keys(policy).some(key=>!['root','ownerId','friendIds'].includes(key))||typeof policy.root!=='string'||!policy.root.trim()||policy.root.includes('\0')||!accountId.test(policy.ownerId??'')||!store.userById(policy.ownerId))throw new Error('Invalid media owner policy');
  const root=resolve(policy.root),friends=policy.friendIds??[];
  if(!roots.includes(root)||owned.has(root)||!Array.isArray(friends)||friends.length>64||friends.some(id=>typeof id!=='string'||!accountId.test(id)||id===policy.ownerId)||new Set(friends).size!==friends.length)throw new Error('Invalid media friend policy');
  owned.set(root,{id:createHash('sha256').update(JSON.stringify([root,policy.ownerId])).digest('hex'),ownerId:policy.ownerId,friends:new Set(friends)});
 }
 function effective(policy,friendId){return store.mediaShares?.decision(policy.id,policy.ownerId,friendId)??policy.friends.has(friendId);}
 function ownedPolicy(userId,id){const policy=[...owned.values()].find(policy=>policy.id===id&&policy.ownerId===userId);if(!policy)throw Object.assign(new Error('Library not found'),{status:404});return policy;}
 return {roots,mode,
  ownedLibraries(userId){return [...owned].filter(([,policy])=>policy.ownerId===userId).map(([root,policy])=>{const friends=new Map([...policy.friends].map(friendId=>[friendId,true]));for(const row of store.mediaShares?.list(policy.id,userId)??[])friends.set(row.friendId,row.allowed);return {id:policy.id,name:basename(root),friendIds:[...friends].filter(([,allowed])=>allowed).map(([id])=>id)};});},
  setShare(userId,id,friendId,allowed){const policy=ownedPolicy(userId,id);if(typeof friendId!=='string'||!accountId.test(friendId)||friendId===userId||typeof allowed!=='boolean'||!store.userById(friendId))throw Object.assign(new Error('Invalid sharing decision'),{status:400});if(allowed&&(!store.userById(friendId)||!store.acceptedContact(userId,friendId)||store.blocked(userId,friendId)))throw Object.assign(new Error('Sharing requires an accepted, unblocked contact'),{status:409});if(!store.mediaShares)throw new Error('Durable media sharing unavailable');store.mediaShares.set(policy.id,userId,friendId,allowed);},
  authorize(root,userId){
  if(!roots.includes(root)||typeof userId!=='string'||!store.userById(userId))return false;
  if(mode==='authenticated')return true; // Explicit compatibility opt-in; never the default.
  const policy=owned.get(root);if(!policy)return false;
  return userId===policy.ownerId||(effective(policy,userId)&&store.acceptedContact(policy.ownerId,userId)&&!store.blocked(policy.ownerId,userId));
 }};
}
