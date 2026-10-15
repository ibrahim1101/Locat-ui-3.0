import {afterEach,expect,it,vi} from 'vitest';
import {createPhotoThumbnail,photoThumbnailDimensions,PHOTO_THUMBNAIL_BYTES,PHOTO_THUMBNAIL_SOURCE_BYTES} from './photoThumbnail';
afterEach(()=>{vi.restoreAllMocks();vi.unstubAllGlobals();vi.useRealTimers();});
function bitmap(width=4800,height=3200){return {width,height,close:vi.fn()} as unknown as ImageBitmap;}
it('preserves aspect ratio without upscaling and rejects excessive or invalid dimensions',()=>{
 expect(photoThumbnailDimensions(4800,3200)).toEqual({width:320,height:213});expect(photoThumbnailDimensions(100,200)).toEqual({width:100,height:200});expect(photoThumbnailDimensions(1,500)).toEqual({width:1,height:320});
 for(const [width,height] of [[0,1],[-1,20],[NaN,1],[1,Infinity],[20000,20000]])expect(photoThumbnailDimensions(width,height)).toBeNull();
});
it('creates a bounded transparent-capable cache and closes decoded resources',async()=>{
 const decoded=bitmap(),drawImage=vi.fn(),thumbnail=new Blob(['cache'],{type:'image/webp'}),source=new Blob(['original']);vi.stubGlobal('createImageBitmap',vi.fn(async()=>decoded));vi.spyOn(HTMLCanvasElement.prototype,'getContext').mockReturnValue({drawImage} as unknown as CanvasRenderingContext2D);vi.spyOn(HTMLCanvasElement.prototype,'toBlob').mockImplementation(callback=>callback(thumbnail));
 expect(await createPhotoThumbnail(source)).toBe(thumbnail);expect(drawImage).toHaveBeenCalledWith(decoded,0,0,320,213);expect(decoded.close).toHaveBeenCalledOnce();expect(source.size).toBe(8);
});
it('falls back when decoding is unavailable, source is oversized or encoding exceeds cache limits',async()=>{
 const decode=vi.fn(async()=>bitmap());vi.stubGlobal('createImageBitmap',undefined);expect(await createPhotoThumbnail(new Blob())).toBeNull();vi.stubGlobal('createImageBitmap',decode);expect(await createPhotoThumbnail({size:PHOTO_THUMBNAIL_SOURCE_BYTES+1} as Blob)).toBeNull();expect(decode).not.toHaveBeenCalled();
 vi.spyOn(HTMLCanvasElement.prototype,'getContext').mockReturnValue({drawImage:vi.fn()} as unknown as CanvasRenderingContext2D);vi.spyOn(HTMLCanvasElement.prototype,'toBlob').mockImplementation(callback=>callback(new Blob([new Uint8Array(PHOTO_THUMBNAIL_BYTES+1)],{type:'image/webp'})));expect(await createPhotoThumbnail(new Blob())).toBeNull();
});
it('bounds a stalled decode and closes its late bitmap without publishing a cache',async()=>{
 vi.useFakeTimers();let resolve!:(value:ImageBitmap)=>void;const late=new Promise<ImageBitmap>(done=>{resolve=done;});vi.stubGlobal('createImageBitmap',vi.fn(()=>late));const result=createPhotoThumbnail(new Blob());await vi.advanceTimersByTimeAsync(2000);expect(await result).toBeNull();const decoded=bitmap();resolve(decoded);await Promise.resolve();await Promise.resolve();expect(decoded.close).toHaveBeenCalledOnce();expect(vi.getTimerCount()).toBe(0);
});
it('bounds stalled encoding and closes the decoded bitmap once',async()=>{
 vi.useFakeTimers();const decoded=bitmap();vi.stubGlobal('createImageBitmap',vi.fn(async()=>decoded));vi.spyOn(HTMLCanvasElement.prototype,'getContext').mockReturnValue({drawImage:vi.fn()} as unknown as CanvasRenderingContext2D);let finish!:BlobCallback;vi.spyOn(HTMLCanvasElement.prototype,'toBlob').mockImplementation(callback=>{finish=callback;});const result=createPhotoThumbnail(new Blob());await vi.advanceTimersByTimeAsync(2000);expect(await result).toBeNull();finish(new Blob(['late'],{type:'image/webp'}));await Promise.resolve();expect(decoded.close).toHaveBeenCalledOnce();expect(vi.getTimerCount()).toBe(0);
});
