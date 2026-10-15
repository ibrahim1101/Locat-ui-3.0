import {expect,it} from 'vitest';
import {matchesMediaSearch,parseMediaTags,readMediaTags} from './mediaTags';
it('normalizes tags without case-duplicate labels and supports clearing',()=>{
 expect(parseMediaTags(' Family, travel, FAMILY, , Summer ')).toEqual(['Family','travel','Summer']);expect(parseMediaTags(' , ')).toEqual([]);
 expect(()=>parseMediaTags('x'.repeat(41))).toThrow('1–40');expect(()=>parseMediaTags('bad\u0000tag')).toThrow('control');expect(()=>parseMediaTags(Array.from({length:21},(_,i)=>'tag'+i).join(','))).toThrow('20');
});
it('searches name, album and tags while tolerating old or malformed metadata',()=>{
 const item={name:'DSC0001.png',album:'Summer',tags:['Family','Travel']};expect(matchesMediaSearch(item,' travel ')).toBe(true);expect(matchesMediaSearch(item,'SUMMER')).toBe(true);expect(matchesMediaSearch(item,'dsc')).toBe(true);expect(matchesMediaSearch(item,'work')).toBe(false);expect(readMediaTags(undefined)).toEqual([]);expect(readMediaTags([{},'Family',42])).toEqual(['Family']);expect(readMediaTags(['x'.repeat(41)])).toEqual([]);
});
