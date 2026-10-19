import { useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { CATEGORY_LABEL, MODULES, UNRESOLVED_MILESTONES, type ModuleCategory } from "@/app/registry";
import { useSession } from "@/app/session";
import { Screen } from "@/layouts/Screen";
import { FlaskConical } from "lucide-react";
import { AvailabilityBadge, Avatar, Banner, Button, SearchField, cn } from "@/ui";

const ORDER: ModuleCategory[] = ["core", "connect", "protect", "organize", "system"];

/** "More" destination on phones and the full ecosystem directory on desktop. Every module is discoverable here. */
export default function Modules() {
  const { availability, user, adapter } = useSession();
  const nav = useNavigate();
  const [q, setQ] = useState("");
  const list = useMemo(() => MODULES.filter((m) => m.id !== "modules" && (!q || `${m.name} ${m.tagline} ${m.keywords ?? ""}`.toLowerCase().includes(q.toLowerCase()))), [q]);
  return (
    <Screen title="All of Locat" testId="modules-screen" toolbar={<SearchField value={q} onChange={setQ} placeholder="Find a module" testId="modules-search" className="mb-2" />}>
      <div className="mx-auto max-w-5xl">
        <button onClick={() => nav("/settings/profile")} className="mb-6 flex w-full items-center gap-3 rounded-2xl bg-s1 p-3 text-left hairline hover:bg-s2 md:hidden" data-testid="modules-profile">
          <Avatar name={user?.displayName ?? "Local device"} size={48} />
          <span className="min-w-0 flex-1"><span className="block truncate font-bold">{user?.displayName ?? "Local device"}</span><span className="block font-mono text-xs text-ink-3">{user ? `@${user.username} · ${user.lcCode}` : "No account"}</span></span>
        </button>
        {adapter.mode === "preview" && <Banner className="mb-6" tone="planned" icon={FlaskConical} title="Standalone UI preview" action={<Button size="sm" onClick={() => window.dispatchEvent(new Event("locat:preview-lab"))} data-testid="open-preview-lab">Preview lab</Button>}>Fictional fixtures only. Nothing connects to a server.</Banner>}
        {ORDER.map((cat) => {
          const items = list.filter((m) => m.category === cat);
          if (!items.length) return null;
          return (
            <section key={cat} className="mb-7">
              <h2 className="mb-2 px-1 text-2xs font-bold uppercase tracking-[.12em] text-ink-3">{CATEGORY_LABEL[cat]}</h2>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {items.map((m) => {
                  const a = availability(m.id); const I = m.icon;
                  return (
                    <button key={m.id} onClick={() => nav(m.route)} data-testid={`module-${m.id}`} aria-describedby={a.reason ? `${m.id}-r` : undefined}
                      className={cn("flex min-h-[72px] items-center gap-3 rounded-2xl bg-s1 p-3 text-left hairline transition-colors hover:bg-s2", (a.availability === "planned" || a.availability === "offline" || a.availability === "admin-only") && "bg-transparent")}>
                      <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-s2 hairline"><I className="size-5 text-ink-2" /></span>
                      <span className="min-w-0 flex-1"><span className="block truncate text-[15px] font-bold md:text-sm">{m.name}</span><span id={`${m.id}-r`} className="block truncate text-xs text-ink-3">{a.reason ?? m.tagline}</span></span>
                      <AvailabilityBadge value={a.availability} hideAvailable />
                    </button>);
                })}
              </div>
            </section>);
        })}
        <p className="px-1 pb-4 text-xs leading-relaxed text-ink-3">Ecosystem milestones {UNRESOLVED_MILESTONES.join(" and ")} have no recovered historical definition and are intentionally left unnamed.</p>
      </div>
    </Screen>
  );
}
