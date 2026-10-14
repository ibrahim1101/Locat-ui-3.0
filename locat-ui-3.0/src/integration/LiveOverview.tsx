import { useState } from "react";
import { Link } from "react-router";
import { MODULES } from "../app/registry";
import { useSession } from "../app/session";
import { Screen } from "../layouts/Screen";
import { SearchField, Badge, StateView } from "../ui";
import { useLiveMedia } from "./liveMedia";
export function LiveOverview({ kind }: { kind: "home" | "search" | "modules" }) {
  const { user, availability } = useSession();
  const { items } = useLiveMedia();
  const [query, setQuery] = useState("");
  const names = { home: "Home", search: "Search", modules: "Modules" };
  const matches = items.filter(item => item.name.toLowerCase().includes(query.toLowerCase()));
  return <Screen title={names[kind]} subtitle={kind === "home" ? user ? `Welcome, ${user.displayName}` : "Local device" : "Live integrations"} toolbar={kind === "search" ? <SearchField value={query} onChange={setQuery} placeholder="Search your imported media" /> : undefined}>
    <div className="mx-auto max-w-6xl space-y-6">
      {kind !== "search" ? <><p className="text-ink-2">{items.length} imported files on this device. Your modules below show their current integration status.</p><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{MODULES.filter(module => !["gallery", "profile"].includes(module.id)).map(module => { const status = availability(module.id); const Icon = module.icon; return <Link key={module.id} to={module.route} className="rounded-2xl bg-s1 p-5 hairline hover:bg-s2"><div className="flex items-center gap-3"><Icon className="size-5 text-ember" /><h2 className="flex-1 font-semibold">{module.name}</h2><Badge>{status.availability}</Badge></div><p className="mt-3 text-xs text-ink-3">{status.reason ?? "Connected to live data"}</p></Link>; })}</div></> : matches.length ? <div className="space-y-3">{matches.map(item => <Link className="block rounded-xl bg-s1 p-4 hairline" key={item.id} to={{ video: "/cinema", audio: "/music", photo: "/photos" }[item.kind]}><h2 className="font-semibold">{item.name}</h2><p className="text-xs text-ink-3">{item.kind} · {item.album}</p></Link>)}</div> : <StateView kind="empty" title="No matches" body="Search covers imported media on this device." />}
    </div>
  </Screen>;
}
