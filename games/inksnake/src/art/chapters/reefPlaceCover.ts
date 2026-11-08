import type { Rng } from '../../logic/rng';
import type { CoverDef } from '../../level/types';
import type { Pt } from '../../logic/vec';
import { blob, polar, SHADOW } from '../groundKit';
import { closed, type Draw, pt, TAU } from '../kit';
import { PAPER_FILL } from '../palette';
import { specks } from '../places/farmGroundParts';
import { mix, rgba } from '../wash';
import { DEEP_DARK, glazeAt, rngAt } from './reefPlaceKit';

/**
 * The reef's cover, painted on the layer over the snake: a meadow of
 * seagrass (long ribbon blades all combed one way by the current, green
 * with yellowed, furred tips) and a thicket of sea fans and sea whips
 * (lacy purple and red fans, seen from above as they lean in the swell,
 * among orange whips). Each stays inside about r × 1.15 of its centre,
 * opaque at its heart, its edge ragged, lit from the upper left.
 */
const REACH = 1.15;

const GRASS = '#4f8a4f';
const GRASS_DEEP = '#2d5a3d';
const GRASS_LIT = '#9cc46a';
const GRASS_OLD = '#c9bf72';
const FAN = ['#8b4a8c', '#b2434a', '#9a5aa8', '#c4583e'] as const;
const WHIP = '#de8a3a';

/** A blade's outline: a long ribbon from its root, curving with the current, tapering to a rounded tip. */
function bladePath(ctx: CanvasRenderingContext2D, root: Pt, a: number, l: number, w: number, bend: number): void {
  const tip = polar(root, a, l);
  const mid = polar(polar(root, a, l * 0.5), a + Math.PI / 2, bend);
  const n = pt(-Math.sin(a), Math.cos(a));
  ctx.moveTo(root.x + n.x * w, root.y + n.y * w);
  ctx.quadraticCurveTo(mid.x + n.x * w, mid.y + n.y * w, tip.x, tip.y);
  ctx.quadraticCurveTo(mid.x - n.x * w, mid.y - n.y * w, root.x - n.x * w, root.y - n.y * w);
  ctx.closePath();
}

interface Blade {
  readonly root: Pt;
  readonly a: number;
  readonly l: number;
  readonly w: number;
  readonly bend: number;
  readonly colour: string;
}

/** One layer of blades: their shadows on what's under, then each blade, a yellowed tip on some, a fine midline. */
function bladeLayer(d: Draw, blades: readonly Blade[], lift: number): void {
  const { ctx } = d.pen;
  ctx.save();
  ctx.fillStyle = rgba(DEEP_DARK, 0.3);
  ctx.beginPath();
  for (const b of blades) bladePath(ctx, pt(b.root.x + SHADOW.x * lift, b.root.y + SHADOW.y * lift), b.a, b.l, b.w, b.bend);
  ctx.fill();
  for (const b of blades) {
    const g = ctx.createLinearGradient(b.root.x, b.root.y, polar(b.root, b.a, b.l).x, polar(b.root, b.a, b.l).y);
    g.addColorStop(0, mix(b.colour, GRASS_DEEP, 0.4));
    g.addColorStop(0.55, b.colour);
    g.addColorStop(1, b.l > 22 ? GRASS_OLD : mix(b.colour, GRASS_LIT, 0.5));
    ctx.fillStyle = g;
    ctx.beginPath();
    bladePath(ctx, b.root, b.a, b.l, b.w, b.bend);
    ctx.fill();
  }
  ctx.lineWidth = 0.35;
  ctx.strokeStyle = rgba(PAPER_FILL, 0.35);
  ctx.beginPath();
  for (const b of blades) {
    const m = polar(polar(b.root, b.a, b.l * 0.5), b.a + Math.PI / 2, b.bend * 0.9);
    const t = polar(b.root, b.a, b.l * 0.9);
    ctx.moveTo(b.root.x, b.root.y);
    ctx.quadraticCurveTo(m.x, m.y, t.x, t.y);
  }
  ctx.stroke();
  ctx.lineWidth = 0.45;
  ctx.strokeStyle = rgba(d.ink, 0.5);
  ctx.beginPath();
  for (const b of blades) bladePath(ctx, b.root, b.a, b.l, b.w, b.bend);
  ctx.stroke();
  ctx.restore();
}

/** A seagrass meadow: a dark mat of roots and old blades, then layer on layer of ribbons combed by the current. */
function seagrass(d: Draw, c: CoverDef, rng: Rng): void {
  const { pen } = d;
  const ctr = pt(c.x, c.y);
  const current = rng() * TAU;
  const mat = blob(polar(ctr, current, c.r * 0.12), c.r * 0.8, c.r * 0.74, rng, 0.22, 30, rng() * TAU);
  pen.fill(mat, GRASS_DEEP, 0.96);
  pen.crescent(mat, pt(SHADOW.x * c.r * 0.3, SHADOW.y * c.r * 0.3), () => pen.fill(mat, '#1f3d2c', 0.4));
  specks(d, '#1f3d2c', 0.5, Array.from({ length: Math.round(c.r * 4) }, () => {
    const q = polar(ctr, rng() * TAU, Math.sqrt(rng()) * c.r * 0.9);
    return [q.x, q.y, 0.5 + rng() * 0.9] as const;
  }));
  for (let layer = 0; layer < 3; layer++) {
    const blades: Blade[] = Array.from({ length: Math.round(c.r * (1.6 - layer * 0.3)) }, () => {
      const k = Math.sqrt(rng());
      const root = polar(polar(ctr, rng() * TAU, k * c.r * 0.8), current + Math.PI, c.r * 0.2);
      const l = 16 + rng() * 16;
      // Combed downstream, splaying outwards towards the rim (so the meadow's edge is ragged), kept inside the reach.
      const out = Math.atan2(root.y - ctr.y, root.x - ctr.x);
      const v = pt(Math.cos(current) + Math.cos(out) * k * 0.45, Math.sin(current) + Math.sin(out) * k * 0.45);
      const a = Math.atan2(v.y, v.x) + (rng() - 0.5) * 0.5;
      const ahead = (root.x - ctr.x) * Math.cos(a) + (root.y - ctr.y) * Math.sin(a);
      const room = Math.max(6, c.r * REACH - ahead - 2);
      return {
        root, a, l: Math.min(l, room), w: 1.1 + rng() * 0.6, bend: (rng() - 0.5) * 8,
        colour: mix(GRASS, layer === 2 ? GRASS_LIT : GRASS_DEEP, rng() * 0.5),
      };
    });
    bladeLayer(d, blades, 2.5 - layer * 0.6);
  }
  glazeAt(pen.ctx, c.x - c.r * 0.35, c.y - c.r * 0.35, c.r * 0.6, c.r * 0.5, 0, PAPER_FILL, 0.16);
}

/** One sea fan leaning in the swell: a flattened lacy oval, a thin wash through which the sand shows, its branching net in fine line, a darker stem at its base. */
function seaFan(d: Draw, base: Pt, a: number, size: number, colour: string, rng: Rng): void {
  const { pen } = d;
  const ctr = polar(base, a, size * 0.55);
  const shape = blob(ctr, size * 0.6, size * 0.26, rng, 0.14, 22, a);
  const deep = mix(colour, d.ink, 0.5);
  pen.fill(shape.map((p) => pt(p.x + SHADOW.x * 3, p.y + SHADOW.y * 3)), DEEP_DARK, 0.22);
  pen.fill(shape, colour, 0.55);
  pen.clipped(shape, () => {
    // The net: branches fanning out from the stem and forking, crossed by finer joins, the holes between them pale.
    for (let k = 0; k < 13; k++) {
      const t = a + (k / 12 - 0.5) * 1.3;
      const mid = polar(base, t, size * (0.45 + rng() * 0.2));
      pen.hair([base, mid, polar(base, t + (rng() - 0.5) * 0.15, size * 1.2)], 0.55, deep, 0.85);
      pen.hair([mid, polar(mid, t + (rng() < 0.5 ? 0.3 : -0.3), size * 0.6)], 0.4, deep, 0.7);
    }
    for (let k = 0; k < 40; k++) {
      const r = size * (0.2 + rng() * 0.95);
      const t = a + (rng() - 0.5) * 1.2;
      pen.hair([polar(base, t - 0.08, r), polar(base, t + 0.08, r * 1.02)], 0.35, deep, 0.6);
    }
    glazeAt(pen.ctx, ctr.x - size * 0.15, ctr.y - size * 0.12, size * 0.4, size * 0.2, a, mix(colour, '#ffffff', 0.5), 0.4);
  });
  pen.hair(closed(shape), 0.55, deep, 0.8);
  pen.hair([base, polar(base, a, size * 0.25)], 1.4, deep, 0.95);
}

/** A thicket of sea fans and whips: a dark base of soft coral and rock, whips curling up through it, fans leaning outwards over all. */
function coralFan(d: Draw, c: CoverDef, rng: Rng): void {
  const { pen } = d;
  const ctr = pt(c.x, c.y);
  const base = blob(ctr, c.r * 0.92, c.r * 0.85, rng, 0.25, 30, rng() * TAU);
  pen.fill(base, '#5b5248', 0.97);
  pen.crescent(base, pt(-SHADOW.x * c.r * 0.3, -SHADOW.y * c.r * 0.3), () => pen.fill(base, DEEP_DARK, 0.4));
  // Soft corals crowding the rock: olive and fawn lumps furred with polyps.
  for (let k = 0; k < 7; k++) {
    const p = polar(ctr, rng() * TAU, Math.sqrt(rng()) * c.r * 0.7);
    const lump = blob(p, c.r * (0.16 + rng() * 0.12), c.r * 0.14, rng, 0.3, 16, rng() * TAU);
    const tone = rng() < 0.5 ? '#9a9a62' : '#c4a27a';
    pen.fill(lump, tone, 0.9);
    pen.crescent(lump, pt(-SHADOW.x * 3, -SHADOW.y * 3), () => pen.fill(lump, DEEP_DARK, 0.35));
    specks(d, mix(tone, '#ffffff', 0.5), 0.6, Array.from({ length: 18 }, () => {
      const q = polar(p, rng() * TAU, Math.sqrt(rng()) * c.r * 0.15);
      return [q.x, q.y, 0.35 + rng() * 0.3] as const;
    }));
    pen.hair(closed(lump), 0.45, d.ink, 0.5);
  }
  const { ctx } = pen;
  ctx.save();
  ctx.lineCap = 'round';
  for (const [colour, w] of [[rgba(DEEP_DARK, 0.35), 2.4], [WHIP, 1.7], [mix(WHIP, '#fff0c0', 0.5), 0.6]] as const) {
    ctx.strokeStyle = colour;
    ctx.lineWidth = w;
    ctx.beginPath();
    const wr = rngAt(c.x, c.y, 21);
    for (let k = 0; k < 9; k++) {
      const a = wr() * TAU;
      const p0 = polar(ctr, a, wr() * c.r * 0.4);
      const p1 = polar(p0, a + (wr() - 0.5), c.r * (0.4 + wr() * 0.4));
      const m = polar(polar(p0, a, c.r * 0.3), a + Math.PI / 2, (wr() - 0.5) * 12);
      const off = colour === WHIP ? 0 : colour.startsWith('rgba') ? 2 : -0.4;
      ctx.moveTo(p0.x + off, p0.y + off);
      ctx.quadraticCurveTo(m.x + off, m.y + off, p1.x + off, p1.y + off);
    }
    ctx.stroke();
  }
  ctx.restore();
  // The fans all lean the one way, into the swell, rooted across the thicket, the upstream ones painted first.
  const swell = rng() * TAU;
  const fans = 9 + Math.floor(rng() * 4);
  const roots = Array.from({ length: fans }, () => polar(polar(ctr, rng() * TAU, Math.sqrt(rng()) * c.r * 0.55), swell + Math.PI, c.r * 0.25));
  roots.sort((p, q) => (p.x - q.x) * Math.cos(swell) + (p.y - q.y) * Math.sin(swell));
  for (const at of roots) seaFan(d, at, swell + (rng() - 0.5) * 0.9, c.r * (0.4 + rng() * 0.25), FAN[Math.floor(rng() * FAN.length)]!, rng);
}

export function paintReefCover(d: Draw, c: CoverDef): void {
  const rng = rngAt(c.x, c.y, 13);
  if (c.look === 'coral-fan') return coralFan(d, c, rng);
  seagrass(d, c, rng);
}
