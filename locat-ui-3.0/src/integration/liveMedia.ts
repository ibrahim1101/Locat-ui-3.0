import { createContext, useContext } from "react";
import type { LocalMediaItem } from "./localMediaStore";
export type LocalMediaContext = { items: LocalMediaItem[]; loading: boolean; error: string; serverError?: string; serverLibraries?: { name: string; count: number; available: boolean }[]; refreshServer?(): Promise<void>; importFiles(files: FileList | File[]): Promise<void>; update(item: LocalMediaItem): Promise<void>; remove(id: string): Promise<void> };
export const LiveMediaContext = createContext<LocalMediaContext | null>(null);
export function useLiveMedia() { const value = useContext(LiveMediaContext); if (!value) throw new Error("Media provider missing"); return value; }
