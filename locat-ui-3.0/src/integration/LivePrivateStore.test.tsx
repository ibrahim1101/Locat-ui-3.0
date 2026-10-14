import {webcrypto} from 'node:crypto';
import {fireEvent,render,screen,waitFor} from '@testing-library/react';
import {MemoryRouter} from 'react-router';
import {afterEach,expect,it,vi} from 'vitest';
import {createPrivateStore,encryptPrivateEntry} from './privateStoreCrypto';
import {LivePrivateStore} from './LivePrivateStore';
const {session}=vi.hoisted(()=>({session:{user:{id:'test-private-user'}}}));
vi.mock('../app/session',()=>({useSession:()=>session}));
afterEach(()=>{vi.unstubAllGlobals();vi.restoreAllMocks();});
it('encrypts secret fields before upload and clears plaintext when the page is hidden',async()=>{
 vi.stubGlobal('crypto',webcrypto);vi.stubGlobal('isSecureContext',true);
 const requests: {path:string;input:unknown}[]=[];
 vi.stubGlobal('fetch',vi.fn(async(path:string,options?:RequestInit)=>{const input=options?.body?JSON.parse(String(options.body)):undefined;requests.push({path,input});return {ok:true,json:async()=>options?.method==='POST'?(path.endsWith('/put')?{revision:1}:{ok:true}):{config:null,objects:[],quota:67108864,maxObjects:128}};}));
 render(<MemoryRouter><LivePrivateStore kind="secrets"/></MemoryRouter>);
 fireEvent.change(await screen.findByLabelText('Private-store passphrase'),{target:{value:'a separate long passphrase'}});fireEvent.change(screen.getByLabelText('Confirm private-store passphrase'),{target:{value:'a separate long passphrase'}});fireEvent.click(screen.getByRole('button',{name:'Create encrypted store'}));
 fireEvent.click(await screen.findByRole('button',{name:'Add credential or note'}));fireEvent.change(screen.getByLabelText('Entry name'),{target:{value:'Private account title'}});fireEvent.change(screen.getByLabelText('Password'),{target:{value:'my-secret-password'}});fireEvent.click(screen.getByRole('button',{name:'Encrypt and save'}));
 await screen.findByText('Private account title');fireEvent.change(screen.getByPlaceholderText('Search unlocked entries'),{target:{value:'unrelated'}});expect(screen.getByText('No matching unlocked entries')).toBeVisible();fireEvent.change(screen.getByPlaceholderText('Search unlocked entries'),{target:{value:'Private account'}});expect(screen.getByText('Private account title')).toBeVisible();const stored=requests.find(row=>row.path.endsWith('/put'))!;expect(JSON.stringify(stored.input)).not.toContain('Private account title');expect(JSON.stringify(stored.input)).not.toContain('my-secret-password');expect(JSON.stringify(requests)).not.toContain('a separate long passphrase');
 vi.spyOn(document,'hidden','get').mockReturnValue(true);fireEvent(document,new Event('visibilitychange'));
 await waitFor(()=>expect(screen.queryByText('Private account title')).toBeNull());expect(screen.queryByRole('button',{name:'Add credential or note'})).toBeNull();
});
it('does not fetch private data in local mode',()=>{
 const original=session.user;session.user=null as unknown as typeof original;const fetch=vi.fn();vi.stubGlobal('fetch',fetch);
 try{render(<MemoryRouter><LivePrivateStore kind="vault"/></MemoryRouter>);expect(screen.getByText('A signed-in account is required')).toBeVisible();expect(fetch).not.toHaveBeenCalled();}finally{session.user=original;}
});

it('validates an encrypted backup and restores missing entries without overwriting existing IDs',async()=>{
 vi.stubGlobal('crypto',webcrypto);vi.stubGlobal('isSecureContext',true);
 const scope={userId:'test-private-user',module:'secrets' as const};const phrase='a backup test passphrase';const created=await createPrivateStore(phrase,scope);
 const ids=[crypto.randomUUID(),crypto.randomUUID()];const entry={kind:'credential' as const,name:'Backup secret',folder:'',username:'',password:'secret',url:'',note:'',createdAt:1};
 const objects=await Promise.all(ids.map(async id=>({id,revision:1,envelope:await encryptPrivateEntry(created.key,created.config,scope,id,entry)})));
 const archive={format:'locat-ui3-private-backup-v1',scope,config:created.config,objects};const writes:unknown[]=[];
 vi.stubGlobal('fetch',vi.fn(async(path:string,options?:RequestInit)=>{if(options?.method==='POST'){expect(path).toBe('/api/private/secrets/put');writes.push(JSON.parse(String(options.body)));}return {ok:true,json:async()=>options?.method==='POST'?{revision:1}:{config:created.config,objects:[{id:ids[0],revision:5,bytes:100,updatedAt:1}],quota:67108864,maxObjects:128}};}));
 render(<MemoryRouter><LivePrivateStore kind="secrets"/></MemoryRouter>);
 const picker=await screen.findByLabelText('Restore locked encrypted backup');fireEvent.change(picker,{target:{files:[{size:1000,text:async()=>JSON.stringify(archive)}]}});
 fireEvent.change(await screen.findByLabelText('Backup passphrase'),{target:{value:phrase}});fireEvent.click(screen.getByRole('button',{name:'Validate and restore missing entries'}));
 await waitFor(()=>expect(writes).toHaveLength(1));expect(writes[0]).toMatchObject({id:ids[1],expectedRevision:0});expect(JSON.stringify(writes)).not.toContain('Backup secret');
 await waitFor(()=>expect(screen.queryByLabelText('Backup passphrase')).toBeNull());
});
it('rejects a corrupted backup before sending any initialization or object writes',async()=>{
 vi.stubGlobal('crypto',webcrypto);vi.stubGlobal('isSecureContext',true);const scope={userId:'test-private-user',module:'secrets' as const};const phrase='a backup test passphrase';const created=await createPrivateStore(phrase,scope);const id=crypto.randomUUID();
 const entry={kind:'credential' as const,name:'Backup secret',folder:'',username:'',password:'secret',url:'',note:'',createdAt:1};const envelope=await encryptPrivateEntry(created.key,created.config,scope,id,entry);
 const archive={format:'locat-ui3-private-backup-v1',scope,config:created.config,objects:[{id,revision:1,envelope:{...envelope,data:(envelope.data.startsWith('A')?'B':'A')+envelope.data.slice(1)}}]};
 const fetch=vi.fn(async(_path:string,_options?:RequestInit)=>({ok:true,json:async()=>({config:null,objects:[],quota:67108864,maxObjects:128})}));vi.stubGlobal('fetch',fetch);
 render(<MemoryRouter><LivePrivateStore kind="secrets"/></MemoryRouter>);fireEvent.change(await screen.findByLabelText('Restore locked encrypted backup'),{target:{files:[{size:1000,text:async()=>JSON.stringify(archive)}]}});
 fireEvent.change(await screen.findByLabelText('Backup passphrase'),{target:{value:phrase}});fireEvent.click(screen.getByRole('button',{name:'Validate and restore missing entries'}));
 await waitFor(()=>expect(screen.getByRole('button',{name:'Validate and restore missing entries'})).not.toBeDisabled());
 expect(fetch.mock.calls.every(call=>!call[1]||(call[1] as RequestInit).method!=='POST')).toBe(true);
});
