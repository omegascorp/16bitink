import { halo } from '../../../src/art/glowArt';
import { bodyProportions } from '../../../src/art/fishArt';
import { C, xAt } from '../../../src/art/fish/kit';
import { ANATOMY } from '../../../src/art/fish/registry';
import type { Sprite } from '../sprites';
import { mouthGeom } from '../gulper/mouth';
import { drawJaw, drawPouch } from '../gulper/pouch';

/**
 * The gulper eel drawn along a bent spine, so it can be slurped like a
 * noodle. The game's drawing (the bare one from ../gulper/mouth.ts, its
 * painted pouch left off) is cut into thin columns, and each column is laid
 * on the spine where it belongs and turned with it: the long thin body
 * follows any curve, the whip of a tail included. The gulper's hinged jaw
 * and pouch (../gulper/pouch.ts) ride on its head, which stays straight.
 *
 * A spine is a list of points, nose to whip tip, at SPINE.sigmas: texture
 * px of the drawing behind the nose (negative is in front of it). The
 * gulper faces left, mirrored as the game flips a sprite: its drawing's
 * "down" stays on the right-hand side of its nose-to-tail line.
 */

export interface Pt {
  readonly x: number;
  readonly y: number;
}

const GULPER = ANATOMY.gulper;
const HL = bodyProportions('gulper').hl;
/** The nose, in texture px: column x is SIGMA = NOSE_X - x behind it. */
export const NOSE_X = xAt(GULPER, 0);
const STEP = 4;
/** From just in front of the nose (the drawing's ink round it) to the whip's tip (texture x 12). */
export const SPINE = (() => {
  const from = -36;
  const to = 212;
  const sigmas = Array.from({ length: (to - from) / STEP + 1 }, (_, i) => from + i * STEP);
  return { from, to, sigmas };
})();

/** The whip past the tail, as the game draws it (species/deep.ts: root, bow, tip), texture px. */
const WHIP = { root: { x: xAt(GULPER, 1) + 6, y: C }, ctrl: { x: (xAt(GULPER, 1) + 6 + 12) / 2, y: C + 22 }, end: { x: 12, y: C - 10 } } as const;

/** A point on the spine at `s` texture px behind the nose, and the way the nose points there. */
function sample(spine: readonly Pt[], s: number): { readonly p: Pt; readonly f: Pt } {
  const u = Math.max(0, Math.min(spine.length - 1.0001, (s - SPINE.from) / STEP));
  const i = Math.floor(u);
  const e = u - i;
  const a = spine[i]!;
  const b = spine[i + 1]!;
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const d = Math.hypot(dx, dy) || 1;
  return { p: { x: a.x + (b.x - a.x) * e, y: a.y + (b.y - a.y) * e }, f: { x: dx / d, y: dy / d } };
}

/** The drawing's "down" for a gulper facing left: the right-hand side of the way its nose points. */
const downOf = (f: Pt): Pt => ({ x: f.y, y: -f.x });

/** A point of the drawing (texture px, facing right) on the bent eel: `k` screen px per texture px. */
export function onSpine(spine: readonly Pt[], k: number, tex: Pt): Pt {
  const { p, f } = sample(spine, NOSE_X - tex.x);
  const n = downOf(f);
  return { x: p.x + n.x * (tex.y - C) * k, y: p.y + n.y * (tex.y - C) * k };
}

/** Screen px per texture px for a gulper `length` long on screen. */
export const kOf = (length: number): number => length / (2 * HL);

/** The body, column by column along the spine (screen px). */
export function drawNoodle(ctx: CanvasRenderingContext2D, sprite: Sprite, spine: readonly Pt[], k: number, boil: number): void {
  const canvas = sprite.frames[boil % sprite.frames.length]!;
  const R = sprite.res;
  const half = canvas.width / 2;
  const base = ctx.getTransform();
  const w = 2;
  const overlap = (1.3 * R) / k;
  for (let x = 6; x < NOSE_X + 8; x += w) {
    const { p, f } = sample(spine, NOSE_X - (x + w / 2));
    const n = downOf(f);
    const m = base.multiply(new DOMMatrix([(f.x * k) / R, (f.y * k) / R, (n.x * k) / R, (n.y * k) / R, p.x, p.y]));
    ctx.setTransform(m);
    ctx.drawImage(canvas, x * R, 0, w * R, canvas.height, (-w / 2) * R, -half, w * R + overlap, canvas.height);
  }
  ctx.setTransform(base);
}

/** Runs `draw` in the head's frame: snout-relative texture px, as ../gulper/mouth.ts measures the jaw and pouch. */
function inHead(ctx: CanvasRenderingContext2D, spine: readonly Pt[], k: number, draw: () => void): void {
  const { p, f } = sample(spine, 4);
  const n = downOf(f);
  const nose = { x: p.x + f.x * 4 * k + n.x * k, y: p.y + f.y * 4 * k + n.y * k };
  ctx.save();
  ctx.transform(f.x * k, f.y * k, n.x * k, n.y * k, nose.x, nose.y);
  draw();
  ctx.restore();
}

export interface EelLook {
  readonly jaw: number;
  readonly fill: number;
  /** How much of the jaw and pouch shows, 0 .. 1. */
  readonly mouth: number;
  /** The tail light's strength. */
  readonly glow: number;
}

/** The whole gulper: pouch behind, the body, the jaw in front, a chalk line on the ink-dark whip, and its tail light. */
export function drawGulper(ctx: CanvasRenderingContext2D, sprite: Sprite, spine: readonly Pt[], length: number, boil: number, look: EelLook): void {
  const k = kOf(length);
  const g = mouthGeom(look.jaw, look.fill);
  if (look.mouth > 0.01) {
    ctx.save();
    ctx.globalAlpha *= look.mouth;
    inHead(ctx, spine, k, () => drawPouch(ctx, g, look.fill, look.jaw, boil, () => undefined));
    ctx.restore();
  }
  drawNoodle(ctx, sprite, spine, k, boil);
  if (look.mouth > 0.01) {
    ctx.save();
    ctx.globalAlpha *= look.mouth;
    inHead(ctx, spine, k, () => drawJaw(ctx, g, look.fill, look.jaw, boil));
    ctx.restore();
  }
  // The whip of a tail is ink on ink: a faint chalk line so it shows.
  const whip = Array.from({ length: 13 }, (_, i) => {
    const s = i / 12;
    const u = 1 - s;
    return onSpine(spine, k, {
      x: u * u * WHIP.root.x + 2 * u * s * WHIP.ctrl.x + s * s * WHIP.end.x,
      y: u * u * WHIP.root.y + 2 * u * s * WHIP.ctrl.y + s * s * WHIP.end.y,
    });
  });
  ctx.save();
  ctx.strokeStyle = '#dcd6e6';
  ctx.globalAlpha *= 0.45;
  ctx.lineWidth = Math.max(1.5, 1.1 * k);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  whip.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
  ctx.stroke();
  ctx.restore();
  const tip = whip[whip.length - 1]!;
  halo(ctx, tip.x, tip.y, 16 * k, '#ff7aa8', 0.55 * look.glow);
  halo(ctx, tip.x, tip.y, 4 * k, '#ffe0ec', 0.8 * look.glow);
}
