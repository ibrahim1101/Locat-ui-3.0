import type { SessionUserView } from "../contracts/auth";
import type { ConnectionState } from "../contracts/platform";

/** Display-only input from Locat's authenticated provider. No identity keys or tokens. */
export type CoreUserProjection = {
  id: number; username: string; displayName: string; lcCode: string;
  avatar?: string | null; isAdmin?: boolean;
};

export type CoreConnectionProjection = {
  connected: boolean; origin: string; pendingOutbox: number;
  lastSyncAt?: number;
};

export function projectCoreUser(user: CoreUserProjection, serverOrigin: string): SessionUserView {
  return {
    id: String(user.id),
    username: user.username,
    displayName: user.displayName,
    lcCode: user.lcCode,
    isAdmin: user.isAdmin === true,
    serverOrigin,
    ...(user.avatar ? { avatarUrl: user.avatar } : {}),
  };
}

export function projectCoreConnection(input: CoreConnectionProjection): ConnectionState {
  return {
    mode: "server",
    server: input.connected ? "connected" : "disconnected",
    origin: input.origin,
    pendingOutbox: Math.max(0, Math.floor(input.pendingOutbox)),
    ...(input.lastSyncAt === undefined ? {} : { lastSyncAt: input.lastSyncAt }),
  };
}

/** No production user may be inferred from a preview fixture or persisted UI stage. */
export function canEnterLiveApp(authStatus: "loading" | "signedOut" | "needsKeyRestore" | "ready"): boolean {
  return authStatus === "ready";
}
