const fail=()=>{throw Object.assign(new Error('Invalid incident filter'),{status:400});};
export function parseIncidentQuery(params){
 for(const key of params.keys())if(!['q','status','severity','source','before','limit'].includes(key)||params.getAll(key).length!==1)fail();
 const q=(params.get('q')??'').trim(),status=params.get('status')??'',severity=params.get('severity')??'',source=(params.get('source')??'').trim(),before=params.get('before'),rawLimit=params.get('limit');
 if(q.length>160||source.length>64||!['','open','acknowledged','resolved'].includes(status)||!['','info','low','medium','high','critical'].includes(severity))fail();
 if(rawLimit!==null&&(!/^[1-9]\d{0,2}$/.test(rawLimit)||Number(rawLimit)>100))fail();
 let cursor=null;
 if(before!==null){const match=/^(0|[1-9]\d{0,15}):([a-f0-9]{32})$/.exec(before);if(!match||!Number.isSafeInteger(Number(match[1]))||Number(match[1])>8640000000000000)fail();cursor={updatedAt:Number(match[1]),id:match[2]};}
 return {q,status,severity,source,before:cursor,limit:rawLimit===null?100:Number(rawLimit)};
}
export function incidentPage(sql,userId,{q='',status='',severity='',source='',before=null,limit=100}={}){
 const options=parseIncidentQuery(new URLSearchParams({q,status,severity,source,limit:String(limit),...(before===null?{}:{before:typeof before==='string'?before:`${before.updatedAt}:${before.id}`})}));
 const where=['userId=?'],values=[userId];
 for(const field of ['status','severity','source'])if(options[field]){where.push(field+'=?');values.push(options[field]);}
 if(options.q){where.push("(instr(lower(title),lower(?))>0 OR instr(lower(description),lower(?))>0 OR instr(lower(source),lower(?))>0)");values.push(options.q,options.q,options.q);}
 if(options.before){where.push('(updatedAt<? OR (updatedAt=? AND id<?))');values.push(options.before.updatedAt,options.before.updatedAt,options.before.id);}
 const rows=sql.prepare('SELECT * FROM sentinelIncidents WHERE '+where.join(' AND ')+' ORDER BY updatedAt DESC,id DESC LIMIT ?').all(...values,options.limit+1),incidents=rows.slice(0,options.limit),last=incidents.at(-1);
 return {incidents,nextCursor:rows.length>options.limit?`${last.updatedAt}:${last.id}`:null};
}
