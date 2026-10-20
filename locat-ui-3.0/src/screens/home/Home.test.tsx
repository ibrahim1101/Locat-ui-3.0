import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { afterEach, expect, it, vi } from "vitest";
import Home from "./Home";

const { state, navigate } = vi.hoisted(() => ({
  state: {
    user: { displayName: "Alice" },
    connection: { mode: "server", server: "connected", origin: "https://locat.test" },
    availability: () => ({ availability: "available", reason: "" }),
    adapter: { mode: "server" },
  },
  navigate: vi.fn(),
}));

vi.mock("@/app/session", () => ({ useSession: () => state }));
vi.mock("react-router", async (importOriginal) => ({
  ...(await importOriginal<typeof import("react-router")>()),
  useNavigate: () => navigate,
}));

afterEach(() => { vi.clearAllMocks(); });

it("does not present preview conversations or devices as live account data", () => {
  render(<MemoryRouter><Home /></MemoryRouter>);
  expect(screen.getByText(/Recent conversations will appear here/)).toBeVisible();
  expect(screen.queryByText("Preview sample data")).toBeNull();
  expect(screen.queryByTestId("home-unread-c-mira")).toBeNull();
  expect(screen.queryByText("Studio Desktop")).toBeNull();
  expect(screen.getByText("Manage paired devices")).toBeVisible();
});

it("labels fixture rows as preview data in preview mode", () => {
  state.adapter.mode = "preview";
  try {
    render(<MemoryRouter><Home /></MemoryRouter>);
    expect(screen.getByText("Preview sample data")).toBeVisible();
    expect(screen.getByTestId("home-unread-c-mira")).toBeVisible();
  } finally {
    state.adapter.mode = "server";
  }
});
