import {afterEach,expect,it,vi} from 'vitest';
import {monitorConnection} from './connectionMonitor';
afterEach(()=>{vi.useRealTimers();vi.unstubAllGlobals();vi.restoreAllMocks();});
it('backs off failed checks, reacts to network events and stops after disposal',async()=>{
 vi.useFakeTimers();vi.spyOn(Math,'random').mockReturnValue(0.5);
 const fetch=vi.fn().mockRejectedValueOnce(new Error('offline')).mockResolvedValue({ok:true,json:async()=>({app:'Locat'})});vi.stubGlobal('fetch',fetch);const report=vi.fn();const stop=monitorConnection(report);
 await vi.advanceTimersByTimeAsync(0);expect(report).toHaveBeenLastCalledWith('unreachable');
 await vi.advanceTimersByTimeAsync(999);expect(fetch).toHaveBeenCalledTimes(1);
 await vi.advanceTimersByTimeAsync(1);expect(report).toHaveBeenLastCalledWith('connected');
 window.dispatchEvent(new Event('online'));await vi.advanceTimersByTimeAsync(0);expect(fetch).toHaveBeenCalledTimes(3);
 stop();await vi.advanceTimersByTimeAsync(30000);window.dispatchEvent(new Event('online'));expect(fetch).toHaveBeenCalledTimes(3);
});
it('aborts an outstanding probe on cleanup without reporting stale results',async()=>{
 vi.useFakeTimers();let signal:AbortSignal;vi.stubGlobal('fetch',vi.fn((_path,init)=>{signal=init.signal;return new Promise((_resolve,reject)=>signal.addEventListener('abort',()=>reject(new Error('aborted'))));}));const report=vi.fn();const stop=monitorConnection(report);stop();await vi.advanceTimersByTimeAsync(10000);expect(signal!.aborted).toBe(true);expect(report).not.toHaveBeenCalled();
});
