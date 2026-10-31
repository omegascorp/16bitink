import { createRng } from '../logic/rng';
import type { MapLayout, MapRegion } from '../scenes/map/layout';
import { inkLines, offTrail } from './atlas';
import { BASALT, BASALT_DARK, BASALT_LIGHT, EMBER, EMBER_LIGHT, GOLD, INK } from './palette';
import { ellipse, type Pen, type Pt } from './pen';
import { mix, rgba } from './wash';

/**
 * The Volcano Shrine's band of the Ink Atlas, painted once its chapter is
 * built: ash fields washed grey and violet, a lava river winding down the
 * right of the page, little cones and steam vents, charred trees and lumps
 * of black rock; and at its foot the volcano itself, smoking, with the
 * shrine's horned roof in front of it. Placed in world px and seeded by
 * place, as the rest of the page.
 */

const ASH_WASH = '#8d8590';
const LAVA = '#e8722c';
const CHAR = '#3b3036';

/** The lava river's course: down the right of the band, x by y. */
function lavaX(y: number): number {
  return 850 + Math.sin(y / 150) * 34 + Math.sin(y / 61) * 8;
}

export function paintVolcanoLands(ctx: CanvasRenderingContext2D, pen: Pen, layout: MapLayout, r: MapRegion): void {
  const rng = createRng(500 + r.index);
  // Ash: soft grey-violet washes all over the band.
  for (let i = 0; i < 70; i++) {
    const x = rng() * layout.width;
    const y = r.top + rng() * (r.bottom - r.top);
    const rr = 40 + rng() * 80;
    const g = ctx.createRadialGradient(x, y, 0, x, y, rr);
    const c = rng() < 0.2 ? '#b07a62' : ASH_WASH;
    g.addColorStop(0, rgba(c, 0.13));
    g.addColorStop(1, rgba(c, 0));
    ctx.fillStyle = g;
    ctx.fillRect(x - rr, y - rr, rr * 2, rr * 2);
  }
  paintLavaRiver(ctx, pen, r);
  for (let i = 0; i < 90; i++) {
    const x = 40 + rng() * (layout.width - 80);
    const y = r.top + rng() * (r.bottom - r.top);
    if (!offTrail(layout, x, y, 70) || Math.hypot(x - r.ruin.x, y - r.ruin.y) < 190 || Math.abs(x - lavaX(y)) < 50) continue;
    const roll = rng();
    if (roll < 0.14) cone(ctx, pen, x, y, 18 + rng() * 14, rng);
    else if (roll < 0.4) deadTree(pen, x, y, 12 + rng() * 10, rng);
    else if (roll < 0.52) vent(ctx, pen, x, y);
    else rocks(ctx, pen, x, y, rng);
  }
}

/** The lava river: a glow on the page, a dark crust along its banks and a hot orange core, swelling in the middle and thinning to nothing at both ends. */
function paintLavaRiver(ctx: CanvasRenderingContext2D, pen: Pen, r: MapRegion): void {
  const river: Pt[] = [];
  for (let y = r.top + 30; y <= r.bottom - 50; y += 12) river.push({ x: lavaX(y), y });
  if (river.length < 3) return;
  const n = river.length - 1;
  /** Its width at point i: thin at the source, broad in the middle, spreading thin at the end. */
  const width = (i: number): number => {
    const t = i / n;
    return Math.min(1, t * 5) * Math.min(1, (1 - t) * 3) * (0.75 + 0.25 * Math.sin(t * 9));
  };
  const band = (w: number, color: string): void => {
    const left: Pt[] = [];
    const right: Pt[] = [];
    river.forEach((p, i) => {
      const q = river[Math.min(n, i + 1)]!;
      const o = river[Math.max(0, i - 1)]!;
      const d = Math.hypot(q.x - o.x, q.y - o.y) || 1;
      const nx = -(q.y - o.y) / d;
      const ny = (q.x - o.x) / d;
      const half = (w * width(i)) / 2;
      left.push({ x: p.x + nx * half, y: p.y + ny * half });
      right.push({ x: p.x - nx * half, y: p.y - ny * half });
    });
    ctx.fillStyle = color;
    ctx.beginPath();
    [...left, ...right.reverse()].forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
    ctx.closePath();
    ctx.fill();
  };
  band(84, rgba(EMBER, 0.08));
  band(54, rgba(EMBER, 0.12));
  band(30, rgba(CHAR, 0.8));
  band(20, rgba(LAVA, 0.95));
  band(7, rgba(EMBER_LIGHT, 0.85));
  // Ink only along the banks' middle reach, where the river is broad.
  const banks = river.filter((_, i) => width(i) > 0.5);
  for (const side of [-1, 1]) pen.hair(banks.map((p, i) => ({ x: p.x + side * 15 * width(river.indexOf(p)), y: p.y + (i % 2) * 0.3 })), 1.1, INK, 0.55);
  // Crust plates floating on it.
  for (let k = 6; k < n - 4; k += 7) {
    const p = river[k]!;
    pen.fill(ellipse(p.x + (k % 2 ? 3 : -4), p.y, 3.5 * width(k), 2.2, 8), CHAR, 0.85);
  }
}

/** A little volcanic cone with a wisp from its top. */
function cone(ctx: CanvasRenderingContext2D, pen: Pen, x: number, y: number, s: number, rng: () => number): void {
  const shape = [{ x: x - s, y }, { x: x - s * 0.25, y: y - s * 0.8 }, { x: x + s * 0.2, y: y - s * 0.82 }, { x: x + s, y }];
  const g = ctx.createLinearGradient(x - s, 0, x + s, 0);
  g.addColorStop(0, mix(BASALT_LIGHT, '#ffffff', 0.15));
  g.addColorStop(1, BASALT_DARK);
  ctx.fillStyle = g;
  ctx.beginPath();
  shape.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
  ctx.closePath();
  ctx.fill();
  pen.hair(shape, 1.1, INK, 0.75);
  pen.dot(x, y - s * 0.8, 1.6, EMBER, 0.9);
  if (rng() < 0.7) pen.hair([{ x, y: y - s * 0.9 }, { x: x + 3, y: y - s * 1.3 }, { x: x - 2, y: y - s * 1.7 }], 1, '#7a7280', 0.5);
}

/** A charred tree: a bare trunk with a few crooked branches. */
function deadTree(pen: Pen, x: number, y: number, s: number, rng: () => number): void {
  const lean = (rng() - 0.5) * s * 0.3;
  pen.stroke([{ x, y }, { x: x + lean * 0.5, y: y - s * 0.7 }, { x: x + lean, y: y - s * 1.4 }], 1.8, CHAR, 0.95, false);
  for (let k = 0; k < 3; k++) {
    const t = 0.45 + k * 0.2;
    const bx = x + lean * t;
    const by = y - s * 1.4 * t;
    const side = k % 2 ? 1 : -1;
    pen.hair([{ x: bx, y: by }, { x: bx + side * s * 0.35, y: by - s * 0.25 }, { x: bx + side * s * 0.45, y: by - s * 0.42 }], 1, CHAR, 0.9);
  }
  pen.hair([{ x: x - s * 0.5, y: y + 1 }, { x: x + s * 0.5, y: y + 1 }], 1, rgba(INK, 0.5), 0.6);
}

/** A steam vent: a crack with a soft white puff over it. */
function vent(ctx: CanvasRenderingContext2D, pen: Pen, x: number, y: number): void {
  pen.hair([{ x: x - 7, y }, { x: x - 2, y: y - 1 }, { x: x + 6, y: y + 1 }], 1.2, CHAR, 0.9);
  pen.dot(x, y - 0.5, 1.4, EMBER, 0.8);
  const g = ctx.createRadialGradient(x, y - 14, 0, x, y - 14, 14);
  g.addColorStop(0, 'rgba(255,255,255,0.55)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(x - 14, y - 28, 28, 28);
}

/** Two or three lumps of black rock, lit from the top left. */
function rocks(ctx: CanvasRenderingContext2D, pen: Pen, x: number, y: number, rng: () => number): void {
  const n = 2 + Math.floor(rng() * 2);
  for (let k = 0; k < n; k++) {
    const rx = x + (k - 1) * 9 + rng() * 4;
    const s = 4 + rng() * 5;
    const shape = [{ x: rx - s, y }, { x: rx - s * 0.6, y: y - s * 0.9 }, { x: rx + s * 0.4, y: y - s }, { x: rx + s, y }];
    const g = ctx.createLinearGradient(rx - s, y - s, rx + s, y);
    g.addColorStop(0, BASALT_LIGHT);
    g.addColorStop(1, BASALT_DARK);
    ctx.fillStyle = g;
    ctx.beginPath();
    shape.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
    ctx.closePath();
    ctx.fill();
    pen.hair(shape, 0.9, INK, 0.7);
  }
}

/**
 * The Volcano Shrine, painted: the smoking volcano behind, lava running
 * down its flanks from a glowing crater, and in front the shrine, a dark
 * colonnaded hall under a horned roof with its fire bowl lit.
 */
export function paintVolcanoShrine(ctx: CanvasRenderingContext2D, pen: Pen, at: Pt): void {
  const { x, y } = at;
  const base = y + 60;
  ctx.fillStyle = rgba('#2a2026', 0.22);
  ctx.beginPath();
  ctx.ellipse(x, base + 2, 150, 18, 0, 0, Math.PI * 2);
  ctx.fill();
  // The plume, behind everything.
  for (let k = 0; k < 7; k++) {
    const t = k / 6;
    const px = x + 6 + t * 70 + Math.sin(k * 1.6) * 8;
    const py = y - 110 - t * 120;
    const r = 22 + t * 36;
    const g = ctx.createRadialGradient(px, py, 0, px, py, r);
    g.addColorStop(0, rgba(k < 2 ? '#8a5a54' : '#6d6672', 0.45 - t * 0.2));
    g.addColorStop(1, rgba('#6d6672', 0));
    ctx.fillStyle = g;
    ctx.fillRect(px - r, py - r, r * 2, r * 2);
  }
  // The cone: lit on the left, a glowing notch of a crater on top.
  const cone = [{ x: x - 150, y: base }, { x: x - 34, y: y - 96 }, { x: x - 14, y: y - 90 }, { x: x + 8, y: y - 98 }, { x: x + 34, y: y - 94 }, { x: x + 150, y: base }];
  const g = ctx.createLinearGradient(x - 150, 0, x + 150, 0);
  g.addColorStop(0, mix(BASALT_LIGHT, '#ffffff', 0.2));
  g.addColorStop(0.5, BASALT);
  g.addColorStop(1, BASALT_DARK);
  ctx.fillStyle = g;
  ctx.beginPath();
  cone.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
  ctx.closePath();
  ctx.fill();
  pen.hatch([cone[3]!, cone[4]!, cone[5]!, { x: x + 40, y: base }], 4, 1.1, 0.6, { color: INK, alpha: 0.3 });
  const crater = ctx.createRadialGradient(x - 3, y - 94, 0, x - 3, y - 94, 34);
  crater.addColorStop(0, rgba(EMBER_LIGHT, 0.85));
  crater.addColorStop(1, rgba(EMBER, 0));
  ctx.fillStyle = crater;
  ctx.fillRect(x - 40, y - 130, 74, 70);
  // Lava running down the flanks.
  for (const [dx, sway] of [[-10, -1], [14, 1]] as const) {
    const run: Pt[] = [];
    for (let t = 0; t <= 1.0001; t += 0.1) run.push({ x: x + dx + sway * t * 60 + Math.sin(t * 7) * 5, y: y - 92 + t * 110 });
    pen.stroke(run, 4, LAVA, 0.95, false);
    pen.hair(run, 1.2, EMBER_LIGHT, 0.9);
  }
  inkLines(ctx, cone, 1.6, false);
  // The shrine in front: a plinth, the pillared hall glowing inside, the horned roof.
  const sa = x - 70;
  const sb = x + 70;
  const plinth = [{ x: sa - 10, y: base }, { x: sa - 10, y: base - 8 }, { x: sb + 10, y: base - 8 }, { x: sb + 10, y: base }];
  pen.fill(plinth, BASALT, 1);
  inkLines(ctx, plinth, 1.4, true);
  const top = base - 34;
  const glow = ctx.createLinearGradient(0, top, 0, base - 8);
  glow.addColorStop(0, '#1d1218');
  glow.addColorStop(1, mix(EMBER, '#2a1418', 0.4));
  ctx.fillStyle = glow;
  ctx.fillRect(sa, top, sb - sa, base - 8 - top);
  for (let k = 0; k <= 4; k++) {
    const px = sa + ((sb - sa) * k) / 4;
    const col = [{ x: px - 4, y: base - 8 }, { x: px - 4, y: top }, { x: px + 4, y: top }, { x: px + 4, y: base - 8 }];
    pen.fill(col, mix(BASALT, BASALT_LIGHT, 0.4), 1);
    inkLines(ctx, col, 1, true);
  }
  const eave = top - 2;
  const roof = [{ x: sa - 30, y: eave - 12 }, { x: sa - 18, y: eave }, { x: sa + 10, y: eave - 14 }, { x: sb - 10, y: eave - 14 }, { x: sb + 18, y: eave }, { x: sb + 30, y: eave - 12 }, { x: sb + 18, y: eave - 6 }, { x: sb - 6, y: eave - 22 }, { x: sa + 6, y: eave - 22 }, { x: sa - 18, y: eave - 6 }];
  const rg = ctx.createLinearGradient(0, eave - 22, 0, eave);
  rg.addColorStop(0, mix(BASALT, BASALT_LIGHT, 0.6));
  rg.addColorStop(1, BASALT_DARK);
  ctx.fillStyle = rg;
  ctx.beginPath();
  roof.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
  ctx.closePath();
  ctx.fill();
  for (let rx = sa; rx < sb; rx += 8) pen.hair([{ x: rx, y: eave - 20 }, { x: rx, y: eave - 4 }], 0.7, BASALT_DARK, 0.8);
  inkLines(ctx, roof, 1.5, true);
  // The fire bowl on the ridge, and a glint of gold in the hall: treasure inside.
  pen.fill([{ x: x - 7, y: eave - 22 }, { x: x - 3, y: eave - 34 }, { x: x + 1, y: eave - 28 }, { x: x + 3, y: eave - 38 }, { x: x + 7, y: eave - 22 }], LAVA, 1);
  pen.fill([{ x: x - 3, y: eave - 22 }, { x: x + 1, y: eave - 30 }, { x: x + 3, y: eave - 22 }], '#ffd25a', 1);
  pen.fill([{ x: x - 9, y: eave - 24 }, { x: x + 9, y: eave - 24 }, { x: x + 5, y: eave - 19 }, { x: x - 5, y: eave - 19 }], '#7a5233', 1);
  pen.dot(sa - 30, eave - 13, 1.8, GOLD);
  pen.dot(sb + 30, eave - 13, 1.8, GOLD);
  pen.dot(x, base - 14, 2.4, GOLD);
}
