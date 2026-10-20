import {fireEvent,render,screen,waitFor} from '@testing-library/react';
import {beforeEach,describe,expect,it,vi} from 'vitest';
import {LiveLocationShareSheet} from './LiveLocationShareSheet';

describe('LiveLocationShareSheet',()=>{
 const onClose=vi.fn(),onSend=vi.fn(async()=>{});
 beforeEach(()=>{vi.clearAllMocks();});
 it('requests one location only after an explicit choice, then sends only after review',async()=>{
  const getCurrentPosition=vi.fn((success:PositionCallback)=>success({coords:{latitude:37.7749295,longitude:-122.4194155,accuracy:18}} as GeolocationPosition));
  vi.stubGlobal('navigator',{...navigator,geolocation:{getCurrentPosition}});
  render(<LiveLocationShareSheet open onClose={onClose} onSend={onSend}/>);
  expect(getCurrentPosition).not.toHaveBeenCalled();fireEvent.click(screen.getByRole('button',{name:'Get current location'}));expect(getCurrentPosition).toHaveBeenCalledTimes(1);
  expect(onSend).not.toHaveBeenCalled();fireEvent.click(screen.getByRole('button',{name:'Share once'}));await waitFor(()=>expect(onSend).toHaveBeenCalledWith(expect.stringContaining('mlat=37.77&mlon=-122.42')));expect(onClose).toHaveBeenCalled();
 });
 it('explains denied permission without sending a message',async()=>{
  const getCurrentPosition=vi.fn((_success:PositionCallback,error:PositionErrorCallback)=>error({code:1,message:'denied'} as GeolocationPositionError));vi.stubGlobal('navigator',{...navigator,geolocation:{getCurrentPosition}});
  render(<LiveLocationShareSheet open onClose={onClose} onSend={onSend}/>);fireEvent.click(screen.getByRole('button',{name:'Get current location'}));expect(await screen.findByRole('alert')).toHaveTextContent('Location permission was denied');expect(onSend).not.toHaveBeenCalled();
 });
});
