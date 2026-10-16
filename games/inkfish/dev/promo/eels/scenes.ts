import { PAPER } from '../../../src/art/pen';
import { drawTextLine, INK_ON_PAPER, type TextInk } from '../captions';
import { lerp } from '../short';
import type { Sprite } from '../sprites';
import { drawSwimmer } from '../swimmer';
import { drawProp, drawSign, livePen, type Prop } from './ink';
import { BENCH_Y, BOARD, CHALK, FREUD_H, JAR_H, JAR_W, SCOPE_H, SHELF_YS, SLATE } from './lab';
import { SEA_INK } from './map';
import {
  breedLabel, countShown, distanceLabel, europeLabel, femaleLabel, freudLabel, laterLabel, maleLabel, puzzleAt, sargassoLabel,
} from './script';
import { deepPath, drawNoEye, drawQuestion, drawSnow, ON_DEEP, SAID_ON_DEEP } from './sea';
import {
  chalkWritten, countAt, type Fish, hookAt, JAR_AT, JAR_COLS, JAR_COUNT, JARS, magAt, MAP_MIDDLE, mapZoomAt, MIGRANTS, migrantAt, magPos, pairEel, popIn,
  project, routeAt, routeDrawn, SARGASSO, swayAt, TAG_AT, yearAt, yearShown,
} from './story';

/** The three scenes, each drawn whole into its own layer (render.ts fades the layers in and out). */

export const RED = '#c8452c';
export const SPOKEN: TextInk = { fill: RED, halo: PAPER };
const ON_SLATE: TextInk = { fill: CHALK, halo: SLATE };
const MALE_BLUE = '#3d6fb4';
const WEED = '#a8892f';

export interface Art {
  readonly deep: HTMLCanvasElement;
  readonly room: Prop;
  readonly freud: Prop;
  readonly scope: Prop;
  readonly jarBack: Prop;
  readonly jarFront: Prop;
  readonly map: Prop;
  /** The game's eel, at three sizes: the hook's pair, the jars', and the map's. */
  readonly eel: Sprite;
  readonly jarEel: Sprite;
  readonly mapEel: Sprite;
}

/** One of the game's eels, squeezed side-on as it turns (`face` between -1 and 1). */
export function drawEel(ctx: CanvasRenderingContext2D, sprite: Sprite, f: Fish, boil: number): void {
  if (Math.abs(f.face) < 0.02 || f.alpha <= 0) return;
  ctx.save();
  ctx.translate(f.x, f.y);
  ctx.scale(f.face, 1);
  drawSwimmer(ctx, sprite, { j: 0, shape: 'eel', age: 0, x: 0, y: 0, length: f.len, facing: 1, tilt: f.tilt, beat: f.beat, effort: f.effort }, boil, { alpha: f.alpha });
  ctx.restore();
}

// ---------------------------------------------------------------- the deep

export function drawDeepScene(ctx: CanvasRenderingContext2D, art: Art, t: number, boil: number): void {
  ctx.drawImage(art.deep, 0, 0);
  drawSnow(ctx, t);
  const hook = hookAt(t);
  // The far eel behind the "?", the near one in front of it.
  const pair = [pairEel(0, t), pairEel(1, t)].sort((a, b) => a.y - b.y);
  drawEel(ctx, art.eel, pair[0]!, boil);
  drawQuestion(ctx, t, hook);
  drawEel(ctx, art.eel, pair[1]!, boil);
  drawNoEye(ctx, 540, 372, 200, hook, boil);
  drawTextLine(ctx, 'eels mating:', 540, 520, 72, 700, hook, ON_DEEP);
  drawTextLine(ctx, 'never seen', 540, 600, 92, 700, hook, SAID_ON_DEEP);
  const year = yearShown(t);
  drawTextLine(ctx, String(yearAt(t)), 540, 530, 190, 700, year, SAID_ON_DEEP);
  drawTextLine(ctx, '150 years later', 540, 620, 70, 700, laterLabel(t), ON_DEEP);
}

// ---------------------------------------------------------------- the lab

/** Chalked on the board as it's said: "1876 · Trieste", written left to right, then the count. */
function drawChalk(ctx: CanvasRenderingContext2D, t: number): void {
  const written = chalkWritten(t);
  if (written > 0) {
    const w = 640;
    ctx.save();
    ctx.beginPath();
    ctx.rect(BOARD.x, BOARD.y, (BOARD.w - w) / 2 + w * written, BOARD.h);
    ctx.clip();
    drawTextLine(ctx, '1876 · Trieste', BOARD.x + BOARD.w / 2, BOARD.y + 98, 100, 700, 1, ON_SLATE);
    ctx.restore();
  }
  drawTextLine(ctx, `eels: ${countAt(t)}`, BOARD.x + BOARD.w / 2, BOARD.y + 176, 72, 700, countShown(t), ON_SLATE);
}

/** Where jar k stands: five to a shelf, the top shelf first. */
export function jarSpot(k: number): { readonly x: number; readonly y: number } {
  const row = Math.floor(k / JAR_COLS);
  return { x: 578 + (k % JAR_COLS) * 95, y: SHELF_YS[row]! - JAR_H };
}

/** A jar with an eel in it (whole, preserved), and its ♀ tag once it has been stamped. */
function drawJar(ctx: CanvasRenderingContext2D, art: Art, k: number, t: number, boil: number): void {
  const up = popIn(t, JAR_AT[k]!, 0.18);
  if (up <= 0) return;
  const at = jarSpot(k);
  ctx.save();
  ctx.translate(at.x + JAR_W / 2, at.y + JAR_H);
  ctx.scale(up, up);
  ctx.translate(-JAR_W / 2, -JAR_H);
  drawProp(ctx, art.jarBack, boil, 0, 0);
  const side = k % 2 ? -1 : 1;
  ctx.save();
  // Kept inside the glass.
  ctx.beginPath();
  ctx.roundRect(7, 26, JAR_W - 14, JAR_H - 32, 14);
  ctx.clip();
  ctx.translate(JAR_W / 2, 76);
  ctx.scale(side, 1);
  drawSwimmer(ctx, art.jarEel, { j: 0, shape: 'eel', age: 0, x: 0, y: 0, length: 110, facing: 1, tilt: 0.9, beat: k * 1.3, effort: 0.8 }, boil);
  ctx.restore();
  drawProp(ctx, art.jarFront, boil, 0, 0);
  ctx.restore();
  const tag = popIn(t, TAG_AT[k]!, 0.16);
  if (tag <= 0) return;
  // The tag comes down like a stamp: big, then landing on the glass.
  ctx.save();
  ctx.translate(at.x + JAR_W / 2 + 8, at.y + JAR_H - 36);
  ctx.rotate(side * 0.12);
  ctx.scale(1.8 - 0.8 * tag, 1.8 - 0.8 * tag);
  ctx.globalAlpha = Math.min(1, tag * 2);
  const pen = livePen(ctx, 300 + k, boil);
  pen.fill([{ x: -26, y: -24 }, { x: 26, y: -24 }, { x: 26, y: 24 }, { x: -26, y: 24 }], PAPER, 1);
  pen.closed([{ x: -26, y: -24 }, { x: 26, y: -24 }, { x: 26, y: 24 }, { x: -26, y: 24 }], 2);
  drawSign(pen, 'female', 0, -8, 22, RED, 3.6);
  ctx.restore();
}

/** The magnifier with a ♂ in its lens, looking for a male among the jars. */
function drawMagnifier(ctx: CanvasRenderingContext2D, t: number, boil: number): void {
  const shown = magAt(t);
  if (shown <= 0) return;
  const { x, y } = magPos(t);
  const r = 70;
  ctx.save();
  ctx.globalAlpha = shown;
  const pen = livePen(ctx, 90, boil);
  pen.stroke([{ x: x + r * 0.7, y: y + r * 0.7 }, { x: x + r * 1.75, y: y + r * 1.75 }], 22);
  pen.stroke([{ x: x + r * 0.78, y: y + r * 0.78 }, { x: x + r * 1.7, y: y + r * 1.7 }], 13, '#7a5232', 1, false);
  ctx.globalAlpha = shown * 0.55;
  pen.fill(Array.from({ length: 24 }, (_, i) => ({ x: x + r * Math.cos((i / 24) * 2 * Math.PI), y: y + r * Math.sin((i / 24) * 2 * Math.PI) })), '#eef6fa', 1);
  ctx.globalAlpha = shown;
  pen.circle(x, y, r, 7);
  pen.circle(x, y, r - 6, 2, '#c9a04a');
  drawSign(pen, 'male', x - 10, y + 10, 46, MALE_BLUE, 6);
  ctx.restore();
  drawTextLine(ctx, 'male?', x, y - r - 26, 70, 700, shown * maleLabel(t), { fill: MALE_BLUE, halo: PAPER });
}

export function drawLabScene(ctx: CanvasRenderingContext2D, art: Art, t: number, boil: number): void {
  drawProp(ctx, art.room, boil, 0, 0);
  drawChalk(ctx, t);
  // Freud sways a touch as he works, about the middle of the bench.
  ctx.save();
  ctx.translate(290, BENCH_Y);
  ctx.rotate(0.008 * swayAt(t));
  drawProp(ctx, art.freud, boil, -220, -FREUD_H);
  ctx.restore();
  drawProp(ctx, art.scope, boil, 428, BENCH_Y - SCOPE_H + 6);
  for (let k = 0; k < JARS; k++) drawJar(ctx, art, k, t, boil);
  drawMagnifier(ctx, t, boil);
  const label = freudLabel(t);
  drawTextLine(ctx, 'Sigmund Freud', 290, 586, 70, 700, label, SPOKEN);
  drawTextLine(ctx, 'aged 19', 290, 636, 48, 700, label, INK_ON_PAPER);
  const puzzle = puzzleAt(t);
  if (puzzle > 0) drawTextLine(ctx, '?', 400, 720, 130 * puzzle, 700, Math.min(1, puzzle), SPOKEN);
  const female = femaleLabel(t);
  if (female > 0) drawTextLine(ctx, 'all female!', 808, 594, 72 * female, 700, Math.min(1, female), SPOKEN);
}

// ---------------------------------------------------------------- the map

/** The dotted route, drawn on ahead of the eels: fixed dots, so they don't crawl. */
function drawRoute(ctx: CanvasRenderingContext2D, t: number, boil: number): void {
  const drawn = routeDrawn(t);
  const pen = livePen(ctx, 61, boil);
  for (let k = 0; k <= 60; k++) {
    const s = k / 60;
    if (s > drawn) break;
    const p = routeAt(s);
    pen.dot(p.x, p.y, 5, RED, 0.9);
  }
}

/** The Sargasso: a dashed oval with drifting weed in it. */
function drawSargasso(ctx: CanvasRenderingContext2D, t: number, boil: number): void {
  const pen = livePen(ctx, 62, boil);
  ctx.save();
  ctx.setLineDash([16, 12]);
  ctx.strokeStyle = SEA_INK;
  ctx.lineWidth = 4;
  ctx.globalAlpha = 0.8;
  ctx.beginPath();
  ctx.ellipse(SARGASSO.x, SARGASSO.y, SARGASSO.rx, SARGASSO.ry, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
  for (let k = 0; k < 9; k++) {
    const a = k * 2.4;
    const x = SARGASSO.x + Math.cos(a) * SARGASSO.rx * 0.6 * ((k % 3) / 3 + 0.3);
    const y = SARGASSO.y + Math.sin(a) * SARGASSO.ry * 0.6 * ((k % 3) / 3 + 0.3) + 3 * Math.sin((2 * Math.PI * 2 * t) / 18 + k);
    pen.stroke([{ x: x - 14, y }, { x: x - 5, y: y - 6 }, { x: x + 4, y }, { x: x + 13, y: y - 6 }], 3, WEED, 0.9, false);
    pen.dot(x - 2, y + 4, 3, WEED, 0.9);
  }
}

export function drawMapScene(ctx: CanvasRenderingContext2D, art: Art, t: number, boil: number): void {
  const zoom = mapZoomAt(t);
  ctx.save();
  // Kept inside the deep's wash, so as it sinks in there's nothing of it left outside.
  deepPath(ctx);
  ctx.clip();
  ctx.translate(lerp(SARGASSO.x, MAP_MIDDLE.x, zoom.toMiddle), lerp(SARGASSO.y, MAP_MIDDLE.y, zoom.toMiddle));
  ctx.scale(zoom.scale, zoom.scale);
  ctx.translate(-SARGASSO.x, -SARGASSO.y);
  drawProp(ctx, art.map, boil, 0, 0);
  drawSargasso(ctx, t, boil);
  drawRoute(ctx, t, boil);
  for (let k = 0; k < MIGRANTS; k++) drawEel(ctx, art.mapEel, migrantAt(k, t), boil);
  const europe = project(8, 51);
  drawTextLine(ctx, 'EUROPE', europe.x - 10, europe.y, 56, 700, europeLabel(t), { fill: '#5a4a32', halo: '#eadcb8' });
  const mid = routeAt(0.45);
  drawTextLine(ctx, '~6,000 km', mid.x + 110, mid.y + 70, 62, 700, distanceLabel(t), SPOKEN);
  drawTextLine(ctx, 'Sargasso Sea', SARGASSO.x, SARGASSO.y + SARGASSO.ry + 62, 66 * Math.min(1.2, sargassoLabel(t)), 700, Math.min(1, sargassoLabel(t)), SPOKEN);
  drawTextLine(ctx, 'breeding ground', SARGASSO.x, SARGASSO.y - SARGASSO.ry - 22, 50, 700, Math.min(1, breedLabel(t)), INK_ON_PAPER);
  ctx.restore();
}
