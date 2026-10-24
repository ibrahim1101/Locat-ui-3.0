import { expect, it, vi } from "vitest";
import type { MatrixClient, MatrixEvent } from "matrix-js-sdk";
import { projectRecentConversationSummaries } from "./matrixConversationSummaries";

const own = "@alice:matrix.test";
const peer = "@bob:matrix.test";
const peerAccount = "b".repeat(32);

function event({ sender = peer, body = "hello", ts = 10, shouldDecrypt = false, redacted = false }: { sender?: string; body?: string; ts?: number; shouldDecrypt?: boolean; redacted?: boolean } = {}) {
  let needsDecrypt = shouldDecrypt;
  return {
    getWireType: () => "m.room.encrypted",
    getId: () => "$event",
    getSender: () => sender,
    isDecryptionFailure: () => false,
    isRedacted: () => redacted,
    getType: () => "m.room.message",
    getContent: () => ({ msgtype: "m.text", body }),
    getTs: () => ts,
    isBeingDecrypted: () => false,
    getDecryptionPromise: () => null,
    shouldAttemptDecryption: () => needsDecrypt,
    markDecrypted: () => { needsDecrypt = false; },
  } as unknown as MatrixEvent & { markDecrypted(): void };
}

function room(peerId: string, events: MatrixEvent[], members = [own, peerId]) {
  return {
    getMembers: () => members.map(userId => ({ userId, membership: "join" })),
    getMyMembership: () => "join",
    getMember: (userId: string) => ({ membership: members.includes(userId) ? "join" : null }),
    currentState: { getStateEvents: () => ({ getContent: () => ({ algorithm: "m.megolm.v1.aes-sha2" }) }) },
    getLiveTimeline: () => ({ getEvents: () => events }),
  };
}

it("projects only authorized two-person encrypted rooms and decrypted local message previews", async () => {
  const newest = event({ body: "latest   private message", ts: 30, shouldDecrypt: true });
  const older = event({ body: "older", ts: 10 });
  const invalidTimestamp = event({ ts: 8_640_000_000_000_001, redacted: true });
  const group = room("@carol:matrix.test", [event({ body: "group secret", ts: 99 })], [own, peer, "@carol:matrix.test"]);
  const rooms = new Map([
    ["!direct:matrix.test", room(peer, [older, newest, invalidTimestamp])],
    ["!group:matrix.test", group],
  ]);
  const decrypt = vi.fn(async (value: MatrixEvent) => { (value as MatrixEvent & { markDecrypted(): void }).markDecrypted(); });
  const client = { getUserId: () => own, getRoom: (id: string) => rooms.get(id), decryptEventIfNeeded: decrypt } as unknown as MatrixClient;
  const summaries = await projectRecentConversationSummaries(client, [
    { accountId: peerAccount, roomId: "!direct:matrix.test", matrixUserId: peer },
    { accountId: "c".repeat(32), roomId: "!group:matrix.test", matrixUserId: "@carol:matrix.test" },
    { accountId: "d".repeat(32), roomId: "!foreign:matrix.test", matrixUserId: "@dave:matrix.test" },
  ]);
  expect(decrypt).toHaveBeenCalledOnce();
  expect(summaries).toEqual([{ accountId: peerAccount, preview: "latest private message", updatedAt: 30 }]);
});

it("rejects malformed or caller-extended authorized room records", async () => {
  const client = { getUserId: () => own, getRoom: vi.fn() } as unknown as MatrixClient;
  await expect(projectRecentConversationSummaries(client, [{ accountId: peerAccount, roomId: "!room:matrix.test", matrixUserId: peer, preview: "forged" }])).rejects.toThrow("authorized conversation list is invalid");
  await expect(projectRecentConversationSummaries(client, [null])).rejects.toThrow("authorized conversation list is invalid");
  expect(client.getRoom).not.toHaveBeenCalled();
});
