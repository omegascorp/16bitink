import { createRng, type Rng } from '../../logic/rng';
import type { LevelDef, ZoneDef } from '../../level/types';
import { blob, edgeWash, edgenessOf, groundWash, wash } from '../groundKit';
import { type Draw, pt, TAU } from '../kit';
import { PAPER_FILL } from '../palette';
import { makeCanvas, type Pt, shrink } from '../pen';
import { specks } from '../places/farmGroundParts';
import { type Busy, busyOf, distTo, keepsOf, noiseOf, perArea, seedOf, smoothstep } from '../places/farmKit';
import { crackLine, crackPath, H, LIME, LIME_BUFF, LIME_DEEP, LIME_GREY, LIME_SHADE, SHADE, SOIL_BROWN, SOIL_PALE, SOIL_RED_DEEP, W } from './mountainsPlaceKit';
import { cushion, dryTuft, oakCrown, stone, thymeMat } from './mountainsPlaceParts';

/**
 * The Mountains' ground (chapter 7): a limestone slope of the western
 * Zagros seen from above. Pale grey rock pavement split along its beds and
 * joints into slabs (the cracks shaded and lipped with light), pockets of
 * red terra rossa soil between them, loose stones, sun-dried grass, spiny
 * cushions and thyme, and the dark crowns of Persian oak reaching in at the
 * edges. A level's scree zones are fields of loose, angular stones. Each
 * level lies differently (seeded from its id); the middle, where the snake
 * hunts, is kept calm.
 */

/** How much soil lies at a spot (0 bare rock .. 1 a deep pocket of earth). */
type Soil = (x: number, y: number) => number;

function soilOf(level: LevelDef, rng: Rng): Soil {
  const n1 = noiseOf(rng, 210);
  const n2 = noiseOf(rng, 70);
  const edge = edgenessOf(W, H, 0.4);
  const { start } = level;
  return (x, y) => {
    let v = smoothstep((0.7 * n1(x, y) + 0.3 * n2(x, y) + 0.05) / 0.4);
    v += 0.25 * edge(x, y);
    v -= 0.3 * Math.max(0, 1 - Math.hypot(x - start.x, y - start.y) / 120);
    return Math.max(0, Math.min(1, v));
  };
}

/** The scree zones of a level (its 'sand' zones: loose stones that slow the snake). */
const screeOf = (level: LevelDef): Extract<ZoneDef, { shape: 'rect' }>[] =>
  (level.zones ?? []).filter((z): z is Extract<ZoneDef, { shape: 'rect' }> => z.kind === 'sand' && z.shape === 'rect');

/** How deep in scree a spot lies: 1 well inside a zone, fading to 0 a little outside its ragged edge. */
function screeAt(zones: readonly Extract<ZoneDef, { shape: 'rect' }>[], wobble: (x: number, y: number) => number): (x: number, y: number) => number {
  return (x, y) => {
    let v = 0;
    for (const z of zones) {
      const dx = Math.max(z.x - x, 0, x - (z.x + z.w));
      const dy = Math.max(z.y - y, 0, y - (z.y + z.h));
      const out = Math.hypot(dx, dy) + wobble(x, y) * 8;
      v = Math.max(v, 1 - smoothstep((out + 6) / 20));
    }
    return v;
  };
}

/** The paper, the limestone's wash, blooms of buff and grey where it dried unevenly, grit. */
function rock(d: Draw, busy: Busy, rng: Rng): void {
  groundWash(d, W, H, LIME, 0.72);
  for (let k = 0; k < perArea(90); k++) {
    const p = pt(rng() * W, rng() * H);
    const colour = rng() < 0.4 ? LIME_BUFF : rng() < 0.7 ? LIME_GREY : PAPER_FILL;
    d.pen.fill(blob(p, 40 + rng() * 100, 26 + rng() * 60, rng, 0.35, 18, rng() * TAU), colour, 0.06 + 0.1 * busy(p.x, p.y));
  }
  for (let k = 0; k < perArea(22); k++) {
    const p = pt(rng() * W, rng() * H);
    wash(d, blob(p, 40 + rng() * 80, 24 + rng() * 44, rng, 0.35, 24, rng() * TAU), rng() < 0.5 ? LIME_GREY : LIME_BUFF, 0.07, 0.7);
  }
  const at = (n: number, r0: number, r1: number): (readonly [number, number, number])[] => Array.from({ length: perArea(n) }, () => [rng() * W, rng() * H, r0 + rng() * (r1 - r0)] as const);
  specks(d, LIME_SHADE, 0.32, at(26000, 0.3, 0.8));
  specks(d, LIME_DEEP, 0.22, at(5000, 0.3, 0.6));
  specks(d, PAPER_FILL, 0.6, at(14000, 0.3, 0.75));
}

/** The soil pockets: a soft wash of red-brown earth where the soil lies, wet edges, grit. */
function earth(d: Draw, soil: Soil, rng: Rng): void {
  const cell = 6;
  const cols = Math.ceil(W / cell) + 1;
  const rows = Math.ceil(H / cell) + 1;
  const tint = noiseOf(rng, 160);
  const { canvas, ctx } = makeCanvas(cols, rows);
  const img = ctx.createImageData(cols, rows);
  const red = [0xb2, 0x7b, 0x57];
  const brown = [0xa0, 0x85, 0x66];
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const i = (y * cols + x) * 4;
      const t = smoothstep(0.5 + tint(x * cell, y * cell));
      for (let c = 0; c < 3; c++) img.data[i + c] = Math.round(red[c]! * t + brown[c]! * (1 - t));
      img.data[i + 3] = Math.round(255 * 0.5 * soil(x * cell, y * cell) ** 1.6);
    }
  }
  ctx.putImageData(img, 0, 0);
  const out = d.pen.ctx;
  out.save();
  out.imageSmoothingEnabled = true;
  out.imageSmoothingQuality = 'high';
  out.drawImage(canvas, 0, 0, cols, rows, 0, 0, cols * cell, rows * cell);
  out.restore();
  shrink(canvas);
  for (let k = 0; k < perArea(60); k++) {
    const p = pt(rng() * W, rng() * H);
    if (soil(p.x, p.y) < 0.5) continue;
    wash(d, blob(p, 14 + rng() * 36, 10 + rng() * 22, rng, 0.4, 16, rng() * TAU), rng() < 0.5 ? SOIL_RED_DEEP : SOIL_BROWN, 0.08, 0.7);
  }
  const grit: (readonly [number, number, number])[] = [];
  for (let k = 0; k < perArea(16000); k++) {
    const x = rng() * W;
    const y = rng() * H;
    if (rng() < soil(x, y)) grit.push([x, y, 0.3 + rng() * 0.5]);
  }
  specks(d, SOIL_RED_DEEP, 0.35, grit);
  specks(d, SOIL_PALE, 0.4, grit.filter(() => rng() < 0.4).map(([x, y, r]) => [x + 0.8, y - 0.6, r * 0.8] as const));
}

/** The pavement's cracks: long ones along the beds, short joints across them, shaded and lit, fainter in the calm middle and lost under soil. */
function cracks(d: Draw, soil: Soil, busy: Busy, rng: Rng): void {
  const strike = -0.35 + (rng() - 0.5) * 0.5;
  const ux = Math.cos(strike);
  const uy = Math.sin(strike);
  const nx = -uy;
  const ny = ux;
  const spacing = 52 + rng() * 22;
  const reach = Math.hypot(W, H);
  const keep = (p: Pt): number => (1 - soil(p.x, p.y) ** 0.7) * (0.3 + 0.7 * busy(p.x, p.y));
  const lay = (pts: Pt[], w: number): void => {
    // Broken into runs, each as strong as the rock it crosses.
    for (let i = 0; i < pts.length - 3; i += 3) {
      const run = pts.slice(i, i + 4);
      const k = keep(run[1]!);
      if (k > 0.12) crackLine(d, run, w, Math.min(0.8, k));
    }
  };
  const beds: Pt[][] = [];
  for (let o = -reach / 2; o < reach / 2; o += spacing * (0.7 + rng() * 0.6)) {
    const a = pt(W / 2 + nx * o - ux * reach * 0.6, H / 2 + ny * o - uy * reach * 0.6);
    const pts = crackPath(a, strike, reach * 1.2, rng, 6, 0.28).map((p, i) => pt(p.x + nx * Math.sin(i * 0.05) * 6, p.y + ny * Math.sin(i * 0.05) * 6));
    beds.push(pts);
    lay(pts, 0.75 + rng() * 0.35);
  }
  // Joints: across the beds, from one bed to about the next.
  for (const bed of beds) {
    for (let i = Math.floor(rng() * 12); i < bed.length; i += 8 + Math.floor(rng() * 14)) {
      const a = bed[i]!;
      if (a.x < -20 || a.x > W + 20 || a.y < -20 || a.y > H + 20) continue;
      lay(crackPath(a, strike + Math.PI / 2 + (rng() - 0.5) * 0.4, spacing * (0.7 + rng() * 0.5), rng, 5, 0.35), 0.55 + rng() * 0.3);
    }
  }
}

/** Loose stones: a few everywhere, more at the edges and on the soil's margins; packed thick over the scree. */
function stones(d: Draw, clear: (p: Pt, room?: number) => boolean, busy: Busy, scree: (x: number, y: number) => number, rng: Rng): void {
  for (let k = 0; k < perArea(900); k++) {
    const p = pt(rng() * W, rng() * H);
    if (rng() > 0.12 + 0.6 * busy(p.x, p.y) || !clear(p, 4) || scree(p.x, p.y) > 0.1) continue;
    stone(d, p, 1.2 + rng() ** 2.5 * 6, rng);
  }
}

/** A scree field: a grey bed of grit, then stones packed every size, small ones between the big, each throwing its shadow. */
function screeField(d: Draw, zones: readonly Extract<ZoneDef, { shape: 'rect' }>[], scree: (x: number, y: number) => number, rng: Rng): void {
  for (const z of zones) {
    const bed: (readonly [number, number, number])[] = [];
    for (let k = 0; k < z.w * z.h * 0.25; k++) {
      const x = z.x - 20 + rng() * (z.w + 40);
      const y = z.y - 20 + rng() * (z.h + 40);
      if (rng() < scree(x, y)) bed.push([x, y, 0.4 + rng() * 0.8]);
    }
    for (let k = 0; k < 10; k++) {
      const p = pt(z.x + rng() * z.w, z.y + rng() * z.h);
      d.pen.fill(blob(p, z.w * 0.3, z.h * 0.25, rng, 0.3, 16, rng() * TAU), rng() < 0.5 ? LIME_GREY : LIME_SHADE, 0.12);
    }
    specks(d, LIME_DEEP, 0.4, bed);
    specks(d, PAPER_FILL, 0.5, bed.filter(() => rng() < 0.4).map(([x, y, r]) => [x - 0.4, y - 0.5, r * 0.7] as const));
    // Stones of every size, painted top to bottom so each one's shadow falls on those below it.
    const placed: Pt[] = [];
    for (let k = 0; k < Math.round(z.w * z.h * 0.035); k++) {
      const p = pt(z.x - 14 + rng() * (z.w + 28), z.y - 14 + rng() * (z.h + 28));
      if (rng() < scree(p.x, p.y)) placed.push(p);
    }
    placed.sort((a, b) => a.y - b.y);
    for (const p of placed) stone(d, p, 1.6 + rng() ** 2 * 6.5, rng, 0.75);
  }
}

/** Plants where the rock allows: dry grass on the soil, cushions and thyme near the edges, all kept off the level's things and the calm middle. */
function plants(d: Draw, soil: Soil, busy: Busy, clear: (p: Pt, room?: number) => boolean, scree: (x: number, y: number) => number, rng: Rng): void {
  for (let k = 0; k < perArea(700); k++) {
    const p = pt(rng() * W, rng() * H);
    const b = busy(p.x, p.y);
    if (rng() > b * (0.25 + 0.75 * soil(p.x, p.y)) || !clear(p, 8) || scree(p.x, p.y) > 0.05) continue;
    dryTuft(d, p, 4 + rng() * 6 * (0.5 + b), rng);
  }
  for (let k = 0; k < perArea(160); k++) {
    const p = pt(rng() * W, rng() * H);
    const b = busy(p.x, p.y);
    if (rng() > b ** 1.5 * 0.5 || !clear(p, 16) || scree(p.x, p.y) > 0.05) continue;
    if (rng() < 0.55) cushion(d, p, 5 + rng() * 6, rng);
    else thymeMat(d, p, 5 + rng() * 6, rng, 0.6);
  }
}

/** One to three Persian oaks reaching in from the edges, their crowns cut by the board's edge. */
function oaks(d: Draw, level: LevelDef, rng: Rng): void {
  const keeps = keepsOf(level);
  const n = 1 + Math.floor(rng() * 3);
  for (let k = 0, made = 0; k < 40 && made < n; k++) {
    const side = Math.floor(rng() * 4);
    const along = rng();
    const c = side === 0 ? pt(along * W, -40) : side === 1 ? pt(W + 40, along * H) : side === 2 ? pt(along * W, H + 40) : pt(-40, along * H);
    const r = 70 + rng() * 40;
    // Not over a level's things (the crown would hide them).
    if (keeps.some((kp) => distTo(kp, c.x, c.y) < r * 0.9)) continue;
    oakCrown(d, c, r, rng);
    made++;
  }
}

/** The Mountains' ground for a level: see the module comment. */
export function paintMountainsGround(d: Draw, level: LevelDef): void {
  const rng = createRng(seedOf(level.id) ^ 0x7a6c);
  const keeps = keepsOf(level);
  const busy = busyOf(keeps);
  const soil = soilOf(level, rng);
  const zones = screeOf(level);
  const scree = screeAt(zones, noiseOf(rng, 30));
  const clear = (p: Pt, room = 6): boolean => keeps.every((k) => distTo(k, p.x, p.y) > room);
  rock(d, busy, rng);
  earth(d, soil, rng);
  cracks(d, soil, busy, rng);
  stones(d, clear, busy, scree, rng);
  screeField(d, zones, scree, rng);
  plants(d, soil, busy, clear, scree, rng);
  edgeWash(d, W, H, '#6d6458', 0.28, W * 0.2);
  oaks(d, level, rng);
  // A breath of cool shade from the slope above, over the upper edge.
  edgeWash(d, W, H, SHADE, 0.05, W * 0.12);
}
