import type { KeyValueStore } from '@16bitink/game-sdk';
import { canPlay, parseSoundSettings, SOUND_KEY, spatial, type SfxId, type View } from './recipes';
import { synthesize } from './synth';

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
  /** Muted by the platform (e.g. the portal's sound setting); not saved, and not the player's own switch. */
  private platformMuted = false;
  private readonly unlock = (): void => this.start();
  private readonly onVisibility = (): void => {
    if (!this.ctx) return;
    void (document.hidden ? this.ctx.suspend() : this.ctx.resume()).catch(() => undefined);
  };

  constructor(private readonly store: KeyValueStore | undefined) {
    this.mutedNow = parseSoundSettings(safeGet(store)).muted;
    window.addEventListener('pointerdown', this.unlock, { capture: true });
    window.addEventListener('keydown', this.unlock, { capture: true });
    document.addEventListener('visibilitychange', this.onVisibility);
  }

  /** The player's own switch (the HUD's note button), remembered in storage. */
  get muted(): boolean {
    return this.mutedNow;
  }

  setMuted(muted: boolean): void {
    this.mutedNow = muted;
    this.applyGain();
    try {
      this.store?.setItem(SOUND_KEY, JSON.stringify({ muted }));
    } catch {
      // Storage full or blocked: the setting just won't survive a reload.
    }
  }

  /** The platform's mute, on top of the player's: either one silences the game. */
  setPlatformMuted(muted: boolean): void {
    this.platformMuted = muted;
    this.applyGain();
  }

  private get silent(): boolean {
    return this.mutedNow || this.platformMuted;
  }

  private applyGain(): void {
    this.master?.gain.setTargetAtTime(this.silent ? 0 : MASTER, this.ctx?.currentTime ?? 0, 0.02);
  }

  play(id: SfxId, opts: PlayOpts = {}): void {
    const ctx = this.ctx;
    if (!ctx || !this.master || this.silent || ctx.state !== 'running') return;
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
    window.removeEventListener('pointerdown', this.unlock, { capture: true });
    window.removeEventListener('keydown', this.unlock, { capture: true });
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
    this.master.gain.value = this.silent ? 0 : MASTER;
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
