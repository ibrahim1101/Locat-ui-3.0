/**
 * Locat 3.0 development authentication service.
 * Run with Node 22+: node server/index.mjs
 * Uses built-in modules only; local JSON persistence is temporary until SQLite migration.
 * Never expose this development service directly to the public internet.
 */
import { createServer } from "node:http";
import { randomBytes, scrypt as scryptCallback, timingSafeEqual, createHash } from "node:crypto";
import { promisify } from "node:util";
import { readFile, writeFile, rename, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";

const scrypt = promisify(scryptCallback);
const file = resolve(process.env.LOCAT_DATA_FILE ?? "./server/data/dev-auth.json");
const host = process.env.LOCAT_HOST ?? "127.0.0.1";
const port = Number(process.env.LOCAT_PORT ?? 8787);
const SESSION_MS = 7 * 24 * 60 * 60 * 1000;
let db = { users: [], sessions: [] };
let queue = Promise.resolve();

async function load() {
  try { db = JSON.parse(await readFile(file, "utf8")); }
  catch (error) { if (error.code !== "ENOENT") throw error; }
}
async function persist() {
  await mkdir(dirname(file), { recursive: true });
  const temp = file + ".tmp";
  await writeFile(temp, JSON.stringify(db), { mode: 0o600 });
  await rename(temp, file);
}
function serialized(fn) {
  const next = queue.then(fn);
  queue = next.catch(() => {});
  return next;
}
function json(res, status, body, headers = {}) {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff", ...headers });
  res.end(JSON.stringify(body));
}
async function body(req) {
  let text = "";
  for await (const chunk of req) {
    text += chunk;
    if (text.length > 16384) throw Object.assign(new Error("Request too large"), { status: 413 });
  }
  try { return JSON.parse(text); }
  catch { throw Object.assign(new Error("Invalid JSON"), { status: 400 }); }
}
function publicUser(user) { return { id: user.id, username: user.username, displayName: user.displayName }; }
function cookie(req) {
  const match = /(?:^|;\s*)locat_session=([a-f0-9]{64})(?:;|$)/.exec(req.headers.cookie ?? "");
  return match?.[1] ?? null;
}
function sessionUser(req) {
  const token = cookie(req);
  if (!token) return null;
  const digest = createHash("sha256").update(token).digest("hex");
  const session = db.sessions.find(s => s.hash === digest && s.expiresAt > Date.now());
  return session ? db.users.find(u => u.id === session.userId) ?? null : null;
}
function setCookie(token, maxAge) {
  return "locat_session=" + token + "; HttpOnly; SameSite=Strict; Path=/; Max-Age=" + maxAge;
}
async function handle(req, res) {
  const url = new URL(req.url ?? "/", "http://localhost");
  if (req.method === "GET" && url.pathname === "/api/ready") return json(res, 200, { app: "Locat", status: "ready" });
  if (req.method === "GET" && url.pathname === "/api/auth/me") {
    const user = sessionUser(req);
    return json(res, user ? 200 : 401, user ? { user: publicUser(user) } : { error: "Not authenticated" });
  }
  if (req.method === "POST" && ["/api/auth/register", "/api/auth/login", "/api/auth/logout"].includes(url.pathname)) {
    // Same-origin requests only. Non-browser clients must supply a trusted Origin for state changes.
    const origin = req.headers.origin;
    const expected = "http://" + (req.headers.host ?? "");
    if (origin !== expected) return json(res, 403, { error: "Origin mismatch" });
    if (url.pathname === "/api/auth/logout") {
      await serialized(async () => {
        const token = cookie(req);
        if (token) {
          const digest = createHash("sha256").update(token).digest("hex");
          db.sessions = db.sessions.filter(s => s.hash !== digest);
          await persist();
        }
      });
      return json(res, 200, { ok: true }, { "Set-Cookie": setCookie("", 0) });
    }
    const input = await body(req);
    const username = typeof input.username === "string" ? input.username.trim().toLowerCase() : "";
    const password = typeof input.password === "string" ? input.password : "";
    if (!/^[a-z0-9_]{3,32}$/.test(username) || password.length < 15 || password.length > 256) {
      return json(res, 400, { error: "Username must be 3–32 letters, digits or underscores; password must be 15–256 characters" });
    }
    if (url.pathname === "/api/auth/register") {
      const displayName = typeof input.displayName === "string" ? input.displayName.trim() : "";
      if (!displayName || displayName.length > 80) return json(res, 400, { error: "Invalid display name" });
      return serialized(async () => {
        if (db.users.some(u => u.username === username)) return json(res, 409, { error: "Username unavailable" });
        const salt = randomBytes(16).toString("hex");
        const hash = (await scrypt(password, salt, 64)).toString("hex");
        const user = { id: randomBytes(16).toString("hex"), username, displayName, salt, hash };
        db.users.push(user);
        await persist();
        return json(res, 201, { user: publicUser(user) });
      });
    }
    const user = db.users.find(u => u.username === username);
    const salt = user?.salt ?? "00000000000000000000000000000000";
    const candidate = await scrypt(password, salt, 64);
    const stored = Buffer.from(user?.hash ?? "00".repeat(64), "hex");
    if (!user || !timingSafeEqual(candidate, stored)) return json(res, 401, { error: "Invalid credentials" });
    return serialized(async () => {
      const token = randomBytes(32).toString("hex");
      db.sessions = db.sessions.filter(s => s.expiresAt > Date.now());
      db.sessions.push({ hash: createHash("sha256").update(token).digest("hex"), userId: user.id, expiresAt: Date.now() + SESSION_MS });
      await persist();
      return json(res, 200, { user: publicUser(user) }, { "Set-Cookie": setCookie(token, SESSION_MS / 1000) });
    });
  }
  return json(res, 404, { error: "Not found" });
}
await load();
createServer((req, res) => {
  Promise.resolve(handle(req, res)).catch(error => {
    if (!res.headersSent) json(res, error.status ?? 500, { error: error.status ? error.message : "Internal server error" });
    else res.end();
    if (!error.status) console.error(error);
  });
}).listen(port, host, () => console.log("Locat development API listening on " + host + ":" + port));
