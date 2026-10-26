import {fireEvent,render,screen,waitFor} from '@testing-library/react';
import {MemoryRouter} from 'react-router';
import {afterEach,expect,it,vi} from 'vitest';
import {LiveAutomate} from './LiveAutomate';

const {session}=vi.hoisted(()=>({session:{user:{id:'b'.repeat(32),displayName:'Bob',lcCode:'LC-4321'}}}));
vi.mock('../app/session',()=>({useSession:()=>session}));
afterEach(()=>vi.unstubAllGlobals());
const reply=(data:object,status=200)=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json'}});

it('schedules an account-owned one-time reminder',async()=>{
 const requests:Array<{path:string;options:RequestInit}> =[];let rules:object[]=[];
 vi.stubGlobal('fetch',vi.fn(async(path:string,options:RequestInit={})=>{requests.push({path,options});if(options.method==='POST'){const input=JSON.parse(String(options.body));const rule={...input,id:'reminder-a',revision:1,firedAt:null,createdAt:Date.now(),updatedAt:Date.now()};rules=[rule];return reply({rule},201);}return reply({rules});}));
 render(<MemoryRouter><LiveAutomate/></MemoryRouter>);await screen.findByText('No scheduled reminders');fireEvent.click(screen.getByRole('button',{name:'New reminder'}));fireEvent.change(screen.getByLabelText('Reminder title'),{target:{value:'Take a break'}});fireEvent.change(screen.getByLabelText('Reminder details'),{target:{value:'Stretch for a minute'}});fireEvent.click(screen.getByRole('button',{name:'Save reminder'}));await screen.findByRole('heading',{name:'Take a break'});await waitFor(()=>expect(screen.getByText('Reminder scheduled.')).toBeVisible());
 const create=requests.find(row=>row.options.method==='POST');expect(create?.path).toBe('/api/automate/rules');expect(create?.options.headers).toMatchObject({'X-Locat-Account':'b'.repeat(32)});expect(JSON.parse(String(create?.options.body))).toMatchObject({title:'Take a break',details:'Stretch for a minute',enabled:true});
});
