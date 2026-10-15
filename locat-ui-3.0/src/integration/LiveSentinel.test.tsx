import {fireEvent,render,screen,waitFor} from '@testing-library/react';
import {afterEach,expect,it,vi} from 'vitest';
import {MemoryRouter} from 'react-router';
import {BackProvider} from '../app/BackProvider';
import {LiveSentinel} from './LiveSentinel';
const {session}=vi.hoisted(()=>({session:{user:{id:'sentinel-owner'}}}));
vi.mock('../app/session',()=>({useSession:()=>session}));
afterEach(()=>vi.unstubAllGlobals());
it('shows real incidents and submits actions to their owned endpoint',async()=>{
 const incident={id:'abc',title:'Service down',description:'Host alert',source:'test',severity:'high',status:'open',occurrences:1,updatedAt:Date.now()};
 const fetch=vi.fn(async(path:string,options?:RequestInit)=>({ok:true,json:async()=>path==='/api/security/events'?{events:[]}:path.startsWith('/api/sentinel/tokens?')?{tokens:[]}:path.startsWith('/api/sentinel/incidents?')?{incidents:[incident]}:options?.method==='POST'?{ok:true}:{incident,events:[]}}));vi.stubGlobal('fetch',fetch);
 render(<MemoryRouter><BackProvider rootPath="/home"><LiveSentinel/></BackProvider></MemoryRouter>); await screen.findByText('Service down'); fireEvent.click(screen.getByRole('button',{name:'View incident'}));
 fireEvent.click(await screen.findByRole('button',{name:'Acknowledge'}));
 await waitFor(()=>expect(fetch).toHaveBeenCalledWith('/api/sentinel/incidents/abc',expect.objectContaining({body:JSON.stringify({action:'acknowledge'})})));
});
it('creates a token with form submission and clears its one-time display on close',async()=>{
 const fetch=vi.fn(async(path:string,options?:RequestInit)=>({ok:true,json:async()=>path==='/api/security/events'?{events:[]}:path.startsWith('/api/sentinel/incidents?')?{incidents:[]}:options?.method==='POST'?{id:'key',token:'one-time-secret'}:{tokens:[]}}));vi.stubGlobal('fetch',fetch);
 render(<MemoryRouter><BackProvider rootPath="/home"><LiveSentinel/></BackProvider></MemoryRouter>);await screen.findByText('No incidents in this view');fireEvent.click(screen.getByRole('button',{name:'integrations'}));fireEvent.click(screen.getByRole('button',{name:'Create integration token'}));
 fireEvent.change(screen.getByLabelText('Integration name'),{target:{value:'Host monitor'}});fireEvent.click(screen.getByRole('button',{name:'Create token'}));
 expect(await screen.findByLabelText('New token')).toHaveValue('one-time-secret');
 fireEvent.click(screen.getByRole('button',{name:'Close'})); await waitFor(()=>expect(screen.queryByLabelText('New token')).toBeNull());
});
it('loads account activity only when selected and refreshes that section through the header',async()=>{
 const activity=vi.fn();vi.stubGlobal('fetch',vi.fn(async(path:string)=>{if(path.startsWith('/api/security/events')){activity(path);return new Response(JSON.stringify({events:[{id:1,event:'session.revoked',severity:'warn',createdAt:1000}],nextCursor:null}));}return new Response(JSON.stringify(path.startsWith('/api/sentinel/incidents?')?{incidents:[]}:{tokens:[]}));}));render(<MemoryRouter><BackProvider rootPath="/home"><LiveSentinel/></BackProvider></MemoryRouter>);await screen.findByText('No incidents in this view');expect(activity).not.toHaveBeenCalled();fireEvent.click(screen.getByRole('button',{name:'account activity'}));await screen.findByText('session revoked');expect(activity).toHaveBeenCalledOnce();fireEvent.click(screen.getByRole('button',{name:'Refresh'}));await waitFor(()=>expect(activity).toHaveBeenCalledTimes(2));
});

it('does not fetch incidents or token metadata in local mode',()=>{
 const previous=session.user;session.user=null as unknown as typeof previous;const fetch=vi.fn();vi.stubGlobal('fetch',fetch);
 try{render(<MemoryRouter><LiveSentinel/></MemoryRouter>);expect(screen.getByText('A signed-in account is required')).toBeVisible();expect(fetch).not.toHaveBeenCalled();}finally{session.user=previous;}
});
it('drops incident and one-time token state when the signed-in account changes',async()=>{
 const previous=session.user;
 vi.stubGlobal('fetch',vi.fn(async(path:string,options?:RequestInit)=>{
  const owner=session.user.id;
  return new Response(JSON.stringify(options?.method==='POST'?{id:'key',token:'previous-owner-secret'}:path.startsWith('/api/sentinel/incidents?')?{incidents:[{id:'id',title:'Incident for '+owner,description:'',source:'test',severity:'high',status:'open',occurrences:1,updatedAt:1000}],nextCursor:null}:{tokens:[]}));
 }));
 const view=render(<MemoryRouter><LiveSentinel/></MemoryRouter>);
 try{
  await screen.findByText('Incident for '+previous.id);fireEvent.click(screen.getByRole('button',{name:'integrations'}));fireEvent.click(screen.getByRole('button',{name:'Create integration token'}));
  fireEvent.change(screen.getByLabelText('Integration name'),{target:{value:'Old owner token'}});fireEvent.click(screen.getByRole('button',{name:'Create token'}));expect(await screen.findByLabelText('New token')).toHaveValue('previous-owner-secret');
  session.user={id:'replacement-owner'};view.rerender(<MemoryRouter><LiveSentinel/></MemoryRouter>);
  expect(screen.queryByLabelText('New token')).toBeNull();await screen.findByText('Incident for replacement-owner');expect(screen.queryByText('Incident for '+previous.id)).toBeNull();
 }finally{session.user=previous;}
});
