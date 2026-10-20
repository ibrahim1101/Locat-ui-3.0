// @vitest-environment jsdom
import { expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { Composer } from "./Composer";

it("keeps share choices nested by intent", () => {
  render(<Composer
    draft={{ text: "" }}
    capabilities={{
      text: { enabled: true }, image: { enabled: true }, file: { enabled: true }, voice: { enabled: true },
      location: { enabled: true }, gif: { enabled: true }, schedule: { enabled: true }, video: { enabled: true },
    }}
    onDraft={() => undefined}
    onSend={() => undefined}
    onCancelContext={() => undefined}
    onAttach={vi.fn()}
    onSchedule={() => undefined}
    onVoice={() => undefined}
  />);
  fireEvent.click(screen.getByTestId("composer-attach"));
  expect(screen.getByRole("menuitem", { name: "Photo, file or video" })).toBeInTheDocument();
  expect(screen.queryByRole("menuitem", { name: /Document or file/ })).not.toBeInTheDocument();

  fireEvent.click(screen.getByRole("menuitem", { name: "Photo, file or video" }));
  expect(screen.getByRole("menuitem", { name: /Photo · original or resized copy/ })).toBeInTheDocument();
  expect(screen.getByRole("menuitem", { name: /Document or file/ })).toBeInTheDocument();
  expect(screen.getByRole("menuitem", { name: /Video · up to 2.9 MB/ })).toBeInTheDocument();
});
