import {webcrypto} from 'node:crypto';
import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import type {MatrixClient} from 'matrix-js-sdk';
import {createMatrixConversationSession,type MatrixConversationSession,type ConversationSnapshot} from './matrixConversationSession';
import {encryptMatrixAttachment} from './matrixEncryptedAttachment';
vi.mock('./matrixTrackedPeer.mjs',()=>({trackAuthorizedMatrixPeer:vi.fn(async()=>{})}));
const peer={accountId:'b'.repeat(32),matrixUserId:'@bob:test',devices:[{deviceId:'BOB'}]};
let session:MatrixConversationSession,verified:boolean,members:string[],events:unknown[],pendingEvents:unknown[],pendingRecord:unknown,receiptEventId:string|undefined,resend:ReturnType<typeof vi.fn>,resolve:ReturnType<typeof vi.fn<(accountId:string)=>Promise<typeof peer>>>,send:ReturnType<typeof vi.fn>,sendEvent:ReturnType<typeof vi.fn>,sendReceipt:ReturnType<typeof vi.fn>,upload:ReturnType<typeof vi.fn>,mediaFetch:ReturnType<typeof vi.fn>,mediaUrl:ReturnType<typeof vi.fn>,discard:ReturnType<typeof vi.fn>,scrollback:ReturnType<typeof vi.fn>,decrypt:ReturnType<typeof vi.fn>,pagination:{paginationToken:string|null};
beforeEach(()=>{verified=true;members=['@alice:test','@bob:test'];events=[];pendingEvents=[];pendingRecord=undefined;receiptEventId=undefined;resend=vi.fn(async()=>({event_id:'$retried'}));resolve=vi.fn(async()=>peer);send=vi.fn(async()=>({event_id:'$sent'}));discard=vi.fn(async()=>{});decrypt=vi.fn(async()=>{});pagination={paginationToken:'older'};scrollback=vi.fn(async()=>{pagination.paginationToken=null;});
 const readEvent={getId:()=>'$read',getRoomId:()=> '!room:test',getSender:()=>peer.matrixUserId,isDecryptionFailure:()=>false};const room={oldState:pagination,getPendingEvents:()=>pendingEvents,getLiveTimeline:()=>({getEvents:()=>events}),findEventById:(id:string)=>id==='$read'?readEvent:undefined,getReadReceiptForUserId:()=>receiptEventId?{eventId:receiptEventId,data:{ts:1}}:null,currentState:{getStateEvents:()=>({getContent:()=>({algorithm:'m.megolm.v1.aes-sha2'})})},getMembers:()=>members.map(userId=>({userId,membership:'join'})),getMyMembership:()=> 'join',getMember:()=>({membership:'join'})};
 const crypto={getUserDeviceInfo:vi.fn(async()=>new Map([[peer.matrixUserId,new Map([['BOB',{}]])]])),getDeviceVerificationStatus:vi.fn(async()=>({isVerified:()=>verified})),isEncryptionEnabledInRoom:vi.fn(async()=>true),forceDiscardSession:discard};
 sendEvent=vi.fn(async()=>({event_id:'$file'}));sendReceipt=vi.fn(async()=>({}));upload=vi.fn(async()=>({content_uri:'mxc://media.test/file-id'}));mediaFetch=vi.fn(async(_input:RequestInfo|URL,init?:RequestInit)=>init?.method==='POST'?new Response(JSON.stringify({content_uri:'mxc://media.test/file-id'}),{headers:{'Content-Type':'application/json'}}):new Response(new Uint8Array()));
 mediaUrl=vi.fn();const client={getRoom:()=>room,getSyncState:()=> 'SYNCING',getUserId:()=> '@alice:test',getCrypto:()=>crypto,joinRoom:vi.fn(async()=>{}),sendTextMessage:send,sendEvent,sendReadReceipt:sendReceipt,uploadContent:upload,mxcUrlToHttp:mediaUrl,getHomeserverUrl:()=> 'https://matrix.test',resendEvent:resend,scrollback,decryptEventIfNeeded:decrypt};
 const outbox={load:vi.fn(async()=>pendingRecord),prepare:vi.fn(async(value:{peerId:string;roomId:string;transaction:string;devices:string;createdAt:number;kind?:'attachment'})=>{if(value.kind==='attachment')pendingRecord={...value,attempts:0};}),beforeSend:vi.fn(async()=>{}),complete:vi.fn(async()=>{pendingRecord=undefined;}),check:vi.fn()};
 session=createMatrixConversationSession(client as unknown as MatrixClient,resolve,async()=>({roomId:'!room:test'}),async()=>{},outbox as never,mediaFetch as unknown as typeof fetch);
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

it('marks only a decrypted message from the active contact as read',async()=>{await session.open(peer.accountId);await expect(session.markRead('$read')).resolves.toEqual({eventId:'$read'});expect(sendReceipt).toHaveBeenCalledOnce();await expect(session.markRead('$missing')).rejects.toThrow('Only a decrypted message');expect(sendReceipt).toHaveBeenCalledOnce();});
it('projects a contact receipt as read on the sender’s encrypted message',async()=>{receiptEventId='$own';events=[{getWireType:()=> 'm.room.encrypted',getId:()=> '$own',getSender:()=> '@alice:test',isBeingDecrypted:()=>false,shouldAttemptDecryption:()=>false,isDecryptionFailure:()=>false,getContent:()=>({msgtype:'m.text',body:'hello'}),getType:()=> 'm.room.message',getTs:()=>123}];let snapshot:ConversationSnapshot|undefined;session.subscribe(value=>{snapshot=value;});await session.open(peer.accountId);await vi.waitFor(()=>expect(snapshot?.messages).toMatchObject([{id:'$own',mine:true,read:true}]));});

it('uploads ciphertext and sends only an encrypted Matrix file event after device and room checks',async()=>{
 vi.stubGlobal('crypto',webcrypto);await session.open(peer.accountId);const plain=new TextEncoder().encode('a confidential original photo');const file=new File([plain],'private.png',{type:'image/png'});
 await expect(session.sendAttachment(file)).resolves.toEqual({eventId:'$file'});
 const [uploadUrl,uploadInit]=mediaFetch.mock.calls[0] as [string,RequestInit];expect(uploadUrl).toBe('https://matrix.test/_matrix/media/v3/upload');expect(uploadInit).toMatchObject({method:'POST',headers:{'Content-Type':'application/octet-stream'}});const uploaded=new Uint8Array(await (uploadInit.body as Blob).arrayBuffer());expect(uploaded).not.toEqual(plain);expect(uploaded.length).toBe(plain.length);
 expect(sendEvent).toHaveBeenCalledOnce();const event=sendEvent.mock.calls[0][2];expect(event).toMatchObject({msgtype:'m.file',body:'private.png',info:{mimetype:'image/png',size:plain.length},file:{url:'mxc://media.test/file-id',v:'v2',key:{alg:'A256CTR'}}});expect(JSON.stringify(event)).not.toContain('a confidential original photo');expect(discard).toHaveBeenCalledOnce();expect(send).not.toHaveBeenCalled();
});

it('sends a reviewed voice recording as encrypted m.audio metadata with a bounded duration',async()=>{
 vi.stubGlobal('crypto',webcrypto);await session.open(peer.accountId);const plain=new TextEncoder().encode('voice bytes');const file=new File([plain],'Voice message.webm',{type:'audio/webm'});
 await expect(session.sendAttachment(file,{durationSec:12})).resolves.toEqual({eventId:'$file'});
 const uploaded=new Uint8Array(await ((mediaFetch.mock.calls[0]![1] as RequestInit).body as Blob).arrayBuffer());expect(uploaded).not.toEqual(plain);
 expect(sendEvent.mock.calls[0]![2]).toMatchObject({msgtype:'m.audio',body:'Voice message.webm',info:{mimetype:'audio/webm',size:plain.length,duration:12_000},file:{url:'mxc://media.test/file-id',key:{alg:'A256CTR'}}});
 await expect(session.sendAttachment(file,{durationSec:61})).rejects.toThrow('supported audio');
 await expect(session.sendAttachment(new File([plain],'bad.txt',{type:'text/plain'}),{durationSec:12})).rejects.toThrow('supported audio');
});

it('keeps an attachment acknowledgement uncertainty durable and blocks duplicate composition',async()=>{
 vi.stubGlobal('crypto',webcrypto);await session.open(peer.accountId);sendEvent.mockRejectedValueOnce(new Error('Connection interrupted after upload'));
 const file=new File([new TextEncoder().encode('private file')],'private.txt',{type:'text/plain'});let snapshot:ConversationSnapshot|undefined;session.subscribe(value=>{snapshot=value;});
 await expect(session.sendAttachment(file)).rejects.toThrow('Connection interrupted');expect(snapshot?.pendingSend).toMatchObject({kind:'attachment',peerId:peer.accountId,roomId:'!room:test'});
 await expect(session.send('another message')).rejects.toThrow('Review the pending encrypted send');await expect(session.recoverPending()).rejects.toThrow('file send may already have arrived');
 expect(sendEvent).toHaveBeenCalledOnce();expect(send).not.toHaveBeenCalled();expect(resend).not.toHaveBeenCalled();
});

it('projects encrypted file events and verifies downloaded ciphertext before returning the original bytes',async()=>{
 vi.stubGlobal('crypto',webcrypto);await session.open(peer.accountId);const plain=new TextEncoder().encode('original attachment'),encrypted=await encryptMatrixAttachment(plain),file={...encrypted.file,url:'mxc://media.test/opaque'};
 events=[{getWireType:()=> 'm.room.encrypted',getId:()=> '$encrypted-file',getSender:()=>peer.matrixUserId,isBeingDecrypted:()=>false,shouldAttemptDecryption:()=>false,isDecryptionFailure:()=>false,getContent:()=>({msgtype:'m.file',body:'image.png',info:{size:plain.length,mimetype:'image/png'},file}),getType:()=> 'm.room.message',getTs:()=>123}];let snapshot:ConversationSnapshot|undefined;session.subscribe(value=>{snapshot=value;});
 await vi.waitFor(()=>expect(snapshot?.messages).toMatchObject([{id:'$encrypted-file',attachment:{name:'image.png',size:plain.length,mime:'image/png'}}]));
 mediaUrl.mockReturnValue('https://matrix.test/_matrix/client/v1/media/download/media.test/opaque?allow_redirect=true');mediaFetch.mockResolvedValueOnce(new Response(encrypted.ciphertext));
 const downloaded=await session.downloadAttachment(file);expect(new TextDecoder().decode(await downloaded.arrayBuffer())).toBe('original attachment');expect(mediaUrl).toHaveBeenCalledWith(file.url,undefined,undefined,undefined,false,false,true);expect(mediaFetch).toHaveBeenCalledWith(expect.stringContaining('/_matrix/client/v1/media/download/media.test/opaque?allow_redirect=false'),{method:'GET',credentials:'same-origin',cache:'no-store',redirect:'error'});
});

it('projects only bounded encrypted Matrix audio attachments with valid duration metadata',async()=>{
 vi.stubGlobal('crypto',webcrypto);await session.open(peer.accountId);const encrypted=await encryptMatrixAttachment(new TextEncoder().encode('audio bytes')),file={...encrypted.file,url:'mxc://media.test/voice'};
 const makeEvent=(duration:number,size:number,mimetype='audio/webm')=>({getWireType:()=> 'm.room.encrypted',getId:()=> '$voice'+duration+size+encodeURIComponent(mimetype),getSender:()=>peer.matrixUserId,isBeingDecrypted:()=>false,shouldAttemptDecryption:()=>false,isDecryptionFailure:()=>false,getContent:()=>({msgtype:'m.audio',body:'Voice message.webm',info:{size,mimetype,duration},file}),getType:()=> 'm.room.message',getTs:()=>123});
 events=[makeEvent(12_000,10),makeEvent(0,10),makeEvent(61_000,10),makeEvent(12_000,2_900_001),makeEvent(12_000,10,'video/webm')];let snapshot:ConversationSnapshot|undefined;session.subscribe(value=>{snapshot=value;});
 await vi.waitFor(()=>expect(snapshot?.messages).toMatchObject([{attachment:{name:'Voice message.webm',size:10,mime:'audio/webm',durationSec:12}}]));expect(snapshot?.messages).toHaveLength(1);
});

it('refuses encrypted media URLs that resolve outside the configured homeserver',async()=>{
 vi.stubGlobal('crypto',webcrypto);const encrypted=await encryptMatrixAttachment(new TextEncoder().encode('secret')),file={...encrypted.file,url:'mxc://media.test/opaque'};mediaUrl.mockReturnValue('https://attacker.test/download');const download=mediaFetch;
 await expect(session.downloadAttachment(file)).rejects.toThrow('conversation’s homeserver');expect(download).not.toHaveBeenCalled();
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

it('shares shutdown completion so a second close cannot release ownership before pending work settles',async()=>{
 await session.open(peer.accountId);let finish:(value:typeof peer)=>void=()=>{};resolve.mockImplementationOnce(()=>new Promise(done=>{finish=done;}));const sending=expect(session.send('private draft')).rejects.toThrow('closed');const first=session.close(),second=session.close();expect(first).toBe(second);let settled=false;void second.then(()=>{settled=true;});await Promise.resolve();expect(settled).toBe(false);finish(peer);await Promise.all([first,second,sending]);expect(settled).toBe(true);expect(send).not.toHaveBeenCalled();
});
