import { useEffect, useState, type FormEvent } from "react";
import { useSession } from "../app/session";

type DeviceSession = { id: string; expiresAt: number; current: boolean };
async function api(path: string, data?: object) {
  const response = await fetch(path, { method: data ? "POST" : "GET", credentials: "same-origin", cache: "no-store", headers: data ? { "Content-Type": "application/json" } : undefined, body: data ? JSON.stringify(data) : undefined });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error ?? "Request failed");
  return result;
}

export function LiveAccountSettings() {
  const { user, adapter, prefs, setPrefs } = useSession();
  const [name, setName] = useState(user?.displayName ?? "");
  const [bio, setBio] = useState(user?.bio ?? "");
  const [sessions, setSessions] = useState<DeviceSession[]>([]);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    let active = true;
    void api("/api/auth/sessions").then(data => { if (active) setSessions(data.sessions); }).catch(error => { if (active) setMessage(error.message); });
    return () => { active = false; };
  }, []);
  async function action(operation: () => Promise<void>) {
    setBusy(true); setMessage("");
    try { await operation(); } catch (error) { setMessage(error instanceof Error ? error.message : "Request failed"); }
    finally { setBusy(false); }
  }
  function password(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    void action(async () => {
      await api("/api/auth/password", { currentPassword: data.get("currentPassword"), newPassword: data.get("newPassword") });
      form.reset();
      await adapter.auth.signOut();
    });
  }
  const inputClass = "w-full rounded-lg border border-white/10 bg-transparent p-3";
  const buttonClass = "rounded-lg bg-ember px-4 py-2 font-semibold text-ember-ink disabled:opacity-50";
  return <section className="space-y-6" aria-label="Account settings">
    <label className="block">Theme<select className={inputClass} value={prefs.theme} onChange={event => {
      const theme = event.target.value as typeof prefs.theme;
      void action(async () => { await api("/api/preferences", { theme }); setPrefs({ theme }); setMessage("Theme saved."); });
    }}><option value="obsidian">Obsidian</option><option value="graphite">Graphite</option><option value="daylight">Daylight</option><option value="system">System</option></select></label>
    <h2 className="text-xl font-semibold">Account settings</h2>
    <form className="space-y-3" onSubmit={event => { event.preventDefault(); void action(async () => { await api("/api/profile", { displayName: name, bio }); setMessage("Display name saved. Reload to refresh your account heading."); }); }}>
      <label className="block">Display name<input className={inputClass} value={name} onChange={event => setName(event.target.value)} required maxLength={80} /></label>
      <label className="block">Bio<textarea className={inputClass} value={bio} onChange={event => setBio(event.target.value)} maxLength={500} /></label>
      <p className="text-sm text-ink-3">Your directory identity: {user?.lcCode}. Profile information is visible to accounts that discover you.</p>
      <button className={buttonClass} disabled={busy}>Save profile</button>
    </form>
    <div className="space-y-3"><h3 className="font-semibold">Active sessions</h3>
      {sessions.map(session => <div key={session.id} className="flex items-center justify-between gap-3 rounded-lg border border-white/10 p-3">
        <span>{session.current ? "This session" : "Another session"} · Expires {new Date(session.expiresAt).toLocaleString()}</span>
        {!session.current && <button className={buttonClass} disabled={busy} onClick={() => void action(async () => { await api("/api/auth/sessions/revoke", { id: session.id }); setSessions(old => old.filter(item => item.id !== session.id)); setMessage("Session revoked."); })}>Revoke</button>}
      </div>)}
    </div>
    <form className="space-y-3" onSubmit={password}>
      <h3 className="font-semibold">Change password</h3>
      <label className="block">Current password<input className={inputClass} name="currentPassword" type="password" autoComplete="current-password" required maxLength={256} /></label>
      <label className="block">New password<input className={inputClass} name="newPassword" type="password" autoComplete="new-password" required minLength={15} maxLength={256} /></label>
      <p className="text-sm text-ink-3">Changing your password signs out every session.</p>
      <button className={buttonClass} disabled={busy}>Change password</button>
    </form>
    <p role="status">{message}</p>
  </section>;
}
