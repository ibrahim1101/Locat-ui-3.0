import { describe, expect, it } from "vitest";
import { canEnterLiveApp } from "./coreProjections";

/**
 * Fresh-start launch contract: preview identity cannot unlock live features.
 * The new backend will provide the authenticated session snapshot.
 */
export type LiveBootState =
  | { status: "loading" }
  | { status: "signedOut" }
  | { status: "needsKeyRestore" }
  | { status: "ready"; accountId: string };

export function liveBootReady(state: LiveBootState): boolean {
  return canEnterLiveApp(state.status) && state.status === "ready" && state.accountId.length > 0;
}

describe("fresh Locat 3.0 live boot", () => {
  it("rejects an unverified or absent session", () => {
    expect(liveBootReady({ status: "loading" })).toBe(false);
    expect(liveBootReady({ status: "signedOut" })).toBe(false);
    expect(liveBootReady({ status: "needsKeyRestore" })).toBe(false);
  });
  it("requires an account identifier for ready state", () => {
    expect(liveBootReady({ status: "ready", accountId: "" })).toBe(false);
    expect(liveBootReady({ status: "ready", accountId: "account-1" })).toBe(true);
  });
});
