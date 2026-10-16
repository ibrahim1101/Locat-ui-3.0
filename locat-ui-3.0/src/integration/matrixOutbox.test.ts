import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import {IDBFactory} from 'fake-indexeddb';
import {createMatrixOutbox} from './matrixOutbox';
const transaction='locat_11111111-1111-4111-8111-111111111111',peerId='b'.repeat(32),roomId='!room:test';
const body=JSON.stringify({algorithm:'m.megolm.v1.aes-sha2',sender_key:'YWJj',ciphertext:'ZGVm',session_id:'Z2hp',device_id:'DEVICE'});
const descriptor=()=>({peerId,roomId,transaction,devices:'["BOB"]',createdAt:Date.now()});
beforeEach(()=>vi.stubGlobal('indexedDB',new IDBFactory()));afterEach(()=>{vi.unstubAllGlobals();vi.restoreAllMocks();});
it('commits ciphertext before transmission and reopens only in the same device/account scope',async()=>{
 const outbox=createMatrixOutbox('origin/account/device','DEVICE','YWJj');await outbox.prepare(descriptor());await outbox.beforeSend(roomId,transaction,body);
 const restored=await createMatrixOutbox('origin/account/device','DEVICE','YWJj').load();expect(restored).toMatchObject({body,transaction,attempts:1});expect(Object.keys(restored!).sort()).toEqual(['attempts','body','createdAt','devices','peerId','roomId','transaction']);expect(await createMatrixOutbox('origin/other/device','DEVICE','YWJj').load()).toBeUndefined();expect(await createMatrixOutbox('origin/account/other-device','OTHER','YWJj').load()).toBeUndefined();await outbox.complete(transaction);expect(await outbox.load()).toBeUndefined();
});
it('rejects plaintext, changed keys, ciphertext, room and transaction without changing the original record',async()=>{
 const outbox=createMatrixOutbox('scope','DEVICE','YWJj');await outbox.prepare(descriptor());for(const bad of [JSON.stringify({body:'private draft'}),JSON.stringify({...JSON.parse(body),body:'private draft'}),JSON.stringify({...JSON.parse(body),device_id:'FOREIGN'}),JSON.stringify({...JSON.parse(body),sender_key:'Zm9yZWlnbg'})])await expect(outbox.beforeSend(roomId,transaction,bad)).rejects.toThrow();expect((await outbox.load())?.attempts).toBe(0);await outbox.beforeSend(roomId,transaction,body);await expect(outbox.beforeSend('!other:test',transaction,body)).rejects.toThrow('room changed');await expect(outbox.beforeSend(roomId,transaction+'x',body)).rejects.toThrow('transaction changed');await expect(outbox.beforeSend(roomId,transaction,body.replace('ZGVm','ZGVn'))).rejects.toThrow('ciphertext changed');expect((await outbox.load())?.attempts).toBe(1);await expect(outbox.prepare(descriptor())).rejects.toThrow('pending');
});
it('bounds actual wire attempts, expiration and backward clocks across reopened instances',async()=>{
 const started=Date.now(),clock=vi.spyOn(Date,'now').mockReturnValue(started),outbox=createMatrixOutbox('scope','DEVICE','YWJj');await outbox.prepare(descriptor());clock.mockReturnValue(started-1);await expect(outbox.beforeSend(roomId,transaction,body)).rejects.toThrow('expired');clock.mockReturnValue(started+300001);await expect(outbox.beforeSend(roomId,transaction,body)).rejects.toThrow('expired');clock.mockReturnValue(started+1000);for(let i=0;i<3;i++)await createMatrixOutbox('scope','DEVICE','YWJj').beforeSend(roomId,transaction,body);await expect(outbox.beforeSend(roomId,transaction,body)).rejects.toThrow('three-attempt');expect((await outbox.load())?.attempts).toBe(3);
});
it('propagates storage failures instead of accepting a non-durable send',async()=>{
 vi.stubGlobal('indexedDB',{open(){throw new Error('Storage unavailable');}});await expect(createMatrixOutbox('scope','DEVICE','YWJj').prepare(descriptor())).rejects.toThrow('Storage unavailable');
});
