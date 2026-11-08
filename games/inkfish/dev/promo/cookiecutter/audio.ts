import type { SfxId } from '../../../src/audio/recipes';
import { ambience, foldLoop, offlineMix, RATE, rotatedWav } from '../audioKit';
import { type ExtraSfx, SOUNDS } from './script';
import { LOOP_S } from './story';

/**
 * The short's soundtrack: the narrator (voice.mp3, starting with the loop),
 * the game's effects quiet under it, plus a few made here in the same soft
 * synth style for things the game has no sound for (the lips' rubbery
 * schlup, the plug's cork pop, the spin's drill whirr, a sonar ping, a
 * submarine's horn, the alarm's pulse, a glow shimmer, a stamp's thump and
 * the wink's ding), and a low hum of water. The voice's last words ("So
 * yes,") run up to the loop point, so the loop finishes its sentence.
 */
const TAIL_S = 2;
const VOICE_URL = new URL('./voice.mp3', import.meta.url).href;
const HUM_GAIN = 0.4;
/** Mark's take peaks near -2.6 dB: brought down to about -6.5 dB, where the narrated shorts' voices sit against their effects. */
const VOICE_GAIN = 0.64;
/** The whole mix, lifted to peak around -4 dB. */
const OUT_GAIN = 1.3;

type Ctx = OfflineAudioContext;

function env(ctx: Ctx, out: AudioNode, t: number, peak: number, attack: number, dur: number): GainNode {
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(peak, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  g.connect(out);
  return g;
}

function osc(ctx: Ctx, out: AudioNode, o: { t: number; type: OscillatorType; from: number; to?: number; dur: number; gain: number; attack?: number }): OscillatorNode {
  const n = ctx.createOscillator();
  n.type = o.type;
  n.frequency.setValueAtTime(o.from, o.t);
  if (o.to !== undefined) n.frequency.exponentialRampToValueAtTime(o.to, o.t + o.dur);
  n.connect(env(ctx, out, o.t, o.gain, o.attack ?? 0.008, o.dur));
  n.start(o.t);
  n.stop(o.t + o.dur + 0.05);
  return n;
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
  // A rubbery suction: a wet slide down, a smack.
  schlup: (ctx, out, t, p) => {
    noise(ctx, out, { t, dur: 0.16, gain: 0.5, type: 'bandpass', from: 1400 * p, to: 300 * p, q: 3, attack: 0.02 });
    osc(ctx, out, { t: t + 0.02, type: 'sine', from: 420 * p, to: 110 * p, dur: 0.16, gain: 0.45 });
    noise(ctx, out, { t: t + 0.15, dur: 0.05, gain: 0.35, type: 'lowpass', from: 900 * p });
  },
  // A cork popping out: a hollow up-blip with a click.
  pop: (ctx, out, t, p) => {
    noise(ctx, out, { t, dur: 0.025, gain: 0.6, type: 'highpass', from: 2500 * p });
    osc(ctx, out, { t, type: 'sine', from: 320 * p, to: 980 * p, dur: 0.09, gain: 0.55, attack: 0.003 });
    osc(ctx, out, { t: t + 0.01, type: 'triangle', from: 640 * p, to: 1500 * p, dur: 0.07, gain: 0.2, attack: 0.003 });
  },
  // A drill spinning up and down.
  whirr: (ctx, out, t, p) => {
    const n = ctx.createOscillator();
    n.type = 'sawtooth';
    n.frequency.setValueAtTime(140 * p, t);
    n.frequency.exponentialRampToValueAtTime(520 * p, t + 0.35);
    n.frequency.exponentialRampToValueAtTime(240 * p, t + 0.8);
    const f = ctx.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.value = 900 * p;
    f.Q.value = 1.4;
    const lfo = ctx.createOscillator();
    const depth = ctx.createGain();
    lfo.frequency.value = 34;
    depth.gain.value = 40 * p;
    lfo.connect(depth).connect(n.frequency);
    n.connect(f).connect(env(ctx, out, t, 0.35, 0.06, 0.85));
    for (const node of [n, lfo]) {
      node.start(t);
      node.stop(t + 0.9);
    }
    noise(ctx, out, { t, dur: 0.8, gain: 0.12, type: 'bandpass', from: 2400 * p, to: 4000 * p, q: 2, attack: 0.08 });
  },
  // A sonar ping and its faint echo.
  ping: (ctx, out, t, p) => {
    osc(ctx, out, { t, type: 'sine', from: 1180 * p, dur: 1.2, gain: 0.4, attack: 0.004 });
    osc(ctx, out, { t: t + 0.55, type: 'sine', from: 1180 * p, dur: 0.8, gain: 0.12, attack: 0.004 });
  },
  // A submarine's deep horn.
  horn: (ctx, out, t, p) => {
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = 520 * p;
    f.connect(env(ctx, out, t, 0.5, 0.08, 1.1));
    for (const hz of [98, 147, 196]) {
      const n = ctx.createOscillator();
      n.type = 'sawtooth';
      n.frequency.setValueAtTime(hz * p * 0.97, t);
      n.frequency.linearRampToValueAtTime(hz * p, t + 0.15);
      n.connect(f);
      n.start(t);
      n.stop(t + 1.15);
    }
  },
  // A low alarm pulse.
  alarm: (ctx, out, t, p) => {
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = 900 * p;
    f.connect(env(ctx, out, t, 0.4, 0.03, 0.34));
    const n = ctx.createOscillator();
    n.type = 'square';
    n.frequency.setValueAtTime(220 * p, t);
    n.frequency.exponentialRampToValueAtTime(170 * p, t + 0.32);
    n.connect(f);
    n.start(t);
    n.stop(t + 0.4);
  },
  // A soft glassy shimmer as the glow comes up.
  shimmer: (ctx, out, t, p) => {
    [1047, 1319, 1568, 2093, 2637].forEach((hz, i) => osc(ctx, out, { t: t + i * 0.07, type: 'triangle', from: hz * p, dur: 0.7, gain: 0.12, attack: 0.04 }));
    noise(ctx, out, { t, dur: 0.6, gain: 0.08, type: 'highpass', from: 5000 * p, attack: 0.2 });
  },
  // A rubber stamp slammed down.
  thump: (ctx, out, t, p) => {
    osc(ctx, out, { t, type: 'sine', from: 140 * p, to: 50 * p, dur: 0.2, gain: 0.7, attack: 0.002 });
    noise(ctx, out, { t, dur: 0.08, gain: 0.4, type: 'lowpass', from: 1600 * p });
  },
  // A cheeky bright ding.
  ding: (ctx, out, t, p) => {
    osc(ctx, out, { t, type: 'sine', from: 1760 * p, dur: 0.9, gain: 0.4, attack: 0.002 });
    osc(ctx, out, { t, type: 'sine', from: 2637 * p, dur: 0.6, gain: 0.16, attack: 0.002 });
    osc(ctx, out, { t: t + 0.08, type: 'sine', from: 3520 * p, dur: 0.4, gain: 0.08, attack: 0.002 });
  },
};

const isExtra = (id: SfxId | ExtraSfx): id is ExtraSfx => id in EXTRA;

export async function renderCookiecutterAudio(start = 0): Promise<Blob> {
  const { ctx, master, play } = offlineMix(LOOP_S + TAIL_S, 3);
  for (const cue of SOUNDS) {
    if (!isExtra(cue.id)) {
      play(cue.id, cue.t, cue.pitch, cue.gain, cue.pan);
      continue;
    }
    const level = ctx.createGain();
    level.gain.value = cue.gain;
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
  level.gain.value = VOICE_GAIN;
  voice.connect(level).connect(ctx.destination);
  voice.start(0);
  const loop = foldLoop(await ctx.startRendering(), LOOP_S);
  const hum = ambience(loop[0]!.length, 3);
  return rotatedWav(loop.map((ch, c) => ch.map((v, i) => OUT_GAIN * (v + HUM_GAIN * hum[c]![i]!))), LOOP_S, start);
}
