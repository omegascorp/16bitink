import { ambience, foldLoop, offlineMix, rotatedWav } from '../audioKit';
import { MOANS, SOUNDS, WHISTLES } from './script';
import { LOOP_S } from './story';

/**
 * The short's soundtrack: the narrator (voice.mp3, starting with the loop),
 * the game's effects quiet under it (script.ts lists them, one set a mood),
 * the blue whale's low moans and the orcas' whistles (synthesized here), and
 * a low hum of water. The voice's last words ("So yes,") run up to the loop
 * point, so the loop finishes its sentence.
 */
const TAIL_S = 2;
const VOICE_URL = new URL('./voice.mp3', import.meta.url).href;
const HUM_GAIN = 0.45;
const VOICE_GAIN = 0.8;
/**
 * The hushed "[softly] Then one went in head-first…" (12.34–13.97 s in
 * voice.mp3) came out about 7.7 dB under the rest of the take: ridden up
 * about 5.5 dB (× 1.88) between "one!" (ends 11.85 s) and "for" (14.38 s),
 * with 50 ms ramps in the pauses either side. Measured on the rendered mix
 * (ebur128): that line about 2–2.5 dB under the rest. [time s, × VOICE_GAIN]
 */
const RIDE_UP = 1.88;
const VOICE_RIDE: readonly (readonly [number, number])[] = [
  [0, 1], [12.2, 1], [12.25, RIDE_UP], [14.05, RIDE_UP], [14.1, 1],
];
/** The whole mix, set so the recorded video peaks around -4 dB. */
const OUT_GAIN = 1.1;

/** A slow, low moan: a sine gliding down with a little vibrato and its octave, swelling in and out. */
function moan(ctx: OfflineAudioContext, at: number, dur: number, from: number, to: number, gain: number): void {
  const level = ctx.createGain();
  level.gain.setValueAtTime(0, at);
  level.gain.linearRampToValueAtTime(gain, at + dur * 0.35);
  level.gain.linearRampToValueAtTime(gain * 0.7, at + dur * 0.75);
  level.gain.linearRampToValueAtTime(0, at + dur);
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 600;
  level.connect(filter).connect(ctx.destination);
  for (const [mult, k] of [[1, 1], [2, 0.35], [3, 0.12]] as const) {
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(from * mult, at);
    osc.frequency.exponentialRampToValueAtTime(to * mult, at + dur);
    const vib = ctx.createOscillator();
    vib.frequency.value = 5;
    const depth = ctx.createGain();
    depth.gain.value = 1.2 * mult;
    vib.connect(depth).connect(osc.frequency);
    const g = ctx.createGain();
    g.gain.value = k;
    osc.connect(g).connect(level);
    osc.start(at);
    vib.start(at);
    osc.stop(at + dur + 0.05);
    vib.stop(at + dur + 0.05);
  }
}

/** An orca's whistle: a quick sine sweep. */
function whistle(ctx: OfflineAudioContext, at: number, dur: number, from: number, to: number, gain: number, pan: number): void {
  const osc = ctx.createOscillator();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(from, at);
  osc.frequency.exponentialRampToValueAtTime(to, at + dur * 0.7);
  osc.frequency.exponentialRampToValueAtTime(from * 0.9, at + dur);
  const level = ctx.createGain();
  level.gain.setValueAtTime(0, at);
  level.gain.linearRampToValueAtTime(gain, at + dur * 0.15);
  level.gain.linearRampToValueAtTime(gain * 0.8, at + dur * 0.8);
  level.gain.linearRampToValueAtTime(0, at + dur);
  const panner = ctx.createStereoPanner();
  panner.pan.value = pan;
  osc.connect(level).connect(panner).connect(ctx.destination);
  osc.start(at);
  osc.stop(at + dur + 0.02);
}

export async function renderOrcawhaleAudio(start = 0): Promise<Blob> {
  const { ctx, play } = offlineMix(LOOP_S + TAIL_S, 3);
  for (const cue of SOUNDS) play(cue.id, cue.t, cue.pitch, cue.gain, cue.pan);
  for (const [at, dur, from, to, gain] of MOANS) moan(ctx, at, dur, from, to, gain);
  for (const [at, dur, from, to, gain, pan] of WHISTLES) whistle(ctx, at, dur, from, to, gain, pan);
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
