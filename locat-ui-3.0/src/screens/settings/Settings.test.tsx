import { render, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router";
import Settings from "./Settings";

vi.mock("@/app/session", () => ({
  useSession: () => ({ user: null, prefs: { theme: "obsidian-ember", textScale: "default", motion: "system", startup: "home", density: "comfortable", sendReadReceipts: false, typingIndicators: false, largeConversation: false }, setPrefs: vi.fn(), setStage: vi.fn(), adapter: { mode: "live", auth: { savedAccounts: () => [] } }, platform: { kind: "browser" }, connection: { origin: null } }),
  useViewport: () => ({ compact: true }),
}));
vi.mock("@/app/feedback", () => ({ useReport: () => vi.fn() }));

it("shows notifications as unavailable instead of presenting local-only mock switches", () => {
  render(<MemoryRouter initialEntries={["/settings/notifications"]}><Settings /></MemoryRouter>);
  expect(screen.getByText("Message notifications")).toBeVisible();
  expect(screen.getByText("Locat does not currently send operating-system notifications.")).toBeVisible();
  expect(screen.getByText(/Push delivery while the app is closed is not available/)).toBeVisible();
  expect(screen.queryByRole("switch")).toBeNull();
});
