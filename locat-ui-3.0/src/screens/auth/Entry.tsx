import { useMemo, useState, type FormEvent, type ReactNode } from "react";
import { ArrowLeft, ArrowRight, CheckCircle2, Delete, FlaskConical, Globe, HardDrive, KeyRound, Lock, LogIn, Network, ServerCog, ShieldAlert, ShieldCheck, UserPlus, Wifi } from "lucide-react";
import type { OperationResult, ServerProbeView } from "@/contracts";
import { useSession } from "@/app/session";
import { FIXTURE_USER } from "@/fixtures/data";
import { Avatar, Banner, Button, IconButton, LocatMark, Meter, Sheet, TextField, cn, relTime } from "@/ui";

/** Entry shell: brand panel on desktop, single column on mobile. */
function Frame({ children, onBack, step }: { children: ReactNode; onBack?: () => void; step?: string }) {
  return (
    <div className="flex min-h-dvh bg-canvas" data-testid="entry-flow">
      <aside className="relative hidden w-[44%] max-w-[620px] overflow-hidden border-r border-line bg-s1 lg:flex lg:flex-col lg:justify-between lg:p-12">
        <div className="mesh absolute inset-0 opacity-60" aria-hidden />
        <div className="absolute -bottom-40 -left-40 size-[520px] rounded-full bg-ember/20 blur-[120px]" aria-hidden />
        <div className="relative flex items-center gap-3"><LocatMark size={40} /><span className="text-xl font-extrabold tracking-tight">Locat</span></div>
        <div className="relative">
          <p className="text-[40px] font-extrabold leading-[1.05] tracking-tight">Your messages, media and devices.<br /><span className="text-ember">On a server you own.</span></p>
          <p className="mt-5 max-w-md text-[15px] leading-relaxed text-ink-2">End-to-end encrypted conversations, a private media hub and secure device links — running on your own hardware, on your own network.</p>
        </div>
        <ul className="relative grid grid-cols-3 gap-3 text-xs text-ink-2">
          {[[ShieldCheck, "E2EE identity on your device"], [Network, "Same-LAN first, Tailscale optional"], [HardDrive, "Local tools work offline"]].map(([I, t], i) => {
            const Icon = I as typeof ShieldCheck; return <li key={i} className="rounded-xl bg-s2/80 p-3 hairline"><Icon className="mb-2 size-4 text-ember" />{t as string}</li>;
          })}
        </ul>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col pt-safe pb-safe">
        <div className="flex h-16 items-center gap-2 px-4">
          {onBack && <IconButton icon={ArrowLeft} label="Back" onClick={onBack} />}
          {step && <span className="text-xs font-semibold text-ink-3">{step}</span>}
        </div>
        <div className="flex flex-1 items-start justify-center overflow-y-auto px-5 pb-10 sm:items-center"><div className="w-full max-w-[420px] animate-rise">{children}</div></div>
      </div>
    </div>
  );
}

/** Shown when the preview adapter declines a real auth operation. Never fakes success. */
function PendingNotice({ result, onContinue }: { result: OperationResult; onContinue(): void }) {
  if (result.status !== "integration-pending") return result.status === "error" ? <Banner tone="danger" icon={ShieldAlert} title={result.message} className="mt-4" /> : result.status === "ok" ? <Banner tone="info" icon={CheckCircle2} title="Account created" className="mt-4">You can now sign in with your new account.</Banner> : null;
  return (
    <div className="mt-5 rounded-2xl bg-planned/10 p-4" data-testid="auth-pending-notice">
      <p className="flex items-center gap-2 text-sm font-bold text-planned"><FlaskConical className="size-4" />Not signed in — this is a UI preview</p>
      <p className="mt-1.5 text-[13px] leading-relaxed text-ink-2">{result.reason} No credentials were sent anywhere.</p>
      <Button variant="secondary" block className="mt-3" onClick={onContinue} trailingIcon={ArrowRight} data-testid="continue-demo-button">Explore with fictional demo data</Button>
    </div>
  );
}

function Welcome({ go }: { go(s: "login" | "register" | "local-intro" | "server"): void }) {
  const { connection } = useSession();
  return (
    <Frame>
      <div className="mb-10 flex flex-col items-start lg:hidden"><LocatMark size={56} /><h1 className="mt-6 text-[32px] font-extrabold leading-tight tracking-tight">Private by<br />design. <span className="text-ember">Yours.</span></h1></div>
      <h1 className="mb-2 hidden text-3xl font-extrabold tracking-tight lg:block">Welcome to Locat</h1>
      <p className="mb-8 text-[15px] leading-relaxed text-ink-2">Sign in to your Locat server, create an account, or use this device's local tools without one.</p>
      <div className="space-y-3">
        <Button variant="primary" size="lg" block icon={LogIn} onClick={() => go("login")} data-testid="welcome-signin">Sign in</Button>
        <Button size="lg" block icon={UserPlus} onClick={() => go("register")} data-testid="welcome-register">Create an account</Button>
        <button onClick={() => go("local-intro")} data-testid="welcome-local" className="flex min-h-[56px] w-full items-center gap-3 rounded-xl px-4 text-left hover:bg-s1">
          <HardDrive className="size-5 text-ink-3" /><span className="flex-1"><span className="block text-sm font-semibold">Use without a server</span><span className="block text-xs text-ink-3">Media players, Photos and Remote viewer on this device</span></span><ArrowRight className="size-4 text-ink-3" />
        </button>
      </div>
      <button onClick={() => go("server")} className="mt-8 flex w-full items-center gap-3 rounded-xl bg-s1 p-3.5 text-left hairline hover:bg-s2" data-testid="welcome-server">
        <ServerCog className="size-5 text-ember" />
        <span className="min-w-0 flex-1"><span className="block text-2xs font-bold uppercase tracking-wider text-ink-3">Server</span><span className="block truncate font-mono text-[13px]">{connection.origin ?? "Not configured"}</span></span>
        <span className="text-xs font-semibold text-ember">Change</span>
      </button>
    </Frame>
  );
}

function ServerSetup({ back }: { back(): void }) {
  const { adapter, connection, setConnection } = useSession();
  const [origin, setOrigin] = useState(connection.origin ?? "https://");
  const [probe, setProbe] = useState<ServerProbeView>({ state: "idle" });
  const check = async (e: FormEvent) => { e.preventDefault(); setProbe({ state: "checking", origin }); setProbe(await adapter.auth.probeServer(origin.trim())); };
  return (
    <Frame onBack={back} step="Server connection">
      <h1 className="text-2xl font-extrabold tracking-tight">Connect to your server</h1>
      <p className="mt-2 text-sm leading-relaxed text-ink-2">Locat only connects over trusted HTTPS. On the same network as your server, use its LAN address — Tailscale is optional for access from elsewhere.</p>
      <form onSubmit={check} className="mt-6 space-y-4">
        <TextField label="Server address" icon={Globe} value={origin} onChange={(e) => setOrigin(e.target.value)} inputMode="url" autoCapitalize="off" autoCorrect="off" spellCheck={false} placeholder="https://locat.home.lan" data-testid="server-origin-input"
          hint="Example: https://locat.local or your Tailscale HTTPS name" />
        <Button type="submit" variant="primary" block loading={probe.state === "checking"} data-testid="server-check-button">Check connection</Button>
      </form>
      <div className="mt-4" aria-live="polite">
        {probe.state === "insecure-rejected" && <Banner tone="danger" icon={ShieldAlert} title="HTTPS is required">Plain http:// addresses are refused so your session and keys are never exposed on the network.</Banner>}
        {probe.state === "tls-error" && <Banner tone="danger" icon={ShieldAlert} title="Certificate not trusted">{probe.detail}</Banner>}
        {probe.state === "unreachable" && <Banner tone="planned" icon={FlaskConical} title="Not checked in preview">{probe.detail}</Banner>}
        {probe.state === "trusted" && <Banner tone="info" icon={CheckCircle2} title="Trusted Locat server">{probe.origin}</Banner>}
      </div>
      <div className="mt-8 grid gap-2 text-[13px] text-ink-2">
        <p className="flex gap-2.5"><Wifi className="mt-0.5 size-4 shrink-0 text-ink-3" />Same LAN: phone and server on the same Wi-Fi. No internet needed.</p>
        <p className="flex gap-2.5"><Network className="mt-0.5 size-4 shrink-0 text-ink-3" />Remote: Tailscale HTTPS names work when you're away. Optional.</p>
      </div>
      {probe.state !== "idle" && probe.state !== "checking" && <Button variant="ghost" block className="mt-6" onClick={() => { setConnection({ ...connection, origin }); back(); }}>Keep this address and continue</Button>}
    </Frame>
  );
}

function SignIn({ back, done }: { back(): void; done(): void }) {
  const { adapter, connection } = useSession();
  const [u, setU] = useState(""); const [p, setP] = useState(""); const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<OperationResult | null>(null);
  const accounts = adapter.auth.savedAccounts();
  const submit = async (e: FormEvent) => { e.preventDefault(); setBusy(true); setResult(await adapter.auth.signIn({ username: u, password: p, serverOrigin: connection.origin ?? "" })); setBusy(false); };
  return (
    <Frame onBack={back} step="Sign in">
      <h1 className="text-2xl font-extrabold tracking-tight">Sign in</h1>
      <p className="mt-1 truncate font-mono text-xs text-ink-3">{connection.origin}</p>
      {accounts.length > 0 && (
        <div className="mt-6"><p className="mb-2 text-2xs font-bold uppercase tracking-wider text-ink-3">On this device</p>
          <div className="divide-y divide-line overflow-hidden rounded-2xl bg-s1 hairline">
            {accounts.map((a) => (
              <button key={a.id} onClick={() => setU(a.username)} className="flex w-full items-center gap-3 p-3 text-left hover:bg-s2" data-testid={`saved-account-${a.id}`}>
                <Avatar name={a.displayName} size={38} /><span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold">{a.displayName}</span><span className="block truncate text-xs text-ink-3">@{a.username} · {new URL(a.serverOrigin).host} · {relTime(a.lastUsedAt)}</span></span>
              </button>))}
          </div>
        </div>)}
      <form onSubmit={submit} className="mt-6 space-y-4">
        <TextField label="Username" value={u} onChange={(e) => setU(e.target.value)} autoComplete="username" autoCapitalize="off" data-testid="login-username" />
        <TextField label="Password" reveal value={p} onChange={(e) => setP(e.target.value)} autoComplete="current-password" data-testid="login-password" />
        <Button type="submit" variant="primary" size="lg" block loading={busy} disabledReason={!u || !p ? "Enter username and password" : null} data-testid="login-submit">Sign in</Button>
      </form>
      {result && <PendingNotice result={result} onContinue={done} />}
      <div className="mt-6 flex flex-col gap-1 text-sm">
        <RecoveryLink />
        <p className="flex items-center gap-2 px-1 py-2 text-xs text-ink-3"><KeyRound className="size-4" />Passkeys and two-factor sign-in are planned (#8, #21).</p>
      </div>
    </Frame>
  );
}

function RecoveryLink() {
  const [open, setOpen] = useState(false);
  return (<>
    <button onClick={() => setOpen(true)} className="rounded-lg px-1 py-2 text-left font-semibold text-ember hover:underline" data-testid="recovery-link">Restore identity from encrypted backup</button>
    <Sheet open={open} onClose={() => setOpen(false)} title="Identity recovery" description="Your encryption identity lives on your devices, not on the server.">
      <ol className="list-decimal space-y-2 pl-5 text-sm leading-relaxed text-ink-2">
        <li>Sign in on this device with your password.</li><li>Choose your encrypted Locat backup file.</li><li>Enter the backup passphrase to unwrap your keys locally.</li>
      </ol>
      <Banner className="mt-4" tone="warn" icon={ShieldAlert} title="Locat can't reset a forgotten backup passphrase">Without it, older encrypted messages can't be read on a new device.</Banner>
    </Sheet>
  </>);
}

function Register({ back, done }: { back(): void; done(): void }) {
  const { adapter, connection } = useSession();
  const [u, setU] = useState(""); const [n, setN] = useState(""); const [p, setP] = useState(""); const [c, setC] = useState(""); const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<OperationResult | null>(null);
  const g = useMemo(() => adapter.auth.passwordGuidance(p, u), [adapter, p, u]);
  const mismatch = c.length > 0 && c !== p;
  const submit = async (e: FormEvent) => { e.preventDefault(); setBusy(true); setResult(await adapter.auth.register({ username: u, displayName: n, password: p, serverOrigin: connection.origin ?? "" })); setBusy(false); };
  return (
    <Frame onBack={back} step="Create account">
      <h1 className="text-2xl font-extrabold tracking-tight">Create your account</h1>
      <p className="mt-2 text-sm text-ink-2">Your username and LC code are permanent. Your encryption keys are created on this device.</p>
      <form onSubmit={submit} className="mt-6 space-y-4">
        <TextField label="Username" value={u} onChange={(e) => setU(e.target.value.toLowerCase())} autoCapitalize="off" hint="Lowercase letters, numbers and dots. Can't be changed later." data-testid="register-username" />
        <TextField label="Display name" value={n} onChange={(e) => setN(e.target.value)} data-testid="register-display-name" />
        <div>
          <TextField label="Password" reveal value={p} onChange={(e) => setP(e.target.value)} autoComplete="new-password" data-testid="register-password" />
          <Meter className="mt-2.5" label="Password strength" value={g.strength / 4} tone={g.strength < 2 ? "danger" : g.strength < 3 ? "warn" : "ok"} />
          <p className={cn("mt-2 text-xs", g.ok ? "text-ok" : "text-ink-3")} data-testid="password-guidance">{g.ok ? "Strong passphrase. Spaces and any language are fine." : g.message ?? "Use at least 15 characters. A memorable sentence is ideal."}</p>
        </div>
        <TextField label="Confirm password" reveal value={c} onChange={(e) => setC(e.target.value)} autoComplete="new-password" error={mismatch ? "Passwords don't match" : null} data-testid="register-confirm" />
        <Button type="submit" variant="primary" size="lg" block loading={busy} disabledReason={!u || !n ? "Fill in username and display name" : !g.ok ? "Password doesn't meet the policy yet" : mismatch || !c ? "Confirm your password" : null} data-testid="register-submit">Create account</Button>
      </form>
      {result && <PendingNotice result={result} onContinue={done} />}
    </Frame>
  );
}

function LocalIntro({ back, done }: { back(): void; done(): void }) {
  return (
    <Frame onBack={back} step="Local device mode">
      <div className="mb-6 grid size-14 place-items-center rounded-2xl bg-s2"><HardDrive className="size-6 text-ember" /></div>
      <h1 className="text-2xl font-extrabold tracking-tight">Use Locat on this device only</h1>
      <p className="mt-2 text-sm leading-relaxed text-ink-2">No account and no server. Nothing leaves this device.</p>
      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl bg-ok/8 p-4 hairline"><p className="mb-2 text-2xs font-bold uppercase tracking-wider text-ok">Works</p><ul className="space-y-1.5 text-[13px] text-ink-2"><li>Cinema & Music (device files)</li><li>Photos viewer & editor</li><li>Remote viewer</li><li>Diagnostics</li></ul></div>
        <div className="rounded-2xl bg-s1 p-4 hairline"><p className="mb-2 text-2xs font-bold uppercase tracking-wider text-ink-3">Needs an account</p><ul className="space-y-1.5 text-[13px] text-ink-3"><li>Messages & contacts</li><li>Devices / Link</li><li>Vault, Secrets, Sentinel</li><li>Server media libraries</li></ul></div>
      </div>
      <Button variant="primary" size="lg" block className="mt-8" onClick={done} data-testid="local-continue">Continue on this device</Button>
    </Frame>
  );
}

/** App lock (Locat #22): UI barrier only, not storage encryption. */
export function LockScreen({ onPreviewContinue }: { onPreviewContinue(): void }) {
  const { adapter } = useSession();
  const [code, setCode] = useState(""); const [result, setResult] = useState<OperationResult | null>(null);
  const press = async (d: string) => {
    const next = (code + d).slice(0, 12); setCode(next);
    if (next.length >= 6 && d === "") return;
  };
  const submit = async () => { setResult(await adapter.appLock.unlock(code)); setCode(""); };
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-canvas px-6 pt-safe pb-safe" data-testid="lock-screen">
      <Lock className="mb-4 size-7 text-ember" />
      <h1 className="text-xl font-extrabold">Locat is locked</h1>
      <p className="mt-1 text-sm text-ink-3">Enter your app passcode</p>
      <div className="my-8 flex h-4 gap-3" aria-label={`${code.length} digits entered`}>{Array.from({ length: Math.max(6, code.length) }, (_, i) => <span key={i} className={cn("size-3 rounded-full transition-colors", i < code.length ? "bg-ember" : "bg-s3")} />)}</div>
      <div className="grid grid-cols-3 gap-3">
        {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((d) => <button key={d} onClick={() => press(d)} className="size-[72px] rounded-full bg-s1 text-2xl font-semibold hairline hover:bg-s2 active:bg-s3" data-testid={`lock-key-${d}`}>{d}</button>)}
        <button onClick={() => setCode(code.slice(0, -1))} aria-label="Delete digit" className="grid size-[72px] place-items-center rounded-full text-ink-2 hover:bg-s1"><Delete className="size-6" /></button>
        <button onClick={() => press("0")} className="size-[72px] rounded-full bg-s1 text-2xl font-semibold hairline hover:bg-s2" data-testid="lock-key-0">0</button>
        <button onClick={submit} disabled={code.length < 6} aria-label="Unlock" className="grid size-[72px] place-items-center rounded-full bg-ember text-ember-ink disabled:opacity-30" data-testid="lock-submit"><ArrowRight className="size-6" /></button>
      </div>
      <p className="mt-8 max-w-xs text-center text-xs text-ink-3">Biometric unlock stays off until signed native verification is available.</p>
      {result && <div className="w-full max-w-sm"><PendingNotice result={result} onContinue={onPreviewContinue} /></div>}
    </div>
  );
}

export function EntryFlow() {
  const s = useSession();
  const enterDemo = () => { if (s.adapter.mode !== "preview") return; s.setUser(FIXTURE_USER); s.setConnection({ ...s.connection, mode: "server", server: "connected", origin: s.connection.origin ?? FIXTURE_USER.serverOrigin }); s.setStage("app"); };
  const enterLocal = async () => { if (s.adapter.mode !== "preview") return; await s.adapter.auth.enterLocalMode(); s.setUser(null); s.setConnection({ mode: "local-only", server: "not-configured", pendingOutbox: 0 }); s.setStage("app"); };
  const home = () => s.setStage("welcome");
  switch (s.stage) {
    case "login": return <SignIn back={home} done={enterDemo} />;
    case "register": return <Register back={home} done={enterDemo} />;
    case "server": return <ServerSetup back={home} />;
    case "local-intro": return s.adapter.mode === "preview" ? <LocalIntro back={home} done={enterLocal} /> : <Welcome go={(x) => s.setStage(x)} />;
    case "locked": return <LockScreen onPreviewContinue={() => { if (s.adapter.mode === "preview") s.setStage("app"); }} />;
    default: return <Welcome go={(x) => s.setStage(x)} />;
  }
}
