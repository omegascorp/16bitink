import { ellipse, INK, PAPER, type Pen, type Pt } from '../../../src/art/pen';
import { createRng } from '../../../src/logic/rng';
import { bake, capsule, curve, DENTICLE, DENTINE, ENAMEL, inked, type Prop, PULP, RED, SHARK_GREY, WOOD } from './kit';
import { LENS_R } from './story';

/**
 * The skin up close: what the magnifying glass shows (rows of tiny
 * tooth-shaped scales, all pointing to the tail, which is to the right), the
 * glass itself, and the two cut-away drawings, a scale beside a tooth, built
 * the same way: an enamel cap over dentine round a pulp cavity.
 */

const R = LENS_R;

/** One scale under the glass, about the lens's centre. */
export interface Denticle {
  readonly x: number;
  readonly y: number;
  readonly s: number;
  readonly turn: number;
}

/** Staggered rows, packed like shingles, each a little askew. */
export const DENTICLES: readonly Denticle[] = (() => {
  const rng = createRng(2024);
  const out: Denticle[] = [];
  for (let row = -4; row <= 4; row++) {
    for (let col = -4; col <= 4; col++) {
      const x = col * 66 + (row % 2 ? 33 : 0) + (rng() - 0.5) * 8;
      const y = row * 46 + (rng() - 0.5) * 6;
      if (Math.hypot(x, y) < R + 40) out.push({ x, y, s: 0.92 + rng() * 0.16, turn: (rng() - 0.5) * 0.16 });
    }
  }
  // Tailmost first: each scale's points lie over the root of the one behind it.
  return out.sort((a, b) => b.x - a.x);
})();

/** A scale seen from above, pointing right: a rounded front, three ridges running back to three points. */
function denticleOutline(d: Denticle): Pt[] {
  // The rounded front, bottom round to top, then the points at the back.
  const front = Array.from({ length: 9 }, (_, i) => {
    const a = Math.PI / 2 + (Math.PI * i) / 8;
    return { x: -14 + 18 * Math.cos(a), y: 18 * Math.sin(a) };
  });
  const back = [{ x: 34, y: -15 }, { x: 20, y: -6 }, { x: 46, y: 0 }, { x: 20, y: 6 }, { x: 34, y: 15 }];
  const c = Math.cos(d.turn);
  const s = Math.sin(d.turn);
  return [...front, ...back].map((p) => ({ x: d.x + d.s * (p.x * c - p.y * s), y: d.y + d.s * (p.x * s + p.y * c) }));
}

/** The patch of skin the glass shows: a disc of radius LENS_R (plus a margin), its centre the anchor. */
export function makeLensSkin(): Prop {
  const side = 2 * R + 40;
  return bake(side, side, side / 2, side / 2, 55, (pen, ctx) => {
    ctx.fillStyle = SHARK_GREY;
    ctx.fillRect(-side / 2, -side / 2, side, side);
    const all = ellipse(0, 0, R + 20, R + 20, 32);
    pen.stipple(all, 2600, () => 0.6, 1.1);
    for (const d of DENTICLES) {
      const outline = denticleOutline(d);
      // A shadow under each, then the scale, inked, with its ridges.
      pen.fill(outline.map((p) => ({ x: p.x + 5, y: p.y + 6 })), INK, 0.3);
      inked(pen, outline, DENTICLE, 2.6);
      for (const k of [-1, 0, 1]) {
        const at = (x: number, y: number): Pt => ({ x: d.x + d.s * x, y: d.y + d.s * (y + x * d.turn) });
        pen.hair([at(-22, k * 8), at(k ? 26 : 36, k * 11)], 1.5, INK, 0.6);
      }
    }
  });
}

/** A red arrow on each scale, pointing tailwards (`shown` 0 .. 1, scale by scale from the front). */
export function drawScaleArrows(ctx: CanvasRenderingContext2D, cx: number, cy: number, shown: number): void {
  if (shown <= 0) return;
  ctx.save();
  ctx.strokeStyle = RED;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  for (const d of DENTICLES) {
    // They come on from the head end (left) to the tail end.
    const u = Math.max(0, Math.min(1, shown * 1.6 - (d.x + R) / (2 * R) * 0.6));
    if (u <= 0) continue;
    const x0 = cx + d.x - 10;
    const x1 = x0 + 34 * u;
    const y = cy + d.y;
    ctx.globalAlpha = u;
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(x0, y);
    ctx.lineTo(x1, y);
    ctx.moveTo(x1 - 10, y - 8);
    ctx.lineTo(x1, y);
    ctx.lineTo(x1 - 10, y + 8);
    ctx.stroke();
  }
  ctx.restore();
}

/** The magnifying glass: a thick rim with a glint, and a wooden handle down to the lower right. Its anchor is the lens's centre. */
export const HANDLE_ANGLE = 0.75;
export function makeMagnifier(): Prop {
  return bake(2 * R + 260, 2 * R + 260, R + 40, R + 40, 77, (pen, ctx) => {
    const along = (r: number): Pt => ({ x: Math.cos(HANDLE_ANGLE) * r, y: Math.sin(HANDLE_ANGLE) * r });
    inked(pen, capsule(along(R + 6), along(R + 42), 10), '#4a5059', 3);
    inked(pen, capsule(along(R + 42), along(R + 140), 19), WOOD, 3.5);
    pen.hair([along(R + 60), along(R + 125)].map((p) => ({ x: p.x - 6, y: p.y + 4 })), 2, INK, 0.45);
    // The rim: a metal ring, inked inside and out.
    ctx.save();
    ctx.beginPath();
    ctx.arc(0, 0, R + 13, 0, Math.PI * 2);
    ctx.arc(0, 0, R, 0, Math.PI * 2, true);
    ctx.fillStyle = '#5b626c';
    ctx.fill();
    ctx.restore();
    pen.circle(0, 0, R + 13, 4.5);
    pen.circle(0, 0, R, 3.5);
    // A glint across the glass.
    pen.stroke(curve({ x: -R * 0.72, y: -R * 0.3 }, { x: -R * 0.62, y: -R * 0.66 }, { x: -R * 0.28, y: -R * 0.74 }), 7, PAPER, 0.75, false);
    pen.stroke(curve({ x: -R * 0.6, y: -R * 0.1 }, { x: -R * 0.55, y: -R * 0.3 }, { x: -R * 0.42, y: -R * 0.42 }, 6), 4, PAPER, 0.55, false);
  });
}

// ---------------------------------------------------------------- cut away

/** Layers in the same colours on both: enamel, dentine, pulp. */
function layers(pen: Pen, outer: readonly Pt[], dentine: readonly Pt[], pulp: readonly Pt[]): void {
  pen.fill(outer, ENAMEL, 1);
  pen.fill(dentine, DENTINE, 1);
  pen.hair([...dentine, dentine[0]!], 1.8, INK, 0.55);
  inked(pen, pulp, PULP, 2);
  pen.closed(outer, 4);
}

/** One scale cut through, side on, leaning back to the tail (right), rooted in the skin. Anchor: the skin line under its middle. */
export function makeDenticleCut(): Prop {
  return bake(300, 240, 140, 200, 91, (pen) => {
    const band = [{ x: -125, y: -8 }, { x: 140, y: -8 }, { x: 140, y: 28 }, { x: -125, y: 28 }];
    pen.fill(band, SHARK_GREY, 0.55);
    pen.hatch(band, 9, -0.9, 1.2, { alpha: 0.35 });
    pen.stroke([{ x: -125, y: -8 }, { x: 140, y: -8 }], 2.5);
    const outer = [
      { x: -80, y: 0 }, { x: -70, y: -24 }, { x: -26, y: -28 }, { x: -22, y: -58 },
      ...curve({ x: -22, y: -58 }, { x: -40, y: -112 }, { x: -6, y: -140 }, 8).slice(1),
      ...curve({ x: -6, y: -140 }, { x: 60, y: -142 }, { x: 112, y: -96 }, 10).slice(1),
      ...curve({ x: 112, y: -96 }, { x: 60, y: -90 }, { x: 24, y: -66 }, 8).slice(1),
      { x: 20, y: -30 }, { x: 66, y: -24 }, { x: 80, y: 0 },
    ];
    const dentine = [
      { x: -68, y: 0 }, { x: -60, y: -16 }, { x: -14, y: -22 }, { x: -10, y: -58 },
      ...curve({ x: -10, y: -58 }, { x: -24, y: -104 }, { x: -2, y: -122 }, 8).slice(1),
      ...curve({ x: -2, y: -122 }, { x: 50, y: -124 }, { x: 88, y: -98 }, 10).slice(1),
      ...curve({ x: 88, y: -98 }, { x: 52, y: -94 }, { x: 14, y: -74 }, 8).slice(1),
      { x: 10, y: -24 }, { x: 58, y: -16 }, { x: 68, y: 0 },
    ];
    const pulp = [{ x: -24, y: 0 }, { x: -8, y: -22 }, { x: -4, y: -64 }, { x: 8, y: -94 }, { x: 18, y: -80 }, { x: 6, y: -24 }, { x: 22, y: 0 }];
    layers(pen, outer, dentine, pulp);
  });
}

/** A tooth cut through: a crown with two cusps over two roots. Anchor: under the middle of its roots. */
export function makeToothCut(): Prop {
  return bake(220, 270, 110, 250, 92, (pen, ctx) => {
    const outer = [
      { x: -40, y: 0 }, ...curve({ x: -40, y: 0 }, { x: -62, y: -70 }, { x: -64, y: -140 }, 8).slice(1),
      ...curve({ x: -64, y: -140 }, { x: -74, y: -205 }, { x: -36, y: -222 }, 8).slice(1),
      ...curve({ x: -36, y: -222 }, { x: -14, y: -224 }, { x: 0, y: -208 }, 5).slice(1),
      ...curve({ x: 0, y: -208 }, { x: 14, y: -224 }, { x: 36, y: -222 }, 5).slice(1),
      ...curve({ x: 36, y: -222 }, { x: 74, y: -205 }, { x: 64, y: -140 }, 8).slice(1),
      ...curve({ x: 64, y: -140 }, { x: 62, y: -70 }, { x: 40, y: 0 }, 8).slice(1),
      ...curve({ x: 40, y: 0 }, { x: 26, y: -70 }, { x: 0, y: -96 }, 8).slice(1),
      ...curve({ x: 0, y: -96 }, { x: -26, y: -70 }, { x: -40, y: 0 }, 8).slice(1, -1),
    ];
    // The enamel is only the crown's cap: dentine below the neck.
    const crown = [
      ...curve({ x: -52, y: -138 }, { x: -58, y: -192 }, { x: -30, y: -200 }, 8),
      ...curve({ x: -30, y: -200 }, { x: 0, y: -206 }, { x: 0, y: -192 }, 4).slice(1),
      ...curve({ x: 0, y: -192 }, { x: 0, y: -206 }, { x: 30, y: -200 }, 4).slice(1),
      ...curve({ x: 30, y: -200 }, { x: 58, y: -192 }, { x: 52, y: -138 }, 8).slice(1),
    ];
    const pulp = [
      { x: -30, y: -150 }, { x: -24, y: -178 }, { x: 0, y: -168 }, { x: 24, y: -178 }, { x: 30, y: -150 }, { x: 22, y: -110 }, { x: 32, y: -14 },
      { x: 25, y: -12 }, { x: 11, y: -102 }, { x: 0, y: -110 }, { x: -11, y: -102 }, { x: -25, y: -12 }, { x: -32, y: -14 }, { x: -22, y: -110 },
    ];
    pen.fill(outer, DENTINE, 1);
    pen.clipped(outer, () => {
      ctx.fillStyle = ENAMEL;
      ctx.fillRect(-90, -240, 180, 102);
    });
    pen.fill(crown, DENTINE, 1);
    pen.hair(crown, 1.8, INK, 0.55);
    inked(pen, pulp, PULP, 2);
    pen.closed(outer, 4);
  });
}
