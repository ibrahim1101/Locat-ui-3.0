import { createContext, useContext, useEffect, useLayoutEffect, useRef } from "react";
import type { BackController } from "@/contracts/platform";

export type BackCtx = BackController & { push(close: () => void): () => void };
export const BackContext = createContext<BackCtx | null>(null);

/** Parent route rules: detail → list. Anything else falls back to router history. */
export function parentRoute(path: string): string | null {
  const parts = path.split("/").filter(Boolean);
  if (parts.length > 1) return "/" + parts.slice(0, -1).join("/");
  return null;
}

export const useBack = () => useContext(BackContext);

/** Register an overlay so system Back / Escape closes it first. */
export function useBackLayer(open: boolean, close: () => void) {
  const ctx = useContext(BackContext);
  const closeRef = useRef(close);
  useLayoutEffect(() => { closeRef.current = close; });
  useEffect(() => {
    if (!open || !ctx) return;
    return ctx.push(() => closeRef.current());
  }, [open, ctx]);
}
