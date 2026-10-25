import { ambience, foldLoop, offlineMix, rotatedWav } from '../audioKit';
import { SOUNDS } from './script';
import { BUT_AT, CUTE_AT, ITS_AT, LOOP_S, NIGHTMARE_AT, OUT_AT, SHELL_AT, SPIKES_AT, TRIES } from './story';
import { TEMPO, WORDS } from './words';

/**
 * The short's soundtrack: the narrator (voice.mp3, starting with the loop),
 * the game's effects quiet under it (script.ts lists them), a few sounds made
 * here (the hook's low horror drone and the jaw's creak, the throat's slow
 * echo, the jellyfish's boing and squeak, the soft chimes of the cute beat),
 * and a low hum of water. The voice's last word ("But") runs up to the loop
 * point, so the loop finishes its sentence.
 */
const TAIL_S = 3.5;
const VOICE_URL = new URL('./voice.mp3', import.meta.url).href;
const HUM_GAIN = 0.4;
/** Mark's take peaks near -2.9 dB: brought down to about -6 dB, where the narrated shorts' voices sit against their effects. */
export const VOICE_GAIN = 0.7;
/**
 * "Cute shell, though." came out 5.6 dB under the rest of the take: lifted
 * +4.5 dB from its first word's start to its last word's end (voice time),
 * with 40 ms ramps, so it sits within ~1 dB of the take.
 */
export const QUIET_LIFT = 10 ** (4.5 / 20);
export const RAMP_S = 0.04;
export const QUIET_LINE = (() => {
  const from = WORDS.findIndex((w) => w.text === 'Cute');
  const to = WORDS.findIndex((w) => w.text === 'though.');
  return { from: WORDS[from]!.start / TEMPO, to: WORDS[to]!.end / TEMPO };
})();
/** The voice's level through the take: [voice time s, gain], ramped linearly between. */
export const VOICE_RIDE: readonly (readonly [number, number])[] = [
  [0, VOICE_GAIN],
  [QUIET_LINE.from - RAMP_S, VOICE_GAIN],
  [QUIET_LINE.from, VOICE_GAIN * QUIET_LIFT],
  [QUIET_LINE.to, VOICE_GAIN * QUIET_LIFT],
  [QUIET_LINE.to + RAMP_S, VOICE_GAIN],
];
/** The voice's gain at voice time t (as the ride schedules it). */
export function voiceGainAt(t: number): number {
  const i = VOICE_RIDE.findIndex(([at]) => at > t);
  if (i < 0) return VOICE_RIDE[VOICE_RIDE.length - 1]![1];
  if (i === 0) return VOICE_RIDE[0]![1];
  const [t0, g0] = VOICE_RIDE[i - 1]!;
  const [t1, g1] = VOICE_RIDE[i]!;
  return g0 + ((g1 - g0) * (t - t0)) / (t1 - t0);
}
/** The whole mix, lifted to peak around -4 dB. */
const OUT_GAIN = 1.25;

type Ctx = OfflineAudioContext;

/** A low horror drone: two detuned saws and a sub, low-passed, swelling in and out over [from, to]. */
function drone(ctx: Ctx, from: number, to: number, peak: number): void {
  const out = ctx.createGain();
  out.gain.setValueAtTime(0, from);
  out.gain.linearRampToValueAtTime(peak, from + 0.5);
  out.gain.setValueAtTime(peak, to - 0.6);
  out.gain.linearRampToValueAtTime(0, to);
  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.setValueAtTime(220, from);
  lp.frequency.linearRampToValueAtTime(420, (from + to) / 2);
  lp.frequency.linearRampToValueAtTime(240, to);
  lp.Q.value = 3;
  lp.connect(out).connect(ctx.destination);
  for (const [type, f, g] of [['sawtooth', 49, 0.35], ['sawtooth', 51.7, 0.3], ['sine', 36.7, 0.7], ['triangle', 73.4, 0.12]] as const) {
    const osc = ctx.createOscillator();
    osc.type = type;
    osc.frequency.value = f;
    const level = ctx.createGain();
    level.gain.value = g;
    osc.connect(level).connect(lp);
    osc.start(from);
    osc.stop(to + 0.05);
  }
}

/** A creak: a buzzy, wavering low tone through a narrow band, like an old hinge (the jaw opening). */
function creak(ctx: Ctx, at: number, dur: number, gain: number): void {
  const osc = ctx.createOscillator();
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(38, at);
  osc.frequency.linearRampToValueAtTime(64, at + dur * 0.4);
  osc.frequency.linearRampToValueAtTime(30, at + dur);
  const wobble = ctx.createOscillator();
  wobble.frequency.value = 13;
  const wobbleDepth = ctx.createGain();
  wobbleDepth.gain.value = 9;
  wobble.connect(wobbleDepth).connect(osc.frequency);
  const bp = ctx.createBiquadFilter();
  bp.type = 'bandpass';
  bp.frequency.value = 1100;
  bp.Q.value = 6;
  const level = ctx.createGain();
  level.gain.setValueAtTime(0, at);
  level.gain.linearRampToValueAtTime(gain, at + 0.08);
  level.gain.setValueAtTime(gain, at + dur - 0.15);
  level.gain.linearRampToValueAtTime(0, at + dur);
  osc.connect(bp).connect(level).connect(ctx.destination);
  osc.start(at);
  wobble.start(at);
  osc.stop(at + dur + 0.02);
  wobble.stop(at + dur + 0.02);
}

/** A slow echo down the throat: soft drips, each one ringing back through a long feedback delay. */
function throatEcho(ctx: Ctx, at: number, gain: number): void {
  const delay = ctx.createDelay(1);
  delay.delayTime.value = 0.27;
  const feedback = ctx.createGain();
  feedback.gain.value = 0.55;
  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = 1400;
  delay.connect(lp).connect(feedback).connect(delay);
  const wet = ctx.createGain();
  wet.gain.value = 0.8;
  lp.connect(wet).connect(ctx.destination);
  for (const [dt, f] of [[0, 520], [0.55, 410], [1.1, 470]] as const) {
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(f * 1.8, at + dt);
    osc.frequency.exponentialRampToValueAtTime(f, at + dt + 0.12);
    const level = ctx.createGain();
    level.gain.setValueAtTime(0, at + dt);
    level.gain.linearRampToValueAtTime(gain, at + dt + 0.01);
    level.gain.exponentialRampToValueAtTime(0.0005, at + dt + 0.25);
    osc.connect(level);
    level.connect(ctx.destination);
    level.connect(delay);
    osc.start(at + dt);
    osc.stop(at + dt + 0.3);
  }
}

/** A comic boing: a springy tone wobbling down. */
function boing(ctx: Ctx, at: number, gain: number, pitch = 1): void {
  const osc = ctx.createOscillator();
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(170 * pitch, at);
  osc.frequency.linearRampToValueAtTime(330 * pitch, at + 0.05);
  osc.frequency.exponentialRampToValueAtTime(120 * pitch, at + 0.42);
  const lfo = ctx.createOscillator();
  lfo.frequency.value = 17;
  const depth = ctx.createGain();
  depth.gain.setValueAtTime(70 * pitch, at);
  depth.gain.linearRampToValueAtTime(5, at + 0.42);
  lfo.connect(depth).connect(osc.frequency);
  const level = ctx.createGain();
  level.gain.setValueAtTime(0, at);
  level.gain.linearRampToValueAtTime(gain, at + 0.01);
  level.gain.exponentialRampToValueAtTime(0.0005, at + 0.45);
  osc.connect(level).connect(ctx.destination);
  osc.start(at);
  lfo.start(at);
  osc.stop(at + 0.5);
  lfo.stop(at + 0.5);
}

/** A rubbery squeak: a quick high chirp up and down. */
function squeak(ctx: Ctx, at: number, gain: number): void {
  const osc = ctx.createOscillator();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(1300, at);
  osc.frequency.linearRampToValueAtTime(2300, at + 0.06);
  osc.frequency.linearRampToValueAtTime(1600, at + 0.13);
  const level = ctx.createGain();
  level.gain.setValueAtTime(0, at);
  level.gain.linearRampToValueAtTime(gain, at + 0.015);
  level.gain.linearRampToValueAtTime(gain * 0.7, at + 0.1);
  level.gain.linearRampToValueAtTime(0, at + 0.14);
  osc.connect(level).connect(ctx.destination);
  osc.start(at);
  osc.stop(at + 0.16);
}

/** A soft chime: a bell-like sine with a quiet overtone, ringing out. */
function chime(ctx: Ctx, at: number, f: number, gain: number): void {
  for (const [k, g] of [[1, 1], [2.76, 0.18], [5.4, 0.06]] as const) {
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = f * k;
    const level = ctx.createGain();
    level.gain.setValueAtTime(0, at);
    level.gain.linearRampToValueAtTime(gain * g, at + 0.01);
    level.gain.exponentialRampToValueAtTime(0.0003, at + 1.6 / k);
    osc.connect(level).connect(ctx.destination);
    osc.start(at);
    osc.stop(at + 1.7);
  }
}

export async function renderLeatherbackAudio(start = 0): Promise<Blob> {
  const { ctx, play } = offlineMix(LOOP_S + TAIL_S, 3);
  for (const cue of SOUNDS) play(cue.id, cue.t, cue.pitch, cue.gain, cue.pan);
  // The hook's drone: swelling in under "But" and on through the hook (past the loop point, folded onto the start).
  drone(ctx, BUT_AT + 0.1, LOOP_S + ITS_AT + 0.3, 0.075);
  creak(ctx, BUT_AT + 0.3, 0.75, 0.05);
  creak(ctx, NIGHTMARE_AT - 0.75, 0.6, 0.035);
  throatEcho(ctx, ITS_AT + 0.15, 0.035);
  throatEcho(ctx, SPIKES_AT + 0.25, 0.02);
  for (const [i, h] of TRIES.entries()) {
    squeak(ctx, h.hit, 0.05);
    boing(ctx, h.hit + 0.05, 0.07, 1 + 0.15 * i);
  }
  boing(ctx, OUT_AT + 0.35, 0.06, 0.7);
  for (const [i, f] of [1568, 2093, 2637].entries()) chime(ctx, CUTE_AT - 0.05 + i * 0.16, f, 0.03);
  chime(ctx, SHELL_AT + 0.35, 1976, 0.025);
  const response = await fetch(VOICE_URL);
  if (!response.ok) throw new Error(`voice.mp3: ${response.status}`);
  const voice = ctx.createBufferSource();
  voice.buffer = await ctx.decodeAudioData(await response.arrayBuffer());
  // Straight to the output (through its own gain): the effects' master gain is for their quiet synth levels.
  const level = ctx.createGain();
  level.gain.setValueAtTime(VOICE_RIDE[0]![1], 0);
  for (const [at, gain] of VOICE_RIDE.slice(1)) level.gain.linearRampToValueAtTime(gain, at);
  voice.connect(level).connect(ctx.destination);
  voice.start(0);
  const loop = foldLoop(await ctx.startRendering(), LOOP_S);
  const hum = ambience(loop[0]!.length, 3);
  return rotatedWav(loop.map((ch, c) => ch.map((v, i) => OUT_GAIN * (v + HUM_GAIN * hum[c]![i]!))), LOOP_S, start);
}
