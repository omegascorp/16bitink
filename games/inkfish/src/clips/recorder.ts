import Phaser from 'phaser';
import { ChunkStore } from '../logic/clips/chunks';
import { cropFor, easeToward } from '../logic/clips/crop';
import { momentScore, windowOf, type Moment, type MomentKind } from '../logic/clips/moments';
import { canPlay, type SfxId } from '../audio/recipes';
import { CLIP_FPS, CLIP_H, CLIP_W, type RecordedRun, type SoundNote } from './types';

/** Codecs to record with, best first: hardware H.264 where there is one. */
const CODECS = ['avc1.4d0028', 'avc1.42001f', 'vp8'] as const;
/** The recording is re-encoded for the clip, so this only needs to look clean. */
const LIVE_BITRATE = 3_000_000;
const KEYFRAME_EVERY_S = 1;
/** Always keep this much of the latest footage: the lead-in to the ending. */
const KEEP_S = 6;
const MAX_PINS = 8;
/** Frames waiting in the encoder before new ones are skipped: a slow device keeps its frame rate. */
const MAX_QUEUE = 3;
/** How quickly the crop follows the fish (see easeToward). */
const FOLLOW_RATE = 5;
/** Average capture cost above which recording stops, ms: the game must stay smooth. */
const MAX_CAPTURE_MS = 6;
const CAPTURE_SAMPLES = 90;

let support: Promise<VideoEncoderConfig | null> | null = null;

/** The encoder settings this browser can record with, or null when it can't (checked once). */
function recordingConfig(): Promise<VideoEncoderConfig | null> {
  support ??= (async () => {
    if (typeof VideoEncoder === 'undefined' || typeof VideoFrame === 'undefined' || typeof OffscreenCanvas === 'undefined') return null;
    for (const codec of CODECS) {
      const config: VideoEncoderConfig = {
        codec, width: CLIP_W, height: CLIP_H, bitrate: LIVE_BITRATE, framerate: CLIP_FPS, latencyMode: 'realtime',
        ...(codec.startsWith('avc') ? { avc: { format: 'avc' as const } } : {}),
      };
      try {
        if ((await VideoEncoder.isConfigSupported(config)).supported) return config;
      } catch {
        // An unknown codec string throws in some browsers: try the next.
      }
    }
    return null;
  })();
  return support;
}

type State = 'starting' | 'recording' | 'stopped';

/**
 * Records the level as it's played, for its clip: every frame the game draws
 * (before the HUD goes on top), cropped to a phone-shaped strip around the
 * fish, encoded as it goes, and kept only where it might be used (see
 * ChunkStore). Notes the moments and the sounds too. Does nothing in a
 * browser that can't encode video, or that can't keep up.
 */
export class ClipRecorder {
  private state: State = 'starting';
  private encoder: VideoEncoder | null = null;
  private decoderConfig: VideoDecoderConfig | null = null;
  private readonly chunks = new ChunkStore<EncodedVideoChunk>({ keepSeconds: KEEP_S, maxPins: MAX_PINS });
  private moments: Moment[] = [];
  private sounds: SoundNote[] = [];
  private readonly lastSound = new Map<string, number>();
  private readonly canvas = typeof OffscreenCanvas === 'undefined' ? null : new OffscreenCanvas(CLIP_W, CLIP_H);
  private readonly t0: number;
  private lastFrameAt = -Infinity;
  private lastKeyAt = -Infinity;
  private focus: { x: number; y: number } | null = null;
  private captureMs = 0;
  private captures = 0;
  private endAt: number | null = null;

  constructor(private readonly scene: Phaser.Scene, private readonly target: () => { readonly x: number; readonly y: number }) {
    this.t0 = scene.time.now;
    void recordingConfig().then((config) => this.begin(config));
  }

  /** Seconds since the level began, on the game's clock (stops while paused). */
  clock(): number {
    return (this.scene.time.now - this.t0) / 1000;
  }

  private begin(config: VideoEncoderConfig | null): void {
    if (this.state !== 'starting') return;
    if (!config || !this.canvas) {
      this.state = 'stopped';
      return;
    }
    try {
      this.encoder = new VideoEncoder({
        output: (chunk, meta) => this.store(chunk, meta),
        error: (err) => this.fail(err),
      });
      this.encoder.configure(config);
    } catch (err) {
      this.fail(err);
      return;
    }
    this.scene.cameras.main.on(Phaser.Cameras.Scene2D.Events.POST_RENDER, this.capture, this);
    this.state = 'recording';
  }

  private store(chunk: EncodedVideoChunk, meta?: EncodedVideoChunkMetadata): void {
    if (meta?.decoderConfig) this.decoderConfig = meta.decoderConfig;
    const t = chunk.timestamp / 1e6;
    this.chunks.add({ t, key: chunk.type === 'key', data: chunk });
    if (chunk.type === 'key') this.chunks.prune(t);
  }

  /**
   * Runs right after the game's camera has drawn, before the HUD scene draws
   * over it. Inside Phaser's frame: a throw here would stop the game loop, so
   * any failure just ends the recording.
   */
  private capture(cam: Phaser.Cameras.Scene2D.Camera): void {
    try {
      this.captureFrame(cam);
    } catch (err) {
      this.fail(err);
    }
  }

  private captureFrame(cam: Phaser.Cameras.Scene2D.Camera): void {
    const encoder = this.encoder;
    const ctx = this.canvas?.getContext('2d');
    if (this.state !== 'recording' || !encoder || encoder.state !== 'configured' || !ctx) return;
    const t = this.clock();
    // A paused game draws the same moment again: nothing new to record.
    if (t - this.lastFrameAt < 1 / CLIP_FPS - 0.004 || encoder.encodeQueueSize > MAX_QUEUE) return;
    const started = performance.now();
    const source = this.scene.game.canvas;
    const at = this.target();
    const view = cam.worldView;
    const sx = (at.x - view.x) * cam.zoom + cam.x;
    const sy = (at.y - view.y) * cam.zoom + cam.y;
    const dt = Number.isFinite(this.lastFrameAt) ? t - this.lastFrameAt : 1;
    this.focus = this.focus
      ? { x: easeToward(this.focus.x, sx, dt, FOLLOW_RATE), y: easeToward(this.focus.y, sy, dt, FOLLOW_RATE) }
      : { x: sx, y: sy };
    const r = cropFor(source.width, source.height, this.focus.x, this.focus.y);
    ctx.drawImage(source, r.x, r.y, r.w, r.h, 0, 0, CLIP_W, CLIP_H);
    const frame = new VideoFrame(this.canvas!, { timestamp: Math.round(t * 1e6) });
    const keyFrame = t - this.lastKeyAt >= KEYFRAME_EVERY_S;
    try {
      encoder.encode(frame, { keyFrame });
    } finally {
      frame.close();
    }
    if (keyFrame) this.lastKeyAt = t;
    this.lastFrameAt = t;
    this.watchCost(performance.now() - started);
  }

  /** Gives up on a device where recording would make the game stutter. */
  private watchCost(ms: number): void {
    this.captures += 1;
    this.captureMs += (ms - this.captureMs) / Math.min(this.captures, 30);
    if (this.captures >= CAPTURE_SAMPLES && this.captureMs > MAX_CAPTURE_MS) {
      console.warn(`[inkfish] clip recording off: ${this.captureMs.toFixed(1)} ms a frame`);
      this.stop();
    }
  }

  /** Something worth showing happened, just now or at `at` (see clock). */
  mark(kind: MomentKind, weight?: number, at = this.clock()): void {
    if (this.state === 'stopped' || this.endAt !== null) return;
    const m: Moment = { kind, at, weight };
    this.moments = [...this.moments, m];
    this.chunks.pin({ ...windowOf(m), score: momentScore(m) });
  }

  /** A sound effect played (already placed: pan and loudness). */
  sound(id: SfxId, pitch: number, gain: number, pan: number): void {
    if (this.state === 'stopped') return;
    const t = this.clock();
    if (!canPlay(id, t * 1000, this.lastSound)) return;
    this.sounds = [...this.sounds, { t, id, pitch, gain, pan }];
  }

  /** The level was just decided: the clip is built around this moment. */
  end(): void {
    this.endAt ??= this.clock();
  }

  /** Stops recording; the recording, or null when there's none to make a clip from. */
  async finish(): Promise<RecordedRun | null> {
    const encoder = this.encoder;
    const recording = this.state === 'recording';
    this.stop(false);
    if (!recording || !encoder || this.endAt === null) return null;
    try {
      await encoder.flush();
    } finally {
      if (encoder.state !== 'closed') encoder.close();
      this.encoder = null;
    }
    if (!this.decoderConfig) return null;
    return { chunks: this.chunks, config: this.decoderConfig, moments: this.moments, sounds: this.sounds, end: this.endAt };
  }

  destroy(): void {
    this.stop();
  }

  private fail(err: unknown): void {
    console.warn('[inkfish] clip recording failed', err);
    this.stop();
  }

  /** Stops capturing; unless keeping it for finish(), drops the encoder and footage too. */
  private stop(dropFootage = true): void {
    if (this.state === 'recording') this.scene.cameras.main?.off(Phaser.Cameras.Scene2D.Events.POST_RENDER, this.capture, this);
    this.state = 'stopped';
    if (!dropFootage) return;
    if (this.encoder && this.encoder.state !== 'closed') this.encoder.close();
    this.encoder = null;
    this.chunks.clear();
  }
}
