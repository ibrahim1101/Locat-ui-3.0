import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useBackLayer } from "@/app/back";
import { ActionMenu } from "./Overlay";
import { Kbd } from "./Feedback";
import { ContextMenuContext, placeMenu, type MenuOpenArgs } from "./ContextMenu";
import { cn } from "./util";

function CursorMenu({ args, onClose }: { args: MenuOpenArgs; onClose(): void }) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ left: args.x, top: args.y });
  const [active, setActive] = useState(() => args.items.findIndex((i) => !i.disabledReason));
  const typed = useRef({ s: "", t: 0 });
  useBackLayer(true, onClose);
  useLayoutEffect(() => { const el = ref.current; if (el) setPos(placeMenu(args.x, args.y, el.offsetWidth, el.offsetHeight, innerWidth, innerHeight)); el?.focus(); }, [args]);
  useEffect(() => {
    const down = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) onClose(); };
    const prev = document.activeElement as HTMLElement | null;
    addEventListener("mousedown", down, true); addEventListener("blur", onClose); addEventListener("resize", onClose);
    return () => { removeEventListener("mousedown", down, true); removeEventListener("blur-sm", onClose); removeEventListener("resize", onClose); prev?.focus?.(); };
  }, [onClose]);
  const move = (d: number) => { const n = args.items.length; let i = active; for (let k = 0; k < n; k++) { i = (i + d + n) % n; if (!args.items[i].disabledReason) break; } setActive(i); };
  const choose = (i: number) => { const it = args.items[i]; if (!it || it.disabledReason) return; onClose(); it.onSelect(); };
  return (
    <div ref={ref} role="menu" aria-label={args.title} tabIndex={-1} data-testid="context-menu" style={pos}
      onKeyDown={(e) => {
        if (e.key === "ArrowDown") { e.preventDefault(); move(1); } else if (e.key === "ArrowUp") { e.preventDefault(); move(-1); }
        else if (e.key === "Home") { e.preventDefault(); setActive(args.items.findIndex((i) => !i.disabledReason)); }
        else if (e.key === "End") { e.preventDefault(); setActive(args.items.length - 1 - [...args.items].reverse().findIndex((i) => !i.disabledReason)); }
        else if (e.key === "Enter" || e.key === " ") { e.preventDefault(); choose(active); }
        else if (e.key === "Tab") { e.preventDefault(); onClose(); }
        else if (e.key.length === 1) { const now = Date.now(); typed.current = { s: (now - typed.current.t < 600 ? typed.current.s : "") + e.key.toLowerCase(), t: now }; const i = args.items.findIndex((it) => !it.disabledReason && it.label.toLowerCase().startsWith(typed.current.s)); if (i >= 0) setActive(i); }
      }}
      className="fixed z-50 min-w-[220px] max-w-[320px] animate-pop rounded-xl bg-s2/95 p-1 shadow-float outline-hidden backdrop-blur-xl">
      {args.items.map((it, i) => { const I = it.icon; return (
        <div key={it.id}>
          {it.separatorBefore && <div className="mx-2 my-1 h-px bg-line" role="separator" />}
          <button role="menuitem" tabIndex={-1} aria-disabled={!!it.disabledReason || undefined} title={it.disabledReason} onMouseEnter={() => setActive(i)} onClick={() => choose(i)} data-testid={`ctx-${it.id}`}
            className={cn("flex h-8 w-full items-center gap-2.5 rounded-lg px-2.5 text-left text-[13px] font-medium", i === active && !it.disabledReason && "bg-s3", it.tone === "danger" && "text-danger", it.disabledReason && "opacity-40")}>
            {I ? <I className="size-4 shrink-0 opacity-80" /> : <span className="size-4" />}
            <span className="flex-1 truncate">{it.label}</span>
            {it.disabledReason ? <span className="max-w-[120px] truncate text-2xs text-ink-3">{it.disabledReason}</span> : it.shortcut && <Kbd>{it.shortcut}</Kbd>}
          </button>
        </div>); })}
    </div>
  );
}

/**
 * One context-menu system for the whole app: cursor-anchored popover for mouse/
 * keyboard on medium+ widths, bottom ActionMenu sheet for touch / phones.
 */
export function ContextMenuProvider({ children }: { children: ReactNode }) {
  const [args, setArgs] = useState<MenuOpenArgs | null>(null);
  const close = useCallback(() => setArgs(null), []);
  const api = useMemo(() => ({ open: setArgs }), []);
  const sheet = !!args && (args.pointer === "touch" || innerWidth < 768);
  return (
    <ContextMenuContext.Provider value={api}>
      {children}
      {args && !sheet && createPortal(<CursorMenu args={args} onClose={close} />, document.body)}
      <ActionMenu open={sheet} onClose={close} title={args?.title ?? ""} actions={args?.items ?? []} />
    </ContextMenuContext.Provider>
  );
}
