import type { ReactNode } from "react";
import { useNavigate } from "react-router";
import { moduleById, type ModuleId } from "@/app/registry";
import { useSession } from "@/app/session";
import { Button, StateView } from "@/ui";

/**
 * Authorization/availability gate. Admin-only and server-only modules render an
 * explanatory state instead of their screen. Planned modules still render their
 * designed preview screen (which itself disables controls).
 * NOTE: UI gating is not a security boundary; the Locat server remains authoritative.
 */
export function ModuleGate({ id, children }: { id: ModuleId; children: ReactNode }) {
  const { availability } = useSession();
  const nav = useNavigate();
  const a = availability(id);
  const m = moduleById(id);
  if (a.availability === "admin-only")
    return <StateView kind="unauthorized" title={`${m.name} is for administrators`} body="Your account doesn't have server administrator access. Ask the person who runs your Locat server." action={<Button onClick={() => nav("/home")}>Go home</Button>} />;
  if (a.availability === "offline")
    return <StateView kind="offline" title={`${m.name} needs your Locat server`} body={`${a.reason}. App preferences and device diagnostics remain available here.`} action={<Button variant="primary" onClick={() => nav("/offline")}>Connection details</Button>} secondary={<Button onClick={() => nav("/home")}>Home</Button>} />;
  return <>{children}</>;
}
