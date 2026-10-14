/** Live API access for ciphertext envelopes. No plaintext messaging API exists. */
export type CiphertextEnvelope = {
  id: string;
  sequence: number;
  senderId: string;
  recipientId: string;
  ciphertext: string;
  nonce: string;
  algorithm: "client-e2ee-v1";
  createdAt: number;
};
export type DirectoryUser = { id: string; username: string; displayName: string };
async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, { ...init, credentials: "same-origin", headers: { "Content-Type": "application/json", ...init?.headers } });
  const data = await response.json();
  if (!response.ok) throw new Error(typeof data.error === "string" ? data.error : "Request failed");
  return data as T;
}
export const liveMessagingApi = {
  findExactUsername: (username: string) =>
    api<{ users: DirectoryUser[] }>("/api/users/search?q=" + encodeURIComponent(username)),
  inbox: (after = 0) =>
    api<{ messages: CiphertextEnvelope[]; nextCursor: number }>("/api/messages?after=" + encodeURIComponent(after)),
  sendEncrypted: (input: Pick<CiphertextEnvelope, "recipientId" | "ciphertext" | "nonce" | "algorithm">) =>
    api<{ id: string; sequence: number }>("/api/messages", { method: "POST", body: JSON.stringify(input) }),
};
