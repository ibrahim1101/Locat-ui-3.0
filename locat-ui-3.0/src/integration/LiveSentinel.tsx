import {useState} from 'react';
import {useSession} from '../app/session';
import {Screen} from '../layouts/Screen';
import {Button,StateView} from '../ui';
import {AccountActivityPanel} from './AccountActivityPanel';
import {SentinelIncidentsPanel} from './SentinelIncidentsPanel';
import {SentinelTokensPanel} from './SentinelTokensPanel';
export function LiveSentinel(){
 const {user}=useSession();
 return user?<OwnedSentinel key={user.id} accountId={user.id}/>:<Screen title="Sentinel" subtitle="Incidents, integrations and account security"><StateView kind="offline" title="A signed-in account is required" body="Sign in to access your server-owned incidents and integrations."/></Screen>;
}
function OwnedSentinel({accountId}:{accountId:string}){
 const [tab,setTab]=useState('incidents'),[activityRefresh,setActivityRefresh]=useState(0),[incidentRefresh,setIncidentRefresh]=useState(0),[tokenRefresh,setTokenRefresh]=useState(0);
 return <Screen title="Sentinel" subtitle="Incidents, integrations and account security" actions={<Button onClick={()=>tab==='account activity'?setActivityRefresh(value=>value+1):tab==='incidents'?setIncidentRefresh(value=>value+1):setTokenRefresh(value=>value+1)}>Refresh</Button>}>
  <div className="mx-auto max-w-5xl space-y-4">
   <p className="text-sm text-ink-3">Account-owned alerts from generic, nScout and PipelineGuard webhooks. Incident text is readable by this server. Device monitoring and external notification delivery are pending.</p>
   <div className="flex flex-wrap gap-2" role="group" aria-label="Sentinel sections">{['incidents','integrations','account activity'].map(value=><Button key={value} aria-pressed={tab===value} onClick={()=>setTab(value)}>{value}</Button>)}</div>
   {tab==='incidents'?<SentinelIncidentsPanel accountId={accountId} refreshToken={incidentRefresh}/>:tab==='integrations'?<SentinelTokensPanel accountId={accountId} refreshToken={tokenRefresh}/>:<AccountActivityPanel accountId={accountId} refreshToken={activityRefresh}/>}
  </div>
 </Screen>;
}
