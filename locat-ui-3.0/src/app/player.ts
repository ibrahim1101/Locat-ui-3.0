import { createContext, useContext } from "react";
import type { QueueView, TrackView } from "@/contracts/media";

/**
 * Presentation state for the persistent mini player. In production this is fed
 * by the existing Locat audio element + Web Audio EQ graph (MediaLocal.tsx).
 * Here it only moves a fixture playhead; no audio is decoded or played.
 */
export type PlayerCtx = {
  queue: QueueView; playing: boolean; position: number; current: TrackView | null;
  play(track: TrackView, list?: TrackView[]): void; toggle(): void; next(): void; prev(): void; seek(s: number): void;
  setShuffle(v: boolean): void; cycleRepeat(): void; close(): void;
};
export const PlayerContext = createContext<PlayerCtx | null>(null);

export function usePlayer() { const v = useContext(PlayerContext); if (!v) throw new Error("usePlayer outside provider"); return v; }
