import type { Anatomy } from '../../../src/art/fish/kit';
import { C, topAt, xAt } from '../../../src/art/fish/kit';
import { ANATOMY } from '../../../src/art/fish/registry';
import { halo } from '../../../src/art/glowArt';
import { ellipse, INK } from '../../../src/art/pen';

/**
 * The anglerfish (the game's 'angler', art/fish/species/reef.ts) with its
 * lure taken off the drawing, so the lure can be drawn on top: dangling and
 * twitching in front of its face, swept back over its head as it's dragged
 * in, caught on the viper's lip, slurped in last, and glowing through the
 * viper's belly. The lure is drawn as the game draws it: an inked stalk
 * from the forehead and a gold bulb with a pale halo and a ring of rays.
 */

interface Pt {
  readonly x: number;
  readonly y: number;
}

const ANGLER = ANATOMY.angler;

/** The angler as the game draws it, minus the lure: the warty skin only (the same strokes, from the same random draws). */
export const ANGLER_BARE: Anatomy = {
  ...ANGLER,
  extras: (k) => {
    k.pen.stipple(k.body, 1400, () => 0.35, 0.5, k.ink);
    for (let i = 0; i < 12; i++) {
      const t = 0.25 + k.pen.rng() * 0.6;
      const y = C + k.h(t) * (k.pen.rng() * 1.4 - 0.7);
      k.pen.hair(ellipse(k.x(t), y, 1.8, 1.4, 8).concat([{ x: k.x(t) + 1.8, y }]), 0.45, k.ink, 0.7);
    }
  },
};

/** Where the game's drawing roots the stalk, bends it, and hangs the bulb: fish-texture px, facing right. */
export const LURE_ROOT: Pt = { x: xAt(ANGLER, 0.28), y: topAt(ANGLER, 0.28) };
export const LURE_BULB: Pt = { x: xAt(ANGLER, 0) + 16, y: topAt(ANGLER, 0.3) - 26 };
export const LURE_BEND: Pt = { x: xAt(ANGLER, 0.12), y: LURE_BULB.y - 18 };
/** The stalk's length, texture px. */
export const STALK = Math.hypot(LURE_BULB.x - LURE_ROOT.x, LURE_BULB.y - LURE_ROOT.y) * 1.12;
/** How far back the stalk's root is, as a share of the body from the nose. */
export const ROOT_ALONG = (xAt(ANGLER, 0) - LURE_ROOT.x) / (2 * ANGLER.hl);

const GOLD = '#f0c94a';
const RAYS = '#b08a1a';

/** The stalk from `root` to `bulb`, bowed through `bend`, `k` screen px per texture px. */
export function drawStalk(ctx: CanvasRenderingContext2D, root: Pt, bend: Pt, bulb: Pt, k: number): void {
  ctx.save();
  ctx.lineCap = 'round';
  ctx.strokeStyle = INK;
  ctx.lineWidth = Math.max(1.5, 1.25 * k);
  ctx.beginPath();
  ctx.moveTo(root.x, root.y);
  ctx.quadraticCurveTo(bend.x, bend.y, bulb.x, bulb.y);
  ctx.stroke();
  // A second, finer pen line beside it, as the game's strokes have.
  ctx.globalAlpha = 0.5;
  ctx.lineWidth = Math.max(1, 0.45 * k);
  ctx.beginPath();
  ctx.moveTo(root.x + 0.6 * k, root.y + 0.5 * k);
  ctx.quadraticCurveTo(bend.x + 0.6 * k, bend.y + 0.8 * k, bulb.x + 0.4 * k, bulb.y + 0.6 * k);
  ctx.stroke();
  ctx.restore();
}

/** The bulb, as the game paints it, lit up by `glow` (0 dark .. 1 bright): its light in the water, then the drawing, then a hot core. */
export function drawBulb(ctx: CanvasRenderingContext2D, at: Pt, k: number, glow: number, spin: number): void {
  if (glow > 0.01) halo(ctx, at.x, at.y, 85 * k, GOLD, 0.8 * glow);
  ctx.save();
  ctx.translate(at.x, at.y);
  ctx.fillStyle = GOLD;
  ctx.globalAlpha = 0.25;
  ctx.beginPath();
  ctx.arc(0, 0, 9 * k, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 0.95;
  ctx.beginPath();
  ctx.arc(0, 0, 5 * k, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.strokeStyle = INK;
  ctx.lineWidth = Math.max(1.2, 0.8 * k);
  ctx.stroke();
  ctx.strokeStyle = RAYS;
  ctx.lineWidth = Math.max(1, 0.45 * k);
  ctx.globalAlpha = 0.8;
  ctx.lineCap = 'round';
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + spin;
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * 7 * k, Math.sin(a) * 7 * k);
    ctx.lineTo(Math.cos(a) * 10 * k, Math.sin(a) * 10 * k);
    ctx.stroke();
  }
  ctx.restore();
  if (glow > 0.01) halo(ctx, at.x, at.y, 16 * k, '#fff6d8', 0.9 * glow);
}

/** The swallowed light shining out through the viper's stretched belly: a warm wash of gold over the skin, and a soft bright heart. */
export function drawBellyLight(ctx: CanvasRenderingContext2D, at: Pt, reach: number, glow: number): void {
  if (glow <= 0.01) return;
  const g = ctx.createRadialGradient(at.x, at.y, 0, at.x, at.y, reach);
  g.addColorStop(0, `rgba(255,205,80,${(0.6 * glow).toFixed(3)})`);
  g.addColorStop(0.45, `rgba(240,180,60,${(0.28 * glow).toFixed(3)})`);
  g.addColorStop(1, 'rgba(240,180,60,0)');
  ctx.save();
  ctx.fillStyle = g;
  ctx.fillRect(at.x - reach, at.y - reach, 2 * reach, 2 * reach);
  ctx.restore();
  halo(ctx, at.x, at.y, reach * 0.45, GOLD, 0.55 * glow);
}
