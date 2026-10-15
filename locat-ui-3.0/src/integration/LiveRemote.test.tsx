import {fireEvent,render,screen,waitFor} from '@testing-library/react';import {MemoryRouter} from 'react-router';import {afterEach,beforeEach,expect,it,vi} from 'vitest';import {LiveRemote} from './LiveRemote';
const {calls,session,start,dispose}=vi.hoisted(()=>({calls:[] as string[],session:{user:{id:'remote-owner'}},start:vi.fn(),dispose:vi.fn()}));
vi.mock('../app/session',()=>({useSession:()=>session}));
vi.mock('./linkClient',()=>({BrowserLinkClient:class{close=vi.fn();sharedKey=async()=>{calls.push('pin');return {};};request=async(path:string)=>{calls.push(path);return path==='devices'?{currentDeviceId:2,devices:[{id:1,name:'Viewer',publicKey:'viewer',revokedAt:null},{id:2,name:'Host',publicKey:'host',revokedAt:null}],pairs:[{id:'pair',deviceA:1,deviceB:2,status:'verified'}]}:path==='remote/sessions'?{sessions:[{id:'session',userId:'remote-owner',pairId:'pair',viewer:1,host:2,status:'pending',expiresAt:10000}]}:{ok:true};};}}));
vi.mock('./remoteSession',()=>({BrowserRemoteSession:class{constructor(readonly client:unknown,readonly session:unknown){}start=start;dispose=dispose;stop=vi.fn();}}));
beforeEach(()=>{calls.length=0;vi.clearAllMocks();start.mockResolvedValue(undefined);vi.stubGlobal('RTCPeerConnection',vi.fn());});afterEach(()=>vi.unstubAllGlobals());
it('does not capture until explicit approval and asks the browser before approving on the server',async()=>{
 const stop=vi.fn(),track={stop};const stream={getTracks:()=>[track],getVideoTracks:()=>[track]} as unknown as MediaStream;const picker=vi.fn(async()=>{calls.push('capture-picker');return stream;});vi.stubGlobal('navigator',{mediaDevices:{getDisplayMedia:picker}});
 render(<MemoryRouter><LiveRemote/></MemoryRouter>);const approve=await screen.findByRole('button',{name:'Choose screen and approve'});expect(picker).not.toHaveBeenCalled();expect(calls).not.toContain('remote/decide');fireEvent.click(approve);
 await waitFor(()=>expect(start).toHaveBeenCalledWith(stream));expect(calls.indexOf('capture-picker')).toBeLessThan(calls.indexOf('remote/decide'));expect(picker).toHaveBeenCalledWith({video:true,audio:false});
});
it('stops a selected capture if peer/session setup fails',async()=>{
 start.mockRejectedValue(new Error('Session setup failed'));const stop=vi.fn(),track={stop};vi.stubGlobal('navigator',{mediaDevices:{getDisplayMedia:async()=>({getTracks:()=>[track],getVideoTracks:()=>[track]})}});
 render(<MemoryRouter><LiveRemote/></MemoryRouter>);fireEvent.click(await screen.findByRole('button',{name:'Choose screen and approve'}));await screen.findByText('Session setup failed');expect(stop).toHaveBeenCalled();
});
it('local mode cannot request screen capture or remote authorization',()=>{
 const original=session.user;session.user=null as unknown as typeof original;const picker=vi.fn();vi.stubGlobal('navigator',{mediaDevices:{getDisplayMedia:picker}});
 try{render(<MemoryRouter><LiveRemote/></MemoryRouter>);expect(screen.getByText('Sign in and pair devices first')).toBeVisible();expect(calls).toEqual([]);expect(picker).not.toHaveBeenCalled();}finally{session.user=original;}
});
it('keeps external traversal off until explicit consent and disables relay-only otherwise',async()=>{
 render(<MemoryRouter><LiveRemote/></MemoryRouter>);const traversal=await screen.findByRole('switch',{name:'Allow server-configured STUN/TURN'});const relay=screen.getByRole('switch',{name:'Use TURN relay only'});expect(traversal).toHaveAttribute('aria-checked','false');expect(relay).toBeDisabled();expect(calls).not.toContain('connectivity');fireEvent.click(traversal);expect(relay).toBeEnabled();fireEvent.click(relay);expect(relay).toHaveAttribute('aria-checked','true');fireEvent.click(traversal);expect(relay).toHaveAttribute('aria-checked','false');expect(relay).toBeDisabled();
});
