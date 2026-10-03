import type { SfxId } from './recipes';

/**
 * Every sound effect, synthesized with the Web Audio API: short tones with
 * pitch slides and bursts of filtered noise, kept soft and toy-like to suit
 * the sketchbook look.
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

function tone(v: Voice, o: ToneOpts): void {
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

function noiseBuffer(ctx: AudioContext): AudioBuffer {
  const cached = noiseBuffers.get(ctx);
  if (cached) return cached;
  const buf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  noiseBuffers.set(ctx, buf);
  return buf;
}

function noise(v: Voice, o: NoiseOpts): void {
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
  // A bubbly gulp, pitched by the size of the meal.
  eat: (v) => {
    tone(v, { from: 620, to: 190, dur: 0.11, gain: 0.32 });
    noise(v, { dur: 0.04, gain: 0.12, filter: 'bandpass', from: 2400, q: 2 });
  },
  eatBig: (v) => {
    tone(v, { from: 300, to: 80, dur: 0.24, gain: 0.4 });
    tone(v, { type: 'triangle', from: 880, dur: 0.3, gain: 0.12, delay: 0.12 });
    tone(v, { type: 'triangle', from: 1320, dur: 0.3, gain: 0.1, delay: 0.2 });
  },
  dash: (v) => noise(v, { dur: 0.2, gain: 0.95, filter: 'bandpass', from: 500, to: 2200, q: 0.8, attack: 0.02 }),
  grow: (v) => notes(v, [523, 659, 784, 1047], 0.08, { type: 'triangle', dur: 0.22, gain: 0.2 }),
  hurt: (v) => {
    tone(v, { from: 170, to: 55, dur: 0.22, gain: 0.45 });
    noise(v, { dur: 0.12, gain: 0.2, filter: 'lowpass', from: 900 });
  },
  zap: (v) => {
    tone(v, { type: 'sawtooth', from: 95, dur: 0.28, gain: 0.12, vibrato: { depth: 30, rate: 38 } });
    noise(v, { dur: 0.22, gain: 0.1, filter: 'highpass', from: 3200 });
  },
  // The barb bites, then the reel ratchets.
  hooked: (v) => {
    tone(v, { from: 1860, dur: 0.18, gain: 0.14 });
    tone(v, { from: 2790, dur: 0.12, gain: 0.08 });
    for (let i = 0; i < 6; i++) noise(v, { dur: 0.025, gain: 0.14, filter: 'bandpass', from: 3500, q: 6, delay: 0.12 + i * 0.055 });
  },
  free: (v) => tone(v, { type: 'triangle', from: 380, to: 900, dur: 0.18, gain: 0.22 }),
  splash: (v) => {
    noise(v, { dur: 0.38, gain: 0.3, filter: 'lowpass', from: 2600, to: 500, attack: 0.01 });
    tone(v, { from: 900, to: 1500, dur: 0.06, gain: 0.08, delay: 0.03 });
  },
  squawk: (v) => {
    tone(v, { type: 'square', from: 980, to: 620, dur: 0.16, gain: 0.16, vibrato: { depth: 60, rate: 30 } });
    tone(v, { type: 'square', from: 900, to: 560, dur: 0.12, gain: 0.13, delay: 0.17 });
  },
  // A bonus: a swoosh up into a quick bright major arpeggio, with a shimmer on top.
  powerup: (v) => {
    tone(v, { type: 'triangle', from: 260, to: 1040, dur: 0.14, gain: 0.16 });
    noise(v, { dur: 0.14, gain: 0.35, filter: 'bandpass', from: 900, to: 4200, q: 1.2, attack: 0.03 });
    notes(v, [784, 988, 1175, 1568], 0.045, { type: 'square', dur: 0.12, gain: 0.07 });
    tone(v, { type: 'triangle', from: 1568, dur: 0.38, gain: 0.16, delay: 0.18, vibrato: { depth: 22, rate: 14 } });
    tone(v, { from: 3136, dur: 0.3, gain: 0.05, delay: 0.2 });
  },
  yuck: (v) => tone(v, { type: 'square', from: 320, to: 140, dur: 0.3, gain: 0.2, vibrato: { depth: 12, rate: 9 } }),
  boom: (v) => {
    noise(v, { dur: 0.5, gain: 0.5, filter: 'lowpass', from: 1400, to: 120 });
    tone(v, { from: 110, to: 40, dur: 0.45, gain: 0.4 });
  },
  clang: (v) => {
    for (const [f, g] of [[520, 0.16], [1235, 0.1], [1870, 0.07], [2690, 0.05]] as const) tone(v, { from: f, dur: 0.45, gain: g, attack: 0.002 });
  },
  drop: (v) => tone(v, { from: 900, to: 1600, dur: 0.08, gain: 0.22 }),
  frenzy: (v) => notes(v, [784, 1047, 1319], 0.05, { type: 'triangle', dur: 0.14, gain: 0.14 }),
  spotted: (v) => notes(v, [880, 660], 0.12, { type: 'square', dur: 0.1, gain: 0.16 }),
  // A bottle breaks on the seabed: a crunch of glass, then tinkling bits.
  smash: (v) => {
    noise(v, { dur: 0.16, gain: 0.45, filter: 'highpass', from: 2500, attack: 0.002 });
    noise(v, { dur: 0.25, gain: 0.25, filter: 'lowpass', from: 700, to: 200 });
    for (const [f, d] of [[3520, 0.04], [4700, 0.09], [3950, 0.15], [5270, 0.22]] as const) tone(v, { from: f, dur: 0.12, gain: 0.05, delay: d, attack: 0.002 });
  },
  win: (v) => {
    notes(v, [523, 659, 784], 0.12, { type: 'triangle', dur: 0.2, gain: 0.2 });
    tone(v, { type: 'triangle', from: 1047, dur: 0.6, gain: 0.22, delay: 0.36 });
  },
  lose: (v) => notes(v, [392, 330, 262], 0.18, { type: 'triangle', dur: 0.3, gain: 0.2, vibrato: { depth: 4, rate: 6 } }),
  // A pencil tick.
  click: (v) => noise(v, { dur: 0.03, gain: 0.25, filter: 'bandpass', from: 2800, q: 2 }),
};

export function synthesize(id: SfxId, v: Voice): void {
  RECIPES[id](v);
}
