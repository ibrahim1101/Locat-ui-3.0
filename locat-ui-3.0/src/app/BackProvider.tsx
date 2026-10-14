import { useCallback, useEffect, useMemo, useRef, type ReactNode } from "react";
import { useLocation, useNavigate } from "react-router";
import type { BackOutcome } from "@/contracts/platform";
import { useToast } from "@/ui/Toast";
import { BackContext, parentRoute } from "./back";

type Layer = { id: number; close: () => void };

declare global { interface Window { locatBack?: () => BackOutcome } }

/**
 * Implements the Android Back contract (docs/LOCAT_PLATFORM_BEHAVIOR.md):
 * keyboard → topmost overlay → detail→parent → history → root double-back exit.
 * The Capacitor wrapper should call `window.locatBack()` from its backButton
 * listener and call App.exitApp() when it returns "exit".
 */
export function BackProvider({ rootPath, children }: { rootPath: string; children: ReactNode }) {
  const layers = useRef<Layer[]>([]);
  const seq = useRef(0);
  const armedAt = useRef(0);
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();

  const push = useCallback((close: () => void) => {
    const id = ++seq.current;
    layers.current.push({ id, close });
    return () => { layers.current = layers.current.filter((l) => l.id !== id); };
  }, []);

  const handleBack = useCallback((): BackOutcome => {
    const el = document.activeElement as HTMLElement | null;
    if (el && /^(INPUT|TEXTAREA)$/.test(el.tagName) && window.innerWidth < 768) { el.blur(); return "keyboard"; }
    const top = layers.current[layers.current.length - 1];
    if (top) { top.close(); return "overlay"; }
    const parent = parentRoute(location.pathname);
    if (parent) { navigate(parent); return "navigated"; }
    if (location.pathname !== rootPath && location.pathname !== "/") {
      if ((window.history.state?.idx ?? 0) > 0) navigate(-1); else navigate(rootPath);
      return "navigated";
    }
    if (Date.now() - armedAt.current < 2000) return "exit";
    armedAt.current = Date.now();
    toast.show({ title: "Press back again to exit Locat", tone: "neutral" });
    return "exit-armed";
  }, [location.pathname, navigate, rootPath, toast]);

  useEffect(() => {
    window.locatBack = handleBack;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && layers.current.length) { e.preventDefault(); layers.current[layers.current.length - 1].close(); }
    };
    window.addEventListener("keydown", onKey);
    return () => { window.removeEventListener("keydown", onKey); delete window.locatBack; };
  }, [handleBack]);

  const value = useMemo(() => ({ handleBack, push }), [handleBack, push]);
  return <BackContext.Provider value={value}>{children}</BackContext.Provider>;
}
