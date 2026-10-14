import { useMemo, useState, type ReactNode } from "react";
import type { QueueView } from "@/contracts/media";
import { FIXTURE_TRACKS } from "@/fixtures/data";
import { PlayerContext, type PlayerCtx } from "./player";

export function PlayerProvider({ children }: { children: ReactNode }) {
  const [queue, setQueue] = useState<QueueView>({ tracks: [], index: 0, shuffle: false, repeat: "off" });
  const [playing, setPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const current = queue.tracks[queue.index] ?? null;

  const value = useMemo<PlayerCtx>(() => ({
    queue, playing, position, current,
    play: (track, list = FIXTURE_TRACKS) => { setQueue((q) => ({ ...q, tracks: list, index: Math.max(0, list.findIndex((t) => t.id === track.id)) })); setPosition(0); setPlaying(true); },
    toggle: () => setPlaying((p) => !p),
    next: () => { setQueue((q) => ({ ...q, index: (q.index + 1) % Math.max(1, q.tracks.length) })); setPosition(0); },
    prev: () => { if (position > 3) setPosition(0); else setQueue((q) => ({ ...q, index: (q.index - 1 + q.tracks.length) % Math.max(1, q.tracks.length) })); },
    seek: setPosition,
    setShuffle: (v) => setQueue((q) => ({ ...q, shuffle: v })),
    cycleRepeat: () => setQueue((q) => ({ ...q, repeat: q.repeat === "off" ? "all" : q.repeat === "all" ? "one" : "off" })),
    close: () => { setPlaying(false); setQueue((q) => ({ ...q, tracks: [] })); },
  }), [queue, playing, position, current]);
  return <PlayerContext.Provider value={value}>{children}</PlayerContext.Provider>;
}
