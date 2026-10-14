/** WebVTT tracks remain local; HTML/SRT documents are not interpreted as captions. */
export async function readWebVtt(file: Pick<File, "size" | "text">): Promise<string> {
  if (file.size > 2 * 1024 * 1024) throw new Error("Subtitles must be smaller than 2 MB");
  const text = await file.text();
  if (!/^\uFEFF?WEBVTT(?:[ \t]|\r?\n|$)/.test(text)) throw new Error("Choose a valid WebVTT file");
  return text;
}
