import { createRng, type Rng } from '../../logic/rng';
import { MAP, type MapRegion } from '../../scenes/map/layout';
import { makeDraw, pt } from '../kit';
import { type Band, FeatureList, Placer } from './band';
import { bale, baleStack, barrel, cat, churn, hayCart, hayHeap, hen, logPile, rick, sack, trough } from './barnKit';
import { paintBarnFloor, paintCattleGrid, paintCobbles, paintYard, verge } from './barnGround';
import { aislePost, BARN_WALL, backWall, FACE, frontWall, loft, loftLadder, roofStrip, sideWall } from './barnWalls';
import { type Geo, PATH_HALF, seedOf } from './common';
import { treeCrown } from './flora';
import { construction, rounds, roof as pencilRoof, bush as pencilBush } from './draftKit';

/**
 * Chapter 8's band, "The Old Barn": through the field gate (the cattle
 * grid underfoot) into a cobbled farmyard, and up into a great aisled
 * barn with its roof cut away to show inside: oak posts down both aisles,
 * bales stacked high along one, the hay loft and its ladder and the old
 * hay cart along the other, a heap of loose hay and a cat asleep on a
 * bale in the nave, boards laid down the middle where the groove runs.
 * Outside, a thatched rick, a log pile, the trough under its pump, churns
 * and hens about the yard. Where the barn is the last chapter painted, the
 * yard behind it fades back into pencil.
 */
export interface Barn {
  readonly x0: number;
  readonly x1: number;
  /** Back and front walls' centrelines. */
  readonly y0: number;
  readonly y1: number;
  /** Where the doorways are, and their half-width. */
  readonly backX: number;
  readonly frontX: number;
  readonly open: number;
}

/** Above region.top + FADE the yard is only pencilled when nothing painted lies beyond. */
export const BARN_FADE = 200;
const AISLE = 170;

export function barnPlan(geo: Geo, region: MapRegion): Band {
  const salt = 15000 + region.index * 101;
  const rng = createRng(seedOf(salt, 1));
  const next = geo.layout.regions[region.index + 1];
  const fades = !next || next.chapter.place === 'draft';
  const y0 = region.top + 236;
  const y1 = region.gate.y - 292;
  const barn: Barn = { x0: 300, x1: MAP.width - 300, y0, y1, backX: geo.grooveX(y0), frontX: geo.grooveX(y1), open: PATH_HALF + 14 };
  const yardTop = fades ? region.top + 30 : region.top - 70;
  const under = new FeatureList(salt, 1);
  const over = new FeatureList(salt, 2);
  inside(geo, barn, rng, under, over);
  fabric(barn, over);
  outside(geo, region, barn, yardTop, fades, rng, under);
  if (fades) pencilTop(geo, region, rng, over);
  const yard = (x: number, y: number): boolean => y > yardTop && y < region.gate.y + 24 && x > verge(barn, y, -1) && x < verge(barn, y, 1);
  return {
    region,
    ground: (ctx, span) => paintYard(ctx, span, barn, region, yardTop, fades),
    bare: yard,
    unpaved: [[region.top - 110, region.gate.y + 44]],
    floor: (ctx, span) => {
      paintBarnFloor(ctx, geo, span, barn);
      paintCobbles(ctx, geo, span, barn, region, fades ? region.top + BARN_FADE - 40 : yardTop);
      paintCattleGrid(makeDraw(ctx, seedOf(salt, 9), 0, 0), span, region.gate);
    },
    under: under.list,
    over: over.list,
  };
}

/** The walls in stretches, the roof strips over the side walls, the posts, the front and back walls. */
function fabric(b: Barn, over: FeatureList): void {
  for (const x of [b.x0, b.x1]) {
    for (let y = b.y0; y < b.y1; y += 240) {
      const ya = y;
      const yb = Math.min(b.y1, y + 240);
      over.add((ya + yb) / 2, (yb - ya) / 2 + 60, (d) => sideWall(d, x, ya, yb));
    }
  }
  for (const side of [-1, 1] as const) {
    const x = side < 0 ? b.x0 + AISLE : b.x1 - AISLE;
    for (let y = b.y0 + 120; y < b.y1 - 60; y += 190) {
      const c = pt(x, y);
      over.add(y, 50, (d) => aislePost(d, c));
    }
  }
  for (const [eave, cut] of [[b.x0 - 26, b.x0 + 34], [b.x1 + 26, b.x1 - 34]] as const) {
    for (let y = b.y0 - BARN_WALL / 2 - 10; y < b.y1 + BARN_WALL / 2; y += 240) {
      const ya = y;
      const yb = Math.min(b.y1 + BARN_WALL / 2, y + 240);
      over.add((ya + yb) / 2, (yb - ya) / 2 + 80, (d, r) => roofStrip(d, eave, cut, ya, yb, r));
    }
  }
  over.add(b.y0, 70, (d, r) => backWall(d, b.x0, b.x1, b.y0, b.backX, b.open, r));
  over.add(b.y1 + 20, 80, (d, r) => frontWall(d, b.x0, b.x1, b.y1, b.frontX, b.open, r));
}

/** Bales along the left aisle, the loft, ladder and cart along the right, hay and a cat in the nave. */
function inside(geo: Geo, b: Barn, rng: Rng, under: FeatureList, over: FeatureList): void {
  const left = b.x0 + 50;
  for (let y = b.y0 + 40; y < b.y1 - 120; ) {
    const rows = 4 + Math.floor(rng() * 4);
    const ya = y;
    const courses = 2 + Math.floor(rng() * 2);
    under.add(ya + rows * 10, rows * 10 + 60, (d, r) => baleStack(d, left, ya, 3, rows, courses, r));
    y += rows * 19 + 50 + rng() * 60;
  }
  const lx0 = b.x1 - AISLE - 14;
  const lx1 = b.x1 - 46;
  const ly1 = b.y0 + 330;
  over.add((b.y0 + ly1) / 2, (ly1 - b.y0) / 2 + 40, (d, r) => loft(d, lx0, lx1, b.y0 + BARN_WALL / 2 + 26, ly1, r));
  const lx = lx0 + 52;
  over.add(ly1 + 40, 90, (d) => loftLadder(d, pt(lx, ly1 + 96), pt(lx, ly1 - 8)));
  const cart = pt(b.x1 - AISLE / 2 - 4, ly1 + 250);
  under.add(cart.y + 40, 160, (d, r) => hayCart(d, cart, Math.PI / 2, r));
  for (let k = 0; k < 3; k++) {
    const c = pt(b.x1 - 50 - k * 30, b.y1 - 60 + (k % 2) * 18);
    under.add(c.y, 30, (d, r) => sack(d, c, r));
  }
  // The nave, either side of the boards.
  const nave = new Placer(geo, (x, y, r) => x - r < b.x0 + AISLE + 16 || x + r > b.x1 - AISLE - 16 || y - r < b.y0 + 40 || y + r > b.y1 - 20);
  const heap = nave.take(rng, { x0: b.x0 + AISLE, x1: b.x1 - AISLE, y0: b.y0 + 60, y1: b.y1 - 60 }, 52, 30, 60);
  if (heap) under.add(heap.y, 90, (d, r) => hayHeap(d, heap, 50, r));
  for (let i = 0; i < 3; i++) {
    const c = nave.take(rng, { x0: b.x0 + AISLE, x1: b.x1 - AISLE, y0: b.y0 + 60, y1: b.y1 - 60 }, 30, 26, 40);
    if (!c) continue;
    const kind = i;
    under.add(c.y, 50, (d, r) => {
      if (kind === 1) for (let k = 0; k < 3; k++) sack(d, pt(c.x + (k - 1) * 20, c.y + (k % 2) * 10), r);
      else for (let k = 0; k < 2; k++) barrel(d, pt(c.x + k * 26 - 13, c.y + k * 8), 13, r);
    });
  }
  let napped = false;
  for (let i = 0; i < 5; i++) {
    const c = nave.take(rng, { x0: b.x0 + AISLE, x1: b.x1 - AISLE, y0: b.y0 + 60, y1: b.y1 - 60 }, 22, 26, 40);
    if (!c) continue;
    const rot = (rng() - 0.5) * 1.2;
    const sleeps = !napped;
    napped = true;
    under.add(c.y, 40, (d, r) => {
      bale(d, c, 34, 18, rot, r);
      if (sleeps) cat(d, pt(c.x - 2, c.y - 2), r);
    });
  }
}

/** The rick, the log pile, the trough and churns, and hens about the yard. */
function outside(geo: Geo, region: MapRegion, b: Barn, yardTop: number, fades: boolean, rng: Rng, under: FeatureList): void {
  const place = new Placer(geo, (x, y, r) => (x + r > b.x0 - 40 && x - r < b.x1 + 40 && y + r > b.y0 - 30 && y - r < b.y1 + FACE + 20) || y - r < yardTop + 20 || y + r > region.gate.y - 30);
  place.reserve(region.sign, 175);
  const side = b.frontX < MAP.mid ? 1 : -1;
  const rc = pt(side > 0 ? 150 : MAP.width - 150, (b.y0 + b.y1) / 2 + (rng() - 0.5) * 200);
  place.reserve(rc, 110);
  under.add(rc.y, 190, (d, r) => rick(d, rc, 90, r));
  const lx = side > 0 ? b.x0 - 150 : b.x1 + 30;
  const ly = b.y1 - 40;
  place.reserve(pt(lx + 60, ly), 70);
  under.add(ly, 50, (d, r) => logPile(d, lx, ly, 8, r));
  // Trees on the grass beyond the yard, leaning in from the page's edge.
  for (let k = 0; k < 2; k++) {
    const c = pt(side > 0 ? MAP.width + 10 - rng() * 40 : -10 + rng() * 40, b.y0 + 160 + k * 380 + rng() * 80);
    place.reserve(c, 120);
    under.add(c.y, 200, (d, r) => treeCrown(d, c, 100 + r() * 20, r));
  }
  const tc = pt(side > 0 ? MAP.width - 210 : 210, b.y1 + 120);
  place.reserve(tc, 80);
  under.add(tc.y, 70, (d, r) => trough(d, tc, r));
  for (let k = 0; k < 3; k++) {
    const c = pt(b.frontX + side * (b.open * 2 + 40 + k * 26), b.y1 + FACE + 34 + (k % 2) * 16);
    if (place.claim(c, 13, 10)) under.add(c.y, 30, (d) => churn(d, c, 11));
  }
  const yard = { x0: 60, x1: MAP.width - 60, y0: fades ? b.y1 : yardTop + 20, y1: region.gate.y - 40 };
  for (let i = 0, made = 0; i < 60 && made < 12; i++) {
    const c = place.take(rng, i < 30 ? { ...yard, y0: b.y1 + FACE + 10 } : yard, 16, 20, 1);
    if (!c) continue;
    const a = rng() * Math.PI * 2;
    under.add(c.y, 30, (d, r) => hen(d, c, a, r));
    made++;
  }
}

/** Behind the barn, where nothing painted lies beyond: the yard pencilled, a cart shed and round bales laid out, then nothing. */
function pencilTop(geo: Geo, region: MapRegion, rng: Rng, out: FeatureList): void {
  const place = new Placer(geo);
  const y0 = region.top + 40;
  const y1 = region.top + BARN_FADE;
  const items = [pencilRoof, rounds('spiral'), rounds('spiral'), pencilBush, rounds('spokes'), pencilBush];
  for (let i = 0, k = 0; i < 40 && k < items.length; i++) {
    const s = k === 0 ? 70 : 24 + rng() * 14;
    const c = place.take(rng, { x0: 80, x1: MAP.width - 80, y0: y0 + s * 0.6, y1: y1 - s }, s, 40, 20, 1.1);
    if (!c) continue;
    const item = items[k++]!;
    const done = 0.5 + rng() * 0.5;
    out.add(c.y, s * 2 + 40, (d, r) => item(d, c, s, r, done));
  }
  for (const x of [60, MAP.width - 60]) {
    const lean = (rng() - 0.5) * 6;
    out.add((y0 + y1) / 2, 120, (d) => construction(d, pt(x, y1), pt(x + lean, y0), 20));
  }
}
