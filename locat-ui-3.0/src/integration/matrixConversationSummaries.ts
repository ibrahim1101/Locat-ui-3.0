import type { MatrixClient, MatrixEvent } from "matrix-js-sdk";

export type AuthorizedConversation = { accountId: string; roomId: string; matrixUserId: string };
export type RecentConversationSummary = { accountId: string; preview: string; updatedAt: number };

const accountIdPattern = /^[a-f0-9]{32}$/;
const matrixUserPattern = /^@[^\s:]{1,255}:[^\s]{1,255}$/;
const roomIdPattern = /^![^\s/]{1,510}$/;

function validateRows(value: unknown): AuthorizedConversation[] {
  if (!Array.isArray(value) || value.length > 100) throw new Error("The authorized conversation list is invalid.");
  return value.map(row => {
    if (!row || typeof row !== "object" || Array.isArray(row)) throw new Error("The authorized conversation list is invalid.");
    const item = row as Record<string, unknown>;
    if (Object.keys(item).some(key => !["accountId", "roomId", "matrixUserId"].includes(key))
      || typeof item.accountId !== "string" || !accountIdPattern.test(item.accountId)
      || typeof item.roomId !== "string" || !roomIdPattern.test(item.roomId)
      || typeof item.matrixUserId !== "string" || !matrixUserPattern.test(item.matrixUserId)) {
      throw new Error("The authorized conversation list is invalid.");
    }
    return { accountId: item.accountId, roomId: item.roomId, matrixUserId: item.matrixUserId };
  });
}

function preview(event: MatrixEvent) {
  if (event.getWireType() !== "m.room.encrypted" || !event.getId()?.startsWith("$") || event.isDecryptionFailure()) return null;
  const updatedAt = event.getTs();
  if (!Number.isSafeInteger(updatedAt) || updatedAt < 0 || updatedAt > 8_640_000_000_000_000) return null;
  if (event.isRedacted()) return { preview: "Message removed", updatedAt };
  if (event.getType() !== "m.room.message") return null;
  const content = event.getContent();
  if (content.msgtype === "m.text" && typeof content.body === "string" && new TextEncoder().encode(content.body).length <= 16_384) {
    const text = content.body.replace(/\s+/g, " ").trim();
    return text ? { preview: text.slice(0, 120), updatedAt } : null;
  }
  if (content.msgtype === "m.audio") return { preview: "Voice message", updatedAt };
  if (content.msgtype === "m.image") return { preview: "Photo", updatedAt };
  if (content.msgtype === "m.video") return { preview: "Video", updatedAt };
  if (content.msgtype === "m.file") return { preview: "File attachment", updatedAt };
  return null;
}

/** Builds a local summary only from the server-authorized one-to-one room map and decrypted SDK events. */
export async function projectRecentConversationSummaries(client: MatrixClient, input: unknown): Promise<RecentConversationSummary[]> {
  const ownUserId = client.getUserId();
  if (!ownUserId) throw new Error("The active messaging identity is unavailable.");
  const rows = validateRows(input);
  const summaries: RecentConversationSummary[] = [];
  for (const row of rows) {
    const room = client.getRoom(row.roomId);
    const members = room?.getMembers().filter(member => ["join", "invite"].includes(member.membership ?? "")) ?? [];
    const encrypted = room?.currentState.getStateEvents("m.room.encryption", "")?.getContent()?.algorithm === "m.megolm.v1.aes-sha2";
    if (!room || !encrypted || room.getMyMembership() !== "join" || room.getMember(row.matrixUserId)?.membership !== "join"
      || members.length !== 2 || members.some(member => ![ownUserId, row.matrixUserId].includes(member.userId))) continue;
    const timeline = room.getLiveTimeline().getEvents().slice(-50);
    let summary: ReturnType<typeof preview> = null;
    for (const event of [...timeline].reverse()) {
      if (event.getWireType() !== "m.room.encrypted" || ![ownUserId, row.matrixUserId].includes(event.getSender() ?? "")) continue;
      try {
        if (event.isBeingDecrypted()) await (event.getDecryptionPromise() ?? Promise.resolve());
        else if (event.shouldAttemptDecryption()) await client.decryptEventIfNeeded(event);
      } catch {
        continue;
      }
      summary = preview(event);
      if (summary) break;
    }
    if (summary) summaries.push({ accountId: row.accountId, ...summary });
  }
  return summaries.sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 4);
}
