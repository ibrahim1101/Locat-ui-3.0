import type { ReactNode } from "react";
import { useNavigate } from "react-router";
import { ArrowLeft } from "lucide-react";
import { IconButton } from "@/ui/Button";
import { cn } from "@/ui/util";

/**
 * Standard screen frame: sticky, safe-area-aware header + independently
 * scrolling body. `back` renders an explicit up-navigation (mirrors Android Back).
 */
export function Screen({ title, subtitle, back, actions, toolbar, children, className, bodyClassName, testId, bleed }: {
  title: ReactNode; subtitle?: ReactNode; back?: string; actions?: ReactNode; toolbar?: ReactNode; children: ReactNode;
  className?: string; bodyClassName?: string; testId?: string; bleed?: boolean;
}) {
  const nav = useNavigate();
  return (
    <div className={cn("flex h-full min-h-0 flex-col", className)} data-testid={testId}>
      <header className="shrink-0 bg-canvas/85 pt-safe backdrop-blur-xl md:pt-0">
        <div className="flex h-16 items-center gap-2 px-4 md:h-[68px] md:px-6">
          {back && <IconButton icon={ArrowLeft} label="Back" onClick={() => nav(back)} className="-ml-2" />}
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-xl font-extrabold tracking-tight md:text-[22px]">{title}</h1>
            {subtitle && <p className="truncate text-xs text-ink-3">{subtitle}</p>}
          </div>
          {actions && <div className="flex shrink-0 items-center gap-1">{actions}</div>}
        </div>
        {toolbar && <div className="px-4 pb-1 md:px-6">{toolbar}</div>}
      </header>
      <div className={cn("min-h-0 flex-1 overflow-y-auto overscroll-contain", !bleed && "px-4 pb-6 pt-2 md:px-6", bodyClassName)}>{children}</div>
    </div>
  );
}

/** Readable max-width container for settings-like content on large windows. */
export const Readable = ({ children, className }: { children: ReactNode; className?: string }) => <div className={cn("mx-auto w-full max-w-3xl", className)}>{children}</div>;
