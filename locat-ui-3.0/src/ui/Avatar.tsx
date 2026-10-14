import type { ReactNode } from "react";
import { ChevronRight, type LucideIcon } from "lucide-react";
import { cn } from "./util";

const initials = (n: string) => n.replace(/[^\p{L}\p{N}\s]/gu, "").split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join("");
const hue = (n: string) => [...n].reduce((a, c) => (a * 31 + c.charCodeAt(0)) % 360, 7);

/** Titanium avatar with optional presence ring. Deterministic color; no network image in preview. */
export function Avatar({ name, src, size = 44, presence, group, className }: { name: string; src?: string; size?: number; presence?: "online" | "offline" | "hidden"; group?: boolean; className?: string }) {
  const h = hue(name);
  return (
    <span className={cn("relative inline-grid shrink-0 place-items-center", className)} style={{ width: size, height: size }}>
      <span className={cn("grid size-full place-items-center overflow-hidden font-bold text-white/90", group ? "rounded-[30%]" : "rounded-full")}
        style={{ background: src ? undefined : `linear-gradient(145deg, hsl(${h} 30% 42%), hsl(${(h + 30) % 360} 25% 20%))`, fontSize: size * 0.36 }}>
        {src ? <img src={src} alt="" className="size-full object-cover" /> : initials(name)}
      </span>
      {presence === "online" && <span aria-label="Online" className="absolute bottom-0 right-0 rounded-full bg-ok ring-2 ring-canvas" style={{ width: size * 0.26, height: size * 0.26 }} />}
    </span>
  );
}

/** Settings/list row with 56px touch height, optional leading icon and trailing slot. */
export function ListRow({ icon: I, title, subtitle, trailing, onClick, chevron, danger, testId, disabledReason, className }: {
  icon?: LucideIcon; title: ReactNode; subtitle?: ReactNode; trailing?: ReactNode; onClick?: () => void; chevron?: boolean; danger?: boolean; testId?: string; disabledReason?: string; className?: string;
}) {
  const inner = (
    <>
      {I && <span className={cn("grid size-9 shrink-0 place-items-center rounded-xl bg-s3", danger ? "text-danger" : "text-ink-2")}><I className="size-[18px]" aria-hidden /></span>}
      <span className="min-w-0 flex-1 text-left">
        <span className={cn("block truncate text-[15px] font-medium md:text-sm", danger && "text-danger")}>{title}</span>
        {(subtitle || disabledReason) && <span className="mt-0.5 block truncate text-xs text-ink-3">{disabledReason ?? subtitle}</span>}
      </span>
      {trailing}
      {chevron && <ChevronRight className="size-4 shrink-0 text-ink-3" aria-hidden />}
    </>
  );
  const cls = cn("flex min-h-[60px] w-full items-center gap-3 px-4 py-2.5 md:min-h-[52px]", className);
  return onClick ? (
    <button type="button" data-testid={testId} onClick={onClick} disabled={!!disabledReason} className={cn(cls, "transition-colors hover:bg-s2 active:bg-s3 disabled:opacity-50")}>{inner}</button>
  ) : <div data-testid={testId} className={cls}>{inner}</div>;
}

/** Grouped list section with hairline dividers — the primary settings/info container. */
export function Section({ title, children, footer, className, action }: { title?: string; children: ReactNode; footer?: ReactNode; className?: string; action?: ReactNode }) {
  return (
    <section className={cn("mb-6", className)}>
      {(title || action) && <div className="mb-2 flex items-center justify-between px-1"><h3 className="text-2xs font-bold uppercase tracking-[.12em] text-ink-3">{title}</h3>{action}</div>}
      <div className="divide-y divide-line overflow-hidden rounded-2xl bg-s1 hairline">{children}</div>
      {footer && <p className="mt-2 px-1 text-xs leading-relaxed text-ink-3">{footer}</p>}
    </section>
  );
}

export function SectionTitle({ children, action, className }: { children: ReactNode; action?: ReactNode; className?: string }) {
  return <div className={cn("mb-3 flex items-end justify-between gap-3", className)}><h2 className="text-[15px] font-bold tracking-tight">{children}</h2>{action}</div>;
}
