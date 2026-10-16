import {fireEvent,render,screen,waitFor} from '@testing-library/react';
import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import {LiveVideoPlayer} from './LiveVideoPlayer';
import type {LocalMediaItem} from './localMediaStore';
vi.mock('./liveMedia',()=>({useLiveMedia:()=>({update:vi.fn(async()=>{})})}));
const item:LocalMediaItem={id:'server:video',name:'sample.mkv',kind:'video',file:new Blob(),size:13191223154,album:'Host',addedAt:1,favorite:false,position:0,source:'server',streamUrl:'/api/media/stream/'+'a'.repeat(64)};
const details={container:'matroska,webm',videoCodec:'hevc',audioCodec:'aac',width:3840,height:2160,strategy:'transcode',reason:'H.264/AAC conversion is recommended',audioTracks:[],durationSeconds:120};
beforeEach(()=>{
 vi.spyOn(HTMLMediaElement.prototype,'pause').mockImplementation(()=>{});vi.spyOn(HTMLMediaElement.prototype,'load').mockImplementation(()=>{});vi.spyOn(HTMLMediaElement.prototype,'play').mockResolvedValue();
 vi.stubGlobal('fetch',vi.fn(async()=>new Response(JSON.stringify(details))));
});
afterEach(()=>{vi.restoreAllMocks();vi.unstubAllGlobals();});
it('opens top options, explains HEVC remux refusal and changes the actual player source',async()=>{
 const {container}=render(<LiveVideoPlayer item={item} onClose={()=>{}}/>);const video=container.querySelector('video')!;
 fireEvent.click(screen.getByRole('button',{name:'Playback options'}));
 const convert=await screen.findByRole('button',{name:'Convert to H.264/AAC · up to 1080p'});
 expect(screen.getByRole('button',{name:'Remux · copy streams into MP4'})).toBeDisabled();expect(screen.getByText(/Remux keeps the original codec/)).toBeVisible();
 fireEvent.click(convert);await waitFor(()=>expect(video.getAttribute('src')).toContain('?mode=transcode'));expect(screen.queryByRole('dialog')).toBeNull();expect(screen.getByLabelText('Seek')).toBeDisabled();
 fireEvent.error(video);expect(screen.getByTestId('player-error')).toHaveTextContent('Server conversion could not be played');
 fireEvent.click(screen.getByRole('button',{name:'Playback options'}));fireEvent.click(await screen.findByRole('button',{name:'Direct playback · supports seeking'}));await waitFor(()=>expect(video.getAttribute('src')).toBe(item.streamUrl));expect(screen.getByLabelText('Seek')).not.toBeDisabled();
 fireEvent.click(screen.getByRole('button',{name:'Playback options'}));fireEvent.click(await screen.findByRole('button',{name:'Direct playback · supports seeking'}));expect(HTMLMediaElement.prototype.load).toHaveBeenCalled();
});
it('inspects Stream details without opening compatibility and never displays undefined metadata',async()=>{
 render(<LiveVideoPlayer item={item} onClose={()=>{}}/>);fireEvent.click(screen.getByRole('button',{name:'Stream info'}));
 const dialog=screen.getByRole('dialog',{name:'Stream details'});expect(dialog).not.toHaveTextContent('undefined');await screen.findByText('hevc · 3840×2160');expect(dialog).toHaveTextContent('aac');expect(screen.queryByRole('dialog',{name:'Playback compatibility'})).toBeNull();
});
it('does not intercept native Space activation on modal buttons and reports inspection errors',async()=>{
 vi.stubGlobal('fetch',vi.fn(async()=>new Response(JSON.stringify({error:'FFprobe is unavailable'}),{status:503})));
 render(<LiveVideoPlayer item={item} onClose={()=>{}}/>);fireEvent.click(screen.getByRole('button',{name:'Playback options'}));await screen.findByText('FFprobe is unavailable');const direct=screen.getByRole('button',{name:'Direct playback · supports seeking'});
 expect(fireEvent.keyDown(direct,{key:' ',code:'Space',bubbles:true,cancelable:true})).toBe(true);
});
