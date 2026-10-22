import { createRng, type Rng } from '../logic/rng';
import { beanRow, cabbage, carrotTop, leek, lettuce, marigold, seedLabel, seedling } from './allotmentCrops';
import { gardenFork, harvestTrug, hoseCoil, scarecrow, upturnedBarrow, waterButt } from './allotmentThings';
import { blob, body, castShadow, type Edgeness, edgenessOf, edgeWash, groundWash, outline, polar, SHADOW } from './groundKit';
import { pot, wateringCan } from './greenhouseThings';
import { type GroundKeep, type Room, roomOf, type Taken } from './keep';
import { type Draw, pt, TAU } from './kit';
import { PAPER_FILL } from './palette';
import type { Pt } from './pen';
import { mix, rgba } from './wash';

/**
 * Chapter 6's page, "The Allotment": a well-kept community plot seen from
 * above. Straw and bark-chip paths, pale where play happens; strips of dark
 * tilled soil in timber-edged beds wherever they keep clear of the grooves,
 * planted in rows (cabbages, leeks, lettuces, carrots, runner beans on
 * canes, marigolds at the ends, fresh sowings with their labels), the
 * calmer, newly sown beds nearer the middle; a water butt, an upturned
 * wheelbarrow, a coil of hose, stacked pots, a fork left in the soil and a
 * scarecrow at the edges. Board coordinates.
 */
const STRAW = '#dcc58e';
const STRAW_DEEP = '#b8955c';
const CHIP = ['#8f6a48', '#a47c55', '#7a5a3e'] as const;
const SOIL = '#6a4a35';
const SOIL_DARK = '#3e2b20';
const SOIL_LIGHT = '#a78563';
const EDGING = '#b59b72';
/** Bed depth (across the rows) and path width between bed rows, board units. */
const BED_DEPTH = [74, 96] as const;
const PATH_W = [40, 52] as const;
/** Shortest bed worth digging; longest before a cross path; width of the cross paths. */
const BED_MIN = 84;
const BED_MAX = 360;
const CROSS_W = 34;
/** The edging boards' width, and how far a bed's soil sits in from its outer edge. */
const BOARD_W = 6;

type Crop = 'cabbage' | 'leek' | 'lettuce' | 'carrot' | 'beans' | 'sown';

interface Bed {
  readonly x0: number;
  readonly y0: number;
  readonly x1: number;
  readonly y1: number;
  readonly crop: Crop;
  /** How far towards the busy edges the bed lies, 0..1 (its calmest point). */
  readonly e: number;
}

/** Short strokes laid in one batch: `marks` gives each one's start, angle and length, or null to skip it. */
function strokes(ctx: CanvasRenderingContext2D, colour: string, width: number, n: number, marks: () => readonly [Pt, number, number] | null): void {
  ctx.strokeStyle = colour;
  ctx.lineWidth = width;
  ctx.beginPath();
  for (let k = 0; k < n; k++) {
    const m = marks();
    if (!m) continue;
    const [p, a, l] = m;
    ctx.moveTo(p.x, p.y);
    ctx.lineTo(p.x + Math.cos(a) * l, p.y + Math.sin(a) * l);
  }
  ctx.stroke();
}

/**
 * The paths: a straw-coloured wash, deeper at the edges, then loose straw
 * raked in drifts (each strand with a hint of shadow), and bark shreds
 * gathered in patches out at the edges; quiet in the middle.
 */
function paths(d: Draw, w: number, h: number, edge: Edgeness, rng: Rng): void {
  const { ctx } = d.pen;
  groundWash(d, w, h, STRAW, 0.36);
  edgeWash(d, w, h, STRAW_DEEP, 0.3);
  for (let k = 0; k < 36; k++) {
    const p = pt(rng() * w, rng() * h);
    d.pen.fill(blob(p, 30 + rng() * 60, 18 + rng() * 30, rng, 0.25, 18, rng() * TAU), rng() < 0.6 ? STRAW_DEEP : PAPER_FILL, 0.04 + 0.07 * edge(p.x, p.y));
  }
  // Straw drifts the way the rake left them: a slow swirl of directions over the board.
  const lie = (x: number, y: number): number => 0.6 * Math.sin(x / 110 + 1.3) + 0.5 * Math.cos(y / 85) + (rng() - 0.5) * 0.9;
  const strand = (dense: number, lmin: number, lvar: number) => (): readonly [Pt, number, number] | null => {
    const p = pt(rng() * w, rng() * h);
    const e = edge(p.x, p.y);
    return rng() > dense + (1 - dense) * e ? null : [p, lie(p.x, p.y), lmin + rng() * lvar * (0.6 + 0.4 * e)];
  };
  ctx.save();
  ctx.lineCap = 'round';
  ctx.translate(0.7, 1.1);
  strokes(ctx, rgba('#7a5f35', 0.22), 1.1, 2600, strand(0.3, 5, 8));
  ctx.translate(-0.7, -1.1);
  strokes(ctx, rgba('#c9a24e', 0.6), 0.9, 2600, strand(0.3, 5, 8));
  strokes(ctx, rgba('#efe0b0', 0.75), 0.8, 2200, strand(0.25, 4, 7));
  strokes(ctx, rgba('#a8874c', 0.4), 0.7, 1400, strand(0.2, 3, 6));
  // Bark shreds in patches near the edges, each a little sliver with a darker side.
  const patches = Array.from({ length: 26 }, () => pt(rng() * w, rng() * h)).filter((p) => edge(p.x, p.y) > 0.45);
  for (const colour of CHIP) {
    ctx.fillStyle = rgba(colour, 0.75);
    ctx.strokeStyle = rgba(d.ink, 0.22);
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    for (const at of patches) {
      for (let k = 0; k < 18; k++) {
        const c = polar(at, rng() * TAU, Math.sqrt(rng()) * 46);
        const a = rng() * TAU;
        const l = 3 + rng() * 4.5;
        const wd = 1 + rng() * 1.4;
        const q = [polar(c, a, l), polar(c, a + Math.PI / 2, wd), polar(c, a + Math.PI, l * 0.8), polar(c, a - Math.PI / 2, wd)];
        q.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
        ctx.closePath();
      }
    }
    ctx.fill();
    ctx.stroke();
  }
  ctx.restore();
}

/** Grass grown up along the outside of a bed's boards, thicker out at the edges of the board. */
function grassAlong(d: Draw, b: Bed, rng: Rng): void {
  if (b.e < 0.25) return;
  const { ctx } = d.pen;
  const along = (): readonly [Pt, number, number] | null => {
    const side = Math.floor(rng() * 4);
    const t = rng();
    const p = side < 2 ? pt(b.x0 + t * (b.x1 - b.x0), side === 0 ? b.y0 - 1 : b.y1 + 1) : pt(side === 2 ? b.x0 - 1 : b.x1 + 1, b.y0 + t * (b.y1 - b.y0));
    const out = side === 0 ? -Math.PI / 2 : side === 1 ? Math.PI / 2 : side === 2 ? Math.PI : 0;
    return rng() > b.e ? null : [p, out + (rng() - 0.5) * 1.6, 3 + rng() * 6];
  };
  const n = Math.round((b.x1 - b.x0 + b.y1 - b.y0) * 0.5);
  ctx.save();
  ctx.lineCap = 'round';
  strokes(ctx, rgba('#5f8a3f', 0.6), 0.8, n, along);
  strokes(ctx, rgba('#9cbf5c', 0.65), 0.7, n, along);
  ctx.restore();
}

/** Whether the column x, from y0 to y1, keeps clear of the grooves, pads and things already placed. */
function clearColumn(room: Room, taken: readonly Taken[], x: number, y0: number, y1: number): boolean {
  for (let y = y0; y <= y1 + 0.1; y += Math.min(12, (y1 - y0) / 2)) if (room(x, y) < 0) return false;
  return taken.every((t) => Math.abs(t.x - x) > t.r || t.y + t.r < y0 || t.y - t.r > y1);
}

/** Picks a bed's crop: tall and busy ones out at the edges, sowings and low crops nearer the middle. */
function cropFor(e: number, len: number, rng: Rng): Crop {
  if (e < 0.2) return (['sown', 'lettuce', 'carrot', 'lettuce'] as const)[Math.floor(rng() * 4)]!;
  const r = rng();
  if (e > 0.45 && len >= 150 && r < 0.22) return 'beans';
  return (['cabbage', 'leek', 'lettuce', 'carrot', 'cabbage', 'lettuce', 'sown'] as const)[Math.floor(rng() * 7)]!;
}

/** Whether a column from y0 to y1 at x keeps a path's width from every bed already laid. */
function offBeds(beds: readonly Bed[], x: number, y0: number, y1: number): boolean {
  return beds.every((b) => x < b.x0 - CROSS_W || x > b.x1 + CROSS_W || y1 < b.y0 - PATH_W[0] || y0 > b.y1 + PATH_W[0]);
}

/** One pass of strips across the board from `top`, adding beds wherever they fit among the grooves, pads, props and beds so far. */
function stripPass(beds: Bed[], top: number, w: number, h: number, clear: (x: number, y0: number, y1: number) => boolean, edge: Edgeness, rng: Rng): void {
  const STEP = 10;
  for (let y0 = top; y0 < h + 20; ) {
    const depth = BED_DEPTH[0] + rng() * (BED_DEPTH[1] - BED_DEPTH[0]);
    const y1 = y0 + depth;
    let start = Number.NaN;
    for (let x = -40; x <= w + 40 + STEP; x += STEP) {
      const ok = x <= w + 40 && clear(x, y0, y1) && offBeds(beds, x, y0, y1);
      if (ok && Number.isNaN(start)) start = x;
      if (ok || Number.isNaN(start)) continue;
      const end = x - STEP;
      for (let a = start + 4; end - 4 - a >= BED_MIN; ) {
        const left = end - 4 - a;
        const b = left <= BED_MAX ? end - 4 : a + Math.min(BED_MAX, Math.max(BED_MIN, left / Math.ceil(left / BED_MAX)) + rng() * 30);
        const e = Math.min(edge(a, (y0 + y1) / 2), edge(b, (y0 + y1) / 2), edge((a + b) / 2, (y0 + y1) / 2));
        beds.push({ x0: a, y0, x1: b, y1, crop: cropFor(e, b - a, rng), e });
        a = b + CROSS_W;
      }
      start = Number.NaN;
    }
    y0 = y1 + PATH_W[0] + rng() * (PATH_W[1] - PATH_W[0]);
  }
}

/**
 * Lays the beds out in strips across the board, cut wherever a groove, pad
 * or prop needs the room; later passes, shifted down by part of a strip,
 * fill the gaps the first left between grooves.
 */
function layoutBeds(w: number, h: number, room: Room, taken: readonly Taken[], edge: Edgeness, rng: Rng): Bed[] {
  const beds: Bed[] = [];
  const clear = (x: number, y0: number, y1: number): boolean => clearColumn(room, taken, x, y0, y1);
  const top = -30 + rng() * 20;
  for (const shift of [0, 0.5, 0.25, 0.75]) stripPass(beds, top + shift * 130 - (shift > 0 ? 130 : 0), w, h, clear, edge, rng);
  return beds;
}

const box = (x0: number, y0: number, x1: number, y1: number): Pt[] => [pt(x0, y0), pt(x1, y0), pt(x1, y1), pt(x0, y1)];

/** A bed's ground: the edging boards' shadow, the boards, then the tilled soil, raked along the rows and crumbly. */
function bedGround(d: Draw, b: Bed, rng: Rng): void {
  const { pen } = d;
  const outer = box(b.x0, b.y0, b.x1, b.y1);
  const soil = box(b.x0 + BOARD_W, b.y0 + BOARD_W, b.x1 - BOARD_W, b.y1 - BOARD_W);
  castShadow(d, outer, 5, 0.14);
  body(d, outer, mix(EDGING, '#9a9078', rng() * 0.4), 0.72);
  pen.fill(soil, PAPER_FILL, 1);
  pen.fill(soil, b.crop === 'sown' ? mix(SOIL, SOIL_LIGHT, 0.25) : SOIL, 0.42 + 0.33 * b.e);
  const area = (b.x1 - b.x0) * (b.y1 - b.y0);
  pen.clipped(soil, () => {
    for (let k = 0; k < area / 3000; k++) pen.fill(blob(pt(b.x0 + rng() * (b.x1 - b.x0), b.y0 + rng() * (b.y1 - b.y0)), 14 + rng() * 22, 8 + rng() * 10, rng, 0.3, 12), rng() < 0.5 ? SOIL_DARK : SOIL_LIGHT, 0.1);
    pen.stipple(soil, Math.round(area / 30), () => 0.7, 0.75, mix(SOIL_LIGHT, PAPER_FILL, 0.3));
    pen.stipple(soil, Math.round(area / 45), () => 0.7, 0.7, SOIL_DARK);
    // Rake marks along the bed.
    const { ctx } = pen;
    ctx.save();
    ctx.strokeStyle = rgba(SOIL_DARK, 0.25 + 0.2 * b.e);
    ctx.lineWidth = 0.6;
    ctx.beginPath();
    for (let y = b.y0 + BOARD_W + 4; y < b.y1 - BOARD_W - 2; y += 5 + rng() * 3) {
      for (let x = b.x0 + BOARD_W + rng() * 20; x < b.x1 - BOARD_W; x += 30 + rng() * 40) {
        ctx.moveTo(x, y + (rng() - 0.5));
        ctx.lineTo(Math.min(b.x1 - BOARD_W, x + 18 + rng() * 30), y + (rng() - 0.5));
      }
    }
    ctx.stroke();
    ctx.restore();
  });
  // The boards shade the soil along their sunny side.
  pen.crescent(soil, pt(SHADOW.x * 6, SHADOW.y * 6), () => pen.fill(soil, SOIL_DARK, 0.35));
  pen.clipped(outer, () => {
    for (let k = 0; k < (b.x1 - b.x0) / 25; k++) {
      const x = b.x0 + rng() * (b.x1 - b.x0);
      for (const y of [b.y0 + BOARD_W / 2, b.y1 - BOARD_W / 2]) pen.hair([pt(x, y + (rng() - 0.5) * 2), pt(x + 15 + rng() * 25, y + (rng() - 0.5) * 2)], 0.4, d.ink, 0.35);
    }
  });
  pen.crescent(outer, pt(-SHADOW.x * 2.5, -SHADOW.y * 2.5), () => pen.fill(outer, '#5a4028', 0.35));
  pen.hair(outline(soil, 8), 0.6, d.ink, 0.6);
  // Board joints and the pegs at the corners.
  for (let x = b.x0 + 120 + rng() * 60; x < b.x1 - 40; x += 160 + rng() * 80) {
    for (const y of [b.y0, b.y1 - BOARD_W]) pen.hair([pt(x, y), pt(x, y + BOARD_W)], 0.6, d.ink, 0.7);
  }
  for (const [x, y] of [[b.x0, b.y0], [b.x1 - BOARD_W, b.y0], [b.x0, b.y1 - BOARD_W], [b.x1 - BOARD_W, b.y1 - BOARD_W]] as const) {
    const peg = box(x - 1, y - 1, x + BOARD_W + 1, y + BOARD_W + 1);
    body(d, peg, '#8a6a46', 0.75);
    pen.hair(outline(peg, 3), 0.6, d.ink, 0.85);
  }
  pen.stroke(outline(outer, 8), 1.1, d.ink, 0.85);
}

/** Rows along a bed: the centre line of each, given the spacing across. */
function rowsOf(b: Bed, across: number): number[] {
  const inner = b.y1 - b.y0 - BOARD_W * 2;
  const n = Math.max(1, Math.floor((inner - 6) / across));
  return Array.from({ length: n }, (_, i) => b.y0 + BOARD_W + (inner * (i + 0.5)) / n);
}

/** Plants a bed with its crop in rows, leaving a gap here and there, labels and marigolds at the row ends. */
function plantBed(d: Draw, b: Bed, rng: Rng, skip: (p: Pt) => boolean): void {
  const lo = b.x0 + BOARD_W + 4;
  const hi = b.x1 - BOARD_W - 4;
  if (b.crop === 'beans') {
    const y = (b.y0 + b.y1) / 2;
    marigold(d, pt(lo + 10, y), 9, rng);
    beanRow(d, pt(lo + 26, y), pt(hi - 26, y), Math.min(22, (b.y1 - b.y0) / 2 - 12), rng);
    marigold(d, pt(hi - 10, y), 9, rng);
    return;
  }
  const spec: Record<Exclude<Crop, 'beans'>, readonly [number, number]> = {
    cabbage: [34, 33],
    leek: [24, 17],
    lettuce: [26, 27],
    carrot: [21, 18],
    sown: [17, 12],
  };
  const [across, along] = spec[b.crop];
  const ends = b.crop !== 'sown' && b.e > 0.25 && rng() < 0.5;
  rowsOf(b, across).forEach((y, i) => {
    const stagger = i % 2 ? along / 2 : 0;
    const from = lo + (ends ? 18 : 6) + stagger;
    const to = hi - (ends ? 18 : 6);
    if (b.crop === 'sown') d.pen.hair([pt(lo, y + 0.5), pt(hi, y + 0.5)], 0.7, SOIL_DARK, 0.45);
    if (rng() < 0.55) seedLabel(d, pt(from - 8, y - 6), -0.4 + (rng() - 0.5) * 0.5);
    for (let x = from + 8; x < to; x += along * (0.9 + rng() * 0.2)) {
      const p = pt(x + (rng() - 0.5) * 2, y + (rng() - 0.5) * 3);
      if (skip(p) || rng() < 0.06) continue;
      if (b.crop === 'cabbage') cabbage(d, p, 12.5 + rng() * 3, rng);
      else if (b.crop === 'leek') leek(d, p, 15 + rng() * 2.5, Math.PI / 2 + (rng() - 0.5) * 0.6, rng);
      else if (b.crop === 'lettuce') lettuce(d, p, 10 + rng() * 2.5, rng);
      else if (b.crop === 'carrot') carrotTop(d, p, 9 + rng() * 1.5, rng);
      else if (rng() < 0.85) seedling(d, p, 3.4 + rng() * 1.4 + 1.5 * b.e, rng);
    }
    if (ends) for (const x of [lo + 8, hi - 8]) marigold(d, pt(x, y), 8 + rng() * 2, rng);
  });
}

/** A spot out on the paths near the edges with room for radius r, clear of what's taken. */
function edgeSpot(w: number, h: number, r: number, room: Room, edge: Edgeness, taken: readonly Taken[], rng: Rng): Pt | null {
  for (let k = 0; k < 80; k++) {
    const p = pt(r + rng() * (w - 2 * r), r + rng() * (h - 2 * r));
    if (edge(p.x, p.y) < 0.75 || room(p.x, p.y) < r) continue;
    if (taken.some((t) => Math.hypot(t.x - p.x, t.y - p.y) < t.r + r + 20)) continue;
    return p;
  }
  return null;
}

/** The things left on the paths: a water butt, an upturned barrow, a coil of hose, stacks of pots. */
function pathThings(w: number, h: number, room: Room, edge: Edgeness, rng: Rng): { taken: Taken[]; paint: (d: Draw) => void } {
  const taken: Taken[] = [];
  const jobs: ((d: Draw) => void)[] = [];
  const place = (r: number, paint: (d: Draw, p: Pt) => void): void => {
    const p = edgeSpot(w, h, r, room, edge, taken, rng);
    if (!p) return;
    taken.push({ x: p.x, y: p.y, r });
    jobs.push((d) => paint(d, p));
  };
  place(40, (d, p) => waterButt(d, p, 30, rng));
  place(74, (d, p) => upturnedBarrow(d, p, 110, rng() * TAU, rng));
  place(34, (d, p) => hoseCoil(d, p, 24, rng));
  place(36, (d, p) => {
    for (let k = 0; k < 3; k++) {
      const c = polar(p, (k / 3) * TAU + 0.4, k === 0 ? 0 : 20);
      const r = 13 + rng() * 3;
      for (let s = 0; s < 3; s++) pot(d, pt(c.x - s * 1.5, c.y - s * 2), r - s * 0.5, rng, 'empty');
    }
  });
  return { taken, paint: (d) => jobs.forEach((j) => j(d)) };
}

/** Things set down on the paths between the beds once they're dug: a trug of the day's harvest, a watering can. */
function setDown(d: Draw, w: number, h: number, room: Room, edge: Edgeness, beds: readonly Bed[], taken: readonly Taken[], rng: Rng): void {
  const near = (p: Pt, r: number): boolean => beds.some((b) => p.x > b.x0 - r && p.x < b.x1 + r && p.y > b.y0 - r && p.y < b.y1 + r);
  const placed: Taken[] = [...taken];
  const spot = (r: number): Pt | null => {
    for (let k = 0; k < 120; k++) {
      const p = pt(r + rng() * (w - 2 * r), r + rng() * (h - 2 * r));
      if (edge(p.x, p.y) < 0.5 || room(p.x, p.y) < r || near(p, r)) continue;
      if (placed.some((t) => Math.hypot(t.x - p.x, t.y - p.y) < t.r + r + 12)) continue;
      placed.push({ x: p.x, y: p.y, r });
      return p;
    }
    return null;
  };
  const trug = spot(32);
  if (trug) harvestTrug(d, trug, 60, rng() * TAU, rng, (dd, c, r) => cabbage(dd, c, r, rng));
  const can = spot(34);
  if (can) wateringCan(d, can, 56, rng() * TAU, rng);
}

/** Whether a tall thing at c throws its whole shadow (`len` down-right) clear of the grooves. */
function shadowClear(room: Room, c: Pt, len: number): boolean {
  for (let k = 0; k <= len; k += 12) if (room(c.x + SHADOW.x * k, c.y + SHADOW.y * k) < -20) return false;
  return true;
}

/** The allotment page: see the module comment. */
export function paintAllotment(d: Draw, w: number, h: number, keep: GroundKeep): void {
  // Seeded from the layout, so each level's plot is dug and furnished a little differently, the same every time.
  const first = keep.grooves[0]?.[0] ?? keep.pads[0] ?? pt(0, 0);
  const rng = createRng(6610 + Math.round(first.x * 7 + first.y * 13) + keep.grooves.length * 101 + keep.pads.length * 31);
  const edge = edgenessOf(w, h, 0.42);
  const room = roomOf(keep, w, h);
  paths(d, w, h, edge, rng);
  const things = pathThings(w, h, room, edge, rng);
  const beds = layoutBeds(w, h, room, things.taken, edge, rng);
  for (const b of beds) bedGround(d, b, rng);
  for (const b of beds) grassAlong(d, b, rng);
  // A scarecrow in one of the outer beds, a fork left in another.
  const onBoard = (b: Bed): boolean => (b.x0 + b.x1) / 2 > 60 && (b.x0 + b.x1) / 2 < w - 60 && (b.y0 + b.y1) / 2 > 50 && (b.y0 + b.y1) / 2 < h - 50;
  const big = beds.filter((b) => b.e > 0.4 && b.x1 - b.x0 >= 160 && b.y1 - b.y0 >= 80 && b.crop !== 'beans' && onBoard(b));
  const from = Math.floor(rng() * big.length);
  const crowBed = [...big.slice(from), ...big.slice(0, from)].find((b) => shadowClear(room, pt((b.x0 + b.x1) / 2, (b.y0 + b.y1) / 2), 130));
  const crow = crowBed ? pt((crowBed.x0 + crowBed.x1) / 2, (crowBed.y0 + crowBed.y1) / 2) : null;
  const forkBed = [...beds].reverse().find((b) => b !== crowBed && b.e > 0.3 && b.crop !== 'beans' && onBoard(b) && shadowClear(room, pt(b.x1 - 30, b.y0 + 20), 80));
  const fork = forkBed ? pt(forkBed.x1 - 30, forkBed.y0 + 22) : null;
  const skip = (p: Pt): boolean => (crow !== null && Math.hypot(p.x - crow.x, p.y - crow.y) < 30) || (fork !== null && Math.hypot(p.x - fork.x, p.y - fork.y) < 14);
  for (const b of beds) plantBed(d, b, rng, skip);
  if (fork) gardenFork(d, fork, -2.4 + rng() * 0.4, rng);
  if (crow) scarecrow(d, crow, (rng() - 0.5) * 0.4, rng);
  things.paint(d);
  setDown(d, w, h, room, edge, beds, things.taken, rng);
}
