import { BACKDROP_SCALE, BACKDROP_W, BOAT_DRAW, THEME_BOATS, THEMES, type ThemeId } from '../src/art/backdrop';
import { dhoni, speedboat, yacht } from '../src/art/backdrop/boats';
import { bungalow, villa } from '../src/art/backdrop/homes';
import { drawCrabBack, drawCrabFront } from '../src/art/crabArt';
import { CRITTER_FRAME, CRITTER_GROUND, drawCritter } from '../src/art/critterArt';
import { SPECIES, type SpeciesId } from '../src/logic/species';
import { FOOT, FRAME, GROUND } from '../src/art/frame';
import { crabShift } from '../src/art/mouth';
import { drawFood, FOOD_FRAME, FOOD_GROUND } from '../src/art/itemArt';
import { makeDraw, type Draw } from '../src/art/kit';
import { PAPER, RED } from '../src/art/palette';
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

const bigCritters = section('creatures, large');
for (const species of Object.keys(SPECIES) as SpeciesId[]) {
  figure(bigCritters, species, CRITTER_FRAME * 4, CRITTER_FRAME * 3.2, (ctx) => {
    ctx.scale(4, 4);
    ctx.translate(CRITTER_FRAME / 2, CRITTER_FRAME / 2);
    drawCritter(makeDraw(ctx, 800, 0, CRITTER_GROUND), species);
  });
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

const backdrops = section('backdrop layers (each theme, stacked as in game)');
for (const theme of Object.keys(THEMES) as ThemeId[]) {
  const layers = THEMES[theme];
  const H = 520;
  const { canvas, ctx } = makeCanvas(BACKDROP_W, H);
  ctx.fillStyle = PAPER;
  ctx.fillRect(0, 0, BACKDROP_W, H);
  // Stack from a shared ground line at the bottom, design-scale lifts.
  const ground = H - 40;
  const top = (id: string): number => {
    const l = layers.find((x) => x.id === id)!;
    return ground - l.lift / BACKDROP_SCALE - l.height;
  };
  layers.forEach((l, i) => {
    ctx.save();
    ctx.translate(0, top(l.id));
    l.draw(makeDraw(ctx, 900 + i, 0, 0));
    ctx.restore();
    // Boats at their starting places, in the order the game stacks them.
    THEME_BOATS[theme].forEach((b, k) => {
      const at = layers.findIndex((x) => x.id === b.layer) + (b.front ? 1 : 0);
      if (at === i) BOAT_DRAW[b.kind](makeDraw(ctx, 950 + k, 0, 0), b.x, top(b.layer) + b.water, b.s);
    });
  });
  canvas.style.width = `${BACKDROP_W}px`;
  const fig = document.createElement('figure');
  fig.append(canvas, Object.assign(document.createElement('figcaption'), { textContent: theme }));
  backdrops.append(fig);
}

const boats = section('backdrop boats, at 4×');
for (const [label, draw] of [['dhoni', dhoni], ['yacht', yacht], ['speedboat', speedboat]] as const) {
  figure(boats, label, 90 * 4, 90 * 3, (ctx) => {
    ctx.scale(4, 4);
    draw(makeDraw(ctx, 5, 0, 0), 45, 65, 1);
  });
}

const homes = section('backdrop homes, at 4×');
figure(homes, 'villa (two tiers, pool)', 60 * 4, 60 * 4, (ctx) => {
  ctx.scale(4, 4);
  villa(makeDraw(ctx, 6, 0, 0), 30, 48, 1, 0);
});
figure(homes, 'villa (tall hip, ladder)', 60 * 4, 60 * 4, (ctx) => {
  ctx.scale(4, 4);
  villa(makeDraw(ctx, 7, 0, 0), 30, 48, 1, 5);
});
figure(homes, 'beach bungalow', 100 * 4, 60 * 4, (ctx) => {
  ctx.scale(4, 4);
  bungalow(makeDraw(ctx, 8, 0, 0), 40, 52, 1);
});
