import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
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

afterEach(() => vi.unstubAllGlobals());
function ThemeProbe() { const { setPrefs } = useSession(); return <button onClick={() => setPrefs({ theme: "system" })}>Follow system theme</button>; }
it.each([false, true])("system appearance follows operating system changes (legacy listener=%s)", legacy => {
  let listener: (() => void) | undefined;
  const subscribe = (_event: unknown, fn?: () => void) => { listener = legacy ? _event as () => void : fn; };
  const query = { matches: true, ...(legacy ? { addListener: subscribe, removeListener: vi.fn() } : { addEventListener: subscribe, removeEventListener: vi.fn() }) };
  vi.stubGlobal("matchMedia", () => query);
  render(<SessionProvider adapter={adapter} platform={platform} initialUser={null} initialConnection={connection} liveSession={{ authStatus: "local", user: null, connection }}><ThemeProbe /></SessionProvider>);
  fireEvent.click(screen.getByRole("button", { name: "Follow system theme" }));
  expect(document.documentElement.dataset.theme).toBe("daylight");
  query.matches = false; listener?.();
  expect(document.documentElement.dataset.theme).toBe("obsidian");
});
