import { INK, makeCanvas, Pen, type Pt } from '../../../src/art/pen';
import { BOIL_FRAMES } from '../../../src/art/textures';
import { createRng } from '../../../src/logic/rng';

/**
 * The land's inked props, drawn once per boil frame with the game's pen:
 * trees (the first tree, a broadleaf and a conifer), the tiny stalked
 * plants that were all the land had before trees, and two dinosaurs.
 * Each is a set of canvases with its base (roots or feet) at the bottom
 * middle, BASE px above the canvas's bottom edge.
 */

export interface Prop {
  readonly frames: readonly HTMLCanvasElement[];
  readonly w: number;
  readonly h: number;
}

export const BASE = 12;
const LEAF = '#7fa36a';
const LEAF_DARK = '#557a4c';
const FROND = '#93b276';
const BARK = '#7a5c42';
const DINO = '#4c5a42';

function prop(w: number, h: number, seed: number, draw: (pen: Pen, ctx: CanvasRenderingContext2D, rng: () => number) => void): Prop {
  const frames = Array.from({ length: BOIL_FRAMES }, (_, f) => {
    const { canvas, ctx } = makeCanvas(w, h);
    // The same shape every frame (rng), drawn with a different wobble (pen).
    draw(new Pen(ctx, seed * 31 + f * 977, 1.4), ctx, createRng(seed));
    return canvas;
  });
  return { frames, w, h };
}

/** Points round a circle. */
const ring = (c: { x: number; y: number; r: number }, n: number, from = 0, to = Math.PI * 2): Pt[] =>
  Array.from({ length: n + 1 }, (_, i) => {
    const a = from + ((to - from) * i) / n;
    return { x: c.x + Math.cos(a) * c.r, y: c.y + Math.sin(a) * c.r };
  });

/** A trunk: two inked lines tapering up from the base, filled bark brown. */
function trunk(pen: Pen, x: number, base: number, top: number, wBase: number, wTop: number, lean: number): void {
  const left = [{ x: x - wBase / 2, y: base }, { x: x - wTop / 2 + lean, y: top }];
  const right = [{ x: x + wTop / 2 + lean, y: top }, { x: x + wBase / 2, y: base }];
  pen.fill([...left, ...right], BARK, 0.9);
  pen.stroke(left, 3);
  pen.stroke(right, 3);
}

/** A lumpy canopy of overlapping circles, inked only round its outside, with a few leafy ticks inside. */
function canopy(pen: Pen, ctx: CanvasRenderingContext2D, blobs: readonly { x: number; y: number; r: number }[]): void {
  ctx.save();
  ctx.fillStyle = LEAF;
  ctx.globalAlpha = 0.92;
  for (const b of blobs) {
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
  const inside = (p: Pt, skip: number): boolean => blobs.some((b, i) => i !== skip && Math.hypot(p.x - b.x, p.y - b.y) < b.r - 1);
  blobs.forEach((b, i) => {
    let run: Pt[] = [];
    for (const p of ring(b, 28)) {
      if (inside(p, i)) {
        if (run.length > 1) pen.stroke(run, 3.2);
        run = [];
      } else run.push(p);
    }
    if (run.length > 1) pen.stroke(run, 3.2);
    // Shade under each lump, and a leafy tick or two.
    pen.stroke(ring({ ...b, r: b.r * 0.72 }, 6, 0.35, 1.25), 2, LEAF_DARK, 0.8, false);
    pen.hair([{ x: b.x - b.r * 0.3, y: b.y - b.r * 0.2 }, { x: b.x - b.r * 0.15, y: b.y - b.r * 0.32 }, { x: b.x, y: b.y - b.r * 0.22 }], 1.6, INK, 0.5);
  });
}

/** A broadleaf tree, about 270 px tall. */
export function makeBroadleaf(seed: number): Prop {
  return prop(300, 330, seed, (pen, ctx, rng) => {
    const x = 150;
    const base = 330 - BASE;
    trunk(pen, x, base, base - 150, 30, 16, 4);
    pen.stroke([{ x: x + 2, y: base - 120 }, { x: x - 40, y: base - 175 }], 3);
    pen.stroke([{ x: x + 4, y: base - 135 }, { x: x + 45, y: base - 185 }], 3);
    const blobs = Array.from({ length: 8 }, (_, i) => {
      const a = (i / 8) * Math.PI * 2;
      return { x: x + Math.cos(a) * (55 + rng() * 25), y: base - 205 + Math.sin(a) * (40 + rng() * 15), r: 44 + rng() * 18 };
    });
    canopy(pen, ctx, [...blobs, { x, y: base - 210, r: 62 }]);
  });
}

/** A conifer, about 290 px tall: a trunk and four jagged tiers. */
export function makeConifer(seed: number): Prop {
  return prop(220, 330, seed, (pen, _ctx, rng) => {
    const x = 110;
    const base = 330 - BASE;
    trunk(pen, x, base, base - 60, 18, 12, 0);
    for (let k = 0; k < 4; k++) {
      const bottom = base - 40 - k * 55;
      const half = 92 - k * 18 + rng() * 6;
      const tip = bottom - 95;
      const pts: Pt[] = [{ x, y: tip }];
      for (let i = 1; i <= 4; i++) pts.push({ x: x + (half * i) / 4, y: tip + ((bottom - tip) * i) / 4 + (i % 2 ? 8 : -2) });
      for (let i = 4; i >= 1; i--) pts.push({ x: x - (half * i) / 4, y: tip + ((bottom - tip) * i) / 4 + (i % 2 ? 8 : -2) });
      pen.fill(pts, k % 2 ? LEAF_DARK : '#5f8455', 0.95);
      pen.closed(pts, 3);
    }
  });
}

/**
 * The first tree (Archaeopteris): a tall straight trunk with flat sprays of
 * fern-like fronds off it, about 300 px tall.
 */
export function makeFirstTree(seed: number): Prop {
  return prop(300, 340, seed, (pen, _ctx, rng) => {
    const x = 150;
    const base = 340 - BASE;
    trunk(pen, x, base, base - 300, 20, 8, 0);
    for (let k = 0; k < 7; k++) {
      const side = k % 2 ? 1 : -1;
      const y = base - 120 - k * 27;
      const len = 105 - k * 9 + rng() * 10;
      const tip = { x: x + side * len, y: y + 18 - k * 1.5 };
      const mid = { x: x + side * len * 0.5, y: y - 6 };
      const frond = [{ x, y: y - 4 }, { x: mid.x, y: mid.y - 12 }, { x: tip.x, y: tip.y }, { x: mid.x, y: mid.y + 12 }, { x, y: y + 6 }];
      pen.fill(frond, FROND, 0.9);
      pen.stroke([{ x, y }, mid, tip], 2.6);
      for (let i = 1; i < 6; i++) {
        const u = i / 6;
        const p = { x: x + side * len * u, y: y + (tip.y - y) * u * u - 6 * Math.sin(Math.PI * u) };
        pen.hair([p, { x: p.x + side * 9, y: p.y - 10 }], 1.6);
        pen.hair([p, { x: p.x + side * 9, y: p.y + 10 }], 1.6);
      }
    }
  });
}

/** A tuft of the tiny stalked plants (like Cooksonia) that were all the land had before trees: forked stalks with knobs. */
export function makeTuft(seed: number): Prop {
  return prop(70, 70, seed, (pen, _ctx, rng) => {
    const base = 70 - BASE;
    for (let k = 0; k < 4; k++) {
      const x = 22 + k * 9 + rng() * 4;
      const fork = { x: x + (rng() - 0.5) * 6, y: base - 22 - rng() * 10 };
      pen.stroke([{ x, y: base }, fork], 1.8, '#5d7a4a');
      for (const s of [-1, 1]) {
        const tip = { x: fork.x + s * (6 + rng() * 4), y: fork.y - 10 - rng() * 6 };
        pen.stroke([fork, tip], 1.6, '#5d7a4a');
        pen.dot(tip.x, tip.y, 2.6, '#a2683f');
      }
    }
  });
}

/** A long-necked sauropod in silhouette, facing right, about 330 px long. */
export function makeSauropod(seed: number): Prop {
  return prop(380, 240, seed, (pen) => {
    const g = 240 - BASE;
    const body: Pt[] = [
      { x: 10, y: g - 70 }, { x: 70, y: g - 95 }, { x: 140, y: g - 125 }, { x: 210, y: g - 128 }, { x: 255, y: g - 115 },
      { x: 290, y: g - 150 }, { x: 315, y: g - 195 }, { x: 335, y: g - 215 }, { x: 362, y: g - 212 }, { x: 368, y: g - 200 },
      { x: 345, y: g - 196 }, { x: 322, y: g - 165 }, { x: 290, y: g - 100 }, { x: 262, y: g - 72 },
      { x: 255, y: g }, { x: 230, y: g }, { x: 228, y: g - 55 }, { x: 175, y: g - 55 }, { x: 170, y: g }, { x: 145, y: g },
      { x: 140, y: g - 62 }, { x: 100, y: g - 70 }, { x: 40, y: g - 62 },
    ];
    pen.fill(body, DINO, 0.95);
    pen.closed(body, 3);
  });
}

/** A tyrannosaur in silhouette, facing right, about 230 px long. */
export function makeRex(seed: number): Prop {
  return prop(250, 220, seed, (pen) => {
    const g = 220 - BASE;
    const body: Pt[] = [
      { x: 8, y: g - 110 }, { x: 70, y: g - 128 }, { x: 140, y: g - 150 }, { x: 170, y: g - 178 }, { x: 228, y: g - 180 },
      { x: 242, y: g - 160 }, { x: 236, y: g - 146 }, { x: 196, y: g - 148 }, { x: 200, y: g - 136 }, { x: 186, y: g - 128 },
      { x: 178, y: g - 112 }, { x: 186, y: g - 104 }, { x: 172, y: g - 102 }, { x: 160, y: g - 92 }, { x: 140, y: g - 76 },
      { x: 150, y: g - 30 }, { x: 165, y: g }, { x: 138, y: g }, { x: 120, y: g - 36 }, { x: 110, y: g - 68 }, { x: 96, y: g - 66 },
      { x: 104, y: g - 30 }, { x: 112, y: g }, { x: 86, y: g }, { x: 76, y: g - 40 }, { x: 70, y: g - 90 },
    ];
    pen.fill(body, DINO, 0.95);
    pen.closed(body, 3);
    pen.dot(214, g - 166, 3.5, '#f4eddc');
  });
}
