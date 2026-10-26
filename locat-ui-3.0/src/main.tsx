import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router";
import "@fontsource-variable/manrope";
import "@fontsource/jetbrains-mono/400.css";
import "./index.css";
import { App } from "./App";
import { SessionProvider } from "./app/SessionProvider";
import { ToastProvider } from "./ui/ToastProvider";
import { previewAdapter } from "./fixtures/previewAdapter";
import { FIXTURE_USER } from "./fixtures/data";
import { LiveLocatRoot } from "./integration/LiveLocatRoot";
import type { PlatformInfo } from "./contracts";

if(import.meta.env.PROD&&"serviceWorker"in navigator)void navigator.serviceWorker.register("/sw.js",{scope:"/"}).catch(error=>console.warn("Locat offline sharing is unavailable",error));

/** Standalone preview entry. The live app starts at integration/LiveLocatRoot. */
const platform: PlatformInfo = {
  kind: "browser", os: "unknown",
  capabilities: { nativeSaveDialog: false, notifications: "Notification" in window, biometric: false, shareTarget: false, widgets: false },
};

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <ToastProvider>
        {import.meta.env.VITE_LOCAT_LIVE !== "false" ? <LiveLocatRoot platform={platform} /> : <SessionProvider adapter={previewAdapter} initialUser={FIXTURE_USER} platform={platform}
          initialConnection={{ mode: "server", server: "connected", origin: FIXTURE_USER.serverOrigin, route: "same-lan", pendingOutbox: 0, lastSyncAt: Date.now() }}>
          <App />
        </SessionProvider>}
      </ToastProvider>
    </BrowserRouter>
  </StrictMode>,
);
