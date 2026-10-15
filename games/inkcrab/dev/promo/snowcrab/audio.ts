import { foldLoop, offlineMix, RATE, rotatedWav, surf } from '../audioKit';
import { FADES, LOOP_S, SOUNDS, type Fade } from './story';

/**
 * The short's soundtrack: the narrator (voice.mp3, starting with the loop),
 * the game's effects quiet under it (story.ts lists them: soft ticks for the
 * years, a thud for the pin, low chords for the heatwave and "starved", the
 * stamp's heavy thud), soft falling tones as each wave of crabs fades, and
 * under everything a low, cold hum and the faint rush of deep water. Nothing
 * bright or comic: it is a grim story. The voice's last words run up to the
 * loop point, so the loop finishes its sentence.
 */
const TAIL_S = 2.5;
const VOICE_URL = new URL('./voice.mp3', import.meta.url).href;
const HUM_GAIN = 0.05;
const WATER_GAIN = 0.35;
/** The whole mix, lifted to peak around -3 dB. */
const OUT_GAIN = 1.15;

/** A soft sine falling from one pitch to another and dying away. */
function playFade(ctx: OfflineAudioContext, out: AudioNode, f: Fade): void {
  const osc = ctx.createOscillator();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(f.from, f.t);
  osc.frequency.exponentialRampToValueAtTime(f.to, f.t + f.dur);
  const level = ctx.createGain();
  level.gain.setValueAtTime(0, f.t);
  level.gain.linearRampToValueAtTime(f.gain, f.t + 0.08);
  level.gain.exponentialRampToValueAtTime(0.0005, f.t + f.dur);
  const pan = ctx.createStereoPanner();
  pan.pan.value = f.pan;
  osc.connect(level).connect(pan).connect(out);
  osc.start(f.t);
  osc.stop(f.t + f.dur + 0.05);
}

/**
 * A low drone of two notes a fifth apart, each turning a whole number of
 * times a loop (so it joins seamlessly), swelling twice a loop.
 */
function hum(frames: number): Float32Array[] {
  const loop = frames / RATE;
  const tones = [Math.round(55 * loop), Math.round(82.4 * loop), Math.round(110.2 * loop)];
  return [0, 1].map((c) =>
    Float32Array.from({ length: frames }, (_, i) => {
      const u = i / frames;
      const swell = 0.7 + 0.3 * Math.sin(2 * Math.PI * (2 * u + c * 0.1));
      return swell * tones.reduce((s, n, k) => s + Math.sin(2 * Math.PI * n * u + k + c * 0.3) / (k + 1), 0);
    }),
  );
}

export async function renderSnowCrabAudio(start = 0): Promise<Blob> {
  const { ctx, master, play } = offlineMix(LOOP_S + TAIL_S, 3);
  for (const cue of SOUNDS) play(cue.id, cue.t, cue.pitch, cue.gain, cue.pan);
  for (const f of FADES) playFade(ctx, master, f);
  const response = await fetch(VOICE_URL);
  if (!response.ok) throw new Error(`voice.mp3: ${response.status}`);
  const voice = ctx.createBufferSource();
  voice.buffer = await ctx.decodeAudioData(await response.arrayBuffer());
  // Straight to the output: the effects' master gain is for their quiet synth levels.
  voice.connect(ctx.destination);
  voice.start(0);
  const loop = foldLoop(await ctx.startRendering(), LOOP_S);
  const frames = loop[0]!.length;
  const drone = hum(frames);
  const water = surf(frames, 3);
  return rotatedWav(loop.map((ch, c) => ch.map((v, i) => OUT_GAIN * (v + HUM_GAIN * drone[c]![i]! + WATER_GAIN * water[c]![i]!))), LOOP_S, start);
}
