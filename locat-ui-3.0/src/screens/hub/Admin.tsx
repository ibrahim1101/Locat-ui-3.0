import { useState } from "react";
import { Ban, LogOut, ScrollText, ShieldCheck, UserPlus, UserCheck } from "lucide-react";
import type { AdminUserView } from "@/contracts/ecosystem";
import { useSession } from "@/app/session";
import { useReport } from "@/app/feedback";
import { FIXTURE_ADMIN_USERS } from "@/fixtures/data";
import { Screen } from "@/layouts/Screen";
import { Badge, Banner, Button, ListRow, SearchField, Section, Sheet, TextField, Avatar } from "@/ui";

/** Server administration: disable/revoke with password re-auth. User creation is partial (#29). */
export default function Admin() {
  const { adapter } = useSession(); const report = useReport();
  const [q, setQ] = useState(""); const [target, setTarget] = useState<{ u: AdminUserView; action: "disable" | "enable" | "revoke" } | null>(null); const [pw, setPw] = useState("");
  const users = FIXTURE_ADMIN_USERS.filter((u) => !q || `${u.username} ${u.lcCode}`.toLowerCase().includes(q.toLowerCase()));
  const confirm = async () => {
    if (!target) return;
    report(target.action === "revoke" ? await adapter.admin.revokeSessions(target.u.id, pw) : await adapter.admin.setUserDisabled(target.u.id, target.action === "disable", pw), "Done");
    setTarget(null); setPw("");
  };
  return (
    <Screen title="Administration" subtitle="Users and access on this Locat server" testId="admin-screen"
      actions={<Button size="sm" icon={UserPlus} onClick={async () => report(await adapter.admin.createUser(), "User created")} data-testid="admin-create-user">Create user</Button>}>
      <div className="mx-auto max-w-4xl">
        <Banner className="mb-4" tone="info" icon={ShieldCheck} title="Every admin action requires your password again">Disabling an account isn't account closure (#14) — the user's data is retained.</Banner>
        <SearchField value={q} onChange={setQ} placeholder="Find user by name or LC code" className="mb-4" />
        <Section title={`${users.length} accounts`}>{users.map((u) => (
          <ListRow key={u.id} title={<span className="flex items-center gap-2">{u.username}{u.role === "admin" && <Badge tone="info">Admin</Badge>}{u.disabled && <Badge tone="danger">Disabled</Badge>}</span>} subtitle={`${u.lcCode} · ${u.sessions} sessions`} testId={`admin-user-${u.id}`}
            trailing={<div className="flex items-center gap-1"><Avatar name={u.username} size={28} className="mr-2 hidden sm:inline-grid" />
              <Button size="sm" variant="ghost" icon={LogOut} disabledReason={u.sessions === 0 ? "No sessions" : null} onClick={() => setTarget({ u, action: "revoke" })}>Revoke</Button>
              <Button size="sm" variant={u.disabled ? "secondary" : "danger"} icon={u.disabled ? UserCheck : Ban} disabledReason={u.role === "admin" ? "Can't disable an admin here" : null} onClick={() => setTarget({ u, action: u.disabled ? "enable" : "disable" })} data-testid={`admin-toggle-${u.id}`}>{u.disabled ? "Enable" : "Disable"}</Button></div>} />))}</Section>
        <Section title="Audit"><ListRow icon={ScrollText} title="Admin audit log" subtitle="Action metadata only — never message content" trailing={<Badge>Preview</Badge>} /><ListRow icon={ScrollText} title="Presence logs" disabledReason="Planned (#39) — privacy design required" /></Section>
      </div>
      <Sheet open={!!target} onClose={() => setTarget(null)} title={target?.action === "revoke" ? `Sign ${target.u.username} out everywhere?` : `${target?.action === "disable" ? "Disable" : "Enable"} ${target?.u.username}?`} size="sm" testId="admin-confirm"
        footer={<><Button variant="ghost" onClick={() => setTarget(null)}>Cancel</Button><Button variant={target?.action === "enable" ? "primary" : "danger"} disabledReason={!pw ? "Confirm with your password" : null} onClick={confirm} data-testid="admin-confirm-submit">Confirm</Button></>}>
        <TextField label="Your admin password" reveal value={pw} onChange={(e) => setPw(e.target.value)} autoComplete="current-password" />
      </Sheet>
    </Screen>
  );
}
