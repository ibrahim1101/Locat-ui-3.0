import {webcrypto} from 'node:crypto';
import {fireEvent,render,screen} from '@testing-library/react';
import {MemoryRouter} from 'react-router';
import {afterEach,expect,it,vi} from 'vitest';
import {PublicShareViewer} from './PublicShareViewer';
import {encryptShare} from './shareCrypto';

afterEach(()=>{window.history.replaceState(null,'','/share');vi.restoreAllMocks();vi.unstubAllGlobals();});
const reply=(data:object,status=200)=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json'}});

it('opens a normal encrypted link without a Locat session',async()=>{
 vi.stubGlobal('crypto',webcrypto as unknown as Crypto);const encrypted=await encryptShare('Public receiver text.'),id='44444444-4444-4444-8444-444444444444';window.history.replaceState(null,'',`/share#${id}.${encrypted.secret}`);const fetcher=vi.fn(async()=>reply({share:{iv:encrypted.iv,ciphertext:encrypted.ciphertext,downloadLimit:5,downloadCount:1}}));vi.stubGlobal('fetch',fetcher);
 render(<MemoryRouter><PublicShareViewer/></MemoryRouter>);expect(await screen.findByText('Public receiver text.')).toBeVisible();expect(fetcher).toHaveBeenCalledWith('/api/share/'+id,expect.objectContaining({credentials:'omit',cache:'no-store'}));
});

it('unlocks an optional share passphrase locally without another request',async()=>{
 vi.stubGlobal('crypto',webcrypto as unknown as Crypto);const encrypted=await encryptShare('Protected public text.','a public recipient passphrase'),id='55555555-5555-4555-8555-555555555555';window.history.replaceState(null,'',`/share#${id}.${encrypted.secret}`);const fetcher=vi.fn(async()=>reply({share:{iv:encrypted.iv,ciphertext:encrypted.ciphertext,downloadLimit:5,downloadCount:1}}));vi.stubGlobal('fetch',fetcher);
 render(<MemoryRouter><PublicShareViewer/></MemoryRouter>);fireEvent.change(await screen.findByLabelText('Share passphrase'),{target:{value:'a public recipient passphrase'}});fireEvent.click(screen.getByRole('button',{name:'Unlock message'}));expect(await screen.findByText('Protected public text.')).toBeVisible();expect(fetcher).toHaveBeenCalledOnce();
});
