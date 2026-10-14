import { render, screen } from "@testing-library/react";
import { expect, it } from "vitest";
import { SessionProvider, type LiveSessionSnapshot } from "../app/SessionProvider";
import { useSession } from "../app/session";
import { previewAdapter } from "../fixtures/previewAdapter";
import type { PlatformInfo } from "../contracts";
const adapter = { ...previewAdapter, mode: "live" as const };
const platform = { kind: "browser", os: "unknown", capabilities: {} } as PlatformInfo;
const connection = { mode: "local-only" as const, server: "not-configured" as const, pendingOutbox: 0 };
function Probe() { const { stage, user } = useSession(); return <p>{stage}:{user?.id ?? "no-identity"}</p>; }
function show(snapshot: LiveSessionSnapshot) { return render(<SessionProvider adapter={adapter} platform={platform} initialUser={null} initialConnection={connection} liveSession={snapshot}><Probe /></SessionProvider>); }
it("defaults unauthenticated live entry to login, without a fixture identity", () => {
  show({ authStatus: "signedOut", user: null, connection });
  expect(screen.getByText("login:no-identity")).toBeVisible();
});
it("local device entry opens tools without turning a preview identity into an account", () => {
  show({ authStatus: "local", user: null, connection });
  expect(screen.getByText("app:no-identity")).toBeVisible();
});
