import {fireEvent,render,screen,waitFor} from '@testing-library/react';import {MemoryRouter} from 'react-router';import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import {LiveDevices} from './LiveDevices';
const {pins,local,session}=vi.hoisted(()=>({pins:vi.fn(),local:{publicKeyB64:'own-public-key',pins:{} as Record<string,string>,privateKey:{}},session:{user:{id:'device-owner'}}}));
vi.mock('../app/session',()=>({useSession:()=>session}));
vi.mock('./linkIdentityStore',()=>({loadLinkIdentity:async()=>local,pinLinkPeer:pins,resetLinkIdentity:vi.fn()}));
vi.mock('./linkCrypto',()=>({solveDeviceChallenge:async()=> 'answer',pairingSas:async()=> 'ABCDE-12345',deviceSharedKey:async()=>({})}));
vi.mock('./linkPayloadCrypto',()=>({LINK_CHUNK_SIZE:262144,encryptLinkPayload:async()=>({v:1,iv:'nonce',data:'opaque-ciphertext'}),decryptLinkPayload:async()=>new TextEncoder().encode('received')}));
beforeEach(()=>{vi.clearAllMocks();local.pins={};});afterEach(()=>vi.unstubAllGlobals());
function api(verified=false,revocation?:'pending'|'confirmed'|'manual',matrix?:{deviceId:string;managed:boolean;operationActive:boolean;binding:'unbound'|'authorized'|'blocked'}){const calls:{action:string;input:unknown;headers:unknown}[]=[];const value={observedAt:10,currentDeviceId:1,devices:[{id:1,name:'Own browser',platform:'web',publicKey:'own-public-key',lastSeenAt:1,revokedAt:null},{id:2,name:'Other browser',platform:'web',publicKey:'peer-public-key',lastSeenAt:1,revokedAt:revocation?1:null,matrixRevocation:revocation,matrix}],pairs:[{id:'pair',deviceA:1,deviceB:2,status:verified?'verified':'pending',confirmedA:verified?1:0,confirmedB:verified?1:0}]};
 vi.stubGlobal('fetch',vi.fn(async(path:string,options?:RequestInit)=>{const action=path.split('/').at(-1)!;const input=options?.body?JSON.parse(String(options.body)):undefined;calls.push({action,input,headers:options?.headers});return {ok:true,json:async()=>action==='register'?{id:1}:action==='challenge'?{id:'challenge'}:action==='prove'?{token:'proof-token',deviceId:1,expiresAt:Date.now()+600000}:action==='devices'?value:action==='payloads'?{payloads:[]}:action==='create'?{payload:{id:'job',userId:'device-owner',pairId:'pair',fromDevice:1,toDevice:2,kind:'text',name:'Encrypted text',mime:'text/plain',size:input.size,chunkCount:1,status:'uploading',receivedChunks:0}}:action==='pair'?{id:'pair'}:{ok:true}};}));return calls;}
it('shows an actual pairing code and requires an explicit click before confirmation',async()=>{
 const calls=api();render(<MemoryRouter><LiveDevices/></MemoryRouter>);fireEvent.click(await screen.findByRole('button',{name:'Review pairing'}));await screen.findByText('ABCDE-12345');
 expect(calls.some(row=>row.action==='confirm')).toBe(false);expect(pins).not.toHaveBeenCalled();fireEvent.click(screen.getByRole('button',{name:'Codes match — approve on this device'}));
 await waitFor(()=>expect(calls).toContainEqual(expect.objectContaining({action:'confirm',input:{id:'pair',approved:true}})));expect(pins).toHaveBeenCalledWith('device-owner','pair','peer-public-key');
 expect(calls.find(row=>row.action==='confirm')?.headers).toMatchObject({'X-Locat-Device-Proof':'proof-token'});
});
it('renames through a real submission and stages revocation behind confirmation',async()=>{
 const calls=api();render(<MemoryRouter><LiveDevices/></MemoryRouter>);fireEvent.change(await screen.findByLabelText("This browser's device name"),{target:{value:'Work browser'}});fireEvent.click(screen.getByRole('button',{name:'Save device name'}));
 await waitFor(()=>expect(calls).toContainEqual(expect.objectContaining({action:'rename',input:{name:'Work browser'}})));
 await waitFor(()=>expect(screen.getAllByRole('button',{name:'Revoke device'})[1]).not.toBeDisabled());fireEvent.click(screen.getAllByRole('button',{name:'Revoke device'})[1]);expect(calls.some(row=>row.action==='revoke')).toBe(false);
 fireEvent.click(screen.getByRole('button',{name:'Confirm device revocation'}));await waitFor(()=>expect(calls).toContainEqual(expect.objectContaining({action:'revoke',input:{id:2}})));
});
it('local mode performs no registration or proof requests',()=>{const original=session.user;session.user=null as unknown as typeof original;const fetch=vi.fn();vi.stubGlobal('fetch',fetch);try{render(<MemoryRouter><LiveDevices/></MemoryRouter>);expect(screen.getByText('Sign in to manage your devices')).toBeVisible();expect(fetch).not.toHaveBeenCalled();}finally{session.user=original;}});

it('queues only encrypted payloads after the peer key is pinned on this device',async()=>{
 local.pins.pair='peer-public-key';const calls=api(true);render(<MemoryRouter><LiveDevices/></MemoryRouter>);
 fireEvent.click(await screen.findByRole('button',{name:'Send to device'}));fireEvent.change(screen.getByLabelText('Text to encrypt'),{target:{value:'private transfer text'}});fireEvent.click(screen.getByRole('button',{name:'Encrypt and queue'}));
 await waitFor(()=>expect(calls).toContainEqual(expect.objectContaining({action:'chunk',input:{id:'job',seq:0,envelope:{v:1,iv:'nonce',data:'opaque-ciphertext'}}})));
 expect(JSON.stringify(calls)).not.toContain('private transfer text');expect(calls.find(row=>row.action==='create')?.input).toMatchObject({pairId:'pair',peer:2,kind:'text'});
});
it('refuses sending through a verified server pairing when the local peer key is not pinned',async()=>{
 const calls=api(true);render(<MemoryRouter><LiveDevices/></MemoryRouter>);fireEvent.click(await screen.findByRole('button',{name:'Send to device'}));fireEvent.change(screen.getByLabelText('Text to encrypt'),{target:{value:'private transfer text'}});fireEvent.click(screen.getByRole('button',{name:'Encrypt and queue'}));
 await screen.findAllByText('Review and confirm this peer key on this device before using Link.');expect(calls.some(row=>row.action==='create')).toBe(false);
});

it('discards the old account dialog and starts a fresh identity lifecycle when the account changes',async()=>{
 api(true);const fetch=vi.mocked(globalThis.fetch);const view=render(<MemoryRouter><LiveDevices/></MemoryRouter>);
 fireEvent.click(await screen.findByRole('button',{name:'Send to device'}));fireEvent.change(screen.getByLabelText('Text to encrypt'),{target:{value:'old account draft'}});
 const original=session.user;
 try{session.user={id:'second-device-owner'};view.rerender(<MemoryRouter><LiveDevices/></MemoryRouter>);expect(screen.queryByRole('dialog')).not.toBeInTheDocument();expect(screen.queryByDisplayValue('old account draft')).not.toBeInTheDocument();await waitFor(()=>expect(fetch.mock.calls.filter(([path])=>path==='/api/link/register')).toHaveLength(2));}finally{session.user=original;}
});

it('prevents duplicate submissions and further chunks after unmount with a delayed create response',async()=>{
 local.pins.pair='peer-public-key';const calls=api(true),base=globalThis.fetch;let release!:()=>void;let createSignal:AbortSignal|null|undefined;
 const gate=new Promise<void>(resolve=>{release=resolve;});vi.stubGlobal('fetch',vi.fn(async(path:string,options?:RequestInit)=>{const result=await base(path,options);if(path==='/api/link/payload/create'){createSignal=options?.signal;await gate;}return result;}));
 const view=render(<MemoryRouter><LiveDevices/></MemoryRouter>);fireEvent.click(await screen.findByRole('button',{name:'Send to device'}));const field=screen.getByLabelText('Text to encrypt');fireEvent.change(field,{target:{value:'private queued text'}});const form=field.closest('form')!;fireEvent.submit(form);fireEvent.submit(form);await waitFor(()=>expect(calls.filter(row=>row.action==='create')).toHaveLength(1));view.unmount();expect(createSignal?.aborted).toBe(true);release();await gate;await Promise.resolve();await Promise.resolve();expect(calls.some(row=>row.action==='chunk')).toBe(false);
});

it.each([['pending','Matrix device cleanup pending — server retries when available'],['confirmed','Matrix device revocation confirmed'],['manual','Matrix session requires manual server sign-out']] as const)('renders the actual %s Matrix cleanup state',async(status,label)=>{api(false,status);render(<MemoryRouter><LiveDevices/></MemoryRouter>);expect(await screen.findByText(label)).toBeVisible();});

it.each([['unbound','Managed setup recorded — binding not completed'],['authorized','Locat messaging grant active'],['blocked','Locat messaging grant blocked or expired']] as const)('shows the recorded %s messaging state for a device',async(binding,label)=>{api(false,undefined,{deviceId:'LOCAT_2',managed:true,operationActive:binding==='unbound',binding});render(<MemoryRouter><LiveDevices/></MemoryRouter>);expect(await screen.findByText(label)).toBeVisible();expect(screen.getByText('Managed Matrix device · LOCAT_2')).toBeVisible();if(binding==='unbound')expect(screen.getByText('Managed device operation in progress')).toBeVisible();});
