import { NavLink, useLocation, useNavigate } from "react-router";
import { ChevronsLeft, Command, Home, LayoutGrid, MessageCircle, Clapperboard, Smartphone } from "lucide-react";
import { CATEGORY_LABEL, MODULES, type ModuleCategory, type ModuleDef } from "@/app/registry";
import { useSession } from "@/app/session";
import { AvailabilityBadge, Avatar, Kbd, LocatMark, LocatWordmark, cn } from "@/ui";

const ORDER: ModuleCategory[] = ["core", "media", "connect", "protect", "organize", "system"];
const HIDDEN_FROM_SIDEBAR = new Set(["profile", "modules", "settings"]);

function SideItem({ m, rail }: { m: ModuleDef; rail: boolean }) {
  const { availability } = useSession();
  const a = availability(m.id);
  const I = m.icon;
  return (
    <NavLink to={m.route} data-testid={`nav-${m.id}`} title={rail ? `${m.name}${a.reason ? ` — ${a.reason}` : ""}` : a.reason}
      className={({ isActive }) => cn("group relative flex h-9 items-center gap-3 rounded-lg px-2.5 text-[13px] font-semibold transition-colors",
        isActive ? "bg-s2 text-ink" : "text-ink-2 hover:bg-s1 hover:text-ink", rail && "justify-center px-0", (a.availability === "planned" || a.availability === "admin-only" || a.availability === "offline") && "opacity-60")}>
      {({ isActive }) => (<>
        {isActive && <span className="absolute -left-3 h-5 w-1 rounded-r-full bg-ember" aria-hidden />}
        <I className={cn("size-[18px] shrink-0", isActive && "text-ember")} aria-hidden />
        {!rail && <span className="flex-1 truncate">{m.name}</span>}
        {!rail && a.availability !== "available" && a.availability !== "beta" && <AvailabilityBadge value={a.availability} />}
      </>)}
    </NavLink>
  );
}

/** Desktop / tablet navigation. Full sidebar ≥1100px, icon rail 768–1099px. */
export function Sidebar({ rail, onToggle, onCommand }: { rail: boolean; onToggle(): void; onCommand(): void }) {
  const { user } = useSession();
  const nav = useNavigate();
  return (
    <nav aria-label="Primary" className={cn("flex h-full shrink-0 flex-col border-r border-line bg-canvas transition-[width] duration-200", rail ? "w-[76px]" : "w-[248px]")}>
      <div className={cn("flex h-[68px] items-center px-4", rail && "justify-center px-0")}>
        {rail ? <LocatMark size={30} /> : <LocatWordmark />}
      </div>
      <div className="px-3 pb-2">
        <button onClick={onCommand} data-testid="open-command-palette" className={cn("flex h-9 w-full items-center gap-2 rounded-lg bg-s1 px-2.5 text-[13px] text-ink-3 hairline hover:text-ink", rail && "justify-center px-0")} aria-label="Search and jump (Ctrl+K)">
          <Command className="size-4" />{!rail && <><span className="flex-1 text-left">Jump to…</span><Kbd>Ctrl K</Kbd></>}
        </button>
      </div>
      <div className="no-scrollbar flex-1 overflow-y-auto px-3 pb-3">
        {ORDER.map((cat) => (
          <div key={cat} className="mt-3">
            {!rail ? <p className="mb-1 px-2.5 text-2xs font-bold uppercase tracking-[.12em] text-ink-3">{CATEGORY_LABEL[cat]}</p> : <div className="mx-auto mb-1 h-px w-6 bg-line" />}
            <div className="flex flex-col gap-0.5">{MODULES.filter((m) => m.category === cat && !HIDDEN_FROM_SIDEBAR.has(m.id)).map((m) => <SideItem key={m.id} m={m} rail={rail} />)}</div>
          </div>
        ))}
      </div>
      <div className="border-t border-line p-3">
        <button onClick={() => nav("/settings")} data-testid="sidebar-account" className={cn("flex w-full items-center gap-3 rounded-xl p-2 text-left hover:bg-s1", rail && "justify-center p-1")}>
          <Avatar name={user?.displayName ?? "Local device"} size={34} presence={user ? "online" : undefined} />
          {!rail && <span className="min-w-0 flex-1"><span className="block truncate text-[13px] font-bold">{user?.displayName ?? "Local device"}</span><span className="block truncate font-mono text-2xs text-ink-3">{user?.lcCode ?? "No account"}</span></span>}
        </button>
        <button onClick={onToggle} aria-label={rail ? "Expand sidebar" : "Collapse sidebar"} className="mt-1 flex h-8 w-full items-center justify-center rounded-lg text-ink-3 hover:bg-s1 hover:text-ink">
          <ChevronsLeft className={cn("size-4 transition-transform", rail && "rotate-180")} />
        </button>
      </div>
    </nav>
  );
}

const MEDIA = ["/cinema", "/music", "/photos"];
/** Android / phone bottom navigation: 5 destinations, 64px + system inset. */
export function MobileNav({ lastMedia }: { lastMedia: string }) {
  const { pathname } = useLocation();
  const { connection } = useSession();
  const items = [
    { to: "/messages", label: "Chats", icon: MessageCircle, match: (p: string) => p.startsWith("/messages") },
    { to: lastMedia, label: "Media", icon: Clapperboard, match: (p: string) => MEDIA.some((m) => p.startsWith(m)) },
    { to: "/home", label: "Home", icon: Home, match: (p: string) => p === "/home" },
    { to: "/devices", label: "Devices", icon: Smartphone, match: (p: string) => p.startsWith("/devices") },
    { to: "/modules", label: "More", icon: LayoutGrid, match: (p: string) => !["/messages", "/home", "/devices", ...MEDIA].some((m) => p.startsWith(m)) },
  ];
  return (
    <nav aria-label="Primary" className="shrink-0 border-t border-line bg-canvas/95 pb-safe backdrop-blur-xl">
      <div className="flex h-16 items-stretch">
        {items.map((it) => {
          const on = it.match(pathname); const I = it.icon;
          return (
            <NavLink key={it.label} to={it.to} data-testid={`tab-${it.label.toLowerCase()}`} aria-current={on ? "page" : undefined} className="flex flex-1 flex-col items-center justify-center gap-1">
              <span className={cn("relative grid h-8 w-14 place-items-center rounded-full transition-colors duration-200", on ? "bg-ember/15 text-ember" : "text-ink-3")}>
                <I className="size-[22px]" aria-hidden />
                {it.label === "Chats" && connection.pendingOutbox > 0 && <span className="absolute right-2.5 top-0.5 size-2 rounded-full bg-warn ring-2 ring-canvas" aria-label="Pending messages" />}
              </span>
              <span className={cn("text-[11px] font-semibold", on ? "text-ink" : "text-ink-3")}>{it.label}</span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}
