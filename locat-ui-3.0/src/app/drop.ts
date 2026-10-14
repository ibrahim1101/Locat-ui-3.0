import { createContext, useContext, useEffect, useLayoutEffect, useRef } from "react";
import type { OperationResult } from "@/contracts/common";
import { formatBytes } from "@/ui/util";

/** A screen-registered drop target. Presentation only: `onDrop` hands Files to a typed adapter callback. */
export type DropTarget = { id: string; label: string; detail?: string; maxBytes?: number; accept?: (f: File) => boolean; onDrop(files: File[]): Promise<OperationResult> };
export const DropContext = createContext<{ register(t: DropTarget): () => void } | null>(null);

/** Split dropped files into accepted / rejected with reasons. Pure, unit-tested. */
export function triageFiles(files: File[], t: Pick<DropTarget, "maxBytes" | "accept">) {
  const ok: File[] = [], rejected: { file: File; reason: string }[] = [];
  for (const f of files) {
    if (t.accept && !t.accept(f)) rejected.push({ file: f, reason: "type not accepted here" });
    else if (t.maxBytes && f.size > t.maxBytes) rejected.push({ file: f, reason: `over ${formatBytes(t.maxBytes)}` });
    else ok.push(f);
  }
  return { ok, rejected };
}

/** Register the current screen as the drop destination while mounted (pass null to opt out). */
export function useDropTarget(t: DropTarget | null) {
  const ctx = useContext(DropContext);
  const ref = useRef(t);
  useLayoutEffect(() => { ref.current = t; });
  const id = t?.id; const label = t?.label; const detail = t?.detail; const maxBytes = t?.maxBytes;
  useEffect(() => {
    if (!ctx || !id) return;
    return ctx.register({ id, label: label ?? "", detail, maxBytes, accept: (f) => ref.current?.accept?.(f) ?? true, onDrop: (f) => ref.current!.onDrop(f) });
  }, [ctx, id, label, detail, maxBytes]);
}
