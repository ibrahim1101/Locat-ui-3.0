export const PHOTO_THUMBNAIL_EDGE=320,PHOTO_THUMBNAIL_BYTES=128*1024,PHOTO_THUMBNAIL_SOURCE_BYTES=16*1024*1024,PHOTO_THUMBNAIL_PIXELS=16*1024*1024;
export const PHOTO_THUMBNAIL_BATCH_MS=5000;
export function photoThumbnailDimensions(width:number,height:number):{width:number;height:number}|null{
 if(!Number.isFinite(width)||!Number.isFinite(height)||width<=0||height<=0||width*height>PHOTO_THUMBNAIL_PIXELS)return null;
 const scale=Math.min(1,PHOTO_THUMBNAIL_EDGE/Math.max(width,height));
 return {width:Math.max(1,Math.round(width*scale)),height:Math.max(1,Math.round(height*scale))};
}
/** Optional cache only: failure or timeout must never prevent importing the original. */
export async function createPhotoThumbnail(file:Blob,deadlineMs=2000):Promise<Blob|null>{
 if(file.size>PHOTO_THUMBNAIL_SOURCE_BYTES||typeof createImageBitmap!=='function'||deadlineMs<=0)return null;
 let expired=false,bitmap:ImageBitmap|null=null,timer:ReturnType<typeof setTimeout>|undefined;
 const close=()=>{try{bitmap?.close();}catch{/* Cache cleanup cannot block the original import. */}bitmap=null;};
 const render=async()=>{
  const decoded=await createImageBitmap(file,{imageOrientation:'from-image'});
  if(expired){decoded.close();return null;}
  bitmap=decoded;const dimensions=photoThumbnailDimensions(decoded.width,decoded.height);if(!dimensions)return null;
  const canvas=document.createElement('canvas');canvas.width=dimensions.width;canvas.height=dimensions.height;
  const context=canvas.getContext('2d');if(!context)return null;context.drawImage(decoded,0,0,dimensions.width,dimensions.height);
  const result=await new Promise<Blob|null>(resolve=>canvas.toBlob(resolve,'image/webp',0.8));
  return !expired&&result&&result.size>0&&result.size<=PHOTO_THUMBNAIL_BYTES&&['image/webp','image/png'].includes(result.type)?result:null;
 };
 try{return await Promise.race([render().catch(()=>null),new Promise<null>(resolve=>{timer=setTimeout(()=>{expired=true;close();resolve(null);},Math.min(2000,deadlineMs));})]);}
 finally{expired=true;if(timer!==undefined)clearTimeout(timer);close();}
}
