import type { Id, OperationResult, PermissionState, Timestamp } from "./common";

export type MediaSource = "device" | "server";

export type VideoItemView = {
  id: Id; title: string; source: MediaSource; folder: string; durationSec: number; sizeBytes: number;
  container: string; videoCodec?: string; audioCodec?: string; width?: number; height?: number;
  posterHue: number; // fixture-only gradient seed; real artwork comes from integration
  progressSec?: number; lastPlayedAt?: Timestamp;
  /** Server decision from Locat mediaProbe: direct, remux or HLS. */
  delivery?: "direct" | "remux" | "transcode" | "hls" | "unsupported";
};

export type QualityOption = { id: string; label: string; height?: number; experimental?: boolean };

/** Player is purely presentational: Locat LocalCinemaPlayer / CinemaHlsPlayer own playback. */
export type PlaybackView = {
  state: "idle" | "loading" | "buffering" | "playing" | "paused" | "ended" | "reconnecting" | "error";
  seekable?: boolean;
  positionSec: number; durationSec: number; bufferedSec: number; rate: number; muted: boolean; volume: number;
  fit: "contain" | "cover" | "fill"; subtitles: { id: string; label: string }[]; activeSubtitle?: string;
  qualities: QualityOption[]; activeQuality?: string; pip: "available" | "active" | "unsupported";
  error?: { code: "codec" | "network" | "permission-revoked" | "decode" | "unknown"; message: string };
};

export interface PlayerCallbacks {
  onTogglePlay(): void; onSeek(sec: number): void; onRate(rate: number): void; onFit(fit: PlaybackView["fit"]): void;
  onSubtitle(id?: string): void; onQuality(id: string): void; onPip(): void; onFullscreen(): void; onVolume(v: number): void; onMute(): void;
}

export type TrackView = {
  id: Id; title: string; artist: string; album: string; folder: string; durationSec: number; source: MediaSource;
  format: string; sampleRate?: number; bitDepth?: number; bitrateKbps?: number; favorite: boolean; hue: number;
};

export type QueueView = { tracks: TrackView[]; index: number; shuffle: boolean; repeat: "off" | "all" | "one" };

/** Mirrors Locat src/lib/musicEq.ts + musicPresets.ts. */
export type EqBandCount = 5 | 10 | 15 | 31;
export type EqFilterType = "peaking" | "lowshelf" | "highshelf" | "highpass" | "lowpass";
export type EqPointView = { type: EqFilterType; frequency: number; gain: number; q: number };
export type EqView = {
  mode: "graphic" | "parametric"; bands: EqBandCount; gains: number[]; points: EqPointView[];
  preampDb: number; bypass: boolean; presetId: string; presets: { id: string; name: string; custom: boolean }[];
  headroomDb: number; // computed by integration (boostHeadroom/filterHeadroom)
};

export type PhotoView = {
  id: Id; name: string; album: string; width: number; height: number; sizeBytes: number; takenAt: Timestamp;
  mime: string; hue: number; supported: boolean;
};

/** Mirrors Locat src/lib/photoEditing.ts PhotoEdit. Render/export owned by renderPhotoEdit. */
export type PhotoEditView = {
  rotate: 0 | 90 | 180 | 270; flipX: boolean; flipY: boolean; crop?: { x: number; y: number; w: number; h: number };
  brightness: number; contrast: number; saturation: number; grayscale: number; blur: number; filter: string;
  strokes: number; texts: number;
};

export type MediaLibraryAccess = { photos: PermissionState; videos: PermissionState; audio: PermissionState };

export interface MediaAdapter {
  refreshLibrary(kind: "video" | "audio" | "photo", source: MediaSource): Promise<OperationResult>;
  requestAccess(kind: "video" | "audio" | "photo"): Promise<PermissionState>;
  openVideo(id: Id): Promise<OperationResult>;
  exportPhoto(id: Id, edit: PhotoEditView, mode: "copy"): Promise<OperationResult>;
  saveEqPreset(name: string, eq: EqView): Promise<OperationResult>;
}
