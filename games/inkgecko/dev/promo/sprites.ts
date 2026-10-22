import { drawGeckoLines, drawGeckoSkin, GECKO_FRAME, type GeckoPose } from '../../src/art/geckoArt';
import { drawHedgehog, HEDGEHOG_FRAME } from '../../src/art/hedgehogArt';
import { makeDraw, type Draw } from '../../src/art/kit';
import { drawCharmMark, drawMarble, drawSplash, MARBLE_FRAME, SPLASH_FRAME } from '../../src/art/marbleArt';
import { BOIL, PAPER } from '../../src/art/palette';
import { makeCanvas, releaseScratch } from '../../src/art/pen';
import { BURROW_FRAME, drawBranch, drawBurrow, drawGround, drawTrack, drawWell, WELL_FRAME } from '../../src/art/placesArt';
import type { Place } from '../../src/level/levels';
import type { LevelDef } from '../../src/level/types';
import { BOARD } from '../../src/level/types';
import { CHARMS, type CharmId } from '../../src/logic/charms';
import { COLOURS, type ColourId } from '../../src/logic/colours';
import { buildPath } from '../../src/logic/path';

/**
 * The game's own drawings, baked big enough for a 1080 px wide video. Pen
 * strokes are vectors, so a bigger `res` gives the same drawing with crisp
 * lines; the seeds are the game's (art/textures.ts), so every wobble is the
 * one players see.
 *
 * The line boils through the game's BOIL frames. The game turns a marble's
 * frame every 140 ms and the gecko's every 150; the video turns them every
 * 4 video frames (133 ms), so a boil cycle is 0.4 s and a loop must be a
 * whole number of 0.4 s (12, 11.2, 10.4 s…), which also makes it a whole
 * number of 30 fps frames.
 */
export const BOIL_FPS = 7.5;
export const BOIL_CYCLE_S = BOIL / BOIL_FPS;

/** The boil frame at loop time `t`, offset by `look` (each marble starts on its own). */
export const boilAt = (t: number, look = 0): number => (Math.floor(t * BOIL_FPS + 1e-6) + look) % BOIL;

/** Texture px per board px: the video shows the board at up to ~2.4×. */
export const RES = 3;
/** The ground's px per board px. */
export const GROUND_RES = 2.5;

/** A drawing baked around its origin: `units` board px square, `res` canvas px per unit. */
export interface Sprite {
  readonly canvas: HTMLCanvasElement;
  readonly units: number;
  readonly res: number;
}

/** Draws into a square canvas of `units`·`res` px with the origin at its centre (as the game's textures.ts bakes). */
export function bake(units: number, res: number, draw: (ctx: CanvasRenderingContext2D) => void): Sprite {
  const { canvas, ctx } = makeCanvas(Math.ceil(units * res), Math.ceil(units * res));
  ctx.scale(res, res);
  ctx.translate(units / 2, units / 2);
  draw(ctx);
  return { canvas, units, res };
}

/** One boil frame of a drawing per BOIL frame, seeded as the game seeds it. */
function boiled(units: number, seed: number, draw: (d: Draw) => void): Sprite[] {
  return Array.from({ length: BOIL }, (_, f) => bake(units, RES, (ctx) => draw(makeDraw(ctx, seed + f, f, 0))));
}

/** Draws a sprite with its origin at board point (x, y), `scale` board px per unit, turned `rotation` radians. */
export function drawSprite(ctx: CanvasRenderingContext2D, s: Sprite, x: number, y: number, scale = 1, rotation = 0, alpha = 1): void {
  if (alpha <= 0.002 || scale <= 0) return;
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.translate(x, y);
  if (rotation) ctx.rotate(rotation);
  const size = s.units * scale;
  ctx.drawImage(s.canvas, -size / 2, -size / 2, size, size);
  ctx.restore();
}

export interface Kit {
  readonly marble: Readonly<Record<ColourId, readonly Sprite[]>>;
  readonly splash: Readonly<Record<ColourId, Sprite>>;
  readonly mark: (charm: CharmId) => Sprite;
  readonly geckoSkin: Readonly<Record<GeckoPose, readonly Sprite[]>>;
  readonly geckoLines: Readonly<Record<GeckoPose, readonly Sprite[]>>;
  readonly well: readonly Sprite[];
  readonly burrow: readonly Sprite[];
  readonly hedgehog: readonly (readonly Sprite[])[];
}

const byColour = <T,>(make: (c: ColourId, i: number) => T): Record<ColourId, T> =>
  Object.fromEntries(COLOURS.map((c, i) => [c, make(c, i)])) as Record<ColourId, T>;

/** Every sprite the shorts use, with the game's seeds (art/textures.ts textureJobs). */
export function makeKit(): Kit {
  const marks = new Map<CharmId, Sprite>();
  const kit: Kit = {
    marble: byColour((c, i) => boiled(MARBLE_FRAME, 100 + i * 10, (d) => drawMarble(d, c))),
    splash: byColour((c, i) => bake(SPLASH_FRAME, RES, (ctx) => drawSplash(makeDraw(ctx, 200 + i, 0, 0), c))),
    mark: (charm) => {
      let m = marks.get(charm);
      if (!m) {
        m = bake(MARBLE_FRAME, RES, (ctx) => drawCharmMark(makeDraw(ctx, 300 + CHARMS.indexOf(charm), 0, 0), charm));
        marks.set(charm, m);
      }
      return m;
    },
    // The same seed for skin and lines, so they register.
    geckoSkin: { idle: boiled(GECKO_FRAME, 400, (d) => drawGeckoSkin(d, 'idle')), spit: boiled(GECKO_FRAME, 400, (d) => drawGeckoSkin(d, 'spit')) },
    geckoLines: { idle: boiled(GECKO_FRAME, 400, (d) => drawGeckoLines(d, 'idle')), spit: boiled(GECKO_FRAME, 400, (d) => drawGeckoLines(d, 'spit')) },
    well: boiled(WELL_FRAME, 500, (d) => drawWell(d)),
    burrow: boiled(BURROW_FRAME, 520, (d) => drawBurrow(d)),
    hedgehog: [0, 1].map((step) => boiled(HEDGEHOG_FRAME, 650, (d) => drawHedgehog(d, step as 0 | 1))),
  };
  releaseScratch();
  return kit;
}

/** A steady number from a level id, so each level's ground lies a little differently (art/textures.ts idSeed). */
function idSeed(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) % 100000;
  return h;
}

/**
 * A level's ground as the game paints it (art/textures.ts bakeBoard): the
 * place, the tracks' grooves and the gecko's branch, the whole board at
 * GROUND_RES, on paper.
 */
export function paintBoard(level: LevelDef, place: Place): HTMLCanvasElement {
  const { canvas, ctx } = makeCanvas(Math.round(BOARD.w * GROUND_RES), Math.round(BOARD.h * GROUND_RES));
  ctx.scale(GROUND_RES, GROUND_RES);
  ctx.fillStyle = PAPER;
  ctx.fillRect(0, 0, BOARD.w, BOARD.h);
  const sh = level.shooter;
  const keep = {
    grooves: level.tracks.map((t) => buildPath(t.points).pts),
    pads: sh.kind === 'hop' ? sh.pads : sh.kind === 'pivot' ? [{ x: sh.x, y: sh.y }] : [],
    pillars: level.pillars ?? [],
  };
  drawGround(makeDraw(ctx, 600 + idSeed(level.id), 0, 0), place, BOARD.w, BOARD.h, keep);
  level.tracks.forEach((t, i) => drawTrack(makeDraw(ctx, 640 + i, 0, 0), buildPath(t.points).pts, place));
  if (sh.kind === 'rail') drawBranch(makeDraw(ctx, 680, 0, 0), sh.x0 - 50, sh.x1 + 50, sh.y + 4);
  releaseScratch();
  return canvas;
}
