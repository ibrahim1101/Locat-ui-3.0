import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LiveAccountSettings } from "./LiveAccountSettings";
const { signOut } = vi.hoisted(() => ({ signOut: vi.fn() }));
vi.mock("../app/session", () => ({ useSession: () => ({ user: { displayName: "Alice" }, prefs: { theme: "obsidian" }, setPrefs: vi.fn(), adapter: { auth: { signOut } } }) }));
afterEach(() => { vi.unstubAllGlobals(); vi.clearAllMocks(); });
describe("live account settings", () => {
  it("renders server sessions and revokes another session", async () => {
    const fetch = vi.fn().mockResolvedValueOnce({ ok: true, json: async () => ({ sessions: [{ id: "one", expiresAt: Date.now(), current: true }, { id: "two", expiresAt: Date.now(), current: false }] }) }).mockResolvedValueOnce({ ok: true, json: async () => ({ ok: true }) });
    vi.stubGlobal("fetch", fetch);
    render(<LiveAccountSettings />);
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
  it("clears password fields and signs out after a successful change", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce({ ok: true, json: async () => ({ sessions: [] }) }).mockResolvedValueOnce({ ok: true, json: async () => ({ ok: true }) }));
    render(<LiveAccountSettings />);
    const current = screen.getByLabelText("Current password");
    const next = screen.getByLabelText("New password");
    fireEvent.change(current, { target: { value: "old-password-long" } });
    fireEvent.change(next, { target: { value: "new-password-long" } });
    fireEvent.click(screen.getByRole("button", { name: "Change password" }));
    await waitFor(() => expect(signOut).toHaveBeenCalledOnce());
    expect(current).toHaveValue(""); expect(next).toHaveValue("");
  });
});

it('stages other-session sign-out and submits only after password confirmation',async()=>{
 const sessions=[{id:'current',expiresAt:Date.now()+60000,current:true},{id:'other',expiresAt:Date.now()+60000,current:false}],fetch=vi.fn().mockResolvedValueOnce({ok:true,json:async()=>({sessions})}).mockResolvedValueOnce({ok:true,json:async()=>({ok:true,revokedCount:1})});vi.stubGlobal('fetch',fetch);render(<LiveAccountSettings/>);const open=await screen.findByRole('button',{name:'Sign out other sessions'});await waitFor(()=>expect(open).not.toBeDisabled());fireEvent.click(open);expect(fetch).toHaveBeenCalledOnce();const confirm=screen.getByRole('button',{name:'Confirm other-session sign-out'});expect(confirm).toHaveAttribute('type','submit');fireEvent.change(screen.getByLabelText('Password to confirm sign-out'),{target:{value:'synthetic-current-password'}});fireEvent.click(confirm);await screen.findByText('Signed out 1 other Locat session.');expect(fetch.mock.calls[1][0]).toBe('/api/auth/sessions/revoke-others');expect(JSON.parse(fetch.mock.calls[1][1].body)).toEqual({currentPassword:'synthetic-current-password'});expect(screen.queryByRole('button',{name:'Revoke'})).toBeNull();expect(screen.getByText(/This session/)).toBeVisible();expect(signOut).not.toHaveBeenCalled();
});
it('keeps the session list and clears the confirmation password when bulk sign-out fails',async()=>{
 const sessions=[{id:'current',expiresAt:Date.now()+60000,current:true},{id:'other',expiresAt:Date.now()+60000,current:false}];vi.stubGlobal('fetch',vi.fn().mockResolvedValueOnce({ok:true,json:async()=>({sessions})}).mockResolvedValueOnce({ok:false,json:async()=>({error:'Invalid credentials'})}));render(<LiveAccountSettings/>);const open=await screen.findByRole('button',{name:'Sign out other sessions'});await waitFor(()=>expect(open).not.toBeDisabled());fireEvent.click(open);const password=screen.getByLabelText('Password to confirm sign-out');fireEvent.change(password,{target:{value:'wrong-password'}});fireEvent.click(screen.getByRole('button',{name:'Confirm other-session sign-out'}));await screen.findAllByText('Invalid credentials');await waitFor(()=>expect(password).toHaveValue(''));expect(screen.getByRole('button',{name:'Revoke'})).toBeVisible();expect(screen.queryByText(/Signed out 1/)).toBeNull();expect(signOut).not.toHaveBeenCalled();
});
