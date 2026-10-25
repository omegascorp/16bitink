import type { SfxId } from './recipes';

/**
 * Every sound effect, synthesized with the Web Audio API: short tones with
 * pitch slides, buzzes heard through a "mouth" filter for the animals, and
 * bursts of filtered noise, kept soft and toy-like to suit the notebook look
 * (the same voice as InkFish, InkCrab and InkGecko).
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

interface Wobble {
  readonly depth: number;
  readonly rate: number;
}

interface Shape {
  readonly dur: number;
  readonly gain: number;
  readonly delay?: number;
  readonly attack?: number;
  /** Seconds to hold the peak before it starts dying away (long calls). */
  readonly hold?: number;
}

interface ToneOpts extends Shape {
  readonly type?: OscillatorType;
  readonly from: number;
  readonly to?: number;
  /** Wobble depth in Hz and rate. */
  readonly vibrato?: Wobble;
}

function envelope(v: Voice, start: number, o: Shape, attack: number): GainNode {
  const g = v.ctx.createGain();
  const peakAt = start + attack;
  g.gain.setValueAtTime(0.0001, start);
  g.gain.exponentialRampToValueAtTime(o.gain, peakAt);
  if (o.hold) g.gain.setValueAtTime(o.gain, Math.max(peakAt, Math.min(peakAt + o.hold, start + o.dur - 0.01)));
  g.gain.exponentialRampToValueAtTime(0.0001, start + o.dur);
  g.connect(v.out);
  return g;
}

/** A slow or fast wobble on an audio parameter. */
function wobble(v: Voice, param: AudioParam, w: Wobble, start: number, end: number): void {
  const lfo = v.ctx.createOscillator();
  const depth = v.ctx.createGain();
  lfo.frequency.value = w.rate;
  depth.gain.value = w.depth;
  lfo.connect(depth).connect(param);
  lfo.start(start);
  lfo.stop(end);
}

export function tone(v: Voice, o: ToneOpts): void {
  const start = v.t + (o.delay ?? 0);
  const osc = v.ctx.createOscillator();
  osc.type = o.type ?? 'sine';
  osc.frequency.setValueAtTime(o.from * v.pitch, start);
  if (o.to !== undefined) osc.frequency.exponentialRampToValueAtTime(Math.max(20, o.to * v.pitch), start + o.dur);
  if (o.vibrato) wobble(v, osc.frequency, o.vibrato, start, start + o.dur + 0.05);
  osc.connect(envelope(v, start, o, o.attack ?? 0.006));
  osc.start(start);
  osc.stop(start + o.dur + 0.05);
}

interface BuzzOpts extends Shape {
  readonly type?: OscillatorType;
  readonly from: number;
  /** The pitch contour after `from`: [seconds from the start, Hz], joined by glides. */
  readonly glide?: readonly (readonly [number, number])[];
  /** The band-pass "mouth" it is heard through: centre Hz (optionally gliding to `formantTo`) and Q. */
  readonly formant: number;
  readonly formantTo?: number;
  readonly q?: number;
  readonly vibrato?: Wobble;
  /** Loudness pulsing (depth 0..0.5, rate Hz): a growl's rattle. */
  readonly tremolo?: Wobble;
}

/** A voiced animal call: a rich wave with a pitch contour, shaped by a formant filter. */
export function buzz(v: Voice, o: BuzzOpts): void {
  const start = v.t + (o.delay ?? 0);
  const end = start + o.dur + 0.05;
  const osc = v.ctx.createOscillator();
  osc.type = o.type ?? 'sawtooth';
  osc.frequency.setValueAtTime(o.from * v.pitch, start);
  for (const [at, f] of o.glide ?? []) osc.frequency.exponentialRampToValueAtTime(Math.max(20, f * v.pitch), start + at);
  if (o.vibrato) wobble(v, osc.frequency, o.vibrato, start, end);
  const mouth = v.ctx.createBiquadFilter();
  mouth.type = 'bandpass';
  mouth.Q.value = o.q ?? 1.5;
  mouth.frequency.setValueAtTime(o.formant * v.pitch, start);
  if (o.formantTo !== undefined) mouth.frequency.exponentialRampToValueAtTime(o.formantTo * v.pitch, start + o.dur);
  let tail: AudioNode = osc.connect(mouth);
  if (o.tremolo) {
    const amp = v.ctx.createGain();
    amp.gain.value = 1 - o.tremolo.depth;
    wobble(v, amp.gain, o.tremolo, start, end);
    tail = tail.connect(amp);
  }
  tail.connect(envelope(v, start, o, o.attack ?? 0.01));
  osc.start(start);
  osc.stop(end);
}

interface NoiseOpts extends Shape {
  readonly filter: BiquadFilterType;
  readonly from: number;
  readonly to?: number;
  readonly q?: number;
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
  src.connect(filter).connect(envelope(v, start, o, o.attack ?? 0.004));
  src.start(start, Math.random() * 0.5);
  src.stop(start + o.dur + 0.05);
}

/** A run of notes (Hz), one after another. */
function notes(v: Voice, freqs: readonly number[], step: number, o: Omit<ToneOpts, 'from' | 'delay'>): void {
  freqs.forEach((f, i) => tone(v, { ...o, from: f, delay: i * step }));
}

/** A cartoon gulp: a wet drop in pitch and a little bloop as it goes down. */
function gulp(v: Voice, depth: number, delay = 0): void {
  tone(v, { from: 560 * depth, to: 170 * depth, dur: 0.1, gain: 0.22, attack: 0.003, delay });
  tone(v, { from: 190 * depth, to: 480 * depth, dur: 0.07, gain: 0.13, delay: delay + 0.08 });
  noise(v, { dur: 0.06, gain: 0.1, filter: 'bandpass', from: 1100 * depth, to: 500 * depth, q: 2, delay });
}

/** A crow's "caw": a harsh, nasal, rasping burst. */
function caw(v: Voice, f: number, delay: number): void {
  buzz(v, { from: f * 0.8, glide: [[0.05, f], [0.22, f * 0.7]], dur: 0.24, gain: 0.5, attack: 0.012, hold: 0.07, formant: 1350, q: 2, vibrato: { depth: 40, rate: 75 }, delay });
  noise(v, { dur: 0.22, gain: 0.1, filter: 'bandpass', from: 1600, to: 1200, q: 1.5, hold: 0.05, attack: 0.012, delay });
}

/** A hen's "buk": a short clucking pulse. */
function cluck(v: Voice, f: number, delay: number): void {
  buzz(v, { type: 'square', from: f, glide: [[0.06, f * 0.78]], dur: 0.07, gain: 0.32, attack: 0.004, formant: 900, q: 2.5, delay });
  noise(v, { dur: 0.04, gain: 0.06, filter: 'bandpass', from: 700, q: 2, delay });
}

/** A run of soft feet or claws: quick ticks. */
function patter(v: Voice, n: number, step: number, gain: number, from: number, delay = 0): void {
  for (let i = 0; i < n; i++) noise(v, { dur: 0.022, gain: gain * (1 - i / (n * 1.6)), filter: 'bandpass', from: from + (i % 2) * 500, q: 3, delay: delay + i * step });
}

const RECIPES: Readonly<Record<SfxId, (v: Voice) => void>> = {
  // A strike: a sharp airy hiss over a little thump of the head.
  strike: (v) => {
    noise(v, { dur: 0.17, gain: 0.18, filter: 'highpass', from: 3800, to: 5200, attack: 0.008, hold: 0.03 });
    noise(v, { dur: 0.1, gain: 0.06, filter: 'bandpass', from: 6500, q: 1 });
    tone(v, { from: 150, to: 65, dur: 0.07, gain: 0.13, delay: 0.015 });
  },
  // A meal going down: a wet cartoon gulp (the caller pitches it by the meal's size).
  gulp: (v) => gulp(v, 1),
  // A coil tightening: two creaks of stretched leather and a rub under them.
  squeeze: (v) => {
    buzz(v, { from: 38, glide: [[0.38, 70]], dur: 0.4, gain: 0.8, attack: 0.04, hold: 0.2, formant: 1000, q: 4 });
    buzz(v, { from: 50, glide: [[0.28, 92]], dur: 0.3, gain: 0.65, attack: 0.03, hold: 0.12, formant: 1400, q: 4, delay: 0.42 });
    noise(v, { dur: 0.65, gain: 0.05, filter: 'bandpass', from: 600, to: 800, q: 1, attack: 0.15 });
  },
  // A big coiled meal: a deep gulp, a long slide down, a last little gulp.
  swallow: (v) => {
    gulp(v, 0.72);
    noise(v, { dur: 0.7, gain: 0.18, filter: 'lowpass', from: 700, to: 180, attack: 0.15, hold: 0.15, delay: 0.2 });
    tone(v, { from: 200, to: 80, dur: 0.6, gain: 0.12, attack: 0.1, delay: 0.22, vibrato: { depth: 10, rate: 6 } });
    gulp(v, 0.55, 0.78);
  },
  // The head on something solid: a soft dull knock.
  bump: (v) => {
    tone(v, { from: 190, to: 85, dur: 0.09, gain: 0.25, attack: 0.002 });
    tone(v, { type: 'triangle', from: 330, to: 250, dur: 0.04, gain: 0.05, attack: 0.002 });
    noise(v, { dur: 0.06, gain: 0.16, filter: 'lowpass', from: 380, attack: 0.001 });
  },
  // Biting its own body: a comic rubbery boing and a thud.
  knot: (v) => {
    tone(v, { from: 130, to: 55, dur: 0.14, gain: 0.3, attack: 0.002 });
    noise(v, { dur: 0.06, gain: 0.14, filter: 'lowpass', from: 400, attack: 0.001 });
    tone(v, { type: 'triangle', from: 140, to: 300, dur: 0.42, gain: 0.17, delay: 0.02, vibrato: { depth: 40, rate: 15 } });
  },
  // A life lost: a sharp sting and a falling note.
  hurt: (v) => {
    noise(v, { dur: 0.05, gain: 0.32, filter: 'bandpass', from: 3200, q: 2, attack: 0.001 });
    tone(v, { type: 'square', from: 1600, to: 1200, dur: 0.05, gain: 0.035, attack: 0.001 });
    tone(v, { type: 'triangle', from: 740, to: 220, dur: 0.4, gain: 0.18, delay: 0.04, vibrato: { depth: 12, rate: 10 } });
  },
  // A nip off the tail: a small pinch, two clicks.
  nip: (v) => {
    noise(v, { dur: 0.018, gain: 0.32, filter: 'bandpass', from: 3800, q: 5, attack: 0.001 });
    noise(v, { dur: 0.015, gain: 0.22, filter: 'bandpass', from: 3000, q: 5, attack: 0.001, delay: 0.035 });
    tone(v, { type: 'triangle', from: 1400, to: 900, dur: 0.04, gain: 0.05 });
  },
  // Grown long enough: a short bright rising arpeggio and a sparkle.
  grown: (v) => {
    notes(v, [659, 784, 988, 1319], 0.055, { type: 'triangle', dur: 0.15, gain: 0.12 });
    tone(v, { from: 1976, dur: 0.25, gain: 0.03, delay: 0.2, vibrato: { depth: 20, rate: 12 } });
  },
  // A mouse bolting: "eek-eek".
  squeak: (v) => {
    tone(v, { from: 3000, to: 3900, dur: 0.07, gain: 0.07, vibrato: { depth: 200, rate: 45 } });
    tone(v, { from: 3600, to: 3100, dur: 0.06, gain: 0.05, delay: 0.1 });
  },
  // A frog's hop: a tiny watery plop and a bubble.
  plop: (v) => {
    tone(v, { from: 1200, to: 380, dur: 0.06, gain: 0.14, attack: 0.002 });
    tone(v, { from: 500, to: 900, dur: 0.04, gain: 0.05, delay: 0.05 });
    noise(v, { dur: 0.12, gain: 0.06, filter: 'bandpass', from: 1400, to: 600, q: 1.5, delay: 0.02 });
  },
  // New prey turning up: a very soft rustle in the grass.
  appear: (v) => {
    noise(v, { dur: 0.22, gain: 0.06, filter: 'bandpass', from: 2800, to: 3600, q: 0.9, attack: 0.06 });
    noise(v, { dur: 0.08, gain: 0.04, filter: 'bandpass', from: 1800, q: 2, delay: 0.1 });
  },
  // An American crow: two short harsh caws.
  caw: (v) => {
    caw(v, 620, 0);
    caw(v, 590, 0.32);
  },
  // A red-tailed hawk's scream, "kee-eee-arr": hoarse, rising a touch, then a long fall.
  cry: (v) => {
    buzz(v, { from: 2200, glide: [[0.1, 2900], [0.35, 2600], [1.2, 1500]], dur: 1.3, gain: 0.3, attack: 0.05, hold: 0.5, formant: 3000, formantTo: 1800, q: 1.2, vibrato: { depth: 90, rate: 38 } });
    noise(v, { dur: 1.25, gain: 0.1, filter: 'bandpass', from: 3200, to: 1700, q: 1.5, attack: 0.05, hold: 0.45 });
  },
  // The hawk stooping: a fast rising whoosh of air.
  dive: (v) => {
    noise(v, { dur: 0.6, gain: 0.3, filter: 'bandpass', from: 350, to: 2600, q: 1.6, attack: 0.4 });
    noise(v, { dur: 0.5, gain: 0.08, filter: 'highpass', from: 2000, to: 4500, attack: 0.35, delay: 0.08 });
  },
  // Talons into empty grass, then a frustrated ruffle of feathers.
  miss: (v) => {
    tone(v, { from: 140, to: 60, dur: 0.12, gain: 0.3, attack: 0.002 });
    noise(v, { dur: 0.08, gain: 0.18, filter: 'lowpass', from: 500, attack: 0.001 });
    noise(v, { dur: 0.1, gain: 0.07, filter: 'bandpass', from: 3000, q: 1, attack: 0.002 });
    for (let i = 0; i < 5; i++) noise(v, { dur: 0.07, gain: 0.1 - i * 0.015, filter: 'bandpass', from: 2000 + (i % 3) * 500, q: 1, attack: 0.01, delay: 0.14 + i * 0.06 });
  },
  // A hen: "buk, buk, buk-GAWK".
  cluck: (v) => {
    cluck(v, 420, 0);
    cluck(v, 400, 0.13);
    cluck(v, 430, 0.24);
    buzz(v, { type: 'square', from: 480, glide: [[0.08, 680], [0.2, 520]], dur: 0.22, gain: 0.26, attack: 0.01, hold: 0.05, formant: 1300, q: 2, delay: 0.36 });
  },
  // Wings beating away, slowing and fading as the bird goes.
  flap: (v) => {
    for (let i = 0; i < 6; i++) {
      const at = i * (0.09 + i * 0.008);
      noise(v, { dur: 0.07, gain: 0.3 * (1 - i * 0.13), filter: 'bandpass', from: 900, to: 500, q: 0.9, attack: 0.01, delay: at });
      noise(v, { dur: 0.05, gain: 0.05 * (1 - i * 0.13), filter: 'bandpass', from: 2500, q: 1, delay: at });
    }
  },
  // The Old Tomcat stalking: a low rattling growl.
  growl: (v) => {
    buzz(v, { from: 85, glide: [[0.4, 95], [0.9, 78]], dur: 0.95, gain: 0.6, attack: 0.12, hold: 0.4, formant: 380, q: 1.2, vibrato: { depth: 6, rate: 11 }, tremolo: { depth: 0.4, rate: 24 } });
    noise(v, { dur: 0.9, gain: 0.12, filter: 'lowpass', from: 350, attack: 0.12, hold: 0.4 });
  },
  // The pounce: claws scrabbling and a whoosh.
  pounce: (v) => {
    patter(v, 4, 0.035, 0.2, 1800);
    noise(v, { dur: 0.22, gain: 0.22, filter: 'bandpass', from: 500, to: 2200, q: 1, attack: 0.08, delay: 0.1 });
  },
  // The cat struck: a startled hiss and a "mrrow!".
  yowl: (v) => {
    noise(v, { dur: 0.3, gain: 0.22, filter: 'highpass', from: 2500, attack: 0.005, hold: 0.12 });
    noise(v, { dur: 0.25, gain: 0.06, filter: 'bandpass', from: 5000, q: 1, hold: 0.1 });
    buzz(v, { from: 520, glide: [[0.12, 880], [0.45, 600]], dur: 0.5, gain: 0.45, attack: 0.03, hold: 0.15, formant: 900, formantTo: 700, q: 1.5, vibrato: { depth: 25, rate: 9 }, delay: 0.25 });
  },
  // The cat beaten: a long yowl fading and muffling as it runs off.
  beaten: (v) => {
    buzz(v, { from: 600, glide: [[0.2, 950], [0.7, 820], [1.4, 380]], dur: 1.5, gain: 0.4, attack: 0.04, hold: 0.5, formant: 1200, formantTo: 600, q: 1.5, vibrato: { depth: 30, rate: 7 } });
    patter(v, 6, 0.09, 0.08, 1400, 0.4);
  },
  // A rush's clock: a dry pencil tap.
  tick: (v) => {
    noise(v, { dur: 0.03, gain: 0.3, filter: 'bandpass', from: 1800, q: 4, attack: 0.001 });
    tone(v, { type: 'triangle', from: 1250, dur: 0.03, gain: 0.04, attack: 0.001 });
  },
  win: (v) => {
    notes(v, [392, 523, 659, 784], 0.1, { type: 'triangle', dur: 0.2, gain: 0.18 });
    tone(v, { type: 'triangle', from: 1047, dur: 0.6, gain: 0.2, delay: 0.42, vibrato: { depth: 4, rate: 6 } });
    tone(v, { from: 784, dur: 0.6, gain: 0.06, delay: 0.42 });
  },
  // A gentle fall that comes to rest.
  lose: (v) => notes(v, [392, 349, 330, 262], 0.2, { type: 'triangle', dur: 0.32, gain: 0.17, vibrato: { depth: 4, rate: 6 } }),
  // A pencil tick.
  click: (v) => noise(v, { dur: 0.03, gain: 0.25, filter: 'bandpass', from: 2800, q: 2 }),
  // The snake slithering up the map's route: a soft scaly "shhh".
  steps: (v) => {
    noise(v, { dur: 0.32, gain: 0.12, filter: 'bandpass', from: 2600, q: 1.2, attack: 0.1 });
    noise(v, { dur: 0.25, gain: 0.06, filter: 'bandpass', from: 1400, to: 1900, q: 1, attack: 0.08, delay: 0.08 });
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

/** Each sound's loudness, balanced against InkGecko's (the frequent strike and gulp kept light). */
export const LEVEL: Readonly<Record<SfxId, number>> = {
  strike: 1.2, gulp: 1.4, squeeze: 1.6, swallow: 1.8, bump: 1.6,
  knot: 1.8, hurt: 1.8, nip: 1.6, grown: 1.6,
  squeak: 1.4, plop: 1.5, appear: 1.2,
  caw: 1.3, cry: 1, dive: 1.6, miss: 1.6, cluck: 1.4, flap: 1.5,
  growl: 2, pounce: 1.8, yowl: 1.6, beaten: 1.5,
  tick: 1.4,
  win: 1, lose: 1, click: 1.1,
  steps: 1.2, card: 1.2,
};

export function synthesize(id: SfxId, v: Voice): void {
  const level = v.ctx.createGain();
  level.gain.value = LEVEL[id];
  level.connect(v.out);
  RECIPES[id]({ ...v, out: level });
}
