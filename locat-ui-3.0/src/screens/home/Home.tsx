import { useNavigate } from "react-router";
import { ArrowUpRight, CloudOff, MessageCircle, Smartphone, Wifi } from "lucide-react";
import { MODULES } from "@/app/registry";
import { useSession } from "@/app/session";
import { FIXTURE_CONVERSATIONS, FIXTURE_DEVICES } from "@/fixtures/data";
import { Screen } from "@/layouts/Screen";
import { Avatar, Badge, Button, SectionTitle, cn } from "@/ui";
import { LiveHomeContactSummary } from "@/integration/LiveHomeContactSummary";

function greeting() { const h = new Date().getHours(); return h < 5 ? "Good night" : h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening"; }

/** Preview dashboard for the retained communication, device and productivity tools. */
export default function Home() {
  const { user, connection, availability, adapter } = useSession();
  const nav = useNavigate();
  const preview = adapter.mode === "preview";
  const online = connection.mode === "server" && connection.server === "connected";
  // Fixtures are useful in the design preview, but must never look like a
  // signed-in user's real conversations or paired devices.
  const unread = preview ? FIXTURE_CONVERSATIONS.filter((c) => c.unread && !c.hidden) : [];
  const linked = preview ? FIXTURE_DEVICES.filter((d) => d.state === "paired" && d.online) : [];
  const shortcuts = ["messages", "devices", "files", "workspace", "calendar", "settings"] as const;

  return (
    <Screen title={`${greeting()}${user ? `, ${user.displayName.split(" ")[0]}` : ""}`} subtitle={online ? "Connected to your Locat server" : connection.mode === "local-only" ? "Local device mode" : "Connection needs attention"} testId="home-screen">
      <div className="mx-auto grid max-w-6xl gap-6 pb-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(280px,.8fr)]">
        <div className="space-y-7">
          <button onClick={() => nav("/offline")} className="group relative flex w-full items-center gap-4 overflow-hidden rounded-3xl bg-s1 p-5 text-left hairline animate-rise" data-testid="home-connection-card">
            <div className="absolute -right-10 -top-16 size-48 rounded-full bg-ember/10 blur-3xl" aria-hidden />
            <span className={cn("grid size-12 shrink-0 place-items-center rounded-2xl", online ? "bg-ok/12 text-ok" : "bg-warn/12 text-warn")}>{online ? <Wifi className="size-6" /> : <CloudOff className="size-6" />}</span>
            <span className="min-w-0 flex-1"><span className="block text-[15px] font-bold">{online ? "Your server is reachable" : connection.mode === "local-only" ? "Using this device" : "Server unreachable"}</span><span className="block truncate font-mono text-xs text-ink-3">{connection.origin ?? "Private data stays on this device"}</span></span>
            <ArrowUpRight className="size-5 text-ink-3 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
          </button>

          <section>
            <SectionTitle action={<Button size="sm" variant="ghost" onClick={() => nav("/messages")}>All chats</Button>}>Recent conversations</SectionTitle>
            {preview && <p className="mb-2 text-xs text-ink-3">Preview sample data</p>}
            {unread.length ? <div className="divide-y divide-line overflow-hidden rounded-2xl bg-s1 hairline">{unread.slice(0, 4).map((c) => (
              <button key={c.id} onClick={() => nav(`/messages/${c.id}`)} className="flex w-full items-center gap-3 p-3 text-left hover:bg-s2" data-testid={`home-unread-${c.id}`}>
                <Avatar name={c.title} presence={c.peer?.presence.state} />
                <span className="min-w-0 flex-1"><span className="block truncate text-sm font-bold">{c.title}</span><span className="block truncate text-[13px] text-ink-2">{c.typing?.length ? <em className="not-italic text-ember">typing…</em> : c.lastPreview}</span></span>
                <Badge tone="ember">{c.unread}</Badge>
              </button>))}</div> : <p className="rounded-2xl bg-s1 p-4 text-sm text-ink-3 hairline">{preview ? "You're all caught up." : "Recent conversations will appear here when this dashboard is connected to your messaging account."}</p>}
          </section>

          <section>
            <SectionTitle action={<Button size="sm" variant="ghost" onClick={() => nav("/devices")}>Manage Link</Button>}>Trusted devices</SectionTitle>
            <div className="grid gap-3 sm:grid-cols-2">{linked.slice(0, 2).map((d) => <div key={d.id} className="flex items-center gap-3 rounded-2xl bg-s1 p-4 hairline"><span className="grid size-10 place-items-center rounded-xl bg-ember/10 text-ember"><Smartphone className="size-5" /></span><span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold">{d.alias}</span><span className="block text-xs text-ink-3">Connected · {d.platform}</span></span><span className="size-2 rounded-full bg-ok" aria-label="Online" /></div>)}
              {!linked.length && <button onClick={() => nav("/devices?pair=1")} className="flex items-center gap-3 rounded-2xl border border-dashed border-line-strong p-4 text-left hover:bg-s1"><span className="grid size-10 place-items-center rounded-xl bg-s2 text-ember"><Smartphone className="size-5" /></span><span><span className="block text-sm font-semibold">{preview ? "Pair a device" : "Manage paired devices"}</span><span className="text-xs text-ink-3">{preview ? "Connect your trusted devices with Link" : "View verified devices and transfers in Link"}</span></span></button>}
            </div>
          </section>
        </div>

        <aside className="space-y-6">
          <section className="rounded-3xl bg-s1 p-4 hairline">
            <SectionTitle>Go to</SectionTitle>
            <div className="grid grid-cols-2 gap-2">{shortcuts.map((id) => {
              const m = MODULES.find((x) => x.id === id)!; const Icon = m.icon; const state = availability(id);
              return <button key={id} onClick={() => nav(m.route)} className="flex min-h-24 flex-col items-start justify-between rounded-2xl bg-s2 p-3 text-left transition-colors hover:bg-s3" title={state.reason} data-testid={`home-shortcut-${id}`}>
                <Icon className="size-5 text-ember" /><span><span className="block text-sm font-semibold">{m.name}</span><span className="text-2xs text-ink-3">{state.availability === "planned" ? "Coming soon" : m.tagline}</span></span>
              </button>;
            })}</div>
          </section>
          {user && !preview ? <LiveHomeContactSummary accountId={user.id} onOpenMessages={section => nav(`/messages?section=${section}`)} /> : <section className="rounded-3xl border border-line bg-s1/60 p-4 hairline">
            <div className="flex items-start gap-3"><span className="grid size-9 shrink-0 place-items-center rounded-xl bg-ember/10 text-ember"><MessageCircle className="size-4" /></span><div><p className="text-sm font-bold">A private place to connect</p><p className="mt-1 text-xs leading-relaxed text-ink-3">{preview ? "This preview uses sample conversations. Connect a Locat server to work with your account." : "Sign in to see your contacts and manage private conversations."}</p></div></div>
          </section>}
        </aside>
      </div>
    </Screen>
  );
}
