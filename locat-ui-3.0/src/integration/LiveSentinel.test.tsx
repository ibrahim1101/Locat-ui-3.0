import {fireEvent,render,screen,waitFor} from '@testing-library/react';
import {afterEach,expect,it,vi} from 'vitest';
import {MemoryRouter} from 'react-router';
import {BackProvider} from '../app/BackProvider';
import {LiveSentinel} from './LiveSentinel';
afterEach(()=>vi.unstubAllGlobals());
it('shows real incidents and submits actions to their owned endpoint',async()=>{
 const incident={id:'abc',title:'Service down',description:'Host alert',source:'test',severity:'high',status:'open',occurrences:1,updatedAt:Date.now()};
 const fetch=vi.fn(async(path:string,options?:RequestInit)=>({ok:true,json:async()=>path==='/api/security/events'?{events:[]}:path==='/api/sentinel/tokens'?{tokens:[]}:path==='/api/sentinel/incidents'?{incidents:[incident]}:options?.method==='POST'?{ok:true}:{incident,events:[]}}));vi.stubGlobal('fetch',fetch);
 render(<MemoryRouter><BackProvider rootPath="/home"><LiveSentinel/></BackProvider></MemoryRouter>); await screen.findByText('Service down'); fireEvent.click(screen.getByRole('button',{name:'View incident'}));
 fireEvent.click(await screen.findByRole('button',{name:'Acknowledge'}));
 await waitFor(()=>expect(fetch).toHaveBeenCalledWith('/api/sentinel/incidents/abc',expect.objectContaining({body:JSON.stringify({action:'acknowledge'})})));
});
it('creates a token with form submission and clears its one-time display on close',async()=>{
 const fetch=vi.fn(async(path:string,options?:RequestInit)=>({ok:true,json:async()=>path==='/api/security/events'?{events:[]}:path==='/api/sentinel/incidents'?{incidents:[]}:options?.method==='POST'?{id:'key',token:'one-time-secret'}:{tokens:[]}}));vi.stubGlobal('fetch',fetch);
 render(<MemoryRouter><BackProvider rootPath="/home"><LiveSentinel/></BackProvider></MemoryRouter>);await screen.findByText('No incidents in this view');fireEvent.click(screen.getByRole('button',{name:'integrations'}));fireEvent.click(screen.getByRole('button',{name:'Create integration token'}));
 fireEvent.change(screen.getByLabelText('Integration name'),{target:{value:'Host monitor'}});fireEvent.click(screen.getByRole('button',{name:'Create token'}));
 expect(await screen.findByLabelText('New token')).toHaveValue('one-time-secret');
 fireEvent.click(screen.getByRole('button',{name:'Close'})); await waitFor(()=>expect(screen.queryByLabelText('New token')).toBeNull());
});
