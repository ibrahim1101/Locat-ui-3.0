import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { LiveHomeContactSummary } from "./LiveHomeContactSummary";

const { accountRequest } = vi.hoisted(() => ({ accountRequest: vi.fn() }));
vi.mock("./accountRequest", () => ({ accountRequest }));
afterEach(() => vi.clearAllMocks());

it("shows server-owned accepted contact and incoming request counts", async () => {
  accountRequest.mockResolvedValue({ contacts: [
    { status: "accepted", direction: "incoming" },
    { status: "accepted", direction: "outgoing" },
    { status: "pending", direction: "incoming" },
    { status: "pending", direction: "outgoing" },
  ] });
  const open = vi.fn();
  render(<LiveHomeContactSummary accountId="account-a" onOpenMessages={open} />);
  expect(await screen.findByText("Accepted contacts")).toBeVisible();
  expect(screen.getByText("Incoming requests")).toBeVisible();
  expect(screen.getByText("2", { selector: "p" })).toBeVisible();
  expect(accountRequest).toHaveBeenCalledWith("/api/contacts", "account-a", undefined, expect.any(AbortSignal));
  fireEvent.click(screen.getByRole("button", { name: "Open Messages" }));
  expect(open).toHaveBeenCalledOnce();
});

it("offers an explicit retry after the server summary fails", async () => {
  accountRequest.mockRejectedValueOnce(new Error("Server unavailable")).mockResolvedValueOnce({ contacts: [] });
  render(<LiveHomeContactSummary accountId="account-a" onOpenMessages={vi.fn()} />);
  await screen.findByRole("alert");
  fireEvent.click(screen.getByRole("button", { name: "Retry" }));
  await waitFor(() => expect(screen.getByText("Accepted contacts")).toBeVisible());
  expect(accountRequest).toHaveBeenCalledTimes(2);
});
