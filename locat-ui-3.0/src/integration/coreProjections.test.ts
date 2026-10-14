import { describe, expect, it } from "vitest";
import { canEnterLiveApp, projectCoreConnection, projectCoreUser } from "./coreProjections";

describe("Locat core integration projections", () => {
  it("does not project crypto or account secrets", () => {
    const source = { id: 7, username: "test", displayName: "Test", lcCode: "LC-0007", isAdmin: false, publicKey: "sensitive" };
    const view = projectCoreUser(source, "https://example.org");
    expect(view).toEqual({ id: "7", username: "test", displayName: "Test", lcCode: "LC-0007", isAdmin: false, serverOrigin: "https://example.org" });
    expect(JSON.stringify(view)).not.toContain("sensitive");
  });

  it("projects real connection state without claiming connected when offline", () => {
    const view = projectCoreConnection({ connected: false, origin: "https://example.org", pendingOutbox: 3 });
    expect(view.server).toBe("disconnected");
    expect(view.pendingOutbox).toBe(3);
  });

  it("requires complete identity-key restoration before entering the app", () => {
    expect(canEnterLiveApp("loading")).toBe(false);
    expect(canEnterLiveApp("signedOut")).toBe(false);
    expect(canEnterLiveApp("needsKeyRestore")).toBe(false);
    expect(canEnterLiveApp("ready")).toBe(true);
  });
});
