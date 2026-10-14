import type { ComposerCapabilities, ConversationView } from "@/contracts/messaging";
import { can, cannot } from "@/contracts/common";

/**
 * Presentation port of Locat `messageComposerState` (src/lib/controlStates.ts,
 * docs/CONTROL-STATES.md). In production the live adapter supplies these
 * capabilities directly; this mapping exists only for fixtures.
 */
export function composerCapabilities(c: ConversationView, opts: { hiddenView: boolean; online: boolean }): ComposerCapabilities {
  const future = cannot("Planned — not yet available", "planned");
  const base: ComposerCapabilities = {
    text: can(), image: can(), file: can(), voice: can(), location: can(), gif: can(),
    schedule: opts.online ? can() : cannot("Scheduling needs your server"), video: cannot("Encrypted video sharing (#47) is not implemented yet", "planned"),
  };
  if (opts.hiddenView) return { ...base, replacedBy: "You're viewing hidden messages. Return to regular messages to send." };
  if (c.state === "archived-former-member") return { ...base, replacedBy: "You're no longer a member of this group. History stays on this device." };
  if (c.state === "key-rotation-required") return { ...base, replacedBy: "Sending is paused until the group owner rotates the group key." };
  if (c.state === "blocked") {
    const r = cannot("Unblock this contact to send messages", "locked");
    return { ...base, text: r, image: r, file: r, voice: r, location: r, gif: r, schedule: r };
  }
  void future;
  return base;
}

export const LIMITS = { maxPayloadBytes: 2.9 * 1024 * 1024, voiceMaxSec: 60 } as const;
