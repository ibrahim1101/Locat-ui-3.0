import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { afterEach, expect, it, vi } from "vitest";
import { LiveContacts } from "./LiveContacts";
const {session}=vi.hoisted(()=>({session:{user:{id:'a'.repeat(32)}}}));
vi.mock('../app/session',()=>({useSession:()=>session}));
afterEach(() => vi.unstubAllGlobals());
it("submits LC discovery and sends an actual friend request from the live form", async () => {
  const user = { id: "b".repeat(32), username: "bob", displayName: "Bob", lcCode: "LC-1234" };
  const response = (data: object) => ({ ok: true, json: async () => data });
  const fetch = vi.fn().mockResolvedValueOnce(response({ contacts: [], blocked: [] })).mockResolvedValueOnce(response({ users: [user] })).mockResolvedValueOnce(response({ ok: true })).mockResolvedValueOnce(response({ contacts: [{ user, status: "pending", direction: "outgoing" }], blocked: [] }));
  vi.stubGlobal("fetch", fetch);
  render(<MemoryRouter><LiveContacts /></MemoryRouter>);
  await waitFor(() => expect(fetch).toHaveBeenCalledOnce());
  fireEvent.change(screen.getByPlaceholderText("Exact username or LC code"), { target: { value: "LC-1234" } });
  fireEvent.click(screen.getByRole("button", { name: "Find contact" }));
  fireEvent.click(await screen.findByRole("button", { name: "Send friend request" }));
  await screen.findByText("outgoing request");
  expect(fetch.mock.calls[1][0]).toBe("/api/users/search?q=LC-1234");
  expect(fetch.mock.calls[2][0]).toBe("/api/contacts/request");
  expect(JSON.parse(fetch.mock.calls[2][1].body)).toEqual({ userId: user.id });
});

const reply=(data:object,status=200)=>new Response(JSON.stringify(data),{status});
const peer={id:'b'.repeat(32),username:'bob',displayName:'Bob',lcCode:'LC-1234'};
it('aborts superseded discovery and ignores a late older response',async()=>{
 let finish!:(value:Response)=>void;let oldSignal:AbortSignal|null|undefined;
 vi.stubGlobal('fetch',vi.fn(async(path:string,options?:RequestInit)=>path==='/api/contacts'?reply({contacts:[],blocked:[]}):path.endsWith('older')?(oldSignal=options?.signal,new Promise<Response>(resolve=>{finish=resolve;})):reply({users:[{...peer,displayName:'Newest result'}]})));
 render(<MemoryRouter><LiveContacts/></MemoryRouter>);await screen.findByText('No contacts yet');const field=screen.getByPlaceholderText('Exact username or LC code');fireEvent.change(field,{target:{value:'older'}});fireEvent.click(screen.getByRole('button',{name:'Find contact'}));await waitFor(()=>expect(finish).toBeTypeOf('function'));fireEvent.change(field,{target:{value:'newer'}});fireEvent.click(screen.getByRole('button',{name:'Find contact'}));await screen.findByText(/Newest result/);expect(oldSignal?.aborted).toBe(true);await act(async()=>{finish(reply({users:[{...peer,displayName:'Stale result'}]}));});expect(screen.queryByText(/Stale result/)).toBeNull();
});
it('clears old account dialogs and drafts, aborting discovery on account change',async()=>{
 let finish!:(value:Response)=>void;let pendingSignal:AbortSignal|null|undefined;
 vi.stubGlobal('fetch',vi.fn(async(path:string,options?:RequestInit)=>path==='/api/contacts'?reply({contacts:[{user:peer,status:'accepted',direction:'outgoing'}],blocked:[]}):(pendingSignal=options?.signal,new Promise<Response>(resolve=>{finish=resolve;}))));
 const view=render(<MemoryRouter><LiveContacts/></MemoryRouter>);fireEvent.click(await screen.findByRole('button',{name:'Remove contact'}));fireEvent.change(screen.getByPlaceholderText('Exact username or LC code'),{target:{value:'old draft'}});fireEvent.submit(screen.getByRole('button',{name:'Find contact'}).closest('form')!);await waitFor(()=>expect(finish).toBeTypeOf('function'));const original=session.user;
 try{session.user={id:'c'.repeat(32)};view.rerender(<MemoryRouter><LiveContacts/></MemoryRouter>);expect(screen.queryByRole('dialog')).toBeNull();expect(screen.getByPlaceholderText('Exact username or LC code')).toHaveValue('');expect(pendingSignal?.aborted).toBe(true);await act(async()=>{finish(reply({users:[{...peer,displayName:'Old account discovery'}]}));});expect(screen.queryByText(/Old account discovery/)).toBeNull();}finally{session.user=original;}
});
it('makes no account requests in local mode',()=>{
 const original=session.user,fetch=vi.fn();vi.stubGlobal('fetch',fetch);try{session.user=null as unknown as typeof original;render(<MemoryRouter><LiveContacts/></MemoryRouter>);expect(screen.getByText('Sign in to manage contacts')).toBeVisible();expect(fetch).not.toHaveBeenCalled();}finally{session.user=original;}
});
it('excludes duplicate contact mutations before the next render',async()=>{
 let finish!:(value:Response)=>void;const fetch=vi.fn(async(_path:string,options?:RequestInit)=>options?.method==='POST'?new Promise<Response>(resolve=>{finish=resolve;}):reply({contacts:[{user:peer,status:'accepted',direction:'outgoing'}],blocked:[]}));vi.stubGlobal('fetch',fetch);render(<MemoryRouter><LiveContacts/></MemoryRouter>);const button=await screen.findByRole('button',{name:'Block'});act(()=>{button.dispatchEvent(new MouseEvent('click',{bubbles:true}));button.dispatchEvent(new MouseEvent('click',{bubbles:true}));});await waitFor(()=>expect(fetch.mock.calls.filter(([,options])=>options?.method==='POST')).toHaveLength(1));await act(async()=>{finish(reply({ok:true}));});expect(fetch.mock.calls.find(([,options])=>options?.method==='POST')?.[1]?.headers).toMatchObject({'X-Locat-Account':'a'.repeat(32)});
});
it('keeps refresh available after a failed action cancels an older loading request',async()=>{
 vi.stubGlobal('fetch',vi.fn(async(path:string,options?:RequestInit)=>path==='/api/contacts'?new Promise<Response>((_resolve,reject)=>options?.signal?.addEventListener('abort',()=>reject(new DOMException('aborted','AbortError')),{once:true})):options?.method==='POST'?reply({error:'Mutation rejected'},403):reply({users:[peer]})));
 render(<MemoryRouter><LiveContacts/></MemoryRouter>);fireEvent.change(screen.getByPlaceholderText('Exact username or LC code'),{target:{value:'bob'}});fireEvent.click(screen.getByRole('button',{name:'Find contact'}));fireEvent.click(await screen.findByRole('button',{name:'Send friend request'}));await screen.findByText('Mutation rejected');expect(screen.getByRole('button',{name:'Refresh contacts'})).toBeEnabled();
});
