import { REEF_PLACE } from '../../../src/art/chapters/reefPlace';
import { makeDraw } from '../../../src/art/kit';
import { makeCanvas, releaseScratch } from '../../../src/art/pen';
import { BOARD, type CoverDef, type LevelDef, type SolidDef, type ZoneDef } from '../../../src/level/types';
import type { Pt } from '../sprites';

/**
 * The short's reef: one board of chapter 6 (The Reef), laid out for this
 * short and painted by the game's own painters (reefPlace.ts: the sea and
 * its floor, the sand cay and its shallows, coral heads, seagrass, the
 * dead-coral outcrops round the eels' holes), plus the holes themselves as
 * the reef's view draws them (reefView.ts). Board px, 960 × 540.
 *
 *   - the crack: a hole in the south side of coral head A, where the krait
 *     probes for the eel (beats 2 to 4);
 *   - the next eel's hole by coral head C, low on the board (the hook, and
 *     the loop's end);
 *   - the sand cay, east, where the krait sleeps it off (beat 6).
 */
type Circle = Extract<SolidDef, { kind: 'circle' }>;
const coral = (x: number, y: number, r: number): Circle => ({ kind: 'circle', look: 'coral', x, y, r });

export const CORAL_A = coral(560, 92, 50);
export const CORAL_C = coral(452, 470, 36);
/** The sand cay: dry sand out to r, the shallows to r + 36. */
export const CAY = { x: 812, y: 300, r: 84 } as const;
/** The crack the krait probes, in coral head A's south side, and the next eel's hole by coral head C. */
export const CRACK: Pt = { x: 560, y: 92 + 50 + 13 };
export const HOLE_C: Pt = { x: 452 + 36 + 13, y: 470 - 6 };

const SEA: ZoneDef = { kind: 'water', look: 'reef', shape: 'rect', x: -40, y: -40, w: 1040, h: 620 };

export const LEVEL: LevelDef = {
  id: 'promo-krait', name: 'Sea Krait', snake: 'krait', start: { x: 560, y: 420 }, heading: -Math.PI / 2, length: 300, target: 400, par: 40,
  prey: [],
  zones: [
    SEA,
    { kind: 'sand', look: 'shallows', shape: 'circle', x: CAY.x, y: CAY.y, r: CAY.r + 40 },
    { kind: 'land', look: 'cay', shape: 'circle', x: CAY.x, y: CAY.y, r: CAY.r },
  ],
  solids: [
    CORAL_A, CORAL_C,
    coral(372, 268, 40), coral(690, 150, 30), coral(268, 84, 30), coral(668, 510, 26), coral(232, 452, 30),
    { kind: 'circle', look: 'rock', x: 846, y: 262, r: 13 },
  ],
  cover: [
    { look: 'seagrass', x: 676, y: 452, r: 44 } satisfies CoverDef,
    { look: 'coral-fan', x: 420, y: 150, r: 34 } satisfies CoverDef,
    { look: 'seagrass', x: 300, y: 380, r: 40 } satisfies CoverDef,
  ],
  spots: [CRACK, HOLE_C],
};

/** A painted board: the canvas and its px per board px. */
export interface Board {
  readonly canvas: HTMLCanvasElement;
  readonly res: number;
}

/** The eels' holes as the reef's view draws them: a soft shadow, the dark opening, its deeper middle, an inked rim. */
function holes(ctx: CanvasRenderingContext2D): void {
  for (const h of LEVEL.spots ?? []) {
    const disc = (x: number, y: number, r: number, style: string): void => {
      ctx.fillStyle = style;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    };
    disc(h.x + 2, h.y + 2, 11, 'rgba(38,49,106,0.18)');
    disc(h.x, h.y, 9, 'rgba(27,36,64,0.78)');
    disc(h.x + 1, h.y + 1, 5.5, 'rgba(11,16,34,0.9)');
    ctx.strokeStyle = 'rgba(38,49,106,0.7)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(h.x, h.y, 9.5, 0, Math.PI * 2);
    ctx.stroke();
  }
}

/** Paints the board as the game's bakeBoard and bakeCovers do (ground, solids, cover), at `res` px per board px. */
export function paintBoard(res: number): Board {
  const place = REEF_PLACE!;
  const { canvas, ctx } = makeCanvas(Math.round(BOARD.w * res), Math.round(BOARD.h * res));
  ctx.scale(res, res);
  place.ground(makeDraw(ctx, 600 + 77, 0, 0), LEVEL);
  (LEVEL.solids ?? []).forEach((s, i) => place.solid(makeDraw(ctx, 700 + i + 77, 0, 0), s));
  holes(ctx);
  (LEVEL.cover ?? []).forEach((c, i) => place.cover(makeDraw(ctx, 800 + i, 0, 0), c));
  releaseScratch();
  return { canvas, res };
}
