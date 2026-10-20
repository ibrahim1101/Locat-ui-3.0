// @vitest-environment jsdom
import {afterEach,expect,it,vi} from 'vitest';
import {fireEvent,render,screen,waitFor} from '@testing-library/react';
import {DoodleComposer} from './DoodleComposer';

afterEach(()=>{vi.restoreAllMocks();});

it('creates a local PNG and sends it through the encrypted attachment callback',async()=>{
 const context={fillStyle:'',strokeStyle:'',lineWidth:1,lineCap:'',lineJoin:'',beginPath:vi.fn(),moveTo:vi.fn(),lineTo:vi.fn(),stroke:vi.fn(),fillRect:vi.fn()};
 vi.spyOn(HTMLCanvasElement.prototype,'getContext').mockReturnValue(context as unknown as CanvasRenderingContext2D);
 vi.spyOn(HTMLCanvasElement.prototype,'getBoundingClientRect').mockReturnValue({x:0,y:0,width:480,height:270,top:0,left:0,right:480,bottom:270,toJSON:()=>({})});
 vi.spyOn(HTMLCanvasElement.prototype,'toBlob').mockImplementation(callback=>callback(new Blob(['png-content'],{type:'image/png'})));
 const onSend=vi.fn().mockResolvedValue(undefined),onClose=vi.fn();
 render(<DoodleComposer open onClose={onClose} onSend={onSend}/>);
 const canvas=screen.getByTestId('doodle-canvas');
 fireEvent.pointerDown(canvas,{button:0,pointerId:1,clientX:20,clientY:20});
 fireEvent.pointerMove(canvas,{pointerId:1,clientX:80,clientY:60});
 fireEvent.pointerUp(canvas,{pointerId:1});
 expect(screen.getByRole('button',{name:'Send doodle'})).toBeEnabled();
 fireEvent.click(screen.getByRole('button',{name:'Send doodle'}));
 await waitFor(()=>expect(onSend).toHaveBeenCalledTimes(1));
 const file=onSend.mock.calls[0][0] as File;
 expect(file.type).toBe('image/png');
 expect(file.name).toMatch(/^locat-doodle-\d+\.png$/);
 expect(onClose).toHaveBeenCalledOnce();
});

it('keeps sending disabled until something is drawn and supports clearing the canvas',()=>{
 const context={fillStyle:'',strokeStyle:'',lineWidth:1,lineCap:'',lineJoin:'',beginPath:vi.fn(),moveTo:vi.fn(),lineTo:vi.fn(),stroke:vi.fn(),fillRect:vi.fn()};
 vi.spyOn(HTMLCanvasElement.prototype,'getContext').mockReturnValue(context as unknown as CanvasRenderingContext2D);
 vi.spyOn(HTMLCanvasElement.prototype,'getBoundingClientRect').mockReturnValue({x:0,y:0,width:480,height:270,top:0,left:0,right:480,bottom:270,toJSON:()=>({})});
 render(<DoodleComposer open onClose={()=>undefined} onSend={vi.fn()}/>);
 const send=screen.getByRole('button',{name:'Send doodle'});
 expect(send).toBeDisabled();
 const canvas=screen.getByTestId('doodle-canvas');
 fireEvent.pointerDown(canvas,{button:0,pointerId:1,clientX:20,clientY:20});
 fireEvent.pointerMove(canvas,{pointerId:1,clientX:80,clientY:60});
 fireEvent.pointerUp(canvas,{pointerId:1});
 expect(send).toBeEnabled();
 fireEvent.click(screen.getByRole('button',{name:'Clear'}));
 expect(send).toBeDisabled();
});
