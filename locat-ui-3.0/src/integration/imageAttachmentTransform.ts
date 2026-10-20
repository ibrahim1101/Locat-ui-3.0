export type ImageResizePreset = "large" | "balanced" | "compact";

export const IMAGE_RESIZE_PRESETS: Record<ImageResizePreset, { label: string; detail: string; maxDimension: number; quality: number }> = {
  large: { label: "Large", detail: "2048 px · best detail", maxDimension: 2048, quality: 0.9 },
  balanced: { label: "Balanced", detail: "1440 px · everyday sharing", maxDimension: 1440, quality: 0.82 },
  compact: { label: "Compact", detail: "1024 px · smallest copy", maxDimension: 1024, quality: 0.72 },
};

const supported = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_DECODED_PIXELS = 36_000_000;
const MAX_INPUT_BYTES = 40_000_000;

function canvasBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("The resized image could not be created.")), type, quality);
  });
}

export async function resizeImageCopy(file: File, presetId: ImageResizePreset): Promise<File> {
  const preset = IMAGE_RESIZE_PRESETS[presetId];
  if (!preset) throw new Error("Choose a valid image size.");
  if (!supported.has(file.type)) throw new Error("Resize is available for JPEG, PNG, and WebP photos.");
  if (!file.size || file.size > MAX_INPUT_BYTES) throw new Error("Choose an image smaller than 40 MB to resize safely.");
  if (typeof createImageBitmap !== "function") throw new Error("Image resizing is not available in this browser.");

  let bitmap: ImageBitmap | undefined;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
    if (!Number.isFinite(bitmap.width) || !Number.isFinite(bitmap.height) || bitmap.width < 1 || bitmap.height < 1 || bitmap.width * bitmap.height > MAX_DECODED_PIXELS) {
      throw new Error("This image is too large to resize safely on this device.");
    }
    const scale = Math.min(1, preset.maxDimension / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Image resizing is not available in this browser.");
    if (file.type === "image/jpeg") {
      context.fillStyle = "#fff";
      context.fillRect(0, 0, width, height);
    }
    context.drawImage(bitmap, 0, 0, width, height);
    const blob = await canvasBlob(canvas, file.type, file.type === "image/png" ? 1 : preset.quality);
    if (blob.type !== file.type) throw new Error("This browser could not preserve the photo format while resizing.");
    return new File([blob], file.name, { type: file.type, lastModified: file.lastModified });
  } finally {
    bitmap?.close();
  }
}
