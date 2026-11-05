import type { KeyValueStore } from '@16bitink/game-sdk';
import { MusicPlayer } from './music';
import { parseSettings, settingsWith, type SoundKind, type SoundSettings } from './soundSettings';
import { synthesize } from './synth';
import type { TrackId } from './tracks';

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
 * started on the first click or key, quiet while the tab is hidden. The
 * player can switch music and effects off apart (remembered in storage);
 * music that's off isn't even downloaded.
 */
export class SoundBoard {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private player: MusicPlayer | null = null;
  /** The track the screen wants: it can't start before the player's first gesture. */
  private track: TrackId | null = null;
  private settings: SoundSettings;
  private readonly last = new Map<SfxId, number>();
  private readonly unlock = (): void => this.start();
  private readonly onVisibility = (): void => {
    if (!this.ctx) return;
    void (document.hidden ? this.ctx.suspend() : this.ctx.resume()).catch(() => undefined);
  };

  constructor(private readonly store: KeyValueStore | undefined) {
    this.settings = readSettings(store);
    for (const ev of UNLOCK_EVENTS) window.addEventListener(ev, this.unlock, { capture: true });
    document.addEventListener('visibilitychange', this.onVisibility);
  }

  isOn(kind: SoundKind): boolean {
    return this.settings[kind];
  }

  setOn(kind: SoundKind, on: boolean): void {
    this.settings = settingsWith(this.settings, kind, on);
    if (kind === 'music') this.playTrack();
    try {
      this.store?.setItem(SOUND_KEY, JSON.stringify(this.settings));
    } catch {
      // Storage full or blocked: the setting just won't survive a reload.
    }
  }

  /** Sets the screen's background music, which loops until another takes over. */
  music(id: TrackId | null): void {
    this.track = id;
    this.playTrack();
  }

  play(id: SfxId): void {
    const ctx = this.ctx;
    if (!ctx || !this.master || !this.settings.effects || ctx.state !== 'running') return;
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
    this.player = null;
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
    this.master.gain.value = MASTER;
    this.master.connect(this.ctx.destination);
    this.player = new MusicPlayer(this.ctx, this.master);
    this.playTrack();
    if (this.ctx.state !== 'running') void this.ctx.resume().catch(() => undefined);
  }

  private playTrack(): void {
    this.player?.play(this.settings.music ? this.track : null);
  }
}

function readSettings(store: KeyValueStore | undefined): SoundSettings {
  try {
    return parseSettings(store?.getItem(SOUND_KEY));
  } catch {
    return parseSettings(null);
  }
}
