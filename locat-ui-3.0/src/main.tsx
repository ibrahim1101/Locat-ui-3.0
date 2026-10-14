import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router";
import "@fontsource-variable/manrope";
import "@fontsource/jetbrains-mono/400.css";
import "./index.css";
import { App } from "./App";
import { SessionProvider } from "./app/SessionProvider";
import { PlayerProvider } from "./app/PlayerProvider";
import { ToastProvider } from "./ui/ToastProvider";
import { previewAdapter } from "./fixtures/previewAdapter";
import { FIXTURE_USER } from "./fixtures/data";
import type { PlatformInfo } from "./contracts";

/** Standalone preview entry. Production Locat mounts <App/> with a LiveLocatAdapter instead. */
const platform: PlatformInfo = {
  kind: "browser", os: "unknown",
  capabilities: { nativeSaveDialog: false, notifications: "Notification" in window, pictureInPicture: "pictureInPictureEnabled" in document, biometric: false, shareTarget: false, widgets: false, mediaStore: false, backgroundAudio: false },
};

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <ToastProvider>
        <SessionProvider adapter={previewAdapter} initialUser={FIXTURE_USER} platform={platform}
          initialConnection={{ mode: "server", server: "connected", origin: FIXTURE_USER.serverOrigin, route: "same-lan", pendingOutbox: 0, lastSyncAt: Date.now() }}>
          <PlayerProvider><App /></PlayerProvider>
        </SessionProvider>
      </ToastProvider>
    </BrowserRouter>
  </StrictMode>,
);
