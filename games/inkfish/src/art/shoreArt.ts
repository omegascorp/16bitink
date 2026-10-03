import type { ShoreKind } from '../levels/shore';
import { ellipse, INK, Pen, type Pt } from './pen';
import { ART_RES } from './propArt';

/**
 * Land on the horizon, drawn loosely in pen: it's background, so lighter
 * lines and soft washes. Each sits on its waterline at the bottom edge.
 */
export const SHORE_SIZE: Readonly<Record<ShoreKind, { readonly w: number; readonly h: number }>> = {
  rocks: { w: 280, h: 110 },
  lighthouse: { w: 220, h: 270 },
  palms: { w: 380, h: 220 },
  dunes: { w: 520, h: 80 },
  headland: { w: 440, h: 230 },
  volcano: { w: 480, h: 230 },
};

const PAPER_FILL = '#fffaf0';
const STONE = '#8d8a80';
const SAND = '#d9c79c';
const GREEN = '#6f8f5f';
const RED = '#a3342b';

function bez(p0: Pt, c: Pt, p1: Pt, n = 12): Pt[] {
  return Array.from({ length: n + 1 }, (_, i) => {
    const t = i / n;
    const u = 1 - t;
    return { x: u * u * p0.x + 2 * u * t * c.x + t * t * p1.x, y: u * u * p0.y + 2 * u * t * c.y + t * t * p1.y };
  });
}

/** A lump of land: an outline over a flat waterline, washed and lightly hatched on its shaded side. */
function landmass(pen: Pen, top: readonly Pt[], base: number, wash: string, washAlpha = 0.45): Pt[] {
  const s = ART_RES;
  const shape = [{ x: top[0]!.x, y: base * s }, ...top, { x: top[top.length - 1]!.x, y: base * s }];
  pen.fill(shape, PAPER_FILL, 1);
  pen.fill(shape, wash, washAlpha);
  pen.hatch(shape, 5 * s, 0.9, 0.5 * s, { alpha: 0.25 });
  pen.stroke(top, 1.2 * s, INK, 0.85, false);
  return shape;
}

/** The silhouette's top edge through these (x, height above base) points, smoothed. */
function ridge(P: (x: number, y: number) => Pt, base: number, points: readonly (readonly [number, number])[]): Pt[] {
  const out: Pt[] = [];
  for (let i = 0; i < points.length - 1; i++) {
    const [x0, h0] = points[i]!;
    const [x1, h1] = points[i + 1]!;
    out.push(...bez(P(x0, base - h0), P((x0 + x1) / 2, base - Math.max(h0, h1) - 4), P(x1, base - h1), 6).slice(i ? 1 : 0));
  }
  return out;
}

function palm(pen: Pen, P: (x: number, y: number) => Pt, x: number, ground: number, height: number, lean: number): void {
  const s = ART_RES;
  const top = { x: x + lean, y: ground - height };
  pen.stroke(bez(P(x, ground), P(x + lean * 0.2, ground - height * 0.6), P(top.x, top.y), 10), 2.2 * s, INK, 0.9, false);
  for (let i = 0; i < 6; i++) {
    const a = -Math.PI + (i / 5) * Math.PI + (i % 2 ? 0.15 : -0.1);
    const len = height * 0.45;
    const tip = { x: top.x + Math.cos(a) * len, y: top.y + Math.sin(a) * len * 0.5 + len * 0.35 };
    const frond = [...bez(P(top.x, top.y), P((top.x + tip.x) / 2, top.y - len * 0.25), P(tip.x, tip.y), 8), ...bez(P(tip.x, tip.y), P((top.x + tip.x) / 2, top.y - len * 0.05), P(top.x, top.y + 2), 8)];
    pen.fill(frond, GREEN, 0.75);
    pen.stroke(frond, 0.8 * s, INK, 0.8, false);
  }
}

function pine(pen: Pen, P: (x: number, y: number) => Pt, x: number, ground: number, height: number): void {
  const s = ART_RES;
  const tree = [P(x, ground - height), P(x + height * 0.22, ground - 4), P(x - height * 0.22, ground - 4)];
  pen.fill(tree, '#4f6b48', 0.75);
  pen.stroke([...tree, tree[0]!], 0.9 * s, INK, 0.8, false);
  pen.stroke([P(x, ground - 4), P(x, ground + 2)], 1.2 * s, INK, 0.8, false);
}

export function drawShore(ctx: CanvasRenderingContext2D, kind: ShoreKind, seed: number): void {
  const pen = new Pen(ctx, seed, 0.7);
  const s = ART_RES;
  const P = (x: number, y: number): Pt => ({ x: x * s, y: y * s });
  const { w, h } = SHORE_SIZE[kind];
  const base = h - 4;
  if (kind === 'rocks') {
    landmass(pen, ridge(P, base, [[10, 0], [40, 46], [80, 62], [120, 40], [160, 74], [205, 52], [245, 30], [270, 0]]), base, STONE);
    // Seabirds resting on top.
    for (const [x, y] of [[150, base - 82], [170, base - 76]] as const) pen.stroke([P(x - 5, y), P(x, y - 3), P(x + 5, y)], 0.9 * s, INK, 0.8, false);
  } else if (kind === 'lighthouse') {
    landmass(pen, ridge(P, base, [[10, 0], [50, 34], [110, 52], [170, 30], [210, 0]]), base, STONE);
    // Striped tower, lamp room and cap.
    const tower = [P(96, base - 50), P(102, base - 200), P(126, base - 200), P(132, base - 50)];
    pen.fill(tower, PAPER_FILL, 1);
    pen.clipped(tower, () => {
      for (let y = base - 190; y < base - 50; y += 44) pen.fill([P(90, y), P(140, y), P(140, y + 22), P(90, y + 22)], RED, 0.8);
    });
    pen.stroke([...tower, tower[0]!], 1.3 * s, INK, 1, false);
    const lamp = [P(100, base - 200), P(128, base - 200), P(128, base - 222), P(100, base - 222)];
    pen.fill(lamp, '#f6d76a', 0.8);
    pen.stroke([...lamp, lamp[0]!], 1.1 * s, INK, 1, false);
    const cap = [P(96, base - 222), P(114, base - 240), P(132, base - 222)];
    pen.fill(cap, RED, 0.85);
    pen.stroke([...cap, cap[0]!], 1.1 * s, INK, 1, false);
    // Light beams.
    for (const dir of [-1, 1]) pen.fill([P(114, base - 211), P(114 + dir * 100, base - 236), P(114 + dir * 100, base - 190)], '#f6d76a', 0.2);
  } else if (kind === 'palms') {
    landmass(pen, ridge(P, base, [[10, 0], [70, 18], [160, 30], [260, 26], [340, 12], [370, 0]]), base, SAND, 0.55);
    palm(pen, P, 150, base - 26, 120, -18);
    palm(pen, P, 200, base - 28, 150, 14);
    palm(pen, P, 270, base - 22, 100, 22);
  } else if (kind === 'dunes') {
    landmass(pen, ridge(P, base, [[10, 0], [90, 26], [170, 18], [260, 40], [360, 22], [450, 32], [510, 0]]), base, SAND, 0.55);
    for (let x = 60; x < 480; x += 22 + pen.rng() * 30) {
      for (let i = -2; i <= 2; i++) pen.hair([P(x, base - 22), P(x + i * 4, base - 34 - pen.rng() * 8)], 0.6 * s, GREEN, 0.9);
    }
  } else if (kind === 'headland') {
    // A cliff rising from the sea on the right, sloping away inland to the left.
    landmass(pen, ridge(P, base, [[0, 70], [80, 110], [190, 150], [300, 170], [380, 160], [420, 120], [436, 0]]), base, '#a19a85');
    pen.hatch([P(380, base - 160), P(436, base), P(400, base), P(370, base - 120)], 3 * s, 1.4, 0.5 * s, { alpha: 0.5 });
    for (const [x, hgt] of [[120, 40], [170, 52], [210, 46], [260, 58], [320, 44]] as const) {
      const ground = base - (x < 190 ? 110 + (x - 80) * 0.36 : 150 + (x - 190) * 0.18);
      pine(pen, P, x, ground, hgt);
    }
  } else {
    // A distant volcano with a curl of smoke.
    landmass(pen, ridge(P, base, [[10, 0], [120, 50], [200, 130], [228, 150], [252, 150], [280, 128], [370, 46], [470, 0]]), base, '#7d7a8a', 0.4);
    for (let i = 0; i < 4; i++) {
      const r = 10 + i * 4;
      const at = { x: (242 + i * 15) * s, y: (base - 160 - i * 14) * s };
      pen.fill(ellipse(at.x, at.y, r * s, r * 0.8 * s, 14), PAPER_FILL, 0.8);
      pen.hair(ellipse(at.x, at.y, r * s, r * 0.8 * s, 14), 0.7 * s, INK, 0.45);
    }
  }
}
