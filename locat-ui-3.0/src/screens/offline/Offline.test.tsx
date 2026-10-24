import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { afterEach, expect, it, vi } from "vitest";
import { SessionProvider } from "@/app/SessionProvider";
import { previewAdapter } from "@/fixtures/previewAdapter";
import type { ConnectionState, PlatformInfo } from "@/contracts";
import Offline from "./Offline";

const connection: ConnectionState = { mode: "server", server: "connected", origin: "https://locat.example", pendingOutbox: 0 };
const platform: PlatformInfo = { kind: "browser", capabilities: { nativeSaveDialog: false, notifications: false, biometric: false, shareTarget: false, widgets: false } };

function renderOffline() {
  return render(<MemoryRouter><SessionProvider adapter={previewAdapter} initialUser={null} initialConnection={connection} platform={platform}><Offline /></SessionProvider></MemoryRouter>);
}

afterEach(() => vi.unstubAllGlobals());

it("reports a valid Locat readiness response", async () => {
  const fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ app: "Locat" }) });
  vi.stubGlobal("fetch", fetch);
  renderOffline();
  fireEvent.click(screen.getByRole("button", { name: "Test connection" }));
  expect(await screen.findByRole("status")).toHaveTextContent("Locat server responded and is ready.");
  expect(fetch).toHaveBeenCalledWith("/api/ready", { cache: "no-store", credentials: "omit", signal: expect.any(AbortSignal) });
});

it("reports when the configured server cannot be reached", async () => {
  vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
  renderOffline();
  fireEvent.click(screen.getByRole("button", { name: "Test connection" }));
  expect(await screen.findByRole("status")).toHaveTextContent("Could not reach the configured Locat server.");
});

it("aborts an in-flight check when the screen unmounts", async () => {
  let signal: AbortSignal | undefined;
  vi.stubGlobal("fetch", vi.fn((_url: string, options: { signal: AbortSignal }) => {
    signal = options.signal;
    return new Promise((_resolve, reject) => signal?.addEventListener("abort", () => reject(new Error("aborted"))));
  }));
  const view = renderOffline();
  fireEvent.click(screen.getByRole("button", { name: "Test connection" }));
  await waitFor(() => expect(signal).toBeDefined());
  view.unmount();
  expect(signal?.aborted).toBe(true);
});
