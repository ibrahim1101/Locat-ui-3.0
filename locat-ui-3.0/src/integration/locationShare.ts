export type LocationPrecision = 'approximate'|'precise';
export type DeviceLocation = {latitude:number;longitude:number;accuracy:number};

export function formatEncryptedLocation(location:DeviceLocation,precision:LocationPrecision){
 const {latitude,longitude,accuracy}=location;
 if(!Number.isFinite(latitude)||latitude < -90||latitude > 90||!Number.isFinite(longitude)||longitude < -180||longitude > 180||!Number.isFinite(accuracy)||accuracy < 0||accuracy > 1_000_000)throw new Error('The device returned an invalid location.');
 const digits=precision==='approximate'?2:5,lat=Number(latitude.toFixed(digits)),lng=Number(longitude.toFixed(digits));
 const zoom=precision==='approximate'?12:17,reportedAccuracy=Math.max(1,Math.round(accuracy/10)*10);
 const map=`https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=${zoom}/${lat}/${lng}`;
 return `📍 Shared location · ${precision}\n${map}\nDevice reported accuracy: about ±${reportedAccuracy} m.`;
}
