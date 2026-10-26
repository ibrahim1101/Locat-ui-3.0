import {webcrypto} from 'node:crypto';
import {fireEvent,render,screen,waitFor} from '@testing-library/react';
import {MemoryRouter} from 'react-router';
import {afterEach,expect,it,vi} from 'vitest';
import {LiveShare} from './LiveShare';
import {encryptShare} from './shareCrypto';
import * as handoff from './pwaShareHandoff';

const {session}=vi.hoisted(()=>({session:{user:{id:'c'.repeat(32),displayName:'Carol',lcCode:'LC-5678'}}}));
vi.mock('../app/session',()=>({useSession:()=>session}));
afterEach(()=>{window.history.replaceState(null,'','/share');vi.restoreAllMocks();vi.unstubAllGlobals();});
const reply=(data:object,status=200)=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json'}});

it('encrypts text before creating a bearer link and keeps its key in the fragment',async()=>{
 vi.stubGlobal('crypto',webcrypto as unknown as Crypto);let posted:Record<string,unknown>|undefined;
 vi.stubGlobal('fetch',vi.fn(async(path:string,options:RequestInit={})=>{if(path==='/api/share'&&options.method==='POST'){const input=JSON.parse(String(options.body)) as Record<string,unknown>;posted=input;return reply({share:{id:'11111111-1111-4111-8111-111111111111',iv:input.iv,ciphertext:input.ciphertext,expiresAt:Date.now()+86_400_000,createdAt:Date.now(),downloadLimit:input.downloadLimit,downloadCount:0}},201);}return reply({shares:[]});}));
 render(<MemoryRouter><LiveShare/></MemoryRouter>);fireEvent.change(screen.getByLabelText('Message'),{target:{value:'A private note.'}});fireEvent.click(screen.getByRole('button',{name:'Create encrypted link'}));await screen.findByRole('textbox',{name:'Share link'});await waitFor(()=>expect(screen.getByText('Encrypted link created. Its key and any passphrase wrapper stayed in this browser.')).toBeVisible());
 const submitted=posted!;expect(JSON.stringify(submitted)).not.toContain('A private note.');expect(submitted).not.toHaveProperty('secret');expect(submitted.downloadLimit).toBe(5);expect(screen.getByRole('textbox',{name:'Share link'})).toHaveValue();expect((screen.getByRole('textbox',{name:'Share link'}) as HTMLInputElement).value).toMatch(/#11111111-1111-4111-8111-111111111111\.[A-Za-z0-9_-]{43}$/);
 expect(await screen.findByRole('img',{name:'QR code for encrypted share link'})).toBeVisible();expect(screen.getByRole('link',{name:'Download QR code'})).toHaveAttribute('download','locat-encrypted-share.png');
});

it('requires the separate passphrase and lets the recipient retry locally',async()=>{
 vi.stubGlobal('crypto',webcrypto as unknown as Crypto);const encrypted=await encryptShare('Protected words.','trusted second channel'),id='22222222-2222-4222-8222-222222222222';window.history.replaceState(null,'',`/share#${id}.${encrypted.secret}`);const fetcher=vi.fn(async()=>reply({share:{id,iv:encrypted.iv,ciphertext:encrypted.ciphertext,expiresAt:Date.now()+60_000,downloadLimit:5,downloadCount:1}}));vi.stubGlobal('fetch',fetcher);
 render(<MemoryRouter><LiveShare/></MemoryRouter>);const passphrase=await screen.findByLabelText('Share passphrase');fireEvent.change(passphrase,{target:{value:'wrong passphrase'}});fireEvent.click(screen.getByRole('button',{name:'Unlock message'}));expect(await screen.findByRole('alert')).toHaveTextContent('did not unlock');fireEvent.change(screen.getByLabelText('Share passphrase'),{target:{value:'trusted second channel'}});fireEvent.click(screen.getByRole('button',{name:'Unlock message'}));expect(await screen.findByText('Protected words.')).toBeVisible();expect(fetcher).toHaveBeenCalledOnce();
});

it('creates a passphrase-protected link without submitting its passphrase',async()=>{
 vi.stubGlobal('crypto',webcrypto as unknown as Crypto);let posted:Record<string,unknown>|undefined;vi.stubGlobal('fetch',vi.fn(async(_path:string,options:RequestInit={})=>{if(options.method==='POST'){const input=JSON.parse(String(options.body)) as Record<string,unknown>;posted=input;return reply({share:{id:'33333333-3333-4333-8333-333333333333',iv:input.iv,ciphertext:input.ciphertext,expiresAt:Date.now()+60_000,createdAt:Date.now(),downloadLimit:5,downloadCount:0}},201);}return reply({shares:[]});}));
 render(<MemoryRouter><LiveShare/></MemoryRouter>);fireEvent.change(screen.getByLabelText('Message'),{target:{value:'Private content.'}});fireEvent.click(screen.getByLabelText('Require a separate passphrase'));fireEvent.change(screen.getByLabelText('Share passphrase'),{target:{value:'Secret phrase from another channel'}});fireEvent.click(screen.getByRole('button',{name:'Create encrypted link'}));await screen.findByRole('textbox',{name:'Share link'});expect(JSON.stringify(posted)).not.toContain('Private content.');expect(JSON.stringify(posted)).not.toContain('Secret phrase from another channel');expect(screen.getByText(/A separate passphrase is required/)).toBeVisible();
});

it('restores a locally received PWA share for review without sending it to the server',async()=>{
 vi.spyOn(handoff,'consumePwaShareHandoff').mockResolvedValue({title:'A note',text:'Shared words',url:'',review:'A note\n\nShared words',createdAt:Date.now()});
 window.history.replaceState(null,'','/share?handoff=11111111-1111-4111-8111-111111111111');const requests=vi.fn(async(_path:string,_options:RequestInit={})=>reply({shares:[]}));vi.stubGlobal('fetch',requests);
 render(<MemoryRouter><LiveShare/></MemoryRouter>);
 expect(await screen.findByLabelText('Message')).toHaveValue('A note\n\nShared words');
 expect(screen.getByRole('status')).toHaveTextContent('Shared text staged locally. Review it before creating the encrypted link.');
 await waitFor(()=>expect(requests).toHaveBeenCalledWith('/api/share',expect.objectContaining({headers:expect.objectContaining({'X-Locat-Account':session.user.id})})));
 expect(requests.mock.calls.every(([path,options])=>path==='/api/share'&&(!options?.method||options.method==='GET'))).toBe(true);
});

it('offers browser installation and hides the prompt after acceptance',async()=>{
 vi.stubGlobal('fetch',vi.fn(async()=>reply({shares:[]})));const prompt=vi.fn(async()=>{}),event=Object.assign(new Event('beforeinstallprompt',{cancelable:true}),{prompt,userChoice:Promise.resolve({outcome:'accepted' as const})});
 render(<MemoryRouter><LiveShare/></MemoryRouter>);window.dispatchEvent(event);fireEvent.click(await screen.findByRole('button',{name:'Install Locat'}));
 await waitFor(()=>expect(screen.queryByRole('button',{name:'Install Locat'})).not.toBeInTheDocument());expect(prompt).toHaveBeenCalledOnce();
});
