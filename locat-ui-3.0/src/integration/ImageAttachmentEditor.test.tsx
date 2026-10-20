import {afterEach,expect,it,vi} from 'vitest';
import {fireEvent,render,screen,waitFor} from '@testing-library/react';
import {ImageAttachmentEditor} from './ImageAttachmentEditor';

const imageEditing=vi.hoisted(()=>({
 renderImageEdit:vi.fn((_decoded:unknown,_edit:{turns:number;crop:string})=>{const preview=document.createElement('canvas');preview.width=64;preview.height=48;return preview;}),
 editedImageFile:vi.fn(async(_canvas:HTMLCanvasElement,name:string)=>new File(['edited'],name.replace(/\.[^.]+$/,'-edited.jpg'),{type:'image/jpeg'})),
 DEFAULT_IMAGE_EDIT:{turns:0,crop:'original',zoom:1,x:.5,y:.5},
}));
vi.mock('../lib/imageEditing',()=>imageEditing);
afterEach(()=>{vi.unstubAllGlobals();vi.restoreAllMocks();});

it('keeps framing controls nested and sends an explicitly edited private copy',async()=>{
 const bitmap={width:80,height:60,close:vi.fn()};vi.stubGlobal('createImageBitmap',vi.fn(async()=>bitmap));
 vi.spyOn(HTMLCanvasElement.prototype,'getContext').mockReturnValue({drawImage:vi.fn()} as unknown as CanvasRenderingContext2D);
 const onSend=vi.fn(),file=new File(['original'],'portrait.png',{type:'image/png'}),view=render(<ImageAttachmentEditor file={file} onClose={()=>{}} onSend={onSend}/>);
 await screen.findByLabelText('Photo crop preview');await waitFor(()=>expect(imageEditing.renderImageEdit).toHaveBeenCalled());
 expect(screen.getByText('Crop and framing').closest('details')).toHaveProperty('open',false);
 fireEvent.click(screen.getByText('Crop and framing'));fireEvent.click(screen.getByRole('button',{name:'Square'}));fireEvent.click(screen.getByRole('button',{name:'Rotate right'}));
 await waitFor(()=>expect(imageEditing.renderImageEdit).toHaveBeenLastCalledWith(expect.objectContaining({width:80,height:60}),expect.objectContaining({crop:'square',turns:1})));
 fireEvent.click(screen.getByRole('button',{name:'Send edited copy'}));await waitFor(()=>expect(onSend).toHaveBeenCalledOnce());
 expect(onSend.mock.calls[0][0]).toMatchObject({name:'portrait-edited.jpg',type:'image/jpeg'});view.unmount();expect(bitmap.close).toHaveBeenCalled();
});

it('preserves original bytes and disables originals over the encrypted attachment bound',async()=>{
 vi.stubGlobal('createImageBitmap',vi.fn(async()=>({width:80,height:60,close:vi.fn()})));
 vi.spyOn(HTMLCanvasElement.prototype,'getContext').mockReturnValue({drawImage:vi.fn()} as unknown as CanvasRenderingContext2D);
 const onSend=vi.fn(),file=new File([new Uint8Array(2_900_001)],'large.png',{type:'image/png'});render(<ImageAttachmentEditor file={file} onClose={()=>{}} onSend={onSend}/>);
 await screen.findByLabelText('Photo crop preview');expect(screen.getByRole('button',{name:'Send original'})).toBeDisabled();expect(screen.getByRole('button',{name:'Send edited copy'})).toBeEnabled();
 fireEvent.click(screen.getByRole('button',{name:'Cancel'}));expect(onSend).not.toHaveBeenCalled();
});
