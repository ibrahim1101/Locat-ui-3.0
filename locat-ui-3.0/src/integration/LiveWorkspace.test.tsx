import {fireEvent,render,screen,waitFor} from '@testing-library/react';
import {MemoryRouter} from 'react-router';
import {afterEach,expect,it,vi} from 'vitest';
import {LiveWorkspace} from './LiveWorkspace';

const {session}=vi.hoisted(()=>({session:{user:{id:'a'.repeat(32),displayName:'Alice',lcCode:'LC-1234'}}}));
vi.mock('../app/session',()=>({useSession:()=>session}));
afterEach(()=>vi.unstubAllGlobals());
const reply=(data:object,status=200)=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json'}});

it('loads the signed-in team board and saves a shared task',async()=>{
 const workspace={id:'11111111-1111-4111-8111-111111111111',name:'Team',role:'owner',createdAt:1},members=[{userId:'a'.repeat(32),username:'alice',displayName:'Alice',role:'owner',status:'active'}];let items:object[]=[];const requests:Array<{path:string;options:RequestInit}> =[];
 vi.stubGlobal('fetch',vi.fn(async(path:string,options:RequestInit={})=>{requests.push({path,options});if(path==='/api/workspaces')return reply({workspaces:[workspace]});if(path==='/api/workspaces/invitations')return reply({invitations:[]});if(path.endsWith('/members'))return reply({members});if(path.endsWith('/items')&&options.method==='POST'){const input=JSON.parse(String(options.body));const item={...input,id:'task-a',revision:1,authorId:'a'.repeat(32),updatedAt:Date.now()};items=[item];return reply({item},201);}if(path.endsWith('/items'))return reply({items});return reply({ok:true});}));
 render(<MemoryRouter><LiveWorkspace/></MemoryRouter>);await screen.findByRole('heading',{name:'Team'});await screen.findByText('No notes or tasks yet.');fireEvent.change(screen.getByLabelText('Title'),{target:{value:'Review release'}});fireEvent.change(screen.getByLabelText('Workspace item details'),{target:{value:'Check schema changes'}});fireEvent.click(screen.getByRole('button',{name:'Save to board'}));await screen.findByText('Check schema changes');
 const create=requests.find(row=>row.options.method==='POST'&&row.path.endsWith('/items'));expect(create?.options.headers).toMatchObject({'X-Locat-Account':'a'.repeat(32)});expect(JSON.parse(String(create?.options.body))).toMatchObject({kind:'task',title:'Review release',content:'Check schema changes'});await waitFor(()=>expect(screen.getByText('Workspace item saved.')).toBeVisible());
});
