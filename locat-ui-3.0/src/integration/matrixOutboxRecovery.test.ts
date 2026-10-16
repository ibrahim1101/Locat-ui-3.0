import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import {IDBFactory} from 'fake-indexeddb';
import {MatrixEvent,type MatrixClient} from 'matrix-js-sdk';
import {createMatrixOutbox} from './matrixOutbox';
import {createMatrixConversationSession,type MatrixConversationSession,type ConversationSnapshot} from './matrixConversationSession';
vi.mock('./matrixTrackedPeer.mjs',()=>({trackAuthorizedMatrixPeer:vi.fn(async()=>{})}));
const peer={accountId:'b'.repeat(32),matrixUserId:'@bob:test',devices:[{deviceId:'BOB'}]},roomId='!room:test',transaction='locat_11111111-1111-4111-8111-111111111111',body=JSON.stringify({algorithm:'m.megolm.v1.aes-sha2',sender_key:'YWJj',ciphertext:'ZGVm',session_id:'Z2hp',device_id:'DEVICE'});
let session:MatrixConversationSession,verified:boolean,devices:typeof peer.devices,resend:ReturnType<typeof vi.fn>,snapshot:ConversationSnapshot,events:MatrixEvent[];
const outbox=()=>createMatrixOutbox('owned-account-device','DEVICE','YWJj');
beforeEach(async()=>{
 vi.stubGlobal('indexedDB',new IDBFactory());verified=true;devices=peer.devices;events=[];const pending=new Map<string,MatrixEvent>();
 const room={oldState:{paginationToken:null},getEventForTxnId:(txn:string)=>pending.get(txn),addPendingEvent:(event:MatrixEvent,txn:string)=>{pending.set(txn,event);events.push(event);},getLiveTimeline:()=>({getEvents:()=>events}),currentState:{getStateEvents:()=>({getContent:()=>({algorithm:'m.megolm.v1.aes-sha2'})})},getMembers:()=>['@alice:test',peer.matrixUserId].map(userId=>({userId,membership:'join'})),getMyMembership:()=> 'join',getMember:()=>({membership:'join'})};
 resend=vi.fn(async(event:MatrixEvent)=>{await outbox().beforeSend(roomId,event.getTxnId()!,JSON.stringify(event.getWireContent()));return {event_id:'$original'};});
 const client={getRoom:()=>room,getSyncState:()=> 'SYNCING',getUserId:()=> '@alice:test',getCrypto:()=>({getUserDeviceInfo:async()=>new Map([[peer.matrixUserId,new Map([['BOB',{}]])]]),getDeviceVerificationStatus:async()=>({isVerified:()=>verified}),isEncryptionEnabledInRoom:async()=>true}),joinRoom:async()=>{},resendEvent:resend};
 await outbox().prepare({peerId:peer.accountId,roomId,transaction,devices:'["BOB"]',createdAt:Date.now()});await outbox().beforeSend(roomId,transaction,body);
 session=createMatrixConversationSession(client as unknown as MatrixClient,async()=>({...peer,devices}),async()=>({roomId}),async()=>{},outbox());session.subscribe(value=>{snapshot=value;});
});
afterEach(async()=>{await session.close();vi.unstubAllGlobals();vi.restoreAllMocks();});
it('restores only encrypted wire content and retries the original transaction after opening',async()=>{
 await session.open(peer.accountId);expect(snapshot.pendingSend?.transaction).toBe(transaction);await expect(session.send('new draft')).rejects.toThrow('pending encrypted');await expect(session.recoverPending()).resolves.toEqual({eventId:'$original'});const event=resend.mock.calls[0][0] as MatrixEvent;expect(event.getWireType()).toBe('m.room.encrypted');expect(JSON.stringify(event.getWireContent())).toBe(body);expect(event.getTxnId()).toBe(transaction);expect(snapshot.pendingSend).toBeUndefined();expect(await outbox().load()).toBeUndefined();
});
it('refuses replay after device changes, verification loss or expiry and retains ciphertext',async()=>{
 await session.open(peer.accountId);verified=false;await expect(session.recoverPending()).rejects.toThrow('Verify every');verified=true;devices=[];await expect(session.recoverPending()).rejects.toThrow('authorization changed');devices=peer.devices;vi.spyOn(Date,'now').mockReturnValue(Date.now()+300001);await expect(session.recoverPending()).rejects.toThrow('expired');expect(resend).not.toHaveBeenCalled();expect((await outbox().load())?.body).toBe(body);
});
it('lets the owner explicitly forget a retry without sending or recalling anything',async()=>{
 await session.open(peer.accountId);await session.forgetPending();expect(await outbox().load()).toBeUndefined();expect(snapshot.pendingSend).toBeUndefined();expect(resend).not.toHaveBeenCalled();
});

function acknowledgedEvent(patch:Record<string,unknown>={}){return {getId:()=>'$already-accepted',getSender:()=> '@alice:test',getRoomId:()=>roomId,getWireType:()=> 'm.room.encrypted',getTxnId:()=>undefined,getUnsigned:()=>({transaction_id:transaction}),getWireContent:()=>JSON.parse(body),isBeingDecrypted:()=>false,shouldAttemptDecryption:()=>false,isDecryptionFailure:()=>false,getContent:()=>JSON.parse(body),getType:()=> 'm.room.encrypted',...patch} as unknown as MatrixEvent;}
it('reconciles an exact own acknowledged ciphertext/transaction without replay even after expiry or attempt exhaustion',async()=>{
 await outbox().beforeSend(roomId,transaction,body);await outbox().beforeSend(roomId,transaction,body);events.push(acknowledgedEvent());await session.open(peer.accountId);vi.spyOn(Date,'now').mockReturnValue(Date.now()+300001);await expect(session.recoverPending()).resolves.toEqual({eventId:'$already-accepted'});expect(resend).not.toHaveBeenCalled();expect(await outbox().load()).toBeUndefined();
});
it('does not reconcile foreign senders, wrong transactions, rooms or changed ciphertext',async()=>{
 for(const patch of [{getSender:()=> '@foreign:test'},{getUnsigned:()=>({transaction_id:'another'})},{getRoomId:()=> '!other:test'},{getWireContent:()=>({...JSON.parse(body),ciphertext:'Zm9yZWlnbg'})}])events.push(acknowledgedEvent(patch));await session.open(peer.accountId);vi.spyOn(Date,'now').mockReturnValue(Date.now()+300001);await expect(session.recoverPending()).rejects.toThrow('expired');expect(resend).not.toHaveBeenCalled();expect((await outbox().load())?.body).toBe(body);
});
