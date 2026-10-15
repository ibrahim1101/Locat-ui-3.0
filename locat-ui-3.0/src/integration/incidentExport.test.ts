import {expect,it} from 'vitest';
import {prepareIncidentExport,type IncidentExportRow} from './incidentExport';
const filters={q:'database',status:'open',severity:'high',source:'monitor'};
const row:IncidentExportRow={id:'a'.repeat(32),title:'Database alert',description:'Readable diagnostic',source:'monitor',status:'open',severity:'high',occurrences:3,updatedAt:1000};
it('exports only public incident fields and the exact loaded selection without hidden owner/token/history fields',()=>{
 const result=prepareIncidentExport([{...row,userId:'hidden-owner',token:'hidden-token',fingerprint:'hidden-fingerprint',events:[{note:'hidden-note'}]} as IncidentExportRow],filters,true,2000),data=JSON.parse(result.text);
 expect(data.incidents).toEqual([row]);expect(data.selection).toEqual({scope:'loaded-incidents',...filters,hasMore:true});expect(data.incidentCount).toBe(1);expect(result.text).not.toContain('hidden-');expect(result.filename).toMatch(/^locat-sentinel-incidents-.*\.json$/);
});
it('rejects empty, duplicate and malformed selections rather than creating misleading partial exports',()=>{
 expect(()=>prepareIncidentExport([],filters,false)).toThrow('Load incidents');expect(()=>prepareIncidentExport([row,row],filters,false)).toThrow('safely');expect(()=>prepareIncidentExport([{...row,updatedAt:NaN}],filters,false)).toThrow('safely');expect(()=>prepareIncidentExport([row],{...filters,status:'firing'},false)).toThrow('selection');expect(()=>prepareIncidentExport(Array(10001).fill(row),filters,false)).toThrow('10,000');
});
it('bounds actual UTF-8 bytes, including large non-ASCII incident descriptions',()=>{
 const rows=Array.from({length:600},(_,index)=>({...row,id:index.toString(16).padStart(32,'0'),description:'界'.repeat(5000)}));expect(()=>prepareIncidentExport(rows,filters,false)).toThrow('8 MiB');
});
