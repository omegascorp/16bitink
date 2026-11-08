import { INK, pathOf, Pen, type Pt } from '../../../../../src/art/pen';
import { createRng } from '../../../../../src/logic/rng';
import { type Box, closed, cub, frac, glow, lerp, line, oval, Plate, pt, ribbon, shadeY, SHINE, TAU } from './ink';

/**
 * Diatoms: a centric one, a glass pillbox at three quarters with an etched
 * radial pattern of pores and golden chloroplasts glowing through, and a
 * pennate one, a glass boat with a raphe down its middle.
 */
const GLASS = '#dff6f1';
const PLASTID = '#b98330';
const PLASTID_DEEP = '#7a5218';

/** Centric valve radius, how flat the face looks at three quarters (ry/rx), and the girdle's visible height. */
const CENTRIC = { r: 48, tilt: 0.5, h: 18 } as const;
const SECTORS = 8;
/** The face pattern repeats every 1/8 turn, so baking one period of spin covers all of it. */
export const CENTRIC_PERIOD = TAU / SECTORS;
export const CENTRIC_BOX: Box = { x0: -54, x1: 54, y0: -40, y1: 40 };
export const PENNATE_BOX: Box = { x0: -54, x1: 54, y0: -18, y1: 32 };

interface Pore {
  readonly r: number;
  readonly a: number;
  readonly s: number;
}

/** Radial rows of pores that branch as the face widens: 8 rows at the centre, 64 at the rim. */
const PORES: readonly Pore[] = (() => {
  const out: Pore[] = Array.from({ length: 8 }, (_, i) => ({ r: 3.6, a: (i / 8) * TAU, s: 1.05 }));
  const bands = [
    { n: 16, r0: 6.2, r1: 10.5 },
    { n: 32, r0: 10.5, r1: 19 },
    { n: 64, r0: 19, r1: 33 },
    { n: 128, r0: 33, r1: 45.2 },
  ];
  for (const { n, r0, r1 } of bands) {
    for (let row = 0; row < n; row++) {
      for (let r = r0; r < r1; ) {
        const gap = (TAU * r) / n;
        out.push({ r, a: (row / n) * TAU, s: gap * 0.33 });
        r += gap * 0.9;
      }
    }
  }
  return out;
})();

interface Plastid {
  readonly r: number;
  readonly a: number;
  readonly z: number;
  readonly size: number;
  readonly rot: number;
}

/** Chloroplasts inside the cell: one sector laid out at random, repeated round the cell. */
const PLASTIDS: readonly Plastid[] = (() => {
  const rng = createRng(5151);
  const one = Array.from({ length: 14 }, () => ({
    r: CENTRIC.r * Math.sqrt(0.05 + rng() * 0.85),
    a: rng() * CENTRIC_PERIOD,
    z: CENTRIC.h * (0.12 + rng() * 0.7),
    size: 1.5 + rng() * 1.3,
    rot: rng() * Math.PI,
  }));
  return Array.from({ length: SECTORS }, (_, s) => one.map((p) => ({ ...p, a: p.a + s * CENTRIC_PERIOD }))).flat();
})();

/** Wall radius at depth z below the face: the base valve sits just inside the lid. */
const wallR = (z: number): number => (z < CENTRIC.h * 0.52 ? CENTRIC.r : CENTRIC.r - 1.4);
/** A point on the cell (r, angle, depth z below the face) seen at three quarters, in units. */
const cproj = (r: number, a: number, z: number): Pt => pt(r * Math.cos(a), -CENTRIC.h / 2 + z + r * Math.sin(a) * CENTRIC.tilt);
const ring = (r: number, z: number, a0: number, a1: number, n: number): Pt[] => Array.from({ length: n + 1 }, (_, i) => cproj(r, a0 + ((a1 - a0) * i) / n, z));

function centricShapes(): { face: Pt[]; outline: Pt[] } {
  const { r, h } = CENTRIC;
  const face = ring(r, 0, 0, TAU, 48).slice(0, -1);
  const outline = [...ring(r, 0, Math.PI, TAU, 24), ...ring(r, h * 0.52, 0, 0, 0), ...ring(r - 1.4, h * 0.52, 0, 0, 0), ...ring(r - 1.4, h, 0, Math.PI, 24), ...ring(r - 1.4, h * 0.52, Math.PI, Math.PI, 0), ...ring(r, h * 0.52, Math.PI, Math.PI, 0)];
  return { face, outline };
}
const CENTRIC_SHAPES = centricShapes();

export function paintCentric(pl: Plate, spin: number): void {
  const { ctx, k } = pl;
  const { r, h } = CENTRIC;
  const pen = pl.pen(1, 0.7);
  const face = pl.m(CENTRIC_SHAPES.face);
  const body = pl.m(CENTRIC_SHAPES.outline);
  // Glass: barely there, brighter at the walls' edges like a jar.
  pen.fill(body, GLASS, 0.22);
  ctx.save();
  pathOf(ctx, body);
  ctx.clip();
  const g = ctx.createLinearGradient(-r * k, 0, r * k, 0);
  g.addColorStop(0, 'rgba(255,255,255,0.5)');
  g.addColorStop(0.1, 'rgba(210,240,236,0.08)');
  g.addColorStop(0.6, 'rgba(60,110,110,0.04)');
  g.addColorStop(0.9, 'rgba(60,110,110,0.14)');
  g.addColorStop(1, 'rgba(255,255,255,0.4)');
  ctx.fillStyle = g;
  ctx.fillRect(-r * k - 4, -40 * k, 2 * r * k + 8, 80 * k);
  // The living cell glowing gold inside.
  ctx.save();
  ctx.translate(0, pl.p(0, 0).y);
  ctx.scale(1, 0.78);
  glow(ctx, pt(0, 0), r * k * 0.95, 'rgba(214,158,58,0.5)', 'rgba(214,158,58,0.04)');
  ctx.restore();
  ctx.restore();
  // The back rim of the base valve, seen through the glass.
  pen.hair(pl.m(ring(r - 1.4, h, Math.PI, TAU, 28)), pl.fine, INK, 0.22);
  paintPlastids(pl, spin);
  paintGirdle(pl);
  paintFace(pl, face, spin);
  paintGlassLights(pl, face);
  // Outline: crisp but not heavy, glass not tin.
  const ink = pl.pen(9);
  ink.stroke(closed(face), pl.line * 0.75, INK, 0.85, true);
  ink.stroke(pl.m([cproj(r, 0, 0), cproj(r, 0, h * 0.52)]), pl.line * 0.7, INK, 0.8, false);
  ink.stroke(pl.m([cproj(-r, 0, 0), cproj(-r, 0, h * 0.52)]), pl.line * 0.7, INK, 0.8, false);
  ink.stroke(pl.m(ring(r, h * 0.52, 0, Math.PI, 28)), pl.line * 0.6, INK, 0.75, false);
  ink.stroke(pl.m([cproj(r - 1.4, 0, h * 0.52), cproj(r - 1.4, 0, h)]), pl.line * 0.65, INK, 0.8, false);
  ink.stroke(pl.m([cproj(-(r - 1.4), 0, h * 0.52), cproj(-(r - 1.4), 0, h)]), pl.line * 0.65, INK, 0.8, false);
  ink.stroke(pl.m(ring(r - 1.4, h, 0, Math.PI, 28)), pl.line * 0.8, INK, 0.9, false);
}

function paintPlastids(pl: Plate, spin: number): void {
  const { ctx, k } = pl;
  const pen = pl.pen(2, 0.5);
  for (const p of PLASTIDS) {
    const c = pl.at(cproj(p.r, p.a + spin, p.z));
    const disc = oval(c, p.size * k, p.size * k * 0.6, p.rot, 14);
    if (!pl.has(40)) {
      pen.fill(disc, PLASTID, 0.4);
      continue;
    }
    // A soft golden lens, deeper at its heart, with no hard edge but a faint pencilled rim.
    ctx.save();
    ctx.translate(c.x, c.y);
    ctx.rotate(p.rot);
    ctx.scale(1, 0.75);
    glow(ctx, pt(0, 0), p.size * k * 1.15, 'rgba(206,146,48,0.6)', 'rgba(232,184,90,0)');
    ctx.restore();
    if (pl.has(160)) pen.hair(closed(disc).slice(0, 10), pl.fine * 0.6, PLASTID_DEEP, 0.22);
  }
}

/** Bands round the girdle and the step where the lid overlaps the base. */
function paintGirdle(pl: Plate): void {
  const { r, h } = CENTRIC;
  const pen = pl.pen(3, 0.6);
  for (const z of [0.18, 0.34, 0.68, 0.84]) pen.hair(pl.m(ring(wallR(z * h), z * h, 0.02, Math.PI - 0.02, 28)), pl.fine * 0.8, INK, 0.2);
  // The lid's rim: glass thickness under the face edge, then the step.
  pen.hair(pl.m(ring(r, 1.8, 0.03, Math.PI - 0.03, 32)), pl.fine * 1.1, INK, 0.45);
  pen.hair(pl.m(ring(r, 1.0, 0.1, Math.PI - 0.1, 32)), pl.fine * 1.6, SHINE, 0.7);
  pen.hair(pl.m(ring(r - 0.6, h * 0.52 - 0.8, 0.08, Math.PI - 0.08, 32)), pl.fine * 1.5, SHINE, 0.55);
  if (pl.has(90)) {
    // The wall turning away from the light: hatching that follows the cylinder.
    for (let i = 0; i < 14; i++) {
      const a = 0.02 + (i / 14) * 0.34;
      pen.hair(pl.m([cproj(wallR(1.5), a, 2.2), cproj(wallR(h * 0.5), a, h * 0.5 - 0.6)]), pl.fine * 0.8, INK, 0.22 * (1 - i / 14));
      pen.hair(pl.m([cproj(wallR(h * 0.55), a, h * 0.55 + 0.6), cproj(wallR(h), a, h - 0.6)]), pl.fine * 0.8, INK, 0.22 * (1 - i / 14));
    }
  }
  if (!pl.has(200)) return;
  // Fine vertical striae on the bands.
  for (let i = 1; i < 60; i++) {
    const a = (i / 60) * Math.PI;
    const z0 = i % 2 ? 2.6 : h * 0.55;
    const z1 = i % 2 ? h * 0.48 : h - 1;
    pen.hair(pl.m([cproj(wallR(z0), a, z0), cproj(wallR(z1), a, z1)]), pl.fine * 0.5, INK, 0.05);
  }
}

/** The etched valve face: radial rows of pores round a central rosette, a striated rim with small spines. */
function paintFace(pl: Plate, face: readonly Pt[], spin: number): void {
  const { ctx, k } = pl;
  const { r } = CENTRIC;
  const pen = pl.pen(4, 0.6);
  pen.fill(face, '#f4fffc', 0.22);
  pen.clipped(face, () => {
    // Facing up to the light: brighter at the back, a little shadow at the front lip.
    shadeY(ctx, face, pl.p(0, -34).y, pl.p(0, 16).y, [[0, 'rgba(255,255,255,0.3)'], [0.6, 'rgba(255,255,255,0)'], [1, 'rgba(40,80,80,0.12)']]);
    if (pl.has(140)) pores(pl, pen, spin);
    else if (pl.has(40)) {
      for (let i = 0; i < 32; i++) pen.hair(pl.m([cproj(6, (i / 32) * TAU + spin, 0), cproj(r - 3, (i / 32) * TAU + spin, 0)]), pl.fine * 0.6, INK, 0.28);
    }
    if (pl.has(60)) {
      pen.hair(pl.m(ring(r - 2.6, 0, 0, TAU, 48)), pl.fine * 0.8, INK, 0.35);
      pen.hair(pl.m(ring(2.2, 0, 0, TAU, 12)), pl.fine * 0.8, INK, 0.4);
    }
    if (pl.has(160)) {
      for (let i = 0; i < 144; i++) {
        const a = (i / 144) * TAU + spin;
        pen.hair(pl.m([cproj(r - 2.5, a, 0), cproj(r - 0.4, a, 0)]), pl.fine * 0.45, INK, 0.25);
      }
      for (let i = 0; i < 16; i++) {
        const q = pl.at(cproj(r - 3.4, (i / 16) * TAU + spin + 0.1, 0));
        pen.dot(q.x, q.y, 0.45 * k, INK, 0.4);
      }
    }
  });
}

function pores(pl: Plate, pen: Pen, spin: number): void {
  const { ctx, k } = pl;
  const { tilt } = CENTRIC;
  const hex = pl.has(420);
  const shapeOf = (c: Pt, s: number, a: number): void => {
    if (!hex) {
      ctx.moveTo(c.x + s, c.y);
      ctx.ellipse(c.x, c.y, s, s * tilt, 0, 0, TAU);
      return;
    }
    for (let i = 0; i <= 6; i++) {
      const q = a + (i / 6) * TAU;
      const x = c.x + Math.cos(q) * s;
      const y = c.y + Math.sin(q) * s * tilt;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
  };
  const centres = PORES.map((p) => {
    const c = pl.at(cproj(p.r, p.a + spin, 0));
    return { c: pt(c.x + pen.jitter(0.25), c.y + pen.jitter(0.25)), s: p.s * k, a: p.a + spin };
  });
  ctx.save();
  ctx.beginPath();
  for (const { c, s, a } of centres) shapeOf(c, s, a);
  ctx.fillStyle = 'rgba(34,50,56,0.3)';
  ctx.fill();
  // The thin floor of each pore (the sieve plate) catching light.
  ctx.beginPath();
  for (const { c, s, a } of centres) shapeOf(pt(c.x + s * 0.16, c.y + s * 0.12), s * 0.62, a);
  ctx.fillStyle = 'rgba(236,252,248,0.42)';
  ctx.fill();
  if (pl.has(500)) {
    ctx.lineWidth = pl.fine * 0.5;
    ctx.strokeStyle = 'rgba(27,26,31,0.35)';
    ctx.beginPath();
    for (const { c, s, a } of centres) shapeOf(c, s, a);
    ctx.stroke();
  }
  ctx.restore();
}

/** The glass catching the sun: a glare across the face, the rim lit, bright strips down the walls. */
function paintGlassLights(pl: Plate, face: readonly Pt[]): void {
  const { ctx, k } = pl;
  const { r, h } = CENTRIC;
  const pen = pl.pen(5, 0.5);
  ctx.save();
  pathOf(ctx, face);
  ctx.clip();
  ctx.translate(...xy(pl.p(-16, -16)));
  ctx.rotate(-0.32);
  ctx.scale(1, 0.16);
  glow(ctx, pt(0, 0), 30 * k, 'rgba(255,255,255,0.38)', 'rgba(255,255,255,0)');
  ctx.restore();
  pen.hair(pl.m(ring(r - 1.2, 0, 0.15 * Math.PI, 0.9 * Math.PI, 30)), pl.fine * 2.2, SHINE, 0.75);
  pen.hair(pl.m(ring(r - 1.6, 0, 1.15 * Math.PI, 1.55 * Math.PI, 20)), pl.fine * 1.6, SHINE, 0.55);
  if (pl.has(60)) pen.hair(pl.m(cub(pt(-30, -20), pt(-20, -27), pt(-6, -29), pt(6, -29.5), 10)), pl.fine * 1.4, SHINE, 0.6);
  for (const [a0, a1, alpha] of [[0.76, 0.81, 0.55], [0.18, 0.2, 0.35]] as const) {
    const strip = pl.m([cproj(wallR(2), a0 * Math.PI, 2.5), cproj(wallR(2), a1 * Math.PI, 2.5), cproj(wallR(h), a1 * Math.PI, h - 1), cproj(wallR(h), a0 * Math.PI, h - 1)]);
    pen.fill(strip, SHINE, alpha);
  }
  // A star of glare where the rim faces the sun.
  if (pl.has(100)) {
    const s = pl.at(cproj(r - 0.8, 0.82 * Math.PI, 0));
    const len = Math.max(3, 4 * k);
    pen.hair([pt(s.x - len, s.y), pt(s.x + len, s.y)], pl.fine * 1.2, SHINE, 0.9);
    pen.hair([pt(s.x, s.y - len * 0.7), pt(s.x, s.y + len * 0.7)], pl.fine * 1.2, SHINE, 0.9);
  }
}

const xy = (p: Pt): [number, number] => [p.x, p.y];

/** Half width of the pennate valve at x (units). */
const penW = (x: number): number => 12.5 * Math.pow(Math.max(0, 1 - Math.abs(x / 50) ** 2.3), 0.6);
const PENNATE_DEPTH = 13;
/** Rolled `s` (0 valve view .. pi/2 girdle view): the face narrows and the girdle band turns into view below it. */
export function paintPennate(pl: Plate, s: number): void {
  const { ctx, k } = pl;
  const c = Math.max(0.1, Math.cos(s));
  const sn = Math.sin(s);
  const xs = Array.from({ length: 41 }, (_, i) => -50 + i * 2.5);
  const faceTop = xs.map((x) => pt(x, -penW(x) * c));
  const faceBot = xs.map((x) => pt(x, penW(x) * c));
  const girdleBot = xs.map((x) => pt(x, penW(x) * c + PENNATE_DEPTH * sn * Math.pow(Math.max(0, 1 - Math.abs(x / 50) ** 6), 0.5)));
  const body = pl.m([...faceTop, ...[...girdleBot].reverse()]);
  const face = pl.m([...faceTop, ...[...faceBot].reverse()]);
  const pen = pl.pen(1, 0.7);
  pen.fill(body, GLASS, 0.24);
  pen.clipped(body, () => {
    ctx.save();
    ctx.scale(1, 0.4);
    glow(ctx, pl.p(0, (8 * sn) / 0.4), 46 * k, 'rgba(214,158,58,0.35)', 'rgba(214,158,58,0)');
    ctx.restore();
    // Two golden plates along the sides.
    for (const side of [-1, 1]) {
      const y = side * 5.6 * c + (side > 0 ? PENNATE_DEPTH * sn * 0.5 : 0);
      const plate = pl.m(ribbon(line(pt(-37, y), pt(37, y), 12), (u) => (4.4 * c + 2.6 * sn) * Math.sin(Math.PI * u) ** 0.5).shape);
      pen.fill(plate, PLASTID, 0.45);
      if (pl.has(120)) pen.hair(closed(plate), pl.fine * 0.7, PLASTID_DEEP, 0.4);
    }
    if (sn > 0.05) {
      for (const f of [0.3, 0.55, 0.8]) pen.hair(pl.m(xs.slice(2, -2).map((x) => pt(x, penW(x) * c + PENNATE_DEPTH * sn * f))), pl.fine * 0.7, INK, 0.28);
    }
  });
  if (c > 0.2) pennateFace(pl, face, c);
  // Sheen along the top edge and the lit end.
  const lit = pl.pen(5, 0.5);
  lit.hair(pl.m(faceTop.slice(4, -8).map((p) => pt(p.x, p.y + 1.3))), pl.fine * 1.8, SHINE, 0.7);
  if (sn > 0.05) lit.hair(pl.m(faceBot.slice(6, -6).map((p) => pt(p.x, p.y + 1))), pl.fine * 1.3, SHINE, 0.5);
  const ink = pl.pen(9);
  ink.stroke(closed(body), pl.line * 0.8, INK, 0.85, true);
  if (sn > 0.05 && c > 0.12) ink.hair(pl.m(faceBot.slice(1, -1)), pl.fine * 1.2, INK, 0.6);
}

function pennateFace(pl: Plate, face: readonly Pt[], c: number): void {
  const pen = pl.pen(4, 0.6);
  pen.fill(face, '#f4fffc', 0.18);
  pen.clipped(face, () => {
    if (!pl.has(40)) return;
    // Rows of pores across the valve, radiating a little from the middle.
    const step = pl.has(140) ? 2.3 : 4.6;
    for (let x = -45; x <= 45.01; x += step) {
      if (Math.abs(x) < 3.5) continue;
      for (const side of [-1, 1]) {
        const a = pt(x, side * 2.4 * c);
        const b = pt(x * 1.05 + Math.sign(x) * 0.8, side * (penW(x) - 0.8) * c);
        if (pl.has(360)) {
          const n = Math.max(2, Math.round(Math.hypot(b.x - a.x, (b.y - a.y) / c) / 1.15));
          for (let i = 0; i <= n; i++) {
            const q = pl.at(lerp(a, b, i / n));
            pen.dot(q.x, q.y, 0.42 * pl.k, INK, 0.45);
          }
        } else pen.hair(pl.m([a, b]), pl.fine * 0.6, INK, 0.32);
      }
    }
  });
  // The raphe: a slit down the middle, broken by the central nodule, hooked at the ends.
  const raphe = pl.pen(6, 0.4);
  for (const side of [-1, 1]) {
    const slit = [pt(side * 3.4, 0), pt(side * 24, 0.25 * c), pt(side * 45, 0)];
    raphe.hair(pl.m(slit), pl.fine * 1.2, INK, 0.8);
    if (pl.has(100)) raphe.hair(pl.m(slit.map((p) => pt(p.x, p.y + 0.55))), pl.fine * 0.7, SHINE, 0.6);
    raphe.hair(pl.m(cub(pt(side * 44, 0), pt(side * 46.5, 0), pt(side * 47, -1.4 * c), pt(side * 46, -2.2 * c), 5)), pl.fine * 1.1, INK, 0.75);
  }
  const nodule = pl.m(oval(pt(0, 0), 2.6, 2.2 * c, 0, 14));
  raphe.fill(nodule, SHINE, 0.5);
  raphe.hair(closed(nodule), pl.fine, INK, 0.55);
}

/** A pennate diatom's roll folded to 0..pi/2 (it looks the same each quarter turn, mirrored). */
export const foldRoll = (spin: number): number => {
  const s = frac(spin / Math.PI) * Math.PI;
  return s > Math.PI / 2 ? Math.PI - s : s;
};
