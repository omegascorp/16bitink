import { noise, noiseBuffer, tone, type Voice } from './synth';

/** Where the player is, by ear: a chapter's place (the map sounds like the garden). */
export type Bed = 'garden' | 'pond' | 'greenhouse' | 'orchard' | 'rockery' | 'allotment' | 'meadow' | 'barn' | 'ruins' | 'night';

/** How often the bed may add a creature's call, ms. */
const TICK_MS = 700;
/** Chance per tick of a call in each place. */
const CALL_CHANCE: Readonly<Record<Bed, number>> = { garden: 0.16, pond: 0.2, greenhouse: 0.22, orchard: 0.2, rockery: 0.24, allotment: 0.2, meadow: 0.3, barn: 0.2, ruins: 0.18, night: 0.3 };
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

/** A wood pigeon in the orchard trees: a soft five-note coo. */
function coo(v: Voice, rnd: () => number): void {
  const f = 420 + rnd() * 40;
  [0, 0.32, 0.52, 0.72, 1.1].forEach((t, i) => tone(v, { from: f * (i === 1 ? 1.08 : 1), to: f * 0.92, dur: i === 1 ? 0.28 : 0.16, gain: 0.05, delay: t, vibrato: { depth: 6, rate: 7 } }));
}

/** Water trickling over stones: a few quick bubbling drips. */
function trickle(v: Voice, rnd: () => number): void {
  for (let i = 0; i < 4 + Math.floor(rnd() * 4); i++) tone(v, { from: 900 + rnd() * 900, to: 600 + rnd() * 300, dur: 0.05, gain: 0.03, delay: i * (0.05 + rnd() * 0.07) });
}

/** A robin on a fork handle: a thin, wistful warble falling and rising. */
function robin(v: Voice, rnd: () => number): void {
  const n = 5 + Math.floor(rnd() * 4);
  for (let i = 0; i < n; i++) {
    const f = 3200 + rnd() * 1800;
    tone(v, { from: f, to: f * (0.7 + rnd() * 0.6), dur: 0.05 + rnd() * 0.08, gain: 0.035, delay: i * (0.1 + rnd() * 0.06) });
  }
}

/** A spade biting into soil two plots away: a dull chink. */
function spade(v: Voice, rnd: () => number): void {
  tone(v, { type: 'triangle', from: 1900 + rnd() * 300, to: 1500, dur: 0.06, gain: 0.025 });
  noise(v, { dur: 0.12, gain: 0.04, filter: 'lowpass', from: 700, delay: 0.01 });
}

/** A grasshopper in the long grass: a dry, quick chirr. */
function chirr(v: Voice, rnd: () => number): void {
  const n = 6 + Math.floor(rnd() * 8);
  for (let i = 0; i < n; i++) noise(v, { dur: 0.018, gain: 0.04, filter: 'bandpass', from: 6500 + rnd() * 1500, q: 8, delay: i * 0.035 });
}

/** A skylark high over the meadow: a long run of bright trills. */
function skylark(v: Voice, rnd: () => number): void {
  for (let i = 0; i < 10; i++) {
    const f = 3800 + rnd() * 2200;
    tone(v, { from: f, to: f * (1 + (rnd() - 0.5) * 0.4), dur: 0.04, gain: 0.025, delay: i * 0.07, vibrato: { depth: 120, rate: 30 } });
  }
}

/** Swallows under the barn roof: a quick, scratchy twitter. */
function twitter(v: Voice, rnd: () => number): void {
  for (let i = 0; i < 4 + Math.floor(rnd() * 4); i++) {
    const f = 4200 + rnd() * 1600;
    tone(v, { from: f, to: f * 0.75, dur: 0.035, gain: 0.03, delay: i * (0.05 + rnd() * 0.04) });
  }
}

/** An old barn timber settling: a slow, low creak. */
function creak(v: Voice, rnd: () => number): void {
  const f = 180 + rnd() * 120;
  tone(v, { type: 'sawtooth', from: f, to: f * 1.3, dur: 0.5 + rnd() * 0.3, gain: 0.012, vibrato: { depth: 14, rate: 22 } });
}

/** A jackdaw on the old stones: one or two sharp "chak"s. */
function jackdaw(v: Voice, rnd: () => number): void {
  for (let i = 0; i < 1 + Math.floor(rnd() * 2); i++) {
    tone(v, { type: 'square', from: 1100 + rnd() * 150, to: 850, dur: 0.07, gain: 0.025, delay: i * 0.18 });
    noise(v, { dur: 0.06, gain: 0.03, filter: 'bandpass', from: 1800, q: 4, delay: i * 0.18 });
  }
}

/** Wind finding a gap in the ruined walls: a long, soft hollow whistle. */
function whistle(v: Voice, rnd: () => number): void {
  const f = 420 + rnd() * 260;
  tone(v, { type: 'sine', from: f, to: f * (0.9 + rnd() * 0.2), dur: 1.4, gain: 0.02, attack: 0.5, vibrato: { depth: 5, rate: 3 } });
}

/** A tawny owl in the night garden: "hoo… hoo-hoo-hoo". */
function owl(v: Voice, rnd: () => number): void {
  const f = 360 + rnd() * 30;
  tone(v, { type: 'sine', from: f, to: f * 0.96, dur: 0.45, gain: 0.05, attack: 0.05 });
  [0.9, 1.15, 1.4].forEach((t) => tone(v, { type: 'sine', from: f * 1.04, to: f * 0.97, dur: 0.2, gain: 0.04, delay: t, vibrato: { depth: 8, rate: 18 } }));
}

/** A nightingale: a run of rich, liquid notes. */
function nightingale(v: Voice, rnd: () => number): void {
  const base = 1800 + rnd() * 600;
  for (let i = 0; i < 8; i++) tone(v, { from: base * (1 + (i % 3) * 0.12), to: base * (0.9 + rnd() * 0.3), dur: 0.07, gain: 0.03, delay: i * (0.09 + (i > 5 ? 0.05 : 0)), vibrato: { depth: 60, rate: 25 } });
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
    const k = r();
    if (bed === 'pond') {
      if (k < 0.4) croak(voice, r);
      else if (k < 0.75) drip(voice, r);
      else chirps(voice, r);
    } else if (bed === 'greenhouse') {
      // Condensation dripping off the glass, a bird outside now and then.
      if (k < 0.8) drip(voice, r);
      else chirps(voice, r);
    } else if (bed === 'orchard') {
      if (k < 0.35) coo(voice, r);
      else chirps(voice, r);
    } else if (bed === 'rockery') {
      if (k < 0.65) trickle(voice, r);
      else chirps(voice, r);
    } else if (bed === 'allotment') {
      if (k < 0.45) robin(voice, r);
      else if (k < 0.7) spade(voice, r);
      else chirps(voice, r);
    } else if (bed === 'meadow') {
      if (k < 0.6) chirr(voice, r);
      else skylark(voice, r);
    } else if (bed === 'ruins') {
      if (k < 0.45) jackdaw(voice, r);
      else if (k < 0.75) whistle(voice, r);
      else chirps(voice, r);
    } else if (bed === 'night') {
      if (k < 0.35) owl(voice, r);
      else if (k < 0.6) nightingale(voice, r);
      else chirr(voice, r);
    } else if (bed === 'barn') {
      if (k < 0.4) twitter(voice, r);
      else if (k < 0.7) creak(voice, r);
      else coo(voice, r);
    } else chirps(voice, r);
    setTimeout(() => lift.disconnect(), 2000);
  }
}
