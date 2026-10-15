import {act,fireEvent,render,screen,waitFor} from '@testing-library/react';
import {afterEach,expect,it,vi} from 'vitest';
import {SentinelIncidentsPanel} from './SentinelIncidentsPanel';
afterEach(()=>vi.unstubAllGlobals());
const incident=(id:string,title=id)=>({id,title,description:'',source:'custom',severity:'medium',status:'open',occurrences:1,updatedAt:1000});
const response=(incidents:ReturnType<typeof incident>[],nextCursor:string|null=null)=>new Response(JSON.stringify({incidents,nextCursor}));
it('loads older incidents with deduplication and sends only explicitly applied server filters',async()=>{
 const paths:string[]=[];vi.stubGlobal('fetch',vi.fn(async(path:string)=>{
  paths.push(path);const params=new URL(path,'https://locat.test').searchParams;
  if(params.has('q'))return response([incident('filtered','Filtered database alert')]);
  return params.has('before')?response([incident('a','First alert'),incident('b','Older alert')]):response([incident('a','First alert')],'1000:'+ 'a'.repeat(32));
 }));
 render(<SentinelIncidentsPanel/>);await screen.findByText('First alert');
 fireEvent.change(screen.getByLabelText('Search incidents'),{target:{value:'database'}});
 fireEvent.click(screen.getByRole('button',{name:'Load older incidents'}));await screen.findByText('Older alert');
 expect(screen.getAllByText('First alert')).toHaveLength(1);expect(new URL(paths[1],'https://locat.test').searchParams.has('q')).toBe(false);
 fireEvent.change(screen.getByLabelText('Incident source'),{target:{value:'nscout'}});fireEvent.click(screen.getByRole('button',{name:'resolved'}));fireEvent.click(screen.getByRole('button',{name:'high'}));
 fireEvent.click(screen.getByRole('button',{name:'Apply incident filters'}));await screen.findByText('Filtered database alert');
 const params=new URL(paths.at(-1)!,'https://locat.test').searchParams;
 expect(Object.fromEntries(params)).toEqual({limit:'25',q:'database',status:'resolved',severity:'high',source:'nscout'});expect(screen.queryByText('Older alert')).toBeNull();
});
it('ignores an older pending page after refresh and aborts its request',async()=>{
 let release:(response:Response)=>void=()=>{},pendingSignal:AbortSignal|undefined;let calls=0;
 const pending=new Promise<Response>(resolve=>{release=resolve;});
 vi.stubGlobal('fetch',vi.fn(async(_path:string,options:RequestInit)=>{
  calls++;if(calls===2){pendingSignal=options.signal??undefined;return pending;}
  return calls===1?response([incident('a','Original alert')],'1000:'+ 'a'.repeat(32)):response([incident('fresh','Refreshed alert')]);
 }));
 const view=render(<SentinelIncidentsPanel/>);await screen.findByText('Original alert');fireEvent.click(screen.getByRole('button',{name:'Load older incidents'}));
 view.rerender(<SentinelIncidentsPanel refreshToken={1}/>);await screen.findByText('Refreshed alert');expect(pendingSignal?.aborted).toBe(true);
 await act(async()=>{release(response([incident('late','Stale older alert')]));await pending;});
 expect(screen.queryByText('Stale older alert')).toBeNull();expect(screen.queryByText('Original alert')).toBeNull();
});
it('preserves already loaded incidents when an older page fails and permits retry',async()=>{
 let calls=0;vi.stubGlobal('fetch',vi.fn(async()=>{calls++;if(calls===2)throw new Error('Temporary incident outage');return calls===1?response([incident('a','Retained alert')],'1000:'+ 'a'.repeat(32)):response([incident('b','Recovered older alert')]);}));
 render(<SentinelIncidentsPanel/>);await screen.findByText('Retained alert');fireEvent.click(screen.getByRole('button',{name:'Load older incidents'}));
 await screen.findByText('Temporary incident outage');expect(screen.getByText('Retained alert')).toBeVisible();
 fireEvent.click(screen.getByRole('button',{name:'Load older incidents'}));await screen.findByText('Recovered older alert');expect(screen.getByText('Retained alert')).toBeVisible();
});
it('aborts its list read on unmount',async()=>{
 const controls:AbortSignal[]=[];
 vi.stubGlobal('fetch',vi.fn((_path:string,options:RequestInit)=>new Promise((_resolve,reject)=>{
  const signal=options.signal!;controls.push(signal);signal.addEventListener('abort',()=>reject(new DOMException('aborted','AbortError')),{once:true});
 })));
 const view=render(<SentinelIncidentsPanel/>);await waitFor(()=>expect(controls).toHaveLength(1));await act(async()=>view.unmount());expect(controls[0].aborted).toBe(true);
});
