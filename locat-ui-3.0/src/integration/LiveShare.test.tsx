import {webcrypto} from 'node:crypto';
import {fireEvent,render,screen,waitFor} from '@testing-library/react';
import {MemoryRouter} from 'react-router';
import {afterEach,expect,it,vi} from 'vitest';
import {LiveShare} from './LiveShare';

const {session}=vi.hoisted(()=>({session:{user:{id:'c'.repeat(32),displayName:'Carol',lcCode:'LC-5678'}}}));
vi.mock('../app/session',()=>({useSession:()=>session}));
afterEach(()=>vi.unstubAllGlobals());
const reply=(data:object,status=200)=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json'}});

it('encrypts text before creating a bearer link and keeps its key in the fragment',async()=>{
 vi.stubGlobal('crypto',webcrypto as unknown as Crypto);let posted:Record<string,unknown>|undefined;
 vi.stubGlobal('fetch',vi.fn(async(path:string,options:RequestInit={})=>{if(path==='/api/share'&&options.method==='POST'){const input=JSON.parse(String(options.body)) as Record<string,unknown>;posted=input;return reply({share:{id:'11111111-1111-4111-8111-111111111111',iv:input.iv,ciphertext:input.ciphertext,expiresAt:Date.now()+86_400_000,createdAt:Date.now()}},201);}return reply({shares:[]});}));
 render(<MemoryRouter><LiveShare/></MemoryRouter>);fireEvent.change(screen.getByLabelText('Message'),{target:{value:'A private note.'}});fireEvent.click(screen.getByRole('button',{name:'Create encrypted link'}));await screen.findByRole('textbox',{name:'Share link'});await waitFor(()=>expect(screen.getByText('Encrypted link created. Its key is in the URL fragment and was not sent to the server.')).toBeVisible());
 const submitted=posted!;expect(JSON.stringify(submitted)).not.toContain('A private note.');expect(submitted).not.toHaveProperty('secret');expect(screen.getByRole('textbox',{name:'Share link'})).toHaveValue();expect((screen.getByRole('textbox',{name:'Share link'}) as HTMLInputElement).value).toMatch(/#11111111-1111-4111-8111-111111111111\.[A-Za-z0-9_-]{43}$/);
});
