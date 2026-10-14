import { cn } from "./util";

/**
 * Official Locat mark (public/locat-official-logo.png, approved git blob
 * c465d010524032e1ec9f37b1e9b1c2722c7237cc). Never recolored or filtered.
 */
export function LocatMark({ size = 32, className }: { size?: number; className?: string }) {
  return <img src="/locat-official-logo.png" alt="Locat" width={size} height={size} className={cn("shrink-0 select-none rounded-[22%] object-contain", className)} draggable={false} />;
}

export function LocatWordmark({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <LocatMark size={30} />
      <span className="text-[17px] font-extrabold tracking-tight">Locat</span>
    </span>
  );
}
