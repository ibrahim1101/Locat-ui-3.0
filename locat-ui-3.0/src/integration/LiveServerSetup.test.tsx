import {afterEach,expect,it,vi} from 'vitest';
import {render,screen,fireEvent,cleanup,waitFor} from '@testing-library/react';
import {LiveServerSetup} from './LiveServerSetup';
import {discoverHomeserver} from './serverDiscovery';
vi.mock('./serverDiscovery',async importOriginal=>({...await importOriginal<typeof import('./serverDiscovery')>(),discoverHomeserver:vi.fn()}));
afterEach(()=>{cleanup();vi.clearAllMocks();});
it('reviews a validated different origin without fetching or claiming a verified server',()=>{
 render(<LiveServerSetup/>);fireEvent.change(screen.getByLabelText('Server address'),{target:{value:'https://other.locat.invalid'}});fireEvent.click(screen.getByRole('button',{name:'Check server'}));
 expect(screen.getByText('Address not checked')).toBeVisible();expect(screen.getByText('https://other.locat.invalid')).toBeVisible();expect(screen.getByRole('button',{name:'Open this address'})).toBeEnabled();expect(discoverHomeserver).not.toHaveBeenCalled();expect(screen.queryByText(/Instance ID:/)).toBeNull();
 fireEvent.change(screen.getByLabelText('Server address'),{target:{value:'https://user:secret@other.locat.invalid'}});fireEvent.click(screen.getByRole('button',{name:'Check server'}));expect(screen.getByRole('alert')).toHaveTextContent(/without credentials/);expect(screen.queryByRole('button',{name:'Open this address'})).toBeNull();expect(discoverHomeserver).not.toHaveBeenCalled();
});
it('checks the current origin and ignores a stale result after the address is edited',async()=>{
 let resolve!: (value:Awaited<ReturnType<typeof discoverHomeserver>>)=>void;
 vi.mocked(discoverHomeserver).mockReturnValueOnce(new Promise(done=>{resolve=done;}));
 render(<LiveServerSetup/>);fireEvent.click(screen.getByRole('button',{name:'Check server'}));expect(discoverHomeserver).toHaveBeenCalledWith(window.location.origin,expect.any(AbortSignal));
 fireEvent.change(screen.getByLabelText('Server address'),{target:{value:'https://other.locat.invalid'}});fireEvent.click(screen.getByRole('button',{name:'Check server'}));
 resolve({app:'Locat',protocolVersion:1,serverId:'d95426f0-df52-45bc-b831-182975e41712',origin:window.location.origin,capabilities:{sameOriginApi:true,privateMessaging:false,federation:false,webSocket:true}});
 await waitFor(()=>expect(screen.getByText('Address not checked')).toBeVisible());expect(screen.queryByText(/Instance ID:/)).toBeNull();expect(screen.getByRole('button',{name:'Check server'})).toBeEnabled();
});
