import {useEffect,useRef,useState,type FormEvent} from 'react';
import {Button,TextField} from '../ui';
import {discoverHomeserver,homeserverOrigin,type ServerDiscovery} from './serverDiscovery';

export function LiveServerSetup(){
 const [address,setAddress]=useState(window.location.origin);
 const [server,setServer]=useState<ServerDiscovery|null>(null),[destination,setDestination]=useState<string|null>(null);
 const [error,setError]=useState(''),[busy,setBusy]=useState(false);
 const request=useRef<AbortController|null>(null);
 useEffect(()=>()=>{request.current?.abort();request.current=null;},[]);
 function changeAddress(value:string){
  request.current?.abort();request.current=null;
  setAddress(value);setServer(null);setDestination(null);setError('');setBusy(false);
 }
 async function check(event:FormEvent){
  event.preventDefault();request.current?.abort();request.current=null;
  setServer(null);setDestination(null);setError('');setBusy(false);
  let origin:string;
  try{origin=homeserverOrigin(address);}catch(error){setError(error instanceof Error?error.message:'Invalid server address.');return;}
  // Keep connect-src 'self'. Another origin is opened only by explicit user action;
  // discovery can then run there without proxying credentials or weakening CSP.
  if(origin!==window.location.origin){setDestination(origin);return;}
  const controller=new AbortController();request.current=controller;setBusy(true);
  const deadline=setTimeout(()=>controller.abort(),5000);
  try{const result=await discoverHomeserver(origin,controller.signal);if(request.current===controller&&!controller.signal.aborted)setServer(result);}
  catch(error){if(request.current===controller)setError(controller.signal.aborted?'Server check timed out or was cancelled.':error instanceof Error?error.message:'Server unavailable.');}
  finally{clearTimeout(deadline);if(request.current===controller){request.current=null;setBusy(false);}}
 }
 return <div className="space-y-5">
  <h1 className="text-2xl font-extrabold">Connect to your server</h1>
  <p className="text-sm text-ink-2">Enter your trusted LAN or public HTTPS address. For another server, review and open its address first, then check it from its own sign-in page. No account credentials are sent during a server check.</p>
  <form onSubmit={check} className="space-y-4">
   <TextField label="Server address" value={address} onChange={event=>changeAddress(event.target.value)} autoCapitalize="off" autoCorrect="off" spellCheck={false} inputMode="url" required/>
   <Button type="submit" disabled={busy}>Check server</Button>
  </form>
  {error&&<p role="alert" className="text-sm text-danger">{error}</p>}
  {destination&&<div className="space-y-3 rounded-xl bg-s1 p-4 hairline">
   <p className="text-sm font-semibold">Address not checked</p>
   <p className="break-all font-mono text-sm">{destination}</p>
   <p className="text-xs text-ink-3">Verify this address with your operator before opening it. This address has not been verified here. Accounts, device keys and files are not migrated; the destination uses its own browser storage and sign-in.</p>
   <Button onClick={()=>window.location.assign(destination)}>Open this address</Button>
  </div>}
  {server&&<div className="space-y-3 rounded-xl bg-s1 p-4 hairline">
   <p className="break-all font-mono text-sm">{server.origin}</p>
   <p className="break-all text-xs text-ink-3">Instance ID: {server.serverId}</p>
   <p className="text-xs text-ink-3">This identifier is advertised by the server, not an independently verified cryptographic identity. Check the address with your operator. Accounts and encrypted browser data are not migrated when changing servers.</p>
   <Button onClick={()=>window.location.assign(server.origin)}>Open this server</Button>
  </div>}
  <p className="text-xs text-ink-3">Automatic LAN discovery and native cross-server sessions are pending. Browser sign-in stays on the server you open.</p>
 </div>;
}
