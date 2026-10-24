import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { LiveHomeConversations } from "./LiveHomeConversations";

const { accountRequest, owner } = vi.hoisted(() => ({ accountRequest: vi.fn(), owner: { handle: null as null | { accountId: string; closed: boolean; recentConversations: ReturnType<typeof vi.fn> } } }));
vi.mock("./accountRequest", () => ({ accountRequest }));
vi.mock("./matrixOwnerContext", () => ({ useMatrixOwner: () => owner }));

const accountId = "a".repeat(32);
afterEach(() => { accountRequest.mockReset(); owner.handle = null; });

it("keeps live conversation summaries unavailable until this account's messaging session is active", () => {
  render(<LiveHomeConversations accountId={accountId} onOpen={vi.fn()} />);
  expect(screen.getByText(/Keep messaging active in Settings/)).toBeVisible();
  expect(accountRequest).not.toHaveBeenCalled();
});

it("shows locally decrypted summaries for current accepted contacts and opens the selected chat", async () => {
  const open = vi.fn();
  owner.handle = { accountId, closed: false, recentConversations: vi.fn().mockResolvedValue([
    { accountId: "b".repeat(32), preview: "Decrypted hello", updatedAt: 1_798_000_000_000 },
    { accountId: "c".repeat(32), preview: "Removed contact", updatedAt: 1_798_000_001_000 },
  ]) };
  accountRequest.mockResolvedValue({ contacts: [
    { status: "accepted", user: { id: "b".repeat(32), displayName: "Bob" } },
    { status: "pending", user: { id: "c".repeat(32), displayName: "Cara" } },
  ] });
  render(<LiveHomeConversations accountId={accountId} onOpen={open} />);
  const row = await screen.findByTestId(`home-conversation-${"b".repeat(32)}`);
  expect(row).toHaveTextContent("Bob");
  expect(row).toHaveTextContent("Decrypted hello");
  expect(screen.queryByText("Cara")).toBeNull();
  fireEvent.click(row);
  expect(open).toHaveBeenCalledWith("b".repeat(32));
  expect(owner.handle.recentConversations).toHaveBeenCalledOnce();
});

it("hides stale account sessions and offers retry after a summary failure", async () => {
  const open = vi.fn();
  owner.handle = { accountId: "d".repeat(32), closed: false, recentConversations: vi.fn() };
  const { rerender } = render(<LiveHomeConversations accountId={accountId} onOpen={open} />);
  expect(screen.getByText(/Keep messaging active in Settings/)).toBeVisible();
  owner.handle = { accountId, closed: false, recentConversations: vi.fn().mockRejectedValue(new Error("Sync unavailable")) };
  accountRequest.mockResolvedValue({ contacts: [] });
  rerender(<LiveHomeConversations accountId={accountId} onOpen={open} />);
  expect(await screen.findByRole("alert")).toHaveTextContent("Sync unavailable");
  fireEvent.click(screen.getByRole("button", { name: "Retry summaries" }));
  expect(owner.handle.recentConversations).toHaveBeenCalledTimes(2);
});
