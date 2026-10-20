// @vitest-environment jsdom
import {afterEach,expect,it,vi} from 'vitest';
import {fireEvent,render,screen,waitFor} from '@testing-library/react';
import {StickerComposer} from './StickerComposer';

afterEach(()=>vi.restoreAllMocks());

it('creates and sends the selected sticker as a PNG attachment',async()=>{
 const context={fillStyle:'',font:'',textAlign:'',textBaseline:'',beginPath:vi.fn(),roundRect:vi.fn(),fill:vi.fn(),fillText:vi.fn()};
 vi.spyOn(HTMLCanvasElement.prototype,'getContext').mockReturnValue(context as unknown as CanvasRenderingContext2D);
 vi.spyOn(HTMLCanvasElement.prototype,'toBlob').mockImplementation(callback=>callback(new Blob(['sticker-png'],{type:'image/png'})));
 const onSend=vi.fn().mockResolvedValue(undefined),onClose=vi.fn();
 render(<StickerComposer open onClose={onClose} onSend={onSend}/>);
 fireEvent.click(screen.getByRole('button',{name:'Wave sticker'}));
 expect(screen.getByText(/Wave sticker/)).toBeInTheDocument();
 fireEvent.click(screen.getByRole('button',{name:'Send sticker'}));
 await waitFor(()=>expect(onSend).toHaveBeenCalledTimes(1));
 const file=onSend.mock.calls[0][0] as File;
 expect(file.type).toBe('image/png');
 expect(file.name).toBe('locat-wave-sticker.png');
 expect(context.roundRect).toHaveBeenCalledOnce();
 expect(context.fillText).toHaveBeenCalledWith('👋',320,332);
 expect(onClose).toHaveBeenCalledOnce();
});

it('groups stickers into nested packs and clears selection when switching packs',()=>{
 const context={fillStyle:'',font:'',textAlign:'',textBaseline:'',beginPath:vi.fn(),roundRect:vi.fn(),fill:vi.fn(),fillText:vi.fn()};
 vi.spyOn(HTMLCanvasElement.prototype,'getContext').mockReturnValue(context as unknown as CanvasRenderingContext2D);
 render(<StickerComposer open onClose={()=>undefined} onSend={vi.fn()}/>);
 const send=screen.getByRole('button',{name:'Send sticker'});
 expect(send).toBeDisabled();
 fireEvent.click(screen.getByRole('button',{name:'Wave sticker'}));
 expect(send).toBeEnabled();
 fireEvent.click(screen.getByRole('radio',{name:'Reactions'}));
 expect(screen.queryByRole('button',{name:'Wave sticker'})).not.toBeInTheDocument();
 expect(send).toBeDisabled();
 expect(screen.getByRole('button',{name:'Love sticker'})).toBeInTheDocument();
});
