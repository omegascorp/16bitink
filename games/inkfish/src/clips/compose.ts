import {
  AudioBufferSource, BufferTarget, CanvasSource, canEncodeAudio, canEncodeVideo, Mp4OutputFormat, Output, QUALITY_HIGH, QUALITY_MEDIUM,
  type AudioCodec, type VideoCodec,
} from 'mediabunny';
import type { ClipCard } from '../logic/clips/card';
import { planReel, reelSeconds, type Shot } from '../logic/clips/reel';
import { FrameStream } from './frames';
import { drawCard, drawFooter, drawRewind } from './overlay';
import { renderSoundtrack } from './soundtrack';
import { CLIP_FPS, CLIP_H, CLIP_W, type ClipFile, type RecordedRun } from './types';

type Ctx = OffscreenCanvasRenderingContext2D;

/** H.264 plays everywhere a clip gets shared; VP9 only where H.264 can't be encoded. */
async function pickVideoCodec(): Promise<VideoCodec | null> {
  for (const codec of ['avc', 'vp9'] as const) {
    if (await canEncodeVideo(codec, { width: CLIP_W, height: CLIP_H, frameRate: CLIP_FPS })) return codec;
  }
  return null;
}

async function pickAudioCodec(): Promise<AudioCodec | null> {
  for (const codec of ['aac', 'opus'] as const) {
    if (await canEncodeAudio(codec, { numberOfChannels: 2, sampleRate: 48000 })) return codec;
  }
  return null;
}

const aborted = (): DOMException => new DOMException('Clip cancelled', 'AbortError');

interface Frame {
  readonly ctx: Ctx;
  readonly still: Ctx;
  readonly source: CanvasSource;
  readonly signal: AbortSignal;
  readonly footer: string;
}

/** Hands one drawn frame to the encoder; the address goes on last, over everything. */
async function emit(f: Frame, index: number): Promise<void> {
  if (f.signal.aborted) throw aborted();
  drawFooter(f.ctx, f.footer, CLIP_W, CLIP_H);
  await f.source.add(index / CLIP_FPS, 1 / CLIP_FPS);
}

/** Plays recorded footage into the clip, from `index` on; returns the next free index. */
async function playFootage(f: Frame, run: RecordedRun, shot: Shot, index: number): Promise<number> {
  const count = Math.round(shot.seconds * CLIP_FPS);
  const stream = new FrameStream(run.chunks.slice(shot.from, shot.to).map((c) => c.data), run.config);
  let shown: VideoFrame | null = null;
  let upcoming: VideoFrame | null = null;
  try {
    upcoming = await stream.read();
    for (let k = 0; k < count; k++) {
      const want = shot.from + (k / CLIP_FPS) * shot.speed;
      // The latest recorded frame at or before this moment (several clip frames share one in slow motion).
      while (upcoming && upcoming.timestamp / 1e6 <= want + 1e-4) {
        shown?.close();
        shown = upcoming;
        upcoming = await stream.read();
      }
      if (shown) f.ctx.drawImage(shown, 0, 0, CLIP_W, CLIP_H);
      // The climax's last picture is the still the card and the rewind sit on.
      if (shot.kind === 'climax' && k === count - 1) f.still.drawImage(f.ctx.canvas, 0, 0);
      await emit(f, index + k);
    }
  } finally {
    shown?.close();
    upcoming?.close();
    stream.close();
  }
  return index + count;
}

/** The held frame with the card on it, or the rewind over it; returns the next free index. */
async function playStill(f: Frame, shot: Shot, index: number, overlay: (p: number) => void): Promise<number> {
  const count = Math.round(shot.seconds * CLIP_FPS);
  for (let k = 0; k < count; k++) {
    f.ctx.drawImage(f.still.canvas, 0, 0);
    overlay(k / Math.max(1, count - 1));
    await emit(f, index + k);
  }
  return index + count;
}

/**
 * Edits a level's recording into its clip (see planReel): a looping phone
 * video with the card, the game's address and the level's own sounds, as
 * MP4. Null when there's nothing to show or this browser can't encode it.
 */
export async function composeClip(run: RecordedRun, card: ClipCard, won: boolean, name: string, signal: AbortSignal): Promise<ClipFile | null> {
  const shots = planReel(run.end, run.moments, run.chunks.spans());
  const videoCodec = await pickVideoCodec();
  if (!shots.length || !videoCodec) return null;
  const audioCodec = await pickAudioCodec();
  const seconds = reelSeconds(shots);
  const canvas = new OffscreenCanvas(CLIP_W, CLIP_H);
  const ctx = canvas.getContext('2d');
  const still = new OffscreenCanvas(CLIP_W, CLIP_H).getContext('2d');
  if (!ctx || !still) return null;

  const output = new Output({ format: new Mp4OutputFormat({ fastStart: 'in-memory' }), target: new BufferTarget() });
  const source = new CanvasSource(canvas, { codec: videoCodec, quality: QUALITY_HIGH, keyFrameInterval: 2 });
  output.addVideoTrack(source, { frameRate: CLIP_FPS });
  const audio = audioCodec ? new AudioBufferSource({ codec: audioCodec, quality: QUALITY_MEDIUM }) : null;
  if (audio) output.addAudioTrack(audio);
  try {
    await output.start();
    // All the sound first: the muxer then never waits on it while the picture is encoded.
    if (audio) {
      await audio.add(await renderSoundtrack(shots, run.sounds, seconds));
      audio.close();
    }
    const f: Frame = { ctx, still, source, signal, footer: card.footer };
    let index = 0;
    for (const shot of shots) {
      if (shot.kind === 'hold') index = await playStill(f, shot, index, (p) => drawCard(ctx, card, won, p, CLIP_W, CLIP_H));
      else if (shot.kind === 'rewind') index = await playStill(f, shot, index, (p) => drawRewind(ctx, p, CLIP_W, CLIP_H));
      else index = await playFootage(f, run, shot, index);
    }
    source.close();
    await output.finalize();
  } catch (err) {
    if (output.state !== 'finalized') await output.cancel();
    throw err;
  }
  const buffer = (output.target as BufferTarget).buffer;
  return buffer ? { blob: new Blob([buffer], { type: 'video/mp4' }), name, seconds } : null;
}
