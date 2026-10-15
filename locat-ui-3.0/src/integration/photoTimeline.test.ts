import {expect,it} from 'vitest';
import {photoImportDay,photoTimelineItems} from './photoTimeline';
import type {LocalMediaItem} from './localMediaStore';
function photo(id:string,addedAt:number):LocalMediaItem{return {id,addedAt,kind:'photo',name:id+'.png',file:new Blob(),size:0,album:'Imported',favorite:false,position:0};}
it('groups by viewing-local calendar days and handles unknown legacy dates',()=>{
 expect(photoImportDay(new Date(2026,9,15,0,1).getTime()).key).toBe('2026-10-15');expect(photoImportDay(new Date(2026,9,15,23,59).getTime()).key).toBe('2026-10-15');expect(photoImportDay(new Date(2026,9,16,0,1).getTime()).key).toBe('2026-10-16');
 for(const timestamp of [NaN,Infinity,-Infinity,1e20])expect(photoImportDay(timestamp)).toEqual({key:'unknown',label:'Unknown import date'});
});
it('sorts newest imported photos first, keeps unknowns last and excludes server timestamps without mutating input',()=>{
 const items=[photo('old',1),photo('unknown',NaN),{...photo('server',9999),source:'server' as const},photo('new',3),{...photo('audio',5),kind:'audio' as const},photo('alpha',3)];
 expect(photoTimelineItems(items).map(item=>item.id)).toEqual(['alpha','new','old','unknown']);expect(items.map(item=>item.id)).toEqual(['old','unknown','server','new','audio','alpha']);
});
