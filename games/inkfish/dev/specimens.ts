import { drawFish, FISH_TEX, type FishShape, type InkVariant } from '../src/art/fishArt';
import { drawItem, ITEM_SIZE } from '../src/art/itemArt';
import { makeCanvas } from '../src/art/pen';
import { DEEP } from '../src/art/fish/species/deep';
import { GIANTS } from '../src/art/fish/species/giants';
import { PLAYERS } from '../src/art/fish/species/players';
import { REEF } from '../src/art/fish/species/reef';
import { SHALLOWS } from '../src/art/fish/species/shallows';
import { ITEM_IDS } from '../src/levels/items';
import { ART_RES, drawHook, drawJelly, drawRock, drawWeed } from '../src/art/propArt';
import { CRITTER_IDS, drawCritter } from '../src/art/critterArt';
import { DECOR_IDS, DECOR_SIZE, drawDecor } from '../src/art/decorArt';

// Dev-only sheet for reviewing the procedural ink art: big, and at in-game size.
const sheet = document.getElementById('sheet')!;
// ?group=players|shallows|reef|deep|giants shows one habitat file; ?shapes=a,b picks fish by id.
const GROUPS: Record<string, object> = { players: PLAYERS, shallows: SHALLOWS, reef: REEF, deep: DEEP, giants: GIANTS };
const params = new URLSearchParams(location.search);
const group = GROUPS[params.get('group') ?? ''];
const picked = params.get('shapes')?.split(',').filter(Boolean) as FishShape[] | undefined;
const shapes: FishShape[] = picked ?? (group ? (Object.keys(group) as FishShape[]) : ['inkling', 'minnow', 'perch', 'puffer', 'pike', 'angler', 'eel']);

function figure(row: HTMLElement, label: string, w: number, h: number, draw: (ctx: CanvasRenderingContext2D) => void, display = 1): void {
  const { canvas, ctx } = makeCanvas(w, h);
  draw(ctx);
  canvas.style.width = `${w * display}px`;
  canvas.style.height = `${h * display}px`;
  const fig = document.createElement('figure');
  fig.append(canvas, Object.assign(document.createElement('figcaption'), { textContent: label }));
  row.append(fig);
}

function row(): HTMLElement {
  const r = document.createElement('div');
  r.className = 'row';
  sheet.append(r);
  return r;
}

for (const variant of ['light', 'heavy'] as InkVariant[]) {
  const big = row();
  for (const s of shapes) figure(big, `${s} ${variant}`, FISH_TEX, FISH_TEX, (ctx) => drawFish(ctx, s, variant, 101), 200 / FISH_TEX);
}
// Roughly in-game display size (downscaled by the browser, like the GPU would).
const small = row();
for (const s of shapes) figure(small, s, FISH_TEX, FISH_TEX, (ctx) => drawFish(ctx, s, 'light', 101), 70 / FISH_TEX);
const props = row();
const R = ART_RES;
figure(props, 'jelly', 128 * R, 128 * R, (ctx) => drawJelly(ctx, 101), 1 / R);
figure(props, 'hook', 48 * R, 76 * R, (ctx) => drawHook(ctx, 101), 1 / R);
for (const kind of [0, 1, 2] as const) figure(props, `weed ${kind}`, 128 * R, 256 * R, (ctx) => drawWeed(ctx, 7 + kind * 13, kind, 0, 128 * R, 256 * R), 1 / R);
figure(props, 'rock', 256 * R, 128 * R, (ctx) => drawRock(ctx, 40, 256 * R, 128 * R), 1 / R);
// Sinking items: full texture size, then roughly in-game size.
const items = row();
for (const id of ITEM_IDS) figure(items, id, ITEM_SIZE * R, ITEM_SIZE * R, (ctx) => drawItem(ctx, id, 101), 1 / R);
const itemsSmall = row();
for (const id of ITEM_IDS) figure(itemsSmall, id, ITEM_SIZE * R, ITEM_SIZE * R, (ctx) => drawItem(ctx, id, 101), 48 / (ITEM_SIZE * R));
// Seabed: crawlers (?critters=1 shows only these) and decor (?decor=1).
const critterRow = row();
for (const id of CRITTER_IDS) {
  for (const variant of ['light', 'heavy'] as InkVariant[]) {
    figure(critterRow, `${id} ${variant}`, FISH_TEX, FISH_TEX, (ctx) => drawCritter(ctx, id, variant, 0, 101), 200 / FISH_TEX);
  }
}
const critterPoses = row();
for (const id of CRITTER_IDS) for (const f of [0, 1, 2]) figure(critterPoses, `${id} f${f}`, FISH_TEX, FISH_TEX, (ctx) => drawCritter(ctx, id, 'light', f, 101 + f * 977), 90 / FISH_TEX);
const decorRow = row();
for (const id of DECOR_IDS) {
  const { w, h } = DECOR_SIZE[id];
  figure(decorRow, id, w * R, h * R, (ctx) => drawDecor(ctx, id, 101), 1);
}
const decorSmall = row();
for (const id of DECOR_IDS) {
  const { w, h } = DECOR_SIZE[id];
  figure(decorSmall, id, w * R, h * R, (ctx) => drawDecor(ctx, id, 101), 0.5 / R * 1.4);
}
if (params.get('critters') || params.get('decor')) {
  const keep = params.get('critters') ? [critterRow, critterPoses] : [decorRow, decorSmall];
  for (const r of [...sheet.children]) if (!keep.includes(r as HTMLElement)) r.remove();
}
