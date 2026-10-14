import { useMemo, useState } from "react";
import { Copy, Dices, Download, Eye, FileLock2, FlaskConical, FolderLock, KeyRound, Lock, NotebookPen, Plus, ShieldCheck, Trash2, Upload, Timer, HardDriveDownload } from "lucide-react";
import type { OperationResult } from "@/contracts/common";
import type { PrivateStoreKind, SecretEntryView, VaultEntryView } from "@/contracts/ecosystem";
import { useSession } from "@/app/session";
import { useDropTarget } from "@/app/drop";
import { useReport } from "@/app/feedback";
import { FIXTURE_SECRETS, FIXTURE_VAULT } from "@/fixtures/data";
import { Screen } from "@/layouts/Screen";
import { Banner, Button, ChipRow, IconButton, ListRow, Meter, SearchField, Section, Sheet, Slider, Switch, TextField, StateView, formatBytes, relTime } from "@/ui";

const QUOTA = { usedBytes: 2_610_000, quotaBytes: 64 * 1024 * 1024, entries: 6, maxEntries: 128, maxFileBytes: 2 * 1024 * 1024 };

/** Generator runs locally with crypto.getRandomValues; output is never stored by the UI. */
function generate(len: number, symbols: boolean) {
  const set = "abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789" + (symbols ? "!@#$%^&*-_=+?" : "");
  const r = crypto.getRandomValues(new Uint32Array(len)); return [...r].map((n) => set[n % set.length]).join("");
}

function Unlock({ kind, onPreview }: { kind: PrivateStoreKind; onPreview(): void }) {
  const { adapter } = useSession();
  const [p, setP] = useState(""); const [busy, setBusy] = useState(false); const [res, setRes] = useState<OperationResult | null>(null);
  return (
    <div className="mx-auto flex max-w-sm flex-col items-center py-10 text-center" data-testid="store-locked">
      <div className="mb-5 grid size-16 place-items-center rounded-3xl bg-s2 hairline"><Lock className="size-7 text-ember" /></div>
      <h2 className="text-xl font-extrabold">{kind === "vault" ? "Vault is locked" : "Secrets are locked"}</h2>
      <p className="mt-1.5 text-sm text-ink-2">Your {kind === "vault" ? "files" : "credentials"} are encrypted on this device with a separate passphrase. Locat can't recover it if you forget.</p>
      <form className="mt-6 w-full space-y-3 text-left" onSubmit={async (e) => { e.preventDefault(); setBusy(true); setRes(await adapter.privateStore.unlock(kind, p)); setP(""); setBusy(false); }}>
        <TextField label="Passphrase" reveal value={p} onChange={(e) => setP(e.target.value)} autoComplete="off" data-testid="store-passphrase" />
        <Button type="submit" variant="primary" block loading={busy} disabledReason={!p ? "Enter your passphrase" : null} data-testid="store-unlock">Unlock</Button>
      </form>
      {res?.status === "integration-pending" && (
        <div className="mt-5 w-full rounded-2xl bg-planned/10 p-4 text-left" data-testid="store-pending">
          <p className="flex items-center gap-2 text-sm font-bold text-planned"><FlaskConical className="size-4" />Nothing was decrypted</p>
          <p className="mt-1 text-xs text-ink-2">{res.reason}</p>
          <Button size="sm" className="mt-3" onClick={onPreview} data-testid="store-preview">View layout with fictional titles</Button>
        </div>)}
      <button className="mt-6 text-sm font-semibold text-ember">Restore from encrypted backup</button>
    </div>
  );
}

function Generator({ open, onClose }: { open: boolean; onClose(): void }) {
  const [len, setLen] = useState(20); const [sym, setSym] = useState(true); const [pw, setPw] = useState(() => generate(20, true));
  return (
    <Sheet open={open} onClose={onClose} title="Password generator" size="sm" testId="password-generator" footer={<Button variant="primary" icon={Copy} onClick={() => navigator.clipboard?.writeText(pw).catch(() => undefined)}>Copy</Button>}>
      <p className="break-all rounded-xl bg-s2 p-4 font-mono text-lg hairline" data-testid="generated-password">{pw}</p>
      <div className="mt-4 flex items-center gap-3"><span className="w-20 text-sm">Length {len}</span><Slider label="Length" min={12} max={64} value={len} onChange={(v) => { setLen(v); setPw(generate(v, sym)); }} /></div>
      <Switch label="Include symbols" checked={sym} onChange={(v) => { setSym(v); setPw(generate(len, v)); }} />
      <Button icon={Dices} onClick={() => setPw(generate(len, sym))}>Regenerate</Button>
      <p className="mt-3 text-xs text-ink-3">Copied passwords stay on your clipboard until you copy something else. Locat can't clear other apps' clipboard history.</p>
    </Sheet>
  );
}

export default function PrivateStore({ kind }: { kind: PrivateStoreKind }) {
  const { adapter } = useSession(); const report = useReport();
  const [unlocked, setUnlocked] = useState(false);
  const [q, setQ] = useState(""); const [folder, setFolder] = useState("all");
  const [gen, setGen] = useState(false); const [del, setDel] = useState<VaultEntryView | SecretEntryView | null>(null);
  const [open, setOpen] = useState<SecretEntryView | null>(null);
  const items = useMemo(() => (kind === "vault" ? FIXTURE_VAULT : FIXTURE_SECRETS) as (VaultEntryView | SecretEntryView)[], [kind]);
  const folders = [...new Set(items.map((i) => i.folder))];
  const list = items.filter((i) => (folder === "all" || i.folder === folder) && (!q || ("name" in i ? i.name : i.title).toLowerCase().includes(q.toLowerCase())));
  const title = kind === "vault" ? "Vault" : "Secrets";
  const lock = () => { adapter.privateStore.lock(kind); setUnlocked(false); };
  useDropTarget(kind === "vault" && unlocked ? { id: "vault", label: `Encrypt into Vault${folder !== "all" ? ` · ${folder}` : ""}`, detail: "Encrypted on this device before upload · 2 MiB per file", maxBytes: QUOTA.maxFileBytes, onDrop: (files) => adapter.privateStore.upload(files[0], folder) } : null);

  return (
    <Screen title={title} subtitle={kind === "vault" ? "Beta · client-encrypted files" : "Beta · client-encrypted credentials"} testId={`${kind}-screen`}
      actions={unlocked ? <><IconButton icon={HardDriveDownload} label="Export encrypted backup" onClick={async () => report(await adapter.privateStore.exportBackup(kind), "Backup exported")} />{kind === "secrets" && <IconButton icon={Dices} label="Password generator" onClick={() => setGen(true)} data-testid="open-generator" />}<IconButton icon={Lock} label="Lock now" onClick={lock} data-testid="store-lock" /></> : undefined}>
      <div className="mx-auto max-w-4xl">
        {!unlocked ? <Unlock kind={kind} onPreview={() => setUnlocked(true)} /> : (<>
          <Banner className="mb-4" tone="planned" icon={FlaskConical} title="Preview layout — titles are fictional, no secret values exist">Reveal, copy, upload and download are handled by Locat's privateStore crypto when integrated.</Banner>
          <div className="mb-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl bg-s1 p-4 hairline"><p className="text-2xs font-bold uppercase tracking-wider text-ink-3">Storage</p><p className="mt-1 text-sm font-semibold">{formatBytes(QUOTA.usedBytes)} of {formatBytes(QUOTA.quotaBytes)}</p><Meter className="mt-2" label="Storage used" value={QUOTA.usedBytes / QUOTA.quotaBytes} /><p className="mt-2 text-xs text-ink-3">{QUOTA.entries}/{QUOTA.maxEntries} entries{kind === "vault" ? ` · ${formatBytes(QUOTA.maxFileBytes)} per file` : ""}</p></div>
            <div className="flex items-center gap-3 rounded-2xl bg-s1 p-4 hairline"><Timer className="size-5 text-ember" /><div><p className="text-sm font-semibold">Auto-locks after 5 minutes idle</p><p className="text-xs text-ink-3">Also locks when Locat goes to the background.</p></div></div>
          </div>
          <div className="flex flex-wrap items-center gap-2"><SearchField value={q} onChange={setQ} placeholder={`Search ${title.toLowerCase()} (local, decrypted names)`} className="min-w-[200px] flex-1" />
            {kind === "vault" ? <label className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-xl bg-ember px-4 text-sm font-semibold text-ember-ink"><Upload className="size-4" />Upload<input type="file" className="sr-only" onChange={async (e) => { const f = e.target.files?.[0]; if (!f) return; if (f.size > QUOTA.maxFileBytes) report({ status: "error", code: "too-large", message: `${f.name} is over the 2 MiB preview limit` }, ""); else report(await adapter.privateStore.upload(f, folder), "Uploaded"); }} data-testid="vault-upload" /></label>
              : <Button variant="primary" icon={Plus} onClick={async () => report(await adapter.privateStore.upload(new File([], "new"), folder), "Saved")}>Add</Button>}</div>
          <ChipRow label="Folders" value={folder} onChange={setFolder} options={[{ value: "all", label: "All" }, ...folders.map((f) => ({ value: f, label: f }))]} />
          {list.length ? <Section>{list.map((i) => "name" in i ? (
            <ListRow key={i.id} icon={FileLock2} title={i.name} subtitle={`${i.folder} · ${formatBytes(i.sizeBytes)} · ${relTime(i.updatedAt)}`} testId={`vault-${i.id}`}
              trailing={<div className="flex"><IconButton icon={Download} label={`Download ${i.name}`} size="sm" onClick={async () => report(await adapter.privateStore.download(i.id), "Downloaded")} /><IconButton icon={Trash2} tone="danger" size="sm" label={`Delete ${i.name}`} onClick={() => setDel(i)} /></div>} />
          ) : (
            <ListRow key={i.id} icon={i.kind === "note" ? NotebookPen : KeyRound} title={i.title} subtitle={i.kind === "note" ? `Secure note · ${i.folder}` : `${i.username} · ${i.folder}`} onClick={() => setOpen(i)} chevron testId={`secret-${i.id}`} />
          ))}</Section> : <StateView compact kind="empty" title="Nothing here yet" />}
          <p className="flex items-center gap-2 text-xs text-ink-3"><ShieldCheck className="size-4" />Large files, sharing and folder management are planned. Forgotten passphrases can't be recovered. <FolderLock className="hidden" /></p>
        </>)}
      </div>
      <Sheet open={!!open} onClose={() => setOpen(null)} title={open?.title ?? ""} size="sm" testId="secret-detail">
        {open && <Section>
          {open.username && <ListRow title="Username" subtitle={open.username} trailing={<IconButton icon={Copy} label="Copy username" size="sm" onClick={async () => report(await adapter.privateStore.copyField(open.id, "username"), "Copied")} />} />}
          <ListRow title={open.kind === "note" ? "Note" : "Password"} subtitle={<span className="font-mono tracking-widest">••••••••••••</span>} trailing={<div className="flex"><IconButton icon={Eye} label="Reveal" size="sm" onClick={async () => report(await adapter.privateStore.reveal(open.id, open.kind === "note" ? "note" : "password"), "Revealed")} data-testid="secret-reveal" />{open.kind === "credential" && <IconButton icon={Copy} label="Copy password" size="sm" onClick={async () => report(await adapter.privateStore.copyField(open.id, "password"), "Copied")} />}</div>} />
          {open.url && <ListRow title="Website" subtitle={open.url} />}
          <ListRow icon={Trash2} title="Delete" danger onClick={() => { setDel(open); setOpen(null); }} />
        </Section>}
      </Sheet>
      <Sheet open={!!del} onClose={() => setDel(null)} title="Delete permanently?" size="sm" footer={<><Button variant="ghost" onClick={() => setDel(null)}>Cancel</Button><Button variant="danger" icon={Trash2} onClick={async () => { if (del) report(await adapter.privateStore.remove(del.id), "Deleted"); setDel(null); }} data-testid="confirm-delete">Delete</Button></>}>
        <p className="text-sm text-ink-2">This removes the encrypted entry from your store. Copies in older encrypted backups aren't affected.</p>
      </Sheet>
      <Generator open={gen} onClose={() => setGen(false)} />
    </Screen>
  );
}
