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
