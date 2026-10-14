import { useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { Clapperboard, LayoutGrid, Lock, MessageCircle, Music2, Settings, User } from "lucide-react";
import type { SearchResultView, SearchScope } from "@/contracts/ecosystem";
import { MODULES } from "@/app/registry";
import { FIXTURE_CONTACTS, FIXTURE_MESSAGES, FIXTURE_TRACKS, FIXTURE_VIDEOS } from "@/fixtures/data";
import { Screen } from "@/layouts/Screen";
import { Banner, ChipRow, SearchField, Section, ListRow, StateView } from "@/ui";

const ICON: Record<SearchScope, typeof User> = { messages: MessageCircle, attachments: MessageCircle, contacts: User, modules: LayoutGrid, media: Clapperboard, settings: Settings };

/** Scoped universal search (M4). Message search runs on this device's decrypted copy only. */
export default function Search() {
  const nav = useNavigate();
  const [q, setQ] = useState(""); const [scope, setScope] = useState<"all" | SearchScope>("all");
  const results = useMemo<SearchResultView[]>(() => {
    const s = q.trim().toLowerCase(); if (s.length < 2) return [];
    return [
      ...FIXTURE_MESSAGES.filter((m) => !m.hidden && m.text?.toLowerCase().includes(s)).map((m) => ({ id: m.id, scope: "messages" as const, title: m.text!, subtitle: `${m.authorName} · this device`, route: `/messages/${m.conversationId}` })),
      ...FIXTURE_MESSAGES.filter((m) => m.attachment && "name" in m.attachment && m.attachment.name.toLowerCase().includes(s)).map((m) => ({ id: "a" + m.id, scope: "attachments" as const, title: (m.attachment as { name: string }).name, subtitle: "Attachment name", route: `/messages/${m.conversationId}` })),
      ...FIXTURE_CONTACTS.filter((c) => `${c.displayName} ${c.username} ${c.lcCode}`.toLowerCase().includes(s)).map((c) => ({ id: c.id, scope: "contacts" as const, title: c.displayName, subtitle: `@${c.username} · ${c.lcCode}`, route: "/messages" })),
      ...[...FIXTURE_VIDEOS, ...FIXTURE_TRACKS].filter((v) => v.title.toLowerCase().includes(s)).map((v) => ({ id: v.id, scope: "media" as const, title: v.title, subtitle: "durationSec" in v && "artist" in v ? `Song · ${(v as { artist: string }).artist}` : "Video", route: "artist" in v ? "/music" : `/cinema/play/${v.id}` })),
      ...MODULES.filter((m) => `${m.name} ${m.tagline}`.toLowerCase().includes(s)).map((m) => ({ id: m.id, scope: "modules" as const, title: m.name, subtitle: m.tagline, route: m.route })),
    ].filter((r) => scope === "all" || r.scope === scope);
  }, [q, scope]);
  const groups = [...new Set(results.map((r) => r.scope))];
  return (
    <Screen title="Search" testId="search-screen" toolbar={<><SearchField autoFocus value={q} onChange={setQ} placeholder="Search messages, people, media, modules" testId="global-search-input" />
      <ChipRow label="Scope" value={scope} onChange={setScope} options={[{ value: "all", label: "All" }, { value: "messages", label: "Messages" }, { value: "attachments", label: "Files" }, { value: "contacts", label: "People" }, { value: "media", label: "Media" }, { value: "modules", label: "Modules" }]} /></>}>
      <div className="mx-auto max-w-3xl">
        <Banner className="mb-5" tone="info" icon={Lock} title="Encrypted content is searched on this device only">Your server can't read messages, so it can't search them. Hidden messages, Vault and Secrets are never included.</Banner>
        {q.trim().length < 2 ? <StateView compact kind="empty" title="Type at least 2 characters" body="Results are grouped by where they came from." />
          : !results.length ? <StateView compact kind="empty" title={`No results for "${q}"`} body="Older history not stored on this device can't be searched." />
          : groups.map((g) => <Section key={g} title={g}>{results.filter((r) => r.scope === g).map((r) => <ListRow key={r.id} icon={ICON[r.scope]} title={r.title} subtitle={r.subtitle} onClick={() => nav(r.route)} chevron testId={`result-${r.id}`} />)}</Section>)}
        <Music2 className="hidden" />
      </div>
    </Screen>
  );
}
