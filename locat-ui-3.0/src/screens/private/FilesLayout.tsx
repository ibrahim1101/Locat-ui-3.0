import { NavLink, Outlet } from "react-router";
import { FileLock2, KeyRound } from "lucide-react";
import { cn } from "@/ui";

const sections = [
  { to: "/files/vault", label: "Vault", detail: "Private files", icon: FileLock2 },
  { to: "/files/secrets", label: "Secrets", detail: "Credentials & notes", icon: KeyRound },
];

/** Files groups related storage tools under one destination, with clear child sections. */
export function FilesLayout() {
  return (
    <div className="flex h-full min-h-0 flex-col">
      <nav aria-label="Files sections" className="shrink-0 border-b border-line bg-canvas px-4 py-3 md:px-6">
        <div className="mx-auto flex max-w-6xl gap-2">
          {sections.map(({ to, label, detail, icon: Icon }) => (
            <NavLink key={to} to={to} className={({ isActive }) => cn(
              "flex min-w-0 items-center gap-3 rounded-xl px-3 py-2.5 transition-colors hairline",
              isActive ? "bg-ember/10 text-ink shadow-[inset_0_0_0_1px_rgb(var(--ember)/.35)]" : "bg-s1 text-ink-2 hover:bg-s2",
            )}>
              {({ isActive }) => <>
                <Icon className={cn("size-4 shrink-0", isActive && "text-ember")} aria-hidden />
                <span className="min-w-0 text-left">
                  <span className="block text-sm font-semibold">{label}</span>
                  <span className="hidden text-2xs text-ink-3 sm:block">{detail}</span>
                </span>
              </>}
            </NavLink>
          ))}
        </div>
      </nav>
      <div className="min-h-0 flex-1"><Outlet /></div>
    </div>
  );
}
