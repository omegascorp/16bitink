import { drawCrabBack, drawCrabFront } from '../src/art/crabArt';
import { CRITTER_FRAME, CRITTER_GROUND, drawCritter } from '../src/art/critterArt';
import { SPECIES, type SpeciesId } from '../src/logic/species';
import { FOOT, FRAME, GROUND } from '../src/art/frame';
import { crabShift } from '../src/art/mouth';
import { drawFood, FOOD_FRAME, FOOD_GROUND } from '../src/art/itemArt';
import { makeDraw, type Draw } from '../src/art/kit';
import { RED } from '../src/art/palette';
import { makeCanvas } from '../src/art/pen';
import { drawChunk, makeSandPatterns } from '../src/art/sand';
import { drawShell } from '../src/art/shellArt';
import { buildTestBeach } from '../src/level/testBeach';
import { bodyFill, SHELL_KINDS, SHELLS } from '../src/logic/shells';
import { dig } from '../src/logic/terrain';

// Dev-only sheet for reviewing InkCrab's procedural art, big.
const sheet = document.getElementById('sheet')!;

function section(title: string): HTMLElement {
  sheet.append(Object.assign(document.createElement('h2'), { textContent: title }));
  const r = document.createElement('div');
  r.className = 'row';
  sheet.append(r);
  return r;
}

function figure(row: HTMLElement, label: string, size: number, display: number, draw: (ctx: CanvasRenderingContext2D) => void): void {
  const { canvas, ctx } = makeCanvas(size, size);
  draw(ctx);
  canvas.style.width = canvas.style.height = `${display}px`;
  const fig = document.createElement('figure');
  fig.append(canvas, Object.assign(document.createElement('figcaption'), { textContent: label }));
  row.append(fig);
}

/** A frame drawn at 2× with the origin at its centre. */
function critter(row: HTMLElement, label: string, layers: ((ctx: CanvasRenderingContext2D) => void)[]): void {
  figure(row, label, FRAME * 2, FRAME, (ctx) => {
    ctx.scale(2, 2);
    ctx.translate(FRAME / 2, FRAME / 2);
    layers.forEach((l) => l(ctx));
  });
}
const layer = (seed: number, f: number, draw: (d: Draw) => void, ink?: string) => (ctx: CanvasRenderingContext2D): void => draw(makeDraw(ctx, seed, f, GROUND, ink));

const crabs = section('crab in each shell');
SHELL_KINDS.forEach((kind, i) => critter(crabs, kind, [layer(1, 0, (d) => drawCrabBack(d)), layer(300 + i, 0, (d) => drawShell(d, kind)), layer(2, 0, (d) => drawCrabFront(d))]));

// As in game: a crab that has only just fit, sized against its shell.
const fit = section('smallest crab in each shell (game scale)');
const aboutFoot = (k: number, shift: number, draw: (ctx: CanvasRenderingContext2D) => void) => (ctx: CanvasRenderingContext2D): void => {
  ctx.save();
  ctx.translate(FOOT.x - FRAME / 2 + shift, FOOT.y - FRAME / 2);
  ctx.scale(k, k);
  ctx.translate(-(FOOT.x - FRAME / 2), -(FOOT.y - FRAME / 2));
  draw(ctx);
  ctx.restore();
};
SHELL_KINDS.forEach((kind, i) => {
  const k = bodyFill(SHELLS[kind], SHELLS[kind].minSize);
  const dx = crabShift(kind, 1, k);
  critter(fit, `${kind} ${SHELLS[kind].minSize}/${SHELLS[kind].maxSize}`, [aboutFoot(k, dx, layer(1, 0, (d) => drawCrabBack(d))), layer(300 + i, 0, (d) => drawShell(d, kind)), aboutFoot(k, dx, layer(2, 0, (d) => drawCrabFront(d)))]);
});

const loose = section('loose shells');
SHELL_KINDS.forEach((kind, i) => critter(loose, kind, [layer(300 + i, 1, (d) => drawShell(d, kind))]));

const poses = section('walk poses, exposed mid-swap');
for (let f = 0; f < 3; f++) critter(poses, `walk f${f}`, [layer(1, f, (d) => drawCrabBack(d)), layer(304, f, (d) => drawShell(d, 'whelk')), layer(2, f, (d) => drawCrabFront(d))]);
critter(poses, 'exposed', [layer(3, 0, (d) => drawCrabBack(d, true), RED), layer(304, 0, (d) => drawShell(d, 'whelk')), layer(4, 0, (d) => drawCrabFront(d, true), RED)]);

const ghosts = section('creatures: prey (blue) and danger (red), walk poses');
for (const species of Object.keys(SPECIES) as SpeciesId[]) {
  for (const ink of [undefined, RED]) {
    for (let f = 0; f < 3; f++) {
      figure(ghosts, `${species} ${ink ? 'danger' : 'prey'} f${f}`, CRITTER_FRAME * 2, CRITTER_FRAME * 1.2, (ctx) => {
        ctx.scale(2, 2);
        ctx.translate(CRITTER_FRAME / 2, CRITTER_FRAME / 2);
        drawCritter(makeDraw(ctx, 800 + f, f, CRITTER_GROUND, ink), species);
      });
    }
  }
}

const foods = section('food');
for (const kind of ['crumb', 'hopper', 'clam'] as const) {
  figure(foods, kind, FOOD_FRAME * 4, FOOD_FRAME * 3, (ctx) => {
    ctx.scale(4, 4);
    ctx.translate(FOOD_FRAME / 2, FOOD_FRAME / 2);
    drawFood(makeDraw(ctx, 9, 0, FOOD_GROUND), kind);
  });
}

const sand = section('sand (a dug tunnel), at 2×');
const beach = buildTestBeach(20261005);
for (let x = 34; x < 46; x++) for (const y of [26, 27]) dig(beach.terrain, x, y);
for (let y = 22; y < 27; y++) dig(beach.terrain, 45, y);
for (const [tx, ty] of [[32, 16], [96, 32]] as const) {
  figure(sand, `chunk ${tx},${ty}`, 16 * 16 * 2 + 8, 16 * 16 * 2 + 8, (ctx) => {
    const chunk = { tx, ty, tiles: 16 };
    drawChunk(ctx, beach.terrain, chunk, 16, 2, makeSandPatterns(ctx, 2));
  });
}
