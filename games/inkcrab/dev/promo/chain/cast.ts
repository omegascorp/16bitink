import { drawCrabBack, RIVAL_COLORS } from '../../../src/art/crabArt';
import { FOOT, FRAME, GROUND, SHELL_MID, SHELL_UNITS } from '../../../src/art/frame';
import { drawPuff } from '../../../src/art/itemArt';
import { crabShift } from '../../../src/art/mouth';
import { HIGHLIGHT, INK, RED } from '../../../src/art/palette';
import { Pen } from '../../../src/art/pen';
import { fitFor } from '../../../src/art/shellFit';
import type { ShellKind } from '../../../src/logic/shells';
import { bakeSprite, crabSprite, drawSprite, shellSprite, type Sprite } from '../sprites';
import { OFF_RIGHT_X, ROWS, SLOT_FACING, SLOT_KINDS, SLOT_SIZES, SLOT_X, SLOT_Y, SLOTS, widthOf } from './layout';
import type { CrabPose, ShellPose } from './queue';

/**
 * The game's hermit crabs and shells, drawn as the game draws them (see
 * crabView.ts and heroCrab.ts): far legs, the shell, then head, near legs and
 * claw, the crab's body sized to fill its shell and slid so it comes out of
 * the opening. Every crab here is a rival, in the game's purple-pincher
 * colours: Coenobita clypeatus, the very species of the study. Each faces
 * the way its row of the queue moves, towards the shell ahead.
 */
const RES = 4;
/** Frame px from a shell's middle to its opening, the shared anchor (FOOT). */
const FOOT_FROM_MIDDLE = FOOT.x - SHELL_MID;
/** Local x of FOOT in a sprite (drawSprite places local x 0). */
const FOOT_LOCAL = FOOT.x - FRAME / 2;
/** A crab fills its shell this much when it is its own size (the game's bodyFill at the cap). */
const FULL = 0.95;

export interface Cast {
  readonly back: Sprite;
  readonly front: Sprite;
  readonly nakedBack: Sprite;
  readonly nakedFront: Sprite;
  readonly shells: ReadonlyMap<ShellKind, Sprite>;
  /** Each kind's fit (shellFit.ts), measured from its baked drawing. */
  readonly fits: ReadonlyMap<ShellKind, number>;
  readonly puff: Sprite;
}

/** How much to scale a kind's drawing so it is drawn to its size, as the game's measureShell does. */
function measuredFit(sprite: Sprite): number {
  const canvas = sprite.frames[0]!;
  const { width: W, height: H } = canvas;
  const px = canvas.getContext('2d')!.getImageData(0, 0, W, H).data;
  let [x0, x1, y0, y1] = [W, -1, H, -1];
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (px[(y * W + x) * 4 + 3]! <= 40) continue;
      x0 = Math.min(x0, x);
      x1 = Math.max(x1, x);
      y0 = Math.min(y0, y);
      y1 = Math.max(y1, y);
    }
  }
  return x1 < x0 ? 1 : fitFor((x1 - x0 + 1) / sprite.res, (y1 - y0 + 1) / sprite.res);
}

export function makeCast(): Cast {
  const shells = new Map(SLOT_KINDS.map((kind) => [kind, shellSprite(kind, RES)] as const));
  return {
    back: crabSprite('back', RES, false, RIVAL_COLORS),
    front: crabSprite('front', RES, false, RIVAL_COLORS),
    // Out of its shell its soft, coiled tail shows, as a rival's does in the game.
    nakedBack: bakeSprite(FRAME, RES, GROUND, 120, (d) => drawCrabBack(d, true, RIVAL_COLORS, true), RED),
    nakedFront: crabSprite('front', RES, true, RIVAL_COLORS),
    shells,
    fits: new Map([...shells].map(([kind, sprite]) => [kind, measuredFit(sprite)] as const)),
    puff: bakeSprite(64, 4, 0, 700, (d) => drawPuff(d, 64 * 0.36)),
  };
}

/** Screen px per frame px for a size: a shell's unit, as the game's shellPx / SHELL_UNITS. */
const unitOf = (size: number): number => widthOf(size) / SHELL_UNITS;
/** The crab's drawing scale for its body size. */
const bodyOf = (size: number): number => unitOf(size) * FULL;

/** A slot's shell: its kind, the scale it is drawn at, and its opening (the anchor) on screen at rest. */
export function slotShell(cast: Cast, slot: number): { readonly kind: ShellKind; readonly drawn: number; readonly foot: number } {
  const kind = SLOT_KINDS[slot]!;
  const drawn = unitOf(SLOT_SIZES[slot]!) * cast.fits.get(kind)!;
  return { kind, drawn, foot: SLOT_X[slot]! + SLOT_FACING[slot]! * FOOT_FROM_MIDDLE * drawn };
}

/** Where a crab of `size` sits in a slot's shell at rest (off the right edge of the last row for -1): its drawing's x, ground y and facing. */
export function crabAt(cast: Cast, slot: number, size: number): { readonly x: number; readonly y: number; readonly facing: 1 | -1 } {
  if (slot < 0) return { x: OFF_RIGHT_X, y: ROWS[ROWS.length - 1]!.y, facing: -1 };
  const { kind, drawn, foot } = slotShell(cast, slot);
  const facing = SLOT_FACING[slot]!;
  return { x: foot + facing * crabShift(kind, drawn, bodyOf(size)), y: SLOT_Y[slot]!, facing };
}

/** A sprite with its FOOT at (x, y), facing `facing`. */
function atFoot(ctx: CanvasRenderingContext2D, sprite: Sprite, boil: number, x: number, y: number, scale: number, facing: 1 | -1, alpha = 1): void {
  drawSprite(ctx, sprite, boil, { x: x - facing * FOOT_LOCAL * scale, y, scale, facing, alpha });
}

/** The game's highlighter swipe behind a shell a crab can take. */
function drawHighlight(ctx: CanvasRenderingContext2D, cx: number, cy: number, w: number, h: number, alpha: number, boil: number): void {
  if (alpha <= 0) return;
  const pen = new Pen(ctx, 600 + boil, 0.5);
  const pts = Array.from({ length: 16 }, (_, i) => {
    const a = (i / 16) * Math.PI * 2;
    const r = 0.86 + pen.rng() * 0.14;
    return { x: cx + Math.cos(a) * (w / 2) * r, y: cy + Math.sin(a) * (h / 2) * r };
  });
  pen.fill(pts, HIGHLIGHT, 0.5 * alpha);
}

/** A soft contact shadow on the sand. */
function drawShadow(ctx: CanvasRenderingContext2D, cx: number, y: number, rx: number): void {
  ctx.save();
  ctx.globalAlpha = 0.12;
  ctx.fillStyle = INK;
  ctx.beginPath();
  ctx.ellipse(cx, y + 2, rx, rx * 0.09, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/** One shell, possibly rocking (rotated about its middle) as the wave rolls it in. */
export function drawShell(ctx: CanvasRenderingContext2D, cast: Cast, s: ShellPose, boil: number): void {
  const { kind, drawn, foot } = slotShell(cast, s.slot);
  const w = widthOf(SLOT_SIZES[s.slot]!);
  const y = SLOT_Y[s.slot]!;
  const facing = SLOT_FACING[s.slot]!;
  const mid = SLOT_X[s.slot]! + s.dx;
  drawHighlight(ctx, mid, y - w * 0.24, w * 1.12, w * 0.6, s.highlight, boil);
  drawShadow(ctx, mid, y, w * 0.5);
  const sprite = cast.shells.get(kind)!;
  if (s.rotation === 0) {
    atFoot(ctx, sprite, boil, foot + s.dx, y + s.dy, drawn, facing);
    return;
  }
  const cy = y - w * 0.3;
  ctx.save();
  ctx.translate(mid, cy + s.dy);
  ctx.rotate(s.rotation);
  atFoot(ctx, sprite, boil, foot - SLOT_X[s.slot]!, y - cy, drawn, facing);
  ctx.restore();
}

/** A crab in a slot's shell: far legs (before its shell), or the rest (after). */
export function drawCrabIn(ctx: CanvasRenderingContext2D, cast: Cast, c: CrabPose, boil: number, part: 'back' | 'front'): void {
  if (c.mode !== 'in') return;
  const at = crabAt(cast, c.slot, c.size);
  atFoot(ctx, part === 'back' ? cast.back : cast.front, boil, at.x + c.dx, at.y + c.dy, bodyOf(c.size), at.facing);
}

/** A crab out of its shell, soft and red, dashing between openings (up the snake's turns too), facing where it runs. */
export function drawNaked(ctx: CanvasRenderingContext2D, cast: Cast, c: CrabPose, frame: number): void {
  if (c.mode !== 'naked') return;
  const [a, b] = [crabAt(cast, c.from, c.size), crabAt(cast, c.to, c.size)];
  const x = a.x + (b.x - a.x) * c.u;
  const y = a.y + (b.y - a.y) * c.u;
  const facing: 1 | -1 = Math.abs(b.x - a.x) > 20 ? (b.x > a.x ? 1 : -1) : b.facing;
  const scale = bodyOf(c.size);
  drawShadow(ctx, x - facing * 20 * scale, y, 40 * scale);
  atFoot(ctx, cast.nakedBack, frame, x, y + c.dy, scale, facing);
  atFoot(ctx, cast.nakedFront, frame, x, y + c.dy, scale, facing);
}

/** A puff of sand at a slot's opening, `u` 0 .. 1 through it. */
export function drawPuffAt(ctx: CanvasRenderingContext2D, cast: Cast, slot: number, u: number, boil: number): void {
  if (u < 0 || u > 1 || slot < 0 || slot >= SLOTS) return;
  const { foot } = slotShell(cast, slot);
  const size = widthOf(SLOT_SIZES[slot]!);
  const scale = (size / 64) * (0.6 + 0.5 * u);
  drawSprite(ctx, cast.puff, boil, { x: foot, y: SLOT_Y[slot]! - size * 0.22 - 20 * u, scale, alpha: 1 - u * u });
}
