import { Component, lazy, type ReactNode } from "react";
import { Navigate, Route, Routes } from "react-router";
import { useSession } from "./app/session";
import { BackProvider } from "./app/BackProvider";
import { AppShell } from "./layouts/AppShell";
import { EntryFlow } from "./screens/auth/Entry";
import { StateView, Button } from "./ui";
import { ContextMenuProvider } from "./ui/ContextMenuProvider";
import { DropProvider } from "./app/DropProvider";
import { LiveDiagnostics } from "./integration/LiveDiagnostics";
import { LiveContacts } from "./integration/LiveContacts";
import { LiveOverview } from "./integration/LiveOverview";
import { LiveDevices } from "./integration/LiveDevices";
import { LivePrivateStore } from "./integration/LivePrivateStore";
import { LiveModuleNotice } from "./integration/LiveModuleNotice";
import { FilesLayout } from "./screens/private/FilesLayout";

const Home = lazy(() => import("./screens/home/Home"));
const Modules = lazy(() => import("./screens/home/Modules"));
const Messages = lazy(() => import("./screens/messages/Messages"));
const Devices = lazy(() => import("./screens/devices/Devices"));
const PrivateStore = lazy(() => import("./screens/private/PrivateStore"));
const Search = lazy(() => import("./screens/search/Search"));
const Hub = lazy(() => import("./screens/hub/Hub"));
const Admin = lazy(() => import("./screens/hub/Admin"));
const Diagnostics = lazy(() => import("./screens/hub/Diagnostics"));
const Offline = lazy(() => import("./screens/offline/Offline"));
const Planned = lazy(() => import("./screens/planned/Planned"));
const Gallery = lazy(() => import("./screens/gallery/Gallery"));
const Settings = lazy(() => import("./screens/settings/Settings"));

class ErrorBoundary extends Component<{ children: ReactNode }, { error?: Error }> {
  state: { error?: Error } = {};
  static getDerivedStateFromError(error: Error) { return { error }; }
  render() {
    if (this.state.error) return <StateView kind="error" title="This screen hit a problem" body={this.state.error.message} action={<Button onClick={() => this.setState({ error: undefined })}>Try again</Button>} />;
    return this.props.children;
  }
}

export function App() {
  const { stage, prefs, adapter } = useSession();
  if (stage !== "app") return <EntryFlow />;
  const live = adapter.mode === "live";
  const root = prefs.startup === "home" ? "/home" : "/messages";
  return (
    <BackProvider rootPath={root}>
      <ContextMenuProvider><DropProvider><ErrorBoundary>
        <Routes>
          <Route element={<AppShell />}>
            <Route index element={<Navigate to={root} replace />} />
            <Route path="home" element={live ? <LiveOverview kind="home" /> : <Home />} />
            <Route path="modules" element={live ? <LiveOverview kind="modules" /> : <Modules />} />
            <Route path="messages/*" element={live ? <LiveContacts /> : <Messages />} />
            <Route path="devices" element={live ? <LiveDevices /> : <Devices />} />
            <Route path="files" element={<FilesLayout />}>
              <Route index element={<Navigate to="vault" replace />} />
              <Route path="vault" element={live ? <LivePrivateStore key="vault" kind="vault" /> : <PrivateStore kind="vault" />} />
              <Route path="secrets" element={live ? <LivePrivateStore key="secrets" kind="secrets" /> : <PrivateStore kind="secrets" />} />
            </Route>
            <Route path="search" element={live ? <LiveOverview kind="search" /> : <Search />} />
            <Route path="hub" element={live ? <LiveModuleNotice title="Hub" /> : <Hub />} />
            <Route path="admin" element={live ? <LiveModuleNotice title="Admin" /> : <Admin />} />
            <Route path="diagnostics" element={live ? <LiveDiagnostics /> : <Diagnostics />} />
            <Route path="offline" element={live ? <LiveDiagnostics offline /> : <Offline />} />
            <Route path="workspace" element={live ? <LiveModuleNotice title="workspace" /> : <Planned id="workspace" />} />
            <Route path="calendar" element={live ? <LiveModuleNotice title="calendar" /> : <Planned id="calendar" />} />
            <Route path="automate" element={live ? <LiveModuleNotice title="automate" /> : <Planned id="automate" />} />
            <Route path="share" element={live ? <LiveModuleNotice title="share" /> : <Planned id="share" />} />
            <Route path="extensions" element={live ? <LiveModuleNotice title="extensions" /> : <Planned id="extensions" />} />
            {adapter.mode === "preview" && <Route path="gallery" element={<Gallery />} />}
            <Route path="settings/*" element={live ? <LiveModuleNotice title="Settings" /> : <Settings />} />
            <Route path="profile" element={<Navigate to="/settings/profile" replace />} />
            <Route path="*" element={<Navigate to={root} replace />} />
          </Route>
        </Routes>
      </ErrorBoundary></DropProvider></ContextMenuProvider>
    </BackProvider>
  );
}
