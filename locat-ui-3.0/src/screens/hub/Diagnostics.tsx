import { useMemo } from "react";
import { Activity, CheckCircle2, MinusCircle, XCircle } from "lucide-react";
import { useSession } from "@/app/session";
import { Screen } from "@/layouts/Screen";
import { Banner, Section, ListRow } from "@/ui";

/** Diagnostics: real browser capability probes (read-only, no side effects). */
export default function Diagnostics() {
  const { platform } = useSession();
  const checks = useMemo(() => {
    const v = document.createElement("video"); const a = document.createElement("audio");
    const c = (t: string, el: HTMLMediaElement) => (el.canPlayType(t) === "probably" ? "yes" : el.canPlayType(t) === "maybe" ? "maybe" : "no");
    return [
      ["H.264 / AAC (MP4)", c('video/mp4; codecs="avc1.42E01E, mp4a.40.2"', v)], ["HEVC / H.265", c('video/mp4; codecs="hvc1"', v)], ["AV1", c('video/mp4; codecs="av01.0.05M.08"', v)], ["VP9 (WebM)", c('video/webm; codecs="vp9"', v)],
      ["FLAC", c("audio/flac", a)], ["Opus", c('audio/ogg; codecs="opus"', a)], ["ALAC / M4A", c("audio/mp4", a)],
      ["Media Source Extensions (HLS.js)", "MediaSource" in window ? "yes" : "no"], ["Web Audio (EQ)", "AudioContext" in window ? "yes" : "no"], ["Picture-in-picture", platform.capabilities.pictureInPicture ? "yes" : "no"],
      ["WebRTC (Remote)", "RTCPeerConnection" in window ? "yes" : "no"], ["Web Crypto (E2EE)", crypto?.subtle ? "yes" : "no"], ["IndexedDB (local history)", "indexedDB" in window ? "yes" : "no"], ["Notifications", "Notification" in window ? "yes" : "no"],
    ] as const;
  }, [platform]);
  const I = { yes: CheckCircle2, maybe: MinusCircle, no: XCircle } as const;
  const T = { yes: "text-ok", maybe: "text-warn", no: "text-danger" } as const;
  return (
    <Screen title="Diagnostics" subtitle={`Runtime: ${platform.kind}`} testId="diagnostics-screen">
      <div className="mx-auto max-w-3xl">
        <Banner className="mb-5" tone="neutral" icon={Activity} title="These are live checks of this browser/runtime">"Maybe" means the decoder may work depending on the file's profile. Success here isn't a 4K performance guarantee.</Banner>
        <Section title="Capabilities">{checks.map(([k, v]) => { const Icon = I[v]; return <ListRow key={k} title={k} trailing={<span className={`flex items-center gap-1.5 text-xs font-semibold ${T[v]}`}><Icon className="size-4" />{v}</span>} />; })}</Section>
      </div>
    </Screen>
  );
}
