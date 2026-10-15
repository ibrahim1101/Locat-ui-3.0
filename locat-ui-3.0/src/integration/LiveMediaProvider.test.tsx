import {act,fireEvent,render,screen,waitFor} from '@testing-library/react';
import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import {LiveMediaProvider} from './LiveMediaProvider';
import {useLiveMedia} from './liveMedia';
import {readMedia,writeMedia,type LocalMediaItem} from './localMediaStore';
import {createPhotoThumbnail} from './photoThumbnail';
vi.mock('../app/session',()=>({useSession:()=>({user:{id:'media-owner'},connection:{mode:'server'}})}));
vi.mock('./localMediaStore',async()=>({...await vi.importActual('./localMediaStore'),readMedia:vi.fn(async()=>[]),writeMedia:vi.fn(async()=>{})}));
vi.mock('./photoThumbnail',async()=>({...await vi.importActual('./photoThumbnail'),createPhotoThumbnail:vi.fn(async()=>null)}));
beforeEach(()=>{vi.clearAllMocks();vi.mocked(readMedia).mockResolvedValue([]);});
afterEach(()=>{vi.unstubAllGlobals();vi.restoreAllMocks();});
function Probe(){const media=useLiveMedia();return <><button onClick={()=>void media.refreshServer?.()}>Refresh</button><p>{media.serverLibraries?.map(row=>row.name).join(',')}</p><p>{media.serverError}</p><p>{media.error}</p><p>{media.loading?"Loading device":"Device ready"}</p><p>{media.serverLoading?"Server loading":"Server settled"}</p><p>{media.importing?"Importing":"Idle"}</p><p>{media.items.map(item=>item.name).join(",")}</p><input type="file" aria-label="Test import" onChange={event=>{if(event.target.files)void media.importFiles(Array.from(event.target.files));}}/></>;}
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

it('keeps originals and the same IDs when an optional thumbnail batch cannot be stored',async()=>{
 vi.stubGlobal('fetch',vi.fn(async()=>snapshot('Existing library')));const thumbnail=new Blob(['cache'],{type:'image/webp'});vi.mocked(createPhotoThumbnail).mockResolvedValueOnce(thumbnail);vi.mocked(writeMedia).mockRejectedValueOnce(new DOMException('Storage full','QuotaExceededError')).mockResolvedValueOnce(undefined);
 render(<LiveMediaProvider><Probe/></LiveMediaProvider>);await screen.findByText('Existing library');const file=new File(['original'],'original.png',{type:'image/png'});fireEvent.change(screen.getByLabelText('Test import'),{target:{files:[file]}});await screen.findByText('original.png');await waitFor(()=>expect(screen.getByText('Idle')).toBeVisible());expect(writeMedia).toHaveBeenCalledTimes(2);const first=vi.mocked(writeMedia).mock.calls[0][1][0],second=vi.mocked(writeMedia).mock.calls[1][1][0];expect(first.thumbnail).toBe(thumbnail);expect(second.thumbnail).toBeUndefined();expect(second.id).toBe(first.id);expect(second.file).toBe(file);expect(first.file).toBe(file);expect(writeMedia).toHaveBeenNthCalledWith(2,'media-owner',[second]);
});

function storedPhoto():LocalMediaItem{return {id:'stored',kind:'photo',name:'existing.png',file:new Blob(),size:0,addedAt:1,album:'Imported',favorite:false,position:0};}
it('makes local data ready while the authenticated server inventory remains pending',async()=>{
 const remote=deferred();vi.stubGlobal('fetch',vi.fn(()=>remote.promise));vi.mocked(readMedia).mockResolvedValueOnce([storedPhoto()]);const {unmount}=render(<LiveMediaProvider><Probe/></LiveMediaProvider>);
 try{await screen.findByText('existing.png');await waitFor(()=>expect(screen.getByText('Device ready')).toBeVisible());expect(screen.getByText('Server loading')).toBeVisible();}
 finally{unmount();await act(async()=>{remote.resolve(snapshot('Late server'));});}
});
it('waits for initial local hydration before publishing a new import',async()=>{
 let resolve!:(items:LocalMediaItem[])=>void;vi.mocked(readMedia).mockReturnValueOnce(new Promise(done=>{resolve=done;}));vi.stubGlobal('fetch',vi.fn(async()=>snapshot('Server')));const {unmount}=render(<LiveMediaProvider><Probe/></LiveMediaProvider>);
 try{fireEvent.change(screen.getByLabelText('Test import'),{target:{files:[new File(['new'],'new.mp3',{type:'audio/mpeg'})]}});expect(writeMedia).not.toHaveBeenCalled();await act(async()=>{resolve([storedPhoto()]);});await screen.findByText('existing.png,new.mp3');}
 finally{unmount();await act(async()=>{resolve([storedPhoto()]);});}
});
