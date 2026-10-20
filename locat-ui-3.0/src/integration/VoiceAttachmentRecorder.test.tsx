// @vitest-environment jsdom
import {afterEach,expect,it,vi} from 'vitest';
import {fireEvent,render,screen,waitFor} from '@testing-library/react';
import {VoiceAttachmentRecorder} from './VoiceAttachmentRecorder';

afterEach(()=>{vi.unstubAllGlobals();vi.restoreAllMocks();});

it('records locally, stops the microphone, and waits for review confirmation before sending',async()=>{
 const stop=vi.fn(),stream={getTracks:()=>[{stop}]};
 class FakeRecorder{
  state='inactive';mimeType='audio/webm';ondataavailable?: (event:{data:Blob})=>void;onstop?:()=>void;onerror?:()=>void;
  static isTypeSupported=vi.fn(()=>true);
  constructor(){}
  start(){this.state='recording';}
  stop(){this.state='inactive';this.ondataavailable?.({data:new Blob(['recorded voice'],{type:this.mimeType})});this.onstop?.();}
 }
 vi.stubGlobal('MediaRecorder',FakeRecorder);vi.stubGlobal('navigator',{...navigator,mediaDevices:{getUserMedia:vi.fn(async()=>stream)}});vi.spyOn(URL,'createObjectURL').mockReturnValue('blob:voice-preview');vi.spyOn(URL,'revokeObjectURL').mockImplementation(()=>{});
 const onSend=vi.fn(async(_file:File,_durationSec:number)=>{}),view=render(<VoiceAttachmentRecorder onClose={()=>{}} onSend={onSend}/>);
 fireEvent.click(screen.getByRole('button',{name:'Start recording'}));await screen.findByText('Recording on this device');
 expect(onSend).not.toHaveBeenCalled();fireEvent.click(screen.getByRole('button',{name:'Stop recording'}));
 await screen.findByLabelText('Preview voice recording');expect(stop).toHaveBeenCalledOnce();expect(onSend).not.toHaveBeenCalled();
 fireEvent.click(screen.getByRole('button',{name:'Send voice message'}));await waitFor(()=>expect(onSend).toHaveBeenCalledOnce());
 expect(onSend.mock.calls[0]?.[0]).toMatchObject({name:'Voice message.webm',type:'audio/webm'});expect(onSend.mock.calls[0]?.[1]).toBeGreaterThanOrEqual(1);view.unmount();
});

it('explains microphone denial and never attempts an upload',async()=>{
 vi.stubGlobal('MediaRecorder',class{static isTypeSupported=vi.fn(()=>true);});
 const denied=Object.assign(new Error('denied'),{name:'NotAllowedError'});vi.stubGlobal('navigator',{...navigator,mediaDevices:{getUserMedia:vi.fn(async()=>{throw denied;})}});
 const onSend=vi.fn();render(<VoiceAttachmentRecorder onClose={()=>{}} onSend={onSend}/>);fireEvent.click(screen.getByRole('button',{name:'Start recording'}));
 expect(await screen.findByRole('alert')).toHaveTextContent('Microphone access was denied');expect(onSend).not.toHaveBeenCalled();
});

it('discards a recording as soon as captured audio exceeds the encrypted attachment limit',async()=>{
 const stop=vi.fn(),stream={getTracks:()=>[{stop}]};
 class OversizeRecorder{
  state='inactive';mimeType='audio/webm';ondataavailable?: (event:{data:Blob})=>void;onstop?:()=>void;
  static isTypeSupported=vi.fn(()=>true);constructor(){}
  start(){this.state='recording';}
  stop(){this.state='inactive';this.ondataavailable?.({data:new Blob([new Uint8Array(2_900_001)],{type:this.mimeType})});this.onstop?.();}
 }
 vi.stubGlobal('MediaRecorder',OversizeRecorder);vi.stubGlobal('navigator',{...navigator,mediaDevices:{getUserMedia:vi.fn(async()=>stream)}});
 vi.spyOn(URL,'createObjectURL').mockReturnValue('blob:oversize');vi.spyOn(URL,'revokeObjectURL').mockImplementation(()=>{});
 const onSend=vi.fn(async(_file:File,_durationSec:number)=>{});render(<VoiceAttachmentRecorder onClose={()=>{}} onSend={onSend}/>);
 fireEvent.click(screen.getByRole('button',{name:'Start recording'}));await screen.findByText('Recording on this device');fireEvent.click(screen.getByRole('button',{name:'Stop recording'}));
 expect(await screen.findByRole('alert')).toHaveTextContent('exceeded 2.9 MB');expect(onSend).not.toHaveBeenCalled();expect(stop).toHaveBeenCalledOnce();expect(screen.queryByLabelText('Preview voice recording')).not.toBeInTheDocument();
});
