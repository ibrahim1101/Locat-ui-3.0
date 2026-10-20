import { webcrypto } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AppLockError, changePasscode, currentState, markLocked, markUnlocked, removeLock, setPasscode, shouldAutoLock, updatePolicy, verifyPasscode, type AppLockStorage } from "./appLock";

function memoryStorage(): AppLockStorage {
  const values = new Map<string, string>();
  return { getItem: key => values.get(key) ?? null, setItem: (key, value) => { values.set(key, value); }, removeItem: key => { values.delete(key); } };
}

describe("device app lock", () => {
  let storage: AppLockStorage;
  let session: AppLockStorage;
  beforeEach(() => { vi.stubGlobal("crypto", webcrypto); storage = memoryStorage(); session = memoryStorage(); });
  afterEach(() => vi.unstubAllGlobals());

  it("stores a salted verifier and unlocks only for the matching passcode", async () => {
    await setPasscode("correct horse battery", {}, storage);
    const record = storage.getItem("locat-app-lock-v1")!;
    expect(record).not.toContain("correct horse battery");
    expect(await verifyPasscode("wrong passphrase", storage)).toBe(false);
    expect(await verifyPasscode("correct horse battery", storage)).toBe(true);
  });

  it("validates current credentials for passcode changes and lock removal", async () => {
    await setPasscode("initial passphrase", {}, storage);
    await expect(changePasscode("wrong passcode", "replacement passphrase", storage)).rejects.toBeInstanceOf(AppLockError);
    await expect(removeLock("wrong passcode", storage, session)).rejects.toBeInstanceOf(AppLockError);
    expect(currentState(storage, session).configured).toBe(true);
    await changePasscode("initial passphrase", "replacement passphrase", storage);
    expect(await verifyPasscode("replacement passphrase", storage)).toBe(true);
    await removeLock("replacement passphrase", storage, session);
    expect(currentState(storage, session)).toEqual({ configured: false, unlocked: true, config: null });
  });

  it("locks on inactivity and background according to saved device policy", async () => {
    await setPasscode("long device passphrase", { autoLockOption: "1m", lockOnBackground: true }, storage);
    markUnlocked(session);
    const first = Number(session.getItem("locat-app-lock-last-activity"));
    expect(shouldAutoLock(first + 30_000, storage, session)).toBe(false);
    expect(shouldAutoLock(first + 60_000, storage, session)).toBe(true);
    updatePolicy({ autoLockOption: "never", lockOnBackground: false }, storage);
    expect(shouldAutoLock(first + 24 * 60 * 60_000, storage, session)).toBe(false);
    markLocked(session);
    expect(currentState(storage, session).unlocked).toBe(false);
  });
});
