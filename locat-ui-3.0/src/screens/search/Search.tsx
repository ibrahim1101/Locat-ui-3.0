import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { BriefcaseBusiness, CalendarDays, LayoutGrid, Lock, MessageCircle, User } from "lucide-react";
import type { SearchResultView, SearchScope } from "@/contracts/ecosystem";
import { MODULES } from "@/app/registry";
import { useSession } from "@/app/session";
import { FIXTURE_CONTACTS, FIXTURE_MESSAGES } from "@/fixtures/data";
import { accountRequest } from "@/integration/accountRequest";
import { Screen } from "@/layouts/Screen";
import { Banner, Button, ChipRow, SearchField, Section, ListRow, StateView } from "@/ui";

const ICON: Record<SearchScope, typeof User> = { messages: MessageCircle, attachments: MessageCircle, contacts: User, modules: LayoutGrid, settings: LayoutGrid, workspace: BriefcaseBusiness, calendar: CalendarDays };
type Contact = { user: { id: string; displayName: string; username: string; lcCode: string }; status: "pending" | "accepted" };
const EMPTY_CONTACTS: Contact[] = [];
type SearchableItem={id:string;workspaceId:string|null;workspaceName:string;type:'note'|'task'|'file'|'calendar';title:string;snippet:string;updatedAt:number;startsAt?:number};
const EMPTY_WORKSPACE_RESULTS:SearchableItem[]=[];

/** Search only real live account contacts; message search remains local to an open conversation. */
export default function Search() {
  const nav = useNavigate();
  const { adapter, user } = useSession();
  const preview = adapter.mode === "preview";
  const currentAccountId=user?.id;
  const [q, setQ] = useState("");
  const [scope, setScope] = useState<"all" | SearchScope>("all");
  const [contactState, setContactState] = useState<{ accountId: string; contacts?: Contact[]; error?: string }>();
  const [attempt, setAttempt] = useState(0);
  const [workspaceState,setWorkspaceState]=useState<{accountId:string;query:string;results?:SearchableItem[];error?:string}>();
  const contacts = user?.id && contactState?.accountId === user.id ? contactState.contacts ?? EMPTY_CONTACTS : EMPTY_CONTACTS;
  const contactError = user?.id && contactState?.accountId === user.id ? contactState.error ?? "" : "";
  const contactsLoaded = Boolean(user?.id && contactState?.accountId === user.id && contactState.contacts);

  useEffect(() => {
    if (preview || !user?.id) return;
    const control = new AbortController();
    void Promise.resolve().then(async () => {
      try {
        const data = await accountRequest("/api/contacts", user.id, undefined, control.signal);
        if (!control.signal.aborted) setContactState({ accountId: user.id, contacts: data.contacts as Contact[] });
      } catch (reason) {
        if (!control.signal.aborted) setContactState({ accountId: user.id, error: reason instanceof Error ? reason.message : "Contacts could not be searched." });
      }
    });
    return () => control.abort();
  }, [preview, user?.id, attempt]);

  useEffect(()=>{
    const query=q.trim();if(preview||!user?.id||query.length<2)return;const control=new AbortController(),accountId=user.id;const timer=window.setTimeout(()=>{void accountRequest('/api/search',accountId,{q:query},control.signal).then(data=>{if(!control.signal.aborted)setWorkspaceState({accountId,query,results:data.results as SearchableItem[]});}).catch(reason=>{if(!control.signal.aborted)setWorkspaceState({accountId,query,error:reason instanceof Error?reason.message:'Server search is unavailable.'});});},250);
    return()=>{window.clearTimeout(timer);control.abort();};
  },[preview,user?.id,q]);
  const workspaceSearchError=currentAccountId&&workspaceState?.accountId===currentAccountId&&workspaceState.query===q.trim()?workspaceState.error??'':'';
  const termReady=q.trim().length>=2;
  const serverSearchMatches=Boolean(currentAccountId&&workspaceState?.accountId===currentAccountId&&workspaceState.query===q.trim()&&(workspaceState.results!==undefined||workspaceState.error!==undefined));
  const serverSearchPending=!preview&&Boolean(currentAccountId)&&termReady&&!serverSearchMatches;

  const results = useMemo<SearchResultView[]>(() => {
    const workspaceResults=currentAccountId&&workspaceState?.accountId===currentAccountId&&workspaceState.query===q.trim()?workspaceState.results??EMPTY_WORKSPACE_RESULTS:EMPTY_WORKSPACE_RESULTS;
    const term = q.trim().toLowerCase();
    if (term.length < 2) return [];
    const messages = preview ? [
      ...FIXTURE_MESSAGES.filter((m) => !m.hidden && m.text?.toLowerCase().includes(term)).map((m) => ({ id: m.id, scope: "messages" as const, title: m.text!, subtitle: `${m.authorName} · preview`, route: `/messages/${m.conversationId}` })),
      ...FIXTURE_MESSAGES.filter((m) => m.attachment && "name" in m.attachment && m.attachment.name.toLowerCase().includes(term)).map((m) => ({ id: "a" + m.id, scope: "attachments" as const, title: (m.attachment as { name: string }).name, subtitle: "Preview attachment name", route: `/messages/${m.conversationId}` })),
      ...FIXTURE_CONTACTS.filter((c) => `${c.displayName} ${c.username} ${c.lcCode}`.toLowerCase().includes(term)).map((c) => ({ id: c.id, scope: "contacts" as const, title: c.displayName, subtitle: `@${c.username} · ${c.lcCode}`, route: "/messages" })),
    ] : contacts.filter((contact) => contact.status === "accepted" && `${contact.user.displayName} ${contact.user.username} ${contact.user.lcCode}`.toLowerCase().includes(term)).map((contact) => ({ id: contact.user.id, scope: "contacts" as const, title: contact.user.displayName, subtitle: `@${contact.user.username} · ${contact.user.lcCode}`, route: "/messages" }));
    const workspaces=workspaceResults.filter(item=>item.type!=='calendar').map(item=>({id:item.id,scope:'workspace' as const,title:item.title,subtitle:`${item.workspaceName} · ${item.type==='file'?'file':item.type} · ${item.snippet.slice(0,140)}`,route:`/workspace?workspace=${encodeURIComponent(item.workspaceId??'')}&${item.type==='file'?'file':'item'}=${encodeURIComponent(item.id)}`}));
    const calendar=workspaceResults.filter(item=>item.type==='calendar').map(item=>({id:item.id,scope:'calendar' as const,title:item.title,subtitle:`${item.workspaceName} · ${new Date(item.startsAt??item.updatedAt).toLocaleString()}${item.snippet?` · ${item.snippet.slice(0,100)}`:''}`,route:`/calendar?event=${encodeURIComponent(item.id)}&at=${item.startsAt??item.updatedAt}${item.workspaceId?`&workspace=${encodeURIComponent(item.workspaceId)}`:''}`}));
    return [
      ...messages,
      ...workspaces,
      ...calendar,
      ...MODULES.filter((module) => `${module.name} ${module.tagline}`.toLowerCase().includes(term)).map((module) => ({ id: module.id, scope: "modules" as const, title: module.name, subtitle: module.tagline, route: module.route })),
    ].filter((result) => scope === "all" || result.scope === scope);
  }, [q, scope, preview, contacts, currentAccountId, workspaceState]);
  const groups = [...new Set(results.map((result) => result.scope))];

  return (
    <Screen title="Search" testId="search-screen" toolbar={<><SearchField autoFocus value={q} onChange={setQ} maxLength={100} placeholder="Search people, Workspace, Calendar and modules" testId="global-search-input" />
      <ChipRow label="Scope" value={scope} onChange={setScope} options={[{ value: "all", label: "All" }, { value: "contacts", label: "People" }, { value: "workspace", label: "Workspace" }, { value: "calendar", label: "Calendar" }, { value: "modules", label: "Modules" }, { value: "messages", label: "Messages" }, { value: "attachments", label: "Files" }]} /></>}>
      <div className="mx-auto max-w-3xl">
        <Banner className="mb-5" tone="info" icon={Lock} title={preview ? "Preview search uses fictional content" : "Private messages stay on this device"}>
          {preview ? "Sample messages and people are for layout preview only." : "Global search covers accepted contacts, authorized Workspace content, Calendar events, and Locat modules. Search encrypted message text inside an open conversation; it is never sent to the server."}
        </Banner>
        {workspaceSearchError&&<p role="alert" className="mb-4 text-sm text-danger">Server search is unavailable: {workspaceSearchError}</p>}
        {serverSearchPending&&<p role="status" className="mb-4 text-sm text-ink-3">Searching Workspace and Calendar…</p>}
        {contactError && <div className="mb-4 flex items-center justify-between gap-3 rounded-xl bg-danger/10 p-3 text-sm text-danger"><span role="alert">Contacts could not be loaded: {contactError}</span><Button size="sm" variant="ghost" onClick={() => setAttempt(value => value + 1)}>Retry</Button></div>}
        {!preview && user && !contactsLoaded && !contactError && <p role="status" className="mb-4 text-sm text-ink-3">Loading your contacts…</p>}
        {!termReady ? <StateView compact kind="empty" title="Type at least 2 characters" body="Results are grouped into people, shared content, Calendar and modules." />
          : !results.length && serverSearchPending ? null
          : !results.length ? <StateView compact kind="empty" title={`No results for "${q}"`} body={preview ? "Try a sample name, message or module." : scope === "messages" || scope === "attachments" ? "Open a conversation to search its locally decrypted messages." : "Try another name, content term or module."} />
          : groups.map((group) => <Section key={group} title={group}>{results.filter((result) => result.scope === group).map((result) => <ListRow key={result.id} icon={ICON[result.scope]} title={result.title} subtitle={result.subtitle} onClick={() => nav(result.route)} chevron testId={`result-${result.id}`} />)}</Section>)}
      </div>
    </Screen>
  );
}
