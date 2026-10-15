import {LiveAccountSettings} from './LiveAccountSettings';
import {useSession} from '../app/session';
import {Screen} from '../layouts/Screen';
import {Button,StateView} from '../ui';
/** Live settings use real controls; other modules retain explicit unavailable states. */
export function LiveModuleNotice({title}:{title:string}){
 const {adapter,connection,user}=useSession();
 if(title==='Settings')return <Screen title="Settings" subtitle={user?`${user.displayName} · ${user.lcCode}`:'Local device settings'} actions={<Button variant="ghost" onClick={()=>void adapter.auth.signOut()}>{user?'Sign out':'Leave local mode'}</Button>}><div className="mx-auto max-w-3xl space-y-5"><p className="text-sm text-ink-3">Server: {connection.server}. Account changes use your authenticated server session.</p>{user?<LiveAccountSettings/>:<StateView kind="offline" title="Account settings require sign-in" body="Local media remains available on this device. Sign in to manage server sessions, profile privacy and messaging-device setup."/>}</div></Screen>;
 return <Screen title={title} subtitle="Live integration pending" actions={<Button variant="ghost" onClick={()=>void adapter.auth.signOut()}>{user?'Sign out':'Leave local mode'}</Button>}><div className="mx-auto max-w-3xl space-y-5" data-testid="live-module-notice"><StateView kind="empty" title="This module is not connected yet" body="Its live backend integration is still being implemented. No preview records are shown as your data."/><p className="text-sm text-ink-3">Server: {connection.server}.</p></div></Screen>;
}
