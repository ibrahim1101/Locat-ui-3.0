import {afterEach,expect,it,vi} from 'vitest';
import {connectRealtime} from './realtimeConnection';
class Socket{
 static OPEN=1;static CONNECTING=0;static instances:Socket[]=[];
 readyState=0;bufferedAmount=0;onmessage:((event:{data:string})=>void)|null=null;onclose:((event:{code:number})=>void)|null=null;onerror:(()=>void)|null=null;
 send=vi.fn();close=vi.fn(()=>{this.readyState=3;this.onclose?.({code:1006});});
 constructor(public url:URL){Socket.instances.push(this);}
 ready(){this.readyState=1;this.onmessage?.({data:JSON.stringify({type:'ready',protocolVersion:1})});}
}
afterEach(()=>{Socket.instances=[];vi.useRealTimers();vi.unstubAllGlobals();vi.restoreAllMocks();});
it('uses only same-origin URL and browser cookies, heartbeats, backs off and disposes',async()=>{
 vi.useFakeTimers();vi.spyOn(Math,'random').mockReturnValue(0.5);vi.stubGlobal('WebSocket',Socket);const state=vi.fn(),expired=vi.fn();const stop=connectRealtime(state,expired);
 const first=Socket.instances[0];expect(first.url.pathname).toBe('/api/connect/socket');expect(first.url.search).toBe('');expect(first.url.host).toBe(window.location.host);first.ready();expect(state).toHaveBeenLastCalledWith('connected');
 await vi.advanceTimersByTimeAsync(15000);expect(first.send).toHaveBeenCalledWith(JSON.stringify({type:'ping',id:'1'}));first.onmessage?.({data:JSON.stringify({type:'pong',id:'1'})});
 first.close();await vi.advanceTimersByTimeAsync(999);expect(Socket.instances).toHaveLength(1);await vi.advanceTimersByTimeAsync(1);expect(Socket.instances).toHaveLength(2);
 stop();await vi.advanceTimersByTimeAsync(60000);expect(Socket.instances).toHaveLength(2);expect(expired).not.toHaveBeenCalled();
});
it('stops reconnecting on confirmed session expiry and rejects invalid frames',async()=>{
 vi.useFakeTimers();vi.stubGlobal('WebSocket',Socket);const state=vi.fn(),expired=vi.fn();const stop=connectRealtime(state,expired);Socket.instances[0].onclose?.({code:4001});await vi.advanceTimersByTimeAsync(60000);expect(expired).toHaveBeenCalledOnce();expect(state).toHaveBeenLastCalledWith('session-expired');expect(Socket.instances).toHaveLength(1);stop();
 const finish=connectRealtime(state,expired);const second=Socket.instances[1];second.onmessage?.({data:'{invalid'});expect(second.close).toHaveBeenCalled();finish();
});
