import type { SfxId } from './sound';

/**
 * Every sound effect, synthesized with the Web Audio API: short tones with
 * pitch slides and bursts of filtered noise, kept soft and toy-like to suit
 * the notebook look (the same voice as the other 16bit.ink games).
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
  // A pen tap on paper.
  click: (v) => noise(v, { dur: 0.03, gain: 0.25, filter: 'bandpass', from: 2400, q: 4 }),
  // Hooves on a dirt road: two soft knocks.
  step: (v) => {
    noise(v, { dur: 0.05, gain: 0.22, filter: 'lowpass', from: 700, to: 300 });
    noise(v, { dur: 0.05, gain: 0.16, filter: 'lowpass', from: 650, to: 280, delay: 0.09 });
  },
  // Coins and goods into the purse: a bright jingle.
  pickup: (v) => notes(v, [1319, 1568, 2093], 0.05, { type: 'triangle', dur: 0.18, gain: 0.08 }),
  // A banner raised: a short fanfare.
  flag: (v) => notes(v, [523, 659, 784], 0.09, { type: 'square', dur: 0.16, gain: 0.04 }),
  // Building: hammer knocks on timber.
  build: (v) => {
    for (let i = 0; i < 3; i++) noise(v, { dur: 0.06, gain: 0.3, filter: 'bandpass', from: 900, q: 3, delay: i * 0.12 });
    tone(v, { from: 180, to: 120, dur: 0.12, gain: 0.08, delay: 0.24 });
  },
  // Troops hired: boots falling in.
  hire: (v) => {
    for (let i = 0; i < 4; i++) noise(v, { dur: 0.04, gain: 0.18, filter: 'lowpass', from: 900, to: 400, delay: i * 0.07 });
  },
  // A blade cutting the air.
  swing: (v) => noise(v, { dur: 0.14, gain: 0.25, filter: 'bandpass', from: 900, to: 3200, q: 2, attack: 0.02 }),
  // A blow landing: a thud with a clank.
  hit: (v) => {
    noise(v, { dur: 0.1, gain: 0.35, filter: 'lowpass', from: 900, to: 200 });
    tone(v, { type: 'square', from: 820, to: 600, dur: 0.05, gain: 0.03 });
  },
  // A bowstring and the arrow's whistle.
  shoot: (v) => {
    tone(v, { type: 'triangle', from: 220, to: 160, dur: 0.08, gain: 0.12 });
    noise(v, { dur: 0.22, gain: 0.14, filter: 'bandpass', from: 3000, to: 1800, q: 4, delay: 0.04 });
  },
  // A spell: a rising shimmer.
  spell: (v) => {
    notes(v, [784, 988, 1175, 1568], 0.05, { type: 'sine', dur: 0.3, gain: 0.07 });
    noise(v, { dur: 0.4, gain: 0.08, filter: 'highpass', from: 4000, attack: 0.05 });
  },
  // A company falls.
  death: (v) => tone(v, { type: 'triangle', from: 330, to: 110, dur: 0.35, gain: 0.1 }),
  // Victory: a short horn call.
  win: (v) => notes(v, [523, 659, 784, 1047], 0.12, { type: 'square', dur: 0.24, gain: 0.05 }),
  // Defeat: falling notes.
  lose: (v) => notes(v, [392, 349, 311, 262], 0.16, { type: 'triangle', dur: 0.3, gain: 0.09 }),
  // A card unfolding: paper.
  card: (v) => noise(v, { dur: 0.18, gain: 0.12, filter: 'highpass', from: 2500, to: 5000, attack: 0.03 }),
  // A new day: a bell.
  day: (v) => {
    tone(v, { from: 880, dur: 0.9, gain: 0.08 });
    tone(v, { from: 1320, dur: 0.6, gain: 0.03 });
  },
};

export function synthesize(id: SfxId, v: Voice): void {
  RECIPES[id](v);
}
