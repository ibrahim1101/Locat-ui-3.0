import { useMemo } from "react";
import { Activity, CheckCircle2, MinusCircle, XCircle } from "lucide-react";
import { useSession } from "@/app/session";
import { Screen } from "@/layouts/Screen";
import { Banner, Section, ListRow } from "@/ui";

/** Diagnostics: real browser capability probes (read-only, no side effects). */
export default function Diagnostics() {
  const { platform } = useSession();
  const checks = useMemo(() => {
    return [
      ["Web Crypto", crypto?.subtle ? "yes" : "no"], ["IndexedDB (local history)", "indexedDB" in window ? "yes" : "no"], ["Notifications", "Notification" in window ? "yes" : "no"],
    ] as const;
  }, []);
  const I = { yes: CheckCircle2, maybe: MinusCircle, no: XCircle } as const;
  const T = { yes: "text-ok", maybe: "text-warn", no: "text-danger" } as const;
  return (
    <Screen title="Diagnostics" subtitle={`Runtime: ${platform.kind}`} testId="diagnostics-screen">
      <div className="mx-auto max-w-3xl">
        <Banner className="mb-5" tone="neutral" icon={Activity} title="These are live checks of this browser/runtime">Checks report the browser capabilities Locat uses for local history and account sessions.</Banner>
        <Section title="Capabilities">{checks.map(([k, v]) => { const Icon = I[v]; return <ListRow key={k} title={k} trailing={<span className={`flex items-center gap-1.5 text-xs font-semibold ${T[v]}`}><Icon className="size-4" />{v}</span>} />; })}</Section>
      </div>
    </Screen>
  );
}
