import { forwardRef, useId, useState, type InputHTMLAttributes, type ReactNode } from "react";
import { Eye, EyeOff, Search, X, type LucideIcon } from "lucide-react";
import { cn } from "./util";

type FieldProps = InputHTMLAttributes<HTMLInputElement> & { label?: string; hint?: ReactNode; error?: string | null; icon?: LucideIcon; reveal?: boolean; trailing?: ReactNode };

/** Labelled text field. `reveal` adds an accessible show/hide toggle for passphrases. */
export const TextField = forwardRef<HTMLInputElement, FieldProps>(function TextField({ label, hint, error, icon: I, reveal, trailing, className, type, id, ...rest }, ref) {
  const auto = useId(); const fid = id ?? auto; const [shown, setShown] = useState(false);
  return (
    <div className={className}>
      {label && <label htmlFor={fid} className="mb-1.5 block text-[13px] font-semibold text-ink-2">{label}</label>}
      <div className={cn("flex h-12 items-center gap-2 rounded-xl bg-s2 px-3.5 hairline transition-shadow focus-within:shadow-[inset_0_0_0_1.5px_rgb(var(--ember))] md:h-11", error && "shadow-[inset_0_0_0_1.5px_rgb(var(--danger))]")}>
        {I && <I className="size-[18px] shrink-0 text-ink-3" aria-hidden />}
        <input ref={ref} id={fid} type={reveal ? (shown ? "text" : "password") : type} aria-invalid={!!error || undefined}
          aria-describedby={error || hint ? `${fid}-d` : undefined} className="h-full min-w-0 flex-1 bg-transparent text-[15px] outline-none placeholder:text-ink-3 md:text-sm" {...rest} />
        {reveal && <button type="button" onClick={() => setShown((s) => !s)} aria-label={shown ? "Hide" : "Show"} className="grid size-9 place-items-center rounded-lg text-ink-3 hover:text-ink">{shown ? <EyeOff className="size-[18px]" /> : <Eye className="size-[18px]" />}</button>}
        {trailing}
      </div>
      {(error || hint) && <p id={`${fid}-d`} className={cn("mt-1.5 text-xs", error ? "text-danger" : "text-ink-3")}>{error ?? hint}</p>}
    </div>
  );
});

export function SearchField({ value, onChange, placeholder, className, autoFocus, testId }: { value: string; onChange(v: string): void; placeholder: string; className?: string; autoFocus?: boolean; testId?: string }) {
  return (
    <div className={cn("flex h-11 items-center gap-2 rounded-xl bg-s2 px-3 hairline focus-within:shadow-[inset_0_0_0_1.5px_rgb(var(--ember))] md:h-10", className)}>
      <Search className="size-[18px] shrink-0 text-ink-3" aria-hidden />
      <input data-testid={testId} autoFocus={autoFocus} type="search" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} aria-label={placeholder}
        className="h-full min-w-0 flex-1 bg-transparent text-[15px] outline-none placeholder:text-ink-3 md:text-sm [&::-webkit-search-cancel-button]:hidden" />
      {value && <button aria-label="Clear search" onClick={() => onChange("")} className="grid size-7 place-items-center rounded-md text-ink-3 hover:text-ink"><X className="size-4" /></button>}
    </div>
  );
}

export function Switch({ checked, onChange, label, description, disabledReason, testId }: { checked: boolean; onChange(v: boolean): void; label: string; description?: ReactNode; disabledReason?: string | null; testId?: string }) {
  const id = useId();
  return (
    <div className={cn("flex min-h-[56px] items-center gap-4 py-2", disabledReason && "opacity-55")}>
      <div className="min-w-0 flex-1">
        <label htmlFor={id} className="text-[15px] font-medium md:text-sm">{label}</label>
        {(description || disabledReason) && <p className="mt-0.5 text-xs leading-relaxed text-ink-3">{disabledReason ?? description}</p>}
      </div>
      <button id={id} data-testid={testId} role="switch" type="button" aria-checked={checked} disabled={!!disabledReason} onClick={() => onChange(!checked)}
        className={cn("relative h-7 w-12 shrink-0 rounded-full transition-colors duration-200", checked ? "bg-ember" : "bg-s3 hairline")}>
        <span className={cn("absolute top-1 size-5 rounded-full bg-white shadow transition-transform duration-200", checked ? "translate-x-6" : "translate-x-1")} />
      </button>
    </div>
  );
}

/** Segmented control — replaces tiny dropdowns for 2–5 options on mobile and desktop. */
export function Segmented<T extends string>({ value, onChange, options, label, size = "md", className }: { value: T; onChange: (v: T) => void; options: { value: T; label: string; icon?: LucideIcon; disabledReason?: string }[]; label: string; size?: "sm" | "md"; className?: string }) {
  return (
    <div role="radiogroup" aria-label={label} className={cn("inline-flex shrink-0 gap-1 rounded-xl bg-s2 p-1 hairline", className)}>
      {options.map((o) => {
        const I = o.icon; const on = o.value === value;
        return (
          <button key={o.value} role="radio" aria-checked={on} disabled={!!o.disabledReason} title={o.disabledReason} onClick={() => onChange(o.value)}
            className={cn("inline-flex shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg px-3 font-semibold transition-colors disabled:opacity-40", size === "sm" ? "h-8 text-xs" : "h-9 text-[13px]", on ? "bg-s3 text-ink shadow-lift" : "text-ink-3 hover:text-ink")}>
            {I && <I className="size-4" aria-hidden />}{o.label}
          </button>
        );
      })}
    </div>
  );
}

/** Horizontal chip row. Never wraps; chips keep size; selection changes color only. */
export function ChipRow<T extends string>({ value, onChange, options, label, className }: { value: T; onChange: (v: T) => void; options: { value: T; label: string; count?: number }[]; label: string; className?: string }) {
  return (
    <div role="tablist" aria-label={label} className={cn("no-scrollbar flex h-14 items-center gap-2 overflow-x-auto", className)}>
      {options.map((o) => (
        <button key={o.value} role="tab" aria-selected={o.value === value} onClick={() => onChange(o.value)}
          className={cn("inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full px-3.5 text-[13px] font-semibold transition-colors", o.value === value ? "bg-ember/15 text-ember shadow-[inset_0_0_0_1px_rgb(var(--ember)/.5)]" : "bg-s2 text-ink-2 hairline hover:text-ink")}>
          {o.label}{o.count != null && <span className="tabular text-2xs opacity-70">{o.count}</span>}
        </button>
      ))}
    </div>
  );
}

export function Slider({ value, min, max, step = 1, onChange, label, format, vertical, className }: { value: number; min: number; max: number; step?: number; onChange(v: number): void; label: string; format?: (v: number) => string; vertical?: boolean; className?: string }) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <input type="range" aria-label={label} aria-valuetext={format?.(value)} min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))}
      style={{ background: `linear-gradient(to right, rgb(var(--ember)) ${pct}%, rgb(var(--surface-3)) ${pct}%)`, ...(vertical ? { writingMode: "vertical-lr", direction: "rtl" } : {}) }}
      className={cn("h-1.5 cursor-pointer appearance-none rounded-full accent-[rgb(var(--ember))] [&::-webkit-slider-thumb]:size-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:shadow [&::-moz-range-thumb]:size-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-white",
        vertical ? "h-32 w-1.5" : "w-full", className)} />
  );
}
