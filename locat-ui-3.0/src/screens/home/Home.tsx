import { useNavigate } from "react-router";
import { ArrowUpRight, CloudOff, FlaskConical, Music2, Play, ShieldAlert, Smartphone, Wifi } from "lucide-react";
import { MODULES } from "@/app/registry";
import { useSession } from "@/app/session";
import { usePlayer } from "@/app/player";
import { FIXTURE_ALERTS, FIXTURE_CONVERSATIONS, FIXTURE_DEVICES, FIXTURE_TRACKS, FIXTURE_VIDEOS } from "@/fixtures/data";
import { Screen } from "@/layouts/Screen";
import { AvailabilityBadge, Avatar, Badge, Button, IconButton, SectionTitle, cn, formatDuration, hueGradient } from "@/ui";

function greeting() { const h = new Date().getHours(); return h < 5 ? "Good night" : h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening"; }

/** Home: personal, glanceable, and honest. Every tile reflects an authorized source or says it can't. */
export default function Home() {
  const { user, connection, availability } = useSession();
  const nav = useNavigate();
  const player = usePlayer();
  const online = connection.mode === "server" && connection.server === "connected";
  const unread = FIXTURE_CONVERSATIONS.filter((c) => c.unread && !c.hidden);
  const resume = FIXTURE_VIDEOS.filter((v) => v.progressSec);
  const openAlerts = FIXTURE_ALERTS.filter((a) => a.state === "open");
  const planned = MODULES.filter((m) => availability(m.id).availability === "planned");

  return (
    <Screen title={`${greeting()}${user ? `, ${user.displayName.split(" ")[0]}` : ""}`} subtitle={online ? `Connected · ${connection.route === "same-lan" ? "same network" : connection.route ?? "server"}` : connection.mode === "local-only" ? "Local device mode" : "Offline"} testId="home-screen">
      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-6 pb-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] [&>*]:min-w-0">
        <div className="space-y-6">
          {/* Connection pulse */}
          <button onClick={() => nav("/offline")} className="group relative flex w-full items-center gap-4 overflow-hidden rounded-3xl bg-s1 p-5 text-left hairline animate-rise" data-testid="home-connection-card">
            <div className="absolute -right-10 -top-16 size-48 rounded-full bg-ember/10 blur-3xl" aria-hidden />
            <span className={cn("grid size-12 shrink-0 place-items-center rounded-2xl", online ? "bg-ok/12 text-ok" : "bg-warn/12 text-warn")}>{online ? <Wifi className="size-6" /> : <CloudOff className="size-6" />}</span>
            <span className="min-w-0 flex-1">
              <span className="block text-[15px] font-bold">{online ? "Your server is reachable" : connection.mode === "local-only" ? "Running without a server" : "Server unreachable"}</span>
              <span className="block truncate font-mono text-xs text-ink-3">{connection.origin ?? "Device-only tools are available"}</span>
            </span>
            <ArrowUpRight className="size-5 text-ink-3 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
          </button>

          {/* Messages */}
          {availability("messages").availability !== "offline" && (
            <section className="animate-rise [animation-delay:60ms]">
              <SectionTitle action={<Button size="sm" variant="ghost" onClick={() => nav("/messages")}>All chats</Button>}>Unread</SectionTitle>
              {unread.length ? unread.map((c) => (
                <button key={c.id} onClick={() => nav(`/messages/${c.id}`)} className="flex w-full items-center gap-3 rounded-2xl p-3 text-left hover:bg-s1" data-testid={`home-unread-${c.id}`}>
                  <Avatar name={c.title} presence={c.peer?.presence.state} />
                  <span className="min-w-0 flex-1"><span className="block truncate text-sm font-bold">{c.title}</span><span className="block truncate text-[13px] text-ink-2">{c.typing?.length ? <em className="not-italic text-ember">typing…</em> : c.lastPreview}</span></span>
                  <Badge tone="ember">{c.unread}</Badge>
                </button>)) : <p className="rounded-2xl bg-s1 p-4 text-sm text-ink-3 hairline">You're all caught up.</p>}
            </section>)}

          {/* Continue watching */}
          <section className="animate-rise [animation-delay:120ms]">
            <SectionTitle action={<Button size="sm" variant="ghost" onClick={() => nav("/cinema")}>Cinema</Button>}>Continue watching</SectionTitle>
            <div className="no-scrollbar -mx-4 flex gap-3 overflow-x-auto px-4 md:mx-0 md:px-0">
              {resume.map((v) => (
                <button key={v.id} onClick={() => nav(`/cinema/play/${v.id}`)} className="group w-64 shrink-0 text-left" data-testid={`home-resume-${v.id}`}>
                  <div className="relative aspect-video overflow-hidden rounded-2xl" style={{ background: hueGradient(v.posterHue) }}>
                    <span className="absolute inset-0 grid place-items-center opacity-0 transition-opacity group-hover:opacity-100"><span className="grid size-12 place-items-center rounded-full bg-black/50 backdrop-blur"><Play className="size-5 fill-white text-white" /></span></span>
                    <div className="absolute inset-x-3 bottom-3 h-1 rounded-full bg-white/20"><div className="h-full rounded-full bg-ember" style={{ width: `${(v.progressSec! / v.durationSec) * 100}%` }} /></div>
                  </div>
                  <p className="mt-2 truncate text-sm font-semibold">{v.title}</p>
                  <p className="text-xs text-ink-3">{formatDuration(v.durationSec - v.progressSec!)} left · {v.source === "server" ? "Server" : "This device"}</p>
                </button>))}
            </div>
          </section>
        </div>

        <div className="space-y-6">
          {/* Music quick start */}
          <section className="rounded-3xl bg-s1 p-4 hairline animate-rise [animation-delay:80ms]">
            <SectionTitle action={<IconButton icon={Music2} label="Open Music" size="sm" onClick={() => nav("/music")} />}>Listen</SectionTitle>
            <div className="grid grid-cols-2 gap-2">
              {FIXTURE_TRACKS.slice(0, 4).map((t) => (
                <button key={t.id} onClick={() => player.play(t)} className="flex items-center gap-2.5 rounded-xl bg-s2 p-2 text-left hover:bg-s3" data-testid={`home-track-${t.id}`}>
                  <span className="size-10 shrink-0 rounded-lg" style={{ background: hueGradient(t.hue) }} /><span className="min-w-0"><span className="block truncate text-[13px] font-semibold">{t.title}</span><span className="block truncate text-2xs text-ink-3">{t.artist}</span></span>
                </button>))}
            </div>
          </section>

          {/* Security + devices */}
          <div className="grid grid-cols-2 gap-3 animate-rise [animation-delay:140ms]">
            <button onClick={() => nav("/sentinel")} className="rounded-3xl bg-s1 p-4 text-left hairline hover:bg-s2" data-testid="home-sentinel-tile">
              <ShieldAlert className={cn("size-5", openAlerts.length ? "text-danger" : "text-ok")} />
              <p className="mt-6 text-2xl font-extrabold tabular">{availability("sentinel").availability === "offline" ? "—" : openAlerts.length}</p>
              <p className="text-xs text-ink-3">Open alerts</p>
            </button>
            <button onClick={() => nav("/devices")} className="rounded-3xl bg-s1 p-4 text-left hairline hover:bg-s2" data-testid="home-devices-tile">
              <Smartphone className="size-5 text-ember" />
              <p className="mt-6 text-2xl font-extrabold tabular">{availability("devices").availability === "offline" ? "—" : FIXTURE_DEVICES.filter((d) => d.state === "paired" && d.online).length}</p>
              <p className="text-xs text-ink-3">Devices online</p>
            </button>
          </div>

          {/* Shortcuts */}
          <section className="animate-rise [animation-delay:200ms]">
            <SectionTitle>Shortcuts</SectionTitle>
            <div className="grid grid-cols-4 gap-2">
              {(["messages", "cinema", "photos", "vault", "secrets", "remote", "search", "settings"] as const).map((id) => {
                const m = MODULES.find((x) => x.id === id)!; const I = m.icon; const a = availability(id);
                return (
                  <button key={id} onClick={() => nav(m.route)} className={cn("flex flex-col items-center gap-1.5 rounded-2xl py-3 hover:bg-s1", a.availability === "offline" && "opacity-45")} title={a.reason} data-testid={`home-shortcut-${id}`}>
                    <span className="grid size-11 place-items-center rounded-2xl bg-s2 hairline"><I className="size-5 text-ink-2" /></span><span className="text-[11px] font-semibold text-ink-2">{m.name}</span>
                  </button>);
              })}
            </div>
          </section>

          <section className="rounded-3xl border border-dashed border-line-strong p-4">
            <p className="flex items-center gap-2 text-sm font-bold"><FlaskConical className="size-4 text-planned" />Coming to Locat</p>
            <div className="mt-3 flex flex-wrap gap-2">{planned.map((m) => <button key={m.id} onClick={() => nav(m.route)} className="inline-flex h-9 items-center gap-2 rounded-full bg-s1 px-3 text-xs font-semibold hairline hover:bg-s2"><m.icon className="size-4 text-ink-3" />{m.name}<AvailabilityBadge value="planned" /></button>)}</div>
            <p className="mt-3 text-xs text-ink-3">Widgets (#37) are planned for supported platforms.</p>
          </section>
        </div>
      </div>
    </Screen>
  );
}
