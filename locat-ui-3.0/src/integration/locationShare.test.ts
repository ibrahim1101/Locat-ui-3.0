import {describe,expect,it} from 'vitest';
import {formatEncryptedLocation} from './locationShare';

describe('encrypted one-time location message',()=>{
 it('rounds approximate coordinates before they enter the encrypted message',()=>{
  const text=formatEncryptedLocation({latitude:37.7749295,longitude:-122.4194155,accuracy:18},'approximate');
  expect(text).toContain('mlat=37.77&mlon=-122.42');expect(text).toContain('#map=12/37.77/-122.42');expect(text).toContain('±20 m');
 });
 it('keeps the more precise option explicit and bounded',()=>{
  const text=formatEncryptedLocation({latitude:37.7749295,longitude:-122.4194155,accuracy:8},'precise');
  expect(text).toContain('Shared location · precise');expect(text).toContain('mlat=37.77493&mlon=-122.41942');expect(text).toContain('#map=17/');
 });
 it('rejects invalid device coordinates and accuracy',()=>{
  expect(()=>formatEncryptedLocation({latitude:91,longitude:0,accuracy:1},'precise')).toThrow('invalid location');
  expect(()=>formatEncryptedLocation({latitude:0,longitude:0,accuracy:Infinity},'approximate')).toThrow('invalid location');
 });
});
