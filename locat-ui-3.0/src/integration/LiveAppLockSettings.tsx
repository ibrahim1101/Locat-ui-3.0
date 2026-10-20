import { useEffect, useState, type FormEvent } from "react";
import { Lock, ShieldCheck } from "lucide-react";
import { AUTO_LOCK_OPTIONS, changePasscode, currentState, markLocked, markUnlocked, removeLock, setPasscode, updatePolicy, type AutoLockOptionId } from "@/lib/appLock";
import { Button, Switch, TextField } from "@/ui";
import { notifyAppLockChange } from "./appLockEvents";

export function LiveAppLockSettings() {
  const [state, setState] = useState(currentState);
  const [mode, setMode] = useState<"idle" | "set" | "change" | "remove">("idle");
  const [current, setCurrent] = useState("");
  const [passcode, setPasscodeValue] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [autoLock, setAutoLock] = useState<AutoLockOptionId>(state.config?.autoLockOption ?? "5m");
  const [lockOnBackground, setLockOnBackground] = useState(state.config?.lockOnBackground ?? true);

  useEffect(() => {
    const refresh = () => {
      const next = currentState(); setState(next);
      setAutoLock(next.config?.autoLockOption ?? "5m"); setLockOnBackground(next.config?.lockOnBackground ?? true);
    };
    window.addEventListener("storage", refresh);
    window.addEventListener("locat-app-lock-change", refresh);
    return () => { window.removeEventListener("storage", refresh); window.removeEventListener("locat-app-lock-change", refresh); };
  }, []);

  function reset() { setMode("idle"); setCurrent(""); setPasscodeValue(""); setConfirmation(""); }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (busy) return;
    setBusy(true); setError(""); setMessage("");
    try {
      if (mode === "set" || mode === "change") {
        if (passcode !== confirmation) throw new Error("The two passcodes do not match.");
        if (mode === "set") await setPasscode(passcode, { autoLockOption: autoLock, lockOnBackground });
        else await changePasscode(current, passcode);
        markUnlocked(); setMessage(mode === "set" ? "App lock enabled on this device." : "Device passcode changed.");
      } else if (mode === "remove") {
        await removeLock(current); setMessage("App lock removed from this device.");
      }
      reset(); setState(currentState()); notifyAppLockChange(mode === "set" || mode === "change" ? "unlocked" : undefined);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Could not update app lock."); }
    finally { setBusy(false); }
  }
  function savePolicy(patch: Partial<Pick<NonNullable<typeof state.config>, "autoLockOption" | "lockOnBackground">>) {
    const updated = updatePolicy(patch); if (updated) { setState(currentState()); notifyAppLockChange(); setMessage("App lock preference saved."); }
  }

  return <section className="rounded-2xl bg-s1 p-5 hairline" data-testid="app-lock-settings">
    <div className="flex items-start gap-3"><div className="grid size-10 shrink-0 place-items-center rounded-xl bg-ember/10 text-ember"><Lock className="size-5" aria-hidden /></div><div className="min-w-0 flex-1"><h3 className="font-semibold">Device app lock</h3><p className="mt-1 text-sm text-ink-3">A device-only passcode covers Locat when you leave or lock the app. It never reaches your server.</p></div><span className="shrink-0 rounded-full bg-s2 px-2.5 py-1 text-xs font-semibold hairline">{state.configured ? "On" : "Off"}</span></div>
    {state.configured && <div className="mt-4 space-y-3 border-t border-line pt-3">
      <label className="block text-sm font-semibold">Auto-lock<select aria-label="Auto-lock" data-testid="app-lock-autolock" className="mt-2 w-full rounded-xl bg-s2 p-3 hairline" value={autoLock} onChange={event => { const value = event.target.value as AutoLockOptionId; setAutoLock(value); savePolicy({ autoLockOption: value }); }}>
        {AUTO_LOCK_OPTIONS.map(option => <option key={option.id} value={option.id}>{option.label}</option>)}
      </select></label>
      <Switch label="Lock when Locat moves to the background" description="Require your passcode when you return to this tab or app." checked={lockOnBackground} onChange={value => { setLockOnBackground(value); savePolicy({ lockOnBackground: value }); }} testId="app-lock-background" />
      <p className="flex items-start gap-2 text-xs text-ink-3"><ShieldCheck className="mt-0.5 size-4 shrink-0 text-ember" />Biometric unlock is disabled until signed platform verification is supported.</p>
      <div className="flex flex-wrap gap-2"><Button variant="ghost" disabled={busy} onClick={() => setMode("change")}>Change passcode</Button><Button variant="ghost" disabled={busy} onClick={() => { markLocked(); setState({ ...currentState(), unlocked: false }); notifyAppLockChange("locked"); setMessage("Locat is locked on this device."); }}>Lock now</Button><Button variant="ghost" disabled={busy} onClick={() => setMode("remove")}>Remove lock</Button></div>
    </div>}
    {!state.configured && <div className="mt-4"><Button size="sm" onClick={() => setMode("set")} data-testid="app-lock-enable">Set a device passcode</Button></div>}
    {mode !== "idle" && <details open className="mt-4 rounded-xl bg-s2 p-4 hairline"><summary className="cursor-pointer text-sm font-semibold">{mode === "set" ? "Set passcode" : mode === "change" ? "Change passcode" : "Remove app lock"}</summary><form className="mt-4 space-y-3" onSubmit={submit}>
      {(mode === "change" || mode === "remove") && <TextField label="Current device passcode" reveal value={current} onChange={event => setCurrent(event.target.value)} required autoComplete="current-password" maxLength={128} />}
      {(mode === "set" || mode === "change") && <><TextField label={mode === "set" ? "New device passcode" : "New passcode"} reveal value={passcode} onChange={event => setPasscodeValue(event.target.value)} required minLength={6} maxLength={128} autoComplete="new-password" hint="Use at least 6 characters. A longer passphrase is harder to guess." /><TextField label="Confirm device passcode" reveal value={confirmation} onChange={event => setConfirmation(event.target.value)} required minLength={6} maxLength={128} autoComplete="new-password" /></>}
      <p className="text-xs text-ink-3">This is a privacy screen, not device-storage encryption. Clearing this browser's site data can remove the lock.</p>
      {error && <p role="alert" className="text-sm text-danger">{error}</p>}
      <div className="flex gap-2"><Button type="submit" disabled={busy}>{busy ? "Saving…" : mode === "remove" ? "Confirm removal" : "Save passcode"}</Button><Button type="button" variant="ghost" disabled={busy} onClick={() => { reset(); setError(""); }}>Cancel</Button></div>
    </form></details>}
    {message && <p role="status" className="mt-3 text-sm text-ember">{message}</p>}
  </section>;
}
