import {parseAuditQuery} from './auditEvents.mjs';
import {createSessionSecurityHandler} from './sessionSecurity.mjs';
import {createMatrixRevocationWorker} from './matrixRevocation.mjs';
import {loadMatrixAppserviceFile} from './matrixAppserviceFile.mjs';
import {createManagedMatrixProvisioner} from './matrixProvisioning.mjs';
import { createMatrixGateway } from './matrixGateway.mjs';
import { matrixProvider, createMatrixBindingHandler } from './matrixBinding.mjs';
import { iceConfiguration } from './ice.mjs';
import { accountIdentity, localDiscoveryQuery, serverIdentityAttestation, verifyIdentityRotation } from './globalIdentity.mjs';
import { attachRealtime } from './realtime.mjs';
/**
 * Locat 3.0 development authentication service.
 * Run with Node 24+: node server/index.mjs
 * Uses built-in modules and versioned SQLite persistence (Node 24+).
 * Never expose this development service directly to the public internet.
 */
import { createServer as createHttpServer } from "node:http";
import { createServer as createHttpsServer } from "node:https";
import { readFile } from "node:fs/promises";
import { serverConfig, requestClientAddress, requestOrigin } from "./config.mjs";
import { serveStatic } from "./static.mjs";
import { randomBytes, scrypt as scryptCallback, timingSafeEqual, createHash } from "node:crypto";
import { promisify } from "node:util";
import { createLayeredRateLimiter } from "./rateLimit.mjs";
import { createLinkHandler } from "./link.mjs";
import { createPrivateHandler } from "./privateStore.mjs";
import { createCalendarHandler } from './calendar.mjs';
import { createShareHandler } from './share.mjs';
import { createWorkspaceHandler } from './workspace.mjs';
import { createAutomationHandler } from './automate.mjs';
import { openDatabase } from "./database.mjs";

const scrypt = promisify(scryptCallback);
if (process.env.LOCAT_DATA_FILE) throw new Error("LOCAT_DATA_FILE is retired; set LOCAT_DATABASE_FILE to a new SQLite path. Legacy JSON is never overwritten.");
const config = serverConfig();
const connectivity = iceConfiguration();
const matrix = matrixProvider();
const db = openDatabase(process.env.LOCAT_DATABASE_FILE ?? "./server/data/locat.sqlite");
if(config.identityRotation&&!verifyIdentityRotation(config.identityRotation,{origin:config.origin,serverId:db.serverId,currentKey:config.identitySigningKey}))throw new Error('LOCAT_IDENTITY_ROTATION_FILE is not a valid signed handoff for this server ID, origin and current signing key');
const matrixServiceFile=process.env.LOCAT_MATRIX_APPSERVICE_FILE;
if(matrixServiceFile&&!matrix)throw new Error('Managed Matrix accounts require a configured sidecar');
const matrixProvisioner=matrixServiceFile?createManagedMatrixProvisioner({provider:matrix,...await loadMatrixAppserviceFile(matrixServiceFile,db.serverId,matrix.serverName),serverId:db.serverId,store:db.matrixBindings,managedDevices:db.matrixManagedDevices}):null;
const matrixCleanup=matrixProvisioner?createMatrixRevocationWorker({store:db.matrixRevocations,revoke:(job,recheck)=>matrixProvisioner.revokeQueuedDevice(job,recheck)}):null;
const { host, port } = config;
const authLimit = createLayeredRateLimiter({clientAddress:req=>requestClientAddress(req,config)});
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
async function authenticatedBody(req,user,maximum){
  const input=await body(req,maximum);
  if(req.aborted||sessionUser(req)?.id!==user.id)throw Object.assign(new Error('Session changed during account operation'),{status:401});
  return input;
}
function visibleTo(user,viewerId,policy) { return user.id===viewerId || (!db.blocked(user.id,viewerId) && (policy==='everyone' || policy==='contacts' && db.acceptedContact(user.id,viewerId))); }
function publicUser(user,viewerId=user.id) { return { id:user.id,username:visibleTo(user,viewerId,user.usernameVisibility)?user.username:'',displayName:user.displayName,lcCode:'LC-'+user.lcCode,globalIdentity:accountIdentity(user,config.origin,db.serverId,config.identitySigningKey),bio:visibleTo(user,viewerId,user.profileVisibility)?user.bio:'' }; }
function cookie(req) {
  const match = /(?:^|;\s*)locat_session=([a-f0-9]{64})(?:;|$)/.exec(req.headers.cookie ?? "");
  return match?.[1] ?? null;
}
function sessionUser(req) {
  const token = cookie(req);
  if (!token) return null;
  const digest = createHash("sha256").update(token).digest("hex");
  const user=db.sessionUser(digest,Date.now())??null;
  if(user&&req.headers['x-locat-account']!==undefined&&req.headers['x-locat-account']!==user.id)throw Object.assign(new Error('Signed-in account changed; reopen this tool'),{status:403});
  return user;
}
function setCookie(token, maxAge) {
  return "locat_session=" + token + "; HttpOnly; SameSite=Strict; Path=/; Max-Age=" + maxAge + (config.secure ? "; Secure" : "");
}
const sessionSecurity=createSessionSecurityHandler({db,sessionUser,sessionToken:cookie,body,json,scrypt,serialized});
const matrixGateway = createMatrixGateway({provider:matrix,store:db.matrixBindings,conversations:db.matrixConversations,preferences:userId=>db.preferences(userId),sessionUser,sessionToken:cookie,deviceActor:(req,userId,session)=>{const actor=db.link.proofs.verify(userId,session,req.headers['x-locat-device-proof']);db.link.owned(userId,actor);return actor;},body,json});
const matrixBinding = createMatrixBindingHandler({store:db.matrixBindings,provider:matrix,provisioner:matrixProvisioner,conversations:db.matrixConversations,body,json,audit:db.audit});
const linkHandler = createLinkHandler({store:db.link,sessionUser,sessionToken:cookie,body,json,audit:db.audit,connectivity,matrixBinding});
const privateHandler = createPrivateHandler({store:db.privateStore,sessionUser,sessionToken:cookie,body,json});
const calendarHandler=createCalendarHandler({store:db.calendar,sessionUser,body,json});
const shareHandler=createShareHandler({store:db.encryptedShares,sessionUser,body,json});
const workspaceHandler=createWorkspaceHandler({store:db.workspaces,sessionUser,body,json});
const automationHandler=createAutomationHandler({store:db.automations,sessionUser,body,json});
try{db.encryptedShares.purgeExpired();}catch(error){console.error('Encrypted share startup cleanup failed:',error instanceof Error?error.message:'unknown error');}
const shareExpirySweep=setInterval(()=>{try{db.encryptedShares.purgeExpired();}catch(error){console.error('Encrypted share cleanup failed:',error instanceof Error?error.message:'unknown error');}},60*60_000);
shareExpirySweep.unref();
async function handle(req, res) {
  const trustedOrigin = requestOrigin(req, config);
  if (!trustedOrigin) return json(res, 403, { error: "Host not trusted" });
  const url = new URL(req.url ?? "/", trustedOrigin);
  if (req.method === "POST" && ["/api/auth/login", "/api/auth/register", "/api/auth/password"].includes(url.pathname)) {
    const retryAfter = authLimit(req);
    if (retryAfter) return json(res, 429, { error: "Too many attempts. Try again later." }, { "Retry-After": String(retryAfter) });
  }
  if (await sessionSecurity(req,res,url,trustedOrigin)) return;
  if (await matrixGateway(req,res,url,trustedOrigin)) return;
  if (await linkHandler(req,res,url,trustedOrigin)) return;
  if (await privateHandler(req,res,url,trustedOrigin)) return;
  if (await calendarHandler(req,res,url,trustedOrigin)) return;
  if (await shareHandler(req,res,url,trustedOrigin)) return;
  if (await workspaceHandler(req,res,url,trustedOrigin)) return;
  if (await automationHandler(req,res,url,trustedOrigin)) return;
  if (req.method === "GET" && url.pathname === "/.well-known/locat") return json(res,200,{
    app:'Locat',protocolVersion:1,serverId:db.serverId,origin:trustedOrigin,
    identity:serverIdentityAttestation(config.origin,db.serverId,config.identitySigningKey,config.identityRotation),
    capabilities:{sameOriginApi:true,privateMessaging:!!matrix,federation:false,webSocket:true,authenticatedIdentity:!!(config.identitySigningKey&&config.origin)},
  },{'Access-Control-Allow-Origin':'*'});
  if (req.method === "GET" && url.pathname === "/api/ready") return json(res, 200, { app: "Locat", status: "ready" });
  if (url.pathname === "/api/diagnostics" && req.method === "GET") {
    const user=sessionUser(req);
    if (!user) return json(res, 401, { error: "Not authenticated" });
    return json(res, 200, { app: "Locat", runtime: process.version, uptimeSeconds: Math.floor(process.uptime()), database: db.health(), tls: config.secure, tlsTermination: config.proxy ? "proxy" : config.tls ? "direct" : "none", serverId: db.serverId, origin: trustedOrigin, privateMessaging: matrix ? "configured; device verification required" : "not-enabled", nativeClients: "not-verified" });
  }
  if (req.method === "GET" && url.pathname === "/api/auth/me") {
    const user = sessionUser(req);
    return json(res, user ? 200 : 401, user ? { user: publicUser(user) } : { error: "Not authenticated" });
  }
  if (url.pathname === "/api/contacts" && req.method === "GET") {
    const user = sessionUser(req);
    if (!user) return json(res, 401, { error: "Not authenticated" });
    const contacts = db.contacts(user.id).map(row => ({ user: publicUser(db.userById(row.lowId === user.id ? row.highId : row.lowId),user.id), status: row.status, direction: row.requesterId === user.id ? "outgoing" : "incoming" }));
    const blocked = db.blocks(user.id).map(row => publicUser(db.userById(row.blockedId),user.id));
    return json(res, 200, { contacts, blocked });
  }
  if (["/api/contacts/request", "/api/contacts/respond", "/api/contacts/block", "/api/contacts/cancel", "/api/contacts/remove"].includes(url.pathname) && req.method === "POST") {
    if (req.headers.origin !== trustedOrigin) return json(res, 403, { error: "Origin mismatch" });
    const user = sessionUser(req);
    if (!user) return json(res, 401, { error: "Not authenticated" });
    const input = await authenticatedBody(req,user);
    if (!input || typeof input.userId !== "string" || !/^[a-f0-9]{32}$/.test(input.userId) || input.userId === user.id) return json(res, 400, { error: "Invalid contact" });
    if (!db.userById(input.userId)) return json(res, 404, { error: "Contact unavailable" });
    if (url.pathname === "/api/contacts/block") {
      if (typeof input.blocked !== "boolean") return json(res, 400, { error: "Invalid block state" });
      db.block(user.id, input.userId, input.blocked);
      db.audit(user.id, input.blocked ? "contact.blocked" : "contact.unblocked");
      return json(res, 200, { ok: true });
    }
    if (db.blocked(user.id, input.userId)) return json(res, 403, { error: "Contact unavailable" });
    if (url.pathname === "/api/contacts/cancel" || url.pathname === "/api/contacts/remove") {
      const result=url.pathname==="/api/contacts/cancel"?db.cancelContact(user.id,input.userId):db.removeContact(user.id,input.userId);
      if(!result.changes)return json(res,404,{error:"Matching contact relationship not found"});
      db.audit(user.id,url.pathname==="/api/contacts/cancel"?"contact.request.cancelled":"contact.removed");return json(res,200,{ok:true});
    }
    if (url.pathname === "/api/contacts/request") {
      if(!db.userById(input.userId).allowContactRequests && !db.acceptedContact(user.id,input.userId))return json(res,403,{error:"This account is not accepting new contact requests"});
      db.requestContact(user.id,input.userId);
    }
    else {
      if (typeof input.accept !== "boolean") return json(res, 400, { error: "Invalid response" });
      if (!db.respondContact(user.id, input.userId, input.accept).changes) return json(res, 404, { error: "Incoming request not found" });
    }
    return json(res, 200, { ok: true });
  }
  if(url.pathname==='/api/profile/privacy'&&['GET','POST'].includes(req.method)){
    const user=sessionUser(req);if(!user)return json(res,401,{error:'Not authenticated'});
    if(req.method==='POST'){
      if(req.headers.origin!==trustedOrigin)return json(res,403,{error:'Origin mismatch'});const input=await authenticatedBody(req,user);
      if(!input||Object.keys(input).some(key=>!['profileVisibility','usernameVisibility','allowContactRequests'].includes(key))||!['everyone','contacts','nobody'].includes(input.profileVisibility)||!['everyone','contacts','nobody'].includes(input.usernameVisibility)||typeof input.allowContactRequests!=='boolean')return json(res,400,{error:'Invalid privacy settings'});
      db.savePrivacy(user.id,input.profileVisibility,input.usernameVisibility,input.allowContactRequests);db.audit(user.id,'profile.privacy.changed');
    }
    const latest=db.userById(user.id);return json(res,200,{profileVisibility:latest.profileVisibility,usernameVisibility:latest.usernameVisibility,allowContactRequests:!!latest.allowContactRequests});
  }
  if (url.pathname === "/api/security/events" && req.method === "GET") {
    const user = sessionUser(req);
    if(!user)return json(res,401,{error:"Not authenticated"});
    return json(res,200,db.auditPage(user.id,parseAuditQuery(url.searchParams)));
  }
  if (url.pathname === "/api/preferences" && ["GET", "POST"].includes(req.method)) {
    if (req.method === "POST" && req.headers.origin !== trustedOrigin) return json(res, 403, { error: "Origin mismatch" });
    const user = sessionUser(req);
    if (!user) return json(res, 401, { error: "Not authenticated" });
    if (req.method === "GET") return json(res, 200, { preferences: db.preferences(user.id) });
    const input = await authenticatedBody(req,user);
    const allowed = { theme: ["obsidian", "graphite", "daylight", "system"], textScale: ["default", "large", "xl"], motion: ["system", "reduced"], startup: ["messages", "home"], density: ["comfortable", "compact"], sendReadReceipts: [true, false], typingIndicators: [true, false] };
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
    const input = await authenticatedBody(req,user);
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
    if (!timingSafeEqual(candidate, Buffer.from(user.hash, "hex"))) return json(res, 401, { error: "Invalid credentials" });
    const salt = randomBytes(16).toString("hex");
    const hash = (await scrypt(newPassword, salt, 64)).toString("hex");
    const sessionHash=createHash('sha256').update(cookie(req)).digest('hex');
    return serialized(async () => {
      if(req.aborted||res.destroyed)throw Object.assign(new Error('Password change disconnected'),{status:401});
      db.changePassword(user.id, salt, hash, {sessionHash,expectedPasswordHash:user.hash});
      return json(res, 200, { ok: true }, { "Set-Cookie": setCookie("", 0) });
    });
  }
  if (req.method === "GET" && url.pathname === "/api/users/search") {
    const viewer = sessionUser(req);
    if (!viewer) return json(res, 401, { error: "Not authenticated" });
    const query = localDiscoveryQuery(url.searchParams.get("q") ?? "",config.origin);
    const code = /^(?:lc-)?([1-9][0-9]{3})$/.exec(query)?.[1];
    if (!code && !/^[a-z0-9_]{3,32}$/.test(query)) return json(res, 400, { error: "Search requires an exact username or LC-1234 identity" });
    const found = code ? db.userByCode(code) : db.userByName(query);
    const users = found && found.id !== viewer.id && !db.blocked(viewer.id, found.id) && (code || visibleTo(found,viewer.id,found.usernameVisibility)) ? [publicUser(found,viewer.id)] : [];
    return json(res, 200, { users });
  }
  // The old opaque-envelope experiment is preserved in SQLite, but is not a reviewed messaging protocol.
  // Enforce the messaging gate at the API as well as the UI; no deployment flag bypasses it.
  if (url.pathname === '/api/messages' && ['GET','POST'].includes(req.method)) {
    if(req.method==='POST'&&req.headers.origin!==trustedOrigin)return json(res,403,{error:'Origin mismatch'});
    if(!sessionUser(req))return json(res,401,{error:'Not authenticated'});
    return json(res,501,{error:'Private messaging requires the reviewed E2EE integration, which is not enabled.',code:'MESSAGING_SECURITY_GATE'});
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

const realtime = attachRealtime(server,{requestOrigin:req=>requestOrigin(req,config),sessionUser});

matrixCleanup?.start();
let shuttingDown=false;
for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, () => {
  if(shuttingDown)return;shuttingDown=true;const stopping=matrixCleanup?.stop()??Promise.resolve();
  realtime.close();
  server.close(() => {void stopping.finally(()=>{db.close();process.exit(0);});});
  server.closeIdleConnections();
});
