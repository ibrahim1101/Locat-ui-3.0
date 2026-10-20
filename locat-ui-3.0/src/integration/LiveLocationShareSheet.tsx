import {useState} from 'react';
import {MapPin,ShieldCheck} from 'lucide-react';
import {Banner,Button,Segmented,Sheet} from '../ui';
import {formatEncryptedLocation,type DeviceLocation,type LocationPrecision} from './locationShare';

export function LiveLocationShareSheet({open,onClose,onSend}:{open:boolean;onClose():void;onSend(message:string):Promise<void>}){
 const [precision,setPrecision]=useState<LocationPrecision>('approximate'),[location,setLocation]=useState<DeviceLocation|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const close=()=>{if(!busy){setError('');setLocation(null);setPrecision('approximate');onClose();}};
 const locate=()=>{
  setError('');setLocation(null);
  if(!navigator.geolocation){setError('This browser does not provide location access.');return;}
  setBusy(true);
  navigator.geolocation.getCurrentPosition(position=>{setLocation({latitude:position.coords.latitude,longitude:position.coords.longitude,accuracy:position.coords.accuracy});setBusy(false);},reason=>{setError(reason.code===1?'Location permission was denied. Allow it in your browser settings, then try again.':reason.code===3?'Location lookup timed out. Try again when the device has a clearer signal.':'Current location is unavailable. Try again or check device location settings.');setBusy(false);},{enableHighAccuracy:precision==='precise',maximumAge:0,timeout:20000});
 };
 const send=async()=>{if(!location||busy)return;setBusy(true);setError('');try{await onSend(formatEncryptedLocation(location,precision));setLocation(null);onClose();}catch(reason){setError(reason instanceof Error?reason.message:'Encrypted location was not confirmed.');}finally{setBusy(false);}};
 return <Sheet open={open} onClose={close} title="Share location once" description="Your current position is sent only after you review and confirm." size="sm" testId="live-location-share" footer={location?<Button variant="primary" icon={MapPin} loading={busy} onClick={()=>void send()} data-testid="send-location-once">Share once</Button>:<Button variant="primary" icon={MapPin} loading={busy} onClick={locate} data-testid="locate-device">Get current location</Button>}>
  <div className="space-y-4">
   <Banner tone="info" icon={ShieldCheck} title="One-time, end-to-end encrypted share">Locat asks your device for location only when you tap Get current location. No background tracking is used.</Banner>
   <Segmented label="Location detail" value={precision} onChange={value=>{setPrecision(value);setLocation(null);}} options={[{value:'approximate',label:'Approximate · ~1 km'},{value:'precise',label:'Precise · ~1 m'}]} size="sm" />
   {location&&<div className="rounded-xl bg-s1 p-4 hairline" role="status"><p className="text-sm font-medium">Ready for review</p><p className="mt-1 text-xs text-ink-3">{precision==='approximate'?'Coordinates will be rounded to about 1 km.':'Coordinates will be rounded to about 1 m.'} The device reports accuracy ±{Math.round(location.accuracy)} m. Share once to send this inside the encrypted conversation.</p></div>}
   {error&&<p role="alert" className="text-sm text-danger">{error}</p>}
  </div>
 </Sheet>;
}
