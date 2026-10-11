import type { SfxId } from './recipes';

/**
 * Every sound effect, synthesized with the Web Audio API: short tones with
 * pitch slides and bursts of filtered noise, kept soft and toy-like to suit
 * the field-notebook look (the same voice as InkFish).
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
  // A nibble: two quick crunches of grit and a tiny drop in pitch, pitched by the meal.
  eat: (v) => {
    noise(v, { dur: 0.035, gain: 0.3, filter: 'bandpass', from: 1900, q: 3 });
    noise(v, { dur: 0.035, gain: 0.22, filter: 'bandpass', from: 1500, q: 3, delay: 0.05 });
    tone(v, { from: 720, to: 420, dur: 0.09, gain: 0.14 });
  },
  // Eaten in a full shell: a dull, hollow bonk.
  full: (v) => tone(v, { type: 'triangle', from: 230, to: 170, dur: 0.22, gain: 0.22 }),
  grow: (v) => notes(v, [523, 659, 784, 1047], 0.08, { type: 'triangle', dur: 0.22, gain: 0.2 }),
  // Claws in the sand: a short scrape and a soft thud.
  dig: (v) => {
    noise(v, { dur: 0.12, gain: 0.4, filter: 'bandpass', from: 1100, to: 500, q: 1.2, attack: 0.01 });
    noise(v, { dur: 0.08, gain: 0.25, filter: 'lowpass', from: 400, delay: 0.03 });
  },
  // Sand patted down.
  place: (v) => {
    noise(v, { dur: 0.09, gain: 0.35, filter: 'lowpass', from: 600, to: 250, attack: 0.004 });
    tone(v, { from: 150, to: 90, dur: 0.08, gain: 0.12 });
  },
  // Dune sand running into a hole: a dry hiss.
  pour: (v) => noise(v, { dur: 0.6, gain: 0.16, filter: 'bandpass', from: 3200, to: 1600, q: 0.8, attack: 0.12 }),
  jump: (v) => tone(v, { type: 'triangle', from: 300, to: 540, dur: 0.1, gain: 0.14 }),
  // Pulled into the shell: a quick tuck and a tap.
  hide: (v) => {
    tone(v, { from: 280, to: 160, dur: 0.08, gain: 0.16 });
    noise(v, { dur: 0.03, gain: 0.2, filter: 'bandpass', from: 2200, q: 3, delay: 0.06 });
  },
  // Out of the shell to move house: a small, nervous squeak.
  out: (v) => tone(v, { from: 900, to: 1300, dur: 0.12, gain: 0.1, vibrato: { depth: 40, rate: 24 } }),
  // Into the new shell: a hollow clack, then a bright two-note chime.
  movein: (v) => {
    noise(v, { dur: 0.05, gain: 0.45, filter: 'bandpass', from: 1300, q: 5, attack: 0.002 });
    tone(v, { type: 'triangle', from: 660, dur: 0.22, gain: 0.16, delay: 0.06 });
    tone(v, { type: 'triangle', from: 990, dur: 0.3, gain: 0.14, delay: 0.14 });
  },
  // Rapping on a rival's shell: knock knock.
  knock: (v) => {
    for (const d of [0, 0.15]) {
      noise(v, { dur: 0.04, gain: 0.5, filter: 'bandpass', from: 900, q: 4, delay: d, attack: 0.002 });
      tone(v, { from: 320, to: 260, dur: 0.05, gain: 0.14, delay: d });
    }
  },
  // A beak glancing off the shell: tok!
  tok: (v) => {
    noise(v, { dur: 0.04, gain: 0.5, filter: 'bandpass', from: 1800, q: 5, attack: 0.002 });
    tone(v, { from: 1250, dur: 0.12, gain: 0.08, attack: 0.002 });
  },
  caught: (v) => {
    tone(v, { from: 200, to: 70, dur: 0.25, gain: 0.42 });
    noise(v, { dur: 0.14, gain: 0.2, filter: 'lowpass', from: 900 });
  },
  // A steam vent blowing: a hiss over a rumble.
  steam: (v) => {
    noise(v, { dur: 0.5, gain: 0.35, filter: 'highpass', from: 2200, attack: 0.02 });
    tone(v, { from: 80, to: 55, dur: 0.4, gain: 0.2 });
  },
  // A bird folding its wings to stoop: a falling cry and the rush of air.
  stoop: (v) => {
    tone(v, { type: 'square', from: 1700, to: 950, dur: 0.28, gain: 0.06, vibrato: { depth: 40, rate: 18 } });
    noise(v, { dur: 0.4, gain: 0.3, filter: 'bandpass', from: 500, to: 2400, q: 1, attack: 0.15, delay: 0.1 });
  },
  // A rival trading up: a clack and a rising pair of notes.
  trade: (v) => {
    noise(v, { dur: 0.04, gain: 0.35, filter: 'bandpass', from: 1400, q: 5, attack: 0.002 });
    notes(v, [587, 784], 0.08, { type: 'triangle', dur: 0.16, gain: 0.12 });
  },
  // A little crab falling in line: a chirp.
  join: (v) => notes(v, [880, 1175], 0.06, { type: 'triangle', dur: 0.1, gain: 0.13 }),
  // A find dug up: a sparkle.
  find: (v) => {
    notes(v, [1047, 1319, 1568], 0.05, { type: 'square', dur: 0.1, gain: 0.06 });
    tone(v, { type: 'triangle', from: 2093, dur: 0.35, gain: 0.1, delay: 0.15, vibrato: { depth: 20, rate: 14 } });
  },
  // A marked hunter eaten: a big crunch and a flourish.
  quarry: (v) => {
    noise(v, { dur: 0.1, gain: 0.45, filter: 'bandpass', from: 1200, q: 2 });
    tone(v, { from: 300, to: 90, dur: 0.24, gain: 0.32 });
    notes(v, [659, 880, 1047], 0.07, { type: 'triangle', dur: 0.18, gain: 0.14 });
  },
  // The tide turning in: a long wave washing up the sand.
  tide: (v) => {
    noise(v, { dur: 1.4, gain: 0.3, filter: 'lowpass', from: 350, to: 1500, attack: 0.5 });
    noise(v, { dur: 0.8, gain: 0.12, filter: 'highpass', from: 3000, attack: 0.3, delay: 0.5 });
  },
  // A squall coming on: rain hissing in.
  rain: (v) => noise(v, { dur: 1.6, gain: 0.18, filter: 'highpass', from: 3800, attack: 0.6 }),
  // A gust getting up: air rushing past.
  gust: (v) => noise(v, { dur: 1.1, gain: 0.32, filter: 'bandpass', from: 300, to: 1300, q: 0.7, attack: 0.45 }),
  // A cloud over the moon: a low, uneasy chord.
  dark: (v) => {
    tone(v, { type: 'triangle', from: 110, dur: 1.3, gain: 0.14, attack: 0.4 });
    tone(v, { type: 'triangle', from: 131, dur: 1.3, gain: 0.1, attack: 0.5 });
  },
  win: (v) => {
    notes(v, [523, 659, 784], 0.12, { type: 'triangle', dur: 0.2, gain: 0.2 });
    tone(v, { type: 'triangle', from: 1047, dur: 0.6, gain: 0.22, delay: 0.36 });
  },
  lose: (v) => notes(v, [392, 330, 262], 0.18, { type: 'triangle', dur: 0.3, gain: 0.2, vibrato: { depth: 4, rate: 6 } }),
  // A pencil tick.
  click: (v) => noise(v, { dur: 0.03, gain: 0.25, filter: 'bandpass', from: 2800, q: 2 }),
};

export function hasRecipe(id: string): boolean {
  return Object.hasOwn(RECIPES, id);
}

export function synthesize(id: SfxId, v: Voice): void {
  RECIPES[id](v);
}
