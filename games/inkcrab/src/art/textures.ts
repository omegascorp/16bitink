import type Phaser from 'phaser';
import type { FoodKind } from '../logic/items';
import { SHELL_KINDS } from '../logic/shells';
import { drawCrabBack, drawCrabFront } from './crabArt';
import { FRAME, GROUND } from './frame';
import { drawFood, drawHighlight, drawPuff, FOOD_FRAME, FOOD_GROUND, FOOD_RES } from './itemArt';
import { makeDraw, type Draw } from './kit';
import { BOIL, PAPER, RED, RULE } from './palette';
import { makeCanvas } from './pen';
import { drawShell } from './shellArt';

export const TEX = {
  crabBack: (f: number) => `crab-back-${f}`,
  crabFront: (f: number) => `crab-front-${f}`,
  nakedBack: (f: number) => `naked-back-${f}`,
  nakedFront: (f: number) => `naked-front-${f}`,
  shell: (kind: string, f: number) => `shell-${kind}-${f}`,
  food: (kind: string, f: number) => `food-${kind}-${f}`,
  highlight: (f: number) => `hl-${f}`,
  puff: (f: number) => `puff-${f}`,
  paper: 'paper',
} as const;

const FOODS: readonly FoodKind[] = ['crumb', 'hopper', 'clam'];
/** World px between ruled lines on the notebook page. */
export const RULE_GAP = 32;
const PAPER_TILE = 256;
/** Frame px of the sand-puff drawing. */
export const PUFF = 64;

/** Draws into a square canvas of `units`·`res` px with the origin at its centre. */
function bake(scene: Phaser.Scene, key: string, units: number, res: number, draw: (ctx: CanvasRenderingContext2D) => void): void {
  if (scene.textures.exists(key)) return;
  const { canvas, ctx } = makeCanvas(units * res, units * res);
  ctx.scale(res, res);
  ctx.translate(units / 2, units / 2);
  draw(ctx);
  scene.textures.addCanvas(key, canvas);
}

function bakePaper(scene: Phaser.Scene): void {
  if (scene.textures.exists(TEX.paper)) return;
  const { canvas, ctx } = makeCanvas(PAPER_TILE, PAPER_TILE);
  ctx.fillStyle = PAPER;
  ctx.fillRect(0, 0, PAPER_TILE, PAPER_TILE);
  ctx.strokeStyle = RULE;
  ctx.globalAlpha = 0.45;
  ctx.lineWidth = 1;
  for (let y = RULE_GAP - 0.5; y < PAPER_TILE; y += RULE_GAP) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(PAPER_TILE, y);
    ctx.stroke();
  }
  scene.textures.addCanvas(TEX.paper, canvas);
}

/** Draws every sprite with BOIL slightly different frames (for the crab, also its leg poses). */
export function generateTextures(scene: Phaser.Scene): void {
  bakePaper(scene);
  const critter = (key: string, seed: number, f: number, draw: (d: Draw) => void, ink?: string): void =>
    bake(scene, key, FRAME, 1, (ctx) => draw(makeDraw(ctx, seed, f, GROUND, ink)));
  for (let f = 0; f < BOIL; f++) {
    critter(TEX.crabBack(f), 100 + f, f, (d) => drawCrabBack(d));
    critter(TEX.crabFront(f), 110 + f, f, (d) => drawCrabFront(d));
    critter(TEX.nakedBack(f), 120 + f, f, (d) => drawCrabBack(d, true), RED);
    critter(TEX.nakedFront(f), 130 + f, f, (d) => drawCrabFront(d, true), RED);
    SHELL_KINDS.forEach((kind, i) => critter(TEX.shell(kind, f), 300 + i * 10 + f, f, (d) => drawShell(d, kind)));
    FOODS.forEach((kind, i) => bake(scene, TEX.food(kind, f), FOOD_FRAME, FOOD_RES, (ctx) => drawFood(makeDraw(ctx, 500 + i * 10 + f, f, FOOD_GROUND), kind)));
    bake(scene, TEX.puff(f), PUFF, 2, (ctx) => drawPuff(makeDraw(ctx, 700 + f, f, 0), PUFF * 0.36));
    bake(scene, TEX.highlight(f), 32, 2, (ctx) => {
      ctx.translate(-16, -16);
      drawHighlight(makeDraw(ctx, 600 + f, f, 0), 32, 32);
    });
  }
}
