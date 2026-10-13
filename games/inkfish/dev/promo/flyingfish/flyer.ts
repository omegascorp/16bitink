import { bezier, C, heightAt, PAPER_FILL, type Anatomy, type Kit, xAt } from '../../../src/art/fish/kit';
import { ANATOMY } from '../../../src/art/fish/registry';
import { Pen, type Pt } from '../../../src/art/pen';
import type { Pose } from '../chain';

/**
 * The game's flying fish, with its wings taken off the drawing so they can
 * fold and unfold. The body is the game's own (art/fish/species/reef.ts),
 * minus the two wing-like pectorals its `under` hook draws; those are drawn
 * here, live, in the same pen and the same texture px, folded by `fold`
 * (0 tucked along the body, 1 spread as in the game).
 */

const GAME = ANATOMY.flyingfish;
const HIGHLIGHT = '#e2632a';

/** Fin membrane as the species file draws it: paper, faint wash, fanned rays, outline. */
function membrane(pen: Pen, shape: readonly Pt[], root: Pt, rays: number, wash: string, ink: string, heavy: boolean): void {
  pen.fill(shape, PAPER_FILL, 1);
  pen.fill(shape, wash, heavy ? 0.3 : 0.18);
  for (let i = 1; i < rays; i++) {
    const p = shape[Math.round((i / rays) * (shape.length - 1))]!;
    pen.hair([root, { x: (root.x + p.x) / 2 + pen.jitter(0.6), y: (root.y + p.y) / 2 }, p], 0.5, ink, 0.55);
  }
  pen.stroke([...shape], 1.1, ink, 1, false);
}

/** The long lower tail lobe, as the species draws it under the body. */
function lowerLobe(k: Kit): void {
  const x0 = k.x(1) + 3;
  const L = k.a.hh * k.a.tailSize;
  const S = L * 0.85;
  const tip = { x: x0 - L * 1.5, y: C + S * 1.35 };
  const lobe = [
    { x: x0, y: C }, ...bezier({ x: x0, y: C }, { x: x0 - L * 0.7, y: C + S * 0.35 }, tip, 10),
    ...bezier(tip, { x: x0 - L * 0.6, y: C + S * 1.0 }, { x: x0, y: C + k.h(1) * 0.9 }, 10),
  ];
  membrane(k.pen, lobe, { x: x0 + 2, y: C }, 8, k.a.finWash ?? k.a.wash, k.ink, k.heavy);
}

/** The game's flying fish without its wings. */
export const WINGLESS: Anatomy = { ...GAME, under: lowerLobe };

/** Where the wings join the body, texture px. */
const ROOT: Pt = { x: xAt(GAME, 0.24), y: C - heightAt(GAME, 0.24) * 0.1 };

/** One wing spread as in the game: `dir` -1 the far one, raised over the back; 1 the near one, swept below. */
function spreadWing(dir: -1 | 1): Pt[] {
  const span = dir < 0 ? 1 : 0.85;
  const tip = { x: ROOT.x - 100 * span, y: C + dir * 58 * span };
  return [
    ROOT,
    ...bezier(ROOT, { x: ROOT.x - 30, y: C + dir * 52 * span }, tip, 12),
    ...bezier(tip, { x: ROOT.x - 60 * span, y: C + dir * 18 }, { x: ROOT.x - 12, y: C + dir * 3 }, 12),
  ];
}
const SPREAD: Readonly<Record<-1 | 1, readonly Pt[]>> = { [-1]: spreadWing(-1), [1]: spreadWing(1) };

/** A wing folded like a fan: each point's angle off the body axis (from the root, pointing back) squeezed by `fold`. */
export function wingShape(dir: -1 | 1, fold: number): Pt[] {
  const squeeze = 0.06 + 0.94 * fold;
  const reach = 0.88 + 0.12 * fold;
  return SPREAD[dir].map((p) => {
    const vx = p.x - ROOT.x;
    const vy = p.y - ROOT.y;
    const r = Math.hypot(vx, vy) * reach;
    const a = Math.atan2(vy, -vx) * squeeze;
    return { x: ROOT.x - r * Math.cos(a), y: ROOT.y + r * Math.sin(a) };
  });
}

/** Into a pose's frame, in texture px (as drawSwimmer places the sprite). */
function intoPose(ctx: CanvasRenderingContext2D, pose: Pose): void {
  const k = pose.length / (2 * GAME.hl);
  ctx.translate(pose.x, pose.y);
  ctx.scale(pose.facing, 1);
  ctx.rotate(-pose.tilt);
  ctx.scale(k, k);
  ctx.translate(-C, -C);
}

/** Both wings, behind the body: drawn before it. `seed` follows the line boil. */
export function drawWings(ctx: CanvasRenderingContext2D, pose: Pose, fold: number, seed: number, alpha = 1): void {
  if (alpha <= 0) return;
  ctx.save();
  ctx.globalAlpha = alpha;
  intoPose(ctx, pose);
  const pen = new Pen(ctx, seed, 0.55);
  for (const dir of [-1, 1] as const) membrane(pen, wingShape(dir, fold), ROOT, 14, GAME.finWash ?? GAME.wash, GAME.ink ?? '#1b1a1f', false);
  ctx.restore();
}

/** An orange pen line round both wings, `glow` 0 .. 1, drawn over the fish. */
export function drawWingHighlight(ctx: CanvasRenderingContext2D, pose: Pose, fold: number, glow: number): void {
  if (glow <= 0) return;
  ctx.save();
  intoPose(ctx, pose);
  ctx.strokeStyle = HIGHLIGHT;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.globalAlpha = 0.9 * glow;
  ctx.lineWidth = 3.2;
  for (const dir of [-1, 1] as const) {
    // Only the part that shows: the far wing above the back, the near one below the belly.
    const pts = wingShape(dir, fold).filter((p) => (dir < 0 ? p.y < C - 12 : p.y > C + 14));
    if (pts.length < 2) continue;
    ctx.beginPath();
    pts.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
    ctx.stroke();
  }
  ctx.restore();
}

/** A point on the fish (texture px) in screen px. */
export function onFish(pose: Pose, p: Pt): Pt {
  const k = pose.length / (2 * GAME.hl);
  const lx = (p.x - C) * k;
  const ly = (p.y - C) * k;
  const c = Math.cos(-pose.tilt);
  const s = Math.sin(-pose.tilt);
  return { x: pose.x + pose.facing * (lx * c - ly * s), y: pose.y + lx * s + ly * c };
}

/** The far wing's tip and the tail's lower lobe tip, texture px. */
export const FAR_TIP: Pt = SPREAD[-1][13]!;
export const TAIL_TIP: Pt = { x: xAt(GAME, 1) + 3 - GAME.hh * GAME.tailSize * 1.5, y: C + GAME.hh * GAME.tailSize * 0.85 * 1.35 };
