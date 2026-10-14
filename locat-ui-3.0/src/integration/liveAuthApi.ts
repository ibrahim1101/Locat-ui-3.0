import type { OperationResult } from "../contracts/common";

export type AuthenticatedAccount = { id: string; username: string; displayName: string };

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    credentials: "same-origin",
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  const data: unknown = await response.json();
  if (!response.ok) {
    const error = data as { error?: string };
    throw new Error(error.error ?? "Request failed");
  }
  return data as T;
}

function result(error: unknown): OperationResult {
  return { status: "error", code: "AUTH_REQUEST_FAILED", message: error instanceof Error ? error.message : "Authentication failed" };
}

/** API client for a same-origin Locat 3.0 development server. No fixture login. */
export const liveAuthApi = {
  async register(input: { username: string; displayName: string; password: string }): Promise<OperationResult> {
    try {
      await request("/api/auth/register", { method: "POST", body: JSON.stringify(input) });
      return { status: "ok", value: undefined };
    } catch (error) { return result(error); }
  },
  async signIn(input: { username: string; password: string }): Promise<OperationResult> {
    try {
      await request("/api/auth/login", { method: "POST", body: JSON.stringify(input) });
      return { status: "ok", value: undefined };
    } catch (error) { return result(error); }
  },
  async currentAccount(): Promise<AuthenticatedAccount | null> {
    try {
      const data = await request<{ user: AuthenticatedAccount }>("/api/auth/me");
      return data.user;
    } catch { return null; }
  },
  async signOut(): Promise<OperationResult> {
    try {
      await request("/api/auth/logout", { method: "POST" });
      return { status: "ok", value: undefined };
    } catch (error) { return result(error); }
  },
};
