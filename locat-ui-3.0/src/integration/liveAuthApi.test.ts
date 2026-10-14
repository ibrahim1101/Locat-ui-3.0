import { describe, expect, it } from "vitest";
import { liveAuthApi } from "./liveAuthApi";

describe("live authentication client", () => {
  it("does not report a successful sign-in on a failed request", async () => {
    const original = globalThis.fetch;
    globalThis.fetch = async () => new Response(JSON.stringify({ error: "Invalid credentials" }), { status: 401, headers: { "Content-Type": "application/json" } });
    try {
      const result = await liveAuthApi.signIn({ username: "test", password: "incorrect password" });
      expect(result.status).toBe("error");
    } finally { globalThis.fetch = original; }
  });

  it("only reports success after the server confirms registration", async () => {
    const original = globalThis.fetch;
    globalThis.fetch = async () => new Response(JSON.stringify({ user: { id: "1", username: "test", displayName: "Test" } }), { status: 201, headers: { "Content-Type": "application/json" } });
    try {
      const result = await liveAuthApi.register({ username: "test", displayName: "Test", password: "correct horse battery staple" });
      expect(result.status).toBe("ok");
    } finally { globalThis.fetch = original; }
  });

  it("returns null for unauthenticated session checks", async () => {
    const original = globalThis.fetch;
    globalThis.fetch = async () => new Response(JSON.stringify({ error: "Not authenticated" }), { status: 401 });
    try { expect(await liveAuthApi.currentAccount()).toBeNull(); }
    finally { globalThis.fetch = original; }
  });
});
