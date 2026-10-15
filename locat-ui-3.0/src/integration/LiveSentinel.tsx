import {AccountActivityPanel} from './AccountActivityPanel';
import {SentinelIncidentsPanel} from './SentinelIncidentsPanel';
import {sentinelRequest as request} from './sentinelRequest';
import {useCallback,useEffect,useRef,useState} from 'react';
import {useSession} from '../app/session';
import {Screen} from '../layouts/Screen';
import {Badge,Button,Sheet,StateView,TextField} from '../ui';
type Token={id:string;name:string;prefix:string;revokedAt:number|null};
async function loadTokens(signal?:AbortSignal){return (await request('/api/sentinel/tokens',undefined,signal)).tokens as Token[];}
export function LiveSentinel(){
 const {user}=useSession();
 return user?<OwnedSentinel key={user.id}/>:<Screen title="Sentinel" subtitle="Incidents, integrations and account security"><StateView kind="offline" title="A signed-in account is required" body="Sign in to access your server-owned incidents and integrations."/></Screen>;
}
function OwnedSentinel(){
 const [activityRefresh,setActivityRefresh]=useState(0),[incidentRefresh,setIncidentRefresh]=useState(0),[tokens,setTokens]=useState<Token[]>([]),[error,setError]=useState(''),[loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[tab,setTab]=useState('incidents');
 const [tokenSheet,setTokenSheet]=useState(false),[name,setName]=useState(''),[secret,setSecret]=useState(''),[revoke,setRevoke]=useState<Token|null>(null);
 const generation=useRef(0),tokenGeneration=useRef(0),operation=useRef(false);
 const invalidate=useCallback(()=>{generation.current++;tokenGeneration.current++;},[]);
 useEffect(()=>{let active=true;const control=new AbortController();void loadTokens(control.signal).then(data=>{if(active)setTokens(data);}).catch(reason=>{if(active)setError(reason.message);}).finally(()=>{if(active)setLoading(false);});return()=>{active=false;invalidate();control.abort();};},[invalidate]);
 async function run(task:(version:number)=>Promise<void>){if(operation.current)return;operation.current=true;const version=generation.current;setBusy(true);setError('');try{await task(version);}catch(reason){if(version===generation.current)setError(reason instanceof Error?reason.message:'Sentinel request failed');}finally{if(version===generation.current){operation.current=false;setBusy(false);}}}
 async function refresh(version:number){const data=await loadTokens();if(version===generation.current)setTokens(data);}
 function closeToken(){tokenGeneration.current++;setTokenSheet(false);setSecret('');setName('');}
 return <Screen title="Sentinel" subtitle="Incidents, integrations and account security" actions={<Button disabled={busy} onClick={()=>tab==='account activity'?setActivityRefresh(value=>value+1):tab==='incidents'?setIncidentRefresh(value=>value+1):void run(refresh)}>Refresh</Button>}>
  <div className="mx-auto max-w-5xl space-y-4">
   <p className="text-sm text-ink-3">Account-owned alerts from generic, nScout and PipelineGuard webhooks. Incident text is readable by this server. Device monitoring and external notification delivery are pending.</p>
   <div className="flex flex-wrap gap-2" role="group" aria-label="Sentinel sections">{['incidents','integrations','account activity'].map(value=><Button key={value} aria-pressed={tab===value} onClick={()=>setTab(value)}>{value}</Button>)}</div>
   {error&&<p role="alert" className="text-danger">{error}</p>}
   {tab==='incidents'?<SentinelIncidentsPanel refreshToken={incidentRefresh}/>:tab==='integrations'?loading?<p role="status">Loading integrations…</p>:<>
    <Button disabled={busy} onClick={()=>{tokenGeneration.current++;setName('');setSecret('');setTokenSheet(true);}}>Create integration token</Button>
    <p className="text-sm text-ink-3">POST JSON with a Bearer token to <code>/api/sentinel/webhook?format=generic</code>. Required field: title. Optional: description, severity, source, fingerprint, status. Tokens can only submit incidents for your account. The nscout and pipelineguard format parameters accept the original Locat adapter payloads; real vendor acceptance remains pending.</p>
    {tokens.map(token=><article key={token.id} className="flex flex-wrap items-center gap-3 rounded-xl bg-s1 p-4 hairline"><h2 className="flex-1 font-semibold">{token.name}</h2><code className="text-xs text-ink-3">{token.prefix}…</code>{token.revokedAt?<Badge>Revoked</Badge>:<Button disabled={busy} onClick={()=>setRevoke(token)}>Revoke</Button>}</article>)}
    {!tokens.length&&<StateView kind="empty" title="No integrations configured"/>}
   </>:<AccountActivityPanel refreshToken={activityRefresh}/>}
  </div>
  <Sheet open={tokenSheet} onClose={closeToken} title="Integration token" size="sm">{secret?<div className="space-y-4"><p className="text-sm text-ink-3">Copy this token now. It is shown once and cleared when this dialog closes. Keep it in your integration's secret store.</p><TextField label="New token" value={secret} readOnly/><Button onClick={()=>void run(async()=>{await navigator.clipboard.writeText(secret);})}>Copy token</Button></div>:<form className="space-y-4" onSubmit={event=>{event.preventDefault();const tokenVersion=tokenGeneration.current;void run(async version=>{const result=await request('/api/sentinel/tokens',{name});if(version!==generation.current)return;if(tokenVersion===tokenGeneration.current)setSecret(result.token);await refresh(version);});}}><TextField label="Integration name" value={name} maxLength={80} required onChange={event=>setName(event.target.value)}/><Button type="submit" disabled={busy}>Create token</Button></form>}</Sheet>
  <Sheet open={!!revoke} onClose={()=>setRevoke(null)} title="Revoke integration token?" size="sm"><p className="mb-4 text-sm text-ink-3">{revoke?.name} will no longer be able to submit alerts. Existing incidents remain available.</p><Button disabled={busy} onClick={()=>void run(async version=>{await request('/api/sentinel/tokens/revoke',{id:revoke?.id});if(version!==generation.current)return;setRevoke(null);await refresh(version);})}>Revoke token</Button></Sheet>
 </Screen>;
}
