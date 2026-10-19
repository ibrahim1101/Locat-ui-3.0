import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { CornerDownLeft } from "lucide-react";
import { MODULES, moduleById } from "@/app/registry";
import { useSession } from "@/app/session";
import { useBackLayer } from "@/app/back";
import { AvailabilityBadge, Kbd, cn } from "@/ui";
import { createPortal } from "react-dom";

/** Desktop command palette (Ctrl/Cmd+K). Keyboard-first module + action jump. */
export function CommandPalette({ open, onClose }: { open: boolean; onClose(): void }) {
  // Mounting fresh on every open resets query/selection without an effect.
  return open ? <Palette onClose={onClose} /> : null;
}

function Palette({ onClose }: { onClose(): void }) {
  const [q, setQ] = useState("");
  const [i, setI] = useState(0);
  const nav = useNavigate();
  const { availability } = useSession();
  const input = useRef<HTMLInputElement>(null);
  useBackLayer(true, onClose);
  const items = useMemo(() => {
    const s = q.trim().toLowerCase();
    const mods = MODULES.map((m) => ({ id: m.id, label: m.name, hint: m.tagline, icon: m.icon, to: m.route, a: availability(m.id).availability, k: `${m.name} ${m.tagline} ${m.keywords ?? ""}`.toLowerCase() }));
    const actions = [
      { id: "new-chat", label: "New conversation", hint: "Chat", icon: moduleById("messages").icon, to: "/messages?compose=1", a: availability("messages").availability, k: "new conversation chat message compose" },
      { id: "pair", label: "Pair a device", hint: "Link", icon: moduleById("devices").icon, to: "/devices?pair=1", a: availability("devices").availability, k: "pair link device" },
      { id: "files", label: "Open Files & Vault", hint: "Files", icon: moduleById("files").icon, to: "/files", a: availability("files").availability, k: "files vault credentials secrets documents" },
    ];
    return [...actions, ...mods].filter((x) => !s || x.k.includes(s)).slice(0, 12);
  }, [q, availability]);
  useEffect(() => { const t = setTimeout(() => input.current?.focus(), 20); return () => clearTimeout(t); }, []);
  const go = (to: string) => { nav(to); onClose(); };
  return createPortal(
    <div className="fixed inset-0 z-40 flex items-start justify-center p-4 pt-[12vh]">
      <div className="absolute inset-0 animate-fade bg-black/55" onClick={onClose} aria-hidden />
      <div role="dialog" aria-modal="true" aria-label="Command palette" className="relative w-full max-w-xl animate-pop overflow-hidden rounded-2xl bg-s1 shadow-float">
        <input ref={input} data-testid="command-input" value={q} onChange={(e) => { setQ(e.target.value); setI(0); }} placeholder="Jump to a module or action…" aria-label="Command"
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") { e.preventDefault(); setI((x) => Math.min(items.length - 1, x + 1)); }
            if (e.key === "ArrowUp") { e.preventDefault(); setI((x) => Math.max(0, x - 1)); }
            if (e.key === "Enter" && items[i]) go(items[i].to);
          }}
          className="h-14 w-full border-b border-line bg-transparent px-5 text-[15px] outline-hidden placeholder:text-ink-3 focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-ember" />
        <ul className="max-h-[50vh] overflow-y-auto p-2" role="listbox">
          {items.map((it, idx) => { const I = it.icon; return (
            <li key={it.id} role="option" aria-selected={idx === i}>
              <button onMouseEnter={() => setI(idx)} onClick={() => go(it.to)} className={cn("flex h-11 w-full items-center gap-3 rounded-lg px-3 text-left text-sm", idx === i ? "bg-s2" : "")}>
                <I className="size-[18px] text-ink-2" /><span className="flex-1 truncate font-semibold">{it.label}<span className="ml-2 font-normal text-ink-3">{it.hint}</span></span>
                <AvailabilityBadge value={it.a} hideAvailable />{idx === i && <CornerDownLeft className="size-4 text-ink-3" />}
              </button>
            </li>); })}
          {!items.length && <li className="p-6 text-center text-sm text-ink-3">No matches</li>}
        </ul>
        <div className="flex gap-4 border-t border-line px-4 py-2 text-2xs text-ink-3"><span><Kbd>↑↓</Kbd> move</span><span><Kbd>Enter</Kbd> open</span><span><Kbd>Esc</Kbd> close</span></div>
      </div>
    </div>, document.body);
}
