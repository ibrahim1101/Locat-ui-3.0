// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { VideoAttachmentReview } from "./VideoAttachmentReview";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

it("shows a local video preview and enforces the encrypted file limit before sending", async () => {
  vi.stubGlobal("URL", { createObjectURL: vi.fn().mockReturnValue("blob:video-preview"), revokeObjectURL: vi.fn() });
  const oversized = new File([new Uint8Array(2_900_001)], "clip.mp4", { type: "video/mp4" });
  const onSend = vi.fn().mockResolvedValue(undefined);
  const { rerender } = render(<VideoAttachmentReview file={oversized} onClose={() => undefined} onSend={onSend} />);
  expect(screen.getByRole("video", { name: "Preview of clip.mp4" })).toHaveAttribute("src", "blob:video-preview");
  expect(screen.getByRole("button", { name: "Send encrypted video" })).toBeDisabled();
  expect(onSend).not.toHaveBeenCalled();

  const small = new File(["video"], "clip.mp4", { type: "video/mp4" });
  rerender(<VideoAttachmentReview file={small} onClose={() => undefined} onSend={onSend} />);
  fireEvent.click(screen.getByRole("button", { name: "Send encrypted video" }));
  await waitFor(() => expect(onSend).toHaveBeenCalledWith(small));
});
