import type { Rng } from '../logic/rng';
import { INK } from './palette';
import { ellipse, type Pen, type Pt } from './pen';
import { dabs, groundShade, polyline, TAU, type Dab } from './terrainBrush';
import { LEAF, ROCK } from './terrainGround';
import { mix } from './wash';

/**
 * The map's tall things, each drawn standing on `base` (the foot of its
 * tile): a broadleaf tree, a conifer, a mountain peak, a boulder. Painted
 * as an old master would at this size: a dark mass first, then the forms
 * modelled out of it towards a warm light at the upper left (lit cap,
 * local colour, core shadow, a cool cast shadow on the ground), with a
 * fine umber line only on the shadow side.
 */

const TO_LIGHT = { x: -0.55, y: -0.84 };
/** Cast shadows on the ground: a deep green-umber. */
const CAST = '#0b0f07';

const NEEDLE = { void: '#101c13', dark: '#1d3022', mid: '#2e4a32', lit: '#557448', glint: '#7a9050' } as const;
const BARK = { dark: '#1e130b', mid: '#33231a', lit: '#5e4430' } as const;

/** A ground shadow thrown down and to the right of something standing at `base`. */
function castShadow(pen: Pen, base: Pt, rx: number, ry: number, alpha = 0.5): void {
  groundShade(pen.ctx, base.x + rx * 0.35, base.y + ry * 0.2, rx, ry, CAST, alpha);
}

interface Lobe {
  readonly x: number;
  readonly y: number;
  readonly r: number;
}

/** How much a point at offset (dx, dy) from a form's centre faces the light: -1..1. */
const facing = (dx: number, dy: number): number => {
  const l = Math.hypot(dx, dy) || 1;
  return (dx * TO_LIGHT.x + dy * TO_LIGHT.y) / l;
};

/** Leaf touches inside a lobe, biased towards its lit (or its dark) side. */
function touches(rng: Rng, l: Lobe, lit: boolean, n: number, s: number): Dab[] {
  return Array.from({ length: n }, () => {
    const a = rng() * TAU;
    const r = Math.sqrt(rng()) * l.r * 0.8;
    const bias = lit ? 0.35 : -0.35;
    return { x: l.x + Math.cos(a) * r + TO_LIGHT.x * l.r * bias, y: l.y + Math.sin(a) * r * 0.85 + TO_LIGHT.y * l.r * bias, rx: (1.1 + rng() * 0.7) * s, ry: (0.8 + rng() * 0.4) * s };
  });
}

/** A crown of foliage: clumps over a dark mass, each modelled for the light, leafy at its edges. */
function crown(pen: Pen, rng: Rng, c: Pt, rx: number, ry: number, s: number, tone: typeof LEAF): void {
  const ctx = pen.ctx;
  const n = 7 + Math.floor(rng() * 3);
  const lobes: Lobe[] = [];
  for (let i = 0; i < n; i++) {
    const a = -Math.PI / 2 + (i / n) * TAU + (rng() - 0.5) * 0.5;
    const k = 0.45 + rng() * 0.3;
    lobes.push({ x: c.x + Math.cos(a) * rx * k, y: c.y + Math.sin(a) * ry * k * 0.95, r: Math.min(rx, ry) * (0.38 + rng() * 0.2) });
  }
  lobes.push({ x: c.x - rx * 0.12, y: c.y - ry * 0.18, r: Math.min(rx, ry) * 0.5 });
  // A broad, heavy underside: two low clumps hanging either side of the trunk.
  for (const side of [-1, 1]) lobes.push({ x: c.x + side * rx * (0.5 + rng() * 0.15), y: c.y + ry * (0.4 + rng() * 0.15), r: Math.min(rx, ry) * (0.36 + rng() * 0.1) });
  lobes.sort((a, b) => a.y - b.y);
  // The mass: every clump a little swollen, in the deepest green, so gaps read as shadowed depth.
  dabs(ctx, lobes.map((l) => ({ x: l.x + 0.6 * s, y: l.y + 0.8 * s, rx: l.r * 1.12, ry: l.r * 1.05 })), tone.void, 1);
  // A ragged leafy fringe round the silhouette.
  const fringe: Dab[] = [];
  for (const l of lobes) {
    for (let k = 0; k < 5; k++) {
      const a = rng() * TAU;
      fringe.push({ x: l.x + Math.cos(a) * l.r * 1.02, y: l.y + Math.sin(a) * l.r, rx: 1.4 * s, ry: 1.1 * s });
    }
  }
  dabs(ctx, fringe, tone.void, 1);
  for (const l of lobes) {
    const f = facing(l.x - c.x, l.y - c.y + ry * 0.15);
    const t = (f + 1) / 2;
    dabs(ctx, [{ x: l.x, y: l.y, rx: l.r, ry: l.r * 0.94 }], mix(tone.dark, tone.mid, t * 0.85), 1);
    // The lit cap, set towards the light inside the clump.
    dabs(ctx, [{ x: l.x + TO_LIGHT.x * l.r * 0.22, y: l.y + TO_LIGHT.y * l.r * 0.22, rx: l.r * 0.68, ry: l.r * 0.6 }], mix(tone.mid, tone.lit, t), 0.9 * t ** 1.5);
    if (t > 0.35) dabs(ctx, touches(rng, l, true, 8, s * 0.75), mix(tone.lit, tone.glint, t * 0.7), 0.15 + t * 0.4);
    dabs(ctx, touches(rng, l, false, 6, s * 0.8), tone.void, 0.5);
    // A fine line under the clump, where it turns from the light.
    const arc = Array.from({ length: 7 }, (_, i) => {
      const a = -0.1 + (i / 6) * 1.9;
      return { x: l.x + Math.cos(a) * l.r * 0.98, y: l.y + Math.sin(a) * l.r * 0.92 };
    });
    pen.hair(arc, 0.45, INK, 0.45);
  }
  // A few holes through the crown, and the warm rim light along its upper left.
  dabs(ctx, Array.from({ length: 2 }, () => ({ x: c.x + (rng() - 0.3) * rx * 0.8, y: c.y + (rng() - 0.2) * ry * 0.7, rx: 1.3 * s, ry: 1 * s })), tone.void, 0.9);
  const top = lobes.filter((l) => facing(l.x - c.x, l.y - c.y) > 0.2);
  for (const l of top) {
    const arc = Array.from({ length: 6 }, (_, i) => {
      const a = Math.PI + 0.35 + (i / 5) * 1.2;
      return { x: l.x + Math.cos(a) * l.r * 0.9, y: l.y + Math.sin(a) * l.r * 0.86 };
    });
    polyline(ctx, arc, tone.glint, 0.45, 0.8 * s);
  }
}

/** A broadleaf tree: a flared trunk forking into a crown of foliage clumps. */
export function drawTree(pen: Pen, rng: Rng, base: Pt, tile: number, shadow: boolean): void {
  const s = tile / 48 * (0.85 + rng() * 0.3);
  const ctx = pen.ctx;
  const lean = (rng() - 0.5) * 3 * s;
  if (shadow) castShadow(pen, base, 17 * s, 5 * s, 0.55);
  const c = { x: base.x + lean, y: base.y - 25 * s };
  // The trunk, flared at the root, and two limbs forking up into the crown.
  const top = { x: base.x + lean * 0.7, y: base.y - 17 * s };
  const trunk = [{ x: base.x - 3.4 * s, y: base.y + 0.5 }, { x: base.x - 1.6 * s, y: base.y - 3 * s }, { x: top.x - 1.4 * s, y: top.y }, { x: top.x + 1.6 * s, y: top.y }, { x: base.x + 1.9 * s, y: base.y - 3 * s }, { x: base.x + 3.6 * s, y: base.y + 0.5 }];
  pen.fill(trunk, BARK.mid, 1);
  pen.fill([trunk[0]!, trunk[1]!, trunk[2]!, { x: top.x, y: top.y }, { x: base.x - 0.2 * s, y: base.y }], BARK.lit, 0.55);
  pen.fill([{ x: top.x + 0.4 * s, y: top.y }, trunk[3]!, trunk[4]!, trunk[5]!, { x: base.x + 0.6 * s, y: base.y }], BARK.dark, 0.8);
  for (const side of [-1, 1]) polyline(ctx, [top, { x: top.x + side * 4 * s, y: top.y - 5 * s }, { x: top.x + side * 6 * s, y: top.y - 8 * s }], BARK.dark, 0.95, 1.3 * s);
  pen.hair([trunk[3]!, trunk[4]!, trunk[5]!], 0.55, INK, 0.75);
  crown(pen, rng, c, 16.5 * s, 13.5 * s, s, LEAF);
}

/** A conifer: tiers of drooping, ragged boughs narrowing to a spire, lit down their left. */
export function drawPine(pen: Pen, rng: Rng, base: Pt, tile: number): void {
  const s = tile / 48 * (0.85 + rng() * 0.35);
  const ctx = pen.ctx;
  castShadow(pen, base, 13 * s, 4 * s, 0.55);
  pen.fill([{ x: base.x - 1.6 * s, y: base.y + 0.5 }, { x: base.x - 1 * s, y: base.y - 8 * s }, { x: base.x + 1 * s, y: base.y - 8 * s }, { x: base.x + 1.8 * s, y: base.y + 0.5 }], BARK.dark, 1);
  const tiers = 5;
  const H = 44 * s;
  const W = 14 * s;
  const apex = { x: base.x + (rng() - 0.5) * s, y: base.y - H };
  for (let i = 0; i < tiers; i++) {
    const k = i / (tiers - 1);
    const yb = base.y - 4 * s - k * H * 0.62;
    const w = W * (1 - k * 0.72) * (0.92 + rng() * 0.16);
    const top = i === tiers - 1 ? apex : { x: base.x + (rng() - 0.5) * 0.6 * s, y: yb - H * 0.36 };
    const droop = 2.6 * s * (1 - k * 0.4);
    // The lower edge: a run of ragged bough tips.
    const teeth = 5;
    const edge: Pt[] = [];
    for (let t = 0; t <= teeth; t++) {
      const u = t / teeth;
      const x = base.x - w + u * w * 2;
      const sag = Math.sin(u * Math.PI) * -1.2 * s + droop * (1 - Math.abs(u - 0.5) * 2) * 0.2;
      edge.push({ x, y: yb + droop - sag + (t % 2 === 0 ? 0 : -2.2 * s) });
    }
    const tier = [top, { x: base.x - w * 0.55, y: yb - 2 * s }, ...edge, { x: base.x + w * 0.55, y: yb - 2 * s }];
    pen.fill(tier, NEEDLE.void, 1);
    const left = [top, { x: base.x - w * 0.55, y: yb - 2 * s }, ...edge.slice(0, 3), { x: base.x + 0.5 * s, y: yb + 0.5 * s }];
    pen.fill(left, NEEDLE.mid, 0.95);
    pen.fill([top, { x: base.x - w * 0.55, y: yb - 2 * s }, edge[0]!, { x: base.x - w * 0.35, y: yb }], NEEDLE.lit, 0.7);
    const right = [top, { x: base.x + w * 0.55, y: yb - 2 * s }, edge[teeth]!, edge[teeth - 1]!, { x: base.x + 1 * s, y: yb + 0.5 * s }];
    pen.fill(right, NEEDLE.dark, 0.9);
    // Needle texture: short downward strokes, lit on the left, dark on the right.
    const marks: Dab[] = Array.from({ length: 4 }, () => ({ x: base.x - w * (0.15 + rng() * 0.5), y: yb - rng() * H * 0.18, rx: 1 * s, ry: 0.6 * s }));
    dabs(ctx, marks, NEEDLE.glint, 0.55);
    pen.hair([top, { x: base.x + w * 0.55, y: yb - 2 * s }, edge[teeth]!], 0.5, INK, 0.6);
  }
}

export { drawMountain } from './terrainPeaks';

/** A boulder with a smaller stone beside it: faceted, mossy on top, dark on the side from the light. */
export function drawRock(pen: Pen, rng: Rng, base: Pt, tile: number): void {
  const s = tile / 48 * (0.8 + rng() * 0.3);
  castShadow(pen, base, 15 * s, 4.5 * s, 0.55);
  const stone = (cx: number, rx: number, ry: number): void => {
    const pts: Pt[] = [];
    const n = 9;
    for (let i = 0; i < n; i++) {
      const a = Math.PI + (i / (n - 1)) * Math.PI;
      const r = 1 + (rng() - 0.5) * 0.28;
      pts.push({ x: cx + Math.cos(a) * rx * r, y: base.y + Math.sin(a) * ry * r });
    }
    pts.push({ x: cx + rx * 0.7, y: base.y + 1.5 * s }, { x: cx - rx * 0.7, y: base.y + 1.5 * s });
    pen.fill(pts, ROCK.mid, 1);
    pen.clipped(pts, () => {
      pen.fill(ellipse(cx - rx * 0.3, base.y - ry * 0.65, rx * 0.75, ry * 0.5, 12), ROCK.lit, 0.8);
      pen.fill([{ x: cx + rx * 0.05, y: base.y - ry * 1.2 }, { x: cx + rx * 1.2, y: base.y - ry * 0.6 }, { x: cx + rx * 1.2, y: base.y + 2 }, { x: cx + rx * 0.1, y: base.y + 2 }, { x: cx + rx * 0.25, y: base.y - ry * 0.4 }], ROCK.dark, 0.85);
      pen.hatch(pts, 1.6, 1.05, 0.35, { color: ROCK.deep, alpha: 0.5, onlyBelow: base.y - ry * 0.55 });
      dabs(pen.ctx, [{ x: cx - rx * 0.35, y: base.y - ry * 0.95, rx: rx * 0.4, ry: ry * 0.18 }], '#4b5a2a', 0.75);
    });
    pen.hair([{ x: cx + rx * 0.05, y: base.y - ry * 1.05 }, { x: cx + rx * 0.25, y: base.y - ry * 0.4 }, { x: cx + rx * 0.1, y: base.y }], 0.5, INK, 0.6);
    pen.stroke(pts.slice(4), 0.75, INK, 0.85, false);
    pen.stroke(pts.slice(0, 5), 0.45, INK, 0.55, false);
  };
  stone(base.x - 2 * s, 12 * s, 14 * s);
  stone(base.x + 11 * s, 5 * s, 5 * s);
}
