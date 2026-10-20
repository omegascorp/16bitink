import { noise, noiseBuffer, tone, type Voice } from './synth';

/** Where the player is, by ear: the garden (and the map), or the pond. */
export type Bed = 'garden' | 'pond';

/** How often the bed may add a creature's call, ms. */
const TICK_MS = 700;
/** Chance per tick of a call in each place. */
const CALL_CHANCE: Readonly<Record<Bed, number>> = { garden: 0.16, pond: 0.2 };
/** The rolling line at full rush, and how fast its loudness follows the line. */
const ROLL_MAX = 0.32;
const ROLL_TAU = 0.15;
const BED_LEVEL = 0.05;
const FADE_TAU = 0.6;

/** A short birdsong phrase: two to five quick chirps. */
function chirps(v: Voice, rnd: () => number): void {
  const n = 2 + Math.floor(rnd() * 4);
  const base = 2600 + rnd() * 1400;
  for (let i = 0; i < n; i++) {
    const f = base * (1 + (rnd() - 0.5) * 0.25);
    tone(v, { from: f, to: f * (rnd() < 0.5 ? 1.35 : 0.8), dur: 0.06 + rnd() * 0.05, gain: 0.05, delay: i * (0.09 + rnd() * 0.05) });
  }
}

/** A frog by the pond: a few low throaty pulses. */
function croak(v: Voice, rnd: () => number): void {
  const f = 110 + rnd() * 40;
  for (let i = 0; i < 2 + Math.floor(rnd() * 2); i++) {
    tone(v, { type: 'square', from: f, to: f * 0.9, dur: 0.07, gain: 0.03, delay: i * 0.11 });
    noise(v, { dur: 0.07, gain: 0.05, filter: 'bandpass', from: f * 6, q: 6, delay: i * 0.11 });
  }
}

/** Water dripping off a leaf into the pond. */
function drip(v: Voice, rnd: () => number): void {
  tone(v, { from: 1400 + rnd() * 600, to: 500, dur: 0.07, gain: 0.05 });
}

/**
 * The game's sound beneath its effects: a bed of wind for the place with a
 * creature calling now and then, and the low rattle of marbles rolling,
 * loud while the line rushes out and silent when it stops.
 */
export class Ambience {
  private readonly bedGain: GainNode;
  private readonly rollGain: GainNode;
  private readonly sources: AudioScheduledSourceNode[] = [];
  private bed: Bed | null = null;
  private timer: ReturnType<typeof setInterval> | null = null;
  private roll = 0;

  constructor(private readonly ctx: AudioContext, private readonly out: AudioNode) {
    this.bedGain = ctx.createGain();
    this.bedGain.gain.value = 0;
    this.bedGain.connect(out);
    this.rollGain = ctx.createGain();
    this.rollGain.gain.value = 0;
    this.rollGain.connect(out);
    this.wind();
    this.rumble();
  }

  setBed(bed: Bed | null): void {
    this.bed = bed;
    this.bedGain.gain.setTargetAtTime(bed ? BED_LEVEL : 0, this.ctx.currentTime, FADE_TAU);
    if (bed && !this.timer) this.timer = setInterval(() => this.call(), TICK_MS);
    if (!bed && this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  /** How hard the line is rolling, 0 (still) to 1 (rushing out). */
  setRoll(level: number): void {
    // Called every frame: only a real change is scheduled (each call adds an automation event).
    const v = Math.round(Math.max(0, Math.min(1, level)) * 50) / 50;
    if (v === this.roll) return;
    this.roll = v;
    this.rollGain.gain.cancelScheduledValues(this.ctx.currentTime);
    this.rollGain.gain.setTargetAtTime(v * ROLL_MAX, this.ctx.currentTime, ROLL_TAU);
  }

  destroy(): void {
    if (this.timer) clearInterval(this.timer);
    for (const s of this.sources) s.stop();
    this.bedGain.disconnect();
    this.rollGain.disconnect();
  }

  private loop(): AudioBufferSourceNode {
    const src = this.ctx.createBufferSource();
    src.buffer = noiseBuffer(this.ctx);
    src.loop = true;
    this.sources.push(src);
    return src;
  }

  /** Wind in leaves: band-passed noise, its colour and loudness drifting slowly. */
  private wind(): void {
    const src = this.loop();
    const band = this.ctx.createBiquadFilter();
    band.type = 'bandpass';
    band.frequency.value = 520;
    band.Q.value = 0.6;
    const sway = this.ctx.createOscillator();
    sway.frequency.value = 0.07;
    const depth = this.ctx.createGain();
    depth.gain.value = 220;
    sway.connect(depth).connect(band.frequency);
    this.sources.push(sway);
    src.connect(band).connect(this.bedGain);
    src.start();
    sway.start();
  }

  /** Marbles in a stone groove: a low roll and a faint glassy clatter over it. */
  private rumble(): void {
    const low = this.ctx.createBiquadFilter();
    low.type = 'lowpass';
    low.frequency.value = 320;
    const src = this.loop();
    src.connect(low).connect(this.rollGain);
    const clatter = this.ctx.createBiquadFilter();
    clatter.type = 'bandpass';
    clatter.frequency.value = 2400;
    clatter.Q.value = 3;
    const shimmer = this.ctx.createGain();
    shimmer.gain.value = 0.25;
    const flutter = this.ctx.createOscillator();
    flutter.frequency.value = 13;
    const amount = this.ctx.createGain();
    amount.gain.value = 0.2;
    flutter.connect(amount).connect(shimmer.gain);
    this.sources.push(flutter);
    src.connect(clatter).connect(shimmer).connect(this.rollGain);
    src.start();
    flutter.start();
  }

  private call(): void {
    const bed = this.bed;
    if (!bed || this.ctx.state !== 'running' || Math.random() > CALL_CHANCE[bed]) return;
    const v: Voice = { ctx: this.ctx, out: this.bedGain, t: this.ctx.currentTime + 0.02, pitch: 1 };
    // The calls ride on the bed's level, which is quiet: lift them back to a natural loudness.
    const lift = this.ctx.createGain();
    lift.gain.value = 1 / BED_LEVEL * 0.35;
    lift.connect(this.bedGain);
    const voice = { ...v, out: lift };
    const r = Math.random;
    if (bed === 'pond') {
      const k = r();
      if (k < 0.4) croak(voice, r);
      else if (k < 0.75) drip(voice, r);
      else chirps(voice, r);
    } else chirps(voice, r);
    setTimeout(() => lift.disconnect(), 2000);
  }
}
