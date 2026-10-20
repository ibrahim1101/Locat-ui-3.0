// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { ImageAttachmentReview } from "./ImageAttachmentReview";
import { resizeImageCopy } from "@/integration/imageAttachmentTransform";

vi.mock("@/integration/imageAttachmentTransform", () => ({
  IMAGE_RESIZE_PRESETS: {
    large: { label: "Large", detail: "2048 px · best detail", maxDimension: 2048, quality: 0.9 },
    balanced: { label: "Balanced", detail: "1440 px · everyday sharing", maxDimension: 1440, quality: 0.82 },
    compact: { label: "Compact", detail: "1024 px · smallest copy", maxDimension: 1024, quality: 0.72 },
  },
  resizeImageCopy: vi.fn(),
}));

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

it("keeps an oversized original blocked and sends only the chosen resized copy", async () => {
  vi.stubGlobal("URL", { createObjectURL: vi.fn().mockReturnValue("blob:photo-preview"), revokeObjectURL: vi.fn() });
  const original = new File([new Uint8Array(2_900_001)], "camera-photo.jpg", { type: "image/jpeg" });
  const resized = new File(["small"], "camera-photo.jpg", { type: "image/jpeg" });
  vi.mocked(resizeImageCopy).mockResolvedValue(resized);
  const onSend = vi.fn().mockResolvedValue(undefined);
  render(<ImageAttachmentReview file={original} onClose={() => undefined} onSend={onSend} />);

  expect(screen.getByText(/above the 2.9 MB encrypted attachment limit/)).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Send original" })).toBeDisabled();
  expect(onSend).not.toHaveBeenCalled();

  fireEvent.click(screen.getByText("Resize a copy"));
  fireEvent.click(screen.getByRole("button", { name: /Balanced/ }));
  await waitFor(() => expect(resizeImageCopy).toHaveBeenCalledWith(original, "balanced"));
  await waitFor(() => expect(screen.getByRole("button", { name: "Send resized copy" })).toBeEnabled());
  fireEvent.click(screen.getByRole("button", { name: "Send resized copy" }));
  await waitFor(() => expect(onSend).toHaveBeenCalledWith(resized));
});
