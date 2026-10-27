import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, useLocation } from "react-router";
import { afterEach, expect, it, vi } from "vitest";
import Search from "./Search";

const { state, accountRequest } = vi.hoisted(() => ({
  state: { adapter: { mode: "server" }, user: { id: "account-a" } },
  accountRequest: vi.fn(),
}));

vi.mock("@/app/session", () => ({ useSession: () => state }));
vi.mock("@/integration/accountRequest", () => ({ accountRequest }));

afterEach(() => { vi.clearAllMocks(); state.adapter.mode = "server"; });
function LocationEcho(){const location=useLocation();return <output data-testid="current-location">{location.pathname+location.search}</output>; }

it("searches account-owned contacts in live mode without leaking preview messages or people", async () => {
  accountRequest.mockResolvedValue({ contacts: [{ status: "accepted", user: { id: "peer-1", displayName: "Morgan Vale", username: "morgan", lcCode: "LC-2345" } }] });
  render(<MemoryRouter><Search /></MemoryRouter>);
  fireEvent.change(screen.getByTestId("global-search-input"), { target: { value: "Mira" } });
  await waitFor(() => expect(screen.queryByText("Mira Okafor")).toBeNull());
  expect(screen.queryByText(/I can have that ready/)).toBeNull();

  fireEvent.change(screen.getByTestId("global-search-input"), { target: { value: "Morgan" } });
  expect(await screen.findByText("Morgan Vale")).toBeVisible();
  expect(accountRequest).toHaveBeenCalledWith("/api/contacts", "account-a", undefined, expect.any(AbortSignal));
});

it("keeps clearly fictional search results in preview mode", async () => {
  state.adapter.mode = "preview";
  render(<MemoryRouter><Search /></MemoryRouter>);
  fireEvent.change(screen.getByTestId("global-search-input"), { target: { value: "Mira" } });
  expect(await screen.findByText("Mira Okafor")).toBeVisible();
  expect(screen.getByText(/Preview search uses fictional content/)).toBeVisible();
  expect(accountRequest).not.toHaveBeenCalled();
});

it("shows an honest empty result when the live account has no contacts", async () => {
  accountRequest.mockResolvedValue({ contacts: [] });
  render(<MemoryRouter><Search /></MemoryRouter>);
  fireEvent.change(screen.getByTestId("global-search-input"), { target: { value: "Mira" } });
  expect(await screen.findByText('No results for "Mira"')).toBeVisible();
  expect(screen.queryByText("Loading your contacts…")).toBeNull();
});


it("finds real active Workspace notes through the scoped server search",async()=>{
 accountRequest.mockImplementation(async(path:string)=>path==="/api/contacts"?{contacts:[]}:{results:[{id:"item-a",workspaceId:"workspace-a",workspaceName:"Release team",type:"task",title:"Prepare launch",snippet:"Confirm migration plan",updatedAt:1},{id:"event-a",workspaceId:"workspace-a",workspaceName:"Release team",type:"calendar",title:"Launch review",snippet:"Discuss launch",startsAt:1800000000000,updatedAt:1800000000000}]});
 render(<MemoryRouter><Search /><LocationEcho /></MemoryRouter>);fireEvent.change(screen.getByTestId("global-search-input"),{target:{value:"launch"}});expect(await screen.findByText("Prepare launch")).toBeVisible();expect(screen.getByText(/Release team · task · Confirm migration plan/)).toBeVisible();expect(screen.getByText("Launch review")).toBeVisible();await waitFor(()=>expect(accountRequest).toHaveBeenCalledWith("/api/search","account-a",{q:"launch"},expect.any(AbortSignal)));fireEvent.click(screen.getByTestId("result-item-a"));expect(screen.getByTestId("current-location")).toHaveTextContent("/workspace?workspace=workspace-a&item=item-a");fireEvent.click(screen.getByTestId("result-event-a"));expect(screen.getByTestId("current-location")).toHaveTextContent("/calendar?event=event-a&at=1800000000000&workspace=workspace-a");
});
