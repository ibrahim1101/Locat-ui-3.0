import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LiveAccountSettings } from "./LiveAccountSettings";
const {signOut,session}=vi.hoisted(()=>({signOut:vi.fn(),session:{user:{id:'a'.repeat(32),displayName:'Alice'},prefs:{theme:'obsidian'},setPrefs:vi.fn(),adapter:{auth:{signOut:vi.fn()}}}}));
session.adapter.auth.signOut=signOut;
vi.mock('../app/session',()=>({useSession:()=>session}));
afterEach(() => { vi.unstubAllGlobals(); vi.clearAllMocks(); });
describe("live account settings", () => {
  it("renders server sessions and revokes another session", async () => {
    const fetch = vi.fn().mockResolvedValueOnce({ ok: true, json: async () => ({ sessions: [{ id: "one", expiresAt: Date.now(), current: true }, { id: "two", expiresAt: Date.now(), current: false }] }) }).mockResolvedValueOnce({ ok: true, json: async () => ({ ok: true }) });
    vi.stubGlobal("fetch", fetch);
    render(<LiveAccountSettings />);
    fireEvent.click(screen.getByRole("button", { name: /Sessions/ }));
    fireEvent.click(await screen.findByRole("button", { name: "Revoke" }));
    await screen.findByText("Session revoked.");
    expect(fetch.mock.calls[1][0]).toBe("/api/auth/sessions/revoke");
    expect(fetch.mock.calls[1][1].body).toBe(JSON.stringify({ id: "two" }));
    expect(screen.queryByRole("button", { name: "Revoke" })).toBeNull();
  });
  it("reports failed profile saves without displaying success", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce({ ok: true, json: async () => ({ sessions: [] }) }).mockResolvedValueOnce({ ok: false, json: async () => ({ error: "Not authenticated" }) }));
    render(<LiveAccountSettings />);
    fireEvent.click(screen.getByRole("button", { name: "Save profile" }));
    await screen.findByText("Not authenticated");
    expect(screen.queryByText(/Display name saved/)).toBeNull();
  });
  it("saves read receipt and typing consent as account preferences", async () => {
    const fetch=vi.fn().mockResolvedValueOnce({ok:true,json:async()=>({sessions:[]})}).mockResolvedValueOnce({ok:true,json:async()=>({preferences:{sendReadReceipts:true}})}).mockResolvedValueOnce({ok:true,json:async()=>({preferences:{typingIndicators:true}})});vi.stubGlobal('fetch',fetch);render(<LiveAccountSettings/>);fireEvent.click(screen.getByRole('button',{name:/Messaging privacy/}));const receipt=screen.getByRole('switch',{name:'Send read receipts'});expect(receipt).not.toBeChecked();fireEvent.click(receipt);await screen.findByText('Read receipt preference saved.');expect(fetch.mock.calls[1][0]).toBe('/api/preferences');expect(JSON.parse(fetch.mock.calls[1][1].body)).toEqual({sendReadReceipts:true});expect(session.setPrefs).toHaveBeenCalledWith({sendReadReceipts:true});const typing=screen.getByRole('switch',{name:'Typing indicators'});expect(typing).not.toBeDisabled();fireEvent.click(typing);await screen.findByText('Typing indicator preference saved.');expect(fetch.mock.calls[2][0]).toBe('/api/preferences');expect(JSON.parse(fetch.mock.calls[2][1].body)).toEqual({typingIndicators:true});expect(session.setPrefs).toHaveBeenCalledWith({typingIndicators:true});
  });
  it("clears password fields and signs out after a successful change", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce({ ok: true, json: async () => ({ sessions: [] }) }).mockResolvedValueOnce({ ok: true, json: async () => ({ ok: true }) }));
    render(<LiveAccountSettings />);
    fireEvent.click(screen.getByRole("button", { name: /Security/ }));
    const current = screen.getByLabelText("Current password");
    const next = screen.getByLabelText("New password");
    fireEvent.change(current, { target: { value: "old-password-long" } });
    fireEvent.change(next, { target: { value: "new-password-long" } });
    fireEvent.click(screen.getByRole("button", { name: "Change password" }));
    await waitFor(() => expect(signOut).toHaveBeenCalledOnce());
    expect(current).toHaveValue(""); expect(next).toHaveValue("");
  });
  it('keeps authority-signature details nested and labels the key unverified by this client',async()=>{
    const original=session.user,keyId='identity-fingerprint-123',writeText=vi.fn().mockResolvedValue(undefined);session.user={id:'a'.repeat(32),displayName:'Alice',globalIdentity:{serverId:'server-a',authority:'locat.test',address:'LC-1234@locat.test',accountUri:'locat://locat.test/account/'+ 'a'.repeat(32),attestation:{kind:'locat.account.v1',version:1,serverId:'server-a',origin:'https://locat.test',accountId:'a'.repeat(32),lcCode:'1234',keyId,publicKey:'public',signature:'signature'}}} as typeof session.user;
    vi.stubGlobal('fetch',vi.fn().mockResolvedValueOnce({ok:true,json:async()=>({sessions:[]})}));Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText}});
    try{render(<LiveAccountSettings/>);expect(screen.getByText('LC-1234@locat.test')).toBeVisible();const disclosure=screen.getByText(/Authority signing details/).closest('details');expect(disclosure).not.toHaveAttribute('open');fireEvent.click(screen.getByText(/Authority signing details/));expect(await screen.findByText(/This client has not verified the signature or domain ownership/)).toBeVisible();expect(screen.getByText((_,element)=>element?.tagName==='P'&&element.textContent?.includes(keyId)===true)).toBeVisible();fireEvent.click(screen.getByRole('button',{name:'Copy signing-key fingerprint'}));await waitFor(()=>expect(writeText).toHaveBeenCalledWith(keyId));}finally{session.user=original;}
  });
});

it('stages other-session sign-out and submits only after password confirmation',async()=>{
 const sessions=[{id:'current',expiresAt:Date.now()+60000,current:true},{id:'other',expiresAt:Date.now()+60000,current:false}],fetch=vi.fn().mockResolvedValueOnce({ok:true,json:async()=>({sessions})}).mockResolvedValueOnce({ok:true,json:async()=>({ok:true,revokedCount:1})});vi.stubGlobal('fetch',fetch);render(<LiveAccountSettings/>);fireEvent.click(screen.getByRole('button',{name:/Sessions/}));const open=await screen.findByRole('button',{name:'Sign out others'});await waitFor(()=>expect(open).not.toBeDisabled());fireEvent.click(open);expect(fetch).toHaveBeenCalledOnce();const confirm=screen.getByRole('button',{name:'Confirm other-session sign-out'});expect(confirm).toHaveAttribute('type','submit');fireEvent.change(screen.getByLabelText('Password to confirm sign-out'),{target:{value:'synthetic-current-password'}});fireEvent.click(confirm);await screen.findByText('Signed out 1 other Locat session.');expect(fetch.mock.calls[1][0]).toBe('/api/auth/sessions/revoke-others');expect(JSON.parse(fetch.mock.calls[1][1].body)).toEqual({currentPassword:'synthetic-current-password'});expect(screen.queryByRole('button',{name:'Revoke'})).toBeNull();expect(screen.getByText(/This session/)).toBeVisible();expect(signOut).not.toHaveBeenCalled();
});
it('keeps the session list and clears the confirmation password when bulk sign-out fails',async()=>{
 const sessions=[{id:'current',expiresAt:Date.now()+60000,current:true},{id:'other',expiresAt:Date.now()+60000,current:false}];vi.stubGlobal('fetch',vi.fn().mockResolvedValueOnce({ok:true,json:async()=>({sessions})}).mockResolvedValueOnce({ok:false,json:async()=>({error:'Invalid credentials'})}));render(<LiveAccountSettings/>);fireEvent.click(screen.getByRole('button',{name:/Sessions/}));const open=await screen.findByRole('button',{name:'Sign out others'});await waitFor(()=>expect(open).not.toBeDisabled());fireEvent.click(open);const password=screen.getByLabelText('Password to confirm sign-out');fireEvent.change(password,{target:{value:'wrong-password'}});fireEvent.click(screen.getByRole('button',{name:'Confirm other-session sign-out'}));await screen.findAllByText('Invalid credentials');await waitFor(()=>expect(password).toHaveValue(''));expect(screen.getByRole('button',{name:'Revoke'})).toBeVisible();expect(screen.queryByText(/Signed out 1/)).toBeNull();expect(signOut).not.toHaveBeenCalled();
});

it('discards account drafts and prevents a late password response from signing out the new account',async()=>{
 let finish!:(value:unknown)=>void;let pendingSignal:AbortSignal|null|undefined;
 const fetch=vi.fn(async(path:string,options?:RequestInit)=>path==='/api/auth/password'?(pendingSignal=options?.signal,new Promise(resolve=>{finish=resolve;})):{ok:true,json:async()=>({sessions:[]})});vi.stubGlobal('fetch',fetch);
 const view=render(<LiveAccountSettings/>);fireEvent.change(screen.getByLabelText('Display name'),{target:{value:'Old account draft'}});fireEvent.click(screen.getByRole('button',{name:/Security/}));fireEvent.change(screen.getByLabelText('Current password'),{target:{value:'synthetic-current-password'}});fireEvent.change(screen.getByLabelText('New password'),{target:{value:'synthetic-replacement-password'}});fireEvent.click(screen.getByRole('button',{name:'Change password'}));await waitFor(()=>expect(finish).toBeTypeOf('function'));expect(screen.getByLabelText('Current password')).toHaveValue('');expect(screen.getByLabelText('New password')).toHaveValue('');const original=session.user;
 try{session.user={id:'b'.repeat(32),displayName:'Bob'};view.rerender(<LiveAccountSettings/>);expect(pendingSignal?.aborted).toBe(true);expect(screen.getByLabelText('Display name')).toHaveValue('Bob');fireEvent.click(screen.getByRole('button',{name:/Security/}));expect(screen.getByLabelText('Current password')).toHaveValue('');expect(screen.getByLabelText('New password')).toHaveValue('');await act(async()=>{finish({ok:true,json:async()=>({ok:true})});});await waitFor(()=>expect(fetch.mock.calls.filter(([path])=>path==='/api/auth/sessions')).toHaveLength(2));await Promise.resolve();expect(signOut).not.toHaveBeenCalled();}finally{session.user=original;}
});

it('clears password entries after a rejected password change and never signs out',async()=>{
 vi.stubGlobal('fetch',vi.fn(async(path:string)=>path==='/api/auth/password'?{ok:false,json:async()=>({error:'Password verification failed'})}:{ok:true,json:async()=>({sessions:[]})}));render(<LiveAccountSettings/>);fireEvent.click(screen.getByRole('button',{name:/Security/}));fireEvent.change(screen.getByLabelText('Current password'),{target:{value:'wrong-current-password'}});fireEvent.change(screen.getByLabelText('New password'),{target:{value:'synthetic-replacement-password'}});fireEvent.click(screen.getByRole('button',{name:'Change password'}));await screen.findByText('Password verification failed');expect(screen.getByLabelText('Current password')).toHaveValue('');expect(screen.getByLabelText('New password')).toHaveValue('');expect(signOut).not.toHaveBeenCalled();
});

it('does not apply a late theme preference to a different account',async()=>{
 let finish!:(value:unknown)=>void;vi.stubGlobal('fetch',vi.fn(async(path:string)=>path==='/api/preferences'?new Promise(resolve=>{finish=resolve;}):{ok:true,json:async()=>({sessions:[]})}));const view=render(<LiveAccountSettings/>);fireEvent.change(screen.getByRole('combobox',{name:'Theme'}),{target:{value:'graphite'}});await waitFor(()=>expect(finish).toBeTypeOf('function'));const original=session.user;
 try{session.user={id:'b'.repeat(32),displayName:'Bob'};view.rerender(<LiveAccountSettings/>);await act(async()=>{finish({ok:true,json:async()=>({preferences:{theme:'graphite'}})});});expect(session.setPrefs).not.toHaveBeenCalled();expect(screen.queryByText('Theme saved.')).toBeNull();}finally{session.user=original;}
});
