import {useEffect,useRef,useState} from 'react';
import {Mic,Square,Trash2,SendHorizontal,RotateCcw} from 'lucide-react';
import {Button,Sheet,formatDuration} from '../ui';

const MAX_BYTES=2_900_000,MAX_SECONDS=60;
const MIME_TYPES=['audio/webm;codecs=opus','audio/ogg;codecs=opus','audio/mp4'];
type Review={file:File;durationSec:number;url:string};

/** Records locally, shows a playback review, and uploads only after explicit confirmation. */
export function VoiceAttachmentRecorder({onClose,onSend}:{onClose():void;onSend(file:File,durationSec:number):Promise<void>}){
 const streamRef=useRef<MediaStream|null>(null),recorderRef=useRef<MediaRecorder|null>(null),chunks=useRef<BlobPart[]>([]),startedAt=useRef(0),mounted=useRef(true),timerRef=useRef<number|undefined>(undefined);
 const [recording,setRecording]=useState(false),[seconds,setSeconds]=useState(0),[review,setReview]=useState<Review|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const stopTracks=()=>{for(const track of streamRef.current?.getTracks()??[])track.stop();streamRef.current=null;};
 useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;window.clearInterval(timerRef.current);if(recorderRef.current?.state==='recording')recorderRef.current.stop();stopTracks();};},[]);
 useEffect(()=>()=>{if(review)URL.revokeObjectURL(review.url);},[review]);
 function finishRecording(){
  const recorder=recorderRef.current;if(!recorder||recorder.state==='inactive')return;
  window.clearInterval(timerRef.current);setRecording(false);stopTracks();recorder.stop();
 }
 async function startRecording(){
  setError('');setReview(null);setSeconds(0);chunks.current=[];
  if(!navigator.mediaDevices?.getUserMedia||typeof MediaRecorder==='undefined'){setError('Voice recording is not supported by this browser.');return;}
  try{
   const stream=await navigator.mediaDevices.getUserMedia({audio:true});streamRef.current=stream;
   const mimeType=MIME_TYPES.find(type=>MediaRecorder.isTypeSupported(type));
   const recorder=new MediaRecorder(stream,mimeType?{mimeType}:undefined);recorderRef.current=recorder;startedAt.current=Date.now();
   recorder.ondataavailable=event=>{if(event.data.size)chunks.current.push(event.data);};
   recorder.onerror=()=>{if(mounted.current){setError('Recording stopped unexpectedly. You can try again.');setRecording(false);}stopTracks();};
   recorder.onstop=()=>{
    stopTracks();if(!mounted.current)return;
    const durationSec=Math.min(MAX_SECONDS,Math.max(1,Math.ceil((Date.now()-startedAt.current)/1000)));
    const mime=recorder.mimeType||mimeType||'audio/webm';const blob=new Blob(chunks.current,{type:mime});chunks.current=[];
    if(blob.size===0){setError('No audio was captured. Check microphone access and try again.');return;}
    if(blob.size>MAX_BYTES){setError('This recording exceeded 2.9 MB. Make a shorter recording and try again.');return;}
    const extension=mime.includes('ogg')?'ogg':mime.includes('mp4')?'m4a':'webm';const file=new File([blob],`Voice message.${extension}`,{type:mime.split(';')[0]});
    setReview({file,durationSec,url:URL.createObjectURL(blob)});setSeconds(durationSec);
   };
   recorder.start(250);setRecording(true);
   timerRef.current=window.setInterval(()=>{const elapsed=Math.floor((Date.now()-startedAt.current)/1000);setSeconds(Math.min(MAX_SECONDS,elapsed));if(elapsed>=MAX_SECONDS)finishRecording();},200);
  }catch(reason){stopTracks();setError(reason instanceof Error&&reason.name==='NotAllowedError'?'Microphone access was denied. Allow microphone access, then try again.':'The microphone could not be opened. Check its connection and try again.');}
 }
 async function send(){if(!review||busy)return;setBusy(true);setError('');try{await onSend(review.file,review.durationSec);onClose();}catch(reason){setError(reason instanceof Error?reason.message:'The encrypted voice message could not be sent.');}finally{if(mounted.current)setBusy(false);}}
 return <Sheet open onClose={()=>{if(!busy){if(recording)finishRecording();onClose();}}} title="Record voice message" description="Audio stays on this device until you review and send it." size="sm" testId="voice-attachment-recorder">
  <div className="space-y-4">
   <div className="flex items-center gap-3 rounded-2xl bg-s2 p-4 hairline"><span className="grid size-11 place-items-center rounded-full bg-ember/15 text-ember"><Mic className="size-5"/></span><div className="min-w-0 flex-1"><p className="text-sm font-semibold">{recording?'Recording on this device':review?'Review before sending':'Up to 60 seconds'}</p><p className="text-xs text-ink-3">{formatDuration(seconds)} / 1:00 · maximum 2.9 MB</p></div>{recording&&<span className="size-2.5 animate-pulse2 rounded-full bg-danger" aria-label="Recording"/>}</div>
   {review&&<div className="space-y-2 rounded-2xl bg-s1 p-3 hairline"><audio controls preload="none" src={review.url} className="w-full" aria-label="Preview voice recording"/><p className="text-xs text-ink-3">{review.file.name} · {formatDuration(review.durationSec)}</p></div>}
   {error&&<p role="alert" className="rounded-xl bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>}
   <div className="flex flex-wrap justify-end gap-2 border-t border-line pt-3">
    <Button variant="ghost" disabled={busy} onClick={()=>{if(recording)finishRecording();onClose();}}>Cancel</Button>
    {recording?<Button variant="primary" icon={Square} onClick={finishRecording}>Stop recording</Button>:!review?<Button variant="primary" icon={Mic} onClick={()=>void startRecording()}>Start recording</Button>:<><Button variant="ghost" disabled={busy} icon={Trash2} onClick={()=>{setReview(null);setError('');setSeconds(0);}}>Discard</Button><Button variant="ghost" disabled={busy} icon={RotateCcw} onClick={()=>{setReview(null);void startRecording();}}>Record again</Button><Button variant="primary" loading={busy} icon={SendHorizontal} onClick={()=>void send()}>Send voice message</Button></>}
   </div>
  </div>
 </Sheet>;
}
