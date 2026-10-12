import { ambience, foldLoop, offlineMix, RATE, rotatedWav } from '../audioKit';
import { CHORD_AT, darkAt, depthAt, LOOP_S, SOUNDS } from './story';

/**
 * The short's soundtrack: the game's own effects (story.ts lists the cues),
 * a soft major chord swelling as the light reaches her, and the sea's hum,
 * louder in the dark. Loops like the picture.
 */
const TAIL_S = 3;
/** The chord's notes, Hz: a gentle A major, low to high. */
const CHORD = [220, 277.18, 329.63, 440] as const;

/** Sine tones fading in over a second and dying away slowly, a little apart, like a pad. */
function chord(ctx: OfflineAudioContext, out: AudioNode, t: number): void {
  CHORD.forEach((hz, i) => {
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = hz;
    const env = ctx.createGain();
    const start = t + i * 0.12;
    env.gain.setValueAtTime(0.0001, start);
    env.gain.exponentialRampToValueAtTime(0.05, start + 1.1);
    env.gain.exponentialRampToValueAtTime(0.0001, start + 4.5);
    osc.connect(env).connect(out);
    osc.start(start);
    osc.stop(start + 4.6);
  });
}

export async function renderLightAudio(start = 0): Promise<Blob> {
  const { ctx, master, play } = offlineMix(LOOP_S + TAIL_S, 3);
  for (const cue of SOUNDS) play(cue.id, cue.t, cue.pitch, cue.gain, cue.pan);
  chord(ctx, master, CHORD_AT);
  const loop = foldLoop(await ctx.startRendering(), LOOP_S);
  const hum = ambience(loop[0]!.length, 4);
  // The deep is loud with it; the sunlit water nearly quiet.
  const level = (i: number): number => 0.3 + 0.9 * darkAt(depthAt(i / RATE));
  return rotatedWav(loop.map((ch, c) => ch.map((v, i) => v + level(i) * hum[c]![i]!)), LOOP_S, start);
}
