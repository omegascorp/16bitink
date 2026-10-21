import type { SfxId } from './recipes';

/**
 * Every sound effect, synthesized with the Web Audio API: short tones with
 * pitch slides and bursts of filtered noise, kept soft and toy-like to suit
 * the notebook look (the same voice as InkFish and InkCrab).
 */
export interface Voice {
  readonly ctx: AudioContext;
  /** Where this sound plays into (its own pan and level). */
  readonly out: AudioNode;
  /** Start time, seconds on the context clock. */
  readonly t: number;
  /** Pitch multiplier. */
  readonly pitch: number;
}

interface ToneOpts {
  readonly type?: OscillatorType;
  readonly from: number;
  readonly to?: number;
  readonly dur: number;
  readonly gain: number;
  readonly delay?: number;
  readonly attack?: number;
  /** Wobble depth in Hz and rate. */
  readonly vibrato?: { readonly depth: number; readonly rate: number };
}

function envelope(v: Voice, start: number, dur: number, peak: number, attack: number): GainNode {
  const g = v.ctx.createGain();
  g.gain.setValueAtTime(0.0001, start);
  g.gain.exponentialRampToValueAtTime(peak, start + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
  g.connect(v.out);
  return g;
}

export function tone(v: Voice, o: ToneOpts): void {
  const start = v.t + (o.delay ?? 0);
  const osc = v.ctx.createOscillator();
  osc.type = o.type ?? 'sine';
  osc.frequency.setValueAtTime(o.from * v.pitch, start);
  if (o.to !== undefined) osc.frequency.exponentialRampToValueAtTime(Math.max(20, o.to * v.pitch), start + o.dur);
  if (o.vibrato) {
    const lfo = v.ctx.createOscillator();
    const depth = v.ctx.createGain();
    lfo.frequency.value = o.vibrato.rate;
    depth.gain.value = o.vibrato.depth;
    lfo.connect(depth).connect(osc.frequency);
    lfo.start(start);
    lfo.stop(start + o.dur + 0.05);
  }
  osc.connect(envelope(v, start, o.dur, o.gain, o.attack ?? 0.006));
  osc.start(start);
  osc.stop(start + o.dur + 0.05);
}

interface NoiseOpts {
  readonly dur: number;
  readonly gain: number;
  readonly filter: BiquadFilterType;
  readonly from: number;
  readonly to?: number;
  readonly q?: number;
  readonly delay?: number;
  readonly attack?: number;
}

const noiseBuffers = new WeakMap<AudioContext, AudioBuffer>();

export function noiseBuffer(ctx: AudioContext): AudioBuffer {
  const cached = noiseBuffers.get(ctx);
  if (cached) return cached;
  const buf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  noiseBuffers.set(ctx, buf);
  return buf;
}

export function noise(v: Voice, o: NoiseOpts): void {
  const start = v.t + (o.delay ?? 0);
  const src = v.ctx.createBufferSource();
  src.buffer = noiseBuffer(v.ctx);
  const filter = v.ctx.createBiquadFilter();
  filter.type = o.filter;
  filter.Q.value = o.q ?? 1;
  filter.frequency.setValueAtTime(o.from * v.pitch, start);
  if (o.to !== undefined) filter.frequency.exponentialRampToValueAtTime(o.to * v.pitch, start + o.dur);
  src.connect(filter).connect(envelope(v, start, o.dur, o.gain, o.attack ?? 0.004));
  src.start(start, Math.random() * 0.5);
  src.stop(start + o.dur + 0.05);
}

/** A run of notes (Hz), one after another. */
function notes(v: Voice, freqs: readonly number[], step: number, o: Omit<ToneOpts, 'from' | 'delay'>): void {
  freqs.forEach((f, i) => tone(v, { ...o, from: f, delay: i * step }));
}

const RECIPES: Readonly<Record<SfxId, (v: Voice) => void>> = {
  // A tongue flick: a wet little thwip.
  spit: (v) => {
    noise(v, { dur: 0.05, gain: 0.3, filter: 'bandpass', from: 2600, to: 900, q: 2 });
    tone(v, { from: 520, to: 980, dur: 0.07, gain: 0.12 });
  },
  // Marbles rolling over: two quick ticks.
  swap: (v) => {
    noise(v, { dur: 0.025, gain: 0.3, filter: 'bandpass', from: 3200, q: 5 });
    noise(v, { dur: 0.025, gain: 0.25, filter: 'bandpass', from: 2600, q: 5, delay: 0.05 });
  },
  // A springy leap off a lily pad.
  hop: (v) => {
    tone(v, { from: 300, to: 760, dur: 0.16, gain: 0.14, vibrato: { depth: 20, rate: 30 } });
    noise(v, { dur: 0.06, gain: 0.15, filter: 'bandpass', from: 900, to: 1600, q: 2 });
  },
  // Landing on a pad: a soft wet plop and a ripple.
  plop: (v) => {
    tone(v, { from: 900, to: 260, dur: 0.12, gain: 0.18 });
    noise(v, { dur: 0.25, gain: 0.14, filter: 'bandpass', from: 1400, to: 500, q: 1.5, delay: 0.03 });
  },
  // A dragonfly's wings: a fluttering zip.
  dragonfly: (v) => {
    noise(v, { dur: 0.45, gain: 0.22, filter: 'bandpass', from: 1800, to: 3600, q: 3, attack: 0.02 });
    tone(v, { type: 'sawtooth', from: 180, to: 240, dur: 0.45, gain: 0.05, vibrato: { depth: 60, rate: 45 } });
  },
  // The line pouring out of the burrow: a rattle of marbles that slows.
  rush: (v) => {
    for (let i = 0; i < 14; i++) noise(v, { dur: 0.03, gain: 0.18 - i * 0.008, filter: 'bandpass', from: 2400 + (i % 3) * 500, q: 5, delay: i * (0.04 + i * 0.006) });
    noise(v, { dur: 1.2, gain: 0.16, filter: 'lowpass', from: 600, to: 250, attack: 0.05 });
  },
  // A Geode let go: a high crystal chime with a shimmer.
  crystal: (v) => {
    notes(v, [1568, 2093, 2637], 0.04, { type: 'sine', dur: 0.35, gain: 0.07 });
    tone(v, { type: 'triangle', from: 3136, dur: 0.5, gain: 0.03, delay: 0.1, vibrato: { depth: 30, rate: 14 } });
  },
  // A bud opening: a soft rising flutter of petals.
  blossom: (v) => {
    noise(v, { dur: 0.18, gain: 0.12, filter: 'bandpass', from: 1800, to: 3600, q: 2, attack: 0.03 });
    notes(v, [660, 880, 1320], 0.05, { type: 'sine', dur: 0.16, gain: 0.08 });
  },
  // A stone breaking: a dry crack and a scatter of grit.
  crack: (v) => {
    noise(v, { dur: 0.05, gain: 0.5, filter: 'highpass', from: 1500, attack: 0.001 });
    noise(v, { dur: 0.22, gain: 0.18, filter: 'bandpass', from: 2600, to: 1200, q: 1.2, delay: 0.03 });
    tone(v, { from: 180, to: 90, dur: 0.08, gain: 0.12 });
  },
  // A windfall dropping onto the grass.
  thud: (v) => {
    tone(v, { from: 160, to: 70, dur: 0.12, gain: 0.25 });
    noise(v, { dur: 0.08, gain: 0.12, filter: 'lowpass', from: 600 });
  },
  // Spitting a windfall: a juicy thock and a bright bonus note.
  fruit: (v) => {
    tone(v, { from: 520, to: 260, dur: 0.08, gain: 0.2 });
    noise(v, { dur: 0.06, gain: 0.2, filter: 'bandpass', from: 1200, q: 3 });
    notes(v, [1047, 1568], 0.07, { type: 'triangle', dur: 0.18, gain: 0.1 });
  },
  // Glass on glass: a bright clack.
  stuck: (v) => {
    noise(v, { dur: 0.03, gain: 0.45, filter: 'bandpass', from: 3600, q: 6, attack: 0.001 });
    tone(v, { type: 'triangle', from: 1900, dur: 0.06, gain: 0.08, attack: 0.001 });
  },
  // Marbles popping into ink: a pluck and a splash, pitched up per combo link.
  pop: (v) => {
    tone(v, { type: 'triangle', from: 660, to: 990, dur: 0.12, gain: 0.2 });
    tone(v, { type: 'sine', from: 1320, dur: 0.18, gain: 0.08, delay: 0.03 });
    noise(v, { dur: 0.12, gain: 0.18, filter: 'bandpass', from: 1800, to: 700, q: 1.5, delay: 0.01 });
  },
  // The front of a gap rolling back: a low rumble sliding down.
  pull: (v) => noise(v, { dur: 0.35, gain: 0.3, filter: 'bandpass', from: 700, to: 260, q: 1.2, attack: 0.05 }),
  // Two parts meeting: a heavy clack.
  join: (v) => {
    noise(v, { dur: 0.04, gain: 0.5, filter: 'bandpass', from: 2200, q: 5, attack: 0.001 });
    tone(v, { from: 300, to: 220, dur: 0.07, gain: 0.12 });
  },
  // Through a gap: a whistle.
  gap: (v) => tone(v, { from: 1200, to: 2100, dur: 0.18, gain: 0.08, vibrato: { depth: 30, rate: 20 } }),
  // A streak: a quick rising arpeggio.
  streak: (v) => notes(v, [784, 988, 1175], 0.05, { type: 'triangle', dur: 0.12, gain: 0.12 }),
  // A charm used: a sparkle.
  charm: (v) => {
    notes(v, [1047, 1319, 1568, 2093], 0.045, { type: 'square', dur: 0.09, gain: 0.05 });
    tone(v, { type: 'triangle', from: 1568, dur: 0.4, gain: 0.08, delay: 0.18, vibrato: { depth: 18, rate: 12 } });
  },
  // A charm coming loose to fall: a falling chime.
  drop: (v) => tone(v, { type: 'triangle', from: 1400, to: 900, dur: 0.25, gain: 0.1 }),
  // Caught: a snap of the jaws and a bright note.
  catch: (v) => {
    noise(v, { dur: 0.03, gain: 0.4, filter: 'bandpass', from: 1500, q: 4 });
    tone(v, { type: 'triangle', from: 1175, dur: 0.22, gain: 0.14, delay: 0.03 });
  },
  // The line close to the well: a soft heartbeat.
  danger: (v) => {
    tone(v, { from: 70, to: 55, dur: 0.12, gain: 0.35 });
    tone(v, { from: 66, to: 50, dur: 0.12, gain: 0.25, delay: 0.17 });
  },
  // A marble into the well: a hollow plop far below.
  well: (v) => {
    tone(v, { from: 420, to: 140, dur: 0.35, gain: 0.3 });
    noise(v, { dur: 0.4, gain: 0.2, filter: 'lowpass', from: 900, to: 200, delay: 0.25 });
    tone(v, { from: 180, to: 120, dur: 0.6, gain: 0.12, delay: 0.3, vibrato: { depth: 6, rate: 5 } });
  },
  // The bar is full: the burrows close.
  filled: (v) => notes(v, [523, 659, 784, 1047], 0.07, { type: 'triangle', dur: 0.2, gain: 0.16 }),
  win: (v) => {
    notes(v, [523, 659, 784], 0.12, { type: 'triangle', dur: 0.2, gain: 0.2 });
    tone(v, { type: 'triangle', from: 1047, dur: 0.6, gain: 0.22, delay: 0.36 });
  },
  lose: (v) => notes(v, [392, 330, 262], 0.18, { type: 'triangle', dur: 0.3, gain: 0.2, vibrato: { depth: 4, rate: 6 } }),
  // A pencil tick.
  click: (v) => noise(v, { dur: 0.03, gain: 0.25, filter: 'bandpass', from: 2800, q: 2 }),
  // Little feet on stone: four soft pats.
  steps: (v) => {
    for (let i = 0; i < 4; i++) noise(v, { dur: 0.025, gain: 0.16, filter: 'bandpass', from: 1500 + (i % 2) * 400, q: 3, delay: i * 0.075 });
  },
  // A card turned over: a paper flick and a soft note.
  card: (v) => {
    noise(v, { dur: 0.08, gain: 0.2, filter: 'highpass', from: 2500, to: 5000 });
    tone(v, { type: 'triangle', from: 880, dur: 0.18, gain: 0.07, delay: 0.04 });
  },
};

export function hasRecipe(id: string): boolean {
  return Object.hasOwn(RECIPES, id);
}

/** Each sound's loudness, set by ear against InkCrab's. */
export const LEVEL: Readonly<Record<SfxId, number>> = {
  spit: 2, swap: 2, stuck: 1.6, pop: 1.8, pull: 2.2, join: 1.6, gap: 2, streak: 1.6,
  charm: 2.4, drop: 2, catch: 2, danger: 2.2, well: 1.6, filled: 1.4, win: 1, lose: 1, click: 1.1,
  hop: 1.8, plop: 1.8, dragonfly: 2.8, rush: 1.6, steps: 1.4, card: 1.2,
  crystal: 2.2, blossom: 2, crack: 1.8, thud: 1.6, fruit: 2,
};

export function synthesize(id: SfxId, v: Voice): void {
  const level = v.ctx.createGain();
  level.gain.value = LEVEL[id];
  level.connect(v.out);
  RECIPES[id]({ ...v, out: level });
}
