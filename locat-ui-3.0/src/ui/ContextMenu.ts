import { createContext, useContext, useMemo } from "react";
import type { LucideIcon } from "lucide-react";

export type MenuItem = { id: string; label: string; icon?: LucideIcon; tone?: "danger"; disabledReason?: string; shortcut?: string; separatorBefore?: boolean; onSelect(): void };
export type MenuOpenArgs = { x: number; y: number; title: string; items: MenuItem[]; pointer: "mouse" | "touch" | "keyboard" };
export const ContextMenuContext = createContext<{ open(args: MenuOpenArgs): void }>({ open: () => undefined });

/** Clamp a menu box inside the viewport, flipping left/up near edges. Pure, unit-tested. */
export function placeMenu(x: number, y: number, w: number, h: number, vw: number, vh: number, margin = 8) {
  const left = x + w + margin > vw ? Math.max(margin, x - w) : x;
  const top = y + h + margin > vh ? Math.max(margin, y - h) : y;
  return { left: Math.min(left, vw - w - margin), top: Math.min(top, vh - h - margin) };
}

/** Returns a handler for onContextMenu (mouse/Shift+F10) plus `fromElement` for keyboard and long-press triggers. */
export function useContextMenu() {
  const { open } = useContext(ContextMenuContext);
  return useMemo(() => ({
    openAt: (x: number, y: number, title: string, items: MenuItem[], pointer: "mouse" | "touch" | "keyboard" = "mouse") => open({ x, y, title, items, pointer }),
    onContextMenu: (title: string, items: MenuItem[]) => (e: React.MouseEvent) => { e.preventDefault(); const kb = e.clientX === 0 && e.clientY === 0; const r = (e.currentTarget as HTMLElement).getBoundingClientRect(); open({ x: kb ? r.left + 16 : e.clientX, y: kb ? r.top + 16 : e.clientY, title, items, pointer: kb ? "keyboard" : "mouse" }); },
    fromElement: (el: HTMLElement, title: string, items: MenuItem[], pointer: "touch" | "keyboard" = "keyboard") => { const r = el.getBoundingClientRect(); open({ x: r.left + 16, y: r.bottom - 8, title, items, pointer }); },
  }), [open]);
}
