import { forwardRef, useCallback, useEffect, useImperativeHandle, useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { cn } from "./util";
import { computeRange } from "./virtualRange";

export type VirtualListHandle = { scrollToIndex(index: number, align?: "start" | "center" | "end"): void; scrollToEnd(): void };

export type VirtualListProps<T> = {
  items: readonly T[];
  getKey(item: T, index: number): string;
  /** Initial height guess (px). Real heights are measured with ResizeObserver. */
  estimateSize: number | ((item: T, index: number) => number);
  renderItem(item: T, index: number): ReactNode;
  /** "self": the list is its own scroller. "parent": virtualize against the nearest scrolling ancestor (e.g. Screen body). */
  scroll?: "self" | "parent";
  overscan?: number;
  /** Chat mode: start at the bottom and follow new items while the user is at the bottom. */
  stickToBottom?: boolean;
  className?: string; innerClassName?: string; ariaLabel: string; role?: "list" | "log" | "grid" | "listbox";
  header?: ReactNode; footer?: ReactNode; testId?: string;
};

function scrollParentOf(el: HTMLElement | null): HTMLElement | null {
  for (let p = el?.parentElement; p; p = p.parentElement) { const o = getComputedStyle(p).overflowY; if (o === "auto" || o === "scroll") return p; }
  return null;
}

/**
 * Dependency-free windowed list with dynamic row measurement, roving keyboard
 * focus (↑ ↓ Home End PgUp PgDn) and an imperative scroll handle. Renders only
 * the visible window, so 10k+ rows stay smooth on Android WebView and desktop.
 */
function VirtualListInner<T>(p: VirtualListProps<T>, ref: React.ForwardedRef<VirtualListHandle>) {
  const { items, getKey, estimateSize, renderItem, scroll = "self", overscan = 6, stickToBottom } = p;
  const root = useRef<HTMLDivElement>(null);
  const inner = useRef<HTMLDivElement>(null);
  const scroller = useRef<HTMLElement | null>(null);
  const [sizes, setSizes] = useState<ReadonlyMap<string, number>>(() => new Map());
  const [win, setWin] = useState({ top: 0, height: 800 });
  const atBottom = useRef(true);
  const programmatic = useRef(false);
  const raf = useRef(0);
  const focusIdx = useRef(0);

  const offsets = useMemo(() => {
    const o = new Array<number>(items.length + 1); o[0] = 0;
    for (let i = 0; i < items.length; i++) {
      const k = getKey(items[i], i);
      o[i + 1] = o[i] + (sizes.get(k) ?? (typeof estimateSize === "number" ? estimateSize : estimateSize(items[i], i)));
    }
    return o;
  }, [items, getKey, estimateSize, sizes]);
  const total = offsets[items.length];

  const read = useCallback(() => {
    const s = scroller.current; if (!s || !inner.current) return;
    const listTop = scroll === "self" ? 0 : inner.current.getBoundingClientRect().top - s.getBoundingClientRect().top + s.scrollTop;
    setWin({ top: s.scrollTop - listTop, height: s.clientHeight });
  }, [scroll]);

  useLayoutEffect(() => {
    scroller.current = scroll === "self" ? root.current : scrollParentOf(root.current);
    const s = scroller.current; if (!s) return;
    const on = () => { cancelAnimationFrame(raf.current); raf.current = requestAnimationFrame(read); };
    // Only user scrolling changes the "pinned to bottom" decision; measurement/resizes keep it.
    const onScroll = () => { if (!programmatic.current) atBottom.current = s.scrollHeight - s.scrollTop - s.clientHeight < 48; programmatic.current = false; on(); };
    s.addEventListener("scroll", onScroll, { passive: true });
    const ro = new ResizeObserver(on); ro.observe(s);
    read();
    return () => { s.removeEventListener("scroll", onScroll); ro.disconnect(); cancelAnimationFrame(raf.current); };
  }, [scroll, read]);

  // Chat: pin to bottom initially and when new items arrive while pinned.
  useLayoutEffect(() => { const el = scroller.current; if (stickToBottom && atBottom.current && el && el.scrollHeight - el.scrollTop - el.clientHeight > 1) { programmatic.current = true; el.scrollTop = el.scrollHeight; } }, [stickToBottom, items.length, total]);

  const [measureRO] = useState(() => typeof ResizeObserver === "undefined" ? null : new ResizeObserver((entries) => {
    const measured: [string, number][] = [];
    for (const e of entries) { const el = e.target as HTMLElement; const h = Math.round(el.offsetHeight); if (h && el.dataset.vkey) measured.push([el.dataset.vkey, h]); }
    if (!measured.length) return;
    setSizes((prev) => {
      if (measured.every(([k, h]) => prev.get(k) === h)) return prev;
      const next = new Map(prev); for (const [k, h] of measured) next.set(k, h); return next;
    });
  }));
  useEffect(() => () => measureRO?.disconnect(), [measureRO]);
  const measure = useCallback((el: HTMLDivElement | null) => { if (el && measureRO) measureRO.observe(el); }, [measureRO]);

  const scrollToIndex = useCallback((i: number, align: "start" | "center" | "end" = "center") => {
    const s = scroller.current; if (!s || !inner.current) return;
    const listTop = scroll === "self" ? 0 : inner.current.getBoundingClientRect().top - s.getBoundingClientRect().top + s.scrollTop;
    const top = offsets[i] ?? 0, h = (offsets[i + 1] ?? top) - top;
    s.scrollTop = listTop + (align === "start" ? top : align === "end" ? top + h - s.clientHeight : top + h / 2 - s.clientHeight / 2);
  }, [offsets, scroll]);
  useImperativeHandle(ref, () => ({ scrollToIndex, scrollToEnd: () => { if (scroller.current) scroller.current.scrollTop = scroller.current.scrollHeight; } }), [scrollToIndex]);

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const keys: Record<string, number> = { ArrowDown: 1, ArrowUp: -1, PageDown: 10, PageUp: -10 };
    let next: number | null = null;
    if (e.key in keys) next = focusIdx.current + keys[e.key];
    else if (e.key === "Home") next = 0; else if (e.key === "End") next = items.length - 1;
    if (next === null || !items.length) return;
    if ((e.target as HTMLElement).closest("input,textarea")) return;
    e.preventDefault();
    next = Math.max(0, Math.min(items.length - 1, next)); focusIdx.current = next;
    scrollToIndex(next);
    const idx = next;
    requestAnimationFrame(() => requestAnimationFrame(() => root.current?.querySelector<HTMLElement>(`[data-vindex="${idx}"]`)?.querySelector<HTMLElement>("button,[tabindex],a")?.focus()));
  };

  const [start, end] = computeRange(offsets, win.top, win.height, overscan);
  const rows = [];
  for (let i = start; i < end; i++) {
    const k = getKey(items[i], i);
    rows.push(<div key={k} ref={measure} data-vkey={k} data-vindex={i} className="absolute inset-x-0" style={{ transform: `translateY(${offsets[i]}px)` }} onFocus={() => { focusIdx.current = i; }}>{renderItem(items[i], i)}</div>);
  }
  return (
    <div ref={root} role={p.role ?? "list"} aria-label={p.ariaLabel} aria-rowcount={items.length} onKeyDown={onKeyDown} data-testid={p.testId}
      className={cn(scroll === "self" && "min-h-0 overflow-y-auto overscroll-contain", p.className)}>
      {p.header}
      <div ref={inner} className={cn("relative w-full", p.innerClassName)} style={{ height: total }}>{rows}</div>
      {p.footer}
    </div>
  );
}

export const VirtualList = forwardRef(VirtualListInner) as <T>(p: VirtualListProps<T> & { ref?: React.Ref<VirtualListHandle> }) => ReturnType<typeof VirtualListInner>;

/** Responsive virtual grid: rows of `columns` computed from container width and `minItemWidth`. */
export function VirtualGrid<T>({ items, getKey, minItemWidth, gap = 8, rowHeight, renderItem, ariaLabel, scroll = "parent", className, testId }: {
  items: readonly T[]; getKey(item: T): string; minItemWidth: number; gap?: number; rowHeight(itemWidth: number): number; renderItem(item: T, index: number): ReactNode;
  ariaLabel: string; scroll?: "self" | "parent"; className?: string; testId?: string;
}) {
  const box = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  useLayoutEffect(() => {
    const el = box.current; if (!el) return;
    const ro = new ResizeObserver(() => setWidth(el.clientWidth)); ro.observe(el); setWidth(el.clientWidth);
    return () => ro.disconnect();
  }, []);
  const cols = Math.max(1, Math.floor((width + gap) / (minItemWidth + gap)));
  const itemW = width ? (width - gap * (cols - 1)) / cols : minItemWidth;
  const rows = useMemo(() => { const r: { key: string; items: T[]; start: number }[] = []; for (let i = 0; i < items.length; i += cols) r.push({ key: `${cols}:${getKey(items[i])}`, items: items.slice(i, i + cols) as T[], start: i }); return r; }, [items, cols, getKey]);
  const h = rowHeight(itemW) + gap;
  return (
    <div ref={box} className={className}>
      {width > 0 && <VirtualList items={rows} getKey={(r) => r.key} estimateSize={h} scroll={scroll} ariaLabel={ariaLabel} role="grid" testId={testId}
        renderItem={(r) => <div className="grid" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`, gap, paddingBottom: gap }}>{r.items.map((it, j) => <div key={getKey(it)} className="min-w-0">{renderItem(it, r.start + j)}</div>)}</div>} />}
    </div>
  );
}
