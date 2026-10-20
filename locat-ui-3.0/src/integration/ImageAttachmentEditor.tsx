import {useEffect,useRef,useState} from 'react';
import {RotateCcw,RotateCw} from 'lucide-react';
import {Button,Sheet,Slider} from '../ui';
import {DEFAULT_IMAGE_EDIT,editedImageFile,renderImageEdit,type CropPreset,type ImageEdit} from '../lib/imageEditing';

const MAX_BYTES=2_900_000;
const MAX_INPUT_BYTES=40_000_000;
const MAX_DECODED_PIXELS=36_000_000;
const CROPS:{value:CropPreset;label:string}[]=[{value:'original',label:'Original'},{value:'square',label:'Square'},{value:'portrait',label:'Portrait'},{value:'wide',label:'Wide'}];
type Decoded={image:CanvasImageSource;width:number;height:number;close?:()=>void};

export function ImageAttachmentEditor({file,onClose,onSend}:{file:File;onClose():void;onSend(file:File):void}){
 const canvas=useRef<HTMLCanvasElement>(null),[decoded,setDecoded]=useState<Decoded>(),[edit,setEdit]=useState<ImageEdit>(DEFAULT_IMAGE_EDIT),[error,setError]=useState(''),[busy,setBusy]=useState(false),[fineTune,setFineTune]=useState(false);
 const sourceError=!file.size||file.size>MAX_INPUT_BYTES?'Choose a photo smaller than 40 MB to edit safely.':'';
 useEffect(()=>{let active=true;let bitmap:ImageBitmap|undefined;
  if(sourceError)return;
  void createImageBitmap(file,{imageOrientation:'from-image'}).then(value=>{bitmap=value;if(!Number.isFinite(value.width)||!Number.isFinite(value.height)||value.width<1||value.height<1||value.width*value.height>MAX_DECODED_PIXELS){value.close();bitmap=undefined;if(active)setError('This photo is too large to edit safely on this device.');return;}if(active)setDecoded({image:value,width:value.width,height:value.height,close:()=>value.close()});else value.close();}).catch(()=>{if(active)setError('This image format could not be previewed on this device. Choose another image or send it as a file.');});
  return()=>{active=false;bitmap?.close();};
 },[file,sourceError]);
 useEffect(()=>{if(!decoded||!canvas.current)return;try{const preview=renderImageEdit(decoded,edit),target=canvas.current;target.width=preview.width;target.height=preview.height;const context=target.getContext('2d');if(!context)throw new Error('Preview is unavailable.');context.drawImage(preview,0,0);}catch(reason){setError(reason instanceof Error?reason.message:'Image preview failed.');}},[decoded,edit]);
 async function sendEdited(){if(!canvas.current||busy)return;setBusy(true);setError('');try{onSend(await editedImageFile(canvas.current,file.name));}catch(reason){setError(reason instanceof Error?reason.message:'Edited image could not be prepared.');}finally{setBusy(false);}}
 const rotate=(amount:number)=>setEdit(value=>({...value,turns:(value.turns+amount+4)%4}));
 return <Sheet open onClose={onClose} title="Prepare photo" description="Preview stays on this device. Choose the original or send a new edited copy." size="lg" testId="image-attachment-editor">
  <div className="space-y-4">
   <div className="grid min-h-48 place-items-center overflow-hidden rounded-2xl bg-canvas p-3 hairline">
    {decoded?<canvas ref={canvas} aria-label="Photo crop preview" className="max-h-[38dvh] max-w-full rounded-lg object-contain"/>:<p role="status" className="text-sm text-ink-3">{error||sourceError||'Preparing private preview…'}</p>}
   </div>
   <div className="flex items-center justify-center gap-2">
    <Button size="sm" icon={RotateCcw} disabled={!decoded||busy} onClick={()=>rotate(-1)}>Rotate left</Button>
    <Button size="sm" icon={RotateCw} disabled={!decoded||busy} onClick={()=>rotate(1)}>Rotate right</Button>
   </div>
   <details open={fineTune} onToggle={event=>setFineTune(event.currentTarget.open)} className="rounded-2xl bg-s2 p-3 hairline">
    <summary className="cursor-pointer list-none text-sm font-semibold">Crop and framing <span className="ml-1 text-xs font-normal text-ink-3">· optional</span></summary>
    <div className="mt-3 space-y-4">
     <div role="group" aria-label="Crop ratio" className="flex flex-wrap gap-2">{CROPS.map(option=><Button key={option.value} size="sm" variant={edit.crop===option.value?'primary':'secondary'} aria-pressed={edit.crop===option.value} disabled={busy} onClick={()=>setEdit(value=>({...value,crop:option.value}))}>{option.label}</Button>)}</div>
     <Slider label="Zoom crop" min={1} max={3} step={0.1} value={edit.zoom} onChange={zoom=>setEdit(value=>({...value,zoom}))} format={value=>`${value.toFixed(1)}×`}/>
     {edit.zoom>1&&<div className="grid gap-4 sm:grid-cols-2"><Slider label="Horizontal crop position" min={0} max={1} step={0.01} value={edit.x} onChange={x=>setEdit(value=>({...value,x}))}/><Slider label="Vertical crop position" min={0} max={1} step={0.01} value={edit.y} onChange={y=>setEdit(value=>({...value,y}))}/></div>}
    </div>
   </details>
   {(error||sourceError)&&<p role="alert" className="rounded-xl bg-danger/10 px-3 py-2 text-sm text-danger">{error||sourceError}</p>}
   <p className="text-xs text-ink-3">Edited copies export as JPEG up to 2.9 MB. Your original file is never changed.</p>
   <div className="flex flex-wrap justify-end gap-2 border-t border-line pt-3">
    <Button variant="ghost" disabled={busy} onClick={onClose}>Cancel</Button>
    <Button disabled={!decoded||busy||file.size>MAX_BYTES} disabledReason={file.size>MAX_BYTES?'Original exceeds the 2.9 MB attachment limit; send an edited copy instead.':undefined} onClick={()=>onSend(file)}>Send original</Button>
    <Button variant="primary" disabled={!decoded||busy} loading={busy} onClick={()=>void sendEdited()}>Send edited copy</Button>
   </div>
  </div>
 </Sheet>;
}
