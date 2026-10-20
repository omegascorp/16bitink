import { createRng, type Rng } from '../logic/rng';
import { bezier, closed, cub, type Draw, oval, pt, TAU } from './kit';
import { LEAF, MOSS, PAPER, PAPER_FILL, STONE, STONE_DARK } from './palette';
import type { Pt } from './pen';
import { mix } from './wash';

/**
 * Chapter 1's page, "The Garden": old flagstones laid in courses, moss in
 * their joints, and the garden creeping in at the edges (ferns, clover,
 * fallen leaves, pebbles). Pale and quiet in the middle where play
 * happens; the detail gathers towards the edges. Board coordinates.
 */
const JOINT = '#b7b199';
const WARM_STONE = '#cfc2a6';
const COOL_STONE = '#bfc1b4';
const CLOVER = '#78a65a';
const FALL = ['#d3a24c', '#c4733f', '#a3a35a', '#c98f46'] as const;

/** 0 in the middle of the board, 1 at its edges, eased. */
type Edgeness = (x: number, y: number) => number;

function edgenessOf(w: number, h: number): Edgeness {
  return (x, y) => {
    const e = Math.max(Math.abs(x - w / 2) / (w / 2), Math.abs(y - h / 2) / (h / 2));
    const t = Math.max(0, Math.min(1, (e - 0.5) / 0.5));
    return t * t * (3 - 2 * t);
  };
}

interface Stone {
  shape: Pt[];
  sides: Pt[][];
  cx: number;
  cy: number;
}

/** The flagstones: courses of rectangular slabs, each joint slightly askew. */
function layStones(rng: Rng, w: number, h: number): Stone[] {
  const rows: number[] = [-40];
  while (rows[rows.length - 1]! < h + 20) rows.push(rows[rows.length - 1]! + 108 + rng() * 42);
  const phase = rows.map(() => rng() * TAU);
  const course = (i: number, x: number): number => rows[i]! + Math.sin(x / 190 + phase[i]!) * 3.5;
  const g = 2.6;
  const out: Stone[] = [];
  for (let r = 0; r + 1 < rows.length; r++) {
    const joints: { top: number; bot: number }[] = [];
    for (let x = -60 - rng() * 90; x < w + 60; x += 125 + rng() * 85) {
      const lean = (rng() - 0.5) * 9;
      joints.push({ top: x + lean, bot: x - lean });
    }
    joints.push({ top: w + 260, bot: w + 260 });
    for (let j = 0; j + 1 < joints.length; j++) {
      const a = joints[j]!;
      const b = joints[j + 1]!;
      const along = (x0: number, x1: number, row: number, dy: number): Pt[] => {
        const n = Math.max(2, Math.ceil(Math.abs(x1 - x0) / 18));
        return Array.from({ length: n + 1 }, (_, k) => {
          const x = x0 + ((x1 - x0) * k) / n;
          return pt(x, course(row, x) + dy);
        });
      };
      const top = along(a.top + g, b.top - g, r, g);
      const right = [pt(b.top - g, course(r, b.top) + g), pt(b.bot - g, course(r + 1, b.bot) - g)];
      const bot = along(b.bot - g, a.bot + g, r + 1, -g);
      const left = [pt(a.bot + g, course(r + 1, a.bot) - g), pt(a.top + g, course(r, a.top) + g)];
      // Worn corners: chamfer each a little so the pen rounds them.
      const shape = chamfer([...top, ...bot], 5);
      out.push({ shape, sides: [top, right, bot, left], cx: (a.top + b.bot) / 2, cy: (course(r, a.top) + course(r + 1, b.bot)) / 2 });
    }
  }
  return out;
}

/** Cuts every corner sharper than ~150° back by `k` units. */
function chamfer(pts: readonly Pt[], k: number): Pt[] {
  const out: Pt[] = [];
  const n = pts.length;
  for (let i = 0; i < n; i++) {
    const p = pts[i]!;
    const a = pts[(i - 1 + n) % n]!;
    const b = pts[(i + 1) % n]!;
    const ua = pt(a.x - p.x, a.y - p.y);
    const ub = pt(b.x - p.x, b.y - p.y);
    const la = Math.hypot(ua.x, ua.y) || 1;
    const lb = Math.hypot(ub.x, ub.y) || 1;
    const cos = (ua.x * ub.x + ua.y * ub.y) / (la * lb);
    if (cos > -0.85) {
      const ka = Math.min(k, la / 2);
      const kb = Math.min(k, lb / 2);
      out.push(pt(p.x + (ua.x / la) * ka, p.y + (ua.y / la) * ka), pt(p.x + (ub.x / lb) * kb, p.y + (ub.y / lb) * kb));
    } else out.push(p);
  }
  return out;
}

/** One flagstone: pale wash, weathering, a worn shadowed edge, a broken pen outline. */
function paintStone(d: Draw, s: Stone, rng: Rng, edge: Edgeness): void {
  const { pen } = d;
  const e = edge(s.cx, s.cy);
  const tone = rng() < 0.5 ? WARM_STONE : COOL_STONE;
  pen.fill(s.shape, PAPER_FILL, 0.92);
  pen.fill(s.shape, mix(tone, STONE, rng()), 0.16 + 0.16 * e + rng() * 0.06);
  pen.clipped(s.shape, () => {
    // Weathering: soft blotches and lichen rings.
    for (let i = 0; i < 4; i++) {
      const x = s.cx + (rng() - 0.5) * 120;
      const y = s.cy + (rng() - 0.5) * 90;
      pen.fill(oval(x, y, 14 + rng() * 26, 9 + rng() * 16, 16), STONE_DARK, 0.03 + 0.04 * e);
    }
    if (rng() < 0.25 + 0.4 * e) {
      const x = s.cx + (rng() - 0.5) * 90;
      const y = s.cy + (rng() - 0.5) * 60;
      const r = 3 + rng() * 5;
      pen.fill(oval(x, y, r, r * 0.8, 14), '#c9c98f', 0.35);
      pen.hair(closed(oval(x, y, r, r * 0.8, 14)), 0.4, d.ink, 0.15 + 0.15 * e);
    }
  });
  // The slab's edges are worn round: shadow along the side away from the light.
  pen.crescent(s.shape, pt(-3.2, -4.6), () => pen.fill(s.shape, STONE_DARK, 0.14 + 0.08 * e));
  if (e > 0.35) pen.crescent(s.shape, pt(-7, -10), () => pen.hatch(s.shape, 4.2, 0.9, 0.45, { color: d.ink, alpha: 0.12 + 0.18 * e }));
  // A broken outline: each side inked or not, lightly in the middle of the page.
  const a = 0.18 + 0.4 * e;
  for (const side of s.sides) if (rng() < 0.8) pen.stroke(side, 0.75 + 0.35 * e, d.ink, a, false);
  if (rng() < 0.3 + 0.3 * e) {
    const x = s.cx + (rng() - 0.5) * 80;
    const y = s.cy + (rng() - 0.5) * 50;
    pen.hair([pt(x, y), pt(x + 9 + rng() * 10, y + (rng() - 0.5) * 12), pt(x + 18 + rng() * 14, y + (rng() - 0.5) * 18)], 0.45, d.ink, 0.2 + 0.25 * e);
  }
}

/** Moss and grass in the joints, thicker towards the edges of the page. */
function joints(d: Draw, stones: readonly Stone[], rng: Rng, edge: Edgeness): void {
  const { pen } = d;
  for (const s of stones) {
    for (const side of s.sides) {
      for (let i = 0; i + 1 < side.length; i++) {
        const p = side[i]!;
        const q = side[i + 1]!;
        const len = Math.hypot(q.x - p.x, q.y - p.y);
        const e = edge(p.x, p.y);
        const n = Math.round((len / 7) * (0.15 + 0.9 * e));
        for (let k = 0; k < n; k++) {
          const t = rng();
          const x = p.x + (q.x - p.x) * t + (rng() - 0.5) * 4;
          const y = p.y + (q.y - p.y) * t + (rng() - 0.5) * 4;
          const r = 1.4 + rng() * 2.6 * (0.5 + e);
          pen.fill(oval(x, y, r, r * 0.8, 8), rng() < 0.3 ? LEAF : MOSS, 0.22 + 0.4 * e);
        }
        if (e > 0.5 && rng() < 0.25 * e) {
          const m = pt((p.x + q.x) / 2, (p.y + q.y) / 2);
          for (let b = 0; b < 4; b++) {
            const ang = -Math.PI / 2 + (rng() - 0.5) * 1.6;
            const l = 6 + rng() * 8;
            pen.hair(bezier(m, pt(m.x + Math.cos(ang) * l * 0.5 + 1.5, m.y + Math.sin(ang) * l * 0.5), pt(m.x + Math.cos(ang) * l, m.y + Math.sin(ang) * l), 4), 0.55, mix(LEAF, d.ink, 0.35), 0.6);
          }
        }
      }
    }
  }
}

/** A fern frond: a curving stem with paired leaflets shrinking to the tip. */
function frond(d: Draw, base: Pt, ang: number, len: number, bend: number): void {
  const { pen } = d;
  const dir = pt(Math.cos(ang), Math.sin(ang));
  const nrm = pt(-dir.y, dir.x);
  const tip = pt(base.x + dir.x * len + nrm.x * bend, base.y + dir.y * len + nrm.y * bend);
  const mid = pt(base.x + dir.x * len * 0.5 + nrm.x * bend * 0.2, base.y + dir.y * len * 0.5 + nrm.y * bend * 0.2);
  const rachis = bezier(base, mid, tip, 30);
  const wash = mix(LEAF, '#ffffff', 0.12);
  for (let i = 3; i < rachis.length - 1; i++) {
    const p = rachis[i]!;
    const q = rachis[i + 1]!;
    const t = i / rachis.length;
    const tl = Math.hypot(q.x - p.x, q.y - p.y) || 1;
    const u = pt((q.x - p.x) / tl, (q.y - p.y) / tl);
    const size = len * 0.16 * Math.sin(Math.PI * Math.min(1, t * 1.15)) + 2;
    for (const side of [1, -1]) {
      const v = pt(-u.y * side, u.x * side);
      const end = pt(p.x + (v.x * 0.9 + u.x * 0.45) * size, p.y + (v.y * 0.9 + u.y * 0.45) * size);
      const w = size * 0.28;
      const leaf = [p, ...bezier(p, pt((p.x + end.x) / 2 + u.x * w, (p.y + end.y) / 2 + u.y * w), end, 5).slice(1), ...bezier(end, pt((p.x + end.x) / 2 - u.x * w, (p.y + end.y) / 2 - u.y * w), p, 5).slice(1)];
      pen.fill(leaf, wash, 0.5);
      if (i % 2 === 0) pen.hair(leaf, 0.4, d.ink, 0.4);
    }
  }
  pen.stroke(rachis, 1, mix(LEAF, d.ink, 0.5), 0.75, false);
}

/** A clump of fern fronds fanning out from a point. */
function fern(d: Draw, base: Pt, ang: number, spread: number, len: number): void {
  for (let i = 0; i < 5; i++) {
    const k = i / 4 - 0.5;
    frond(d, base, ang + k * spread, len * (0.75 + 0.25 * Math.cos(k * 2)), (k < 0 ? -1 : 1) * len * 0.12);
  }
}

/** A clover leaf: three heart-shaped leaflets, each with its pale chevron. */
function clover(d: Draw, c: Pt, r: number, turn: number): void {
  const { pen } = d;
  for (let i = 0; i < 3; i++) {
    const ang = turn + (i / 3) * TAU;
    const dir = pt(Math.cos(ang), Math.sin(ang));
    const nrm = pt(-dir.y, dir.x);
    const at = (a: number, b: number): Pt => pt(c.x + dir.x * a * r + nrm.x * b * r, c.y + dir.y * a * r + nrm.y * b * r);
    const leaf = [at(0, 0), ...cub(at(0, 0), at(0.4, 0.75), at(1.05, 0.6), at(0.92, 0.02), 7).slice(1), ...cub(at(0.92, -0.02), at(1.05, -0.6), at(0.4, -0.75), at(0, 0), 7).slice(1)];
    pen.fill(leaf, CLOVER, 0.55);
    pen.crescent(leaf, pt(-1, -1.5), () => pen.fill(leaf, mix(CLOVER, d.ink, 0.4), 0.3));
    pen.hair([at(0.35, 0.3), at(0.55, 0), at(0.35, -0.3)], 0.6, PAPER_FILL, 0.55);
    pen.hair(closed(leaf), 0.45, d.ink, 0.5);
  }
}

/** A fallen leaf: an ovate blade with a midrib and veins, and its shadow. */
function fallen(d: Draw, c: Pt, len: number, ang: number, colour: string): void {
  const { pen } = d;
  const dir = pt(Math.cos(ang), Math.sin(ang));
  const nrm = pt(-dir.y, dir.x);
  const at = (a: number, b: number): Pt => pt(c.x + dir.x * a * len + nrm.x * b * len, c.y + dir.y * a * len + nrm.y * b * len);
  const blade = [...cub(at(-0.5, 0), at(-0.35, 0.36), at(0.25, 0.32), at(0.5, 0), 12), ...cub(at(0.5, 0), at(0.25, -0.3), at(-0.35, -0.34), at(-0.5, 0), 12).slice(1)];
  pen.fill(blade.map((p) => pt(p.x + 2.5, p.y + 3.5)), d.ink, 0.07);
  pen.fill(blade, PAPER_FILL, 0.9);
  pen.fill(blade, colour, 0.6);
  pen.crescent(blade, pt(-2, -3), () => pen.fill(blade, mix(colour, d.ink, 0.45), 0.3));
  pen.hair([at(-0.62, 0), at(0.45, 0)], 0.6, d.ink, 0.55);
  for (let k = -2; k <= 2; k++) {
    if (k === 0) continue;
    const a = 0.12 * k;
    pen.hair([at(a, 0), at(a + 0.16, 0.22 * Math.sign(k))], 0.35, d.ink, 0.35);
    pen.hair([at(a, 0), at(a + 0.16, -0.22 * Math.sign(k))], 0.35, d.ink, 0.35);
  }
  pen.stroke(closed(blade), 0.7, d.ink, 0.65, false);
}

/** A pebble with its shadow. */
function pebble(d: Draw, c: Pt, r: number, rng: Rng): void {
  const { pen } = d;
  const shape = oval(c.x, c.y, r * (1 + rng() * 0.4), r, 14);
  pen.fill(shape.map((p) => pt(p.x + r * 0.35, p.y + r * 0.5)), d.ink, 0.12);
  pen.fill(shape, PAPER_FILL, 1);
  pen.fill(shape, mix(STONE, STONE_DARK, rng()), 0.55);
  pen.crescent(shape, pt(-r * 0.35, -r * 0.5), () => pen.fill(shape, STONE_DARK, 0.4));
  pen.hair(closed(shape), 0.5, d.ink, 0.6);
}

/** The garden page: see the module comment. */
export function paintGarden(d: Draw, w: number, h: number): void {
  const { pen } = d;
  const { ctx } = pen;
  const rng = createRng(5150);
  const edge = edgenessOf(w, h);
  ctx.save();
  ctx.fillStyle = PAPER;
  ctx.fillRect(0, 0, w, h);
  ctx.globalAlpha = 0.5;
  ctx.fillStyle = JOINT;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
  const stones = layStones(rng, w, h);
  for (const s of stones) paintStone(d, s, rng, edge);
  joints(d, stones, rng, edge);
  // Pebbles, gathered at the edges.
  for (let i = 0; i < 46; i++) {
    const x = rng() * w;
    const y = rng() * h;
    if (rng() > edge(x, y) * 1.1) continue;
    pebble(d, pt(x, y), 2 + rng() * 3.5, rng);
  }
  // Clover creeping along the left and bottom edges.
  for (const [x, y, n] of [[40, 420, 7], [70, 640, 9], [260, 690, 6], [700, 700, 5], [1230, 600, 6], [30, 180, 4]] as const) {
    for (let k = 0; k < n; k++) {
      const c = pt(x + (rng() - 0.5) * 80, y + (rng() - 0.5) * 50);
      pen.hair(bezier(pt(c.x - 6, c.y + 12), pt(c.x - 3, c.y + 6), c, 4), 0.5, mix(CLOVER, d.ink, 0.4), 0.6);
      clover(d, c, 7 + rng() * 4, rng() * TAU);
    }
  }
  // Fallen leaves near the edges.
  for (const [x, y, l, a] of [[150, 60, 34, 0.6], [1120, 90, 30, 2.4], [1210, 300, 26, -0.8], [90, 300, 28, 1.9], [420, 690, 30, -0.3], [980, 650, 32, 0.9], [640, 22, 24, 2.9], [1250, 520, 22, 0.2]] as const) {
    fallen(d, pt(x, y), l, a, FALL[Math.floor(rng() * FALL.length)]!);
  }
  // Ferns spilling in from the corners.
  fern(d, pt(-20, -20), 0.75, 1.3, 210);
  fern(d, pt(w + 20, h + 20), -2.4, 1.2, 200);
  fern(d, pt(w + 30, -10), 2.3, 0.9, 150);
  fern(d, pt(-25, h + 10), -0.65, 0.8, 140);
}
