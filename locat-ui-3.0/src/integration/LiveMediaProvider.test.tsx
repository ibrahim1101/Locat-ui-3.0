import {act,fireEvent,render,screen,waitFor} from '@testing-library/react';
import {afterEach,expect,it,vi} from 'vitest';
import {LiveMediaProvider} from './LiveMediaProvider';
import {useLiveMedia} from './liveMedia';
vi.mock('../app/session',()=>({useSession:()=>({user:{id:'media-owner'},connection:{mode:'server'}})}));
vi.mock('./localMediaStore',async()=>({...await vi.importActual('./localMediaStore'),readMedia:vi.fn(async()=>[])}));
afterEach(()=>{vi.unstubAllGlobals();vi.restoreAllMocks();});
function Probe(){const media=useLiveMedia();return <><button onClick={()=>void media.refreshServer?.()}>Refresh</button><p>{media.serverLibraries?.map(row=>row.name).join(',')}</p><p>{media.serverError}</p></>;}
function deferred(){let resolve!:(value:Response)=>void;const promise=new Promise<Response>(done=>{resolve=done;});return {promise,resolve};}
const snapshot=(name:string)=>new Response(JSON.stringify({items:[],libraries:[{name,count:0,available:true}]}),{status:200});
it('sends the expected owner, cancels replaced loads and ignores late older refreshes',async()=>{
 const first=deferred(),second=deferred(),third=deferred();const fetch=vi.fn().mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise).mockReturnValueOnce(third.promise);vi.stubGlobal('fetch',fetch);
 const {unmount}=render(<LiveMediaProvider><Probe/></LiveMediaProvider>);await waitFor(()=>expect(fetch).toHaveBeenCalledTimes(1));expect(fetch.mock.calls[0][1].headers).toMatchObject({'X-Locat-Account':'media-owner'});
 fireEvent.click(screen.getByRole('button',{name:'Refresh'}));expect(fetch.mock.calls[0][1].signal.aborted).toBe(true);await act(async()=>{second.resolve(snapshot('Latest library'));});expect(screen.getByText('Latest library')).toBeVisible();await act(async()=>{first.resolve(snapshot('Obsolete library'));});expect(screen.queryByText('Obsolete library')).toBeNull();expect(screen.getByText('Latest library')).toBeVisible();
 fireEvent.click(screen.getByRole('button',{name:'Refresh'}));unmount();expect(fetch.mock.calls[2][1].signal.aborted).toBe(true);await act(async()=>{third.resolve(snapshot('Closed library'));});
});
it('reports a failed refresh without replacing the last successful snapshot',async()=>{
 vi.stubGlobal('fetch',vi.fn().mockResolvedValueOnce(snapshot('Existing library')).mockResolvedValueOnce(new Response(JSON.stringify({error:'Media access denied'}),{status:403})));
 render(<LiveMediaProvider><Probe/></LiveMediaProvider>);await screen.findByText('Existing library');fireEvent.click(screen.getByRole('button',{name:'Refresh'}));await screen.findByText('Media access denied');expect(screen.getByText('Existing library')).toBeVisible();
});
