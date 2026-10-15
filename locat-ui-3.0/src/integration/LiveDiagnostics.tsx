import { useEffect, useState } from "react";
import { Screen } from "../layouts/Screen";
import { Button, formatBytes } from "../ui";
import { useSession } from "../app/session";
type Snapshot = { serverId?:string; tlsTermination?:string; runtime: string; uptimeSeconds: number; tls: boolean; origin: string; database: { schemaVersion: number; accessible: boolean }; media: { itemCount: number; truncated: boolean; libraries: { name: string; count: number; available: boolean }[] }; privateMessaging: string; nativeClients: string };
export function LiveDiagnostics({ offline = false }: { offline?: boolean }) {
  const { connection } = useSession();
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [storage, setStorage] = useState<StorageEstimate | null>(null);
  const [error, setError] = useState("");
  async function load() {
    const response = await fetch("/api/diagnostics", { credentials: "same-origin", cache: "no-store" });
    const data = await response.json(); if (!response.ok) throw new Error(data.error ?? "Diagnostics unavailable");
    return data as Snapshot;
  }
  useEffect(() => {
    let active = true;
    if (connection.mode !== "local-only") void load().then(data => { if (active) setSnapshot(data); }).catch(error => { if (active) setError(error.message); });
    if (navigator.storage?.estimate) void navigator.storage.estimate().then(data => { if (active) setStorage(data); }).catch(() => {});
    return () => { active = false; };
  }, [connection.mode]);
  return <Screen title={offline ? "Offline management" : "Diagnostics"} subtitle="Measured service and browser state" actions={connection.mode !== "local-only" ? <Button onClick={() => void load().then(data => { setSnapshot(data); setError(""); }).catch(error => setError(error.message))}>Refresh</Button> : undefined}>
    <div className="mx-auto max-w-4xl space-y-5"><p>Connection: <strong>{connection.server}</strong></p><p>Real-time session: <strong>{connection.realtime ?? "Not active"}</strong></p><p className="text-sm text-ink-3">Device media remains in this browser. It is not part of the server database backup. Readiness checks run every 15 seconds when connected, retry with backoff after failures, and react to browser network changes.</p>
      {error && <p role="alert" className="text-danger">{error}</p>}
      {snapshot && <dl className="grid gap-3 sm:grid-cols-2">{[["Server instance", snapshot.serverId ?? "Not reported"], ["TLS termination", snapshot.tlsTermination ?? "Not reported"], ["Runtime", snapshot.runtime], ["Database schema", snapshot.database.schemaVersion], ["Database access", snapshot.database.accessible ? "Available" : "Failed"], ["HTTPS", snapshot.tls ? "Enabled" : "Loopback HTTP"], ["Server uptime", `${snapshot.uptimeSeconds}s`], ["Indexed server media", snapshot.media.itemCount], ["Scan cap reached", snapshot.media.truncated ? "Yes" : "No"], ["Private messaging", snapshot.privateMessaging], ["Native clients", snapshot.nativeClients]].map(([label, value]) => <div key={label} className="rounded-xl bg-s1 p-4 hairline"><dt className="text-xs text-ink-3">{label}</dt><dd className="mt-1 font-semibold">{value}</dd></div>)}</dl>}
      {storage && <p className="text-sm text-ink-3">Origin storage: {formatBytes(storage.usage ?? 0)} used of an estimated {formatBytes(storage.quota ?? 0)} quota. This includes all application storage for this origin.</p>}
      <p className="text-sm text-ink-3">Self-hosting and recovery instructions are in docs/SELF_HOSTING.md and server/README.md. No credentials or absolute host paths are included in this diagnostic response.</p>
    </div>
  </Screen>;
}
