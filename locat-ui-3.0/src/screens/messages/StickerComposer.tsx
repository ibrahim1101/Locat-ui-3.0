import {useState} from 'react';
import {Upload} from 'lucide-react';
import {Banner,Button,Segmented,Sheet} from '@/ui';

const PACKS={
 Daily:[{name:'Wave',emoji:'👋',color:'#E86B2C'},{name:'Thanks',emoji:'🙏',color:'#B76A48'},{name:'Sparkle',emoji:'✨',color:'#8B6BC1'},{name:'Celebrate',emoji:'🎉',color:'#D98235'}],
 Reactions:[{name:'Love',emoji:'❤️',color:'#C64F5D'},{name:'Laugh',emoji:'😂',color:'#4C9B72'},{name:'Fire',emoji:'🔥',color:'#D76535'},{name:'Wow',emoji:'😮',color:'#477FAE'}],
 Nature:[{name:'Bloom',emoji:'🌸',color:'#BF6886'},{name:'Leaf',emoji:'🌿',color:'#54866B'},{name:'Moon',emoji:'🌙',color:'#6D78A8'},{name:'Sun',emoji:'☀️',color:'#C6923C'}],
} as const;
type Pack=keyof typeof PACKS;
type StickerItem=(typeof PACKS)[Pack][number];
const PACKS_OPTIONS: {value:Pack;label:string}[]=(Object.keys(PACKS) as Pack[]).map(value=>({value,label:value}));

function createStickerPng(item:StickerItem):Promise<Blob>{
 return new Promise((resolve,reject)=>{
  const canvas=document.createElement('canvas');canvas.width=640;canvas.height=640;
  const context=canvas.getContext('2d');if(!context){reject(new Error('Sticker preview is unavailable on this device.'));return;}
  context.fillStyle=item.color;context.beginPath();context.roundRect(28,28,584,584,150);context.fill();
  context.font='360px system-ui, "Apple Color Emoji", "Segoe UI Emoji", sans-serif';context.textAlign='center';context.textBaseline='middle';context.fillText(item.emoji,320,332);
  canvas.toBlob(blob=>blob?resolve(blob):reject(new Error('Sticker PNG could not be prepared.')),'image/png');
 });
}

export function StickerComposer({open,onClose,onSend}:{open:boolean;onClose():void;onSend(file:File):Promise<void>}){
 const [pack,setPack]=useState<Pack>('Daily'),[selected,setSelected]=useState<StickerItem|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const close=()=>{setPack('Daily');setSelected(null);setError('');onClose();};
 const send=async()=>{if(!selected||busy)return;setBusy(true);setError('');try{const blob=await createStickerPng(selected);if(blob.size>2_900_000)throw new Error('This sticker exceeds the 2.9 MB encrypted attachment limit.');await onSend(new File([blob],`locat-${selected.name.toLowerCase()}-sticker.png`,{type:'image/png'}));close();}catch(reason){setError(reason instanceof Error?reason.message:'Encrypted sticker send failed.');}finally{setBusy(false);}};
 return <Sheet open={open} onClose={()=>{if(!busy)close();}} title="Sticker pack" description="Choose a small Locat sticker to send in this private conversation." size="md" testId="sticker-composer" footer={<Button variant="primary" icon={busy?undefined:Upload} disabled={!selected||busy} loading={busy} onClick={()=>void send()} data-testid="send-sticker">Send sticker</Button>}>
  <div className="space-y-4">
   <Banner tone="info" title="Stickers are created on this device">The selected sticker becomes a PNG attachment and uses encrypted Chat delivery.</Banner>
   <Segmented label="Sticker pack" value={pack} onChange={value=>{setPack(value);setSelected(null);}} options={PACKS_OPTIONS}/>
   <div className="grid grid-cols-2 gap-3 sm:grid-cols-4" role="group" aria-label={`${pack} stickers`}>
    {PACKS[pack].map(item=><button key={item.name} type="button" onClick={()=>setSelected(item)} aria-label={`${item.name} sticker`} aria-pressed={selected?.name===item.name} className={`group flex min-h-28 flex-col items-center justify-center gap-2 rounded-2xl border bg-s1 p-3 transition hover:-translate-y-0.5 hover:bg-s2 ${selected?.name===item.name?'border-ember ring-2 ring-ember/30':'border-line'}`}>
      <span aria-hidden="true" className="grid size-16 place-items-center rounded-[22px] text-4xl shadow-sm" style={{backgroundColor:item.color}}>{item.emoji}</span><span className="text-xs font-semibold text-ink-2">{item.name}</span>
    </button>)}
   </div>
   {selected&&<div className="flex items-center gap-3 rounded-2xl bg-s2 p-3 hairline" aria-live="polite"><span aria-hidden="true" className="grid size-12 place-items-center rounded-2xl text-3xl" style={{backgroundColor:selected.color}}>{selected.emoji}</span><p className="text-sm font-medium">{selected.name} sticker <span className="block text-xs font-normal text-ink-3">Ready to send as an encrypted PNG</span></p></div>}
   {error&&<p role="alert" className="text-sm text-danger">{error}</p>}
  </div>
 </Sheet>;
}
