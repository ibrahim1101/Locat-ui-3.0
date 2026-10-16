import {afterEach,expect,it,vi} from 'vitest';
import {checkMediaImport,mediaStorageError,MAX_BROWSER_IMPORT_BYTES} from './mediaStoragePolicy';
afterEach(()=>{vi.restoreAllMocks();vi.unstubAllGlobals();});
it('rejects the reported 13GB file and oversized batches before consulting storage or copying bytes',async()=>{
 const estimate=vi.fn();vi.stubGlobal('navigator',{storage:{estimate}});
 await expect(checkMediaImport([{name:'Onimusha_all_boss.mkv',size:13191223154}])).rejects.toThrow('Open video without copying');expect(estimate).not.toHaveBeenCalled();
 await expect(checkMediaImport([{name:'a',size:MAX_BROWSER_IMPORT_BYTES},{name:'b',size:1}])).rejects.toThrow('per batch');
});
it('checks remaining quota with a reserve and allows missing estimates without swallowing actual quota errors',async()=>{
 vi.stubGlobal('navigator',{storage:{estimate:vi.fn(async()=>({quota:100*1024*1024,usage:95*1024*1024}))}});
 await expect(checkMediaImport([{name:'small.mp4',size:1024}])).rejects.toThrow('Nothing was copied');
 vi.stubGlobal('navigator',{storage:{estimate:vi.fn(async()=>{throw new Error('Unavailable');})}});
 await expect(checkMediaImport([{name:'small.mp4',size:1024}])).resolves.toBeUndefined();
 expect(mediaStorageError(new DOMException('Storage full','QuotaExceededError')).message).toContain('No files in this batch were saved');
});
