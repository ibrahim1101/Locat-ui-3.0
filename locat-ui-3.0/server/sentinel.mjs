import {incidentPage,parseIncidentQuery,tokenPage,parseTokenQuery,incidentHistoryPage,parseIncidentHistoryQuery} from './sentinelQueries.mjs';
/** Account-owned Sentinel incidents. Tokens store only a SHA-256 digest. */
import { createHash, randomBytes } from 'node:crypto';
import { createRateLimiter } from './rateLimit.mjs';
const severities = ['info', 'low', 'medium', 'high', 'critical'];
const fail = (status, message) => { throw Object.assign(new Error(message), { status }); };
export const tokenHash = value => createHash('sha256').update(value).digest('hex');
export function normalizeIncident(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) fail(400, 'Invalid incident');
  for (const [key, max] of Object.entries({ title: 200, description: 5000, source: 64, fingerprint: 128 })) {
    if (input[key] !== undefined && (typeof input[key] !== 'string' || input[key].trim().length > max)) fail(400, 'Invalid ' + key);
  }
  if (!input.title?.trim() || (input.severity !== undefined && !severities.includes(input.severity)) || (input.status !== undefined && !['open', 'firing', 'resolved'].includes(input.status))) fail(400, 'Invalid incident');
  return { title: input.title.trim(), description: input.description?.trim() ?? '', source: input.source?.trim() || 'custom', fingerprint: input.fingerprint?.trim() || randomBytes(16).toString('hex'), severity: input.severity ?? 'medium', status: input.status === 'resolved' ? 'resolved' : 'open' };
}
/** Adapted mappings from original Locat Sentinel adapters; vendor acceptance is separate. */
export function normalizeWebhook(format, raw) {
  if (format === 'generic') return normalizeIncident(raw);
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) fail(400,'Invalid webhook');
  const string = (object,key,maximum=120) => {
    const value=object[key];
    if(value === undefined) return undefined;
    if(typeof value !== 'string' || value.trim().length > maximum) fail(400,'Invalid '+key);
    return value.trim();
  };
  const resolved = value => ['resolved','ok','recovered','cleared','closed','success','passed'].includes(value?.toLowerCase());
  const severity = (value,fallback) => {
    const v=value?.toLowerCase();
    if(['critical','fatal','crit'].includes(v)) return 'critical';
    if(['high','error','failed','failure'].includes(v)) return 'high';
    if(['medium','warning','warn'].includes(v)) return 'medium';
    if(['low','minor'].includes(v)) return 'low';
    if(['info','ok','success','notice'].includes(v)) return 'info';
    return fallback;
  };
  if(format === 'nscout') {
    const alert=raw.alert ?? {};
    if(typeof alert !== 'object' || Array.isArray(alert)) fail(400,'Invalid alert');
    const name=string(alert,'name',200) ?? string(raw,'name',200);
    const service=string(alert,'service'), host=string(alert,'host') ?? string(raw,'host');
    const level=string(alert,'level') ?? string(raw,'level'), state=string(alert,'state');
    const message=string(alert,'message',5000) ?? string(raw,'message',5000), id=string(alert,'id',128);
    return normalizeIncident({title:name || service || 'nScout alert',description:[message,host ? 'Host: '+host : ''].filter(Boolean).join('\n').slice(0,5000),severity:severity(level ?? state,'high'),source:'nscout',fingerprint:id || (service && host ? tokenHash(JSON.stringify([service,host])) : undefined),status:resolved(state) || resolved(level) ? 'resolved' : 'open'});
  }
  if(format === 'pipelineguard') {
    const pipeline=string(raw,'pipeline') || 'pipeline',stage=string(raw,'stage'),status=string(raw,'status'),branch=string(raw,'branch'),commit=string(raw,'commit'),message=string(raw,'message',5000);
    string(raw,'runId',128);
    const failed=['failed','failure','error','broken'].includes(status?.toLowerCase());
    return normalizeIncident({title:((failed ? 'Pipeline failed: ' : 'Pipeline: ')+pipeline+(stage ? ' · '+stage : '')).slice(0,200),description:[message,branch ? 'Branch: '+branch : '',commit ? 'Commit: '+commit : ''].filter(Boolean).join('\n').slice(0,5000),severity:failed ? 'high' : severity(status,'info'),source:'pipelineguard',fingerprint:tokenHash(JSON.stringify([pipeline,stage ?? ''])),status:resolved(status) ? 'resolved' : 'open'});
  }
  fail(400,'Unsupported webhook format');
}
export function sentinelStore(sql) {
  function requireSession(userId,sessionHash){
    if(sessionHash!==undefined&&(typeof sessionHash!=='string'||!/^[a-f0-9]{64}$/.test(sessionHash)||!sql.prepare('SELECT 1 FROM sessions WHERE hash=? AND userId=? AND expiresAt>?').get(sessionHash,userId,Date.now())))fail(401,'Session changed; sign in again');
  }
  function write(userId,sessionHash,event,task){
    sql.exec('BEGIN IMMEDIATE');try{
      requireSession(userId,sessionHash);const result=task();
      sql.prepare('INSERT INTO audit(userId,event,severity,createdAt) VALUES (?,?,?,?)').run(userId,event,'info',Date.now());
      sql.exec('COMMIT');return result;
    }catch(error){sql.exec('ROLLBACK');throw error;}
  }
  return {
    tokens: userId => tokenPage(sql,userId).tokens,
    tokenPage: (userId,options) => tokenPage(sql,userId,options),
    createToken(userId,name,sessionHash){
      return write(userId,sessionHash,'sentinel.token.created',()=>{
        if(sql.prepare('SELECT COUNT(*) AS count FROM sentinelTokens WHERE userId=? AND revokedAt IS NULL').get(userId).count>=20)fail(409,'Revoke an active token before creating another');
        const token='lsk_'+randomBytes(32).toString('base64url'),id=randomBytes(16).toString('hex');
        sql.prepare('INSERT INTO sentinelTokens (id,userId,hash,name,prefix,createdAt) VALUES (?,?,?,?,?,?)').run(id,userId,tokenHash(token),name,token.slice(0,12),Date.now());
        return {id,token};
      });
    },
    revokeToken(userId,id,sessionHash){
      return write(userId,sessionHash,'sentinel.token.revoked',()=>{
        const changed=sql.prepare('UPDATE sentinelTokens SET revokedAt=? WHERE userId=? AND id=? AND revokedAt IS NULL').run(Date.now(),userId,id).changes;
        if(!changed)fail(404,'Active token not found');return changed;
      });
    },
    authenticate: token => sql.prepare('SELECT id,userId FROM sentinelTokens WHERE hash=? AND revokedAt IS NULL').get(tokenHash(token)),
    incidents: (userId,status) => incidentPage(sql,userId,{status:status||''}).incidents,
    incidentPage: (userId,options) => incidentPage(sql,userId,options),
    detail: (userId,id,options) => incidentHistoryPage(sql,userId,id,options),
    ingest(owner, input) {
      const now=Date.now();
      sql.exec('BEGIN IMMEDIATE');
      try {
        if(!owner||!sql.prepare('SELECT 1 FROM sentinelTokens WHERE id=? AND userId=? AND revokedAt IS NULL').get(owner.id,owner.userId))fail(401,'Integration token was revoked');
        const existing=sql.prepare('SELECT * FROM sentinelIncidents WHERE userId=? AND source=? AND fingerprint=?').get(owner.userId,input.source,input.fingerprint);
        const id=existing?.id ?? randomBytes(16).toString('hex');
        if (existing) {
          const severity=severities[Math.max(severities.indexOf(existing.severity),severities.indexOf(input.severity))];
          const status=input.status === 'resolved' ? 'resolved' : existing.status === 'acknowledged' ? 'acknowledged' : 'open';
          sql.prepare('UPDATE sentinelIncidents SET title=?,description=?,severity=?,status=?,occurrences=occurrences+1,updatedAt=? WHERE id=?').run(input.title,input.description,severity,status,now,id);
        } else sql.prepare('INSERT INTO sentinelIncidents VALUES (?,?,?,?,?,?,?,?,?,?,?)').run(id,owner.userId,input.source,input.fingerprint,input.title,input.description,input.severity,input.status,1,now,now);
        sql.prepare('INSERT INTO sentinelEvents (incidentId,action,note,createdAt) VALUES (?,?,?,?)').run(id,input.status === 'resolved' ? 'webhook.resolved' : 'webhook.received','',now);
        sql.prepare('UPDATE sentinelTokens SET lastUsedAt=? WHERE id=?').run(now,owner.id);
        sql.exec('COMMIT'); return id;
      } catch(error) { sql.exec('ROLLBACK'); throw error; }
    },
    action(userId,id,action,note='',sessionHash) {
      sql.exec('BEGIN IMMEDIATE');
      try {
        requireSession(userId,sessionHash);
        const incident=sql.prepare('SELECT status FROM sentinelIncidents WHERE userId=? AND id=?').get(userId,id);
        if (!incident) fail(404,'Incident not found');
        if (action === 'acknowledge' && incident.status === 'resolved') fail(409,'Reopen this incident first');
        const status={acknowledge:'acknowledged',resolve:'resolved',reopen:'open'}[action];
        if (status) sql.prepare('UPDATE sentinelIncidents SET status=?,updatedAt=? WHERE id=?').run(status,Date.now(),id);
        sql.prepare('INSERT INTO sentinelEvents (incidentId,action,note,createdAt) VALUES (?,?,?,?)').run(id,action,note,Date.now());
        sql.prepare('INSERT INTO audit(userId,event,severity,createdAt) VALUES (?,?,?,?)').run(userId,'sentinel.incident.'+action,'info',Date.now());
        sql.exec('COMMIT');
      } catch(error) { sql.exec('ROLLBACK'); throw error; }
    },
  };
}
export function createSentinelHandler({store,sessionUser,sessionToken,body,json}) {
  const webhookLimit=createRateLimiter(120);
  const tokenLimit=createRateLimiter(20,3600000),mutationLimit=createRateLimiter(60);
  async function ownedBody(req,user){
    const retryAfter=mutationLimit(user.id);if(retryAfter)throw Object.assign(new Error('Sentinel action rate limit exceeded'),{status:429,retryAfter});
    const input=await body(req,4096),current=sessionUser(req),token=sessionToken?.(req);
    if(!current||current.id!==user.id||!token)fail(401,'Session changed; sign in again');
    return {input,sessionHash:tokenHash(token)};
  }
  return async (req,res,url,origin) => {
    if (!url.pathname.startsWith('/api/sentinel/')) return false;
    if (url.pathname === '/api/sentinel/webhook' && req.method === 'POST') {
      const format=url.searchParams.get('format') ?? 'generic';
      if(!['generic','nscout','pipelineguard'].includes(format)) fail(400,'Unsupported webhook format');
      const token=/^Bearer (lsk_[A-Za-z0-9_-]{43})$/.exec(req.headers.authorization ?? '')?.[1];
      const owner=token && store.authenticate(token);
      if (!owner) fail(401,'Invalid integration token');
      const retryAfter=webhookLimit(owner.id);
      if(retryAfter) throw Object.assign(new Error('Webhook rate limit exceeded'),{status:429,retryAfter});
      const id=store.ingest(owner,normalizeWebhook(format,await body(req,65536)));
      json(res,202,{id}); return true;
    }
    const user=sessionUser(req);
    if(!user) fail(401,'Not authenticated');
    if(req.method === 'POST' && req.headers.origin !== origin) fail(403,'Origin mismatch');
    if(url.pathname === '/api/sentinel/tokens' && req.method === 'GET') json(res,200,store.tokenPage(user.id,parseTokenQuery(url.searchParams)));
    else if(url.pathname === '/api/sentinel/tokens' && req.method === 'POST') {
      const {input,sessionHash}=await ownedBody(req,user);
      if(!input||Array.isArray(input)||Object.keys(input).some(key=>key!=='name'))fail(400,'Invalid token request');
      if(typeof input?.name !== 'string' || !input.name.trim() || input.name.trim().length>80) fail(400,'Token name must contain 1–80 characters');
      const retryAfter=tokenLimit(user.id);
      if(retryAfter) throw Object.assign(new Error('Token creation rate limit exceeded'),{status:429,retryAfter});
      json(res,201,store.createToken(user.id,input.name.trim(),sessionHash));
    } else if(url.pathname === '/api/sentinel/tokens/revoke' && req.method === 'POST') {
      const {input,sessionHash}=await ownedBody(req,user);
      if(!input||Array.isArray(input)||Object.keys(input).some(key=>key!=='id'))fail(400,'Invalid token request');
      if(typeof input?.id !== 'string'||!/^[a-f0-9]{32}$/.test(input.id)) fail(400,'Invalid token');
      if(!store.revokeToken(user.id,input.id,sessionHash)) fail(404,'Active token not found');
      json(res,200,{ok:true});
    } else if(url.pathname === '/api/sentinel/incidents' && req.method === 'GET') {
      json(res,200,store.incidentPage(user.id,parseIncidentQuery(url.searchParams)));
    } else {
      const match=/^\/api\/sentinel\/incidents\/([a-f0-9]{32})$/.exec(url.pathname);
      if(!match) fail(404,'Not found');
      if(req.method === 'GET') { const detail=store.detail(user.id,match[1],parseIncidentHistoryQuery(url.searchParams)); if(!detail) fail(404,'Incident not found'); json(res,200,detail); }
      else if(req.method === 'POST') {
        const {input,sessionHash}=await ownedBody(req,user);
        if(!input||Array.isArray(input)||Object.keys(input).some(key=>!['action','note'].includes(key)))fail(400,'Invalid incident action');
        if(!['acknowledge','resolve','reopen','note'].includes(input?.action)) fail(400,'Invalid action');
        if(input.action === 'note' && (typeof input.note !== 'string' || !input.note.trim() || input.note.trim().length>500)) fail(400,'Note must contain 1–500 characters');
        store.action(user.id,match[1],input.action,input.action === 'note' ? input.note.trim() : '',sessionHash); json(res,200,{ok:true});
      } else fail(405,'Method not allowed');
    }
    return true;
  };
}
