import { buzz, noise, noiseBuffer, tone, type Voice } from './synth';

/** Where the player is, by ear: the farm by day, the farm at night, the map (a quieter farm). */
export type Bed = 'farm' | 'night' | 'map';

/** How often the bed may add a creature's call, ms. */
const TICK_MS = 700;
/** The wind bed's loudness in each place. */
const BED_LEVEL: Readonly<Record<Bed, number>> = { farm: 0.05, night: 0.035, map: 0.04 };
/** How loud the creatures' calls sit, whatever the bed's level. */
const CALL_LEVEL = 0.35;
const FADE_TAU = 0.6;
/** The slither at full speed, and how fast its loudness follows the snake. */
const SLITHER_MAX = 0.1;
const SLITHER_TAU = 0.12;
/** The scrape's sway (the S-bends of the body), Hz when barely moving and at full speed. */
const SWAY_RATE: readonly [number, number] = [1.2, 4.5];

type Call = (v: Voice, rnd: () => number) => void;

/** A short songbird phrase: two to five quick chirps. */
function chirps(v: Voice, rnd: () => number): void {
  const n = 2 + Math.floor(rnd() * 4);
  const base = 2600 + rnd() * 1400;
  for (let i = 0; i < n; i++) {
    const f = base * (1 + (rnd() - 0.5) * 0.25);
    tone(v, { from: f, to: f * (rnd() < 0.5 ? 1.35 : 0.8), dur: 0.06 + rnd() * 0.05, gain: 0.05, delay: i * (0.09 + rnd() * 0.05) });
  }
}

/** An American robin on the fence: a run of rich caroling two-note slurs, "cheerily, cheer-up". */
function robin(v: Voice, rnd: () => number): void {
  const n = 3 + Math.floor(rnd() * 3);
  for (let i = 0; i < n; i++) {
    const f = 2200 + rnd() * 700;
    const at = i * (0.24 + rnd() * 0.06);
    tone(v, { from: f, to: f * (rnd() < 0.5 ? 1.2 : 0.85), dur: 0.08, gain: 0.04, delay: at, vibrato: { depth: 40, rate: 30 } });
    tone(v, { from: f * 1.15, to: f * 0.95, dur: 0.07, gain: 0.035, delay: at + 0.09 });
  }
}

/** Hens across the yard: a few contented clucks. */
function hens(v: Voice, rnd: () => number): void {
  const f = 380 + rnd() * 80;
  for (let i = 0; i < 3 + Math.floor(rnd() * 3); i++) {
    buzz(v, { type: 'square', from: f, glide: [[0.06, f * 0.8]], dur: 0.07, gain: 0.12, attack: 0.005, formant: 850, q: 2.5, delay: i * (0.15 + rnd() * 0.12) });
  }
}

/** A far-off rooster: "cock-a-doodle-doo", the last note long and falling. */
function rooster(v: Voice, rnd: () => number): void {
  const f = 560 + rnd() * 60;
  const mouth = { formant: 1100, q: 1.5, vibrato: { depth: 15, rate: 30 } } as const;
  [0, 0.16, 0.33].forEach((t, i) => buzz(v, { ...mouth, from: f * (1 + i * 0.1), glide: [[0.12, f * (1.12 + i * 0.1)]], dur: 0.13, gain: 0.12, delay: t }));
  buzz(v, { ...mouth, from: f * 1.35, glide: [[0.15, f * 1.46], [0.65, f]], dur: 0.7, gain: 0.12, hold: 0.25, delay: 0.52 });
}

/** A cow in the next field: a slow, low "mmoooo". */
function cow(v: Voice, rnd: () => number): void {
  const f = 100 + rnd() * 15;
  buzz(v, { from: f, glide: [[0.3, f * 1.2], [1.1, f * 0.92]], dur: 1.2, gain: 0.3, attack: 0.15, hold: 0.5, formant: 320, formantTo: 640, q: 1.5, vibrato: { depth: 3, rate: 5 } });
}

/** Field crickets: two of them, each a short train of high pulses now and then. */
function crickets(v: Voice, rnd: () => number): void {
  for (const f of [4400, 4900]) {
    if (rnd() < 0.3) continue;
    const at = rnd() * 0.3;
    const pulses = 3 + Math.floor(rnd() * 2);
    for (let i = 0; i < pulses; i++) tone(v, { from: f, dur: 0.018, gain: 0.025, attack: 0.004, delay: at + i * 0.035 });
  }
}

/** A great horned owl: "hoo, h'hoo-hoo, hoo, hoo". */
function owl(v: Voice, rnd: () => number): void {
  const f = 290 + rnd() * 30;
  ([[0, 0.25], [0.45, 0.12], [0.6, 0.12], [0.85, 0.35], [1.35, 0.35]] as const).forEach(([t, d]) =>
    tone(v, { from: f, to: f * 0.95, dur: d, gain: 0.05, attack: 0.04, hold: d * 0.4, delay: t }),
  );
}

/** An old barn timber settling: a slow, low stick-slip creak. */
function creak(v: Voice, rnd: () => number): void {
  const dur = 0.6 + rnd() * 0.3;
  buzz(v, { from: 26 + rnd() * 6, glide: [[dur, 44 + rnd() * 10]], dur, gain: 0.4, attack: 0.15, hold: dur * 0.4, formant: 650 + rnd() * 200, q: 5 });
}

/** The place's creatures: each call and its chance per tick. */
const CALLS: Readonly<Record<Bed, readonly (readonly [number, Call])[]>> = {
  farm: [[0.14, chirps], [0.06, robin], [0.07, hens], [0.015, rooster], [0.015, cow]],
  night: [[0.8, crickets], [0.05, owl], [0.05, creak]],
  map: [[0.1, chirps], [0.03, robin], [0.04, hens], [0.01, cow]],
};

/**
 * The game's sound beneath its effects: a bed of wind in the grass for the
 * place with creatures calling now and then, and the dry scrape of scales
 * on the ground, swelling while the snake slithers and silent when it stops.
 */
export class Ambience {
  private readonly bedGain: GainNode;
  private readonly slitherGain: GainNode;
  private readonly sway: OscillatorNode;
  private readonly sources: AudioScheduledSourceNode[] = [];
  private bed: Bed | null = null;
  private timer: ReturnType<typeof setInterval> | null = null;
  private slither = 0;

  constructor(private readonly ctx: AudioContext, out: AudioNode) {
    this.bedGain = ctx.createGain();
    this.bedGain.gain.value = 0;
    this.bedGain.connect(out);
    this.slitherGain = ctx.createGain();
    this.slitherGain.gain.value = 0;
    this.slitherGain.connect(out);
    this.wind();
    this.sway = this.scales();
  }

  setBed(bed: Bed | null): void {
    this.bed = bed;
    this.bedGain.gain.setTargetAtTime(bed ? BED_LEVEL[bed] : 0, this.ctx.currentTime, FADE_TAU);
    if (bed && !this.timer) this.timer = setInterval(() => this.call(), TICK_MS);
    if (!bed && this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  /** How fast the snake is slithering, 0 (still) to 1 (full speed). */
  setSlither(level: number): void {
    // Called every frame: only a real change is scheduled (each call adds an automation event).
    const v = Math.round(Math.max(0, Math.min(1, level)) * 50) / 50;
    if (v === this.slither) return;
    this.slither = v;
    const now = this.ctx.currentTime;
    this.slitherGain.gain.cancelScheduledValues(now);
    this.slitherGain.gain.setTargetAtTime(v * SLITHER_MAX, now, SLITHER_TAU);
    this.sway.frequency.cancelScheduledValues(now);
    this.sway.frequency.setTargetAtTime(SWAY_RATE[0] + (SWAY_RATE[1] - SWAY_RATE[0]) * v, now, 0.3);
  }

  destroy(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    for (const s of this.sources) s.stop();
    this.bedGain.disconnect();
    this.slitherGain.disconnect();
  }

  private loop(): AudioBufferSourceNode {
    const src = this.ctx.createBufferSource();
    src.buffer = noiseBuffer(this.ctx);
    src.loop = true;
    this.sources.push(src);
    return src;
  }

  private lfo(rate: number): OscillatorNode {
    const osc = this.ctx.createOscillator();
    osc.frequency.value = rate;
    this.sources.push(osc);
    return osc;
  }

  /** Wind in the grass: band-passed noise, its colour drifting slowly, with a faint high hiss of blades. */
  private wind(): void {
    const src = this.loop();
    const band = this.ctx.createBiquadFilter();
    band.type = 'bandpass';
    band.frequency.value = 520;
    band.Q.value = 0.6;
    const sway = this.lfo(0.07);
    const depth = this.ctx.createGain();
    depth.gain.value = 220;
    sway.connect(depth).connect(band.frequency);
    src.connect(band).connect(this.bedGain);
    const blades = this.ctx.createBiquadFilter();
    blades.type = 'bandpass';
    blades.frequency.value = 3500;
    blades.Q.value = 0.8;
    const faint = this.ctx.createGain();
    faint.gain.value = 0.12;
    src.connect(blades).connect(faint).connect(this.bedGain);
    src.start(0, Math.random());
    sway.start();
  }

  /**
   * Scales on dry ground: a soft high scrape and a duller rub beneath it,
   * swaying in loudness with the bends of the body. Returns the sway, whose
   * rate follows the speed.
   */
  private scales(): OscillatorNode {
    const src = this.loop();
    const swell = this.ctx.createGain();
    swell.gain.value = 0.65;
    const sway = this.lfo(SWAY_RATE[0]);
    const depth = this.ctx.createGain();
    depth.gain.value = 0.35;
    sway.connect(depth).connect(swell.gain);
    const scrape = this.ctx.createBiquadFilter();
    scrape.type = 'bandpass';
    scrape.frequency.value = 2600;
    scrape.Q.value = 0.9;
    src.connect(scrape).connect(swell);
    const rub = this.ctx.createBiquadFilter();
    rub.type = 'bandpass';
    rub.frequency.value = 900;
    rub.Q.value = 1.2;
    const under = this.ctx.createGain();
    under.gain.value = 0.5;
    src.connect(rub).connect(under).connect(swell);
    swell.connect(this.slitherGain);
    src.start(0, Math.random());
    sway.start();
    return sway;
  }

  private call(): void {
    const bed = this.bed;
    if (!bed || this.ctx.state !== 'running') return;
    const r = Math.random;
    const due = CALLS[bed].filter(([chance]) => r() < chance);
    if (due.length === 0) return;
    // The calls ride on the bed's level, which is quiet: lift them back to a natural loudness.
    const lift = this.ctx.createGain();
    lift.gain.value = CALL_LEVEL / BED_LEVEL[bed];
    lift.connect(this.bedGain);
    const voice: Voice = { ctx: this.ctx, out: lift, t: this.ctx.currentTime + 0.02, pitch: 1 };
    for (const [, play] of due) play(voice, r);
    setTimeout(() => lift.disconnect(), 2500);
  }
}
