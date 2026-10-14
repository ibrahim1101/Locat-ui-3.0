import { useLocation, useNavigate } from "react-router";
import { Clapperboard, Image, Music2, ShieldOff, Settings2 } from "lucide-react";
import type { PermissionState } from "@/contracts/common";
import { Button, Segmented, StateView } from "@/ui";
import { Linking } from "./linking";

/** Media family switcher shown in Cinema / Music / Photos headers. */
export function MediaSwitcher() {
  const { pathname } = useLocation();
  const nav = useNavigate();
  const cur = (pathname.split("/")[1] ?? "cinema") as "cinema" | "music" | "photos";
  return <Segmented size="sm" label="Media section" value={cur} onChange={(v) => nav("/" + v)} options={[{ value: "cinema", label: "Cinema", icon: Clapperboard }, { value: "music", label: "Music", icon: Music2 }, { value: "photos", label: "Photos", icon: Image }]} />;
}

/**
 * Permission state for device media libraries (Android MediaStore / SAF).
 * Follows the contract: explain → request → if blocked offer system settings.
 */
export function MediaPermission({ state, kind, onRequest }: { state: PermissionState; kind: string; onRequest(): void }) {
  if (state === "granted") return null;
  if (state === "unsupported") return <StateView kind="unsupported" title={`${kind} library isn't available here`} body="This platform doesn't expose a device media library. You can still open individual files." />;
  if (state === "blocked") return <StateView kind="permission" title={`${kind} access is turned off`} body="You previously declined access. Turn it on in system settings to browse this device's library." action={<Button variant="primary" icon={Settings2} onClick={Linking.openSettings}>Open settings</Button>} />;
  return (
    <StateView kind="permission" title={state === "denied" ? `Locat still can't see your ${kind.toLowerCase()}` : `Show ${kind.toLowerCase()} from this device`}
      body={`Locat reads your ${kind.toLowerCase()} locally to build your library. Nothing is uploaded unless you choose to share it.`}
      action={<Button variant="primary" icon={ShieldOff} onClick={onRequest} data-testid="media-permission-request">{state === "denied" ? "Ask again" : "Allow access"}</Button>} />
  );
}
