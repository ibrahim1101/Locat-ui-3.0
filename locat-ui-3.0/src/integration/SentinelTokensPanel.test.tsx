import {act,fireEvent,render,screen,waitFor} from '@testing-library/react';
import {afterEach,expect,it,vi} from 'vitest';
import {SentinelTokensPanel} from './SentinelTokensPanel';
afterEach(()=>vi.unstubAllGlobals());
const token=(id:string,revokedAt:number|null=null)=>({id,name:'Token '+id,prefix:'lsk_public',createdAt:1000,lastUsedAt:null,revokedAt});
const response=(tokens:ReturnType<typeof token>[],nextCursor:string|null=null)=>new Response(JSON.stringify({tokens,nextCursor}));
it('starts with active tokens, pages older metadata and filters revoked inventory on the server',async()=>{
 const paths:string[]=[];vi.stubGlobal('fetch',vi.fn(async(path:string)=>{
  paths.push(path);const params=new URL(path,'https://locat.test').searchParams;
  if(params.get('state')==='revoked')return response([token('revoked',1)]);
  return params.has('before')?response([token('active'),token('older')]):response([token('active')],'1000:'+ 'a'.repeat(32));
 }));
 render(<SentinelTokensPanel/>);await screen.findByText('Token active');expect(new URL(paths[0],'https://locat.test').searchParams.get('state')).toBe('active');
 fireEvent.click(screen.getByRole('button',{name:'Load older integration tokens'}));await screen.findByText('Token older');expect(screen.getAllByText('Token active')).toHaveLength(1);
 fireEvent.click(screen.getByRole('button',{name:'Revoked tokens'}));await screen.findByText('Token revoked');expect(screen.queryByText('Token active')).toBeNull();
 const params=new URL(paths.at(-1)!,'https://locat.test').searchParams;expect(params.get('state')).toBe('revoked');expect(params.has('before')).toBe(false);expect(screen.queryByRole('button',{name:'Revoke'})).toBeNull();
});
it('excludes duplicate token minting and ignores a late one-time token after dialog close',async()=>{
 let release:(value:Response)=>void=()=>{},writes=0;const pending=new Promise<Response>(resolve=>{release=resolve;});
 vi.stubGlobal('fetch',vi.fn(async(_path:string,options?:RequestInit)=>{if(options?.method==='POST'){writes++;return pending;}return response([]);}));
 render(<SentinelTokensPanel/>);await screen.findByText('No integrations in this view');fireEvent.click(screen.getByRole('button',{name:'Create integration token'}));
 fireEvent.change(screen.getByLabelText('Integration name'),{target:{value:'Monitor'}});const form=screen.getByRole('button',{name:'Create token'}).closest('form')!;fireEvent.submit(form);fireEvent.submit(form);expect(writes).toBe(1);
 fireEvent.click(screen.getByRole('button',{name:'Close'}));
 await act(async()=>{release(new Response(JSON.stringify({id:'new',token:'late-one-time-token'})));await pending;});
 await waitFor(()=>expect(screen.getByRole('button',{name:'Create integration token'})).not.toBeDisabled());expect(screen.queryByLabelText('New token')).toBeNull();
});
