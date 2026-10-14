import type { ReactNode } from "react";
import { AlertTriangle, Ban, CloudOff, FlaskConical, Lock, MonitorX, RefreshCw, ShieldOff, Sparkles, type LucideIcon } from "lucide-react";
import type { Availability, ImplementationStatus } from "@/contracts/common";
import { Button } from "./Button";
import { cn } from "./util";

export function Badge({ tone = "neutral", children, className, dot }: { tone?: "neutral" | "ember" | "ok" | "warn" | "danger" | "info" | "planned"; children: ReactNode; className?: string; dot?: boolean }) {
  const t = { neutral: "bg-s3 text-ink-2", ember: "bg-ember/15 text-ember", ok: "bg-ok/12 text-ok", warn: "bg-warn/12 text-warn", danger: "bg-danger/12 text-danger", info: "bg-info/12 text-info", planned: "bg-planned/14 text-planned" }[tone];
  return <span className={cn("inline-flex h-6 shrink-0 items-center gap-1.5 rounded-full px-2.5 text-2xs font-semibold uppercase tracking-wide", t, className)}>{dot && <span className="size-1.5 rounded-full bg-current" />}{children}</span>;
}

const AV: Record<Availability, { label: string; tone: Parameters<typeof Badge>[0]["tone"] }> = {
  available: { label: "Available", tone: "ok" }, beta: { label: "Beta", tone: "ember" }, experimental: { label: "Experimental", tone: "warn" },
  planned: { label: "Planned", tone: "planned" }, offline: { label: "Needs server", tone: "neutral" }, locked: { label: "Locked", tone: "neutral" },
  "permission-restricted": { label: "Permission", tone: "warn" }, "admin-only": { label: "Admin", tone: "info" }, unsupported: { label: "Unsupported", tone: "neutral" },
};
export function AvailabilityBadge({ value, hideAvailable }: { value: Availability; hideAvailable?: boolean }) {
  if (hideAvailable && value === "available") return null;
  return <Badge tone={AV[value].tone}>{AV[value].label}</Badge>;
}

const IMPL: Record<ImplementationStatus, { label: string; tone: Parameters<typeof Badge>[0]["tone"] }> = {
  implemented: { label: "Implemented", tone: "ok" }, "implemented-unverified": { label: "Implemented · unverified", tone: "ok" }, partial: { label: "Partial", tone: "ember" },
  experimental: { label: "Experimental", tone: "warn" }, scaffolded: { label: "Scaffolded", tone: "neutral" }, planned: { label: "Planned", tone: "planned" }, unresolved: { label: "Unresolved", tone: "danger" },
};
export const ImplBadge = ({ value }: { value: ImplementationStatus }) => <Badge tone={IMPL[value].tone}>{IMPL[value].label}</Badge>;

/** Inline contextual banner. Used for offline, preview-only, permission and limitation notices. */
export function Banner({ tone = "neutral", icon: I, title, children, action, className }: { tone?: "neutral" | "warn" | "danger" | "planned" | "ember" | "info"; icon?: LucideIcon; title: string; children?: ReactNode; action?: ReactNode; className?: string }) {
  const t = { neutral: "bg-s2 text-ink-2", warn: "bg-warn/10 text-warn", danger: "bg-danger/10 text-danger", planned: "bg-planned/10 text-planned", ember: "bg-ember/10 text-ember", info: "bg-info/10 text-info" }[tone];
  return (
    <div role="note" className={cn("flex flex-wrap items-start gap-3 rounded-xl p-3.5", t, className)}>
      {I && <I className="mt-0.5 size-[18px] shrink-0" aria-hidden />}
      <div className="min-w-0 flex-1 basis-48">
        <p className="text-sm font-semibold text-ink">{title}</p>
        {children && <div className="mt-0.5 text-[13px] leading-relaxed text-ink-2">{children}</div>}
      </div>
      {action}
    </div>
  );
}

export function PreviewOnlyBanner({ what, className }: { what: string; className?: string }) {
  return <Banner className={className} tone="planned" icon={FlaskConical} title="Design preview — not functional">{what} Controls are intentionally disabled until a real implementation is integrated.</Banner>;
}

type StateKind = "empty" | "error" | "offline" | "permission" | "locked" | "unauthorized" | "unsupported" | "planned";
const STATE_ICON: Record<StateKind, LucideIcon> = { empty: Sparkles, error: AlertTriangle, offline: CloudOff, permission: ShieldOff, locked: Lock, unauthorized: Ban, unsupported: MonitorX, planned: FlaskConical };

/** Full-region state: empty, error, offline, permission, locked, unauthorized, unsupported, planned. */
export function StateView({ kind, title, body, action, secondary, className, compact }: { kind: StateKind; title: string; body?: ReactNode; action?: ReactNode; secondary?: ReactNode; className?: string; compact?: boolean }) {
  const I = STATE_ICON[kind];
  const tone = kind === "error" ? "text-danger bg-danger/10" : kind === "planned" ? "text-planned bg-planned/10" : kind === "permission" ? "text-warn bg-warn/10" : "text-ink-2 bg-s2";
  return (
    <div className={cn("mx-auto flex max-w-sm flex-col items-center text-center", compact ? "py-8" : "py-16", className)} data-testid={`state-${kind}`}>
      <div className={cn("mb-4 grid size-14 place-items-center rounded-2xl", tone)}><I className="size-6" aria-hidden /></div>
      <h3 className="text-base font-bold">{title}</h3>
      {body && <p className="mt-1.5 text-sm leading-relaxed text-ink-2">{body}</p>}
      {(action || secondary) && <div className="mt-5 flex flex-wrap justify-center gap-2">{action}{secondary}</div>}
    </div>
  );
}

export const RetryButton = ({ onRetry }: { onRetry: () => void }) => <Button icon={RefreshCw} onClick={onRetry}>Try again</Button>;

export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cn("animate-pulse2 rounded-lg bg-s2", className)} />;
}

export function Meter({ value, tone = "ember", label, className }: { value: number; tone?: "ember" | "ok" | "warn" | "danger"; label: string; className?: string }) {
  const c = { ember: "bg-ember", ok: "bg-ok", warn: "bg-warn", danger: "bg-danger" }[tone];
  return (
    <div role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(value * 100)} className={cn("h-1.5 overflow-hidden rounded-full bg-s3", className)}>
      <div className={cn("h-full rounded-full transition-[width] duration-500", c)} style={{ width: `${Math.max(0, Math.min(1, value)) * 100}%` }} />
    </div>
  );
}

export const Kbd = ({ children }: { children: ReactNode }) => <kbd className="inline-flex h-5 min-w-5 items-center justify-center rounded-md bg-s3 px-1.5 font-mono text-[10px] text-ink-2 hairline">{children}</kbd>;
