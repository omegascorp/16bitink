import { createRng } from '../../logic/rng';
import { MAP, type MapRegion } from '../../scenes/map/layout';
import { pt } from '../kit';
import { PAPER_FILL, STONE } from '../palette';
import type { Pt } from '../pen';
import { mix, rgba } from '../wash';
import { type Band, FeatureList, Placer } from './band';
import { Blobs, type Geo, hash, PATH_HALF, seedOf, type Span, Ticks } from './common';
import { shrub } from './flora';
import { glassFront, sideWall } from './glassWalls';
import { bench, coldFrame, GLASS, pot, potStack, seedTray, tubTree, vineRun, WALL, wateringCan, waterButt } from './greenhouseKit';

/**
 * Chapter 3's band, "The Greenhouse": a long Victorian glasshouse filling
 * the band, seen from above with its roof left off as on a plan. The groove
 * comes in at the front door (the chapter's gate) and runs up a tiled aisle
 * over the old brick floor, between staging benches of pots and seed trays
 * along both walls; the roof's glazing bars throw a lattice of shadow over
 * everything, a vine is trained under one side of the roof, and the groove
 * leaves by the far door into the orchard. Outside, a strip of gravel,
 * cold frames and stacked pots on the lawn.
 */
/** The side walls' centrelines. */
export const GLASS_X0 = 236;
export const GLASS_X1 = MAP.width - 236;
const BRICK_FLOOR = '#b39274';
const GRAVEL = '#cbbd9f';
const TILE_RED = '#b0583e';
const TILE_BUFF = '#dcc79d';
const TILE_DARK = '#3d3742';
const LATTICE = '#45566a';
/** Brick courses and the glazing bars' spacing. */
const COURSE = 12;
const BRICK_LEN = 26;
const BAR = 58;
const RAFTER = 174;

interface House {
  readonly x0: number;
  readonly x1: number;
  /** The far wall (smaller y) and the front wall at the gate. */
  readonly y0: number;
  readonly y1: number;
}

export function greenhousePlan(geo: Geo, region: MapRegion): Band {
  const salt = 10000 + region.index * 101;
  const house: House = { x0: GLASS_X0, x1: GLASS_X1, y0: region.top + 22, y1: region.gate.y };
  const inner = { x0: house.x0 + WALL / 2, x1: house.x1 - WALL / 2, y0: house.y0 + WALL / 2, y1: house.y1 - WALL / 2 };
  const inside = (x: number, y: number): boolean => x > inner.x0 && x < inner.x1 && y > inner.y0 && y < inner.y1;
  const [under, over] = houseThings(geo, region, house, salt);
  return {
    region,
    ground: (ctx, span) => paintGround(ctx, span, house),
    bare: (x, y) => x > house.x0 - 50 && x < house.x1 + 50 && y > house.y0 - 40 && y < house.y1 + 30 && (inside(x, y) || x < house.x0 + 10 || x > house.x1 - 10 || y < house.y0 + 10),
    unpaved: [[house.y0 - 4, house.y1 + 4]],
    floor: (ctx, span) => {
      paintAisle(ctx, geo, span, house);
      paintRoofLight(ctx, geo, span, inner);
    },
    under,
    over,
  };
}

/** A gravel apron round the house, and the old brick floor inside it. */
function paintGround(ctx: CanvasRenderingContext2D, span: Span, h: House): void {
  if (span.y1 < h.y0 - 40 || span.y0 > h.y1 + 40) return;
  const y0 = Math.max(span.y0 - 4, h.y0 - 34);
  const y1 = Math.min(span.y1 + 4, h.y1 + 22);
  ctx.save();
  ctx.fillStyle = rgba(PAPER_FILL, 0.6);
  ctx.fillRect(h.x0 - 44, y0, h.x1 - h.x0 + 88, y1 - y0);
  ctx.fillStyle = rgba(GRAVEL, 0.45);
  ctx.fillRect(h.x0 - 44, y0, h.x1 - h.x0 + 88, y1 - y0);
  const grit = new Blobs();
  for (let y = Math.floor(y0 / 8) * 8; y < y1; y += 8) {
    const row = Math.floor(y / 8);
    for (let k = 0; k < 44; k++) {
      const x = h.x0 - 44 + hash(row, k, 61) * (h.x1 - h.x0 + 88);
      grit.add(x, y + hash(row, k, 62) * 8, 0.6 + hash(row, k, 63) * 1.1);
    }
  }
  grit.fill(ctx, mix(GRAVEL, '#26316a', 0.45), 0.35);
  // The brick floor: stretcher courses running across, a few bricks darker or paler.
  const fy0 = Math.max(y0, h.y0);
  const fy1 = Math.min(y1, h.y1);
  if (fy1 > fy0) {
    ctx.beginPath();
    ctx.rect(h.x0, fy0, h.x1 - h.x0, fy1 - fy0);
    ctx.clip();
    ctx.fillStyle = rgba(PAPER_FILL, 0.9);
    ctx.fillRect(h.x0, fy0, h.x1 - h.x0, fy1 - fy0);
    ctx.fillStyle = rgba(BRICK_FLOOR, 0.3);
    ctx.fillRect(h.x0, fy0, h.x1 - h.x0, fy1 - fy0);
    // Worn and damp patches laid as washes, so the floor reads as painted rather than ruled.
    const worn = new Blobs();
    const damp = new Blobs();
    for (let cy = Math.floor((fy0 - 120) / 120); cy * 120 < fy1 + 120; cy++) {
      for (let cx = 0; cx * 120 < h.x1 + 120; cx++) {
        const x = (cx + hash(cx, cy, 65)) * 120;
        const y = (cy + hash(cx, cy, 66)) * 120;
        const blob = hash(cx, cy, 67) < 0.55 ? worn : damp;
        blob.blot(x, y, 50 + hash(cx, cy, 68) * 70, 24 + hash(cx, cy, 69) * 30, (hash(cx, cy, 70) - 0.5) * 0.6, cx * 389 + cy * 7);
      }
    }
    worn.fill(ctx, PAPER_FILL, 0.2);
    damp.fill(ctx, mix(BRICK_FLOOR, '#5a4a3a', 0.4), 0.07);
    const dark = new Path2D();
    const pale = new Path2D();
    const joints = new Ticks();
    for (let r = Math.floor(fy0 / COURSE); r * COURSE < fy1; r++) {
      const y = r * COURSE;
      joints.add(h.x0, y, h.x1, y);
      const off = (r & 1) * (BRICK_LEN / 2);
      for (let x = h.x0 - BRICK_LEN + off; x < h.x1; x += BRICK_LEN) {
        joints.add(x, y, x, y + COURSE);
        const v = hash(Math.floor(x / BRICK_LEN), r, 64);
        if (v < 0.22) dark.rect(x + 1, y + 1, BRICK_LEN - 2, COURSE - 2);
        else if (v > 0.84) pale.rect(x + 1, y + 1, BRICK_LEN - 2, COURSE - 2);
      }
    }
    ctx.fillStyle = rgba(mix(BRICK_FLOOR, '#7a3f2a', 0.5), 0.12);
    ctx.fill(dark);
    ctx.fillStyle = rgba(PAPER_FILL, 0.22);
    ctx.fill(pale);
    joints.stroke(ctx, mix(BRICK_FLOOR, '#26316a', 0.5), 0.55, 0.2);
  }
  ctx.restore();
}

/**
 * The tiled aisle the groove runs up: Victorian quarry tiles in red and
 * buff laid along the groove, a dark border tile down each edge.
 */
function paintAisle(ctx: CanvasRenderingContext2D, geo: Geo, span: Span, h: House): void {
  if (span.y1 < h.y0 - 20 || span.y0 > h.y1 + 20) return;
  const { pts, nrm } = geo;
  const lo = Math.max(geo.index(h.y1), geo.range(span.y0, span.y1, 40)[0]);
  const hi = Math.min(geo.index(h.y0), geo.range(span.y0, span.y1, 40)[1]);
  if (hi - lo < 2) return;
  // Tile rows every ~16 px along the path, counted from the house's front so every chunk agrees.
  const start = geo.index(h.y1);
  const rows: number[] = [];
  let acc = 0;
  for (let i = start + 1; i <= geo.index(h.y0); i++) {
    acc += Math.hypot(pts[i]!.x - pts[i - 1]!.x, pts[i]!.y - pts[i - 1]!.y);
    if (acc >= 16) {
      rows.push(i);
      acc = 0;
    }
  }
  const at = (i: number, off: number): Pt => pt(pts[i]!.x + nrm[i]!.x * off, pts[i]!.y + nrm[i]!.y * off);
  const base = new Path2D();
  const red = new Path2D();
  const buff = new Path2D();
  const dark = new Path2D();
  const lines = new Path2D();
  const quad = (p: Path2D, a: number, b: number, o0: number, o1: number): void => {
    const q = [at(a, o0), at(b, o0), at(b, o1), at(a, o1)];
    p.moveTo(q[0]!.x, q[0]!.y);
    for (const v of q.slice(1)) p.lineTo(v.x, v.y);
    p.closePath();
  };
  let prev = start;
  rows.forEach((i, k) => {
    const a = prev;
    prev = i;
    if (i < lo || a > hi) return;
    for (const side of [1, -1]) {
      quad(base, a, i, side * 15, side * (PATH_HALF - 2));
      quad(k % 2 === 0 ? red : buff, a, i, side * 17, side * 32);
      quad(k % 2 === 0 ? buff : red, a, i, side * 32, side * 47);
      quad(dark, a, i, side * 47, side * (PATH_HALF - 2));
      for (const o of [17, 32, 47]) quad(lines, a, i, side * o, side * o);
      lines.moveTo(at(a, side * 17).x, at(a, side * 17).y);
      lines.lineTo(at(a, side * (PATH_HALF - 2)).x, at(a, side * (PATH_HALF - 2)).y);
    }
  });
  ctx.save();
  ctx.fillStyle = rgba(PAPER_FILL, 1);
  ctx.fill(base);
  ctx.fillStyle = rgba(STONE, 0.4);
  ctx.fill(base);
  ctx.fillStyle = rgba(TILE_RED, 0.62);
  ctx.fill(red);
  ctx.fillStyle = rgba(TILE_BUFF, 0.7);
  ctx.fill(buff);
  ctx.fillStyle = rgba(TILE_DARK, 0.62);
  ctx.fill(dark);
  ctx.strokeStyle = rgba('#26316a', 0.35);
  ctx.lineWidth = 0.7;
  ctx.stroke(lines);
  ctx.restore();
  // The aisle's outer edges, inked in fixed runs.
  for (const side of [1, -1]) {
    const edge: Pt[] = [];
    for (let i = start; i <= geo.index(h.y0); i += 3) edge.push(at(i, side * (PATH_HALF - 2)));
    for (let k = 0; k * 16 < edge.length; k++) {
      const part = edge.slice(k * 16, k * 16 + 17);
      if (part.length < 2 || part.every((p) => p.y < span.y0 - 30) || part.every((p) => p.y > span.y1 + 30)) continue;
      ctx.save();
      ctx.strokeStyle = rgba('#26316a', 0.6);
      ctx.lineWidth = 1;
      ctx.beginPath();
      part.forEach((p, n) => (n === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
      ctx.stroke();
      ctx.restore();
    }
  }
}

/**
 * The light through the roof: a faint cool tint of glass, the glazing
 * bars' and rafters' shadows laid over the floor as a lattice (fainter in
 * the calm by the groove), and the odd pane of brighter sun.
 */
function paintRoofLight(ctx: CanvasRenderingContext2D, geo: Geo, span: Span, b: { x0: number; x1: number; y0: number; y1: number }): void {
  const y0 = Math.max(span.y0 - 4, b.y0);
  const y1 = Math.min(span.y1 + 4, b.y1);
  if (y1 <= y0) return;
  ctx.save();
  ctx.beginPath();
  ctx.rect(b.x0, y0, b.x1 - b.x0, y1 - y0);
  ctx.clip();
  ctx.fillStyle = rgba(GLASS, 0.12);
  ctx.fillRect(b.x0, y0, b.x1 - b.x0, y1 - y0);
  const levels = [new Ticks(), new Ticks(), new Ticks()];
  const sun = new Path2D();
  const glare = new Path2D();
  const bucket = (x: number, y: number): Ticks => levels[Math.min(2, Math.floor(geo.busy(x, y) * 3))]!;
  const SEG = 36;
  const r0 = Math.floor((y0 - b.y1) / RAFTER) - 1;
  // Bars run along the house; their shadows are laid a little to the right of where they stand, as the sun is to the upper left.
  for (let x = b.x0 + BAR; x < b.x1 - 6; x += BAR) {
    for (let y = Math.floor(y0 / SEG) * SEG; y < y1; y += SEG) bucket(x, y + SEG / 2).add(x + 6, y, x + 6, y + SEG);
  }
  for (let r = r0; b.y1 + r * RAFTER <= y1 + RAFTER; r++) {
    const y = b.y1 + r * RAFTER;
    if (y < y0 - 4 || y > y1 + 4) continue;
    for (let x = b.x0; x < b.x1; x += SEG) bucket(x + SEG / 2, y).add(x, y + 8, x + SEG, y + 8);
  }
  // Panes of brighter sun and the odd glare off the glass, out of the calm.
  for (let r = r0; b.y1 + r * RAFTER <= y1 + RAFTER; r++) {
    for (let k = 0; b.x0 + k * BAR < b.x1; k++) {
      const px = b.x0 + k * BAR + 6;
      const py = b.y1 + r * RAFTER + 8;
      const v = hash(k, r, 71);
      if (geo.busy(px + BAR / 2, py + RAFTER / 2) < 0.5) continue;
      if (v < 0.12) sun.rect(px, py, BAR, RAFTER);
      else if (v > 0.9) {
        glare.moveTo(px + 8, py + RAFTER - 10);
        glare.lineTo(px + 22, py + 12);
        glare.lineTo(px + 34, py + 12);
        glare.lineTo(px + 20, py + RAFTER - 10);
        glare.closePath();
      }
    }
  }
  ctx.fillStyle = rgba('#f6e7b8', 0.14);
  ctx.fill(sun);
  ctx.fillStyle = rgba(PAPER_FILL, 0.3);
  ctx.fill(glare);
  levels.forEach((t, i) => t.stroke(ctx, LATTICE, 3.4, [0.04, 0.09, 0.13][i]!));
  levels.forEach((t, i) => t.stroke(ctx, LATTICE, 0.7, [0.04, 0.09, 0.14][i]!));
  ctx.restore();
}

/** The house's furniture (`under`) and its walls, far door and vine (`over`). */
function houseThings(geo: Geo, region: MapRegion, h: House, salt: number): [FeatureList['list'], FeatureList['list']] {
  const rng = createRng(seedOf(salt, 1));
  const under = new FeatureList(salt, 1);
  const over = new FeatureList(salt, 2);
  const benches: { x0: number; x1: number; y0: number; y1: number }[] = [];
  const BW = 116;
  for (const side of [-1, 1] as const) {
    const x0 = side < 0 ? h.x0 + WALL / 2 + 8 : h.x1 - WALL / 2 - 8 - BW;
    let y = h.y0 + 60 + rng() * 30;
    while (y < h.y1 - 140) {
      const len = Math.min(240 + rng() * 150, h.y1 - 110 - y);
      if (len < 120) break;
      benches.push({ x0, x1: x0 + BW, y0: y, y1: y + len });
      y += len + 46 + rng() * 40;
    }
  }
  // Island stagings out in the floor where the groove swings away.
  const sign = region.sign;
  for (let i = 0, made = 0; i < 80 && made < 3; i++) {
    const len = 200 + rng() * 140;
    const w = 96;
    const cx = h.x0 + 200 + rng() * (h.x1 - h.x0 - 400);
    const y0 = h.y0 + 110 + rng() * (h.y1 - h.y0 - 260 - len);
    const box = { x0: cx - w / 2, x1: cx + w / 2, y0, y1: y0 + len };
    const clear = [box.x0, box.x1].every((x) => {
      for (let y = box.y0; y <= box.y1; y += 24) if (geo.dist(x, y, 200) < PATH_HALF + 52) return false;
      return true;
    });
    const apart = benches.every((b) => box.x1 + 60 < b.x0 || box.x0 - 60 > b.x1 || box.y1 + 60 < b.y0 || box.y0 - 60 > b.y1);
    const offSign = Math.abs(cx - sign.x) > 230 || box.y1 < sign.y - 140;
    if (!clear || !apart || !offSign) continue;
    benches.push(box);
    made++;
  }
  for (const b of benches) under.add((b.y0 + b.y1) / 2, (b.y1 - b.y0) / 2 + 40, (d, r) => bench(d, b.x0, b.y0, b.x1, b.y1, r));
  const inBench = (x: number, y: number, r: number): boolean => benches.some((b) => x > b.x0 - r - 10 && x < b.x1 + r + 10 && y > b.y0 - r - 10 && y < b.y1 + r + 10);
  const indoors = (x: number, y: number, r: number): boolean => x - r > h.x0 + 20 && x + r < h.x1 - 20 && y - r > h.y0 + 20 && y + r < h.y1 - 20;
  const place = new Placer(geo, (x, y, r) => inBench(x, y, r) || !indoors(x, y, r));
  place.reserve(region.sign, 170);
  // The water butt in a front corner by the wall; things on the floor where the groove swings away.
  const buttSide = hash(salt, 3) < 0.5 ? -1 : 1;
  const butt = pt(buttSide < 0 ? h.x0 + 54 : h.x1 - 54, h.y1 - 92);
  under.add(butt.y, 50, (d) => waterButt(d, butt, 30));
  under.add(butt.y - 8, 40, (d) => wateringCan(d, pt(butt.x - buttSide * 64, butt.y + 10), buttSide < 0 ? -0.5 : 3.6));
  place.reserve(butt, 50);
  const box = { x0: h.x0 + 60, x1: h.x1 - 60, y0: h.y0 + 60, y1: h.y1 - 60 };
  for (let i = 0; i < 4; i++) {
    const c = place.take(rng, box, 36, 70, 40);
    if (c) under.add(c.y, 60, (d, r) => tubTree(d, c, 32, r));
  }
  for (let i = 0; i < 7; i++) {
    const c = place.take(rng, box, 30, 50, 30);
    if (!c) continue;
    const kind = rng();
    if (kind < 0.35) under.add(c.y, 50, (d, r) => potStack(d, c, 13 + r() * 4));
    else if (kind < 0.65) under.add(c.y, 50, (d, r) => seedTray(d, c, 70, 44, r));
    else
      under.add(c.y, 50, (d, r) => {
        for (let k = 0; k < 3; k++) pot(d, pt(c.x + (k - 1) * 24 + (r() - 0.5) * 6, c.y + (r() - 0.5) * 18), 11 + r() * 5, r, r() < 0.5 ? 'bloom' : 'fern');
      });
  }
  // Outside on the lawn: cold frames, stacked pots, a shrub or two.
  const outside = new Placer(geo, (x, _y, r) => x + r > h.x0 - 50 && x - r < h.x1 + 50);
  outside.reserve(region.sign, 170);
  for (let i = 0; i < 6; i++) {
    const left = i % 2 === 0;
    const c = outside.take(rng, { x0: left ? 70 : h.x1 + 110, x1: left ? h.x0 - 110 : MAP.width - 70, y0: h.y0 + 80, y1: h.y1 - 80 }, 64, 40, 20);
    if (!c) continue;
    if (i < 3) under.add(c.y, 80, (d, r) => coldFrame(d, c, 112, 66, r));
    else under.add(c.y, 50, (d, r) => (r() < 0.5 ? potStack(d, c, 14) : shrub(d, c, 34, r, r() < 0.5 ? '#d0607a' : null)));
  }
  // The walls, in stretches so each chunk draws only what it reaches.
  for (const [x, out] of [[h.x0, -1], [h.x1, 1]] as const) {
    for (let y = h.y0 - WALL / 2; y < h.y1 + WALL / 2; y += 240) {
      const ya = y;
      const yb = Math.min(h.y1 + WALL / 2, y + 240);
      over.add((ya + yb) / 2, (yb - ya) / 2 + 30, (d, r) => sideWall(d, x, ya, yb, out, r));
    }
  }
  const farDoor = geo.grooveX(h.y0);
  over.add(h.y0, 110, (d, r) => glassFront(d, h.y0 + 6, h.x0 - WALL / 2, h.x1 + WALL / 2, farDoor, r));
  // The vine, trained along under one side of the roof from a trunk by the front wall.
  const vs = -buttSide as 1 | -1;
  const vx = vs < 0 ? h.x0 + 70 : h.x1 - 70;
  const spine: Pt[] = [pt(vs < 0 ? h.x0 + 10 : h.x1 - 10, h.y1 - 110), pt(vx, h.y1 - 150)];
  for (let y = h.y1 - 190; y > h.y0 + 70; y -= 40) spine.push(pt(vx + Math.sin(y / 90) * 10, y));
  for (let k = 0; k + 1 < spine.length; k += 6) {
    const part = spine.slice(k, k + 7);
    const ys = part.map((p) => p.y);
    over.add((Math.min(...ys) + Math.max(...ys)) / 2, (Math.max(...ys) - Math.min(...ys)) / 2 + 90, (d, r) => vineRun(d, part, r));
  }
  return [under.list, over.list];
}
