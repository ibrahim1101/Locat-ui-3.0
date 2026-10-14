/** Binary-search the visible [start, end) window from cumulative offsets (length n+1). Pure, unit-tested. */
export function computeRange(offsets: number[], top: number, height: number, overscan: number): [number, number] {
  const n = offsets.length - 1;
  if (n <= 0) return [0, 0];
  const find = (y: number) => { let lo = 0, hi = n - 1; while (lo < hi) { const mid = (lo + hi + 1) >> 1; if (offsets[mid] <= y) lo = mid; else hi = mid - 1; } return lo; };
  const start = Math.max(0, find(Math.max(0, top)) - overscan);
  const end = Math.min(n, find(top + height) + 1 + overscan);
  return [start, end];
}
