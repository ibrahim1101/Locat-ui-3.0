import {afterEach,expect,it,vi} from 'vitest';
import {encryptHistoryExport} from './matrixHistory';
afterEach(()=>vi.unstubAllGlobals());
it('bounds inputs before creating a worker and terminates encryption on cancellation',async()=>{
 const construct=vi.fn();vi.stubGlobal('Worker',construct);
 await expect(encryptHistoryExport('[]','short')).rejects.toThrow('12');expect(construct).not.toHaveBeenCalled();
 const controller=new AbortController(),terminate=vi.fn(),postMessage=vi.fn();vi.stubGlobal('Worker',class{terminate=terminate;postMessage=postMessage;});
 const pending=encryptHistoryExport('[]','synthetic-export-passphrase',controller.signal);controller.abort();await expect(pending).rejects.toThrow('cancelled');expect(terminate).toHaveBeenCalledOnce();
});
it('returns only a bounded standard armored export and terminates its worker',async()=>{
 const terminate=vi.fn();let receive:(event:{data:unknown})=>void=()=>{};vi.stubGlobal('Worker',class{terminate=terminate;set onmessage(value:typeof receive){receive=value;}postMessage(){}});
 const pending=encryptHistoryExport('[]','synthetic-export-passphrase');receive({data:{encrypted:'-----BEGIN MEGOLM SESSION DATA-----\nsynthetic\n-----END MEGOLM SESSION DATA-----'}});expect(await pending).toContain('BEGIN MEGOLM');expect(terminate).toHaveBeenCalledOnce();
 const rejected=encryptHistoryExport('[]','synthetic-export-passphrase');receive({data:{encrypted:'plaintext keys'}});await expect(rejected).rejects.toThrow('could not be encrypted');
});
