import { describe, expect, it } from "vitest";
import { MODULES } from "@/app/registry";
import { previewAdapter } from "@/fixtures/previewAdapter";
import { parentRoute } from "@/app/back";
import { composerCapabilities } from "@/screens/messages/capabilities";
import { FIXTURE_CONVERSATIONS, FIXTURE_SECRETS } from "@/fixtures/data";
import type { AvailabilityContext } from "@/contracts";

const ctx = (over: Partial<AvailabilityContext> = {}): AvailabilityContext => ({
  connection: { mode: "server", server: "connected", pendingOutbox: 0 }, isAdmin: false, authenticated: true,
  platform: { kind: "browser", capabilities: { nativeSaveDialog: false, notifications: false, pictureInPicture: false, biometric: false, shareTarget: false, widgets: false, mediaStore: false, backgroundAudio: false } }, ...over,
});

describe("module registry", () => {
  it("covers every required ecosystem section", () => {
    const ids = MODULES.map((m) => m.id);
    for (const id of ["home", "messages", "cinema", "music", "photos", "devices", "sentinel", "remote", "vault", "secrets", "search", "hub", "admin", "diagnostics", "workspace", "calendar", "automate", "share", "extensions", "offline", "settings", "profile"]) expect(ids).toContain(id);
  });
  it("planned modules are never available", () => {
    for (const m of MODULES.filter((x) => x.implementation === "planned")) expect(previewAdapter.moduleAvailability(m.id, ctx()).availability).toBe("planned");
  });
  it("admin modules require admin", () => {
    expect(previewAdapter.moduleAvailability("hub", ctx()).availability).toBe("admin-only");
    expect(previewAdapter.moduleAvailability("hub", ctx({ isAdmin: true })).availability).not.toBe("admin-only");
  });
  it("server modules go offline in local mode while local tools stay usable", () => {
    const local = ctx({ connection: { mode: "local-only", server: "not-configured", pendingOutbox: 0 }, authenticated: false });
    expect(previewAdapter.moduleAvailability("messages", local).availability).toBe("offline");
    expect(previewAdapter.moduleAvailability("cinema", local).availability).not.toBe("offline");
  });
});

describe("honesty guarantees", () => {
  it("preview adapter never reports success for server operations", async () => {
    expect((await previewAdapter.auth.signIn({ username: "a", password: "b", serverOrigin: "https://x" })).status).toBe("integration-pending");
    expect((await previewAdapter.messaging.send("c", { text: "hi" })).status).toBe("integration-pending");
    expect((await previewAdapter.privateStore.unlock("secrets", "x")).status).toBe("integration-pending");
    expect((await previewAdapter.link.revokeDevice("d")).status).toBe("integration-pending");
  });
  it("rejects plain http servers", async () => {
    expect((await previewAdapter.auth.probeServer("http://locat.lan")).state).toBe("insecure-rejected");
  });
  it("secret fixtures contain no password values", () => {
    for (const s of FIXTURE_SECRETS) expect(Object.keys(s)).not.toContain("password");
  });
  it("password guidance enforces 15 Unicode characters", () => {
    expect(previewAdapter.auth.passwordGuidance("short", "u").ok).toBe(false);
    expect(previewAdapter.auth.passwordGuidance("ünïcödé pässphrase ok", "rowan").ok).toBe(true);
  });
});

describe("control states (mirrors docs/CONTROL-STATES.md)", () => {
  const conv = (state: (typeof FIXTURE_CONVERSATIONS)[number]["state"]) => ({ ...FIXTURE_CONVERSATIONS[0], state });
  it("blocked keeps controls visible but disabled", () => {
    const c = composerCapabilities(conv("blocked"), { hiddenView: false, online: true });
    expect(c.replacedBy).toBeUndefined(); expect(c.text.enabled).toBe(false); expect(c.voice.enabled).toBe(false);
  });
  it("hidden view, former member and key rotation replace the composer", () => {
    expect(composerCapabilities(conv("active"), { hiddenView: true, online: true }).replacedBy).toBeTruthy();
    expect(composerCapabilities(conv("archived-former-member"), { hiddenView: false, online: true }).replacedBy).toBeTruthy();
    expect(composerCapabilities(conv("key-rotation-required"), { hiddenView: false, online: true }).replacedBy).toBeTruthy();
  });
  it("encrypted video sharing is not offered as working", () => {
    expect(composerCapabilities(conv("active"), { hiddenView: false, online: true }).video.enabled).toBe(false);
  });
});

describe("android back contract", () => {
  it("detail routes return to their parent", () => {
    expect(parentRoute("/messages/c-mira")).toBe("/messages");
    expect(parentRoute("/cinema/play/v1")).toBe("/cinema/play");
    expect(parentRoute("/settings")).toBeNull();
  });
});
