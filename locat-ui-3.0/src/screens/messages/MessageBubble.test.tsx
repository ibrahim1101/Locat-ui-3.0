// @vitest-environment jsdom
import {expect,it,vi} from 'vitest';
import {fireEvent,render,screen} from '@testing-library/react';
import {MessageBubble} from './MessageBubble';
import type {MessageView} from '@/contracts/messaging';

const voice:MessageView={id:'voice-1',conversationId:'conversation-1',authorId:'alice',authorName:'Alice',mine:false,createdAt:Date.now(),delivery:'sent',attachment:{kind:'voice',name:'Voice message.webm',size:12_000,mime:'audio/webm',durationSec:12}};
const renderVoice=(onDownload=vi.fn(),m=voice)=>render(<MessageBubble m={m} grouped={false} showAuthor={false} onMenu={()=>{}} onJump={()=>{}} onRetry={()=>{}} onDownload={onDownload}/>);

it('loads encrypted voice media only when requested, then uses native paused playback controls',()=>{
 const onDownload=vi.fn();const view=renderVoice(onDownload);
 fireEvent.click(screen.getByRole('button',{name:'Load voice message Voice message.webm'}));expect(onDownload).toHaveBeenCalledOnce();
 view.rerender(<MessageBubble m={{...voice,attachment:{kind:'voice',name:'Voice message.webm',size:12_000,mime:'audio/webm',durationSec:12,previewUrl:'blob:decrypted'}}} grouped={false} showAuthor={false} onMenu={()=>{}} onJump={()=>{}} onRetry={()=>{}} onDownload={onDownload}/>);
 const audio=screen.getByLabelText('Voice message Voice message.webm');expect(audio.tagName).toBe('AUDIO');expect(audio).toHaveAttribute('preload','metadata');expect(audio).not.toHaveAttribute('autoplay');expect(audio).toHaveAttribute('controls');
});
