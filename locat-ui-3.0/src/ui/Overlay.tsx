import { useEffect, useId, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { useBackLayer } from "@/app/back";
import { IconButton } from "./Button";
import { cn } from "./util";

/**
 * Adaptive overlay: bottom sheet on compact widths, centered dialog on medium+.
 * Registers with the Back stack (Android Back / Escape close it first),
 * traps initial focus and restores it on close.
 */
export function Sheet({ open, onClose, title, description, children, footer, size = "md", testId }: {
  open: boolean; onClose(): void; title: string; description?: ReactNode; children: ReactNode; footer?: ReactNode; size?: "sm" | "md" | "lg"; testId?: string;
}) {
  const id = useId();
  const panel = useRef<HTMLDivElement>(null);
  useBackLayer(open, onClose);
  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement as HTMLElement | null;
    const t = setTimeout(() => {
      const current = panel.current;
      if (!current || current.contains(document.activeElement)) return;
      const target = current.querySelector<HTMLElement>("[autofocus],input,textarea,button:not([data-close])");
      (target ?? current).focus();
    }, 30);
    return () => { clearTimeout(t); prev?.focus?.(); };
  }, [open]);
  if (!open) return null;
  return createPortal(
    <div className="fixed inset-0 z-40 flex items-end justify-center md:items-center md:p-6" data-testid={testId}>
      <div className="absolute inset-0 animate-fade bg-black/60 backdrop-blur-[2px]" onClick={onClose} aria-hidden />
      <div ref={panel} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby={id}
        className={cn("relative flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-3xl bg-s1 shadow-float outline-hidden animate-sheet-up md:animate-pop md:rounded-2xl",
          size === "sm" ? "md:max-w-md" : size === "lg" ? "md:max-w-3xl" : "md:max-w-xl")}>
        <div className="mx-auto mt-2.5 h-1 w-10 shrink-0 rounded-full bg-line-strong md:hidden" aria-hidden />
        <header className="flex shrink-0 items-start gap-3 px-5 pb-3 pt-3 md:pt-5">
          <div className="min-w-0 flex-1">
            <h2 id={id} className="text-lg font-bold tracking-tight">{title}</h2>
            {description && <p className="mt-1 text-sm text-ink-2">{description}</p>}
          </div>
          <IconButton data-close icon={X} label="Close" onClick={onClose} size="sm" />
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-5">{children}</div>
        {footer && <footer className="flex shrink-0 flex-wrap justify-end gap-2 border-t border-line px-5 pt-3" style={{ paddingBottom: "max(12px, env(safe-area-inset-bottom))" }}>{footer}</footer>}
      </div>
    </div>,
    document.body,
  );
}

/** Action sheet / context menu. Long-press on touch, right-click / Shift+F10 on desktop. */
export function ActionMenu({ open, onClose, title, actions }: { open: boolean; onClose(): void; title: string; actions: { id: string; label: string; icon?: React.ComponentType<{ className?: string }>; tone?: "danger"; disabledReason?: string; onSelect(): void }[] }) {
  return (
    <Sheet open={open} onClose={onClose} title={title} size="sm">
      <ul className="-mx-2 flex flex-col" role="menu">
        {actions.map((a) => {
          const I = a.icon;
          return (
            <li key={a.id} role="none">
              <button role="menuitem" disabled={!!a.disabledReason} onClick={() => { a.onSelect(); onClose(); }} data-testid={`action-${a.id}`}
                className={cn("flex min-h-[48px] w-full items-center gap-3 rounded-xl px-3 text-left text-[15px] font-medium hover:bg-s2 disabled:opacity-40 md:min-h-[42px] md:text-sm", a.tone === "danger" && "text-danger")}>
                {I && <I className="size-5 shrink-0 opacity-80" />}
                <span className="flex-1">{a.label}</span>
                {a.disabledReason && <span className="text-2xs text-ink-3">{a.disabledReason}</span>}
              </button>
            </li>
          );
        })}
      </ul>
    </Sheet>
  );
}
