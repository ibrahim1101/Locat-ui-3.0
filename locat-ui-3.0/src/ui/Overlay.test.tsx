import {act,cleanup,render,screen} from '@testing-library/react';
import {afterEach,describe,expect,it,vi} from 'vitest';
import {Sheet} from './Overlay';
vi.mock('@/app/back',()=>({useBackLayer:vi.fn()}));
afterEach(()=>{cleanup();vi.useRealTimers();});
describe('Sheet initial focus',()=>{
 it('does not steal focus from a field selected before the opening timer fires',()=>{
  vi.useFakeTimers();render(<Sheet open onClose={()=>{}} title="Passphrase"><input aria-label="First field"/><input aria-label="Confirmation"/></Sheet>);
  const confirmation=screen.getByLabelText('Confirmation');confirmation.focus();act(()=>vi.advanceTimersByTime(30));expect(document.activeElement).toBe(confirmation);
 });
 it('focuses its first input when focus is outside and restores the opener on close',()=>{
  vi.useFakeTimers();const opener=document.createElement('button');document.body.append(opener);opener.focus();
  try{const view=render(<Sheet open onClose={()=>{}} title="Passphrase"><input aria-label="First field"/></Sheet>);act(()=>vi.advanceTimersByTime(30));expect(document.activeElement).toBe(screen.getByLabelText('First field'));view.unmount();expect(document.activeElement).toBe(opener);}finally{opener.remove();}
 });
});
