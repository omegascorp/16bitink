import { ambience, foldLoop, offlineMix, rotatedWav } from '../audioKit';
import { type ExtraSfx, SOUNDS } from './script';
import { LOOP_S } from './story';

/**
 * The short's soundtrack: the narrator (voice.mp3, starting with the loop),
 * the game's effects quiet under it (script.ts lists them, one set a mood),
 * a few made here in the same soft synth style for what the game has no
 * sound for (an orca's whistling call, an eerie drone, a bright ding, a
 * power-up chime, a comic slide whistle and sting), and a low hum of water.
 * The voice's last words ("Because yes,") run up to the loop point, so the
 * loop finishes its sentence.
 */
const TAIL_S = 2;
const VOICE_URL = new URL('./voice.mp3', import.meta.url).href;
const HUM_GAIN = 0.4;
/** Mark's take peaks near -3.6 dB (the hook and "LIVER!"). */
const VOICE_GAIN = 0.82;
/**
 * The quieter middle of the read ("Off Mexico…" to "…goes LIMP.", about
 * 5–6 dB under the hook) ridden up about 4 dB, each change in a pause. [time s, × VOICE_GAIN]
 */
const VOICE_RIDE: readonly (readonly [number, number])[] = [
  [0, 1], [2.45, 1], [2.75, 1.55], [8.65, 1.55], [8.85, 1],
];
/** The whole mix, lifted to peak around -4 dB. */
const OUT_GAIN = 1.12;

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

const EXTRA: Readonly<Record<ExtraSfx, (ctx: Ctx, out: AudioNode, t: number, p: number) => void>> = {
  // An orca's call: a whistle that swoops up, wavers and falls, with a buzzy edge.
  orca: (ctx, out, t, p) => {
    const n = ctx.createOscillator();
    n.type = 'sawtooth';
    n.frequency.setValueAtTime(900 * p, t);
    n.frequency.exponentialRampToValueAtTime(2300 * p, t + 0.28);
    n.frequency.exponentialRampToValueAtTime(1500 * p, t + 0.75);
    n.frequency.exponentialRampToValueAtTime(1100 * p, t + 1);
    const lfo = ctx.createOscillator();
    const depth = ctx.createGain();
    lfo.frequency.value = 7;
    depth.gain.value = 60 * p;
    lfo.connect(depth).connect(n.frequency);
    const f = ctx.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.value = 1800 * p;
    f.Q.value = 0.9;
    n.connect(f).connect(env(ctx, out, t, 0.35, 0.08, 1.05));
    for (const node of [n, lfo]) {
      node.start(t);
      node.stop(t + 1.1);
    }
  },
  // A low eerie drone, two detuned notes swelling and fading.
  drone: (ctx, out, t, p) => {
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = 600 * p;
    f.connect(env(ctx, out, t, 0.45, 0.5, 2.2));
    for (const hz of [73, 73 * 1.012, 110 * 0.995]) {
      const n = ctx.createOscillator();
      n.type = 'sawtooth';
      n.frequency.value = hz * p;
      n.connect(f);
      n.start(t);
      n.stop(t + 2.3);
    }
  },
  // A bright ding.
  ding: (ctx, out, t, p) => {
    osc(ctx, out, { t, type: 'sine', from: 1760 * p, dur: 0.9, gain: 0.4, attack: 0.002 });
    osc(ctx, out, { t, type: 'sine', from: 2637 * p, dur: 0.6, gain: 0.16, attack: 0.002 });
    osc(ctx, out, { t: t + 0.08, type: 'sine', from: 3520 * p, dur: 0.4, gain: 0.08, attack: 0.002 });
  },
  // A power-up chime: a quick rising arpeggio.
  chime: (ctx, out, t, p) => {
    [523, 659, 784, 1047, 1319].forEach((hz, i) => osc(ctx, out, { t: t + i * 0.055, type: 'triangle', from: hz * p, dur: 0.55, gain: 0.2, attack: 0.004 }));
  },
  // A slide whistle going up (the nose in the air).
  slide: (ctx, out, t, p) => {
    osc(ctx, out, { t, type: 'sine', from: 500 * p, to: 1500 * p, dur: 0.38, gain: 0.35, attack: 0.03 });
  },
  // A comic sting: two plucky notes, down then a bump up.
  sting: (ctx, out, t, p) => {
    osc(ctx, out, { t, type: 'square', from: 392 * p, dur: 0.14, gain: 0.12, attack: 0.003 });
    osc(ctx, out, { t: t + 0.16, type: 'square', from: 523 * p, dur: 0.28, gain: 0.12, attack: 0.003 });
    osc(ctx, out, { t: t + 0.16, type: 'sine', from: 1046 * p, dur: 0.3, gain: 0.1, attack: 0.003 });
  },
};

const isExtra = (id: string): id is ExtraSfx => id in EXTRA;

export async function renderOrcaliverAudio(start = 0): Promise<Blob> {
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
  for (const [at, k] of VOICE_RIDE) level.gain.linearRampToValueAtTime(VOICE_GAIN * k, at);
  voice.connect(level).connect(ctx.destination);
  voice.start(0);
  const loop = foldLoop(await ctx.startRendering(), LOOP_S);
  const hum = ambience(loop[0]!.length, 3);
  return rotatedWav(loop.map((ch, c) => ch.map((v, i) => OUT_GAIN * (v + HUM_GAIN * hum[c]![i]!))), LOOP_S, start);
}
