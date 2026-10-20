import type { Capability, Id, OperationResult, Timestamp } from "./common";

export type Presence = { state: "online" | "offline" | "hidden"; lastSeenAt?: Timestamp };
export type Visibility = "everyone" | "contacts" | "nobody";

export type ContactView = {
  id: Id; username: string; displayName: string; lcCode: string; avatarUrl?: string; bio?: string;
  presence: Presence; relation: "friend" | "incoming" | "outgoing" | "none" | "blocked";
};

export type ConversationView = {
  id: Id; kind: "direct" | "group"; title: string; avatarUrl?: string; peer?: ContactView;
  memberCount?: number; lastPreview?: string; lastAt?: Timestamp; unread: number;
  muted: boolean; pinned: boolean; hidden: boolean; typing?: string[];
  state: "active" | "blocked" | "archived-former-member" | "key-rotation-required";
};

export type DeliveryState = "queued-offline" | "sending" | "sent" | "delivered" | "read" | "failed" | "scheduled" | "preview-local";

export type AttachmentView =
  | { kind: "image"; name: string; size: number; width?: number; height?: number; previewUrl?: string; original: boolean }
  | { kind: "file"; name: string; size: number; mime: string }
  | { kind: "video"; name: string; size: number; state: "unsupported-in-messaging" | "ready"; mime?: string; previewUrl?: string }
  | { kind: "voice"; name: string; size: number; mime: string; durationSec: number; waveform?: number[]; previewUrl?: string }
  | { kind: "gif"; name: string; previewUrl?: string }
  | { kind: "location"; lat: number; lng: number; accuracyM?: number; label?: string };

export type MessageView = {
  id: Id; conversationId: Id; authorId: Id; authorName: string; mine: boolean;
  text?: string; attachment?: AttachmentView; createdAt: Timestamp; editedAt?: Timestamp;
  replyTo?: { id: Id; authorName: string; excerpt: string; state: "ok" | "deleted" | "hidden" | "missing" };
  forwarded?: boolean; pinned?: boolean; reactions?: { emoji: string; count: number; mine: boolean }[];
  delivery: DeliveryState; deletedForEveryone?: boolean; hidden?: boolean;
  system?: string; // membership changes etc.
};

/** Mirrors Locat `messageComposerState` (src/lib/controlStates.ts) output. */
export type ComposerCapabilities = {
  text: Capability; image: Capability; file: Capability; voice: Capability; location: Capability;
  gif: Capability; schedule: Capability; video: Capability;
  /** When set the composer is replaced by an explanation (hidden view, former member, key rotation). */
  replacedBy?: string;
};

export type AttachmentConstraints = { maxPayloadBytes: number; voiceMaxSec: number };
export type ComposerDraft = { text: string; replyToId?: Id; editingId?: Id };

export type MessageAction = "reply" | "forward" | "pin" | "unpin" | "edit" | "react" | "copy" | "hide" | "restore" | "delete-self" | "delete-everyone" | "retry" | "info";

export interface MessagingAdapter {
  /** Hands draft to Locat Chat.tsx encrypt → outbox pipeline. UI never sends plaintext. */
  send(conversationId: Id, draft: ComposerDraft): Promise<OperationResult>;
  /** Drag-and-drop / picker: hands raw Files to Locat's encrypted attachment pipeline (2.9 MB payload limit). */
  attachFiles(conversationId: Id, files: File[]): Promise<OperationResult>;
  schedule(conversationId: Id, draft: ComposerDraft, sendAt: Timestamp): Promise<OperationResult>;
  cancelScheduled(id: Id): Promise<OperationResult>;
  messageAction(messageId: Id, action: MessageAction, arg?: string): Promise<OperationResult>;
  /** Encrypted draft persistence is owned by src/lib/encryptedDraft.ts. */
  saveDraft(conversationId: Id, draft: ComposerDraft): void;
  friendAction(contactId: Id, action: "request" | "accept" | "reject" | "cancel" | "remove" | "block" | "unblock"): Promise<OperationResult>;
  findByUsernameOrCode(query: string): Promise<OperationResult<ContactView[]>>;
  conversationAction(conversationId: Id, action: "mute" | "unmute" | "pin" | "unpin" | "hide" | "unhide" | "leave"): Promise<OperationResult>;
  createGroup(title: string, memberIds: Id[]): Promise<OperationResult>;
  shareLocation(conversationId: Id, source: "current" | "manual", coords?: { lat: number; lng: number }): Promise<OperationResult>;
}

export type ScheduledMessageView = { id: Id; conversationId: Id; conversationTitle: string; excerpt: string; sendAt: Timestamp; state: "pending" | "released" | "failed" | "cancelled" };
