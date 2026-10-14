import { Component, lazy, type ReactNode } from "react";
import { Navigate, Route, Routes } from "react-router";
import { useSession } from "./app/session";
import { BackProvider } from "./app/BackProvider";
import { AppShell } from "./layouts/AppShell";
import { EntryFlow } from "./screens/auth/Entry";
import { StateView, Button } from "./ui";
import { ContextMenuProvider } from "./ui/ContextMenuProvider";
import { DropProvider } from "./app/DropProvider";
import { LiveModuleNotice } from "./integration/LiveModuleNotice";

const Home = lazy(() => import("./screens/home/Home"));
const Modules = lazy(() => import("./screens/home/Modules"));
const Messages = lazy(() => import("./screens/messages/Messages"));
const Cinema = lazy(() => import("./screens/cinema/Cinema"));
const Music = lazy(() => import("./screens/music/Music"));
const Photos = lazy(() => import("./screens/photos/Photos"));
const Devices = lazy(() => import("./screens/devices/Devices"));
const Remote = lazy(() => import("./screens/remote/Remote"));
const Sentinel = lazy(() => import("./screens/sentinel/Sentinel"));
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
  if (stage !== "app") return <EntryFlow />;\n  if (adapter.mode === "live") return <LiveModuleNotice title="Locat 3.0" />;
  const root = prefs.startup === "home" ? "/home" : "/messages";
  return (
    <BackProvider rootPath={root}>
      <ContextMenuProvider><DropProvider><ErrorBoundary>
        <Routes>
          <Route element={<AppShell />}>
            <Route index element={<Navigate to={root} replace />} />
            <Route path="home" element={<Home />} />
            <Route path="modules" element={<Modules />} />
            <Route path="messages/*" element={<Messages />} />
            <Route path="cinema/*" element={<Cinema />} />
            <Route path="music" element={<Music />} />
            <Route path="photos/*" element={<Photos />} />
            <Route path="devices" element={<Devices />} />
            <Route path="remote/*" element={<Remote />} />
            <Route path="sentinel" element={<Sentinel />} />
            <Route path="vault" element={<PrivateStore kind="vault" />} />
            <Route path="secrets" element={<PrivateStore kind="secrets" />} />
            <Route path="search" element={<Search />} />
            <Route path="hub" element={<Hub />} />
            <Route path="admin" element={<Admin />} />
            <Route path="diagnostics" element={<Diagnostics />} />
            <Route path="offline" element={<Offline />} />
            <Route path="workspace" element={<Planned id="workspace" />} />
            <Route path="calendar" element={<Planned id="calendar" />} />
            <Route path="automate" element={<Planned id="automate" />} />
            <Route path="share" element={<Planned id="share" />} />
            <Route path="extensions" element={<Planned id="extensions" />} />
            {adapter.mode === "preview" && <Route path="gallery" element={<Gallery />} />}
            <Route path="settings/*" element={<Settings />} />
            <Route path="profile" element={<Navigate to="/settings/profile" replace />} />
            <Route path="*" element={<Navigate to={root} replace />} />
          </Route>
        </Routes>
      </ErrorBoundary></DropProvider></ContextMenuProvider>
    </BackProvider>
  );
}
