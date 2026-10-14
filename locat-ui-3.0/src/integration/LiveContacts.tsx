import { useEffect, useState, type FormEvent } from "react";
import { Screen } from "../layouts/Screen";
import { Button, Badge, SearchField, StateView } from "../ui";
type User = { id: string; username: string; displayName: string; lcCode: string };
type Contact = { user: User; status: "pending" | "accepted"; direction: "incoming" | "outgoing" };
async function api(path: string, payload?: object) {
  const response = await fetch(path, { method: payload ? "POST" : "GET", credentials: "same-origin", cache: "no-store", headers: payload ? { "Content-Type": "application/json" } : undefined, body: payload ? JSON.stringify(payload) : undefined });
  const data = await response.json(); if (!response.ok) throw new Error(data.error ?? "Request failed"); return data;
}
export function LiveContacts() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [blocked, setBlocked] = useState<User[]>([]);
  const [query, setQuery] = useState("");
  const [users, setUsers] = useState<User[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => { let active = true; void api("/api/contacts").then(data => { if (active) { setContacts(data.contacts); setBlocked(data.blocked); } }).catch(error => { if (active) setError(error.message); }); return () => { active = false; }; }, []);
  async function operation(path: string, payload?: object) {
    setBusy(true); setError("");
    try { await api(path, payload); const data = await api("/api/contacts"); setContacts(data.contacts); setBlocked(data.blocked); setUsers([]); } catch (error) { setError(error instanceof Error ? error.message : "Request failed"); } finally { setBusy(false); }
  }
  function search(event: FormEvent) { event.preventDefault(); setError(""); setUsers([]); void api(`/api/users/search?q=${encodeURIComponent(query.trim())}`).then(data => setUsers(data.users)).catch(error => setError(error.message)); }
  return <Screen title="Messages" subtitle="Contacts and friend requests">
    <div className="mx-auto max-w-4xl space-y-5">
      <div className="rounded-2xl bg-s2 p-5 hairline"><h2 className="font-semibold">Private messaging is not enabled yet</h2><p className="mt-2 text-sm text-ink-3">Contacts are live. Encryption key exchange and verification must be validated before conversations can open.</p></div>
      <form onSubmit={search} className="flex gap-3"><SearchField value={query} onChange={setQuery} placeholder="Exact username or LC code" /><Button type="submit" disabled={busy}>Find contact</Button></form>
      {error && <p className="text-danger" role="alert">{error}</p>}
      {users.map(user => <div key={user.id} className="flex items-center justify-between rounded-xl bg-s1 p-4 hairline"><span>{user.displayName} · @{user.username} · {user.lcCode}</span><Button disabled={busy} onClick={() => void operation("/api/contacts/request", { userId: user.id })}>Send friend request</Button></div>)}
      <h2 className="font-semibold">Your contacts</h2>
      {!contacts.length && <StateView kind="empty" title="No contacts yet" body="Find someone by their exact username or LC code to send a request." />}
      {contacts.map(contact => <article key={contact.user.id} className="flex flex-wrap items-center gap-3 rounded-xl bg-s1 p-4 hairline"><span className="flex-1">{contact.user.displayName} · @{contact.user.username}</span><Badge>{contact.status === "accepted" ? "Friend" : `${contact.direction} request`}</Badge>{contact.status === "pending" && contact.direction === "incoming" && <><Button disabled={busy} onClick={() => void operation("/api/contacts/respond", { userId: contact.user.id, accept: true })}>Accept</Button><Button variant="ghost" disabled={busy} onClick={() => void operation("/api/contacts/respond", { userId: contact.user.id, accept: false })}>Decline</Button></>}<Button variant="ghost" disabled={busy} onClick={() => void operation("/api/contacts/block", { userId: contact.user.id, blocked: true })}>Block</Button></article>)}
      {blocked.length > 0 && <><h2 className="font-semibold">Blocked accounts</h2>{blocked.map(user => <div key={user.id} className="flex items-center justify-between rounded-xl bg-s1 p-4 hairline"><span>@{user.username}</span><Button disabled={busy} variant="ghost" onClick={() => void operation("/api/contacts/block", { userId: user.id, blocked: false })}>Unblock</Button></div>)}</>}
    </div>
  </Screen>;
}
