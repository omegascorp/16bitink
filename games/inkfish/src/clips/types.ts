import type { ChunkStore } from '../logic/clips/chunks';
import type { Moment } from '../logic/clips/moments';
import type { Note } from '../logic/clips/soundtrack';

/** The clip's picture size: phone video. */
export const CLIP_W = 720;
export const CLIP_H = 1280;
export const CLIP_FPS = 30;

/** A sound effect heard during the level (seconds on the recording's clock), to rebuild the clip's soundtrack. */
export type SoundNote = Note;

/** Everything a level's recording leaves behind for its clip. */
export interface RecordedRun {
  readonly chunks: ChunkStore<EncodedVideoChunk>;
  readonly config: VideoDecoderConfig;
  readonly moments: readonly Moment[];
  readonly sounds: readonly SoundNote[];
  /** When the level was decided (the fatal bite, the last gulp), seconds on the recording's clock. */
  readonly end: number;
}

/** A finished clip, ready to preview, download or share. */
export interface ClipFile {
  readonly blob: Blob;
  readonly name: string;
  readonly seconds: number;
}

/** A clip being made in the background while the result screen shows. */
export interface ClipJob {
  /** The clip, or null when this browser can't make one or there was nothing to show. */
  readonly result: Promise<ClipFile | null>;
  cancel(): void;
}
