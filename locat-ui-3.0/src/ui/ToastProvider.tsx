import { useCallback, useMemo, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { CheckCircle2, CircleAlert, FlaskConical, Info, TriangleAlert, X } from "lucide-react";
import { ToastContext, type ToastItem } from "./Toast";
import { cn } from "./util";

const ICON = { ok: CheckCircle2, danger: CircleAlert, warn: TriangleAlert, neutral: Info, pending: FlaskConical };
const TONE = { ok: "text-ok", danger: "text-danger", warn: "text-warn", neutral: "text-ink-2", pending: "text-planned" };

/** Toast host. Mounted once at the root, above navigation and sheets. */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const seq = useRef(0);
  const dismiss = (id: number) => setItems((l) => l.filter((t) => t.id !== id));
  const show = useCallback((t: Omit<ToastItem, "id">) => {
    const id = ++seq.current;
    setItems((l) => [...l.slice(-2), { ...t, id }]);
    setTimeout(() => dismiss(id), t.tone === "pending" ? 5200 : 3400);
  }, []);
  const api = useMemo(() => ({ show }), [show]);
  return (
    <ToastContext.Provider value={api}>
      {children}
      {createPortal(
        <div aria-live="polite" className="pointer-events-none fixed inset-x-0 z-50 flex flex-col items-center gap-2 px-4 md:items-end md:right-6 md:left-auto" style={{ bottom: "calc(env(safe-area-inset-bottom) + 88px)" }}>
          {items.map((t) => {
            const I = ICON[t.tone];
            return (
              <div key={t.id} role="status" data-testid="toast" className="pointer-events-auto flex w-full max-w-sm animate-rise items-start gap-3 rounded-xl bg-s3/95 p-3 pr-2 shadow-float backdrop-blur-sm">
                <I className={cn("mt-0.5 size-5 shrink-0", TONE[t.tone])} aria-hidden />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold">{t.title}</p>
                  {t.body && <p className="mt-0.5 text-xs text-ink-2">{t.body}</p>}
                </div>
                <button aria-label="Dismiss" onClick={() => dismiss(t.id)} className="grid size-8 place-items-center rounded-lg text-ink-3 hover:bg-s2 hover:text-ink"><X className="size-4" /></button>
              </div>
            );
          })}
        </div>,
        document.body,
      )}
    </ToastContext.Provider>
  );
}
