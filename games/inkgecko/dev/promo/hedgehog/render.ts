import { drawCaptions } from '../captions';
import { Stage } from '../play/stage';
import type { Short } from '../short';
import { makeKit, paintBoard } from '../sprites';
import { renderHedgehogAudio } from './audio';
import { CAPTIONS, LEVEL, LOOP_S, recording, viewAt } from './story';

/** Draws "it's so over… we're so back" (story.ts has the choreography), on the allotment's ground. */
export function createHedgehog(ctx: CanvasRenderingContext2D): Short {
  const rec = recording();
  // The game's "streak N!" counts on from loop to loop, and the Hedgehog's "+10"s would bury it: the picture tells the save.
  const stage = new Stage(ctx, makeKit(), paintBoard(LEVEL, 'allotment'), rec, { quiet: ['streak', 'points'], charmWordShift: { x: 230, y: 40 } });
  return {
    loopSeconds: LOOP_S,
    draw(t: number): void {
      stage.draw(t, viewAt(t));
      drawCaptions(ctx, CAPTIONS, t);
    },
    audio: (start) => renderHedgehogAudio(rec, start),
  };
}
