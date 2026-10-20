import {useEffect,useRef,useState} from 'react';
import {Brush,Trash2} from 'lucide-react';
import {Banner,Button,Segmented,Sheet} from '@/ui';

const COLORS=[{name:'Ember',value:'#E86B2C'},{name:'Ink',value:'#222227'},{name:'Ocean',value:'#2576B7'},{name:'Berry',value:'#9B4A81'}];
const WIDTHS=[{value:'fine',label:'Fine'},{value:'medium',label:'Medium'},{value:'bold',label:'Bold'}] as const;
const WIDTH:Record<(typeof WIDTHS)[number]['value'],number>={fine:3,medium:8,bold:16};

export function DoodleComposer({open,onClose,onSend}:{open:boolean;onClose():void;onSend(file:File):Promise<void>}){
 const canvas=useRef<HTMLCanvasElement>(null),last=useRef({x:480,y:270}),drawing=useRef(false),keyboardDrawing=useRef(false);
 const [color,setColor]=useState(COLORS[0].value),[size,setSize]=useState<(typeof WIDTHS)[number]['value']>('medium'),[hasInk,setHasInk]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const point=(event:React.PointerEvent<HTMLCanvasElement>)=>{const rect=event.currentTarget.getBoundingClientRect();return{x:(event.clientX-rect.left)*event.currentTarget.width/rect.width,y:(event.clientY-rect.top)*event.currentTarget.height/rect.height};};
 const lineTo=(next:{x:number;y:number})=>{const context=canvas.current?.getContext('2d');if(!context)return;context.strokeStyle=color;context.lineWidth=WIDTH[size];context.lineCap='round';context.lineJoin='round';context.beginPath();context.moveTo(last.current.x,last.current.y);context.lineTo(next.x,next.y);context.stroke();last.current=next;setHasInk(true);};
 const start=(event:React.PointerEvent<HTMLCanvasElement>)=>{if(event.button!==0)return;event.currentTarget.setPointerCapture?.(event.pointerId);last.current=point(event);drawing.current=true;};
 const move=(event:React.PointerEvent<HTMLCanvasElement>)=>{if(drawing.current)lineTo(point(event));};
 const stop=()=>{drawing.current=false;};
 const key=(event:React.KeyboardEvent<HTMLCanvasElement>)=>{const delta:Record<string,{x:number;y:number}>={ArrowUp:{x:0,y:-8},ArrowDown:{x:0,y:8},ArrowLeft:{x:-8,y:0},ArrowRight:{x:8,y:0}};if(event.key==='Enter'||event.key===' '){event.preventDefault();keyboardDrawing.current=!keyboardDrawing.current;return;}const step=delta[event.key];if(!step)return;event.preventDefault();const next={x:Math.max(0,Math.min(960,last.current.x+step.x)),y:Math.max(0,Math.min(540,last.current.y+step.y))};if(keyboardDrawing.current)lineTo(next);else last.current=next;};
 const clear=()=>{const context=canvas.current?.getContext('2d');if(!context)return;context.fillStyle='#FFFFFF';context.fillRect(0,0,960,540);setHasInk(false);setError('');};
 useEffect(()=>{if(open&&canvas.current){const context=canvas.current.getContext('2d');if(context){context.fillStyle='#FFFFFF';context.fillRect(0,0,960,540);}last.current={x:480,y:270};setHasInk(false);setError('');}},[open]);
 const send=()=>{if(!canvas.current||!hasInk||busy)return;setBusy(true);setError('');canvas.current.toBlob(async blob=>{if(!blob){setError('The doodle could not be prepared. Try again.');setBusy(false);return;}if(blob.size>2_900_000){setError('This drawing exceeds the 2.9 MB encrypted attachment limit. Clear details or start a simpler drawing.');setBusy(false);return;}try{await onSend(new File([blob],`locat-doodle-${Date.now()}.png`,{type:'image/png'}));onClose();}catch(reason){setError(reason instanceof Error?reason.message:'Encrypted doodle send failed.');}finally{setBusy(false);}},'image/png');};
 return <Sheet open={open} onClose={()=>{if(!busy){setError('');setHasInk(false);onClose();}}} title="Draw a doodle" description="Draw locally, review it, then send it through encrypted Chat." size="lg" testId="doodle-composer" footer={<Button variant="primary" icon={Brush} disabled={!hasInk||busy} loading={busy} onClick={send} data-testid="send-doodle">Send doodle</Button>}>
  <div className="space-y-4">
   <Banner tone="info" title="This drawing stays on this device until you send it">It is sent as an encrypted PNG attachment in this conversation. The 2.9 MB Chat limit applies.</Banner>
   <div className="flex flex-wrap items-end justify-between gap-3"><div className="flex gap-2" role="group" aria-label="Doodle color">{COLORS.map(item=><button key={item.name} type="button" aria-label={`${item.name} color`} aria-pressed={color===item.value} onClick={()=>setColor(item.value)} className={`size-9 rounded-full hairline ${color===item.value?'ring-2 ring-ember ring-offset-2 ring-offset-canvas':''}`} style={{backgroundColor:item.value}} />)}</div><div className="flex items-center gap-2"><Segmented label="Brush size" value={size} onChange={setSize} options={WIDTHS.map(option=>({...option}))} size="sm"/><Button variant="ghost" icon={Trash2} disabled={!hasInk||busy} onClick={clear}>Clear</Button></div></div>
   <canvas ref={canvas} width={960} height={540} aria-label="Doodle canvas" aria-describedby="doodle-keyboard-help" tabIndex={0} onPointerDown={start} onPointerMove={move} onPointerUp={stop} onPointerCancel={stop} onLostPointerCapture={stop} onKeyDown={key} className="block aspect-video w-full touch-none rounded-2xl border border-line bg-white shadow-sm focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-ember" data-testid="doodle-canvas"/>
   <p id="doodle-keyboard-help" className="text-xs text-ink-3">Use a mouse, pen or touch to draw. For keyboard drawing, focus the canvas, press Enter to start or pause, then use the arrow keys.</p>
   {error&&<p role="alert" className="text-sm text-danger">{error}</p>}
  </div>
 </Sheet>;
}
