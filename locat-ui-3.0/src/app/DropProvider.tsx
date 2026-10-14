import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { FileUp, Ban } from "lucide-react";
import { useReport } from "./feedback";
import { DropContext, triageFiles, type DropTarget } from "./drop";
import { cn, formatBytes } from "@/ui/util";

/** App-wide drag-and-drop presentation. Shows where files will go before the user drops them. */
export function DropProvider({ children }: { children: ReactNode }) {
  const [stack, setStack] = useState<DropTarget[]>([]);
  const stackRef = useRef(stack);
  useLayoutEffect(() => { stackRef.current = stack; }, [stack]);
  const [dragging, setDragging] = useState(false);
  const depth = useRef(0);
  const report = useReport();
  useEffect(() => {
    const hasFiles = (e: DragEvent) => !!e.dataTransfer?.types.includes("Files");
    const enter = (e: DragEvent) => { if (!hasFiles(e)) return; e.preventDefault(); depth.current++; setDragging(true); };
    const over = (e: DragEvent) => { if (!hasFiles(e)) return; e.preventDefault(); if (e.dataTransfer) e.dataTransfer.dropEffect = stackRef.current.length ? "copy" : "none"; };
    const leave = (e: DragEvent) => { if (!hasFiles(e)) return; depth.current = Math.max(0, depth.current - 1); if (!depth.current) setDragging(false); };
    const drop = async (e: DragEvent) => {
      if (!hasFiles(e)) return; e.preventDefault(); depth.current = 0; setDragging(false);
      const t = stackRef.current[stackRef.current.length - 1]; const files = [...(e.dataTransfer?.files ?? [])];
      if (!t || !files.length) return;
      const { ok, rejected } = triageFiles(files, t);
      if (rejected.length) report({ status: "error", code: "rejected", message: `${rejected.length} file${rejected.length > 1 ? "s" : ""} skipped: ${rejected[0].file.name} is ${rejected[0].reason}` }, "");
      if (ok.length) report(await t.onDrop(ok), `${ok.length} file${ok.length > 1 ? "s" : ""} added`);
    };
    addEventListener("dragenter", enter); addEventListener("dragover", over); addEventListener("dragleave", leave); addEventListener("drop", drop);
    return () => { removeEventListener("dragenter", enter); removeEventListener("dragover", over); removeEventListener("dragleave", leave); removeEventListener("drop", drop); };
  }, [report]);
  const api = useMemo(() => ({ register: (t: DropTarget) => { setStack((s) => [...s, t]); return () => setStack((s) => s.filter((x) => x !== t)); } }), []);
  const t = stack[stack.length - 1];
  return (
    <DropContext.Provider value={api}>
      {children}
      {dragging && createPortal(
        <div className="pointer-events-none fixed inset-0 z-50 grid animate-fade place-items-center bg-canvas/70 p-6 backdrop-blur-sm" data-testid="drop-overlay">
          <div className={cn("flex w-full max-w-md flex-col items-center rounded-3xl border-2 border-dashed p-10 text-center", t ? "border-ember bg-ember/10" : "border-line-strong bg-s1")}>
            {t ? <FileUp className="mb-3 size-10 text-ember" /> : <Ban className="mb-3 size-10 text-ink-3" />}
            <p className="text-lg font-bold">{t ? t.label : "Files can't be dropped here"}</p>
            <p className="mt-1 text-sm text-ink-2">{t ? t.detail ?? (t.maxBytes ? `Up to ${formatBytes(t.maxBytes)} per file` : "") : "Open a conversation, Vault or Devices to drop files."}</p>
          </div>
        </div>, document.body)}
    </DropContext.Provider>
  );
}
