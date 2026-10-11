import type { KeyValueStore } from '@16bitink/game-sdk';
import { canPlay, parseSoundSettings, SOUND_KEY, spatial, type SfxId, type View } from './recipes';
import { synthesize } from './synth';

/** Gestures that may start audio (browsers block it before one). */
const UNLOCK_EVENTS = ['pointerdown', 'pointerup', 'touchend', 'click', 'keydown'] as const;

/** Overall loudness: effects sit under whatever else the player is listening to. */
const MASTER = 0.5;

export interface PlayOpts {
  /** Pitch multiplier (see pitchForSize). */
  readonly pitch?: number;
  /** Where it happened, to pan it and fade it with distance from the view. */
  readonly at?: { readonly x: number; readonly y: number };
  readonly view?: View;
  /** Extra loudness factor. */
  readonly gain?: number;
}

/**
 * The game's sound: one audio context per mounted game, created on the first
 * click or key press (browsers block audio before that), quiet while the tab
 * is hidden, muted when the player says so (remembered in storage).
 */
export class SoundBoard {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private readonly last = new Map<string, number>();
  private mutedNow: boolean;
  private readonly unlock = (): void => this.start();
  private readonly onVisibility = (): void => {
    if (!this.ctx) return;
    void (document.hidden ? this.ctx.suspend() : this.ctx.resume()).catch(() => undefined);
  };

  constructor(private readonly store: KeyValueStore | undefined) {
    this.mutedNow = parseSoundSettings(safeGet(store)).muted;
    // Safari only lets audio start on some gestures (touchend, click), others on pointerdown or a key: listen for all.
    for (const ev of UNLOCK_EVENTS) window.addEventListener(ev, this.unlock, { capture: true });
    document.addEventListener('visibilitychange', this.onVisibility);
  }

  get muted(): boolean {
    return this.mutedNow;
  }

  setMuted(muted: boolean): void {
    this.mutedNow = muted;
    this.master?.gain.setTargetAtTime(muted ? 0 : MASTER, this.ctx?.currentTime ?? 0, 0.02);
    try {
      this.store?.setItem(SOUND_KEY, JSON.stringify({ muted }));
    } catch {
      // Storage full or blocked: the setting just won't survive a reload.
    }
  }

  play(id: SfxId, opts: PlayOpts = {}): void {
    const ctx = this.ctx;
    if (!ctx || !this.master || this.mutedNow || ctx.state !== 'running') return;
    const place = opts.at && opts.view ? spatial(opts.at, opts.view) : { pan: 0, gain: 1 };
    const gain = place.gain * (opts.gain ?? 1);
    if (gain <= 0.02 || !canPlay(id, performance.now(), this.last)) return;
    const level = ctx.createGain();
    level.gain.value = gain;
    const panner = ctx.createStereoPanner();
    panner.pan.value = place.pan;
    level.connect(panner).connect(this.master);
    synthesize(id, { ctx, out: level, t: ctx.currentTime + 0.005, pitch: opts.pitch ?? 1 });
    // Let the graph go once the sound has surely finished.
    setTimeout(() => panner.disconnect(), 2000);
  }

  destroy(): void {
    for (const ev of UNLOCK_EVENTS) window.removeEventListener(ev, this.unlock, { capture: true });
    document.removeEventListener('visibilitychange', this.onVisibility);
    void this.ctx?.close().catch(() => undefined);
    this.ctx = null;
    this.master = null;
  }

  private start(): void {
    if (this.ctx) {
      if (this.ctx.state === 'suspended' && !document.hidden) void this.ctx.resume().catch(() => undefined);
      return;
    }
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return;
    this.ctx = new Ctor();
    this.master = this.ctx.createGain();
    this.master.gain.value = this.mutedNow ? 0 : MASTER;
    this.master.connect(this.ctx.destination);
  }
}

function safeGet(store: KeyValueStore | undefined): string | null {
  try {
    return store?.getItem(SOUND_KEY) ?? null;
  } catch {
    return null;
  }
}
