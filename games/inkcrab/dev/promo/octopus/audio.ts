import { addVoice, foldLoop, offlineMix, rotatedWav, surf } from '../audioKit';
import { BEEPS, FLAT, SOUNDS, THUMPS } from './sounds';
import { LOOP_S } from './story';

/**
 * The short's soundtrack: the narrator (voice.mp3, starting with the loop),
 * the game's effects quiet under it (sounds.ts lists them), a soft heartbeat
 * and the monitor's beeps and flat tone (made here: the game has no
 * heartbeat), and a faint surf beyond the pool. The voice's last words run up
 * to the loop point, so the loop finishes its sentence.
 */
const TAIL_S = 2;
const VOICE_URL = new URL('./voice.mp3', import.meta.url).href;
const SURF_GAIN = 0.12;
const THUMP_GAIN = 0.32;
const BEEP_HZ = 988;
const BEEP_GAIN = 0.035;
/** The whole mix, lifted to peak around -3 dB. */
const OUT_GAIN = 1.25;

/** A soft low thump: a sine falling from 80 to 45 Hz. */
function thump(ctx: OfflineAudioContext, out: AudioNode, t: number, gain: number): void {
  const osc = ctx.createOscillator();
  const env = ctx.createGain();
  osc.frequency.setValueAtTime(80, t);
  osc.frequency.exponentialRampToValueAtTime(45, t + 0.14);
  env.gain.setValueAtTime(0.0001, t);
  env.gain.exponentialRampToValueAtTime(gain, t + 0.012);
  env.gain.exponentialRampToValueAtTime(0.0001, t + 0.16);
  osc.connect(env).connect(out);
  osc.start(t);
  osc.stop(t + 0.2);
}

/** The monitor's tone from `from` to `to`: a short beep, or the long flat line. */
function tone(ctx: OfflineAudioContext, out: AudioNode, from: number, to: number, gain: number): void {
  const osc = ctx.createOscillator();
  const env = ctx.createGain();
  osc.type = 'triangle';
  osc.frequency.value = BEEP_HZ;
  env.gain.setValueAtTime(0, from);
  env.gain.linearRampToValueAtTime(gain, from + 0.015);
  env.gain.setValueAtTime(gain, to - 0.03);
  env.gain.linearRampToValueAtTime(0, to);
  osc.connect(env).connect(out);
  osc.start(from);
  osc.stop(to + 0.02);
}

export async function renderOctopusAudio(start = 0): Promise<Blob> {
  const { ctx, play } = offlineMix(LOOP_S + TAIL_S, 3);
  for (const cue of SOUNDS) play(cue.id, cue.t, cue.pitch, cue.gain, cue.pan);
  const synth = ctx.createGain();
  synth.gain.value = 1;
  synth.connect(ctx.destination);
  for (const th of THUMPS) thump(ctx, synth, th.t, THUMP_GAIN * th.gain);
  for (const at of BEEPS) tone(ctx, synth, at, at + 0.1, BEEP_GAIN);
  tone(ctx, synth, FLAT.from, FLAT.to, BEEP_GAIN);
  await addVoice(ctx, VOICE_URL);
  const loop = foldLoop(await ctx.startRendering(), LOOP_S);
  const sea = surf(loop[0]!.length, 3);
  return rotatedWav(loop.map((ch, c) => ch.map((v, i) => OUT_GAIN * (v + SURF_GAIN * sea[c]![i]!))), LOOP_S, start);
}
