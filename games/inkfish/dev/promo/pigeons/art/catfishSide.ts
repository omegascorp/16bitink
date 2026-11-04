import { INK, type Pt } from '../../../../src/art/pen';
import { dab, path, softLine, taper } from '../../seal/art/paint';
import { bodyEdge, type BodyLook, drawBody, spineAt, tailEnd } from './catfishBody';
import { bake, RES, type Sprite } from './catfishHead';
import { BARBELS, CORNER, FAR_LOW, FAR_UP, GULLET, jawTurn, MOUTH, NEAR_LOW, NEAR_UP, POUR_EDGE, WHISKER_FAR, WHISKER_NEAR } from './catfishShape';
import { open } from './skin';

/**
 * The wels catfish out of the water, from a camera low on the gravel: strong
 * three-quarter profile, heading left, the whole animal in view. The huge flat
 * shovel head fills the foreground (./catfishHead.ts), the long body curves back
 * round behind it into the river (./catfishBody.ts).
 *
 * Whatever is in the jaws lies crosswise in the ring of the mouth: the throat
 * first, then the prey's body, then both lips and tooth bands closing over it,
 * then whatever of it sticks out.
 */

/** World px per own unit at full size: own units are frame 1's pixels. */
export const SIDE_K = 1 / 2.6;

export interface SidePose {
  /** The middle of the mouth, world px. */
  readonly x: number;
  readonly y: number;
  /** World px per own unit. */
  readonly k: number;
  readonly rot: number;
}

export interface SideLook {
  /** 0 nearly shut .. 1 wide. */
  readonly gape: number;
  /** Whisker sway, radians. */
  readonly sway: number;
  /** Drawn in the mouth: both jaws close over it (own units). */
  readonly inMouth?: (ctx: CanvasRenderingContext2D) => void;
  /** What sticks out of the jaws: drawn over them (own units). */
  readonly overJaws?: (ctx: CanvasRenderingContext2D) => void;
  /** One world pixel in own units. */
  readonly ink: number;
}

function placed(ctx: CanvasRenderingContext2D, p: SidePose): void {
  ctx.translate(p.x, p.y);
  ctx.rotate(p.rot);
  ctx.scale(p.k, p.k);
  ctx.translate(-MOUTH.x, -MOUTH.y);
}

const turnAbout = (p: Pt, about: Pt, a: number): Pt => {
  const [c, s] = [Math.cos(a), Math.sin(a)];
  const [dx, dy] = [p.x - about.x, p.y - about.y];
  return { x: about.x + dx * c - dy * s, y: about.y + dx * s + dy * c };
};

/** The lower lips at a gape. */
function lowerRim(gape: number): Pt[] {
  const a = jawTurn(gape);
  return [...NEAR_LOW, ...FAR_LOW.slice(1)].map((p) => turnAbout(p, CORNER, a));
}

/**
 * The mouth as a cave going back into the fish: wall after wall drawn inwards
 * towards the gullet, each smaller and darker, pale dusky pink at the lips, near
 * black at the back, crossed by ridges and gill bars running into the dark.
 */
function paintThroat(ctx: CanvasRenderingContext2D, gape: number, px: number): void {
  const top = [...NEAR_UP, ...FAR_UP.slice(1)];
  const low = lowerRim(gape);
  const shape = [...top, ...[...low].reverse()];
  const back = GULLET;
  const toward = (p: Pt, u: number): Pt => ({ x: back.x + (p.x - back.x) * (1 - u), y: back.y + (p.y - back.y) * (1 - u) });
  const WALLS = 16;
  ctx.save();
  path(ctx, shape);
  ctx.clip();
  for (let i = 0; i <= WALLS; i++) {
    const u = (i / WALLS) ** 0.8;
    const fall = Math.min(1, u / 0.5);
    const c = [204 - 178 * fall, 164 - 146 * fall, 158 - 138 * fall];
    ctx.fillStyle = `rgb(${c.map((v) => Math.round(v)).join(',')})`;
    path(ctx, shape.map((p) => toward(p, u * 0.97)));
    ctx.fill();
  }
  for (let i = 4; i < shape.length; i += 5) {
    const p = shape[i]!;
    taper(ctx, [toward(p, 0.03), toward(p, 0.2), toward(p, 0.48)], 6, 0.6, i % 10 === 4 ? '#d9bdb4' : '#2a2022', 0.3);
  }
  ctx.strokeStyle = 'rgba(240,222,214,0.3)';
  ctx.lineWidth = px * 2.4;
  for (const u of [0.14, 0.27]) {
    path(ctx, shape.map((p) => toward(p, u)));
    ctx.stroke();
  }
  ctx.restore();
}

/** The shadow the near lips throw on what they close over, so it plainly lies behind them. */
function paintLipShadow(ctx: CanvasRenderingContext2D, gape: number): void {
  const a = jawTurn(gape);
  softLine(ctx, NEAR_UP.filter((p) => p.x > 170).map((p) => ({ x: p.x, y: p.y + 22 })), 56, '#120d0d', 0.9, 12);
  softLine(ctx, NEAR_LOW.filter((p) => p.x > 170).map((p) => turnAbout({ x: p.x, y: p.y - 14 }, CORNER, a)), 40, '#120d0d', 0.72, 10);
  // Both ends of what it holds sink away into the dark of the mouth.
  dab(ctx, 610, 840, 90, '14,10,12', 0.95);
  dab(ctx, 300, 852, 60, '14,10,12', 0.7);
}

/** A long thick barbel through `pts`: dark olive, a wet light along it, tapering to a thread. */
function barbel(ctx: CanvasRenderingContext2D, pts: readonly Pt[], w0: number, w1: number, px: number): void {
  const root = pts[0]!;
  ctx.fillStyle = INK;
  ctx.beginPath();
  ctx.arc(root.x, root.y, w0 * 0.52 + px * 1.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#4a5438';
  ctx.beginPath();
  ctx.arc(root.x, root.y, w0 * 0.52, 0, Math.PI * 2);
  ctx.fill();
  taper(ctx, pts, w0 + px * 3, w1 + px * 2, INK, 0.9);
  taper(ctx, pts, w0, w1, '#4a5438', 1);
  taper(ctx, pts.map((p) => ({ x: p.x + w0 * 0.14, y: p.y + w0 * 0.12 })), w0 * 0.5, w1 * 0.5, '#20281a', 0.8);
  taper(ctx, pts.slice(0, Math.ceil(pts.length * 0.8)).map((p) => ({ x: p.x - w0 * 0.17, y: p.y - w0 * 0.2 })), w0 * 0.3, w1 * 0.4, '#eef2dc', 0.9);
}

const wave = (p: Pt, u: number, sway: number): Pt => ({ x: p.x + 20 * u * Math.sin(sway + u * 3), y: p.y + 24 * u * Math.cos(sway * 0.5 + u * 4) });

/** The two long whiskers flung out from the upper jaw, streaming with the lunge, and the four barbels under the chin. */
function paintWhiskers(ctx: CanvasRenderingContext2D, look: SideLook, px: number): void {
  const curl = (pts: readonly Pt[]): Pt[] => open(pts.map((p, i) => wave(p, i / (pts.length - 1), look.sway)));
  barbel(ctx, curl([WHISKER_FAR, { x: 82, y: 586 }, { x: 58, y: 516 }, { x: 74, y: 438 }, { x: 128, y: 376 }, { x: 196, y: 330 }, { x: 240, y: 268 }]), 15, 2, px);
  barbel(ctx, curl([WHISKER_NEAR, { x: 150, y: 716 }, { x: 96, y: 800 }, { x: 58, y: 900 }, { x: 56, y: 1000 }, { x: 86, y: 1086 }, { x: 150, y: 1140 }, { x: 214, y: 1146 }]), 17, 2, px);
  const a = jawTurn(look.gape);
  BARBELS.forEach(([x, y, dx], i) => {
    const root = turnAbout({ x, y: y - 6 }, CORNER, a);
    barbel(ctx, open([root, { x: root.x + dx * 0.3, y: root.y + 26 }, { x: root.x + dx * 0.9, y: root.y + 52 }, wave({ x: root.x + dx * 1.7, y: root.y + 70 }, 0.6, look.sway + i)]), 8, 1.2, px);
  });
}

function blit(ctx: CanvasRenderingContext2D, s: Sprite): void {
  ctx.drawImage(s.canvas, s.x0, s.y0, s.canvas.width / RES, s.canvas.height / RES);
}

/** The body, in the world: it stays on its path, so the river can close over it before the head goes on top. */
export function drawSideBody(ctx: CanvasRenderingContext2D, anchor: Pt, body: BodyLook, ink: number): void {
  ctx.save();
  ctx.translate(anchor.x, anchor.y);
  ctx.scale(SIDE_K, SIDE_K);
  ctx.translate(-MOUTH.x, -MOUTH.y);
  drawBody(ctx, body, ink / SIDE_K);
  ctx.restore();
}

/** The head, placed. */
export function drawSideHead(ctx: CanvasRenderingContext2D, p: SidePose, look: SideLook): void {
  const { head, jaw } = bake();
  const a = jawTurn(look.gape);
  ctx.save();
  placed(ctx, p);
  paintThroat(ctx, look.gape, look.ink);
  look.inMouth?.(ctx);
  paintLipShadow(ctx, look.gape);
  blit(ctx, head);
  ctx.save();
  ctx.translate(CORNER.x, CORNER.y);
  ctx.rotate(a);
  ctx.translate(-CORNER.x, -CORNER.y);
  blit(ctx, jaw);
  ctx.restore();
  paintWhiskers(ctx, look, look.ink);
  if (look.overJaws) {
    // Nothing comes over the lower lip: it stays in front of the bird.
    ctx.save();
    const near = NEAR_LOW.map((q) => turnAbout(q, CORNER, a));
    path(ctx, [{ x: 1500, y: 0 }, { x: -300, y: 0 }, { x: -300, y: near[near.length - 1]!.y }, ...[...near].reverse(), { x: 1500, y: CORNER.y }]);
    ctx.clip();
    look.overJaws(ctx);
    ctx.restore();
  }
  ctx.restore();
}

/** Where a point in the head's own units lands in the world. */
export function onSide(p: SidePose, local: Pt): Pt {
  const [c, s] = [Math.cos(p.rot), Math.sin(p.rot)];
  const [dx, dy] = [(local.x - MOUTH.x) * p.k, (local.y - MOUTH.y) * p.k];
  return { x: p.x + dx * c - dy * s, y: p.y + dx * s + dy * c };
}

/** Where a point of the body's own frame lands in the world. */
export const onBody = (anchor: Pt, local: Pt): Pt => ({ x: anchor.x + (local.x - MOUTH.x) * SIDE_K, y: anchor.y + (local.y - MOUTH.y) * SIDE_K });

/** Where the head lies when it has slid `back` along the path: the mouth, how big, and how it turns. */
export function headOnPath(anchor: Pt, back: number): { readonly at: Pt; readonly size: number; readonly rot: number } {
  const here = spineAt(back);
  const mid = spineAt(back + 170);
  const rest = spineAt(170);
  return { at: onBody(anchor, here), size: mid.p, rot: mid.a - rest.a };
}

export { bodyEdge, POUR_EDGE, tailEnd };
export type { BodyLook };
