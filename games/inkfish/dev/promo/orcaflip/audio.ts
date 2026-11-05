import { ambience, foldLoop, offlineMix, rotatedWav } from '../audioKit';
import { SOUNDS } from './script';
import { endOf, LOOP_S, UNTIL_AT } from './story';

/**
 * The short's soundtrack: the narrator (voice.mp3, starting with the loop),
 * the game's effects quiet under it, one set a mood (script.ts lists them),
 * and a low hum of water. The voice's last words ("Caught on camera off Mexico,")
 * run up to the loop point, so the loop finishes its sentence.
 */
const TAIL_S = 2;
const VOICE_URL = new URL('./voice.mp3', import.meta.url).href;
const HUM_GAIN = 0.45;
/** The voice goes straight to the output; brought down so the whole mix, lifted by OUT_GAIN, peaks around -4 dB. */
const VOICE_GAIN = 0.7;
const OUT_GAIN = 1.44;
/** +2 dB on the nervous line. */
const NERVOUS_LIFT = 10 ** (2 / 20);

export async function renderOrcaflipAudio(start = 0): Promise<Blob> {
  const { ctx, play } = offlineMix(LOOP_S + TAIL_S, 3);
  for (const cue of SOUNDS) play(cue.id, cue.t, cue.pitch, cue.gain, cue.pan);
  const response = await fetch(VOICE_URL);
  if (!response.ok) throw new Error(`voice.mp3: ${response.status}`);
  const voice = ctx.createBufferSource();
  voice.buffer = await ctx.decodeAudioData(await response.arrayBuffer());
  const level = ctx.createGain();
  // The nervous line ("until its belly faces the sky…") is about 5 dB under the rest of the take: lift it 2 dB, so it stays nervous but within 4 dB.
  const [from, to] = [UNTIL_AT - 0.05, endOf('sky…') + 0.05];
  level.gain.setValueAtTime(VOICE_GAIN, 0);
  level.gain.setValueAtTime(VOICE_GAIN, from - 0.15);
  level.gain.linearRampToValueAtTime(VOICE_GAIN * NERVOUS_LIFT, from);
  level.gain.setValueAtTime(VOICE_GAIN * NERVOUS_LIFT, to);
  level.gain.linearRampToValueAtTime(VOICE_GAIN, to + 0.25);
  voice.connect(level).connect(ctx.destination);
  voice.start(0);
  const loop = foldLoop(await ctx.startRendering(), LOOP_S);
  const hum = ambience(loop[0]!.length, 3);
  return rotatedWav(loop.map((ch, c) => ch.map((v, i) => OUT_GAIN * (v + HUM_GAIN * hum[c]![i]!))), LOOP_S, start);
}
