import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { computeRange } from "@/ui/virtualRange";
import { placeMenu, useContextMenu, type MenuItem } from "@/ui/ContextMenu";
import { ContextMenuProvider } from "@/ui/ContextMenuProvider";
import { triageFiles } from "@/app/drop";
import { LARGE, makeMessages } from "@/fixtures/large";

describe("virtualization", () => {
  const offsets = Array.from({ length: 10001 }, (_, i) => i * 50); // 10k rows × 50px
  it("renders only the visible window plus overscan", () => {
    const [s, e] = computeRange(offsets, 5000, 800, 5);
    expect(s).toBe(95); expect(e).toBe(122); expect(e - s).toBeLessThan(40);
  });
  it("clamps at both ends", () => {
    expect(computeRange(offsets, -100, 800, 5)[0]).toBe(0);
    expect(computeRange(offsets, 10000 * 50, 800, 5)[1]).toBe(10000);
    expect(computeRange([0], 0, 800, 5)).toEqual([0, 0]);
  });
  it("stress fixtures are deterministic and sized", () => {
    expect(makeMessages("c", LARGE.messages)).toHaveLength(5000);
  });
});

describe("context menu", () => {
  it("flips and clamps inside the viewport", () => {
    expect(placeMenu(10, 10, 200, 100, 1000, 800)).toEqual({ left: 10, top: 10 });
    expect(placeMenu(950, 780, 200, 100, 1000, 800)).toEqual({ left: 750, top: 680 });
  });
  it("opens at the cursor, skips disabled items and selects with the keyboard", () => {
    Object.defineProperty(window, "innerWidth", { value: 1280, configurable: true });
    const a = vi.fn(), b = vi.fn();
    const items: MenuItem[] = [{ id: "a", label: "Alpha", onSelect: a }, { id: "x", label: "Off", disabledReason: "no", onSelect: vi.fn() }, { id: "b", label: "Beta", onSelect: b }];
    function T() { const c = useContextMenu(); return <div data-testid="t" onContextMenu={c.onContextMenu("T", items)}>target</div>; }
    render(<ContextMenuProvider><T /></ContextMenuProvider>);
    fireEvent.contextMenu(screen.getByTestId("t"), { clientX: 100, clientY: 120 });
    const menu = screen.getByTestId("context-menu");
    fireEvent.keyDown(menu, { key: "ArrowDown" });
    fireEvent.keyDown(menu, { key: "Enter" });
    expect(b).toHaveBeenCalledOnce(); expect(a).not.toHaveBeenCalled();
    expect(screen.queryByTestId("context-menu")).toBeNull();
  });
});

describe("drag and drop triage", () => {
  it("rejects oversized and unaccepted files with reasons", () => {
    const big = new File([new Uint8Array(3_000_000)], "big.bin"); const ok = new File(["hi"], "a.txt", { type: "text/plain" }); const img = new File(["x"], "p.png", { type: "image/png" });
    const r = triageFiles([big, ok, img], { maxBytes: 2_900_000, accept: (f) => f.type !== "image/png" });
    expect(r.ok.map((f) => f.name)).toEqual(["a.txt"]);
    expect(r.rejected.map((x) => x.reason)).toEqual([expect.stringContaining("over"), "type not accepted here"]);
  });
});
