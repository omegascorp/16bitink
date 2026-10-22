import { drawCaptions } from '../captions';
import { Stage } from '../play/stage';
import type { Short } from '../short';
import { makeKit, paintBoard } from '../sprites';
import { renderChainAudio } from './audio';
import { CAPTIONS, LEVEL, LOOP_S, recording, viewAt } from './story';

/** Draws "wait for it…" (story.ts has the choreography), on the garden's ground. */
export function createChain(ctx: CanvasRenderingContext2D): Short {
  const rec = recording();
  // Only the chain's "combo ×N!" words: the "+N"s and the stragglers' "streak N!" would bury them.
  const stage = new Stage(ctx, makeKit(), paintBoard(LEVEL, 'garden'), rec, { quiet: ['streak', 'points'] });
  return {
    loopSeconds: LOOP_S,
    draw(t: number): void {
      stage.draw(t, viewAt(t));
      drawCaptions(ctx, CAPTIONS, t);
    },
    audio: (start) => renderChainAudio(rec, start),
  };
}
