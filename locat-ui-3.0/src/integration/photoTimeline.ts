import type {LocalMediaItem} from './localMediaStore';
function importTime(timestamp:number):number|null{
 return Number.isFinite(timestamp)&&!Number.isNaN(new Date(timestamp).getTime())?timestamp:null;
}
/** Calendar days use the viewing browser's timezone, never inferred capture metadata. */
export function photoImportDay(timestamp:number):{key:string;label:string}{
 if(importTime(timestamp)===null)return {key:'unknown',label:'Unknown import date'};
 const date=new Date(timestamp);
 return {key:`${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`,label:new Intl.DateTimeFormat(undefined,{dateStyle:'long'}).format(date)};
}
export function photoTimelineItems(items:LocalMediaItem[]):LocalMediaItem[]{
 return items.filter(item=>item.kind==='photo'&&item.source!=='server').sort((a,b)=>{
  const first=importTime(a.addedAt),second=importTime(b.addedAt);
  if(first===null&&second!==null)return 1;
  if(first!==null&&second===null)return -1;
  return (first!==null&&second!==null?second-first:0)||a.name.localeCompare(b.name)||a.id.localeCompare(b.id);
 });
}
