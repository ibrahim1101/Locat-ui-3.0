import { test } from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createServer } from "node:net";

async function freePort() {
  const server = createServer();
  await new Promise((resolve, reject) => server.once("error", reject).listen(0, "127.0.0.1", resolve));
  const port = server.address().port;
  await new Promise(resolve => server.close(resolve));
  return port;
}

test("development API: auth, isolation, encrypted envelope validation", async () => {
  const dir = await mkdtemp(join(tmpdir(), "locat-api-test-"));
  const port = await freePort();
  const origin = "http://127.0.0.1:" + port;
  const child = spawn(process.execPath, ["server/index.mjs"], {
    cwd: process.cwd(),
    env: { ...process.env, LOCAT_HOST: "127.0.0.1", LOCAT_PORT: String(port), LOCAT_DATA_FILE: join(dir, "auth.json") },
    stdio: "ignore",
  });
  async function request(path, method = "GET", data, cookie) {
    const headers = { Origin: origin };
    if (data !== undefined) headers["Content-Type"] = "application/json";
    if (cookie) headers.Cookie = cookie;
    return fetch(origin + path, { method, headers, body: data === undefined ? undefined : JSON.stringify(data) });
  }
  try {
    let ready = false;
    for (let i = 0; i < 60; i++) {
      if (child.exitCode !== null) throw new Error("API exited during startup");
      try { const res = await request("/api/ready"); if (res.ok) { ready = true; break; } } catch {}
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    assert.equal(ready, true, "API did not become ready");
    const password = "long-test-password-123";
    assert.equal((await request("/api/auth/register", "POST", { username: "alice", displayName: "Alice", password })).status, 201);
    assert.equal((await request("/api/auth/register", "POST", { username: "bob", displayName: "Bob", password })).status, 201);
    assert.equal((await request("/api/auth/register", "POST", null)).status, 400);
    assert.equal((await request("/api/messages")).status, 401);
    const login = await request("/api/auth/login", "POST", { username: "alice", password });
    assert.equal(login.status, 200);
    const aliceCookie = login.headers.get("set-cookie").split(";")[0];
    const bobLogin = await request("/api/auth/login", "POST", { username: "bob", password });
    const bobCookie = bobLogin.headers.get("set-cookie").split(";")[0];
    const bob = (await (await request("/api/users/search?q=bob", "GET", undefined, aliceCookie)).json()).users[0];
    assert.ok(bob.id);
    const payload = { recipientId: bob.id, ciphertext: "A".repeat(48), nonce: "B".repeat(24), algorithm: "client-e2ee-v1" };
    assert.equal((await request("/api/messages", "POST", { ...payload, plaintext: "secret" }, aliceCookie)).status, 400);
    assert.equal((await request("/api/messages", "POST", { ...payload, extra: "unexpected" }, aliceCookie)).status, 400);
    assert.equal((await request("/api/messages", "POST", payload, aliceCookie)).status, 201);
    const aliceInbox = await (await request("/api/messages", "GET", undefined, aliceCookie)).json();
    assert.equal(aliceInbox.messages.length, 0);
    const bobInbox = await (await request("/api/messages", "GET", undefined, bobCookie)).json();
    assert.equal(bobInbox.messages.length, 1);
    assert.equal(bobInbox.messages[0].ciphertext, payload.ciphertext);
    assert.equal((await request("/api/messages?after=" + bobInbox.nextCursor, "GET", undefined, bobCookie)).status, 200);
    assert.equal((await request("/api/auth/logout", "POST", undefined, aliceCookie)).status, 200);
    assert.equal((await request("/api/auth/me", "GET", undefined, aliceCookie)).status, 401);
  } finally {
    child.kill();
    await rm(dir, { recursive: true, force: true });
  }
});
