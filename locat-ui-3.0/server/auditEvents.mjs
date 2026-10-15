const fail=()=>{throw Object.assign(new Error('Invalid account activity filter'),{status:400});};
export function parseAuditQuery(params){
 for(const key of params.keys())if(!['q','severity','before','limit','fromTime','toTime'].includes(key)||params.getAll(key).length!==1)fail();
 const q=(params.get('q')??'').trim().toLowerCase(),severity=params.get('severity')??'',before=params.get('before'),rawLimit=params.get('limit');
 if(q.length>80||!['','info','warn','error'].includes(severity))fail();
 if(before!==null&&(!/^[1-9]\d{0,15}$/.test(before)||!Number.isSafeInteger(Number(before))))fail();
 if(rawLimit!==null&&(!/^[1-9]\d{0,2}$/.test(rawLimit)||Number(rawLimit)>100))fail();
 const time=name=>{const value=params.get(name);if(value===null)return null;if(!/^(0|[1-9]\d{0,15})$/.test(value)||!Number.isSafeInteger(Number(value))||Number(value)>8640000000000000)fail();return Number(value);};
 const fromTime=time('fromTime'),toTime=time('toTime');if(fromTime!==null&&toTime!==null&&fromTime>=toTime)fail();
 return {q,severity,fromTime,toTime,before:before===null?null:Number(before),limit:rawLimit===null?100:Number(rawLimit)};
}
export function auditEventPage(sql,userId,{q='',severity='',before=null,limit=100,fromTime=null,toTime=null}={}){
 // Validate internal callers using the same finite contract as the route.
 const options=parseAuditQuery(new URLSearchParams({q,severity,limit:String(limit),...(before===null?{}:{before:String(before)}),...(fromTime===null?{}:{fromTime:String(fromTime)}),...(toTime===null?{}:{toTime:String(toTime)})}));
 const where=['userId=?'],values=[userId];if(options.before!==null){where.push('id<?');values.push(options.before);}if(options.q){where.push("(instr(lower(event),?)>0 OR instr(replace(lower(event),'.',' '),?)>0)");values.push(options.q,options.q);}if(options.severity){if(options.severity==='warn')where.push("severity IN ('warn','warning')");else{where.push('severity=?');values.push(options.severity);}}
 if(options.fromTime!==null){where.push('createdAt>=?');values.push(options.fromTime);}if(options.toTime!==null){where.push('createdAt<?');values.push(options.toTime);}
 const rows=sql.prepare('SELECT id,event,severity,createdAt FROM audit WHERE '+where.join(' AND ')+' ORDER BY id DESC LIMIT ?').all(...values,options.limit+1),events=rows.slice(0,options.limit);
 return {events,nextCursor:rows.length>options.limit?String(events.at(-1).id):null};
}
