import { useCallback, useEffect, useState, type FormEvent, type ReactNode } from "react";
import { Lock } from "lucide-react";
import { AUTO_LOCK_OPTIONS, currentState, markLocked, markUnlocked, recordActivity, shouldAutoLock, verifyPasscode } from "@/lib/appLock";
import { LocatMark, Button, TextField } from "@/ui";
import { APP_LOCK_CHANGE_EVENT } from "./appLockEvents";

export function LiveAppLockGate({ children }: { children: ReactNode }) {
  const [state, setState] = useState(() => {
    const saved = currentState(); return saved.configured ? { ...saved, unlocked: false } : saved;
  });
  const bump = useCallback(() => setState(currentState()), []);

  useEffect(() => {
    if (currentState().configured) markLocked();
    const changed = (event: Event) => {
      const next = currentState();
      const requested = (event as CustomEvent<{ state?: "locked" | "unlocked" }>).detail?.state;
      if (next.configured && requested === "locked") next.unlocked = false;
      if (next.configured && requested === "unlocked") next.unlocked = true;
      setState(next);
    };
    const storageChanged = (event: StorageEvent) => { if (event.key === "locat-app-lock-v1" || event.key === null) bump(); };
    window.addEventListener(APP_LOCK_CHANGE_EVENT, changed);
    window.addEventListener("storage", storageChanged);
    return () => { window.removeEventListener(APP_LOCK_CHANGE_EVENT, changed); window.removeEventListener("storage", storageChanged); };
  }, [bump]);

  useEffect(() => {
    const config = currentState().config;
    if (!config?.lockOnBackground) return;
    const hide = (event: Event) => { if (event.type === "pagehide" || document.visibilityState === "hidden") { markLocked(); bump(); } };
    document.addEventListener("visibilitychange", hide);
    window.addEventListener("pagehide", hide);
    return () => { document.removeEventListener("visibilitychange", hide); window.removeEventListener("pagehide", hide); };
  }, [state.configured, state.config?.lockOnBackground, state.unlocked, bump]);

  useEffect(() => {
    if (!state.configured || !state.unlocked) return;
    const activity = () => recordActivity();
    const check = () => { if (shouldAutoLock(Date.now())) { markLocked(); bump(); } };
    const events: (keyof WindowEventMap)[] = ["pointerdown", "keydown", "wheel", "touchstart", "focus"];
    for (const name of events) window.addEventListener(name, activity, { passive: true });
    const timer = window.setInterval(check, 1_000);
    activity();
    return () => { for (const name of events) window.removeEventListener(name, activity); window.clearInterval(timer); };
  }, [state.configured, state.unlocked, state.config?.autoLockOption, bump]);

  if (!state.configured || state.unlocked) return <>{children}</>;
  return <LockPrompt onUnlocked={() => setState({ ...currentState(), unlocked: true })} />;
}

function LockPrompt({ onUnlocked }: { onUnlocked(): void }) {
  const [passcode, setPasscode] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (busy) return;
    setBusy(true); setError("");
    try {
      if (!(await verifyPasscode(passcode))) { setError("That passcode did not match. Try again."); return; }
      markUnlocked(); setPasscode(""); onUnlocked();
    } catch (reason) { setError(reason instanceof Error ? reason.message : "The app lock could not be checked."); }
    finally { setBusy(false); }
  }
  const autoLock = currentState().config?.autoLockOption;
  const label = AUTO_LOCK_OPTIONS.find(option => option.id === autoLock)?.label ?? "your selected interval";
  const backgroundLock = currentState().config?.lockOnBackground;
  return <main className="flex min-h-dvh items-center justify-center bg-canvas px-5 py-10" data-testid="app-lock-gate">
    <section role="dialog" aria-modal="true" aria-labelledby="app-lock-title" className="w-full max-w-sm rounded-3xl bg-s1 p-6 text-center hairline shadow-lift">
      <LocatMark size={48} className="mx-auto" />
      <div className="mx-auto mt-5 grid size-12 place-items-center rounded-2xl bg-ember/10 text-ember"><Lock className="size-5" aria-hidden /></div>
      <h1 id="app-lock-title" className="mt-4 text-xl font-extrabold">Locat is locked</h1>
      <p className="mt-2 text-sm leading-relaxed text-ink-3">Enter your device passcode to continue. Locat locks {label.toLowerCase()}{backgroundLock ? " and whenever it moves to the background." : "."}</p>
      <form className="mt-6 space-y-4 text-left" onSubmit={event => void submit(event)} data-testid="app-lock-form">
        <TextField label="Device passcode" value={passcode} onChange={event => setPasscode(event.target.value)} autoComplete="current-password" autoFocus reveal maxLength={128} data-testid="app-lock-passcode" />
        {error && <p role="alert" className="text-sm text-danger">{error}</p>}
        <Button type="submit" block disabled={busy || passcode.length === 0} data-testid="app-lock-submit">{busy ? "Checking…" : "Unlock Locat"}</Button>
      </form>
      <p className="mt-5 text-xs leading-relaxed text-ink-3">This privacy screen does not encrypt browser storage. Biometric unlock is unavailable until verified platform authentication is ready.</p>
    </section>
  </main>;
}
