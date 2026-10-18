import type { KeyValueStore } from '@16bitink/game-sdk';
import { createRng } from '../logic/rng';
import { Ambience } from './ambience';
import type { Mood } from './mood';
import { canPlay, parseSoundSettings, SOUND_KEY, voicePlan, type SfxId } from './recipes';
import { breath, speak, synthesize } from './synth';

/** Gestures that may start audio (browsers block it before one). */
const UNLOCK_EVENTS = ['pointerdown', 'pointerup', 'touchend', 'click', 'keydown'] as const;
/** Overall loudness: calm, under whatever else the player is listening to. */
const MASTER = 0.5;
/** The narrator's voice, on its own way to the speakers; everything else dips to DUCK of its level under it. */
const VOICE = 0.95;
const DUCK = 0.4;
/** How much of each effect goes into the echo, for a soft tail. */
const EFFECT_SEND = 0.22;
/** The echo: two taps, fed back through a low-pass so each repeat is softer and darker, like a big quiet space. */
const ECHO = { taps: [0.37, 0.53], feedback: 0.38, cutoff: 2200, level: 0.6 } as const;

export interface PlayOpts {
  /** Pitch multiplier. */
  readonly pitch?: number;
  /** Extra loudness factor. */
  readonly gain?: number;
  /** Stereo pan, -1..1. */
  readonly pan?: number;
}

/** The sounds that last as long as something's held: the jetpack's breath. */
export type HeldId = 'jet';

/**
 * The game's sound: one audio context per mounted game, created on the
 * first click, tap or key (browsers block audio before that); the ambience
 * (ambience.ts) and every effect go through it. Quiet while the tab is
 * hidden; muted (and the context suspended, to spare a phone's battery)
 * when the player says so, with the M key or a mute button, remembered in
 * storage. Never throws where there's no Web Audio: it just stays silent.
 */
export class SoundBoard {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private voiceOut: GainNode | null = null;
  private ducked = false;
  private narrationOn: boolean;
  private readonly narrationListeners = new Set<(on: boolean) => void>();
  private echo: AudioNode | null = null;
  private ambience: Ambience | null = null;
  private mood: Mood = 'none';
  private depth = 0;
  private readonly held = new Map<HeldId, () => void>();
  private readonly last = new Map<string, number>();
  private readonly listeners = new Set<(muted: boolean) => void>();
  private mutedNow: boolean;
  private readonly unlock = (): void => this.start();
  private readonly onVisibility = (): void => this.wake();
  private readonly onKey = (e: KeyboardEvent): void => {
    if (e.repeat || e.ctrlKey || e.metaKey || e.altKey || (e.key !== 'm' && e.key !== 'M')) return;
    const tag = (e.target as { tagName?: string } | null)?.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA') return;
    this.setMuted(!this.mutedNow);
  };

  constructor(private readonly store: KeyValueStore | undefined) {
    const settings = parseSoundSettings(safeGet(store));
    this.mutedNow = settings.muted;
    this.narrationOn = settings.narration;
    if (typeof window === 'undefined') return;
    // Safari only lets audio start on some gestures (touchend, click), others on pointerdown or a key: listen for all.
    for (const ev of UNLOCK_EVENTS) window.addEventListener(ev, this.unlock, { capture: true });
    window.addEventListener('keydown', this.onKey);
    document.addEventListener('visibilitychange', this.onVisibility);
  }

  get muted(): boolean {
    return this.mutedNow;
  }

  /** Mutes or unmutes, remembers it, and tells anything showing it (a mute button). */
  setMuted(muted: boolean): void {
    if (muted === this.mutedNow) return;
    this.mutedNow = muted;
    if (muted) this.releaseAll();
    this.level();
    // Let the fade finish before suspending; unmuting resumes at once.
    if (muted) setTimeout(() => this.wake(), 300);
    else this.wake();
    this.remember();
    for (const l of this.listeners) l(muted);
  }

  /** Whether the narrator reads the story aloud. */
  get narration(): boolean {
    return this.narrationOn;
  }

  setNarration(on: boolean): void {
    if (on === this.narrationOn) return;
    this.narrationOn = on;
    this.remember();
    for (const l of this.narrationListeners) l(on);
  }

  /** Calls `listener` whenever narration is switched on or off; returns how to stop. */
  onNarrationChange(listener: (on: boolean) => void): () => void {
    this.narrationListeners.add(listener);
    return () => this.narrationListeners.delete(listener);
  }

  /** Where the narrator's voice goes, while sound is on and running: its own level, not dipped with the rest. Null otherwise. */
  voiceTrack(): { readonly ctx: AudioContext; readonly out: AudioNode } | null {
    const ctx = this.live();
    return ctx && this.voiceOut ? { ctx, out: this.voiceOut } : null;
  }

  /** Dips the ambience and effects under the narrator's voice, or brings them back. */
  duck(on: boolean): void {
    if (on === this.ducked) return;
    this.ducked = on;
    this.level();
  }

  /** The master and voice levels for mute and ducking, eased there. */
  private level(): void {
    if (!this.ctx || !this.master) return;
    const t = this.ctx.currentTime;
    this.master.gain.setTargetAtTime(this.mutedNow ? 0 : this.ducked ? MASTER * DUCK : MASTER, t, this.ducked ? 0.12 : 0.4);
    this.voiceOut?.gain.setTargetAtTime(this.mutedNow ? 0 : VOICE, t, 0.05);
  }

  private remember(): void {
    try {
      this.store?.setItem(SOUND_KEY, JSON.stringify({ muted: this.mutedNow, narration: this.narrationOn }));
    } catch {
      // Storage full or blocked: the setting just won't survive a reload.
    }
  }

  /** Calls `listener` whenever mute changes; returns how to stop. */
  onMuteChange(listener: (muted: boolean) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /** Plays a sound effect now, unless muted, not yet unlocked, or played too recently. */
  play(id: SfxId, opts: PlayOpts = {}): void {
    const ctx = this.live();
    if (!ctx || !this.master || !this.echo || !canPlay(id, performance.now(), this.last)) return;
    const level = ctx.createGain();
    level.gain.value = opts.gain ?? 1;
    const panner = ctx.createStereoPanner();
    panner.pan.value = Math.max(-1, Math.min(1, opts.pan ?? 0));
    const send = ctx.createGain();
    send.gain.value = EFFECT_SEND;
    level.connect(panner).connect(this.master);
    panner.connect(send).connect(this.echo);
    synthesize(id, { ctx, out: level, t: ctx.currentTime + 0.005, pitch: opts.pitch ?? 1 });
    // Let the graph go once the sound has surely finished (lift-off is the longest).
    setTimeout(() => panner.disconnect(), 6000);
  }

  /** The radio's strange voice saying `words` words, seeded as its inked trace is. */
  speak(words: number, seed: number): void {
    const ctx = this.live();
    if (!ctx || !this.master || !this.echo) return;
    const plan = voicePlan(words, seed, createRng);
    const level = ctx.createGain();
    level.gain.value = 0.9;
    level.connect(this.master);
    level.connect(this.echo);
    speak({ ctx, out: level, t: ctx.currentTime + 0.4, pitch: 1 }, plan);
    const end = plan.length ? plan[plan.length - 1]!.start + plan[plan.length - 1]!.dur : 0;
    setTimeout(() => level.disconnect(), (end + 3) * 1000);
  }

  /** Starts or stops a held sound (the jetpack while thrusting); asking for what's already so does nothing. */
  hold(id: HeldId, on: boolean): void {
    const stop = this.held.get(id);
    if (!on) {
      stop?.();
      this.held.delete(id);
      return;
    }
    const ctx = this.live();
    if (stop || !ctx || !this.master) return;
    this.held.set(id, breath(ctx, this.master));
  }

  /** The ambience for where the player is now (crossfaded; the same mood again changes nothing). */
  setMood(mood: Mood): void {
    this.mood = mood;
    this.ambience?.setMood(mood);
  }

  /** How deep the prospector is, in metres, for the ambience. */
  setDepth(depth: number): void {
    this.depth = depth;
    this.ambience?.setDepth(depth);
  }

  /** How hard a dust storm is blowing, 0..1, for the ambience's wind. */
  setGust(gust: number): void {
    this.ambience?.setGust(gust);
  }

  destroy(): void {
    if (typeof window !== 'undefined') {
      for (const ev of UNLOCK_EVENTS) window.removeEventListener(ev, this.unlock, { capture: true });
      window.removeEventListener('keydown', this.onKey);
      document.removeEventListener('visibilitychange', this.onVisibility);
    }
    this.releaseAll();
    this.listeners.clear();
    this.narrationListeners.clear();
    this.ambience?.destroy();
    void this.ctx?.close().catch(() => undefined);
    this.ctx = null;
    this.master = null;
    this.voiceOut = null;
    this.echo = null;
    this.ambience = null;
  }

  /** The context, if it's running and sound is on. */
  private live(): AudioContext | null {
    const ctx = this.ctx;
    return ctx && !this.mutedNow && ctx.state === 'running' ? ctx : null;
  }

  private releaseAll(): void {
    for (const stop of this.held.values()) stop();
    this.held.clear();
  }

  /** Runs the context while the tab is shown and sound is on; suspends it otherwise. */
  private wake(): void {
    const ctx = this.ctx;
    if (!ctx) return;
    const want = !document.hidden && !this.mutedNow;
    if (want && ctx.state === 'suspended') void ctx.resume().catch(() => undefined);
    else if (!want && ctx.state === 'running') void ctx.suspend().catch(() => undefined);
  }

  private start(): void {
    if (this.ctx) {
      this.wake();
      return;
    }
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return;
    try {
      const ctx = new Ctor();
      const master = ctx.createGain();
      master.gain.value = this.mutedNow ? 0 : MASTER;
      master.connect(ctx.destination);
      const voice = ctx.createGain();
      voice.gain.value = this.mutedNow ? 0 : VOICE;
      voice.connect(ctx.destination);
      this.ctx = ctx;
      this.master = master;
      this.voiceOut = voice;
      this.echo = echoBus(ctx, master);
      this.ambience = new Ambience(ctx, master, this.echo);
      this.ambience.setDepth(this.depth);
      this.ambience.setMood(this.mood);
      this.wake();
    } catch {
      // No usable audio here (a locked-down browser): stay silent.
      this.ctx = null;
    }
  }
}

/** A soft, dark echo into `out`; returns its input. */
function echoBus(ctx: AudioContext, out: AudioNode): AudioNode {
  const input = ctx.createGain();
  const wet = ctx.createGain();
  wet.gain.value = ECHO.level;
  wet.connect(out);
  for (const [i, time] of ECHO.taps.entries()) {
    const delay = ctx.createDelay(1);
    delay.delayTime.value = time;
    const tone = ctx.createBiquadFilter();
    tone.type = 'lowpass';
    tone.frequency.value = ECHO.cutoff;
    const feedback = ctx.createGain();
    feedback.gain.value = ECHO.feedback;
    const pan = ctx.createStereoPanner();
    pan.pan.value = i === 0 ? -0.5 : 0.5;
    input.connect(delay).connect(tone).connect(feedback).connect(delay);
    tone.connect(pan).connect(wet);
  }
  return input;
}

function safeGet(store: KeyValueStore | undefined): string | null {
  try {
    return store?.getItem(SOUND_KEY) ?? null;
  } catch {
    return null;
  }
}
