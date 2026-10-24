import type { KeyValueStore } from '@16bitink/game-sdk';
import { synthesize } from './synth';

export type SfxId = 'click' | 'step' | 'pickup' | 'flag' | 'build' | 'hire' | 'swing' | 'hit' | 'shoot' | 'spell' | 'death' | 'win' | 'lose' | 'card' | 'day';

const SOUND_KEY = 'inkheroes:sound';
/** Gestures that may start audio (browsers block it before one). */
const UNLOCK_EVENTS = ['pointerdown', 'pointerup', 'touchend', 'click', 'keydown'] as const;
/** Overall loudness: effects sit under whatever else the player is listening to. */
const MASTER = 0.75;
/** Shortest gap between two plays of one sound, ms. */
const MIN_GAP_MS = 45;

/**
 * The game's sound, as the other games': one audio context per mounted game,
 * started on the first click or key, quiet while the tab is hidden, muted
 * when the player says so (remembered in storage).
 */
export class SoundBoard {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private mutedNow: boolean;
  private readonly last = new Map<SfxId, number>();
  private readonly unlock = (): void => this.start();
  private readonly onVisibility = (): void => {
    if (!this.ctx) return;
    void (document.hidden ? this.ctx.suspend() : this.ctx.resume()).catch(() => undefined);
  };

  constructor(private readonly store: KeyValueStore | undefined) {
    this.mutedNow = readMuted(store);
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

  play(id: SfxId): void {
    const ctx = this.ctx;
    if (!ctx || !this.master || this.mutedNow || ctx.state !== 'running') return;
    const now = performance.now();
    if (now - (this.last.get(id) ?? -Infinity) < MIN_GAP_MS) return;
    this.last.set(id, now);
    const level = ctx.createGain();
    level.connect(this.master);
    synthesize(id, { ctx, out: level, t: ctx.currentTime + 0.005, pitch: 1 });
    setTimeout(() => level.disconnect(), 2000);
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
      if (this.ctx.state !== 'running' && this.ctx.state !== 'closed' && !document.hidden) void this.ctx.resume().catch(() => undefined);
      return;
    }
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return;
    this.ctx = new Ctor();
    this.master = this.ctx.createGain();
    this.master.gain.value = this.mutedNow ? 0 : MASTER;
    this.master.connect(this.ctx.destination);
    if (this.ctx.state !== 'running') void this.ctx.resume().catch(() => undefined);
  }
}

function readMuted(store: KeyValueStore | undefined): boolean {
  try {
    const raw = store?.getItem(SOUND_KEY);
    return !!raw && (JSON.parse(raw) as { muted?: unknown }).muted === true;
  } catch {
    return false;
  }
}
