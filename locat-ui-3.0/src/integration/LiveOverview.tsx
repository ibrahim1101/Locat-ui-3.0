import { Link, useNavigate } from "react-router";
import { ArrowUpRight, Search as SearchIcon } from "lucide-react";
import { MODULES, CATEGORY_LABEL, type ModuleCategory } from "../app/registry";
import { useSession } from "../app/session";
import { Screen } from "../layouts/Screen";
import { Badge } from "../ui";
import { LiveHomeContactSummary } from "./LiveHomeContactSummary";
import { LiveHomeConversations } from "./LiveHomeConversations";

const categories: ModuleCategory[] = ["core", "connect", "protect", "organize", "system"];
const homeIds = new Set(["messages", "devices", "files", "workspace", "calendar", "settings"]);

export function LiveOverview({ kind }: { kind: "home" | "modules" }) {
  const { user, availability } = useSession();
  const navigate = useNavigate();
  const homeModules = MODULES.filter((module) => homeIds.has(module.id));
  const heading = kind === "home" ? (user ? `Welcome, ${user.displayName}` : "Welcome to Locat") : "Everything in Locat";
  const title = kind === "home" ? "Home" : "Modules";
  const sections = kind === "home" ? [{ category: "core" as const, modules: homeModules }] : categories.map((category) => ({ category, modules: MODULES.filter((module) => module.category === category && module.id !== "gallery" && module.id !== "profile") }));

  return <Screen title={title} subtitle={kind === "home" ? "Your conversations, devices, and private files in one place" : "A clear map of your Locat workspace"}>
    <div className="mx-auto max-w-6xl space-y-8">
      {kind === "home" && <header className="rounded-3xl border border-ember/20 bg-linear-to-br from-ember/10 via-s1 to-s1 p-6 sm:p-8">
        <p className="text-sm font-semibold uppercase tracking-[0.14em] text-ember">Obsidian Ember</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">{heading}</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-ink-2">Start with the things you use every day. Your files, device links, and conversations each have their own focused space.</p>
        <Link to="/search" className="mt-5 inline-flex items-center gap-2 rounded-xl bg-s2 px-4 py-2.5 text-sm font-semibold hairline hover:text-ember"><SearchIcon className="size-4" />Find a feature</Link>
      </header>}
      {kind === "home" && <div className="grid gap-4 lg:grid-cols-2">
        <section aria-label="Recent conversations" className="rounded-3xl bg-s1 p-5 hairline">
          <div className="flex items-center justify-between gap-3"><h2 className="font-semibold">Recent conversations</h2><Link className="text-sm font-semibold text-ember hover:underline" to="/messages">Open Chat</Link></div>
          <div className="mt-3">
            {user
              ? <LiveHomeConversations accountId={user.id} onOpen={accountId => navigate(`/messages/${accountId}`)} />
              : <p className="rounded-2xl bg-s2 p-4 text-sm leading-6 text-ink-3">Sign in and keep messaging active on this device to see locally decrypted conversations here.</p>}
          </div>
        </section>
        {user && <LiveHomeContactSummary accountId={user.id} onOpenMessages={section => navigate(`/messages?section=${section}`)} />}
      </div>}
      {sections.map(({ category, modules }) => <section key={category} aria-label={CATEGORY_LABEL[category]}>
        <div className="mb-3 flex items-baseline justify-between"><h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-ink-3">{CATEGORY_LABEL[category]}</h2><span className="text-xs text-ink-3">{modules.length} spaces</span></div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{modules.map((module) => {
          const Icon = module.icon; const status = availability(module.id);
          return <Link key={module.id} to={module.route} className="group rounded-2xl bg-s1 p-5 hairline transition hover:-translate-y-0.5 hover:bg-s2">
            <div className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-xl bg-ember/10 text-ember"><Icon className="size-5" /></span><h3 className="flex-1 font-semibold">{module.name}</h3><ArrowUpRight className="size-4 text-ink-3 transition group-hover:text-ember" /></div>
            <p className="mt-3 min-h-10 text-sm leading-5 text-ink-3">{module.tagline}</p>
            <div className="mt-4 flex items-center justify-between"><span className="text-xs text-ink-3">{status.reason ?? "Ready to open"}</span><Badge>{status.availability}</Badge></div>
          </Link>
        })}</div>
      </section>)}
    </div>
  </Screen>;
}
