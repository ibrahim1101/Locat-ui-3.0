import {useEffect,useState} from 'react';
import {Bell, X} from 'lucide-react';
import {useSession} from '../app/session';
import {Button} from '../ui';

type Reminder={id:string;title:string;details:string;runAt:number};
export function LiveAutomationMonitor(){
 const {user}=useSession(),accountId=user?.id??'', [state,setState]=useState<{accountId:string;items:Reminder[]}>({accountId:'',items:[]});
 useEffect(()=>{if(!accountId)return;let active=true,busy=false;const dispatch=async()=>{if(!active||busy||document.visibilityState!=='visible')return;busy=true;try{const response=await fetch('/api/automate/dispatch',{method:'POST',credentials:'same-origin',cache:'no-store',headers:{'Content-Type':'application/json','X-Locat-Account':accountId},body:'{}'}),data=await response.json();if(response.ok&&active&&data.due?.length)setState(old=>({accountId,items:[...(old.accountId===accountId?old.items:[]),...data.due]}));}catch{ /* A future visible poll retries while undelivered rules remain queued. */ }finally{busy=false;}};void Promise.resolve().then(dispatch);const timer=window.setInterval(dispatch,30_000),visible=()=>void dispatch();document.addEventListener('visibilitychange',visible);return()=>{active=false;window.clearInterval(timer);document.removeEventListener('visibilitychange',visible);};},[accountId]);
 const reminders=state.accountId===accountId?state.items:[];if(!reminders.length)return null;
 return <aside aria-label="Automation reminders" className="fixed right-4 top-20 z-[100] flex w-[min(24rem,calc(100vw-2rem))] flex-col gap-2">{reminders.map(reminder=><div key={`${reminder.id}:${reminder.runAt}`} role="alert" className="flex items-start gap-3 rounded-2xl border border-ember/30 bg-s1 p-4 shadow-lift hairline"><Bell className="mt-0.5 size-4 shrink-0 text-ember"/><div className="min-w-0 flex-1"><p className="font-semibold">{reminder.title}</p>{reminder.details&&<p className="mt-1 whitespace-pre-wrap text-sm text-ink-2">{reminder.details}</p>}<p className="mt-1 text-xs text-ink-3">Scheduled reminder · {new Date(reminder.runAt).toLocaleTimeString(undefined,{hour:'numeric',minute:'2-digit'})}</p></div><Button size="sm" variant="ghost" icon={X} aria-label="Dismiss reminder" onClick={()=>setState(old=>({...old,items:old.items.filter(item=>item.id!==reminder.id||item.runAt!==reminder.runAt)}))}/></div>)}</aside>;
}
