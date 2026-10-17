import type { SfxId, VoiceWord } from './recipes';

/**
 * The building blocks every sound is made of, synthesized with the Web Audio
 * API: soft tones with slow attacks and pitch glides, and breaths of
 * filtered noise. No square waves and nothing sharp: InkMine's sound is
 * calm, after No Man's Sky's.
 */
export interface Voice {
  readonly ctx: AudioContext;
  /** Where this sound plays into (its own level, then the master and the echo). */
  readonly out: AudioNode;
  /** Start time, seconds on the context clock. */
  readonly t: number;
  /** Pitch multiplier. */
  readonly pitch: number;
}

export interface ToneOpts {
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

/** A gain that swells from silence to `peak` over `attack` and dies away by `start + dur`. */
function envelope(v: Voice, start: number, dur: number, peak: number, attack: number): GainNode {
  const g = v.ctx.createGain();
  g.gain.setValueAtTime(0.0001, start);
  g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), start + Math.min(attack, dur * 0.9));
  g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
  g.connect(v.out);
  return g;
}

/** One soft tone, gliding from one pitch to another. */
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
  osc.connect(envelope(v, start, o.dur, o.gain, o.attack ?? 0.02));
  osc.start(start);
  osc.stop(start + o.dur + 0.05);
}

export interface NoiseOpts {
  readonly dur: number;
  readonly gain: number;
  readonly filter: BiquadFilterType;
  readonly from: number;
  readonly to?: number;
  readonly q?: number;
  readonly delay?: number;
  readonly attack?: number;
}

const noiseBuffers = new WeakMap<BaseAudioContext, AudioBuffer>();

/** Two seconds of white noise per context, made once. */
export function noiseBuffer(ctx: BaseAudioContext): AudioBuffer {
  const cached = noiseBuffers.get(ctx);
  if (cached) return cached;
  const buf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  noiseBuffers.set(ctx, buf);
  return buf;
}

/** A breath of filtered noise. */
export function noise(v: Voice, o: NoiseOpts): void {
  const start = v.t + (o.delay ?? 0);
  const src = v.ctx.createBufferSource();
  src.buffer = noiseBuffer(v.ctx);
  // Looped, so a long breath (lift-off) never runs off the end of the buffer.
  src.loop = true;
  const filter = v.ctx.createBiquadFilter();
  filter.type = o.filter;
  filter.Q.value = o.q ?? 0.8;
  filter.frequency.setValueAtTime(o.from * v.pitch, start);
  if (o.to !== undefined) filter.frequency.exponentialRampToValueAtTime(o.to * v.pitch, start + o.dur);
  src.connect(filter).connect(envelope(v, start, o.dur, o.gain, o.attack ?? 0.015));
  src.start(start, Math.random() * 1.5);
  src.stop(start + o.dur + 0.05);
}

/** Notes (Hz) one after another, each ringing on under the next. */
export function notes(v: Voice, freqs: readonly number[], step: number, o: Omit<ToneOpts, 'from' | 'delay'>): void {
  freqs.forEach((f, i) => tone(v, { ...o, from: f, delay: i * step }));
}

/** Notes (Hz) together, each a touch detuned against a twin so the chord shimmers. */
export function chord(v: Voice, freqs: readonly number[], o: Omit<ToneOpts, 'from' | 'to'>): void {
  for (const f of freqs) {
    tone(v, { ...o, from: f * 0.997, gain: o.gain / 2 });
    tone(v, { ...o, from: f * 1.003, gain: o.gain / 2 });
  }
}

/**
 * The radio's strange voice: each word a slow, low glide through a
 * throat-like band-pass whose vowel drifts, with a slow wobble, as the card's
 * inked trace shows it.
 */
export function speak(v: Voice, plan: readonly VoiceWord[]): void {
  for (const w of plan) {
    const start = v.t + w.start;
    const osc = v.ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(w.from, start);
    osc.frequency.exponentialRampToValueAtTime(w.to, start + w.dur);
    const vowel = v.ctx.createBiquadFilter();
    vowel.type = 'bandpass';
    vowel.Q.value = 4;
    vowel.frequency.setValueAtTime(420, start);
    vowel.frequency.exponentialRampToValueAtTime(900, start + w.dur * 0.5);
    vowel.frequency.exponentialRampToValueAtTime(380, start + w.dur);
    const lfo = v.ctx.createOscillator();
    const depth = v.ctx.createGain();
    lfo.frequency.value = 5.5;
    depth.gain.value = 6;
    lfo.connect(depth).connect(osc.frequency);
    osc.connect(vowel).connect(envelope(v, start, w.dur, 1.4, w.dur * 0.4));
    for (const node of [osc, lfo]) {
      node.start(start);
      node.stop(start + w.dur + 0.05);
    }
  }
}

/**
 * The jetpack's steady breath, started now and kept going until the
 * returned function is called (it then fades out and lets go of the graph).
 */
export function breath(ctx: AudioContext, out: AudioNode): () => void {
  const src = ctx.createBufferSource();
  src.buffer = noiseBuffer(ctx);
  src.loop = true;
  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.Q.value = 0.6;
  filter.frequency.value = 650;
  const flutter = ctx.createOscillator();
  const flutterDepth = ctx.createGain();
  flutter.frequency.value = 3.2;
  flutterDepth.gain.value = 120;
  flutter.connect(flutterDepth).connect(filter.frequency);
  const g = ctx.createGain();
  const now = ctx.currentTime;
  g.gain.setValueAtTime(0.0001, now);
  g.gain.setTargetAtTime(0.18, now, 0.12);
  src.connect(filter).connect(g).connect(out);
  src.start(now, Math.random() * 1.5);
  flutter.start(now);
  return () => {
    const end = ctx.currentTime;
    g.gain.cancelScheduledValues(end);
    g.gain.setTargetAtTime(0.0001, end, 0.15);
    src.stop(end + 0.8);
    flutter.stop(end + 0.8);
    setTimeout(() => g.disconnect(), 1000);
  };
}

/** Each sound effect, shaped by ear to be soft and short-lived. */
const RECIPES: Readonly<Record<SfxId, (v: Voice) => void>> = {
  // Soil giving under the drill: a muffled, crumbly scrape.
  grindSoft: (v) => noise(v, { dur: 0.22, gain: 0.22, filter: 'lowpass', from: 700, to: 380, attack: 0.05 }),
  // Rock under the drill: a low grinding hum with grit on top, still muffled.
  grindHard: (v) => {
    noise(v, { dur: 0.24, gain: 0.18, filter: 'bandpass', from: 900, to: 650, q: 1.4, attack: 0.05 });
    tone(v, { type: 'triangle', from: 92, to: 86, dur: 0.24, gain: 0.07, attack: 0.05 });
  },
  // A block of soil gives: a soft crumble pattering down.
  crumbleSoft: (v) => {
    noise(v, { dur: 0.3, gain: 0.3, filter: 'lowpass', from: 600, to: 200, attack: 0.01 });
    noise(v, { dur: 0.16, gain: 0.12, filter: 'bandpass', from: 1200, q: 1.5, delay: 0.08 });
  },
  // A block of rock gives: a dull crack and stones settling.
  crumbleHard: (v) => {
    noise(v, { dur: 0.22, gain: 0.3, filter: 'bandpass', from: 700, to: 300, q: 1.2, attack: 0.008 });
    tone(v, { from: 120, to: 70, dur: 0.22, gain: 0.12, attack: 0.008 });
    noise(v, { dur: 0.12, gain: 0.1, filter: 'bandpass', from: 1600, q: 2, delay: 0.12 });
  },
  // Boots on the ground: a soft thud.
  land: (v) => {
    noise(v, { dur: 0.16, gain: 0.3, filter: 'lowpass', from: 380, to: 160, attack: 0.006 });
    tone(v, { from: 95, to: 60, dur: 0.14, gain: 0.14, attack: 0.006 });
  },
  // The jetpack catching: a short soft puff before its steady breath.
  jetStart: (v) => noise(v, { dur: 0.3, gain: 0.16, filter: 'bandpass', from: 400, to: 900, q: 0.7, attack: 0.06 }),
  // Ore into the bag: a small soft chime (pitched by the ore), with a fainter octave.
  ore: (v) => {
    tone(v, { from: 784, dur: 0.6, gain: 0.12, attack: 0.008 });
    tone(v, { from: 1568, dur: 0.35, gain: 0.03, attack: 0.008 });
  },
  // A part or the core sample found: three rising notes, ringing.
  find: (v) => notes(v, [587.33, 739.99, 880], 0.11, { dur: 0.9, gain: 0.1, attack: 0.02 }),
  // Ore banked into the cargo: a few soft clinks.
  bank: (v) => {
    for (const [d, f] of [[0, 1320], [0.09, 1180], [0.2, 1480]] as const) tone(v, { from: f, dur: 0.18, gain: 0.05, delay: d, attack: 0.004 });
  },
  // The bag (or the hold) full: a soft, dull, hollow tone.
  full: (v) => tone(v, { type: 'triangle', from: 196, to: 174, dur: 0.45, gain: 0.14, attack: 0.03 }),
  // No (too hard, a flat cell, nothing to feed with): a low, gentle bump.
  dull: (v) => tone(v, { from: 165, to: 140, dur: 0.3, gain: 0.12, attack: 0.02 }),
  // The suit fed or topped up: a soft rising tone.
  fed: (v) => {
    tone(v, { from: 330, to: 495, dur: 0.6, gain: 0.1, attack: 0.15 });
    tone(v, { from: 495, to: 742, dur: 0.5, gain: 0.04, attack: 0.15, delay: 0.1 });
  },
  // Air low: a gentle two-note pulse, falling, like a breath held.
  airLow: (v) => notes(v, [523.25, 392], 0.32, { dur: 0.5, gain: 0.08, attack: 0.08 }),
  // Out of air: the same pulse, lower.
  airOut: (v) => notes(v, [392, 293.66], 0.36, { dur: 0.6, gain: 0.1, attack: 0.08 }),
  // Hurt: a low, muted thump.
  hurt: (v) => {
    tone(v, { from: 110, to: 55, dur: 0.32, gain: 0.26, attack: 0.008 });
    noise(v, { dur: 0.2, gain: 0.14, filter: 'lowpass', from: 300, attack: 0.008 });
  },
  // The shield taking a hit: a soft glassy shimmer.
  shield: (v) => {
    tone(v, { from: 1046.5, dur: 0.5, gain: 0.05, attack: 0.01, vibrato: { depth: 8, rate: 7 } });
    tone(v, { from: 1567.98, dur: 0.4, gain: 0.03, attack: 0.01, delay: 0.03 });
  },
  // A charge or firedamp armed: a quiet hissing fuse.
  fizz: (v) => noise(v, { dur: 0.9, gain: 0.08, filter: 'highpass', from: 3500, attack: 0.1 }),
  // A blast, heard through the rock: a deep, muffled boom.
  blast: (v) => {
    noise(v, { dur: 1.2, gain: 0.4, filter: 'lowpass', from: 260, to: 70, attack: 0.01 });
    tone(v, { from: 70, to: 38, dur: 0.9, gain: 0.25, attack: 0.01 });
  },
  // The suit giving out: a slow, falling, fading chord.
  failed: (v) => {
    chord(v, [220, 261.63, 329.63], { dur: 2.4, gain: 0.12, attack: 0.3 });
    tone(v, { from: 110, to: 82, dur: 2.4, gain: 0.08, attack: 0.3 });
  },
  // The winch hauling you up: a soft rising whirr.
  winch: (v) => noise(v, { dur: 1.1, gain: 0.12, filter: 'bandpass', from: 300, to: 1200, q: 2.5, attack: 0.3 }),
  // A button: a quiet tick, like a pencil on paper.
  tick: (v) => {
    noise(v, { dur: 0.035, gain: 0.12, filter: 'bandpass', from: 2400, q: 1.8, attack: 0.003 });
    tone(v, { from: 900, dur: 0.05, gain: 0.02, attack: 0.003 });
  },
  // Something mended or printed: a warm major chord, gently arpeggiated, ringing on.
  mended: (v) => {
    chord(v, [261.63, 329.63, 392], { dur: 1.8, gain: 0.12, attack: 0.08 });
    notes(v, [523.25, 659.25, 783.99], 0.12, { dur: 1.2, gain: 0.05, attack: 0.03 });
  },
  // A story card: a soft swell, rising and fading.
  swell: (v) => chord(v, [196, 293.66, 440], { dur: 1.8, gain: 0.08, attack: 0.8 }),
  // Lift-off: a long soft rising whoosh over a low swell.
  liftOff: (v) => {
    noise(v, { dur: 4.2, gain: 0.22, filter: 'bandpass', from: 180, to: 1400, q: 0.7, attack: 1.6 });
    tone(v, { from: 55, to: 110, dur: 4.2, gain: 0.12, attack: 1.5 });
    chord(v, [220, 329.63, 493.88], { dur: 3.2, gain: 0.07, attack: 1.4, delay: 1.2 });
  },
};

/**
 * Each sound's loudness against the others, so a pickup chime and a story
 * swell sit at about the same level under the ambience.
 */
export const LEVEL: Readonly<Record<SfxId, number>> = {
  grindSoft: 1, grindHard: 1, crumbleSoft: 1, crumbleHard: 1,
  land: 1.2, jetStart: 1,
  ore: 1.2, find: 1, bank: 1.4, full: 1, dull: 1,
  fed: 1.2, airLow: 1.2, airOut: 1.2, hurt: 1, shield: 1.2, fizz: 1, blast: 0.9, failed: 1, winch: 2.5,
  tick: 1, mended: 1, swell: 1, liftOff: 1,
};

/** Plays sound `id` into the voice's output, at its level. */
export function synthesize(id: SfxId, v: Voice): void {
  const level = v.ctx.createGain();
  level.gain.value = LEVEL[id];
  level.connect(v.out);
  RECIPES[id]({ ...v, out: level });
}
