/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  PREVIEW FIXTURES — fictional, non-sensitive demo data for visual review only.
 *  Never imported by production entrypoints. No real users, credentials,
 *  secrets or server data. Secrets fixtures contain titles only, never values.
 * ─────────────────────────────────────────────────────────────────────────────
 */
import type {
  AdminUserView, ContactView, ConversationView, DeviceView, MessageView,
  ScheduledMessageView, SecretEntryView, SessionUserView, TransferView, VaultEntryView, SavedAccountView,
} from "@/contracts";

const now = Date.now();
const min = 60_000, hr = 60 * min, day = 24 * hr;

export const FIXTURE_USER: SessionUserView = {
  id: "u-self", username: "demo.rowan", displayName: "Rowan (demo)", lcCode: "LC-0420", isAdmin: true,
  serverOrigin: "https://locat.home.example",
};
export const FIXTURE_ACCOUNTS: SavedAccountView[] = [
  { id: "u-self", username: "demo.rowan", displayName: "Rowan (demo)", serverOrigin: "https://locat.home.example", lastUsedAt: now - hr },
  { id: "u-alt", username: "demo.work", displayName: "Rowan · Studio", serverOrigin: "https://studio.example", lastUsedAt: now - 3 * day },
];

const c = (id: string, displayName: string, username: string, code: string, state: ContactView["presence"]["state"], relation: ContactView["relation"], bio?: string): ContactView =>
  ({ id, displayName, username, lcCode: code, presence: { state, lastSeenAt: now - 40 * min }, relation, bio });

export const FIXTURE_CONTACTS: ContactView[] = [
  c("u-mira", "Mira Okafor", "mira", "LC-1187", "online", "friend", "Sound engineer. Coffee first."),
  c("u-jun", "Jun Park", "junp", "LC-3302", "offline", "friend", "Building things on weekends."),
  c("u-ines", "Inès Laurent", "ines", "LC-2045", "hidden", "friend"),
  c("u-tom", "Tomás Reyes", "tomas", "LC-5531", "offline", "incoming", "Photographer"),
  c("u-ada", "Ada Whitlock", "ada.w", "LC-7710", "offline", "outgoing"),
  c("u-nox", "Nox Bot", "nox", "LC-9001", "offline", "blocked"),
];

export const FIXTURE_CONVERSATIONS: ConversationView[] = [
  { id: "c-mira", kind: "direct", title: "Mira Okafor", peer: FIXTURE_CONTACTS[0], lastPreview: "Sending the stems tonight 🎧", lastAt: now - 4 * min, unread: 2, muted: false, pinned: true, hidden: false, typing: ["Mira"], state: "active" },
  { id: "c-studio", kind: "group", title: "Studio Night", memberCount: 5, lastPreview: "Jun: Voice message · 0:14", lastAt: now - 38 * min, unread: 0, muted: false, pinned: false, hidden: false, state: "active" },
  { id: "c-jun", kind: "direct", title: "Jun Park", peer: FIXTURE_CONTACTS[1], lastPreview: "📍 Location", lastAt: now - 3 * hr, unread: 0, muted: true, pinned: false, hidden: false, state: "active" },
  { id: "c-family", kind: "group", title: "Family", memberCount: 4, lastPreview: "Group key rotation required", lastAt: now - day, unread: 0, muted: false, pinned: false, hidden: false, state: "key-rotation-required" },
  { id: "c-ines", kind: "direct", title: "Inès Laurent", peer: FIXTURE_CONTACTS[2], lastPreview: "Photo", lastAt: now - 2 * day, unread: 0, muted: false, pinned: false, hidden: false, state: "active" },
  { id: "c-old", kind: "group", title: "Trip 2025", memberCount: 7, lastPreview: "You left the group", lastAt: now - 40 * day, unread: 0, muted: false, pinned: false, hidden: false, state: "archived-former-member" },
  { id: "c-nox", kind: "direct", title: "Nox Bot", peer: FIXTURE_CONTACTS[5], lastPreview: "Blocked", lastAt: now - 60 * day, unread: 0, muted: false, pinned: false, hidden: false, state: "blocked" },
  { id: "c-secret", kind: "direct", title: "Surprise planning", lastPreview: "Hidden on this device", lastAt: now - 5 * day, unread: 0, muted: false, pinned: false, hidden: true, state: "active" },
];

const m = (id: string, conv: string, mine: boolean, text: string | undefined, ago: number, extra: Partial<MessageView> = {}): MessageView => ({
  id, conversationId: conv, authorId: mine ? "u-self" : "u-mira", authorName: mine ? "You" : "Mira", mine, text, createdAt: now - ago, delivery: mine ? "read" : "delivered", ...extra,
});

export const FIXTURE_MESSAGES: MessageView[] = [
  m("m1", "c-mira", false, "Did the mix survive the export?", 3 * hr),
  m("m2", "c-mira", true, "Mostly. The low end is a bit muddy in the mix, checking the export now.", 3 * hr - 4 * min),
  m("m3", "c-mira", false, undefined, 2 * hr, { attachment: { kind: "image", name: "console-wide.jpg", size: 2_480_000, width: 4032, height: 3024, original: true } }),
  m("m4", "c-mira", true, "That console is gorgeous", 2 * hr - min, { reactions: [{ emoji: "🔥", count: 1, mine: false }], replyTo: { id: "m3", authorName: "Mira", excerpt: "Photo · console-wide.jpg", state: "ok" } }),
  m("m5", "c-mira", false, undefined, 90 * min, { attachment: { kind: "voice", name: "Voice message.webm", size: 48_000, mime: "audio/webm", durationSec: 23, waveform: [3, 6, 9, 5, 8, 12, 7, 4, 9, 11, 6, 3, 7, 10, 5, 8, 4, 6, 9, 3] } }),
  m("m6", "c-mira", true, undefined, 80 * min, { attachment: { kind: "file", name: "Mix_notes_final_FINAL_v7_really-final-version-for-review.pdf", size: 812_000, mime: "application/pdf" }, delivery: "delivered" }),
  m("m7", "c-mira", false, "This message was deleted", 70 * min, { deletedForEveryone: true, text: undefined }),
  m("m8", "c-mira", true, "Moving the session to Thursday, works for you?", 30 * min, { editedAt: now - 28 * min, pinned: true, delivery: "read" }),
  m("m9", "c-mira", false, "Sending the stems tonight 🎧", 4 * min, { forwarded: false }),
  m("m10", "c-mira", true, "Perfect. I'll be offline on the train, it'll queue.", 2 * min, { delivery: "queued-offline" }),
  m("m11", "c-mira", true, "Retry test — this one failed", 60_000, { delivery: "failed" }),
  m("g1", "c-studio", false, "Jun added Ada to the group", 2 * hr, { system: "Jun added Ada" }),
  m("g2", "c-studio", false, undefined, 38 * min, { authorName: "Jun", authorId: "u-jun", attachment: { kind: "voice", name: "Voice message.webm", size: 31_000, mime: "audio/webm", durationSec: 14, waveform: [4, 8, 6, 9, 3, 7, 10, 5, 6, 8, 4, 7] } }),
  m("j1", "c-jun", false, undefined, 3 * hr, { authorName: "Jun", authorId: "u-jun", attachment: { kind: "location", lat: 52.52, lng: 13.405, accuracyM: 25, label: "Shared once, explicitly" } }),
];

export const FIXTURE_SCHEDULED: ScheduledMessageView[] = [
  { id: "s1", conversationId: "c-mira", conversationTitle: "Mira Okafor", excerpt: "Happy birthday! 🎂", sendAt: now + 2 * day, state: "pending" },
  { id: "s2", conversationId: "c-studio", conversationTitle: "Studio Night", excerpt: "Reminder: bring the interface", sendAt: now + 5 * hr, state: "pending" },
  { id: "s3", conversationId: "c-jun", conversationTitle: "Jun Park", excerpt: "Done?", sendAt: now - day, state: "failed" },
];

export const FIXTURE_DEVICES: DeviceView[] = [
  { id: "d1", alias: "Rowan's Pixel", platform: "android", current: true, state: "paired", online: true },
  { id: "d2", alias: "Studio Desktop", platform: "windows", current: false, state: "paired", online: true, lastSeenAt: now - 2 * min },
  { id: "d3", alias: "ThinkPad", platform: "linux", current: false, state: "needs-reproof", online: false, lastSeenAt: now - 6 * day },
  { id: "d4", alias: "New device request", platform: "macos", current: false, state: "pending-approval", online: true, sas: "4821 · 0937" },
];
export const FIXTURE_TRANSFERS: TransferView[] = [
  { id: "x1", kind: "file", name: "Studio_Session_04_stems.zip", sizeBytes: 1_240_000_000, direction: "sent", peer: "Studio Desktop", progress: 0.62, state: "transferring", at: now - min },
  { id: "x2", kind: "url", name: "https://example.org/reference-track", direction: "received", peer: "Studio Desktop", progress: 1, state: "complete", at: now - hr },
  { id: "x3", kind: "file", name: "invoice-march.pdf", sizeBytes: 220_000, direction: "received", peer: "ThinkPad", progress: 0.3, state: "failed", at: now - day, error: "Device went offline" },
  { id: "x4", kind: "clipboard", name: "Clipboard text (42 chars)", direction: "sent", peer: "Studio Desktop", progress: 1, state: "complete", at: now - 2 * day },
];

export const FIXTURE_VAULT: VaultEntryView[] = [
  { id: "f1", name: "passport-scan.pdf", folder: "Documents", sizeBytes: 1_420_000, mime: "application/pdf", updatedAt: now - 3 * day },
  { id: "f2", name: "lease-agreement-2026.pdf", folder: "Documents", sizeBytes: 880_000, mime: "application/pdf", updatedAt: now - 12 * day },
  { id: "f3", name: "recovery-sheet.png", folder: "Keys", sizeBytes: 310_000, mime: "image/png", updatedAt: now - 30 * day },
];
/** Titles only. No password or note values exist anywhere in fixtures. */
export const FIXTURE_SECRETS: SecretEntryView[] = [
  { id: "sec1", kind: "credential", title: "Home router", folder: "Network", username: "admin", url: "https://192.168.1.1", updatedAt: now - 9 * day },
  { id: "sec2", kind: "credential", title: "Example Mail", folder: "Personal", username: "rowan@example.com", url: "https://mail.example.com", updatedAt: now - 2 * day },
  { id: "sec3", kind: "note", title: "Wi-Fi guest note", folder: "Network", updatedAt: now - 40 * day },
];

export const FIXTURE_ADMIN_USERS: AdminUserView[] = [
  { id: "u-self", username: "demo.rowan", lcCode: "LC-0420", role: "admin", disabled: false, sessions: 3, createdAt: now - 200 * day },
  { id: "u-mira", username: "mira", lcCode: "LC-1187", role: "user", disabled: false, sessions: 2, createdAt: now - 150 * day },
  { id: "u-jun", username: "junp", lcCode: "LC-3302", role: "user", disabled: false, sessions: 1, createdAt: now - 90 * day },
  { id: "u-nox", username: "nox", lcCode: "LC-9001", role: "user", disabled: true, sessions: 0, createdAt: now - 60 * day },
];
