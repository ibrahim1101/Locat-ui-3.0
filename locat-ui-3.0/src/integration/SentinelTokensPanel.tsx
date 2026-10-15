import {useCallback,useEffect,useRef,useState} from 'react';
import {Badge,Button,Sheet,StateView,TextField} from '../ui';
import {sentinelRequest as request} from './sentinelRequest';
type Token={id:string;name:string;prefix:string;createdAt:number;lastUsedAt:number|null;revokedAt:number|null};
export function SentinelTokensPanel({refreshToken=0}:{refreshToken?:number}){
 const [tokens,setTokens]=useState<Token[]>([]),[cursor,setCursor]=useState<string|null>(null),[filter,setFilter]=useState('active'),[loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const [open,setOpen]=useState(false),[name,setName]=useState(''),[secret,setSecret]=useState(''),[revoke,setRevoke]=useState<Token|null>(null);
 const currentFilter=useRef('active'),listRequest=useRef<AbortController|null>(null),listGeneration=useRef(0),generation=useRef(0),sheetGeneration=useRef(0),operation=useRef(false);
 const load=useCallback(async(state:string,before:string|null,append:boolean)=>{
  if(append&&listRequest.current)return;listRequest.current?.abort();const control=new AbortController(),version=++listGeneration.current;listRequest.current=control;setLoading(true);setError('');
  if(!append){setTokens([]);setCursor(null);}
  try{
   const data=await request('/api/sentinel/tokens?'+new URLSearchParams({limit:'25',...(state?{state}:{}),...(before?{before}:{})}),undefined,control.signal);
   if(version!==listGeneration.current)return;
   setTokens(old=>append?[...old,...(data.tokens as Token[]).filter(row=>!old.some(existing=>existing.id===row.id))]:data.tokens);setCursor(data.nextCursor??null);
  }catch(reason){if(version===listGeneration.current)setError(reason instanceof Error?reason.message:'Integration tokens could not be loaded');}
  finally{if(version===listGeneration.current){listRequest.current=null;setLoading(false);}}
 },[]);
 const cancel=useCallback(()=>{listGeneration.current++;listRequest.current?.abort();listRequest.current=null;},[]);
 const invalidate=useCallback(()=>{generation.current++;sheetGeneration.current++;},[]);
 useEffect(()=>{let active=true;void Promise.resolve().then(()=>{if(active)void load(filter,null,false);});return()=>{active=false;cancel();};},[filter,refreshToken,load,cancel]);
 useEffect(()=>()=>invalidate(),[invalidate]);
 async function run(task:(version:number)=>Promise<void>){if(operation.current)return;operation.current=true;const version=generation.current;setBusy(true);setError('');try{await task(version);}catch(reason){if(version===generation.current)setError(reason instanceof Error?reason.message:'Integration action failed');}finally{if(version===generation.current){operation.current=false;setBusy(false);}}}
 function close(){sheetGeneration.current++;setOpen(false);setSecret('');setName('');}
 return <section className="space-y-4" aria-label="Sentinel integration tokens">
  <Button disabled={busy} onClick={()=>{sheetGeneration.current++;setName('');setSecret('');setOpen(true);}}>Create integration token</Button>
  <p className="text-sm text-ink-3">POST JSON with a Bearer token to <code>/api/sentinel/webhook?format=generic</code>. Required field: title. Optional: description, severity, source, fingerprint, status. Tokens submit incidents only for your account. nscout and pipelineguard formats accept the original Locat adapter payloads; real vendor acceptance remains pending.</p>
  <div className="flex flex-wrap gap-2" role="group" aria-label="Integration token state">{['active','revoked',''].map(value=><Button key={value} variant="ghost" aria-pressed={filter===value} onClick={()=>{currentFilter.current=value;setFilter(value);}}>{value==='active'?'Active tokens':value==='revoked'?'Revoked tokens':'All integration tokens'}</Button>)}</div>
  <p className="text-xs text-ink-3">Newest created first. Load older tokens to continue through this account's inventory. Refresh to include state changes.</p>
  {error&&<p role="alert" className="text-danger">{error}</p>}
  {tokens.map(token=><article key={token.id} className="flex flex-wrap items-center gap-3 rounded-xl bg-s1 p-4 hairline"><div className="flex-1"><h2 className="font-semibold">{token.name}</h2><p className="text-xs text-ink-3">Created {new Date(token.createdAt).toLocaleString()} · {token.lastUsedAt===null?'Not used yet':'Last used '+new Date(token.lastUsedAt).toLocaleString()}</p></div><code className="text-xs text-ink-3">{token.prefix}…</code>{token.revokedAt!==null?<Badge>Revoked</Badge>:<Button disabled={busy} onClick={()=>setRevoke(token)}>Revoke</Button>}</article>)}
  {loading&&<p role="status">Loading integrations…</p>}{!loading&&!tokens.length&&!error&&<StateView kind="empty" title="No integrations in this view"/>}
  {cursor&&<Button disabled={loading} onClick={()=>void load(currentFilter.current,cursor,true)}>Load older integration tokens</Button>}<Button variant="ghost" disabled={loading} onClick={()=>void load(currentFilter.current,null,false)}>Refresh integration tokens</Button>
  <Sheet open={open} onClose={close} title="Integration token" size="sm">{secret?<div className="space-y-4"><p className="text-sm text-ink-3">Copy this token now. It is shown once and cleared when this dialog closes. Keep it in your integration's secret store.</p><TextField label="New token" value={secret} readOnly/><Button disabled={busy} onClick={()=>void run(async()=>{await navigator.clipboard.writeText(secret);})}>Copy token</Button></div>:<form className="space-y-4" onSubmit={event=>{event.preventDefault();const sheetVersion=sheetGeneration.current;void run(async version=>{const result=await request('/api/sentinel/tokens',{name});if(version!==generation.current)return;if(sheetVersion===sheetGeneration.current)setSecret(result.token);await load(currentFilter.current,null,false);});}}><TextField label="Integration name" value={name} maxLength={80} required onChange={event=>setName(event.target.value)}/><p className="text-xs text-ink-3">If a creation response is lost, refresh this inventory and revoke an unwanted token before creating another.</p><Button type="submit" disabled={busy}>Create token</Button>{error&&<p role="alert" className="text-danger">{error}</p>}</form>}</Sheet>
  <Sheet open={!!revoke} onClose={()=>setRevoke(null)} title="Revoke integration token?" size="sm"><p className="mb-4 text-sm text-ink-3">{revoke?.name} will no longer submit alerts. Existing incidents remain available.</p><Button disabled={busy} onClick={()=>void run(async version=>{await request('/api/sentinel/tokens/revoke',{id:revoke?.id});if(version!==generation.current)return;setRevoke(null);await load(currentFilter.current,null,false);})}>Revoke token</Button>{error&&<p role="alert" className="text-danger">{error}</p>}</Sheet>
 </section>;
}
