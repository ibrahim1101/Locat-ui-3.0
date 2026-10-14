import { LiveAccountSettings } from "./LiveAccountSettings";
import { useSession } from "../app/session";

/** Live mode never renders preview conversations, contacts or media as real data. */
export function LiveModuleNotice({ title }: { title: string }) {
  const { adapter, connection, user } = useSession();
  return <main className="mx-auto max-w-2xl space-y-5 p-8" data-testid="live-module-notice">
    <h1 className="text-3xl font-bold">{title}</h1>
    <p className="text-ink-2">Signed in as <strong>{user?.displayName ?? "Unknown account"}</strong> (@{user?.username ?? "unknown"}).</p>
    <p className="text-ink-2">This module is not connected to the live backend yet. Preview messages, files, devices and security events are deliberately hidden in live mode.</p>
    <p className="text-sm text-ink-3">Backend: {connection.server}. Account sessions are real; end-to-end encryption and other modules are not enabled.</p>
    <LiveAccountSettings />
    <button type="button" className="rounded-lg bg-ember px-5 py-3 font-semibold text-ember-ink" onClick={() => void adapter.auth.signOut()}>Sign out</button>
  </main>;
}
