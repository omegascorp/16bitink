import type { SfxId } from '../../../src/audio/recipes';
import { ambience, foldLoop, offlineMix, RATE, rotatedWav } from '../audioKit';
import { type ExtraSfx, SOUNDS } from './script';
import { LOOP_S } from './story';

/**
 * The short's soundtrack: the narrator (voice.mp3, starting with the loop),
 * the game's effects quiet under it (script.ts lists them, one set a mood),
 * a few made here in the same soft synth style for things the game has no
 * sound for (the jaws' scissor "shink", a low drone, a ding, a heartbeat,
 * paper flips, a ta-da, sparkles, whooshes and a chitin clack), and the
 * night's low hum of water. The voice's last words ("And Barry knows:") run
 * up to the loop point, so the loop finishes its sentence.
 */
const TAIL_S = 2.5;
const VOICE_URL = new URL('./voice.mp3', import.meta.url).href;
const HUM_GAIN = 0.5;
/** Mark's take peaks near -2.4 dB on "SNAP!": brought down to about -6.5 dB, where the narrated shorts' voices sit against their effects. */
const VOICE_GAIN = 0.62;
/**
 * The read ridden level: "SNAP! Gone," and "Barry" peak about 5 dB over the
 * rest of the take, and the hushed "with only its jaws showing…" sits about
 * 6 dB under it. Everything else up 4 dB, the hush up 7.5, each change in a
 * pause. [time s, × VOICE_GAIN]
 */
const VOICE_RIDE: readonly (readonly [number, number])[] = [
  [0, 1.6], [5.74, 1.6], [5.88, 2.4], [7.3, 2.4], [7.45, 1.6], [9.15, 1.6], [9.3, 1], [10.55, 1], [10.75, 1.6], [15.05, 1.6], [15.35, 1.15], [16.27, 1.15],
  [16.5, 1.6], [LOOP_S + 2, 1.6],
];
/** The whole mix, lifted to peak around -4 dB. */
const OUT_GAIN = 1.17;
/** The sounds made here are full-scale synth voices: brought down to sit with the game's quiet effects (both go through the master gain). */
const EXTRA_GAIN = 0.22;

type Ctx = OfflineAudioContext;

function env(ctx: Ctx, out: AudioNode, t: number, peak: number, attack: number, dur: number): GainNode {
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(peak, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  g.connect(out);
  return g;
}

function osc(ctx: Ctx, out: AudioNode, o: { t: number; type: OscillatorType; from: number; to?: number; dur: number; gain: number; attack?: number }): void {
  const n = ctx.createOscillator();
  n.type = o.type;
  n.frequency.setValueAtTime(o.from, o.t);
  if (o.to !== undefined) n.frequency.exponentialRampToValueAtTime(o.to, o.t + o.dur);
  n.connect(env(ctx, out, o.t, o.gain, o.attack ?? 0.008, o.dur));
  n.start(o.t);
  n.stop(o.t + o.dur + 0.05);
}

function noise(ctx: Ctx, out: AudioNode, o: { t: number; dur: number; gain: number; type: BiquadFilterType; from: number; to?: number; q?: number; attack?: number }): void {
  const buf = ctx.createBuffer(1, Math.ceil(RATE * (o.dur + 0.1)), RATE);
  const data = buf.getChannelData(0);
  let seed = Math.round(o.t * 1000) + 7;
  for (let i = 0; i < data.length; i++) {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    data[i] = seed / 2 ** 31 - 1;
  }
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const f = ctx.createBiquadFilter();
  f.type = o.type;
  f.Q.value = o.q ?? 1;
  f.frequency.setValueAtTime(o.from, o.t);
  if (o.to !== undefined) f.frequency.exponentialRampToValueAtTime(o.to, o.t + o.dur);
  src.connect(f).connect(env(ctx, out, o.t, o.gain, o.attack ?? 0.005, o.dur));
  src.start(o.t);
  src.stop(o.t + o.dur + 0.05);
}

const EXTRA: Readonly<Record<ExtraSfx, (ctx: Ctx, out: AudioNode, t: number, p: number) => void>> = {
  // Blades scraping past each other and ringing: a bright swish up, a click, a metallic ring.
  shink: (ctx, out, t, p) => {
    noise(ctx, out, { t: t - 0.06, dur: 0.12, gain: 0.35, type: 'bandpass', from: 2500 * p, to: 8000 * p, q: 4, attack: 0.05 });
    noise(ctx, out, { t, dur: 0.03, gain: 0.5, type: 'highpass', from: 3000 * p });
    for (const [hz, g] of [[2960, 0.16], [4170, 0.1], [5530, 0.06]] as const) osc(ctx, out, { t, type: 'sine', from: hz * p, dur: 0.45, gain: g, attack: 0.002 });
  },
  // A low uneasy drone, swelling and fading.
  drone: (ctx, out, t, p) => {
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = 260 * p;
    f.connect(env(ctx, out, t, 0.32, 0.5, 2.3));
    for (const hz of [55, 58.3, 82.4]) {
      const n = ctx.createOscillator();
      n.type = 'sawtooth';
      n.frequency.value = hz * p;
      n.connect(f);
      n.start(t);
      n.stop(t + 2.4);
    }
  },
  // A bright ding for the number.
  ding: (ctx, out, t, p) => {
    osc(ctx, out, { t, type: 'sine', from: 1760 * p, dur: 0.9, gain: 0.4, attack: 0.002 });
    osc(ctx, out, { t, type: 'sine', from: 2637 * p, dur: 0.6, gain: 0.16, attack: 0.002 });
    osc(ctx, out, { t: t + 0.08, type: 'sine', from: 3520 * p, dur: 0.4, gain: 0.08, attack: 0.002 });
  },
  // Lub-dub.
  heart: (ctx, out, t, p) => {
    osc(ctx, out, { t, type: 'sine', from: 70 * p, to: 42 * p, dur: 0.16, gain: 0.7, attack: 0.006 });
    osc(ctx, out, { t: t + 0.17, type: 'sine', from: 62 * p, to: 40 * p, dur: 0.14, gain: 0.5, attack: 0.006 });
  },
  // A calendar page torn off and flapping away.
  flip: (ctx, out, t, p) => {
    noise(ctx, out, { t, dur: 0.06, gain: 0.5, type: 'bandpass', from: 2600 * p, q: 1.5 });
    noise(ctx, out, { t: t + 0.05, dur: 0.1, gain: 0.25, type: 'bandpass', from: 1800 * p, to: 3500 * p, q: 2 });
  },
  // Ta-da: a short chord, then a held one a fourth up.
  tada: (ctx, out, t, p) => {
    const chord = (at: number, notes: readonly number[], dur: number, gain: number): void => {
      const f = ctx.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.value = 2200 * p;
      f.connect(env(ctx, out, at, gain, 0.015, dur));
      for (const hz of notes) {
        const n = ctx.createOscillator();
        n.type = 'sawtooth';
        n.frequency.value = hz * p;
        n.connect(f);
        n.start(at);
        n.stop(at + dur + 0.05);
      }
    };
    chord(t, [392, 494, 587], 0.13, 0.22);
    chord(t + 0.16, [523, 659, 784], 0.75, 0.26);
  },
  // Sparkles: a quick glassy run up.
  sparkle: (ctx, out, t, p) => {
    [1568, 2093, 2637, 3136, 4186].forEach((hz, i) => osc(ctx, out, { t: t + i * 0.055, type: 'triangle', from: hz * p, dur: 0.5, gain: 0.12, attack: 0.004 }));
  },
  // Air rushing past.
  whoosh: (ctx, out, t, p) => {
    noise(ctx, out, { t, dur: 0.5, gain: 0.5, type: 'bandpass', from: 300 * p, to: 2000 * p, q: 1.2, attack: 0.18 });
  },
  // A hard little click of chitin.
  clack: (ctx, out, t, p) => {
    noise(ctx, out, { t, dur: 0.035, gain: 0.5, type: 'highpass', from: 2200 * p });
    osc(ctx, out, { t, type: 'square', from: 1100 * p, to: 700 * p, dur: 0.04, gain: 0.18, attack: 0.001 });
  },
};

const isExtra = (id: SfxId | ExtraSfx): id is ExtraSfx => id in EXTRA;

export async function renderBobbitAudio(start = 0): Promise<Blob> {
  const { ctx, master, play } = offlineMix(LOOP_S + TAIL_S, 3);
  for (const cue of SOUNDS) {
    if (!isExtra(cue.id)) {
      play(cue.id, cue.t, cue.pitch, cue.gain, cue.pan);
      continue;
    }
    const level = ctx.createGain();
    level.gain.value = cue.gain * EXTRA_GAIN;
    const pan = ctx.createStereoPanner();
    pan.pan.value = cue.pan;
    level.connect(pan).connect(master);
    EXTRA[cue.id](ctx, level, cue.t, cue.pitch);
  }
  const response = await fetch(VOICE_URL);
  if (!response.ok) throw new Error(`voice.mp3: ${response.status}`);
  const voice = ctx.createBufferSource();
  voice.buffer = await ctx.decodeAudioData(await response.arrayBuffer());
  // Straight to the output (through its own gain): the effects' master gain is for their quiet synth levels.
  const level = ctx.createGain();
  for (const [at, k] of VOICE_RIDE) level.gain.linearRampToValueAtTime(VOICE_GAIN * k, at);
  voice.connect(level).connect(ctx.destination);
  voice.start(0);
  const loop = foldLoop(await ctx.startRendering(), LOOP_S);
  const hum = ambience(loop[0]!.length, 3);
  return rotatedWav(loop.map((ch, c) => ch.map((v, i) => OUT_GAIN * (v + HUM_GAIN * hum[c]![i]!))), LOOP_S, start);
}
