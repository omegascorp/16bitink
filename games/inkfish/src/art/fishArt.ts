import type { SpeciesId } from '../levels/types';
import { ellipse, INK, Pen, type Pt } from './pen';

export type FishShape = SpeciesId | 'inkling';
/** light = prey/peer look, heavy = predator look (dense cross-hatch). */
export type InkVariant = 'light' | 'heavy';

/** Texture side in px; a fish of game radius R is drawn at scale R / FISH_RADIUS. */
export const FISH_TEX = 200;
export const FISH_RADIUS = 64;

interface Body {
  /** Half length and half height of the body. */
  hl: number;
  hh: number;
  tail: 'fork' | 'fan' | 'taper';
  wash: string;
  extras: (pen: Pen, outline: Pt[], c: Pt, b: Body) => void;
}

const C = FISH_TEX / 2;

function bodyOutline(b: Body, wave = 0): Pt[] {
  // Nose at +x, tail base at -x. Upper back is fuller than the belly.
  const pts: Pt[] = [];
  const steps = 22;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const x = C + b.hl - t * 2 * b.hl;
    const bulge = Math.sin(Math.PI * Math.pow(t, 0.8));
    pts.push({ x, y: C - b.hh * bulge * 1.05 + Math.sin(t * 9) * wave });
  }
  for (let i = steps; i >= 0; i--) {
    const t = i / steps;
    const x = C + b.hl - t * 2 * b.hl;
    const bulge = Math.sin(Math.PI * Math.pow(t, 0.8));
    pts.push({ x, y: C + b.hh * bulge * 0.9 + Math.sin(t * 9) * wave });
  }
  return pts;
}

function tail(pen: Pen, b: Body, width: number): Pt[] {
  const bx = C - b.hl + 2;
  const s = Math.max(b.hh, 14);
  if (b.tail === 'taper') return [];
  const pts: Pt[] =
    b.tail === 'fork'
      ? [{ x: bx, y: C }, { x: bx - s * 1.1, y: C - s * 1.0 }, { x: bx - s * 0.7, y: C }, { x: bx - s * 1.1, y: C + s * 1.0 }]
      : [{ x: bx, y: C }, { x: bx - s * 0.9, y: C - s * 0.8 }, { x: bx - s * 1.05, y: C }, { x: bx - s * 0.9, y: C + s * 0.8 }];
  pen.fill(pts, '#fffaf0', 1);
  pen.closed(pts, width);
  // Fin rays.
  for (let i = -2; i <= 2; i++) {
    pen.stroke([{ x: bx - 3, y: C + i * 2 }, { x: bx - s * 0.85, y: C + i * s * 0.32 }], width * 0.35, INK, 0.7);
  }
  return pts;
}

function eye(pen: Pen, x: number, y: number, r: number, width: number): void {
  pen.fill(ellipse(x, y, r, r, 14), '#fffaf0', 1);
  pen.circle(x, y, r, width * 0.8);
  pen.dot(x + r * 0.25, y, r * 0.5);
  pen.dot(x + r * 0.1, y - r * 0.3, r * 0.15, '#fffaf0');
}

function gill(pen: Pen, b: Body, width: number): void {
  const gx = C + b.hl * 0.45;
  pen.stroke([{ x: gx, y: C - b.hh * 0.55 }, { x: gx - b.hh * 0.18, y: C }, { x: gx, y: C + b.hh * 0.5 }], width * 0.6);
}

function scales(pen: Pen, b: Body, width: number): void {
  for (let x = C + b.hl * 0.25; x > C - b.hl * 0.7; x -= 10) {
    for (let y = C - b.hh * 0.5; y < C + b.hh * 0.5; y += 9) {
      if (pen.rng() < 0.45) continue;
      pen.stroke([{ x: x + 3, y: y - 3 }, { x: x - 1, y }, { x: x + 3, y: y + 3 }], width * 0.3, INK, 0.55);
    }
  }
}

const BODIES: Record<FishShape, Body> = {
  inkling: {
    hl: 52, hh: 30, tail: 'fan', wash: '#3466c2',
    extras: (pen, _o, _c, b) => {
      // A curl on the forehead and a cheeky smile.
      pen.stroke([{ x: C + 10, y: C - b.hh + 4 }, { x: C + 18, y: C - b.hh - 8 }, { x: C + 26, y: C - b.hh - 2 }], 1.6, '#1f3f8a');
      pen.stroke([{ x: C + b.hl - 10, y: C + 8 }, { x: C + b.hl - 4, y: C + 11 }, { x: C + b.hl, y: C + 7 }], 1.4, '#1f3f8a');
    },
  },
  minnow: {
    hl: 58, hh: 18, tail: 'fork', wash: '#8fa3a8',
    extras: (pen, _o, _c, b) => pen.stroke([{ x: C + b.hl * 0.4, y: C }, { x: C - b.hl * 0.8, y: C + 1 }], 1, INK, 0.6),
  },
  perch: {
    hl: 50, hh: 32, tail: 'fan', wash: '#b59a4a',
    extras: (pen, _o, _c, b) => {
      for (let i = 0; i < 4; i++) {
        const x = C + b.hl * 0.25 - i * 18;
        pen.stroke([{ x, y: C - b.hh * 0.8 }, { x: x - 2, y: C + b.hh * 0.6 }], 2.4, INK, 0.75);
      }
      const spikes: Pt[] = [];
      for (let i = 0; i <= 6; i++) {
        const x = C + b.hl * 0.15 - i * 10;
        spikes.push({ x, y: C - b.hh * 0.95 }, { x: x - 4, y: C - b.hh * 1.45 });
      }
      pen.stroke(spikes, 1.3);
    },
  },
  puffer: {
    hl: 44, hh: 40, tail: 'fan', wash: '#c9b36a',
    extras: (pen, outline) => {
      outline.forEach((p, i) => {
        if (i % 3) return;
        const dx = p.x - C;
        const dy = p.y - C;
        const d = Math.hypot(dx, dy) || 1;
        pen.stroke([p, { x: p.x + (dx / d) * 8, y: p.y + (dy / d) * 8 }], 1.3);
      });
      for (let i = 0; i < 14; i++) pen.dot(C + pen.jitter(28), C + pen.jitter(20), 1.6, INK, 0.7);
    },
  },
  pike: {
    hl: 66, hh: 18, tail: 'fork', wash: '#5f7f4e',
    extras: (pen, _o, _c, b) => {
      for (let i = 0; i < 18; i++) pen.dot(C - b.hl * 0.6 + pen.rng() * b.hl * 1.2, C + pen.jitter(b.hh * 0.6), 2, INK, 0.6);
      for (let i = 0; i < 5; i++) {
        const x = C + b.hl - 4 - i * 5;
        pen.stroke([{ x, y: C + 3 }, { x: x - 2, y: C + 8 }, { x: x - 4, y: C + 3 }], 1);
      }
      pen.stroke([{ x: C + b.hl, y: C + 3 }, { x: C + b.hl * 0.55, y: C + 4 }], 1.8);
    },
  },
  angler: {
    hl: 48, hh: 36, tail: 'fan', wash: '#6a5148',
    extras: (pen, _o, _c, b) => {
      const top = { x: C + b.hl * 0.4, y: C - b.hh * 0.9 };
      const lure = { x: C + b.hl + 18, y: C - b.hh - 6 };
      pen.stroke([top, { x: C + b.hl * 0.7, y: C - b.hh - 20 }, lure], 1.6);
      pen.fill(ellipse(lure.x, lure.y, 6, 6, 10), '#f0c94a', 0.9);
      pen.circle(lure.x, lure.y, 6, 1.4);
      pen.stroke([{ x: C + b.hl, y: C + 4 }, { x: C + b.hl * 0.4, y: C + 14 }, { x: C + b.hl - 6, y: C + 20 }], 2);
      for (let i = 0; i < 6; i++) {
        const x = C + b.hl - 6 - i * 6;
        pen.stroke([{ x, y: C + 6 + i * 1.4 }, { x: x - 2, y: C + 13 + i * 1.4 }], 1.1);
      }
    },
  },
  eel: {
    hl: 82, hh: 11, tail: 'taper', wash: '#4c5a66',
    extras: (pen, _o, _c, b) => {
      const fin: Pt[] = [];
      for (let i = 0; i <= 14; i++) fin.push({ x: C + b.hl * 0.5 - i * 11, y: C - b.hh - 4 - (i % 2) * 3 });
      pen.stroke(fin, 1.2);
    },
  },
};

/** Draws one boil frame of a fish facing right, centred in a FISH_TEX square canvas. */
export function drawFish(ctx: CanvasRenderingContext2D, shape: FishShape, variant: InkVariant, seed: number): void {
  const b = BODIES[shape];
  const pen = new Pen(ctx, seed, 1.1);
  const heavy = variant === 'heavy';
  const line = heavy ? 3.4 : 2.2;
  const ink = shape === 'inkling' ? '#1f3f8a' : INK;
  const outline = bodyOutline(b, shape === 'eel' ? 4 : 0);

  tail(pen, b, line);
  pen.fill(outline, '#fffaf0', 1);
  pen.fill(outline, b.wash, heavy ? 0.45 : 0.28);
  if (heavy) {
    pen.fill(outline, '#a3342b', 0.16);
    pen.hatch(outline, 4.5, Math.PI / 4, 1, { alpha: 0.75 });
    pen.hatch(outline, 5.5, -Math.PI / 4, 1, { alpha: 0.6 });
  } else {
    pen.hatch(outline, 6, Math.PI / 5, 0.9, { onlyBelow: C + b.hh * 0.15, alpha: 0.55, color: ink });
    scales(pen, b, line);
  }
  b.extras(pen, outline, { x: C, y: C }, b);
  gill(pen, b, line);
  pen.closed(outline, line, ink);
  const eyeR = shape === 'inkling' ? 9 : Math.max(4, b.hh * 0.24);
  eye(pen, C + b.hl * 0.62, C - b.hh * 0.25, eyeR, line);
  if (heavy) {
    // Angry brow: predators read as predators at a glance.
    pen.stroke([{ x: C + b.hl * 0.5, y: C - b.hh * 0.55 }, { x: C + b.hl * 0.78, y: C - b.hh * 0.4 }], 2.6);
  }
}
