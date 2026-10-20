import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter, useLocation } from "react-router";
import { afterEach, expect, it, vi } from "vitest";
import { LiveOverview } from "./LiveOverview";

const { accountRequest } = vi.hoisted(() => ({ accountRequest: vi.fn() }));
vi.mock("../app/session", () => ({ useSession: () => ({
  user: { id: "account-live", displayName: "Synthetic browser account" },
  availability: () => ({ availability: "available", reason: "" }),
}) }));
vi.mock("./accountRequest", () => ({ accountRequest }));

function CurrentLocation() {
  const location = useLocation();
  return <output data-testid="current-location">{location.pathname}{location.search}</output>;
}

afterEach(() => vi.clearAllMocks());

it("shows truthful live Home state and opens the server-backed Requests section", async () => {
  accountRequest.mockResolvedValue({ contacts: [{ status: "pending", direction: "incoming", user: { id: "requester", displayName: "Synthetic requester" } }] });
  render(<MemoryRouter initialEntries={["/home"]}><LiveOverview kind="home" /><CurrentLocation /></MemoryRouter>);
  expect(screen.getByRole("heading", { name: "Welcome, Synthetic browser account" })).toBeVisible();
  expect(screen.getByRole("region", { name: "Recent conversations" })).toHaveTextContent("not connected to this dashboard yet");
  expect(screen.queryByText("Mira Okafor")).toBeNull();
  expect(screen.queryByText("Studio Desktop")).toBeNull();
  expect(await screen.findByText("Incoming requests")).toBeVisible();
  fireEvent.click(screen.getByRole("button", { name: "Review requests" }));
  expect(screen.getByTestId("current-location")).toHaveTextContent("/messages?section=requests");
});
