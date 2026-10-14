import {fireEvent,render,screen,waitFor} from '@testing-library/react';
import {afterEach,expect,it,vi} from 'vitest';
import {LivePhotoViewer} from './LivePhotoViewer';
import {renderPhotoEdit} from '../lib/photoEditing';
import {editedImageFile} from '../lib/imageEditing';
import type {LocalMediaItem} from './localMediaStore';
vi.mock('../lib/photoEditing',async()=>{
 const actual=await vi.importActual<typeof import('../lib/photoEditing')>('../lib/photoEditing');
 return {...actual,renderPhotoEdit:vi.fn(()=>{const canvas=document.createElement('canvas');canvas.width=300;canvas.height=300;return canvas;})};
});
vi.mock('../lib/imageEditing',async()=>{
 const actual=await vi.importActual<typeof import('../lib/imageEditing')>('../lib/imageEditing');
 return {...actual,editedImageFile:vi.fn(async()=>new File(['copy'],'photo-edited.jpg',{type:'image/jpeg'}))};
});
afterEach(()=>{vi.restoreAllMocks();vi.unstubAllGlobals();vi.clearAllMocks();});
it('uses the same crop/text renderer for preview and export while preserving the original',async()=>{
 const drawImage=vi.fn();vi.spyOn(HTMLCanvasElement.prototype,'getContext').mockReturnValue({drawImage} as unknown as CanvasRenderingContext2D);
 vi.spyOn(URL,'createObjectURL').mockReturnValue('blob:test');vi.spyOn(URL,'revokeObjectURL').mockImplementation(()=>{});
 const click=vi.spyOn(HTMLAnchorElement.prototype,'click').mockImplementation(()=>{});
 const item={id:'photo',name:'photo.jpg',file:new Blob(['original']),kind:'photo'} as LocalMediaItem;
 const {container}=render(<LivePhotoViewer item={item} onClose={()=>{}}/>);
 const image=container.querySelector('img')!;Object.defineProperties(image,{naturalWidth:{value:800},naturalHeight:{value:600},complete:{value:true}});fireEvent.load(image);
 await waitFor(()=>expect(drawImage).toHaveBeenCalled());
 fireEvent.click(screen.getByRole('button',{name:'square'}));fireEvent.change(screen.getByRole('slider',{name:'Crop zoom'}),{target:{value:'2'}});
 expect(vi.mocked(renderPhotoEdit).mock.calls.at(-1)?.[1].geometry).toMatchObject({crop:'square',zoom:2});
 fireEvent.click(screen.getByRole('button',{name:'Text annotations'}));fireEvent.change(screen.getByLabelText('Annotation text'),{target:{value:'My caption'}});fireEvent.click(screen.getByRole('button',{name:'Add text'}));
 fireEvent.change(screen.getByRole('slider',{name:'Text 1 horizontal position'}),{target:{value:'0.3'}});
 expect(vi.mocked(renderPhotoEdit).mock.calls.at(-1)?.[1].texts[0]).toMatchObject({text:'My caption',x:0.3});
 fireEvent.click(screen.getByRole('button',{name:'Download edited copy'}));await waitFor(()=>expect(click).toHaveBeenCalledOnce());expect(editedImageFile).toHaveBeenCalledWith(expect.any(HTMLCanvasElement),'photo.jpg');
 expect(await item.file.text()).toBe('original');
 fireEvent.click(screen.getByRole('button',{name:'Remove text 1'}));expect(vi.mocked(renderPhotoEdit).mock.calls.at(-1)?.[1].texts).toEqual([]);
 fireEvent.click(screen.getByRole('button',{name:'Reset edits'}));expect(vi.mocked(renderPhotoEdit).mock.calls.at(-1)?.[1].geometry).toMatchObject({crop:'original',zoom:1});
});
it('reports unavailable export before decoding rather than creating a fake download',async()=>{
 vi.spyOn(URL,'createObjectURL').mockReturnValue('blob:test');vi.spyOn(URL,'revokeObjectURL').mockImplementation(()=>{});
 render(<LivePhotoViewer item={{id:'p',name:'photo.jpg',file:new Blob()} as LocalMediaItem} onClose={()=>{}}/>);
 fireEvent.click(screen.getByRole('button',{name:'Download edited copy'}));await screen.findByText('Wait for the image to load.');expect(editedImageFile).not.toHaveBeenCalled();
});
