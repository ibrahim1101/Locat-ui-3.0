import type { Availability } from "../contracts/common";
import type { AvailabilityContext } from "../contracts/adapter";
import type { ModuleId } from "../app/registry";
import { MODULES } from "../app/registry";

/**
 * Temporary policy bridge until Locat's authoritative module registry is
 * imported. Uses audited UI module metadata, not preview fixtures.
 * IMPORTANT: backend permissions must still be enforced by Locat's server.
 */
export function liveModuleAvailability(id: ModuleId, ctx: AvailabilityContext): { availability: Availability; reason?: string } {
  const module = MODULES.find((entry) => entry.id === id);
  if (!module) return { availability: "unsupported", reason: "Unknown module" };
  if (module.implementation === "planned") return { availability: "planned", reason: "Not implemented yet" };
  if (module.adminOnly && !ctx.isAdmin) return { availability: "admin-only", reason: "Administrator access required" };
  if (!ctx.authenticated && !["gallery"].includes(id)) return { availability: "locked", reason: "Sign in to Locat" };
  if (!module.localCapable && ctx.connection.server !== "connected") return { availability: "offline", reason: "Connect to server" };
  if (module.implementation === "experimental") return { availability: "experimental" };
  if (module.implementation === "partial" || module.implementation === "scaffolded" || module.implementation === "unresolved") return { availability: "beta" };
  return { availability: "available" };
}
