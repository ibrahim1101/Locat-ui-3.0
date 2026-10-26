import { describe, expect, it } from "vitest";
import type { AvailabilityContext } from "../contracts/adapter";
import type { ModuleId } from "../app/registry";
import { liveModuleAvailability } from "./liveModuleAvailability";

const context: AvailabilityContext = {
  authenticated: true, isAdmin: false,
  connection: { mode: "server", server: "connected", pendingOutbox: 0 },
  platform: { kind: "browser", os: "unknown", capabilities: {
    nativeSaveDialog: false, notifications: false,
    biometric: false, shareTarget: false, widgets: false,
  } },
};

describe("live integration module policy", () => {
  it("rejects unknown modules and marks reconstructed slices in beta", () => {
    expect(liveModuleAvailability("unknown" as ModuleId,context).availability).toBe("unsupported");
    for(const id of ["calendar","automate","workspace","share"] as const)expect(liveModuleAvailability(id,context).availability).toBe("beta");
  });
  it("blocks server-only modules when disconnected", () => {
    expect(liveModuleAvailability("messages", { ...context, connection: { ...context.connection, server: "disconnected" } }).availability).toBe("offline");
  });
  it("keeps server-backed encrypted files unavailable while disconnected", () => {
    expect(liveModuleAvailability("files", { ...context, connection: { ...context.connection, server: "disconnected" } }).availability).toBe("offline");
  });
  it("does not expose authenticated modules to signed-out sessions", () => {
    expect(liveModuleAvailability("messages", { ...context, authenticated: false }).availability).toBe("locked");
  });
  it("restricts administration", () => {
    expect(liveModuleAvailability("admin", context).availability).toBe("admin-only");
  });
});
