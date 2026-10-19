import { useLocation, useNavigate } from "react-router";
import { Accessibility, Bell, Code2, Eye, Fingerprint, HardDrive, Info, KeyRound, Languages, Lock, LogOut, Moon, Palette, Server, Shield, Smartphone, Trash2, User, Users, Volume2, Archive, Camera, Hash } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useSession, useViewport } from "@/app/session";
import { useReport } from "@/app/feedback";
import { THEMES } from "@/theme/tokens";
import { Screen } from "@/layouts/Screen";
import { Avatar, Badge, Banner, Button, ListRow, Section, Segmented, Switch, TextField, cn } from "@/ui";
import { useState, type ReactNode } from "react";

type SectionId = "profile" | "account" | "privacy" | "security" | "appearance" | "notifications" | "storage" | "permissions" | "devices" | "server" | "backup" | "accessibility" | "about";
const NAV: { group: string; items: [SectionId, string, LucideIcon][] }[] = [
  { group: "You", items: [["profile", "Profile", User], ["account", "Account", Users], ["privacy", "Privacy", Eye], ["security", "Security & app lock", Shield]] },
  { group: "App", items: [["appearance", "Appearance", Palette], ["notifications", "Notifications", Bell], ["accessibility", "Accessibility", Accessibility], ["storage", "Storage", HardDrive], ["permissions", "Permissions", Camera]] },
  { group: "Connection", items: [["devices", "Connected devices", Smartphone], ["server", "Server", Server], ["backup", "Backup & recovery", Archive]] },
  { group: "About", items: [["about", "About Locat", Info]] },
];
const LABEL = Object.fromEntries(NAV.flatMap((g) => g.items.map(([id, l]) => [id, l]))) as Record<SectionId, string>;

function Vis({ label, value = "contacts" }: { label: string; value?: string }) {
  const [v, setV] = useState(value);
  return <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3"><span className="text-[15px] font-medium md:text-sm">{label}</span><Segmented size="sm" label={label} value={v} onChange={setV} options={[{ value: "everyone", label: "Everyone" }, { value: "contacts", label: "Contacts" }, { value: "nobody", label: "Nobody" }]} /></div>;
}
const Sw = ({ label, d, on = true, off }: { label: string; d?: string; on?: boolean; off?: string }) => { const [v, setV] = useState(on); return <div className="px-4"><Switch label={label} description={d} checked={v} onChange={setV} disabledReason={off} /></div>; };

function Body({ id }: { id: SectionId }) {
  const s = useSession(); const report = useReport(); const nav = useNavigate();
  const u = s.user;
  const needAccount = !u && ["profile", "account", "privacy", "devices", "backup"].includes(id);
  if (needAccount) return <Banner tone="neutral" icon={HardDrive} title="Available after you sign in" action={<Button size="sm" onClick={() => s.setStage("welcome")}>Sign in</Button>}>This device is in local mode.</Banner>;
  const map: Record<SectionId, ReactNode> = {
    profile: <>
      <div className="mb-6 flex items-center gap-4"><Avatar name={u?.displayName ?? ""} size={80} /><div className="flex flex-col gap-2"><Button size="sm" icon={Camera} onClick={() => report({ status: "integration-pending", reason: "Profile picture upload is owned by ProfileDialog/profilePicture.ts." }, "")} data-testid="change-avatar">Change picture</Button><p className="text-xs text-ink-3">Profile pictures and bio are visible profile metadata on your server.</p></div></div>
      <div className="space-y-4"><TextField label="Display name" defaultValue={u?.displayName} /><div><label className="mb-1.5 block text-[13px] font-semibold text-ink-2" htmlFor="bio">Bio</label><textarea id="bio" rows={3} maxLength={280} defaultValue={u?.bio ?? ""} className="w-full resize-none rounded-xl bg-s2 p-3 text-[15px] outline-hidden hairline focus:shadow-[inset_0_0_0_1.5px_rgb(var(--ember))]" /></div></div>
      <Section className="mt-6" title="Permanent identifiers"><ListRow icon={User} title="Username" subtitle={`@${u?.username}`} trailing={<Badge>Fixed</Badge>} /><ListRow icon={Hash} title="LC code" subtitle={<span className="font-mono">{u?.lcCode}</span>} trailing={<Badge>Fixed</Badge>} /></Section></>,
    account: <><Section title="Accounts on this device">{s.adapter.auth.savedAccounts().map((a) => <ListRow key={a.id} title={a.displayName} subtitle={`@${a.username} · ${new URL(a.serverOrigin).host}`} trailing={a.id === u?.id ? <Badge tone="ok">Current</Badge> : <Button size="sm" onClick={async () => report(await s.adapter.auth.switchAccount(a.id), "Switched")}>Switch</Button>} />)}</Section>
      <Section title="Sign-in methods"><ListRow icon={KeyRound} title="Change password" subtitle="Re-wraps your keys locally" onClick={() => report({ status: "integration-pending", reason: "Password change and key re-wrap are owned by Locat auth." }, "")} chevron /><ListRow icon={Fingerprint} title="Passkeys" disabledReason="Planned (#8)" /><ListRow icon={Shield} title="Two-factor authentication" disabledReason="Planned (#21)" /></Section>
      <Section><ListRow icon={LogOut} title="Sign out" danger onClick={async () => { const r = await s.adapter.auth.signOut(); report(r, "Signed out"); s.setStage("welcome"); }} testId="settings-logout" /><ListRow icon={Trash2} title="Close account" danger disabledReason="Planned (#14) — retention design required" /></Section></>,
    privacy: <><Section title="Who can see" footer="Enforced by your server for profile and presence."><Vis label="Profile picture" value="everyone" /><Vis label="Bio" /><Vis label="Online status & last seen" /></Section>
      <Section title="Messages" footer="Receipts are device-level settings and can't retract receipts already sent."><Sw label="Send read receipts" /><Sw label="Show typing indicator" /></Section>
      <Section title="Hidden content"><ListRow icon={Eye} title="Hidden chats & messages" subtitle="Device-only organization. Restore from Messages → Hidden." onClick={() => nav("/messages")} chevron /></Section>
      <Section title="Blocked"><ListRow icon={Users} title="Blocked contacts" subtitle="1 blocked" onClick={() => nav("/messages")} chevron /></Section>
      <Banner tone="warn" title="About deletion">Deleting removes local copies and sends delete-for-everyone where you can. Locat can't erase copies others saved, old backups, or data recoverable from storage hardware.</Banner></>,
    security: <><Section title="App lock" footer="App lock is a privacy screen. It doesn't encrypt this device's storage."><Sw label="Require passcode" d="6–128 characters" on={false} /><div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3"><span className="text-sm font-medium">Auto-lock</span><Segmented size="sm" label="Auto-lock" value="5m" onChange={() => undefined} options={[{ value: "immediate", label: "Now" }, { value: "1m", label: "1m" }, { value: "5m", label: "5m" }, { value: "1h", label: "1h" }]} /></div><Sw label="Biometric unlock" off="Disabled until signed native verification exists" on={false} /><ListRow icon={Lock} title="Preview the lock screen" onClick={() => s.setStage("locked")} chevron /></Section>
      <Section title="Sessions"><ListRow icon={Smartphone} title="This device" subtitle="Active now" /><ListRow icon={Server} title="Studio Desktop" subtitle="2 hours ago" trailing={<Button size="sm" variant="ghost" onClick={() => report({ status: "integration-pending", reason: "Session revocation is owned by authRouter." }, "")}>Revoke</Button>} /></Section></>,
    appearance: <><Section title="Theme"><div className="grid grid-cols-2 gap-2 p-3 sm:grid-cols-4">{[...THEMES, { id: "system" as const, name: "System", description: "Follow device" }].map((t) => (
        <button key={t.id} onClick={() => s.setPrefs({ theme: t.id })} aria-pressed={s.prefs.theme === t.id} className={cn("rounded-xl p-3 text-left hairline", s.prefs.theme === t.id ? "bg-ember/10 shadow-[inset_0_0_0_1.5px_rgb(var(--ember))]" : "bg-s2")} data-testid={`theme-${t.id}`}>
          <span className="mb-2 block h-10 rounded-lg" style={{ background: t.id === "daylight" ? "#F4F3F0" : t.id === "graphite" ? "#1A1B1F" : t.id === "system" ? "linear-gradient(90deg,#0B0B0C 50%,#F4F3F0 50%)" : "#0B0B0C", boxShadow: "inset 0 0 0 1px rgba(128,128,128,.3)" }} /><span className="text-sm font-semibold">{t.name}</span></button>))}</div></Section>
      <Section title="Layout"><div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3"><span className="text-sm font-medium">Open Locat to</span><Segmented size="sm" label="Startup screen" value={s.prefs.startup} onChange={(v) => s.setPrefs({ startup: v })} options={[{ value: "messages", label: "Messages" }, { value: "home", label: "Home" }]} /></div></Section></>,
    notifications: <><Section title="Alerts"><Sw label="Message notifications" /><Sw label="Show message preview" d="Off shows only 'New message'" on={false} /><Sw label="Server online/offline alerts" d="Partial (#16)" /></Section>
      <Section title="Sound"><ListRow icon={Volume2} title="Notification sound" subtitle="Locat Chime" chevron onClick={() => undefined} /><ListRow icon={Volume2} title="Custom ringtones" disabledReason="Native sounds — planned (#26)" /></Section>
      <Section title="Quiet hours"><Sw label="Quiet hours" d="22:00 – 07:00" on={false} /></Section><p className="text-xs text-ink-3">Background push on Android/desktop needs native integration; reliability varies by platform.</p></>,
    accessibility: <Section title="Display"><div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3"><span className="text-sm font-medium">Text size</span><Segmented size="sm" label="Text size" value={s.prefs.textScale} onChange={(v) => s.setPrefs({ textScale: v })} options={[{ value: "default", label: "Default" }, { value: "large", label: "Large" }, { value: "xl", label: "Largest" }]} /></div>
      <div className="px-4"><Switch label="Reduce motion" checked={s.prefs.motion === "reduced"} onChange={(v) => s.setPrefs({ motion: v ? "reduced" : "system" })} testId="reduce-motion" /></div><ListRow icon={Languages} title="Language" subtitle="English · layouts ready for translation and RTL" /></Section>,
    storage: <Section title="On this device" footer="Clearing removes local copies only."><ListRow icon={HardDrive} title="Message history" subtitle="Encrypted local database" /><ListRow icon={HardDrive} title="Chat attachment previews" subtitle="Temporary images and documents" trailing={<Button size="sm" variant="ghost">Clear</Button>} /><ListRow icon={Archive} title="Download location" subtitle="Ask every time" chevron onClick={() => undefined} /></Section>,
    permissions: <Section title="Device permissions" footer="Locat asks only when you use a feature. Denied permissions only turn off that feature.">{[["Photos & videos", "Ask when attaching"], ["Audio attachments", "Ask when attaching"], ["Microphone", "Ask when recording"], ["Location", "Ask each share"], ["Notifications", "Allowed"], ["Clipboard", "Only when you tap Paste"]].map(([k, v]) => <ListRow key={k} title={k} subtitle={v} trailing={<Button size="sm" variant="ghost">System settings</Button>} />)}</Section>,
    devices: <Section><ListRow icon={Smartphone} title="Manage devices & pairing" onClick={() => nav("/devices")} chevron /></Section>,
    server: <Section><ListRow icon={Server} title="Server address" subtitle={s.connection.origin ?? "Not configured"} onClick={() => s.setStage("server")} chevron /><ListRow icon={Shield} title="Connection details" onClick={() => nav("/offline")} chevron />{u?.isAdmin && <ListRow icon={Users} title="Server administration" onClick={() => nav("/admin")} chevron />}</Section>,
    backup: <><Section title="Encrypted backup" footer="Backups are encrypted with a passphrase you choose. Locat can't recover it."><ListRow icon={Archive} title="Create encrypted backup" onClick={() => report({ status: "integration-pending", reason: "Backup export is owned by src/lib/archive.ts." }, "")} chevron /><ListRow icon={KeyRound} title="Restore identity from backup" onClick={() => report({ status: "integration-pending", reason: "Identity restore is owned by Locat key recovery." }, "")} chevron /></Section></>,
    about: <Section><ListRow icon={Info} title="Locat UI" subtitle="3.0.0-preview.2 · presentation layer" /><ListRow icon={Code2} title="Adapter" subtitle={s.adapter.mode === "preview" ? "Preview fixtures (not connected)" : "Live"} /><ListRow icon={Moon} title="Platform" subtitle={s.platform.kind} /></Section>,
  };
  return <>{map[id]}</>;
}

/** Settings: grouped hierarchy. Two-pane on desktop; list → detail on phones. */
export default function Settings() {
  const { pathname } = useLocation(); const nav = useNavigate(); const { compact } = useViewport(); const { user } = useSession();
  const id = pathname.split("/")[2] as SectionId | undefined;
  const list = (
    <div className="space-y-6">
      {user && <button onClick={() => nav("/settings/profile")} className="flex w-full items-center gap-3 rounded-2xl bg-s1 p-3 text-left hairline hover:bg-s2"><Avatar name={user.displayName} size={52} /><span className="min-w-0"><span className="block truncate font-bold">{user.displayName}</span><span className="block font-mono text-xs text-ink-3">@{user.username} · {user.lcCode}</span></span></button>}
      {NAV.map((g) => <Section key={g.group} title={g.group}>{g.items.map(([sid, l, I]) => <ListRow key={sid} icon={I} title={l} onClick={() => nav(`/settings/${sid}`)} chevron testId={`settings-${sid}`} className={cn(id === sid && "bg-s2")} />)}</Section>)}
    </div>
  );
  if (compact) return id ? <Screen title={LABEL[id]} back="/settings" testId={`settings-page-${id}`}><Body id={id} /></Screen> : <Screen title="Settings" testId="settings-screen">{list}</Screen>;
  return (
    <Screen title="Settings" testId="settings-screen">
      <div className="mx-auto grid max-w-6xl grid-cols-[300px_1fr] gap-8">
        <div>{list}</div>
        <div data-testid={`settings-page-${id ?? "profile"}`}><h2 className="mb-4 text-lg font-bold">{LABEL[id ?? "profile"]}</h2><Body id={id ?? "profile"} /></div>
      </div>
    </Screen>
  );
}
