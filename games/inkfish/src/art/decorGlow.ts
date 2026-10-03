import { createRng } from '../logic/rng';
import { halo } from './glowArt';
import { INK, type Pt } from './pen';
import { clip, dots, type Draw, frame, hair, ink, lerp, lump, oval, paint, puff, qb, ribbon, ring, S, SHADOW, SMOKE, TAU } from './decorKit';

/**
 * Deep-sea scenery that makes its own light, each with a glow layer the game
 * lays over it in the dark zones (see scenes/game/deepLight.ts):
 *
 * - umbellula: a deep-sea pen, a whip-thin stalk with a crown of polyps.
 *   Sea pens are animals, but they stand on the seabed like plants and
 *   flash green-blue when touched.
 * - bamboocoral: a white branching coral with dark joints; its polyps give
 *   off a blue-green glow.
 * - volcano: a seamount erupting on the seabed, lava glowing in its cracks.
 *
 * Each piece works out its shape from the seed alone, so the drawing and
 * its glow layer always line up. Same canvas contract as decorArt.ts.
 */
export type GlowDecorId = 'umbellula' | 'bamboocoral' | 'volcano';

const PEN_GREEN = '#7dffc8';
const CORAL_BLUE = '#6fe0ff';
const LAVA = '#ff8a3a';
const LAVA_CORE = '#ffd27a';

// ---------------------------------------------------------------- umbellula

interface PenShape {
  readonly stalk: Pt[];
  readonly crown: Pt;
  readonly polyps: { readonly at: Pt; readonly a: number; readonly len: number }[];
}

function penShape(d: Draw): PenShape {
  const { rng } = d;
  const crown = { x: (rng() - 0.5) * 22, y: -150 - rng() * 10 };
  const stalk = qb({ x: 0, y: -2 }, { x: (rng() - 0.5) * 30, y: -80 }, crown, 30);
  const polyps = Array.from({ length: 9 }, (_, i) => ({
    at: { x: crown.x + (rng() - 0.5) * 6, y: crown.y + (rng() - 0.5) * 4 },
    a: -Math.PI / 2 + (i / 8 - 0.5) * 2.6 + (rng() - 0.5) * 0.2,
    len: 10 + rng() * 6,
  }));
  return { stalk, crown, polyps };
}

function umbellula(d: Draw): void {
  const { stalk, crown, polyps } = penShape(d);
  puff(d, 0, -2, 10, 2.5, SHADOW, 0.35);
  // The bulb anchoring it in the mud.
  const bulb = oval(0, -3, 4, 3, 12);
  paint(d, bulb, '#d9c79a', 0.7);
  ring(d, bulb, 0.7);
  const { left, right, shape } = ribbon(stalk, (u) => 1.3 - u * 0.5);
  paint(d, shape, '#e8dcb8', 0.7);
  ink(d, left, 0.6);
  ink(d, right, 0.6);
  for (const p of polyps) {
    const tip = { x: p.at.x + Math.cos(p.a) * p.len, y: p.at.y + Math.sin(p.a) * p.len };
    const { left: l, right: r, shape: body } = ribbon([p.at, tip], (u) => 2.4 - u * 1.2);
    paint(d, body, '#f2e6c4', 0.85);
    ink(d, l, 0.55);
    ink(d, r, 0.55);
    // Eight feathery tentacles round each polyp's mouth.
    for (let k = 0; k < 5; k++) {
      const a = p.a + (k - 2) * 0.45;
      hair(d, [tip, { x: tip.x + Math.cos(a) * 4.5, y: tip.y + Math.sin(a) * 4.5 }], 0.4, 0.8);
    }
  }
  const rachis = oval(crown.x, crown.y, 4, 3, 12);
  paint(d, rachis, '#d6c28e', 0.85);
  ring(d, rachis, 0.8);
}

function umbellulaGlow(d: Draw, ctx: CanvasRenderingContext2D): void {
  const { stalk, crown, polyps } = penShape(d);
  const h = (p: Pt, r: number, k: number): void => {
    const c = d.P(p.x, p.y);
    halo(ctx, c.x, c.y, r * S, PEN_GREEN, k);
  };
  h(crown, 30, 0.55);
  for (const p of polyps) h({ x: p.at.x + Math.cos(p.a) * p.len, y: p.at.y + Math.sin(p.a) * p.len }, 7, 0.8);
  // A wave of light runs down the stalk when it's touched.
  stalk.forEach((p, i) => i % 5 === 2 && h(p, 5, 0.35));
}

// ---------------------------------------------------------------- bamboo coral

interface Branch {
  readonly pts: Pt[];
  readonly width: number;
}

function coralShape(d: Draw): Branch[] {
  const { rng } = d;
  const branches: Branch[] = [];
  const grow = (from: Pt, a: number, len: number, width: number, depth: number): void => {
    const to = { x: from.x + Math.cos(a) * len, y: from.y + Math.sin(a) * len };
    const bend = { x: (from.x + to.x) / 2 + (rng() - 0.5) * len * 0.3, y: (from.y + to.y) / 2 };
    branches.push({ pts: qb(from, bend, to, 10), width });
    if (depth === 0) return;
    const forks = depth > 1 ? 2 : 1 + Math.round(rng());
    for (let i = 0; i < forks; i++) grow(to, a + (i - (forks - 1) / 2) * 0.7 + (rng() - 0.5) * 0.3, len * (0.68 + rng() * 0.1), width * 0.72, depth - 1);
  };
  grow({ x: 0, y: -2 }, -Math.PI / 2 + (rng() - 0.5) * 0.15, 40, 4.2, 4);
  return branches;
}

function bamboocoral(d: Draw): void {
  const branches = coralShape(d);
  puff(d, 0, -2, 22, 3, SHADOW, 0.4);
  lump(d, 0, -1, 9, 4, '#6a5f55', 0.7);
  for (const b of branches) {
    const { left, right, shape } = ribbon(b.pts, (u) => b.width * (1 - u * 0.25));
    paint(d, shape, '#f7f1e2', 0.92);
    // White calcite segments joined by dark horny nodes: the "bamboo".
    for (let i = 3; i < b.pts.length - 1; i += 4) hair(d, [left[i]!, right[i]!], Math.max(0.9, b.width * 0.55), 0.9, '#2a2220');
    ink(d, left, 0.6);
    ink(d, right, 0.6);
  }
  // Polyps along the outer twigs.
  for (const b of branches.filter((x) => x.width < 1.6)) {
    for (let i = 2; i < b.pts.length; i += 3) {
      const p = b.pts[i]!;
      const polyp = oval(p.x, p.y, 1.3, 1.3, 8);
      paint(d, polyp, '#f4d8b0', 0.9);
      ring(d, polyp, 0.45);
    }
  }
}

function bamboocoralGlow(d: Draw, ctx: CanvasRenderingContext2D): void {
  for (const b of coralShape(d).filter((x) => x.width < 1.6)) {
    for (let i = 2; i < b.pts.length; i += 3) {
      const c = d.P(b.pts[i]!.x, b.pts[i]!.y);
      halo(ctx, c.x, c.y, 8 * S, CORAL_BLUE, 0.7);
    }
  }
}

// ---------------------------------------------------------------- volcano

interface VolcanoShape {
  readonly ridge: Pt[];
  readonly crater: Pt;
  readonly cracks: Pt[][];
}

function volcanoShape(d: Draw): VolcanoShape {
  const { rng } = d;
  const crater = { x: (rng() - 0.5) * 30, y: -132 };
  const [p, q] = [rng() * TAU, rng() * TAU];
  const height = (x: number): number => {
    const u = Math.abs(x - crater.x) / 165;
    const cone = 132 * Math.pow(Math.max(0, 1 - u), 1.35);
    return cone * (1 + 0.06 * Math.sin(x * 0.11 + p) + 0.04 * Math.sin(x * 0.29 + q));
  };
  const ridge = Array.from({ length: 61 }, (_, i) => {
    const x = lerp(-168, 168, i / 60);
    // A notch at the summit: the crater.
    const notch = Math.max(0, 1 - Math.abs(x - crater.x) / 16) * 9;
    return { x, y: -2 - height(x) + notch };
  });
  const cracks = Array.from({ length: 6 }, (_, i) => {
    const side = i % 2 ? 1 : -1;
    const steps = 7 + Math.floor(rng() * 4);
    const pts: Pt[] = [{ x: crater.x + side * (3 + rng() * 6), y: crater.y + 6 }];
    // Down the flank, jagged, always inside the cone.
    for (let k = 1; k <= steps; k++) {
      const prev = pts[k - 1]!;
      const x = prev.x + side * (3 + rng() * 7) + (rng() - 0.5) * 8;
      const y = prev.y + 8 + rng() * 9;
      pts.push({ x, y: Math.min(-6, Math.max(y, -2 - height(x) + 6)) });
    }
    return pts;
  });
  return { ridge, crater, cracks };
}

function volcano(d: Draw): void {
  const { ridge, crater, cracks } = volcanoShape(d);
  const { rng } = d;
  const body = [...ridge, { x: 168, y: -1 }, { x: -168, y: -1 }];
  puff(d, 0, -3, 170, 8, SHADOW, 0.45);
  paint(d, body, '#2f2826', 0.82);
  clip(d, body, () => {
    // Shaded flank and old lava flows as hatched bands.
    const shade = [...ridge.filter((p) => p.x > crater.x), { x: 168, y: -1 }, { x: crater.x, y: -1 }];
    d.pen.hatch(d.L(shade), 2.4 * S, 1.15, 0.5 * S, { alpha: 0.55 });
    for (let i = 0; i < 9; i++) {
      const x0 = crater.x + (rng() - 0.5) * 20;
      const flow = qb({ x: x0, y: crater.y + 8 }, { x: x0 + (rng() - 0.5) * 160, y: -70 }, { x: x0 + (rng() - 0.5) * 300, y: -4 }, 14);
      hair(d, flow, 0.5, 0.4, '#8a7a70');
    }
    for (const c of cracks) {
      d.pen.stroke(d.L(c), 2.2 * S, LAVA, 0.95, false);
      d.pen.stroke(d.L(c), 0.8 * S, LAVA_CORE, 1, false);
    }
  });
  dots(d, body, 2600, (_x, y) => 0.2 + 0.5 * Math.min(1, (-y) / 130), 0.45);
  ink(d, ridge, 1.6);
  // The crater mouth, molten.
  const mouth = oval(crater.x, crater.y + 7, 11, 3, 16);
  d.pen.fill(d.L(mouth), LAVA, 1);
  d.pen.fill(d.L(oval(crater.x, crater.y + 7, 6, 1.6, 12)), LAVA_CORE, 1);
  ring(d, mouth, 1.1);
  // Pillow lava heaped round the foot.
  for (let i = 0; i < 12; i++) {
    const rx = 5 + rng() * 7;
    lump(d, lerp(-160, 160, (i + rng()) / 12), -2, rx, rx * 0.6, '#3a312e', 0.8);
  }
  // Ash billowing up from the crater, inked lightly so it reads in the dark.
  for (let i = 0; i < 70; i++) {
    const t = Math.pow(rng(), 1.2);
    const r = 5 + t * 22;
    puff(d, crater.x + (rng() - 0.5) * r + t * 18, crater.y - 4 - t * 95, r, r * 0.85, SMOKE, 0.2 * (1 - t) + 0.03);
  }
  hair(d, oval(crater.x + 8, crater.y - 40, 14, 11, 14, -2.6, 0.2), 0.5, 0.45);
  hair(d, oval(crater.x + 2, crater.y - 70, 18, 14, 14, -2.8, 0.3), 0.5, 0.3);
  hair(d, [{ x: crater.x - 6, y: crater.y + 3 }, { x: crater.x - 9, y: crater.y - 6 }], 0.5, 0.8, INK);
}

function volcanoGlow(d: Draw, ctx: CanvasRenderingContext2D): void {
  const { crater, cracks } = volcanoShape(d);
  const at = (p: Pt): Pt => d.P(p.x, p.y);
  const c = at({ x: crater.x, y: crater.y + 6 });
  halo(ctx, c.x, c.y, 60 * S, LAVA, 0.9);
  halo(ctx, c.x, c.y, 16 * S, LAVA_CORE, 1);
  // Lava lighting the underside of the ash cloud.
  const ash = at({ x: crater.x + 6, y: crater.y - 30 });
  halo(ctx, ash.x, ash.y, 40 * S, LAVA, 0.35);
  for (const crack of cracks) crack.forEach((p, i) => i % 2 === 1 && halo(ctx, at(p).x, at(p).y, 10 * S, LAVA, 0.55));
}

// ---------------------------------------------------------------- registry

const DRAW: Readonly<Record<GlowDecorId, (d: Draw) => void>> = { umbellula, bamboocoral, volcano };
const GLOW: Readonly<Record<GlowDecorId, (d: Draw, ctx: CanvasRenderingContext2D) => void>> = {
  umbellula: umbellulaGlow, bamboocoral: bamboocoralGlow, volcano: volcanoGlow,
};
const mirrored = (seed: number): boolean => createRng(seed * 13 + 1)() < 0.5;

/** Draws one of this file's pieces; returns false if `kind` isn't one of them. */
export function drawGlowDecor(ctx: CanvasRenderingContext2D, kind: GlowDecorId, seed: number): boolean {
  if (!Object.prototype.hasOwnProperty.call(DRAW, kind)) return false;
  DRAW[kind](frame(ctx, seed, mirrored(seed)));
  return true;
}

export function isGlowDecor(kind: string): kind is GlowDecorId {
  return Object.prototype.hasOwnProperty.call(GLOW, kind);
}

/** The glow layer for a piece drawn by drawGlowDecor with the same seed. */
export function drawDecorGlow(ctx: CanvasRenderingContext2D, kind: GlowDecorId, seed: number): void {
  GLOW[kind](frame(ctx, seed, mirrored(seed)), ctx);
}
