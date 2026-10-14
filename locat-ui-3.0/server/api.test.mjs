import { once } from "node:events";
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtemp, rm, mkdir, writeFile, symlink } from "node:fs/promises";
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
  const mediaDir = join(dir, "media");
  await mkdir(mediaDir);
  await writeFile(join(mediaDir, "movie.mp4"), "0123456789");
  await writeFile(join(mediaDir, "song.flac"), "audio-fixture");
  await writeFile(join(mediaDir, "ignored.txt"), "not media");
  const outside = join(dir, "private.mp4");
  await writeFile(outside, "private-outside-root");
  let supportsSymlinks = true;
  try { await symlink(outside, join(mediaDir, "escape.mp4")); } catch { supportsSymlinks = false; }
  const port = await freePort();
  const origin = "http://127.0.0.1:" + port;
  const child = spawn(process.execPath, ["server/index.mjs"], {
    cwd: process.cwd(),
    env: { ...process.env, LOCAT_HOST: "127.0.0.1", LOCAT_PORT: String(port), LOCAT_DATABASE_FILE: join(dir, "auth.sqlite"), LOCAT_MEDIA_AUTHORIZED_ROOTS: mediaDir },
    stdio: "ignore",
  });
  async function request(path, method = "GET", data, cookie, extraHeaders = {}) {
    const headers = { Origin: origin, ...extraHeaders };
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
    assert.equal((await request("/api/media")).status, 401);
    const media = await (await request("/api/media", "GET", undefined, aliceCookie)).json();
    assert.equal(media.items.length, 2);
    assert.ok(!JSON.stringify(media).includes(mediaDir), "absolute host paths must not escape");
    const movie = media.items.find(item => item.name === "movie.mp4");
    const whole = await request(movie.streamUrl, "GET", undefined, aliceCookie);
    assert.equal(whole.status, 200); assert.equal(await whole.text(), "0123456789");
    const partial = await request(movie.streamUrl, "GET", undefined, aliceCookie, { Range: "bytes=2-5" });
    assert.equal(partial.status, 206); assert.equal(partial.headers.get("content-range"), "bytes 2-5/10"); assert.equal(await partial.text(), "2345");
    const suffix = await request(movie.streamUrl, "GET", undefined, bobCookie, { Range: "bytes=-3" });
    assert.equal(await suffix.text(), "789");
    assert.equal((await request(movie.streamUrl, "GET", undefined, aliceCookie, { Range: "bytes=50-" })).status, 416);
    const head = await request(movie.streamUrl, "HEAD", undefined, aliceCookie);
    assert.equal(head.headers.get("content-length"), "10"); assert.equal(await head.text(), "");
    assert.equal((await request(movie.streamUrl)).status, 401);
    assert.equal((await request("/api/media/stream/invalid", "GET", undefined, aliceCookie)).status, 400);
    assert.equal((await request("/api/media/stream/" + "0".repeat(64), "GET", undefined, aliceCookie)).status, 404);
    if (supportsSymlinks) {
      await rm(join(mediaDir, "movie.mp4")); await symlink(outside, join(mediaDir, "movie.mp4"));
      assert.equal((await request(movie.streamUrl, "GET", undefined, aliceCookie)).status, 404);
    }
    assert.match(bob.lcCode, /^LC-[1-9][0-9]{3}$/);
    const codeLookup = await (await request("/api/users/search?q=" + bob.lcCode, "GET", undefined, aliceCookie)).json();
    assert.equal(codeLookup.users[0].id, bob.id);
    assert.equal((await request("/api/diagnostics")).status, 401);
    const diagnostics = await (await request("/api/diagnostics", "GET", undefined, aliceCookie)).json();
    assert.equal(diagnostics.database.schemaVersion, 4); assert.equal(diagnostics.database.accessible, true);
    assert.equal(diagnostics.privateMessaging, "not-enabled"); assert.ok(!JSON.stringify(diagnostics).includes(dir));
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
    const alice = (await (await request("/api/auth/me", "GET", undefined, aliceCookie)).json()).user;
    assert.equal((await request("/api/contacts")).status, 401);
    assert.equal((await request("/api/contacts/request", "POST", { userId: bob.id }, aliceCookie)).status, 200);
    assert.equal((await request("/api/contacts/respond", "POST", { userId: bob.id, accept: true }, aliceCookie)).status, 404);
    assert.equal((await request("/api/contacts/respond", "POST", { userId: alice.id, accept: true }, bobCookie)).status, 200);
    const friends = (await (await request("/api/contacts", "GET", undefined, aliceCookie)).json()).contacts;
    assert.equal(friends.length, 1); assert.equal(friends[0].status, "accepted");
    assert.equal((await request("/api/contacts/block", "POST", { userId: alice.id, blocked: true }, bobCookie)).status, 200);
    assert.equal((await request("/api/messages", "POST", payload, aliceCookie)).status, 403);
    assert.equal((await request("/api/contacts/request", "POST", { userId: bob.id }, aliceCookie)).status, 403);
    assert.deepEqual((await (await request("/api/users/search?q=bob", "GET", undefined, aliceCookie)).json()).users, []);
    assert.equal((await request("/api/contacts/block", "POST", { userId: alice.id, blocked: false }, bobCookie)).status, 200);
    assert.deepEqual((await (await request("/api/contacts", "GET", undefined, aliceCookie)).json()).contacts, []);
    assert.equal((await request("/api/auth/sessions")).status, 401);
    const aliceSessions = (await (await request("/api/auth/sessions", "GET", undefined, aliceCookie)).json()).sessions;
    assert.equal(aliceSessions.length, 1);
    assert.equal(aliceSessions[0].current, true);
    const bobSessions = (await (await request("/api/auth/sessions", "GET", undefined, bobCookie)).json()).sessions;
    await request("/api/auth/sessions/revoke", "POST", { id: bobSessions[0].id }, aliceCookie);
    assert.equal((await request("/api/auth/me", "GET", undefined, bobCookie)).status, 200);
    assert.equal((await request("/api/profile", "POST", { displayName: "Alice Updated", bio: "My public bio" }, aliceCookie)).status, 200);
    assert.equal((await (await request("/api/auth/me", "GET", undefined, aliceCookie)).json()).user.displayName, "Alice Updated");
    assert.equal((await (await request("/api/auth/me", "GET", undefined, aliceCookie)).json()).user.bio, "My public bio");
    assert.equal((await request("/api/profile", "POST", { displayName: "Alice Updated", lcCode: "LC-1000" }, aliceCookie)).status, 400);
    assert.equal((await request("/api/auth/password", "POST", { currentPassword: "incorrect", newPassword: "new-long-password-123" }, aliceCookie)).status, 401);
    assert.equal((await request("/api/auth/password", "POST", { currentPassword: password, newPassword: "new-long-password-123" }, aliceCookie)).status, 200);
    assert.equal((await request("/api/auth/me", "GET", undefined, aliceCookie)).status, 401);
    assert.equal((await request(movie.streamUrl, "GET", undefined, aliceCookie)).status, 401);
    assert.equal((await request("/api/auth/login", "POST", { username: "alice", password })).status, 401);
    const updatedLogin = await request("/api/auth/login", "POST", { username: "alice", password: "new-long-password-123" });
    assert.equal(updatedLogin.status, 200);
    const updatedCookie = updatedLogin.headers.get("set-cookie").split(";")[0];
    assert.equal((await request("/api/preferences", "POST", { theme: "graphite", startup: "home" }, updatedCookie)).status, 200);
    assert.equal((await request("/api/preferences", "POST", { largeLibraries: true }, updatedCookie)).status, 400);
    assert.equal((await (await request("/api/preferences", "GET", undefined, updatedCookie)).json()).preferences.theme, "graphite");
    assert.deepEqual((await (await request("/api/preferences", "GET", undefined, bobCookie)).json()).preferences, {});
    const events = (await (await request("/api/security/events", "GET", undefined, updatedCookie)).json()).events;
    assert.ok(events.some(event => event.event === "password.changed"));
    assert.ok(events.some(event => event.event === "login.failed"));
    assert.equal((await request("/api/security/events")).status, 401);
    assert.equal((await request("/api/auth/logout", "POST", undefined, updatedCookie)).status, 200);
    assert.equal((await request("/api/auth/me", "GET", undefined, updatedCookie)).status, 401);
    assert.equal((await request("/api/auth/logout", "POST", undefined, aliceCookie)).status, 200);
    assert.equal((await request("/api/auth/me", "GET", undefined, aliceCookie)).status, 401);
    assert.equal((await request(movie.streamUrl, "GET", undefined, aliceCookie)).status, 401);
    let limited;
    for (let i = 0; i < 25; i++) limited = await request("/api/auth/login", "POST", { username: "x", password: "x" });
    assert.equal(limited.status, 429);
    assert.ok(Number(limited.headers.get("retry-after")) > 0);
    assert.equal((await request("/api/ready")).status, 200);
  } finally {
    if (child.exitCode === null && child.signalCode === null) { child.kill(); await once(child, "exit"); }
    await rm(dir, { recursive: true, force: true });
  }
});
