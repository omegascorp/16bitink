import type { JellyId } from '../levels/jellies';
import { JELLY_INFO } from '../levels/jellies';
import { createRng } from '../logic/rng';
import { ribbon } from './decorKit';
import { halo } from './glowArt';
import { ellipse, INK, PAPER, Pen, type Pt } from './pen';
import { ART_RES } from './propArt';

/**
 * The jellyfish, one per zone, drawn from life: bell shape, tentacles, arms
 * and markings follow the real species. Canvas is JELLY_TEX square (times
 * ART_RES), the bell's rim near the middle so the sprite's centre sits on
 * the body; tentacles hang below.
 */
export const JELLY_TEX = 128;

type Draw = (pen: Pen, frame: number) => void;

const S = ART_RES;
const P = (x: number, y: number): Pt => ({ x: x * S, y: y * S });
const scaled = (pts: readonly Pt[]): Pt[] => pts.map((p) => P(p.x, p.y));
const CX = 64;

/**
 * A bell outline in unit space: the dome from the left rim over the top to
 * the right rim, then back along the margin. `power` < 1 squares the dome off,
 * > 1 draws it to a point like a helmet. `lobes` scallops the margin.
 */
function bell(rimY: number, w: number, h: number, power = 1, lobes = 0, lobeDepth = 0, cx = CX): Pt[] {
  const pts: Pt[] = [];
  for (let i = 0; i <= 28; i++) {
    const a = Math.PI + (i / 28) * Math.PI;
    const c = Math.cos(a);
    const sn = Math.sin(a);
    pts.push({ x: cx + Math.sign(c) * Math.pow(Math.abs(c), power) * w, y: rimY + sn * h });
  }
  const n = Math.max(12, lobes * 4);
  for (let i = 0; i <= n; i++) {
    const u = i / n;
    const dip = lobes ? Math.abs(Math.sin(u * Math.PI * lobes)) * lobeDepth : 0;
    pts.push({ x: cx + w - u * 2 * w, y: rimY + dip });
  }
  return pts;
}

/** Wavy hanging lines from the rim. */
function tentacles(pen: Pen, frame: number, from: number, to: number, rimY: number, count: number, len: number, opts: { wave?: number; width?: number; color?: string; alpha?: number; spread?: number } = {}): void {
  const { wave = 3, width = 0.5, color = INK, alpha = 0.6, spread = 0 } = opts;
  for (let t = 0; t < count; t++) {
    const u = count === 1 ? 0.5 : t / (count - 1);
    const x0 = from + u * (to - from);
    const out = (u - 0.5) * spread;
    const pts: Pt[] = [];
    const steps = Math.max(6, Math.round(len / 4));
    for (let i = 0; i <= steps; i++) {
      const k = i / steps;
      pts.push(P(x0 + out * k + Math.sin(k * 5 + t * 1.3 + frame * 0.7) * wave * k, rimY + k * len));
    }
    pen.hair(pts, width * S, color, alpha);
  }
}

/** Frilly oral arms: ribbons hanging from the centre of the bell. */
function arms(pen: Pen, frame: number, rimY: number, count: number, len: number, width: number, fill: string, fillAlpha: number, curl = 5): void {
  for (let k = 0; k < count; k++) {
    const x0 = CX - (count - 1) * 3 + k * 6;
    const steps = Math.max(8, Math.round(len / 3.5));
    const center: Pt[] = [];
    for (let i = 0; i <= steps; i++) {
      const u = i / steps;
      center.push(P(x0 + Math.sin(u * 7 + k * 1.9 + frame * 0.6) * curl * (0.4 + u), rimY - 4 + u * len));
    }
    const { left, right, shape } = ribbon(center, (u) => (width - u * width * 0.6) * S);
    pen.fill(shape, fill, fillAlpha);
    pen.hair(left, 0.5 * S, INK, 0.75);
    pen.hair(right, 0.5 * S, INK, 0.75);
  }
}

/** Paper, a wash of the jelly's colour, stipple shading the lower bell, then the outline. */
function body(pen: Pen, shape: readonly Pt[], color: string, alpha: number, rimY: number, h: number, marks?: () => void): void {
  const pts = scaled(shape);
  pen.fill(pts, PAPER, 0.9);
  pen.fill(pts, color, alpha);
  if (marks) pen.clipped(pts, marks);
  pen.stipple(pts, 380, (_x, y) => Math.max(0, (y - (rimY - h) * S) / (h * S)) * 0.45, 0.45 * S);
  pen.stroke(pts, 1.1 * S, INK, 1);
}

/** Radial canals seen through a translucent bell. */
function canals(pen: Pen, rimY: number, w: number, h: number, count: number, color = INK, alpha = 0.4): void {
  for (let r = 0; r < count; r++) {
    const a = Math.PI + ((r + 0.5) / count) * Math.PI;
    pen.hair([P(CX, rimY - h * 0.7), P(CX + Math.cos(a) * w * 0.55, rimY - h * 0.55 + Math.sin(a) * h * 0.2), P(CX + Math.cos(a) * w * 0.95, rimY + Math.sin(a) * h * 0.85 + 1)], 0.45 * S, color, alpha);
  }
}

const moonjelly: Draw = (pen, f) => {
  const rim = 56;
  tentacles(pen, f, 26, 102, rim + 1, 30, 10, { wave: 1.2, alpha: 0.45, width: 0.4 });
  arms(pen, f, rim, 4, 22, 3, '#d6c8ec', 0.5, 3);
  body(pen, bell(rim, 39, 20, 0.85, 16, 1.2), '#c9d6ea', 0.25, rim, 20, () => {
    // Four violet horseshoe gonads around the centre.
    for (let g = 0; g < 4; g++) {
      const a = (g / 4) * Math.PI * 2 + 0.5;
      const gx = CX + Math.cos(a) * 9;
      const gy = rim - 9 + Math.sin(a) * 3.5;
      const arc = Array.from({ length: 10 }, (_, i) => {
        const t = Math.PI * 0.15 + (i / 9) * Math.PI * 1.7 + a;
        return P(gx + Math.cos(t) * 4.5, gy + Math.sin(t) * 2.2);
      });
      pen.stroke(arc, 1.6 * S, '#9a6cc8', 0.85, false);
    }
    canals(pen, rim, 39, 20, 16, '#6b5a8a', 0.3);
  });
};

const compassjelly: Draw = (pen, f) => {
  const rim = 54;
  tentacles(pen, f, 30, 98, rim + 1, 24, 34, { wave: 4, alpha: 0.55, color: '#5a3a24' });
  arms(pen, f, rim, 4, 50, 4, '#efe0c0', 0.6, 6);
  body(pen, bell(rim, 35, 27, 1, 8, 2.4), '#e2c98e', 0.35, rim, 27, () => {
    // Sixteen brown V marks radiating from a brown centre: the compass rose.
    pen.fill(scaled(ellipse(CX, rim - 25, 5, 3, 12)), '#7a4a2a', 0.8);
    for (let v = 0; v < 16; v++) {
      const a = Math.PI + ((v + 0.5) / 16) * Math.PI;
      const tip = P(CX + Math.cos(a) * 33, rim + Math.sin(a) * 25 + 2);
      const base = P(CX + Math.cos(a) * 9, rim - 22 + Math.sin(a) * 2);
      const side = P(CX + Math.cos(a + 0.18) * 20, rim + Math.sin(a + 0.18) * 14 - 6);
      pen.stroke([base, side, tip], 1.1 * S, '#7a4a2a', 0.75, false);
    }
  });
};

const seanettle: Draw = (pen, f) => {
  const rim = 52;
  tentacles(pen, f, 30, 98, rim + 1, 24, 62, { wave: 5, alpha: 0.75, color: '#5e1f24', width: 0.55 });
  arms(pen, f, rim, 4, 66, 4.5, '#f4e6c8', 0.75, 9);
  body(pen, bell(rim, 36, 29, 1.05, 16, 1.4), '#d99a3c', 0.55, rim, 29, () => {
    canals(pen, rim, 36, 29, 16, '#7a4a18', 0.45);
    pen.hatch(scaled(bell(rim, 36, 29)), 3 * S, 1.1, 0.45 * S, { onlyBelow: (rim - 12) * S, color: '#7a4a18', alpha: 0.4 });
  });
};

const boxjelly: Draw = (pen, f) => {
  const rim = 60;
  const w = 24;
  // A tentacle bunch hanging from a stiff pedalium at each corner.
  for (const side of [-1, -0.35, 0.35, 1]) {
    const x = CX + side * (w - 3);
    pen.stroke([P(x, rim - 2), P(x + side * 2, rim + 6)], 1.4 * S, INK, 0.85, false);
    tentacles(pen, f, x + side * 2 - 2, x + side * 2 + 2, rim + 6, 4, 52, { wave: 4, alpha: 0.55, width: 0.45, spread: 6 });
  }
  const box = bell(rim, w, 36, 0.35, 0, 0);
  body(pen, box, '#bcd8ea', 0.3, rim, 36, () => {
    // Faces of the cube and the eye clusters on each side.
    pen.hair([P(CX - 8, rim - 33), P(CX - 9, rim)], 0.5 * S, INK, 0.45);
    pen.hair([P(CX + 8, rim - 33), P(CX + 9, rim)], 0.5 * S, INK, 0.45);
    for (const x of [CX - 16, CX, CX + 16]) {
      pen.dot(x * S, (rim - 7) * S, 0.8 * S, INK, 0.8);
      pen.dot(x * S, (rim - 5) * S, 0.45 * S, INK, 0.7);
    }
  });
};

const lionsmane: Draw = (pen, f) => {
  const rim = 46;
  // A curtain of hair: eight clusters of many fine tentacles.
  for (let c = 0; c < 8; c++) {
    const x = 24 + c * 11.4;
    tentacles(pen, f, x - 3, x + 3, rim + 2, 7, 76 - Math.abs(c - 3.5) * 4, { wave: 6, alpha: 0.5, color: '#6b1f1f', width: 0.4, spread: 6 });
  }
  arms(pen, f, rim, 5, 48, 6, '#d98a6a', 0.65, 7);
  body(pen, bell(rim, 42, 22, 0.8, 8, 3.2), '#a3342b', 0.62, rim, 22, () => {
    canals(pen, rim, 42, 22, 16, '#4a1010', 0.5);
    pen.hatch(scaled(bell(rim, 42, 22)), 2.6 * S, 0.9, 0.45 * S, { color: '#4a1010', alpha: 0.35 });
  });
};

const mauvestinger: Draw = (pen, f) => {
  const rim = 54;
  tentacles(pen, f, 40, 88, rim + 1, 8, 66, { wave: 6, alpha: 0.7, color: '#6b3f80', width: 0.55 });
  arms(pen, f, rim, 4, 40, 3.5, '#d8b0e0', 0.7, 6);
  body(pen, bell(rim, 25, 30, 1.25, 16, 1.6), '#b77fc0', 0.5, rim, 30, () => {
    // Warts of stinging cells all over the bell.
    const rng = createRng(17);
    for (let i = 0; i < 46; i++) {
      const a = Math.PI + rng() * Math.PI;
      const r = Math.sqrt(rng());
      pen.dot((CX + Math.cos(a) * 23 * r) * S, (rim + Math.sin(a) * 27 * r) * S, (0.7 + rng() * 0.7) * S, '#6b3f80', 0.85);
    }
  });
};

const COMB_ROW_COLORS = ['#ff5a7a', '#ffb54a', '#f2f05a', '#5ae08a', '#4ac8ff', '#9a7aff'];

/** Points down one of a comb jelly's eight comb rows. */
function combRow(k: number): Pt[] {
  const side = (k / 7) * 2 - 1;
  return Array.from({ length: 9 }, (_, i) => {
    const u = i / 8;
    return { x: CX + side * 20 * Math.sin(0.4 + u * 2.4), y: 24 + u * 60 };
  });
}

const combjelly: Draw = (pen, f) => {
  // A lobate comb jelly: a glassy body, two big flapping lobes, eight rows of beating combs. No stinging tentacles.
  const flap = Math.sin(f * 2.1) * 2;
  const shape: Pt[] = [];
  for (let i = 0; i <= 40; i++) {
    const a = (i / 40) * Math.PI * 2;
    const lobe = Math.sin(a) > 0 ? 1 + 0.45 * Math.pow(Math.sin(a), 3) : 1;
    shape.push({ x: CX + Math.cos(a) * 24 * lobe + (Math.sin(a) > 0.6 ? Math.sign(Math.cos(a)) * flap : 0), y: 52 + Math.sin(a) * 34 * (Math.sin(a) > 0 ? 1.1 : 1) });
  }
  const pts = scaled(shape);
  pen.fill(pts, PAPER, 0.75);
  pen.fill(pts, '#cfe6f2', 0.25);
  pen.clipped(pts, () => {
    // The red-pigmented gut down the middle hides the glow of the prey it swallowed.
    pen.fill(scaled(ellipse(CX, 50, 4.5, 18, 14)), '#b83a3a', 0.55);
    for (let k = 0; k < 8; k++) {
      const row = combRow(k);
      pen.hair(scaled(row), 0.5 * S, INK, 0.5);
      row.forEach((p, i) => pen.dot(p.x * S, p.y * S, 1.1 * S, COMB_ROW_COLORS[(i + k + f) % COMB_ROW_COLORS.length]!, 0.9));
    }
  });
  pen.stroke(pts, 1 * S, INK, 0.9);
};

const atolla: Draw = (pen, f) => {
  const rim = 58;
  tentacles(pen, f, 26, 102, rim + 2, 20, 18, { wave: 2, alpha: 0.6, color: '#5a0f18', width: 0.6 });
  // One tentacle many times longer than the rest, trailing for prey.
  tentacles(pen, f, 78, 78, rim + 2, 1, 64, { wave: 7, alpha: 0.75, color: '#5a0f18', width: 0.7 });
  body(pen, bell(rim, 38, 17, 0.75, 20, 1.8), '#8a1f2a', 0.7, rim, 17, () => {
    // The crown: a deep groove ringing the bell, with radial grooves out to the margin.
    pen.stroke(scaled(Array.from({ length: 17 }, (_, i) => ({ x: CX - 30 + i * 3.75, y: rim - 7 - Math.sin((i / 16) * Math.PI) * 6 }))), 1 * S, '#3a0610', 0.8, false);
    for (let r = 0; r < 20; r++) {
      const x = CX - 36 + r * 3.8;
      pen.hair([P(x, rim - 6 - Math.sin(((x - CX + 36) / 72) * Math.PI) * 5), P(x, rim + 1)], 0.5 * S, '#3a0610', 0.7);
    }
    pen.fill(scaled(ellipse(CX, rim - 12, 12, 4, 14)), '#5a0f18', 0.6);
  });
};

const crownjelly: Draw = (pen, f) => {
  const rim = 62;
  // Twelve thick tentacles, often held curled up and outwards.
  for (let t = 0; t < 12; t++) {
    const u = t / 11;
    const x = CX - 26 + u * 52;
    const out = (u - 0.5) * 2;
    const pts = Array.from({ length: 9 }, (_, i) => {
      const k = i / 8;
      return P(x + out * k * 14 + Math.sin(k * 3 + t + f) * 2, rim + 2 + k * 26 - k * k * 10 * Math.abs(out));
    });
    pen.stroke(pts, 1.1 * S, '#4a1028', 0.8, false);
  }
  body(pen, bell(rim, 28, 44, 1.9, 6, 3), '#6e2440', 0.6, rim, 44, () => {
    // Outer bell translucent, the dark red stomach showing through the cone.
    pen.fill(scaled(bell(rim - 4, 16, 34, 1.9)), '#3a0a1c', 0.55);
    pen.hair([P(CX - 28, rim - 10), P(CX + 28, rim - 10)], 0.6 * S, '#3a0a1c', 0.6);
    canals(pen, rim, 28, 44, 6, '#3a0a1c', 0.4);
  });
};

const trenchjelly: Draw = (pen, f) => {
  const rim = 62;
  // A shallow little bell trailing a ring of some two hundred fine tentacles.
  tentacles(pen, f, 42, 86, rim + 1, 46, 40, { wave: 3, alpha: 0.4, color: '#5a2214', width: 0.35, spread: 26 });
  body(pen, bell(rim, 22, 13, 0.9, 12, 1), '#8a3b2a', 0.6, rim, 13, () => {
    pen.fill(scaled(ellipse(CX, rim - 4, 10, 4, 14)), '#5a1a10', 0.6);
    canals(pen, rim, 22, 13, 8, '#3a0a04', 0.5);
  });
};

const DRAW: Readonly<Record<JellyId, Draw>> = {
  moonjelly, compassjelly, seanettle, boxjelly, lionsmane, mauvestinger, combjelly, atolla, crownjelly, trenchjelly,
};

export function drawJellyKind(ctx: CanvasRenderingContext2D, kind: JellyId, frame: number, seed: number): void {
  DRAW[kind](new Pen(ctx, seed, 0.6), frame);
}

/** The living light of a glowing jelly, laid over its drawing with additive blending. */
export function drawJellyGlow(ctx: CanvasRenderingContext2D, kind: JellyId): void {
  const color = JELLY_INFO[kind].glow;
  if (!color) return;
  const h = (x: number, y: number, r: number, c = color, k = 1): void => halo(ctx, x * S, y * S, r * S, c, k);
  switch (kind) {
    case 'mauvestinger':
      // The whole bell sparkles when touched: light from every wart.
      h(CX, 40, 34, color, 0.45);
      for (let i = 0; i < 8; i++) h(40 + i * 7, 60 + (i % 3) * 12, 7, color, 0.7);
      break;
    case 'combjelly':
      h(CX, 52, 40, color, 0.35);
      for (let k = 0; k < 8; k++) combRow(k).forEach((p, i) => i % 2 === 0 && h(p.x, p.y, 5, COMB_ROW_COLORS[(i + k) % COMB_ROW_COLORS.length], 0.75));
      break;
    case 'atolla':
      // The "burglar alarm": a ring of blue lights around the crown.
      for (let i = 0; i < 14; i++) {
        const a = Math.PI + (i / 13) * Math.PI;
        h(CX + Math.cos(a) * 34, 58 + Math.sin(a) * 12, 8, color, 0.9);
      }
      h(CX, 52, 40, color, 0.25);
      break;
    case 'crownjelly':
      h(CX, 40, 34, color, 0.35);
      for (let i = 0; i < 10; i++) h(CX - 22 + i * 4.9, 58 - Math.sin((i / 9) * Math.PI) * 6, 6, color, 0.75);
      break;
    default:
      h(CX, 50, 36, color, 0.5);
  }
}
