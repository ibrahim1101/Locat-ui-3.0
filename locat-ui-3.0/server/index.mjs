/**
 * Locat 3.0 development authentication service.
 * Run with Node 24+: node server/index.mjs
 * Uses built-in modules and versioned SQLite persistence (Node 24+).
 * Never expose this development service directly to the public internet.
 */
import { createServer as createHttpServer } from "node:http";
import { createServer as createHttpsServer } from "node:https";
import { readFile } from "node:fs/promises";
import { serverConfig, requestOrigin } from "./config.mjs";
import { serveStatic } from "./static.mjs";
import { randomBytes, scrypt as scryptCallback, timingSafeEqual, createHash } from "node:crypto";
import { promisify } from "node:util";
import { createMediaLibrary } from "./media.mjs";
import { createRateLimiter } from "./rateLimit.mjs";
import { createPrivateHandler } from "./privateStore.mjs";
import { createSentinelHandler } from "./sentinel.mjs";
import { openDatabase } from "./database.mjs";

const scrypt = promisify(scryptCallback);
if (process.env.LOCAT_DATA_FILE) throw new Error("LOCAT_DATA_FILE is retired; set LOCAT_DATABASE_FILE to a new SQLite path. Legacy JSON is never overwritten.");
const config = serverConfig();
const db = openDatabase(process.env.LOCAT_DATABASE_FILE ?? "./server/data/locat.sqlite");
const { host, port } = config;
const mediaLibrary = createMediaLibrary();
const authLimit = createRateLimiter();
const SESSION_MS = 7 * 24 * 60 * 60 * 1000;
let queue = Promise.resolve();

function serialized(fn) {
  const next = queue.then(fn);
  queue = next.catch(() => {});
  return next;
}
function json(res, status, body, headers = {}) {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff", ...headers });
  res.end(JSON.stringify(body));
}
async function body(req, maximum = 16384) {
  const chunks=[]; let size=0;
  for await (const chunk of req) {
    size += chunk.length;
    if(size > maximum) throw Object.assign(new Error("Request too large"), {status:413});
    chunks.push(chunk);
  }
  try { return JSON.parse(new TextDecoder("utf-8", {fatal:true}).decode(Buffer.concat(chunks))); }
  catch { throw Object.assign(new Error("Invalid JSON or UTF-8"), {status:400}); }
}
function publicUser(user) { return { id: user.id, username: user.username, displayName: user.displayName, lcCode: "LC-" + user.lcCode, bio: user.bio }; }
function cookie(req) {
  const match = /(?:^|;\s*)locat_session=([a-f0-9]{64})(?:;|$)/.exec(req.headers.cookie ?? "");
  return match?.[1] ?? null;
}
function sessionUser(req) {
  const token = cookie(req);
  if (!token) return null;
  const digest = createHash("sha256").update(token).digest("hex");
  return db.sessionUser(digest, Date.now()) ?? null;
}
function setCookie(token, maxAge) {
  return "locat_session=" + token + "; HttpOnly; SameSite=Strict; Path=/; Max-Age=" + maxAge + (config.tls ? "; Secure" : "");
}
const privateHandler = createPrivateHandler({store:db.privateStore,sessionUser,body,json,audit:db.audit});
const sentinelHandler = createSentinelHandler({store:db.sentinel,sessionUser,body,json});
async function handle(req, res) {
  const trustedOrigin = requestOrigin(req, config);
  if (!trustedOrigin) return json(res, 403, { error: "Host not trusted" });
  const url = new URL(req.url ?? "/", trustedOrigin);
  if (req.method === "POST" && ["/api/auth/login", "/api/auth/register", "/api/auth/password"].includes(url.pathname)) {
    const retryAfter = authLimit(req.socket.remoteAddress ?? "unknown");
    if (retryAfter) return json(res, 429, { error: "Too many attempts. Try again later." }, { "Retry-After": String(retryAfter) });
  }
  if (await privateHandler(req,res,url,trustedOrigin)) return;
  if (await sentinelHandler(req,res,url,trustedOrigin)) return;
  if (req.method === "GET" && url.pathname === "/api/ready") return json(res, 200, { app: "Locat", status: "ready" });
  if (url.pathname === "/api/diagnostics" && req.method === "GET") {
    if (!sessionUser(req)) return json(res, 401, { error: "Not authenticated" });
    const media = await mediaLibrary.refresh();
    return json(res, 200, { app: "Locat", runtime: process.version, uptimeSeconds: Math.floor(process.uptime()), database: db.health(), tls: config.tls, origin: trustedOrigin, media: { libraries: media.libraries, itemCount: media.items.length, truncated: media.truncated, refreshedAt: media.refreshedAt }, privateMessaging: "not-enabled", nativeClients: "not-verified" });
  }
  if (url.pathname === "/api/media" && req.method === "GET") {
    if (!sessionUser(req)) return json(res, 401, { error: "Not authenticated" });
    return json(res, 200, await mediaLibrary.refresh());
  }
  if (url.pathname.startsWith("/api/media/probe/") && req.method === "GET") {
    if (!sessionUser(req)) return json(res, 401, { error: "Not authenticated" });
    const id = url.pathname.slice("/api/media/probe/".length);
    if (!/^[a-f0-9]{64}$/.test(id)) return json(res, 400, { error: "Invalid media ID" });
    return json(res, 200, await mediaLibrary.stream(req, res, id, { probeOnly: true }));
  }
  if (url.pathname.startsWith("/api/media/stream/") && ["GET", "HEAD"].includes(req.method)) {
    if (!sessionUser(req)) return json(res, 401, { error: "Not authenticated" });
    const id = url.pathname.slice("/api/media/stream/".length);
    if (!/^[a-f0-9]{64}$/.test(id)) return json(res, 400, { error: "Invalid media ID" });
    const mode = url.searchParams.get("mode") ?? "direct";
    const audio = url.searchParams.get("audio");
    if (!["direct", "remux", "transcode"].includes(mode) || (audio !== null && (!/^\d{1,3}$/.test(audio) || mode === "direct"))) return json(res, 400, { error: "Invalid playback mode or audio track" });
    return mediaLibrary.stream(req, res, id, { mode, audioIndex: audio === null ? null : Number(audio) });
  }
  if (req.method === "GET" && url.pathname === "/api/auth/me") {
    const user = sessionUser(req);
    return json(res, user ? 200 : 401, user ? { user: publicUser(user) } : { error: "Not authenticated" });
  }
  if (url.pathname === "/api/contacts" && req.method === "GET") {
    const user = sessionUser(req);
    if (!user) return json(res, 401, { error: "Not authenticated" });
    const contacts = db.contacts(user.id).map(row => ({ user: publicUser(db.userById(row.lowId === user.id ? row.highId : row.lowId)), status: row.status, direction: row.requesterId === user.id ? "outgoing" : "incoming" }));
    const blocked = db.blocks(user.id).map(row => publicUser(db.userById(row.blockedId)));
    return json(res, 200, { contacts, blocked });
  }
  if (["/api/contacts/request", "/api/contacts/respond", "/api/contacts/block"].includes(url.pathname) && req.method === "POST") {
    if (req.headers.origin !== trustedOrigin) return json(res, 403, { error: "Origin mismatch" });
    const user = sessionUser(req);
    if (!user) return json(res, 401, { error: "Not authenticated" });
    const input = await body(req);
    if (!input || typeof input.userId !== "string" || !/^[a-f0-9]{32}$/.test(input.userId) || input.userId === user.id) return json(res, 400, { error: "Invalid contact" });
    if (!db.userById(input.userId)) return json(res, 404, { error: "Contact unavailable" });
    if (url.pathname === "/api/contacts/block") {
      if (typeof input.blocked !== "boolean") return json(res, 400, { error: "Invalid block state" });
      db.block(user.id, input.userId, input.blocked);
      db.audit(user.id, input.blocked ? "contact.blocked" : "contact.unblocked");
      return json(res, 200, { ok: true });
    }
    if (db.blocked(user.id, input.userId)) return json(res, 403, { error: "Contact unavailable" });
    if (url.pathname === "/api/contacts/request") db.requestContact(user.id, input.userId);
    else {
      if (typeof input.accept !== "boolean") return json(res, 400, { error: "Invalid response" });
      if (!db.respondContact(user.id, input.userId, input.accept).changes) return json(res, 404, { error: "Incoming request not found" });
    }
    return json(res, 200, { ok: true });
  }
  if (url.pathname === "/api/security/events" && req.method === "GET") {
    const user = sessionUser(req);
    return json(res, user ? 200 : 401, user ? { events: db.events(user.id) } : { error: "Not authenticated" });
  }
  if (url.pathname === "/api/preferences" && ["GET", "POST"].includes(req.method)) {
    if (req.method === "POST" && req.headers.origin !== trustedOrigin) return json(res, 403, { error: "Origin mismatch" });
    const user = sessionUser(req);
    if (!user) return json(res, 401, { error: "Not authenticated" });
    if (req.method === "GET") return json(res, 200, { preferences: db.preferences(user.id) });
    const input = await body(req);
    const allowed = { theme: ["obsidian", "graphite", "daylight", "system"], textScale: ["default", "large", "xl"], motion: ["system", "reduced"], startup: ["messages", "home"], density: ["comfortable", "compact"] };
    if (!input || typeof input !== "object" || Array.isArray(input) || Object.entries(input).some(([key, value]) => !allowed[key]?.includes(value))) return json(res, 400, { error: "Invalid preferences" });
    const preferences = { ...db.preferences(user.id), ...input };
    db.savePreferences(user.id, preferences);
    return json(res, 200, { preferences });
  }
  if (url.pathname === "/api/auth/sessions" && req.method === "GET") {
    const user = sessionUser(req);
    if (!user) return json(res, 401, { error: "Not authenticated" });
    const currentHash = createHash("sha256").update(cookie(req)).digest("hex");
    return json(res, 200, { sessions: db.sessions(user.id, Date.now()).map(s => ({ ...s, current: s.id === currentHash })) });
  }
  if (["/api/auth/sessions/revoke", "/api/auth/password", "/api/profile"].includes(url.pathname) && req.method === "POST") {
    if (req.headers.origin !== trustedOrigin) return json(res, 403, { error: "Origin mismatch" });
    const user = sessionUser(req);
    if (!user) return json(res, 401, { error: "Not authenticated" });
    const input = await body(req);
    if (!input || typeof input !== "object" || Array.isArray(input)) return json(res, 400, { error: "Invalid request" });
    if (url.pathname === "/api/auth/sessions/revoke") {
      if (typeof input.id !== "string" || !/^[a-f0-9]{64}$/.test(input.id)) return json(res, 400, { error: "Invalid session ID" });
      const revoked = db.revokeOwnedSession(input.id, user.id);
      if (revoked.changes) db.audit(user.id, "session.revoked", "warn");
      return json(res, 200, { ok: true });
    }
    if (url.pathname === "/api/profile") {
      const displayName = typeof input.displayName === "string" ? input.displayName.trim() : "";
      if (!displayName || displayName.length > 80) return json(res, 400, { error: "Invalid display name" });
      const bio = input.bio === undefined ? user.bio : typeof input.bio === "string" ? input.bio.trim() : null;
      if (bio === null || bio.length > 500 || Object.keys(input).some(key => !["displayName", "bio"].includes(key))) return json(res, 400, { error: "Invalid profile; bio is limited to 500 characters" });
      db.updateProfile(user.id, displayName, bio);
      return json(res, 200, { user: publicUser(db.userById(user.id)) });
    }
    const { currentPassword, newPassword } = input;
    if (typeof currentPassword !== "string" || currentPassword.length > 256 || typeof newPassword !== "string" || newPassword.length < 15 || newPassword.length > 256) return json(res, 400, { error: "Invalid password; new password must be 15–256 characters" });
    const candidate = await scrypt(currentPassword, user.salt, 64);
    return serialized(async () => {
      const latest = db.userById(user.id);
      if (!timingSafeEqual(candidate, Buffer.from(latest.hash, "hex"))) return json(res, 401, { error: "Invalid credentials" });
      const salt = randomBytes(16).toString("hex");
      const hash = (await scrypt(newPassword, salt, 64)).toString("hex");
      db.changePassword(user.id, salt, hash);
      db.audit(user.id, "password.changed", "warn");
      return json(res, 200, { ok: true }, { "Set-Cookie": setCookie("", 0) });
    });
  }
  if (req.method === "GET" && url.pathname === "/api/users/search") {
    const viewer = sessionUser(req);
    if (!viewer) return json(res, 401, { error: "Not authenticated" });
    const query = (url.searchParams.get("q") ?? "").trim().toLowerCase();
    const code = /^(?:lc-)?([1-9][0-9]{3})$/.exec(query)?.[1];
    if (!code && !/^[a-z0-9_]{3,32}$/.test(query)) return json(res, 400, { error: "Search requires an exact username or LC-1234 identity" });
    const found = code ? db.userByCode(code) : db.userByName(query);
    const users = found && found.id !== viewer.id && !db.blocked(viewer.id, found.id) ? [publicUser(found)] : [];
    return json(res, 200, { users });
  }
  // Ciphertext-only transport. The server never accepts a plaintext message field.
  // Clients must independently implement and verify their E2EE protocol.
  if (url.pathname === "/api/messages" && req.method === "GET") {
    const user = sessionUser(req);
    if (!user) return json(res, 401, { error: "Not authenticated" });
    const cursor = Number(url.searchParams.get("after") ?? 0);
    if (!Number.isSafeInteger(cursor) || cursor < 0) return json(res, 400, { error: "Invalid cursor" });
    const messages = db.inbox(user.id, cursor);
    return json(res, 200, { messages, nextCursor: messages.at(-1)?.sequence ?? cursor });
  }
  if (url.pathname === "/api/messages" && req.method === "POST") {
    const origin = req.headers.origin;
    if (origin !== trustedOrigin) return json(res, 403, { error: "Origin mismatch" });
    const sender = sessionUser(req);
    if (!sender) return json(res, 401, { error: "Not authenticated" });
    const input = await body(req);
    if (!input || typeof input !== "object" || Array.isArray(input) || Object.keys(input).some(k => !["recipientId", "ciphertext", "nonce", "algorithm"].includes(k))) return json(res, 400, { error: "Only encrypted envelopes accepted" });
    const { recipientId, ciphertext, nonce, algorithm } = input;
    if (typeof recipientId !== "string" || typeof ciphertext !== "string" || typeof nonce !== "string" || algorithm !== "client-e2ee-v1" ||
        ciphertext.length < 24 || ciphertext.length > 12000 || nonce.length < 16 || nonce.length > 128 ||
        !/^[A-Za-z0-9+/=_-]+$/.test(ciphertext) || !/^[A-Za-z0-9+/=_-]+$/.test(nonce)) {
      return json(res, 400, { error: "Invalid encrypted envelope" });
    }
    return serialized(async () => {
      if (!db.userById(recipientId)) return json(res, 404, { error: "Recipient not found" });
      if (db.blocked(sender.id, recipientId)) return json(res, 403, { error: "Recipient unavailable" });
      const envelope = { id: randomBytes(16).toString("hex"), senderId: sender.id, recipientId, ciphertext, nonce, algorithm, createdAt: Date.now() };
      const sequence = db.addEnvelope(envelope);
      return json(res, 201, { id: envelope.id, sequence });
    });
  }
  if (req.method === "POST" && ["/api/auth/register", "/api/auth/login", "/api/auth/logout"].includes(url.pathname)) {
    // Same-origin requests only. Non-browser clients must supply a trusted Origin for state changes.
    const origin = req.headers.origin;
    const expected = trustedOrigin;
    if (origin !== expected) return json(res, 403, { error: "Origin mismatch" });
    if (url.pathname === "/api/auth/logout") {
      await serialized(async () => {
        const token = cookie(req);
        if (token) {
          const digest = createHash("sha256").update(token).digest("hex");
          db.revokeSession(digest);
        }
      });
      return json(res, 200, { ok: true }, { "Set-Cookie": setCookie("", 0) });
    }
    const input = await body(req);
    if (!input || typeof input !== "object" || Array.isArray(input)) return json(res, 400, { error: "Invalid request" });
    const username = typeof input.username === "string" ? input.username.trim().toLowerCase() : "";
    const password = typeof input.password === "string" ? input.password : "";
    if (!/^[a-z0-9_]{3,32}$/.test(username) || password.length < 15 || password.length > 256) {
      return json(res, 400, { error: "Username must be 3–32 letters, digits or underscores; password must be 15–256 characters" });
    }
    if (url.pathname === "/api/auth/register") {
      const displayName = typeof input.displayName === "string" ? input.displayName.trim() : "";
      if (!displayName || displayName.length > 80) return json(res, 400, { error: "Invalid display name" });
      return serialized(async () => {
        if (db.userByName(username)) return json(res, 409, { error: "Username unavailable" });
        const salt = randomBytes(16).toString("hex");
        const hash = (await scrypt(password, salt, 64)).toString("hex");
        const user = { id: randomBytes(16).toString("hex"), username, displayName, salt, hash };
        db.addUser(user);
        db.audit(user.id, "account.registered");
        return json(res, 201, { user: publicUser(db.userById(user.id)) });
      });
    }
    const user = db.userByName(username);
    const salt = user?.salt ?? "00000000000000000000000000000000";
    const candidate = await scrypt(password, salt, 64);
    const stored = Buffer.from(user?.hash ?? "00".repeat(64), "hex");
    if (!user || !timingSafeEqual(candidate, stored)) {
      if (user) db.audit(user.id, "login.failed", "warn");
      return json(res, 401, { error: "Invalid credentials" });
    }
    return serialized(async () => {
      if (db.userById(user.id)?.hash !== user.hash) return json(res, 401, { error: "Invalid credentials" });
      const token = randomBytes(32).toString("hex");
      db.audit(user.id, "login.succeeded");
      db.addSession(createHash("sha256").update(token).digest("hex"), user.id, Date.now() + SESSION_MS);
      return json(res, 200, { user: publicUser(user) }, { "Set-Cookie": setCookie(token, SESSION_MS / 1000) });
    });
  }
  if (await serveStatic(req, res, config.staticDir)) return;
  return json(res, 404, { error: "Not found" });
}
const tlsOptions = config.tls ? { key: await readFile(config.key), cert: await readFile(config.cert), minVersion: "TLSv1.2" } : null;
const listener = (req, res) => {
  Promise.resolve(handle(req, res)).catch(error => {
    if (!res.headersSent) json(res, error.status ?? 500, { error: error.status ? error.message : "Internal server error" }, error.retryAfter ? { "Retry-After": String(error.retryAfter) } : {});
    else res.end();
    if (!error.status) console.error(error);
  });
};
const server = (tlsOptions ? createHttpsServer(tlsOptions, listener) : createHttpServer(listener)).listen(port, host, () => console.log("Locat development API listening on " + host + ":" + port));

for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, () => {
  server.close(() => { db.close(); process.exit(0); });
  server.closeIdleConnections();
});
