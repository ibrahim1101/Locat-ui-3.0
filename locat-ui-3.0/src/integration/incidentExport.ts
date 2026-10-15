export type IncidentExportRow={id:string;title:string;description:string;source:string;severity:string;status:string;occurrences:number;updatedAt:number};
export type IncidentExportFilters={q:string;status:string;severity:string;source:string};
const statuses=['','open','acknowledged','resolved'],severities=['','info','low','medium','high','critical'],maximum=8*1024*1024;
export function prepareIncidentExport(incidents:readonly IncidentExportRow[],filters:IncidentExportFilters,hasMore:boolean,now=Date.now()){
 const validTime=(value:number)=>Number.isSafeInteger(value)&&value>=0&&value<=8640000000000000;
 if(!incidents.length)throw new Error('Load incidents before exporting.');if(incidents.length>10000)throw new Error('Export supports 10,000 loaded incidents. Refine the filters.');
 if(typeof hasMore!=='boolean'||!validTime(now)||typeof filters.q!=='string'||filters.q.length>160||typeof filters.source!=='string'||filters.source.length>64||!statuses.includes(filters.status)||!severities.includes(filters.severity))throw new Error('Invalid incident export selection.');
 const ids=new Set<string>(),rows:IncidentExportRow[]=[];let bytes=0;
 for(const row of incidents){
  if(typeof row.id!=='string'||!/^[a-f0-9]{32}$/.test(row.id)||ids.has(row.id)||typeof row.title!=='string'||!row.title.length||row.title.length>200||typeof row.description!=='string'||row.description.length>5000||typeof row.source!=='string'||!row.source.length||row.source.length>64||!statuses.slice(1).includes(row.status)||!severities.slice(1).includes(row.severity)||!Number.isSafeInteger(row.occurrences)||row.occurrences<1||!validTime(row.updatedAt))throw new Error('Incident data could not be exported safely.');
  ids.add(row.id);const value={id:row.id,title:row.title,description:row.description,source:row.source,severity:row.severity,status:row.status,occurrences:row.occurrences,updatedAt:row.updatedAt};
  bytes+=new TextEncoder().encode(JSON.stringify(value,null,2)).byteLength;if(bytes>maximum)throw new Error('Incident export exceeds 8 MiB. Refine the filters.');rows.push(value);
 }
 const exportedAt=new Date(now).toISOString(),text=JSON.stringify({schemaVersion:1,type:'locat.sentinel-incidents',exportedAt,selection:{scope:'loaded-incidents',q:filters.q,status:filters.status,severity:filters.severity,source:filters.source,hasMore},incidentCount:rows.length,incidents:rows},null,2)+'\n';
 if(new TextEncoder().encode(text).byteLength>maximum)throw new Error('Incident export exceeds 8 MiB. Refine the filters.');
 return {text,filename:'locat-sentinel-incidents-'+exportedAt.replace(/[:.]/g,'-')+'.json'};
}
