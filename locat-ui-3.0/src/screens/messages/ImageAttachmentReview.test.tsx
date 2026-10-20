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

it("opens the detailed editor only from its nested photo option", () => {
  vi.stubGlobal("URL", { createObjectURL: vi.fn().mockReturnValue("blob:photo-preview"), revokeObjectURL: vi.fn() });
  const file = new File(["photo"], "camera-photo.jpg", { type: "image/jpeg" });
  const onEdit = vi.fn();
  const onSend = vi.fn().mockResolvedValue(undefined);
  render(<ImageAttachmentReview file={file} onClose={() => undefined} onSend={onSend} onEdit={onEdit} />);

  const framing = screen.getByTestId("image-framing-options");
  expect(framing).toHaveProperty("open", false);
  fireEvent.click(screen.getByText("Crop or rotate"));
  fireEvent.click(screen.getByRole("button", { name: "Open photo editor" }));
  expect(onEdit).toHaveBeenCalledOnce();
  expect(onSend).not.toHaveBeenCalled();
});

it("keeps animated GIFs original-only instead of converting a frame", () => {
  vi.stubGlobal("URL", { createObjectURL: vi.fn().mockReturnValue("blob:animated-photo"), revokeObjectURL: vi.fn() });
  const file = new File(["gif"], "animated.gif", { type: "image/gif" });
  render(<ImageAttachmentReview file={file} onClose={() => undefined} onSend={vi.fn().mockResolvedValue(undefined)} onEdit={() => undefined} />);
  expect(screen.getByText(/Animated GIFs stay in their original format/)).toBeInTheDocument();
  expect(screen.queryByTestId("image-framing-options")).not.toBeInTheDocument();
});
