import { forwardRef, useId, type ButtonHTMLAttributes, type ReactNode } from "react";
import { Loader2, type LucideIcon } from "lucide-react";
import { cn } from "./util";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "quiet";
type Size = "sm" | "md" | "lg";

export type ButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "disabled"> & {
  variant?: Variant; size?: Size; icon?: LucideIcon; trailingIcon?: LucideIcon; loading?: boolean;
  /** Disables and explains why (announced to assistive tech, shown on hover/long-press). */
  disabledReason?: string | null; disabled?: boolean; block?: boolean; children?: ReactNode;
};

const V: Record<Variant, string> = {
  primary: "bg-ember text-ember-ink hover:brightness-110 active:brightness-95 shadow-ember",
  secondary: "bg-s2 text-ink hairline hover:bg-s3 active:bg-s3",
  ghost: "text-ink-2 hover:bg-s2 hover:text-ink active:bg-s3",
  danger: "bg-danger/12 text-danger hover:bg-danger/20 active:bg-danger/25",
  quiet: "bg-transparent text-ember hover:bg-ember/10",
};
const S: Record<Size, string> = {
  sm: "h-9 px-3 text-[13px] gap-1.5 rounded-lg md:h-8",
  md: "h-11 px-4 text-sm gap-2 rounded-xl md:h-10",
  lg: "h-13 min-h-[52px] px-5 text-[15px] gap-2.5 rounded-xl",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "secondary", size = "md", icon: I, trailingIcon: T, loading, disabledReason, disabled, block, className, children, ...rest }, ref) {
  const rid = useId();
  const off = !!disabledReason || disabled || loading;
  return (
    <>
      <button ref={ref} type="button" {...rest} disabled={off} aria-busy={loading || undefined}
        aria-describedby={disabledReason ? rid : rest["aria-describedby"]} title={disabledReason ?? rest.title}
        className={cn("inline-flex select-none items-center justify-center whitespace-nowrap font-semibold transition-[background,filter,transform,color] duration-150 active:scale-[.98] disabled:pointer-events-none disabled:opacity-45 disabled:shadow-none", V[variant], S[size], block && "w-full", className)}>
        {loading ? <Loader2 className="size-4 animate-spin" aria-hidden /> : I && <I className="size-[18px] shrink-0" aria-hidden />}
        {children}
        {T && <T className="size-4 shrink-0 opacity-70" aria-hidden />}
      </button>
      {disabledReason && <span id={rid} className="sr-only">{disabledReason}</span>}
    </>
  );
});

export type IconButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "disabled"> & {
  icon: LucideIcon; label: string; active?: boolean; disabledReason?: string | null; tone?: "default" | "ember" | "danger"; size?: "sm" | "md" | "lg";
};
export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { icon: I, label, active, disabledReason, tone = "default", size = "md", className, ...rest }, ref) {
  const sz = size === "sm" ? "size-9 md:size-8" : size === "lg" ? "size-14" : "size-11 md:size-10";
  return (
    <button ref={ref} type="button" aria-label={label} title={disabledReason ?? label} aria-pressed={active} {...rest} disabled={!!disabledReason}
      className={cn("relative grid shrink-0 place-items-center rounded-xl transition-colors duration-150 active:scale-95 disabled:opacity-40 disabled:pointer-events-none", sz,
        tone === "ember" ? "bg-ember text-ember-ink hover:brightness-110 shadow-ember" : tone === "danger" ? "text-danger hover:bg-danger/12" : active ? "bg-ember/15 text-ember" : "text-ink-2 hover:bg-s2 hover:text-ink", className)}>
      <I className={size === "lg" ? "size-6" : "size-5"} aria-hidden />
    </button>
  );
});
