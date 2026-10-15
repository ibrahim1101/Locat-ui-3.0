import {createHmac,randomBytes} from 'node:crypto';
import {readFileSync,statSync} from 'node:fs';
/** Operator-only destinations. No built-in external discovery or relay service. */
export function iceConfiguration(env=process.env){
 function urls(value,kind){const list=(value??'').split(',').map(v=>v.trim()).filter(Boolean);if(list.length>8)throw new Error('At most eight ICE URLs per type');
  for(const url of list){const match=/^(stun|turn|turns):([a-zA-Z0-9.\-\[\]:]+)(?:\?transport=(udp|tcp))?$/.exec(url);if(url.length>256||!match||kind==='stun'&&(match[1]!=='stun'||match[3])||kind==='turn'&&match[1]==='stun'||match[1]==='turns'&&match[3]==='udp')throw new Error('Invalid configured ICE URL');let host;try{host=new URL('https://'+match[2]);}catch{throw new Error('Invalid configured ICE host');}if(!host.hostname||host.port==='0'||host.pathname!=='/'||host.username||host.password)throw new Error('Invalid configured ICE host');}
  return [...new Set(list)];
 }
 const stun=urls(env.LOCAT_STUN_URLS,'stun'),turn=urls(env.LOCAT_TURN_URLS,'turn');let secret;
 if(turn.length){const file=env.LOCAT_TURN_SECRET_FILE;if(!file)throw new Error('TURN requires LOCAT_TURN_SECRET_FILE');if(statSync(file).size>4096)throw new Error('Invalid TURN secret file');secret=readFileSync(file,'utf8').trim();if(secret.length<32||secret.length>256||!/^[\x21-\x7e]+$/.test(secret))throw new Error('TURN secret must contain 32–256 printable non-space characters');}
 else if(env.LOCAT_TURN_SECRET_FILE)throw new Error('TURN secret configured without TURN URLs');
 return {issue(now=Date.now()){
  const iceServers=stun.map(url=>({urls:url}));const expiresAt=turn.length?Math.floor(now/1000)+1800:null;
  if(turn.length){const username=expiresAt+':'+randomBytes(16).toString('hex');const credential=createHmac('sha1',secret).update(username).digest('base64');iceServers.push({urls:turn,username,credential});}
  return {iceServers,expiresAt:expiresAt===null?null:expiresAt*1000,hasRelay:turn.length>0};
 }};
}
