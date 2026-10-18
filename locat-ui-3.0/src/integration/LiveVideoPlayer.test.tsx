import {fireEvent,render,screen,waitFor} from '@testing-library/react';
import {afterEach,expect,it,vi} from 'vitest';
import type {ReactNode} from 'react';
import type {PlaybackView} from '../contracts';
import type {LocalMediaItem} from './localMediaStore';
import {LiveVideoPlayer} from './LiveVideoPlayer';
const {update}=vi.hoisted(()=>({update:vi.fn()}));
vi.mock('./liveMedia',()=>({useLiveMedia:()=>({update})}));
vi.mock('../screens/cinema/VideoPlayer',()=>({PlayerChrome:({surface,state}:{surface:ReactNode;state:PlaybackView})=><div>{surface}<p>{state.error?.message ?? state.state}</p></div>}));
afterEach(()=>{vi.restoreAllMocks();vi.clearAllMocks();});
function setup(autoStart=false,onEnded=vi.fn()){
 vi.spyOn(URL,'createObjectURL').mockReturnValue('blob:video');vi.spyOn(URL,'revokeObjectURL').mockImplementation(()=>{});
 vi.spyOn(HTMLMediaElement.prototype,'pause').mockImplementation(()=>{});vi.spyOn(HTMLMediaElement.prototype,'load').mockImplementation(()=>{});
 const result=render(<LiveVideoPlayer item={{id:'v',kind:'video',name:'video.mp4',file:new Blob(),position:15} as LocalMediaItem} autoStart={autoStart} onEnded={onEnded} onClose={()=>{}}/>);
 const video=result.container.querySelector('video')!;Object.defineProperty(video,'duration',{value:120});Object.defineProperty(video,'readyState',{value:4});return {...result,video,onEnded};
}
it('resumes manually selected videos and advances only after an actual ended event',()=>{
 const play=vi.spyOn(HTMLMediaElement.prototype,'play').mockResolvedValue();const {video,onEnded,unmount}=setup();
 fireEvent.loadedMetadata(video);expect(video.currentTime).toBe(15);expect(play).not.toHaveBeenCalled();expect(onEnded).not.toHaveBeenCalled();
 Object.defineProperty(video,'ended',{value:true});fireEvent.ended(video);expect(onEnded).toHaveBeenCalledOnce();expect(update).toHaveBeenCalledWith(expect.objectContaining({id:'v',position:0}));
 unmount();expect(video.hasAttribute('src')).toBe(false);
});
it('attempts queued playback and reports a browser autoplay rejection',async()=>{
 const play=vi.spyOn(HTMLMediaElement.prototype,'play').mockRejectedValue(new Error('Playback requires a user gesture'));
 const {video,unmount}=setup(true);fireEvent.loadedMetadata(video);await screen.findByText('Playback requires a user gesture');
 await waitFor(()=>expect(play).toHaveBeenCalledOnce());unmount();
});
