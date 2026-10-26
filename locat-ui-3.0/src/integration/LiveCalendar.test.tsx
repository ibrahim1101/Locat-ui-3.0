import {fireEvent,render,screen,waitFor} from '@testing-library/react';
import {MemoryRouter} from 'react-router';
import {afterEach,expect,it,vi} from 'vitest';
import {LiveCalendar} from './LiveCalendar';

const {session}=vi.hoisted(()=>({session:{user:{id:'calendar-owner',displayName:'Alice',lcCode:'LC-1234'}}}));
vi.mock('../app/session',()=>({useSession:()=>session}));
afterEach(()=>vi.unstubAllGlobals());
const reply=(data:object,status=200)=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json'}});

it('creates an account-owned event and reloads the current month',async()=>{
 const requests:Array<{path:string;options:RequestInit}> =[],events:Record<string,unknown>[]=[];
 vi.stubGlobal('fetch',vi.fn(async(path:string,options:RequestInit={})=>{requests.push({path,options});if(path==='/api/workspaces')return reply({workspaces:[]});if(options.method==='POST'){const input=JSON.parse(String(options.body));const event={...input,id:'event-a',createdAt:Date.now(),updatedAt:Date.now(),masterStartsAt:input.startsAt,masterEndsAt:input.endsAt,masterReminderAt:input.reminderAt};events.push(event);return reply({event},201);}return reply({events});}));
 render(<MemoryRouter><LiveCalendar/></MemoryRouter>);await screen.findByText('No events this month');fireEvent.click(screen.getByRole('button',{name:'New event'}));fireEvent.change(screen.getByLabelText('Event name'),{target:{value:'Release review'}});fireEvent.change(screen.getByLabelText('Notes'),{target:{value:'Check release gates'}});fireEvent.change(screen.getByLabelText('Repeat event'),{target:{value:'604800000'}});fireEvent.click(screen.getByRole('button',{name:'Save event'}));
 await screen.findByRole('heading',{name:'Release review'});await waitFor(()=>expect(screen.getByText('Event saved.')).toBeVisible());expect(screen.getByText(/Repeats every 7 days/)).toBeVisible();
 const create=requests.find(row=>row.options.method==='POST');expect(create?.path).toBe('/api/calendar/events');expect(JSON.parse(String(create?.options.body))).toMatchObject({title:'Release review',notes:'Check release gates',repeatMs:604_800_000});expect(create?.options.headers).toMatchObject({'X-Locat-Account':'calendar-owner'});
});

it('creates and reads events in an active workspace calendar',async()=>{
 const workspaceId='11111111-1111-4111-8111-111111111111',workspace={id:workspaceId,name:'Team',role:'member'},requests:Array<{path:string;options:RequestInit}> =[];let events:Record<string,unknown>[]=[];
 vi.stubGlobal('fetch',vi.fn(async(path:string,options:RequestInit={})=>{requests.push({path,options});if(path==='/api/workspaces')return reply({workspaces:[workspace]});if(options.method==='POST'){const input=JSON.parse(String(options.body));const event={...input,id:'shared-event',createdAt:Date.now(),updatedAt:Date.now(),masterStartsAt:input.startsAt,masterEndsAt:input.endsAt,masterReminderAt:input.reminderAt};events=[event];return reply({event},201);}return reply({events});}));
 render(<MemoryRouter><LiveCalendar/></MemoryRouter>);await screen.findByText('No events this month');await screen.findByRole('option',{name:'Team · shared'});fireEvent.change(screen.getByLabelText('Calendar scope'),{target:{value:workspaceId}});await waitFor(()=>expect(requests.some(row=>row.path.includes('workspaceId='+workspaceId))).toBe(true));fireEvent.click(screen.getByRole('button',{name:'New event'}));fireEvent.change(screen.getByLabelText('Event name'),{target:{value:'Team planning'}});fireEvent.click(screen.getByRole('button',{name:'Save event'}));await screen.findByRole('heading',{name:'Team planning'});const create=requests.find(row=>row.options.method==='POST');expect(JSON.parse(String(create?.options.body))).toMatchObject({title:'Team planning',workspaceId});
});
