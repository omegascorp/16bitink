import { CHAIN, LOOP_S, STAGE_S } from './chain';
import { BITE_SOUNDS } from './eating';
import { realTime } from './timing';
import { ambience, foldLoop, offlineMix, rotatedWav } from './audioKit';

/**
 * The soundtrack, made with the game's own synthesized effects: each bite's
 * cues from eating.ts (alarm, rush of water, lunge, chomp, chews, bubbles),
 * deeper for the bigger fish of the chain.
 * Rendered offline a little past the loop, with the overflow folded back
 * onto the start, so the audio loops as seamlessly as the picture.
 */
const TAIL_S = 1.5;

/** The loop's soundtrack as WAV, rotated to begin `start` seconds in (to match a video that starts there). */
export async function renderAudio(start = 0): Promise<Blob> {
  const { ctx, play } = offlineMix(LOOP_S + TAIL_S, 1.9);
  CHAIN.forEach((_, i) => {
    // Fish i is the eater of bite i; bigger fish sound deeper.
    const pitch = 1.35 - (i / (CHAIN.length - 1)) * 0.6;
    // Predators come in from alternating sides.
    const side = i % 2 === 0 ? -0.35 : 0.35;
    for (const cue of BITE_SOUNDS) {
      // A cue before the loop's start plays at its end instead, and folds round.
      // Cues are in story time; the bites play slowed down (timing.ts).
      const t = ((realTime(i + cue.age) * STAGE_S) % LOOP_S + LOOP_S) % LOOP_S;
      // The prey's alarm comes from the prey's side, the rest from the eater's.
      const pan = cue.id === 'spotted' ? -side * 0.6 : side * 0.5;
      play(cue.id, t, pitch * cue.pitch, cue.gain, pan);
    }
  });
  const rendered = await ctx.startRendering();
  const loop = foldLoop(rendered, LOOP_S);
  const hum = ambience(loop[0]!.length, CHAIN.length);
  return rotatedWav(loop.map((ch, c) => ch.map((v, i) => v + hum[c]![i]!)), LOOP_S, start);
}

