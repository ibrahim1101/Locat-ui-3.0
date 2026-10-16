import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import type {MatrixClient} from 'matrix-js-sdk';
import {createMatrixConversationSession,type MatrixConversationSession} from './matrixConversationSession';
vi.mock('./matrixTrackedPeer.mjs',()=>({trackAuthorizedMatrixPeer:vi.fn(async()=>{})}));
const peer={accountId:'b'.repeat(32),matrixUserId:'@bob:test',devices:[{deviceId:'BOB'}]};
let session:MatrixConversationSession,verified:boolean,members:string[],events:unknown[],pendingEvents:unknown[],resend:ReturnType<typeof vi.fn>,resolve:ReturnType<typeof vi.fn<(accountId:string)=>Promise<typeof peer>>>,send:ReturnType<typeof vi.fn>,discard:ReturnType<typeof vi.fn>,scrollback:ReturnType<typeof vi.fn>,decrypt:ReturnType<typeof vi.fn>,pagination:{paginationToken:string|null};
beforeEach(()=>{verified=true;members=['@alice:test','@bob:test'];events=[];pendingEvents=[];resend=vi.fn(async()=>({event_id:'$retried'}));resolve=vi.fn(async()=>peer);send=vi.fn(async()=>({event_id:'$sent'}));discard=vi.fn(async()=>{});decrypt=vi.fn(async()=>{});pagination={paginationToken:'older'};scrollback=vi.fn(async()=>{pagination.paginationToken=null;});
 const room={oldState:pagination,getPendingEvents:()=>pendingEvents,getLiveTimeline:()=>({getEvents:()=>events}),currentState:{getStateEvents:()=>({getContent:()=>({algorithm:'m.megolm.v1.aes-sha2'})})},getMembers:()=>members.map(userId=>({userId,membership:'join'})),getMyMembership:()=> 'join',getMember:()=>({membership:'join'})};
 const crypto={getUserDeviceInfo:vi.fn(async()=>new Map([[peer.matrixUserId,new Map([['BOB',{}]])]])),getDeviceVerificationStatus:vi.fn(async()=>({isVerified:()=>verified})),isEncryptionEnabledInRoom:vi.fn(async()=>true),forceDiscardSession:discard};
 const client={getRoom:()=>room,getSyncState:()=> 'SYNCING',getUserId:()=> '@alice:test',getCrypto:()=>crypto,joinRoom:vi.fn(async()=>{}),sendTextMessage:send,resendEvent:resend,scrollback,decryptEventIfNeeded:decrypt};
 session=createMatrixConversationSession(client as unknown as MatrixClient,resolve,async()=>({roomId:'!room:test'}),async()=>{});
});
afterEach(async()=>{await session.close();});
it('rejects unverified devices and extra room members before any outbound session or send',async()=>{await session.open(peer.accountId);verified=false;await expect(session.send('secret')).rejects.toThrow('Verify every');expect(discard).not.toHaveBeenCalled();expect(send).not.toHaveBeenCalled();verified=true;members.push('@eve:test');await expect(session.send('secret')).rejects.toThrow('both contacts');expect(send).not.toHaveBeenCalled();});
it('rotates before sending and serializes duplicate composer submissions',async()=>{await session.open(peer.accountId);let finish:(value:{event_id:string})=>void=()=>{};send.mockImplementation(()=>new Promise(done=>{finish=done;}));const first=session.send('secret');await vi.waitFor(()=>expect(send).toHaveBeenCalledOnce());await expect(session.send('secret')).rejects.toThrow('current messaging');finish({event_id:'$sent'});await expect(first).resolves.toEqual({eventId:'$sent'});expect(discard).toHaveBeenCalledOnce();expect(send.mock.calls[0]).toEqual(['!room:test','secret',expect.stringMatching(/^locat_[a-f0-9-]+$/)]);});
it('rejects a device-set change after network waits',async()=>{await session.open(peer.accountId);resolve.mockResolvedValueOnce(peer).mockResolvedValueOnce({...peer,devices:[...peer.devices,{deviceId:'NEW'}]});await expect(session.send('secret')).rejects.toThrow('devices changed');expect(send).not.toHaveBeenCalled();});
it('close waits for an outstanding guard and prevents its late send',async()=>{await session.open(peer.accountId);let finish:(value:typeof peer)=>void=()=>{};resolve.mockImplementationOnce(()=>new Promise(done=>{finish=done;}));const sending=session.send('secret');const rejected=expect(sending).rejects.toThrow('closed');const closing=session.close();finish(peer);await Promise.all([closing,rejected]);expect(send).not.toHaveBeenCalled();});
it('projects no plaintext wire events and deduplicates decrypted event IDs',async()=>{let snapshot;session.subscribe(value=>{snapshot=value;});
 const event=(wire:string)=>({getWireType:()=>wire,getId:()=>'$same',getSender:()=>peer.matrixUserId,isBeingDecrypted:()=>false,shouldAttemptDecryption:()=>false,isDecryptionFailure:()=>false,getContent:()=>({msgtype:'m.text',body:'decrypted'}),getType:()=> 'm.room.message',getTs:()=>123});events=[event('m.room.message'),event('m.room.encrypted'),event('m.room.encrypted')];await session.open(peer.accountId);expect(snapshot).toMatchObject({messages:[{id:'$same',text:'decrypted',failed:false}]});});

it('retries the original SDK event rather than encrypting a second message after an uncertain response',async()=>{await session.open(peer.accountId);let original:unknown;send.mockImplementation(async(_room:string,_text:string,transaction:string)=>{original={getTxnId:()=>transaction,getId:()=> '~pending'};pendingEvents=[original];throw new Error('Connection interrupted');});await expect(session.send('secret')).rejects.toThrow('interrupted');await expect(session.send('different')).rejects.toThrow('uncertain send');await expect(session.send('secret')).resolves.toEqual({eventId:'$retried'});expect(send).toHaveBeenCalledOnce();expect(resend.mock.calls[0][0]).toBe(original);expect(discard).toHaveBeenCalledOnce();});

it('loads bounded older SDK pages, serializes against sends and stops at the per-open page budget',async()=>{
 await session.open(peer.accountId);let finish:()=>void=()=>{};scrollback.mockImplementationOnce(()=>new Promise<void>(done=>{finish=done;}));const loading=session.loadOlder();await vi.waitFor(()=>expect(scrollback).toHaveBeenCalledOnce());await expect(session.send('secret')).rejects.toThrow('current messaging');expect(scrollback.mock.calls[0][1]).toBe(50);finish();await loading;
 scrollback.mockImplementation(async()=>{});await session.loadOlder();await session.loadOlder();await session.loadOlder();expect(scrollback).toHaveBeenCalledTimes(3);expect(send).not.toHaveBeenCalled();expect(discard).not.toHaveBeenCalled();
});
it('denies history access for unverified devices and never fetches beyond the 200-event display window',async()=>{
 await session.open(peer.accountId);verified=false;await expect(session.loadOlder()).rejects.toThrow('Verify every');expect(scrollback).not.toHaveBeenCalled();verified=true;
 const event={getWireType:()=> 'm.room.message'};events=Array.from({length:180},()=>event);await session.loadOlder();expect(scrollback.mock.calls[0][1]).toBe(20);
 pagination.paginationToken='more';events=Array.from({length:200},()=>event);await session.loadOlder();expect(scrollback).toHaveBeenCalledOnce();
});

it('never replays an uncertain event after the five-minute retry window or a backward clock change',async()=>{
 await session.open(peer.accountId);send.mockImplementation(async(_room:string,_text:string,transaction:string)=>{pendingEvents=[{getTxnId:()=>transaction,getId:()=> '~pending'}];throw new Error('Uncertain acknowledgement');});
 const started=Date.now(),clock=vi.spyOn(Date,'now').mockReturnValue(started);
 try{await expect(session.send('secret')).rejects.toThrow('Uncertain');clock.mockReturnValue(started+300001);await expect(session.send('secret')).rejects.toThrow('retry window expired');clock.mockReturnValue(started-1);await expect(session.send('secret')).rejects.toThrow('retry window expired');expect(send).toHaveBeenCalledOnce();expect(resend).not.toHaveBeenCalled();}finally{clock.mockRestore();}
});

it('observes an existing SDK decryption promise without continually requesting retries, and awaits it on close',async()=>{
 let finish:()=>void=()=>{};const existing=new Promise<void>(done=>{finish=done;});events=[{getWireType:()=> 'm.room.encrypted',getId:()=> '$pending',getSender:()=>peer.matrixUserId,isBeingDecrypted:()=>true,getDecryptionPromise:()=>existing}];
 try{await session.open(peer.accountId);await new Promise(resolve=>setTimeout(resolve,650));expect(decrypt).not.toHaveBeenCalled();let closed=false;const closing=session.close().then(()=>{closed=true;});await Promise.resolve();expect(closed).toBe(false);finish();await closing;expect(closed).toBe(true);}finally{finish();}
});
