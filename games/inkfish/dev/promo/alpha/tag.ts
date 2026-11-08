import { INK, type Pt } from '../../../src/art/pen';
import { drawGreatWhite, type GreatWhitePose } from '../foodchain/art/greatWhite';
import { glow } from './sea';

/**
 * Shark Alpha and her tag. The great white is the food-chain video's
 * painted one (../foodchain/art/greatWhite.ts); the tag is drawn here: a
 * small orange satellite tag on a tether at the back of the dorsal fin,
 * trailing a thin antenna. It can glow (the beacon in the dark dive and
 * inside the stomach) and lie on its own (the beach).
 */

/** Where a shark is: its centre (the middle of snout to tail tip), length, heading and mirror, as drawGreatWhite takes them. */
export interface SharkPose {
  readonly x: number;
  readonly y: number;
  readonly length: number;
  readonly angle: number;
  readonly flip: boolean;
}

/** drawGreatWhite's own frame: 1000 local px snout to tail tip, snout at x 0, centre at x -500. */
const LEN = 1000;
const HALF = 500;

/** Where the tag's tether meets the fin, and how big the tag is, in the shark's local px. */
export const TAG_ON_FIN: Pt = { x: -408, y: -132 };
const TAG_LOCAL_LEN = 78;

/** A point of the shark's local frame on screen. */
export function onShark(p: SharkPose, local: Pt): Pt {
  const s = p.length / LEN;
  const lx = (local.x + HALF) * s;
  const ly = (p.flip ? -local.y : local.y) * s;
  const c = Math.cos(p.angle);
  const n = Math.sin(p.angle);
  return { x: p.x + lx * c - ly * n, y: p.y + lx * n + ly * c };
}

/** The pose that puts the local point `local` at screen point `at`. */
export function poseWith(at: Pt, local: Pt, length: number, angle: number, flip: boolean): SharkPose {
  const probe = onShark({ x: 0, y: 0, length, angle, flip }, local);
  return { x: at.x - probe.x, y: at.y - probe.y, length, angle, flip };
}

/** The nose (snout tip) on screen. */
export const noseOf = (p: SharkPose): Pt => onShark(p, { x: 0, y: 0 });
/** The snout direction, a unit vector. */
export const headingOf = (p: SharkPose): Pt => ({ x: Math.cos(p.angle), y: Math.sin(p.angle) });

export interface TagLook {
  /** 0 .. 1: a soft beacon glow round it. */
  readonly glow?: number;
  /** Swings the tag on its tether, radians. */
  readonly swing?: number;
  /** 0 .. 1: how much of it shows (it pops on as it's fixed). */
  readonly alpha?: number;
}

const ORANGE = '#f29a2e';
const ORANGE_DARK = '#b8601a';
const CREAM = '#fff4dc';

/**
 * The tag on its own: tether end at (x, y), the body trailing along `angle`
 * (radians), `len` px long. A rounded tube, a dark band at the tether end,
 * a cream float at the far end and the antenna whipping back from it.
 */
export function drawTag(ctx: CanvasRenderingContext2D, x: number, y: number, len: number, angle: number, look: TagLook = {}): void {
  const alpha = look.alpha ?? 1;
  if (alpha <= 0) return;
  const r = len * 0.15;
  if ((look.glow ?? 0) > 0) {
    const mid = { x: x + Math.cos(angle) * len * 0.6, y: y + Math.sin(angle) * len * 0.6 };
    glow(ctx, mid.x, mid.y, len * 2.6, '255,170,80', 0.55 * look.glow! * alpha);
    glow(ctx, mid.x, mid.y, len * 0.9, '255,220,160', 0.5 * look.glow! * alpha);
  }
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(x, y);
  ctx.rotate(angle + (look.swing ?? 0));
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  const w = Math.max(1.2, len * 0.045);
  // The tether from the fin.
  ctx.strokeStyle = INK;
  ctx.lineWidth = w;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(len * 0.12, r * 0.6, len * 0.22, 0);
  ctx.stroke();
  // The body: orange tube, a shaded underside and a glint along its top.
  const x0 = len * 0.2;
  const x1 = len * 0.86;
  ctx.beginPath();
  ctx.moveTo(x0 + r, -r);
  ctx.lineTo(x1, -r * 0.9);
  ctx.arc(x1, 0, r * 0.9, -Math.PI / 2, Math.PI / 2);
  ctx.lineTo(x0 + r, r);
  ctx.arc(x0 + r, 0, r, Math.PI / 2, (3 * Math.PI) / 2);
  ctx.closePath();
  ctx.fillStyle = ORANGE;
  ctx.fill();
  ctx.save();
  ctx.clip();
  ctx.fillStyle = ORANGE_DARK;
  ctx.globalAlpha = alpha * 0.55;
  ctx.fillRect(x0, r * 0.2, x1 - x0 + r, r);
  ctx.globalAlpha = alpha * 0.9;
  ctx.fillStyle = CREAM;
  ctx.fillRect(x1 - r * 0.6, -r, r * 2, r * 2);
  ctx.fillStyle = '#2a2730';
  ctx.fillRect(x0 + r * 0.5, -r, r * 0.6, r * 2);
  ctx.restore();
  ctx.strokeStyle = INK;
  ctx.lineWidth = w;
  ctx.stroke();
  ctx.strokeStyle = 'rgba(255,240,215,0.8)';
  ctx.lineWidth = w * 0.8;
  ctx.beginPath();
  ctx.moveTo(x0 + r * 1.4, -r * 0.5);
  ctx.lineTo(x1 - r * 0.8, -r * 0.45);
  ctx.stroke();
  // The antenna, a fine whip.
  ctx.strokeStyle = INK;
  ctx.lineWidth = w * 0.6;
  ctx.beginPath();
  ctx.moveTo(x1 + r * 0.8, -r * 0.2);
  ctx.quadraticCurveTo(x1 + len * 0.3, -r * 1.6, x1 + len * 0.55, -r * 0.4);
  ctx.stroke();
  ctx.restore();
}

/** The tag where it hangs on a shark's fin, trailing back (towards the tail), in that shark's scale. */
export function drawTagOnShark(ctx: CanvasRenderingContext2D, p: SharkPose, look: TagLook = {}): void {
  const at = onShark(p, TAG_ON_FIN);
  const back = onShark(p, { x: TAG_ON_FIN.x - 10, y: TAG_ON_FIN.y + 1.5 });
  const angle = Math.atan2(back.y - at.y, back.x - at.x);
  drawTag(ctx, at.x, at.y, (TAG_LOCAL_LEN * p.length) / LEN, angle, look);
}

/** The great white, and its tag if `tagged`. */
export function drawShark(ctx: CanvasRenderingContext2D, p: SharkPose, t: number, look: GreatWhitePose, tag: TagLook | null): void {
  drawGreatWhite(ctx, p.x, p.y, p.length, p.angle, t, look, p.flip);
  if (tag) drawTagOnShark(ctx, p, tag);
}
