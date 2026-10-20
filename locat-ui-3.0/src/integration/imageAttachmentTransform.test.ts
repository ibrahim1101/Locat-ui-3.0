// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import { resizeImageCopy } from "./imageAttachmentTransform";

afterEach(() => vi.unstubAllGlobals());

it("resizes a local photo copy to the selected maximum dimension and closes the bitmap", async () => {
  const close = vi.fn();
  vi.stubGlobal("createImageBitmap", vi.fn().mockResolvedValue({ width: 2400, height: 1200, close }));
  const drawImage = vi.fn();
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({ fillStyle: "", fillRect: vi.fn(), drawImage } as unknown as CanvasRenderingContext2D);
  vi.spyOn(HTMLCanvasElement.prototype, "toBlob").mockImplementation((callback) => callback(new Blob(["resized"], { type: "image/jpeg" })));
  const source = new File(["original"], "photo.jpg", { type: "image/jpeg", lastModified: 123 });
  const result = await resizeImageCopy(source, "balanced");
  expect(result).toMatchObject({ name: "photo.jpg", type: "image/jpeg", lastModified: 123 });
  expect(result.size).toBeGreaterThan(0);
  expect(createImageBitmap).toHaveBeenCalledWith(source, { imageOrientation: "from-image" });
  expect(drawImage).toHaveBeenCalledWith(expect.objectContaining({ width: 2400, height: 1200 }), 0, 0, 1440, 720);
  expect(close).toHaveBeenCalledOnce();
});

it("rejects formats and decoded image sizes outside safe local resizing limits", async () => {
  const unsupported = new File(["x"], "drawing.svg", { type: "image/svg+xml" });
  await expect(resizeImageCopy(unsupported, "balanced")).rejects.toThrow("JPEG, PNG, and WebP");
  vi.stubGlobal("createImageBitmap", vi.fn().mockResolvedValue({ width: 7000, height: 6000, close: vi.fn() }));
  await expect(resizeImageCopy(new File(["x"], "huge.png", { type: "image/png" }), "balanced")).rejects.toThrow("too large");
});
