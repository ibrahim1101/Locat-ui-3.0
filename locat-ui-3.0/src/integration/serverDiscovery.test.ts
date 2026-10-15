import {afterEach,expect,it,vi} from 'vitest';
import {discoverHomeserver,homeserverOrigin} from './serverDiscovery';
afterEach(()=>vi.unstubAllGlobals());
it('accepts origin-only HTTPS and loopback HTTP, rejects credential and mixed-content destinations',()=>{
 expect(homeserverOrigin(' https://locat.example/ ')).toBe('https://locat.example');
 expect(homeserverOrigin('http://127.0.0.1:8787')).toBe('http://127.0.0.1:8787');
 for(const url of ['http://192.168.1.2','http://localhost.evil.test','https://a:b@host','https://host/path','https://host/?token=secret','file:///tmp/x','javascript:alert(1)'])expect(()=>homeserverOrigin(url)).toThrow();
});
it('validates discovery and never sends credentials or follows server redirects',async()=>{
 const value={app:'Locat',protocolVersion:1,serverId:'d95426f0-df52-45bc-b831-182975e41712',origin:'https://locat.test',capabilities:{sameOriginApi:true,privateMessaging:false,federation:false,webSocket:false}};
 const fetch=vi.fn().mockImplementation(async()=>new Response(JSON.stringify(value)));vi.stubGlobal('fetch',fetch);
 expect(await discoverHomeserver(value.origin)).toEqual(value);
 expect(fetch.mock.calls[0][1]).toMatchObject({credentials:'omit',redirect:'error',cache:'no-store'});
 value.origin='https://evil.test';await expect(discoverHomeserver('https://locat.test')).rejects.toThrow(/compatible/);
 fetch.mockResolvedValue(new Response('a'.repeat(8193)));await expect(discoverHomeserver('https://locat.test')).rejects.toThrow(/Invalid/);
});
