import {render,screen,fireEvent,waitFor} from '@testing-library/react';
import {afterEach,expect,it,vi} from 'vitest';
import {MediaSharingPanel} from './MediaSharingPanel';
afterEach(()=>vi.unstubAllGlobals());
it('only changes displayed grants after server acknowledgement and keeps failed revocation visible',async()=>{
 const libraries=[{id:'opaque-library',name:'Movies',friendIds:['friend']}];
 const fetcher=vi.fn().mockImplementation(async(path:string)=>new Response(JSON.stringify(path==='/api/contacts'?{contacts:[{status:'accepted',user:{id:'friend',displayName:'Alice'}}]}:{libraries}))).mockImplementationOnce(async()=>new Response(JSON.stringify({libraries})));
 vi.stubGlobal('fetch',fetcher);render(<MediaSharingPanel accountId="owner" onClose={()=>{}}/>);
 const revoke=await screen.findByRole('button',{name:'Revoke access for Alice to Movies'});fetcher.mockResolvedValueOnce(new Response(JSON.stringify({error:'Contact changed'}),{status:409}));fireEvent.click(revoke);
 expect(await screen.findByRole('alert')).toHaveTextContent('Contact changed');expect(screen.getByRole('button',{name:'Revoke access for Alice to Movies'})).toBeEnabled();
 fetcher.mockResolvedValueOnce(new Response(JSON.stringify({libraries:[{...libraries[0],friendIds:[]}]})));fireEvent.click(revoke);
 await screen.findByRole('button',{name:'Grant access for Alice to Movies'});await waitFor(()=>expect(fetcher).toHaveBeenLastCalledWith('/api/media/shares',expect.objectContaining({method:'POST',headers:expect.objectContaining({'X-Locat-Account':'owner'}),body:JSON.stringify({libraryId:'opaque-library',friendId:'friend',allowed:false})})));
});
it('cancels the sibling request when initial sharing discovery fails',async()=>{
 let sibling:AbortSignal|undefined;
 vi.stubGlobal('fetch',vi.fn(async(path:string,options:RequestInit)=>{if(path==='/api/media/shares')return new Response(JSON.stringify({error:'Session expired'}),{status:401});sibling=options.signal??undefined;return new Promise<Response>((_,reject)=>sibling?.addEventListener('abort',()=>reject(new DOMException('Aborted','AbortError')),{once:true}));}));
 render(<MediaSharingPanel accountId="owner" onClose={()=>{}}/>);expect(await screen.findByRole('alert')).toHaveTextContent('Session expired');expect(sibling?.aborted).toBe(true);
});
it('aborts an in-flight sharing mutation when its account panel unmounts',async()=>{
 const libraries=[{id:'lib',name:'Movies',friendIds:['friend']}];let mutation:AbortSignal|undefined;
 const fetcher=vi.fn(async(path:string,options:RequestInit)=>{if(options.method==='POST'){mutation=options.signal??undefined;return new Promise<Response>((_,reject)=>mutation?.addEventListener('abort',()=>reject(new DOMException('Aborted','AbortError')),{once:true}));}return new Response(JSON.stringify(path==='/api/contacts'?{contacts:[{status:'accepted',user:{id:'friend',displayName:'Alice'}}]}:{libraries}));});vi.stubGlobal('fetch',fetcher);
 const view=render(<MediaSharingPanel accountId="owner" onClose={()=>{}}/>);fireEvent.click(await screen.findByRole('button',{name:'Revoke access for Alice to Movies'}));await waitFor(()=>expect(mutation).toBeDefined());view.unmount();expect(mutation?.aborted).toBe(true);
});
