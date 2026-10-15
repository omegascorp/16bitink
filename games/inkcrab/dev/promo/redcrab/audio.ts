import { addVoice, foldLoop, offlineMix, RATE, rotatedWav, surf } from '../audioKit';
import { LOOP_S, seasideAt, SOUNDS } from './story';

/**
 * The short's soundtrack: the narrator (voice.mp3, starting with the loop),
 * the game's effects quietly under it (story.ts lists them: the patter of
 * many feet, a ding on the number, the pin, knocks on the house, the
 * barrier, the bridge and its fanfare, soft tones for the moon and the
 * eggs), and the surf, louder when the camera is down at the beach. The
 * voice's last words run up to the loop point, so the loop finishes its
 * sentence.
 */
const TAIL_S = 2;
const VOICE_URL = new URL('./voice.mp3', import.meta.url).href;
const SURF_GAIN = 0.55;
/** The whole mix, lifted to peak around -3 dB. */
const OUT_GAIN = 1.3;

export async function renderRedCrabAudio(start = 0): Promise<Blob> {
  const { ctx, play } = offlineMix(LOOP_S + TAIL_S, 3);
  for (const cue of SOUNDS) play(cue.id, cue.t, cue.pitch, cue.gain, cue.pan);
  await addVoice(ctx, VOICE_URL);
  const loop = foldLoop(await ctx.startRendering(), LOOP_S);
  const frames = loop[0]!.length;
  const sea = surf(frames, 6);
  // How loud the surf is, sampled every 10 ms along the loop (it wraps, like the camera).
  const step = RATE / 100;
  const level = Array.from({ length: Math.ceil(frames / step) + 1 }, (_, k) => seasideAt((k * step) / RATE));
  const levelAt = (i: number): number => {
    const k = i / step;
    const k0 = Math.floor(k);
    return level[k0]! + (level[Math.min(k0 + 1, level.length - 1)]! - level[k0]!) * (k - k0);
  };
  return rotatedWav(loop.map((ch, c) => ch.map((v, i) => OUT_GAIN * (v + SURF_GAIN * levelAt(i) * sea[c]![i]!))), LOOP_S, start);
}
