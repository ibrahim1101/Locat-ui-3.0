/**
 * PREVIEW STRESS FIXTURES — deterministic, fictional, generated on demand to
 * exercise virtualization (Preview lab → "Large libraries"). Never imported by
 * production paths; no real data.
 */
import type { MessageView } from "@/contracts";

const WORDS = "signal mix session coast titanium ember studio night stems reel export master tape room quiet glass copper wire north light".split(" ");
const rnd = (seed: number) => { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32); };
const phrase = (r: () => number, n: number) => Array.from({ length: n }, () => WORDS[Math.floor(r() * WORDS.length)]).join(" ");
const now = Date.now();

export function makeMessages(conversationId: string, n: number): MessageView[] {
  const r = rnd(7);
  return Array.from({ length: n }, (_, i) => {
    const mine = r() > 0.5;
    return { id: `${conversationId}-L${i}`, conversationId, authorId: mine ? "u-self" : "u-mira", authorName: mine ? "You" : "Mira", mine,
      text: phrase(r, 2 + Math.floor(r() * (r() > 0.9 ? 60 : 14))), createdAt: now - (n - i) * 90_000, delivery: mine ? "read" : "delivered" };
  });
}
export const LARGE = { messages: 5000 } as const;
