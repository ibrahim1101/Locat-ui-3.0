import { webcrypto } from "node:crypto";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { LiveAppLockGate } from "./LiveAppLockGate";
import { LiveAppLockSettings } from "./LiveAppLockSettings";

beforeEach(() => { localStorage.clear(); sessionStorage.clear(); vi.stubGlobal("crypto", webcrypto); });
afterEach(() => { vi.unstubAllGlobals(); localStorage.clear(); sessionStorage.clear(); });

it("sets a device passcode, locks the nested app UI, and unlocks after verification", async () => {
  render(<><LiveAppLockSettings/><LiveAppLockGate><p>Private account content</p></LiveAppLockGate></>);
  expect(screen.getByText("Private account content")).toBeVisible();
  fireEvent.click(screen.getByRole("button", { name: "Set a device passcode" }));
  fireEvent.change(screen.getByLabelText("New device passcode"), { target: { value: "private-device-passphrase" } });
  fireEvent.change(screen.getByLabelText("Confirm device passcode"), { target: { value: "private-device-passphrase" } });
  fireEvent.click(screen.getByRole("button", { name: "Save passcode" }));
  await screen.findByText("App lock enabled on this device.");
  expect(screen.getByText("Private account content")).toBeVisible();
  fireEvent.click(screen.getByRole("button", { name: "Lock now" }));
  await screen.findByRole("dialog", { name: "Locat is locked" });
  expect(screen.queryByText("Private account content")).toBeNull();
  fireEvent.change(screen.getByLabelText("Device passcode"), { target: { value: "private-device-passphrase" } });
  fireEvent.click(screen.getByRole("button", { name: "Unlock Locat" }));
  await waitFor(() => expect(screen.getByText("Private account content")).toBeVisible(), { timeout: 5_000 });
});
