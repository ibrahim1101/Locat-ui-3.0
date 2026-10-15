export type ActivityExportEvent={id:number;event:string;severity:string;createdAt:number};
export type ActivityExportFilters={q:string;severity:string;fromTime?:number|null;toTime?:number|null};
export function prepareActivityExport(events:readonly ActivityExportEvent[],filters:ActivityExportFilters,hasMore:boolean,now=Date.now()){
 if(!events.length)throw new Error('Load activity before exporting.');if(events.length>10000)throw new Error('Export supports 10,000 loaded events. Refine the activity filters.');
 const validTime=(value:number)=>Number.isSafeInteger(value)&&value>=0&&value<=8640000000000000;
 if(typeof hasMore!=='boolean'||!validTime(now)||typeof filters.q!=='string'||filters.q.length>80||!['','info','warn','error'].includes(filters.severity))throw new Error('Invalid activity export selection.');
 const from=filters.fromTime??null,to=filters.toTime??null;if(from!==null&&!validTime(from)||to!==null&&!validTime(to)||from!==null&&to!==null&&from>=to)throw new Error('Invalid activity export time range.');
 const ids=new Set<number>();const rows=events.map(row=>{if(!Number.isSafeInteger(row.id)||row.id<1||ids.has(row.id)||typeof row.event!=='string'||!row.event.length||row.event.length>256||typeof row.severity!=='string'||!row.severity.length||row.severity.length>32||!validTime(row.createdAt))throw new Error('Activity data could not be exported safely.');ids.add(row.id);return {id:row.id,event:row.event,severity:row.severity,createdAt:row.createdAt};});
 const exportedAt=new Date(now).toISOString(),text=JSON.stringify({schemaVersion:1,type:'locat.account-activity',exportedAt,selection:{scope:'loaded-events',q:filters.q,severity:filters.severity,fromTime:from,toTime:to,hasMore},eventCount:rows.length,events:rows},null,2)+'\n';
 if(new TextEncoder().encode(text).byteLength>8*1024*1024)throw new Error('Activity export exceeds 8 MiB. Refine the activity filters.');
 return {text,filename:'locat-account-activity-'+exportedAt.replace(/[:.]/g,'-')+'.json'};
}
