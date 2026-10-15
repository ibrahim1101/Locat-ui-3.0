import {useCallback,useEffect,useRef,useState} from 'react';
import {Badge,Button,Sheet,StateView,TextField} from '../ui';
import {sentinelRequest as request} from './sentinelRequest';
type Incident={id:string;title:string;description:string;source:string;severity:string;status:string;occurrences:number;updatedAt:number};
type History={id:number;action:string;note:string;createdAt:number};
type Filters={q:string;status:string;severity:string;source:string};
const emptyFilters:Filters={q:'',status:'',severity:'',source:''};
export function SentinelIncidentsPanel({refreshToken=0}:{refreshToken?:number}){
 const [incidents,setIncidents]=useState<Incident[]>([]),[cursor,setCursor]=useState<string|null>(null),[draft,setDraft]=useState<Filters>(emptyFilters),[filters,setFilters]=useState<Filters>(emptyFilters),[loading,setLoading]=useState(true),[error,setError]=useState('');
 const [selected,setSelected]=useState<Incident|null>(null),[history,setHistory]=useState<History[]>([]),[historyCursor,setHistoryCursor]=useState<string|null>(null),[note,setNote]=useState(''),[acting,setActing]=useState(false);
 const listRequest=useRef<AbortController|null>(null),listGeneration=useRef(0),detailRequest=useRef<AbortController|null>(null),detailGeneration=useRef(0),operation=useRef(false);
 const load=useCallback(async(filter:Filters,before:string|null,append:boolean)=>{
  if(append&&listRequest.current)return;
  listRequest.current?.abort();const control=new AbortController(),version=++listGeneration.current;listRequest.current=control;setLoading(true);setError('');
  if(!append){setIncidents([]);setCursor(null);}
  try{
   const params=new URLSearchParams({limit:'25',...Object.fromEntries(Object.entries(filter).filter(([,value])=>value)),...(before?{before}:{})});
   const data=await request('/api/sentinel/incidents?'+params,undefined,control.signal);
   if(version!==listGeneration.current)return;
   setIncidents(old=>append?[...old,...(data.incidents as Incident[]).filter(row=>!old.some(existing=>existing.id===row.id))]:data.incidents);setCursor(data.nextCursor??null);
  }catch(reason){if(version===listGeneration.current)setError(reason instanceof Error?reason.message:'Incidents could not be loaded');}
  finally{if(version===listGeneration.current){listRequest.current=null;setLoading(false);}}
 },[]);
 const cancel=useCallback(()=>{listGeneration.current++;listRequest.current?.abort();listRequest.current=null;},[]);
 useEffect(()=>{let active=true;void Promise.resolve().then(()=>{if(active)void load(filters,null,false);});return()=>{active=false;cancel();};},[filters,refreshToken,load,cancel]);
 useEffect(()=>()=>{detailGeneration.current++;detailRequest.current?.abort();operation.current=false;},[]);
 function close(){detailGeneration.current++;detailRequest.current?.abort();detailRequest.current=null;operation.current=false;setActing(false);setSelected(null);setHistory([]);setHistoryCursor(null);setNote('');}
 async function open(id:string){
  if(operation.current)return;operation.current=true;const version=++detailGeneration.current,control=new AbortController();detailRequest.current=control;setActing(true);setError('');
  try{const detail=await request('/api/sentinel/incidents/'+id+'?limit=50',undefined,control.signal);if(version===detailGeneration.current){setSelected(detail.incident);setHistory(detail.events);setHistoryCursor(detail.nextCursor??null);setNote('');}}
  catch(reason){if(version===detailGeneration.current)setError(reason instanceof Error?reason.message:'Incident could not be loaded');}
  finally{if(version===detailGeneration.current){detailRequest.current=null;operation.current=false;setActing(false);}}
 }
 async function olderHistory(){
  if(operation.current||!selected||!historyCursor)return;operation.current=true;
  const version=detailGeneration.current,control=new AbortController();detailRequest.current=control;setActing(true);setError('');
  try{
   const detail=await request('/api/sentinel/incidents/'+selected.id+'?'+new URLSearchParams({limit:'50',before:historyCursor}),undefined,control.signal);
   if(version!==detailGeneration.current)return;
   setHistory(old=>[...old,...(detail.events as History[]).filter(row=>!old.some(existing=>existing.id===row.id))]);setHistoryCursor(detail.nextCursor??null);
  }catch(reason){if(version===detailGeneration.current)setError(reason instanceof Error?reason.message:'Incident history could not be loaded');}
  finally{if(version===detailGeneration.current){detailRequest.current=null;operation.current=false;setActing(false);}}
 }
 async function action(value:string){
  if(operation.current||!selected)return;operation.current=true;const version=detailGeneration.current,id=selected.id,control=new AbortController();detailRequest.current=control;setActing(true);setError('');
  try{
   await request('/api/sentinel/incidents/'+id,{action:value,...(value==='note'?{note}:{})},control.signal);
   if(version!==detailGeneration.current)return;
   const detail=await request('/api/sentinel/incidents/'+id+'?limit=50',undefined,control.signal);
   if(version!==detailGeneration.current)return;setSelected(detail.incident);setHistory(detail.events);setHistoryCursor(detail.nextCursor??null);setNote('');await load(filters,null,false);
  }catch(reason){if(version===detailGeneration.current)setError(reason instanceof Error?reason.message:'Incident action failed');}
  finally{if(version===detailGeneration.current){detailRequest.current=null;operation.current=false;setActing(false);}}
 }
 return <section className="space-y-4" aria-label="Sentinel incident history">
  <form className="space-y-3 rounded-xl bg-s1 p-4 hairline" onSubmit={event=>{event.preventDefault();setFilters({...draft,q:draft.q.trim(),source:draft.source.trim()});}}>
   <TextField label="Search incidents" value={draft.q} maxLength={160} onChange={event=>setDraft(old=>({...old,q:event.target.value}))} hint="Search titles, descriptions and source names."/>
   <TextField label="Incident source" value={draft.source} maxLength={64} onChange={event=>setDraft(old=>({...old,source:event.target.value}))} hint="Optional exact source, such as nscout or pipelineguard."/>
   <div className="flex flex-wrap gap-2" role="group" aria-label="Incident status">{['','open','acknowledged','resolved'].map(value=><Button key={value} variant="ghost" aria-pressed={draft.status===value} onClick={()=>setDraft(old=>({...old,status:value}))}>{value||'All statuses'}</Button>)}</div>
   <div className="flex flex-wrap gap-2" role="group" aria-label="Incident severity">{['','info','low','medium','high','critical'].map(value=><Button key={value} variant="ghost" aria-pressed={draft.severity===value} onClick={()=>setDraft(old=>({...old,severity:value}))}>{value||'All severities'}</Button>)}</div>
   <Button type="submit" disabled={loading}>Apply incident filters</Button>
  </form>
  <p className="text-xs text-ink-3">Account-owned incidents, most recently updated first. Repeated source and fingerprint pairs update the existing alert. Refresh to include incidents that changed while paging.</p>
  {error&&<p role="alert" className="text-danger">{error}</p>}
  {incidents.map(item=><article key={item.id} className="rounded-xl bg-s1 p-4 hairline"><div className="flex flex-wrap items-center gap-3"><Badge tone={['high','critical'].includes(item.severity)?'warn':'neutral'}>{item.severity}</Badge><h2 className="flex-1 font-semibold">{item.title}</h2><Button disabled={acting} onClick={()=>void open(item.id)}>View incident</Button></div><p className="mt-2 text-sm text-ink-3">{item.source} · {item.status} · {item.occurrences} occurrences · {new Date(item.updatedAt).toLocaleString()}</p></article>)}
  {loading&&<p role="status">Loading incidents…</p>}{!loading&&!incidents.length&&!error&&<StateView kind="empty" title="No incidents in this view"/>}
  {cursor&&<Button disabled={loading} onClick={()=>void load(filters,cursor,true)}>Load older incidents</Button>}<Button variant="ghost" disabled={loading} onClick={()=>void load(filters,null,false)}>Refresh incidents</Button>
  <Sheet open={!!selected} onClose={close} title={selected?.title??'Incident'}>{selected&&<div className="space-y-4"><p className="whitespace-pre-wrap break-words text-sm text-ink-3">{selected.description||'No description'}</p><p className="text-sm">{selected.severity} · {selected.status} · {selected.occurrences} occurrences</p><div className="flex flex-wrap gap-2">{selected.status==='resolved'?<Button disabled={acting} onClick={()=>void action('reopen')}>Reopen</Button>:<><Button disabled={acting||selected.status==='acknowledged'} onClick={()=>void action('acknowledge')}>Acknowledge</Button><Button disabled={acting} onClick={()=>void action('resolve')}>Resolve</Button></>}</div><form className="space-y-3" onSubmit={event=>{event.preventDefault();void action('note');}}><TextField label="Incident note" value={note} required maxLength={500} onChange={event=>setNote(event.target.value)}/><Button type="submit" disabled={acting}>Add note</Button></form>{error&&<p role="alert" className="text-danger">{error}</p>}<h3 className="font-semibold">Incident history</h3><p className="text-xs text-ink-3">Newest history first. Close and reopen to include new events.</p>{history.map(event=><article key={event.id} className="rounded-xl bg-s2 p-3"><p className="text-sm">{event.action.replaceAll('.',' ')}</p>{event.note&&<p className="whitespace-pre-wrap break-words text-sm text-ink-3">{event.note}</p>}<time className="text-xs text-ink-3">{new Date(event.createdAt).toLocaleString()}</time></article>)}{historyCursor&&<Button disabled={acting} onClick={()=>void olderHistory()}>Load older incident history</Button>}</div>}</Sheet>
 </section>;
}
