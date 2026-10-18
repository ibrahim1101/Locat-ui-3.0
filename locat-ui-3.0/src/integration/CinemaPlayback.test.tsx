import {fireEvent,render,screen,waitFor} from '@testing-library/react';
import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import {LiveVideoPlayer} from './LiveVideoPlayer';
import type {LocalMediaItem} from './localMediaStore';
const update=vi.hoisted(()=>vi.fn(async()=>{}));
vi.mock('./liveMedia',()=>({useLiveMedia:()=>({update})}));
const item:LocalMediaItem={id:'server:video',name:'sample.mkv',kind:'video',file:new Blob(),size:13191223154,album:'Host',addedAt:1,favorite:false,position:0,source:'server',streamUrl:'/api/media/stream/'+'a'.repeat(64)};
const details={container:'matroska,webm',videoCodec:'hevc',audioCodec:'aac',width:3840,height:2160,strategy:'transcode',reason:'H.264/AAC conversion is recommended',audioTracks:[],durationSeconds:120};
beforeEach(()=>{
 update.mockClear();
 vi.spyOn(HTMLMediaElement.prototype,'pause').mockImplementation(()=>{});vi.spyOn(HTMLMediaElement.prototype,'load').mockImplementation(()=>{});vi.spyOn(HTMLMediaElement.prototype,'play').mockResolvedValue();
 vi.stubGlobal('fetch',vi.fn(async()=>new Response(JSON.stringify(details))));
});
afterEach(()=>{vi.restoreAllMocks();vi.unstubAllGlobals();});
it('opens top options, explains HEVC remux refusal and changes the actual player source',async()=>{
 const {container}=render(<LiveVideoPlayer item={item} onClose={()=>{}}/>);let video=container.querySelector('video')!;
 fireEvent.click(screen.getByRole('button',{name:'Playback options'}));
 const convert=await screen.findByRole('button',{name:'Convert to H.264/AAC · up to 1080p'});
 expect(screen.getByRole('button',{name:'Remux · copy streams into MP4'})).toBeDisabled();expect(screen.getByText(/Remux keeps the original codec/)).toBeVisible();
 fireEvent.click(convert);await waitFor(()=>{video=container.querySelector('video')!;expect(video.getAttribute('src')).toContain('?mode=transcode');});expect(screen.queryByRole('dialog')).toBeNull();expect(screen.getByLabelText('Seek')).not.toBeDisabled();
 fireEvent.error(video);expect(screen.getByTestId('player-error')).toHaveTextContent('Server conversion could not be played');
 fireEvent.click(screen.getByRole('button',{name:'Playback options'}));fireEvent.click(await screen.findByRole('button',{name:'Direct playback · supports seeking'}));await waitFor(()=>{video=container.querySelector('video')!;expect(video.getAttribute('src')).toBe(item.streamUrl);});expect(screen.getByLabelText('Seek')).not.toBeDisabled();
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

it('explains local HEVC limits without offering a nonfunctional server conversion',async()=>{
 const create=vi.fn(()=>'blob:locat-test-video');
 const revoke=vi.fn();
 vi.stubGlobal('URL',Object.assign(class extends URL {},{createObjectURL:create,revokeObjectURL:revoke}));
 const local:LocalMediaItem={...item,id:'local:video',source:'device',streamUrl:undefined,file:new Blob(['synthetic'],{type:'video/x-matroska'})};
 render(<LiveVideoPlayer item={local} onClose={()=>{}}/>);
 fireEvent.click(screen.getByRole('button',{name:'Playback options'}));
 expect(await screen.findByText(/browser-local files cannot use the server FFmpeg converter/)).toBeVisible();
 expect(screen.getByText(/Opening a large video without copying avoids IndexedDB limits/)).toBeVisible();
 expect(screen.getByRole('button',{name:/Retry direct playback/})).toBeEnabled();
 expect(screen.queryByRole('button',{name:/Convert to H.264/})).toBeNull();
 expect(fetch).not.toHaveBeenCalled();
 expect(create).toHaveBeenCalled();
});

it('applies saved direct-playback position once and does not overwrite later seeks on metadata reload',()=>{
 const resumed={...item,position:42};
 const {container}=render(<LiveVideoPlayer item={resumed} onClose={()=>{}}/>);
 const element=container.querySelector('video')!;
 Object.defineProperty(element,'duration',{configurable:true,value:120});
 fireEvent.loadedMetadata(element);
 expect(element.currentTime).toBe(42);
 element.currentTime=65;
 fireEvent.loadedMetadata(element);
 expect(element.currentTime).toBe(65);
});

it('restarts repeated converted seeks, preserves paused intent and ignores detached source events',async()=>{
 const {container}=render(<LiveVideoPlayer item={item} onClose={()=>{}} autoStart/>);
 fireEvent.click(screen.getByRole('button',{name:'Playback options'}));fireEvent.click(await screen.findByRole('button',{name:'Convert to H.264/AAC · up to 1080p'}));
 let element=container.querySelector('video')!;Object.defineProperties(element,{duration:{configurable:true,value:120},readyState:{configurable:true,value:4},paused:{configurable:true,value:true}});fireEvent.loadedMetadata(element);
 const playCount=vi.mocked(HTMLMediaElement.prototype.play).mock.calls.length;
 fireEvent.change(screen.getByLabelText('Seek'),{target:{value:'30'}});const previous=element;element=container.querySelector('video')!;expect(element).not.toBe(previous);expect(element.src).toContain('start=30');
 Object.defineProperties(element,{duration:{configurable:true,value:90},readyState:{configurable:true,value:4},paused:{configurable:true,value:true}});fireEvent.loadedMetadata(element);fireEvent.loadedMetadata(element);expect(HTMLMediaElement.prototype.play).toHaveBeenCalledTimes(playCount);
 element.currentTime=5;fireEvent.timeUpdate(element);expect(screen.getByLabelText('Seek')).toHaveValue('35');fireEvent.pause(element);expect(update).toHaveBeenLastCalledWith(expect.objectContaining({position:35}));
 fireEvent.error(previous);expect(screen.queryByTestId('player-error')).toBeNull();
 fireEvent.change(screen.getByLabelText('Seek'),{target:{value:'30'}});expect(container.querySelector('video')).not.toBe(element);expect(container.querySelector('video')!.src).toContain('start=30');
 fireEvent.change(screen.getByLabelText('Seek'),{target:{value:'120'}});expect(container.querySelector('video')!.src).toContain('start=119');
});
it('disables remux seeking and rejects unavailable converted duration at the real player controls',async()=>{
 vi.stubGlobal('fetch',vi.fn(async()=>new Response(JSON.stringify({...details,strategy:'remux',videoCodec:'h264',durationSeconds:null}))));
 render(<LiveVideoPlayer item={item} onClose={()=>{}}/>);fireEvent.click(screen.getByRole('button',{name:'Playback options'}));fireEvent.click(await screen.findByRole('button',{name:'Remux · copy streams into MP4'}));expect(screen.getByLabelText('Seek')).toBeDisabled();
 fireEvent.click(screen.getByRole('button',{name:'Playback options'}));fireEvent.click(await screen.findByRole('button',{name:'Convert to H.264/AAC · up to 1080p'}));expect(screen.getByLabelText('Seek')).toBeDisabled();
});

it.each([true,false])('preserves playing=%s across consecutive seeks before replacement metadata arrives',async playing=>{
 const {container}=render(<LiveVideoPlayer item={item} onClose={()=>{}}/>);
 fireEvent.click(screen.getByRole('button',{name:'Playback options'}));fireEvent.click(await screen.findByRole('button',{name:'Convert to H.264/AAC · up to 1080p'}));
 let element=container.querySelector('video')!;Object.defineProperties(element,{duration:{configurable:true,value:120},readyState:{configurable:true,value:4},paused:{configurable:true,value:!playing}});fireEvent.loadedMetadata(element);
 const before=vi.mocked(HTMLMediaElement.prototype.play).mock.calls.length;
 fireEvent.change(screen.getByLabelText('Seek'),{target:{value:'10'}});
 const first=container.querySelector('video')!;expect(first).not.toBe(element);
 fireEvent.change(screen.getByLabelText('Seek'),{target:{value:'20'}});
 element=container.querySelector('video')!;expect(element).not.toBe(first);expect(element.src).toContain('start=20');
 Object.defineProperties(element,{duration:{configurable:true,value:100},readyState:{configurable:true,value:4},paused:{configurable:true,value:true}});fireEvent.loadedMetadata(element);
 expect(HTMLMediaElement.prototype.play).toHaveBeenCalledTimes(before+(playing?1:0));
});
