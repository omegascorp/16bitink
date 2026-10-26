import { ambience, foldLoop, offlineMix, rotatedWav } from '../audioKit';
import { SOUNDS, SYNTHS, type SynthCue } from './script';
import { LOOP_S } from './story';

/**
 * The short's soundtrack: the narrator (voice.mp3, starting with the loop),
 * the game's effects quiet under it (script.ts lists them, one set per mood),
 * a few sounds the game hasn't got (the ROV's sonar pings and motor hum, the
 * comic boings), and a low hum of deep water. The voice's last words ("And
 * that's how") run up to the loop point, so the loop finishes its sentence.
 */
const TAIL_S = 2;
const VOICE_URL = new URL('./voice.mp3', import.meta.url).href;
const HUM_GAIN = 0.45;
/** Mark's take peaks near -4.2 dB in the hook; the drop and the sharks (2.4–7.4 s) sit about 3 dB under it. */
const VOICE_GAIN = 0.85;
/** Those lines ridden up about 2.3 dB, each change in a pause. [time s, × VOICE_GAIN] */
const VOICE_RIDE: readonly (readonly [number, number])[] = [[0, 1], [2.1, 1], [2.45, 1.3], [7.35, 1.3], [7.6, 1], [LOOP_S + TAIL_S, 1]];
/** The whole mix, lifted to peak around -4 dB. */
const OUT_GAIN = 1.12;

/** A sonar ping: a pure tone struck and ringing out, with a faint echo. */
function ping(ctx: OfflineAudioContext, out: AudioNode, c: SynthCue): void {
  for (const [delay, level] of [[0, 1], [0.38, 0.35]] as const) {
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = 1180 * c.pitch;
    const g = ctx.createGain();
    const at = c.t + delay;
    g.gain.setValueAtTime(0, at);
    g.gain.linearRampToValueAtTime(c.gain * level, at + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, at + 1.3);
    osc.connect(g).connect(out);
    osc.start(at);
    osc.stop(at + 1.4);
  }
}

/** The ROV's motor: a low buzzing hum, swelling in and out. */
function hum(ctx: OfflineAudioContext, out: AudioNode, c: SynthCue): void {
  const osc = ctx.createOscillator();
  osc.type = 'sawtooth';
  osc.frequency.value = 62 * c.pitch;
  const lfo = ctx.createOscillator();
  lfo.frequency.value = 5.5;
  const wob = ctx.createGain();
  wob.gain.value = 1.5;
  lfo.connect(wob).connect(osc.frequency);
  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = 320;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0, c.t);
  g.gain.linearRampToValueAtTime(c.gain, c.t + 0.4);
  g.gain.setValueAtTime(c.gain, c.t + c.length - 0.5);
  g.gain.linearRampToValueAtTime(0, c.t + c.length);
  osc.connect(lp).connect(g).connect(out);
  for (const o of [osc, lfo]) {
    o.start(c.t);
    o.stop(c.t + c.length + 0.05);
  }
}

/** Boing: a springy note sliding up and wobbling down. */
function boing(ctx: OfflineAudioContext, out: AudioNode, c: SynthCue): void {
  const osc = ctx.createOscillator();
  osc.type = 'triangle';
  const f = 180 * c.pitch;
  osc.frequency.setValueAtTime(f * 0.7, c.t);
  osc.frequency.exponentialRampToValueAtTime(f * 1.6, c.t + 0.06);
  osc.frequency.exponentialRampToValueAtTime(f, c.t + 0.5);
  const lfo = ctx.createOscillator();
  lfo.frequency.value = 14;
  const depth = ctx.createGain();
  depth.gain.setValueAtTime(f * 0.18, c.t);
  depth.gain.linearRampToValueAtTime(0, c.t + 0.5);
  lfo.connect(depth).connect(osc.frequency);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0, c.t);
  g.gain.linearRampToValueAtTime(c.gain, c.t + 0.015);
  g.gain.exponentialRampToValueAtTime(0.0001, c.t + 0.55);
  osc.connect(g).connect(out);
  for (const o of [osc, lfo]) {
    o.start(c.t);
    o.stop(c.t + 0.6);
  }
}

const SYNTH = { ping, hum, boing } as const;

export async function renderWreckfishAudio(start = 0): Promise<Blob> {
  const { ctx, play } = offlineMix(LOOP_S + TAIL_S, 3);
  for (const cue of SOUNDS) play(cue.id, cue.t, cue.pitch, cue.gain, cue.pan);
  for (const cue of SYNTHS) SYNTH[cue.id](ctx, ctx.destination, cue);
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
  const water = ambience(loop[0]!.length, 3);
  return rotatedWav(loop.map((ch, c) => ch.map((v, i) => OUT_GAIN * (v + HUM_GAIN * water[c]![i]!))), LOOP_S, start);
}
