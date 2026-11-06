import { INK, MOSS, PAPER, RED } from '../../src/art/palette';
import { paintNib } from '../../src/art/nib';
import { Pen, type Pt } from '../../src/art/pen';
import { drawCredit } from './credit';
import { CAPTION_FONT, drawQuestion, drawTextLine } from './captions';
import { ACTIONS, FPS, LOOP_S, PIN_NUMBERS, SEGMENT_START, SHIFT_S, SWAP_C, WIPE_S, segmentAt, wrapCycle, type Segment } from './plan';
import { clamp01, curveAt, ramp, VIDEO, type Key } from './short';

/**
 * Everything drawn over the game's own picture: the numbers on the pins, the
 * hand, the ✗ and ✓, the ink wipe, the credit and the call to action. All of
 * it is a function of the cycle time c (plan.ts), so overlayAt(c) is plain
 * data the tests can compare, and drawOverlay paints it.
 */

/** Where the camera looks (driver.ts sets it up), and so where board points land in the video. */
export const VIEW = { zoom: 1.78, cx: 330, cy: 845 } as const;
export const toScreen = (x: number, y: number): Pt => ({ x: VIDEO.width / 2 + (x - VIEW.cx) * VIEW.zoom, y: VIDEO.height / 2 + (y - VIEW.cy) * VIEW.zoom });

/** Where each pin's number sits (video px): on the pin's ring, a little toward its body. */
const DISC: Readonly<Record<string, Pt>> = {
  W: toScreen(566, 578),
  L: toScreen(566, 664),
  G: toScreen(384, 852),
};
const DISC_R = 62;

export interface NumberMark {
  readonly label: string;
  readonly x: number;
  readonly y: number;
  readonly alpha: number;
  readonly scale: number;
}
export interface HandMark {
  readonly x: number;
  readonly y: number;
  readonly alpha: number;
  readonly press: number;
}
export interface OverlayState {
  readonly numbers: readonly NumberMark[];
  readonly hand: HandMark | null;
  readonly mark: { readonly kind: 'wrong' | 'right'; readonly u: number; readonly alpha: number } | null;
  /** 0..1 progress of the ink wipe, or null when none is running. */
  readonly wipe: number | null;
  readonly credit: number;
  readonly cta: number;
  /** Nib's close-up circle. */
  readonly inset: number;
}

/** Video time of a cycle time. */
const videoTime = (c: number): number => c - SHIFT_S;
/** The video's last 3.0 s carry the call to action; it is gone 0.6 s before the loop point. */
export const CTA = { from: LOOP_S - 3.0, fadeIn: 0.35, to: LOOP_S - 0.6, fadeOut: 0.4 } as const;
const CREDIT_FROM = 8.8;

/** Hand paths: where the fingertip goes, as keys of cycle time. */
const OFF: Pt = { x: -340, y: 820 };
const HAND_KEYS: Readonly<Record<Segment, { readonly x: readonly Key[]; readonly y: readonly Key[] }>> = (() => {
  const at = (pts: readonly (readonly [number, Pt])[]): { x: Key[]; y: Key[] } => ({
    x: pts.map(([t, p]) => ({ t, at: p.x })),
    y: pts.map(([t, p]) => ({ t, at: p.y })),
  });
  // The hand comes in from the left, pointing right, and touches each pin's body: the numbers on the pins' rings stay clear.
  const w = toScreen(470, 580);
  const l = toScreen(470, 664);
  const g = toScreen(380, 980);
  const s = SWAP_C;
  return {
    wrong: at([[1.5, OFF], [2.2, l], [2.65, g], [3.05, w], [3.3, w], [3.4, w], [3.7, w], [4.1, l], [4.7, g], [5.1, g], [5.6, OFF]]),
    right: at([[s + 0.3, OFF], [s + 0.7, l], [s + 1.0, l], [s + 1.3, l], [s + 1.8, w], [s + 2.3, w], [s + 2.6, w], [s + 3.1, OFF]]),
  };
})();

/** Taps, in cycle time: when the fingertip lands. */
const TAPS: readonly number[] = (['wrong', 'right'] as const).flatMap((seg) =>
  ACTIONS[seg].filter((a) => a.kind === 'tap').map((a) => SEGMENT_START[seg] + a.at));
/** Which pin each tap pulls, by cycle time. */
const TAP_PIN: ReadonlyMap<number, string> = new Map((['wrong', 'right'] as const).flatMap((seg) =>
  ACTIONS[seg].filter((a) => a.kind === 'tap').map((a): [number, string] => [SEGMENT_START[seg] + a.at, (a as { pin: string }).pin])));

/** The number on a pin shows from the start of a try until its pull; in the right try, "3" goes with the water's pull. */
function numberAlpha(pin: string, c: number, seg: Segment, local: number): number {
  const pulledAt = ACTIONS[seg].find((a) => a.kind === 'tap' && a.pin === pin)?.at ?? (seg === 'right' ? ACTIONS.right.find((a) => a.kind === 'tap' && a.pin === 'W')!.at : Infinity);
  const fadeOut = 1 - ramp(local, pulledAt, pulledAt + 0.25);
  return fadeOut;
}

export function overlayAt(c: number): OverlayState {
  const cc = wrapCycle(c);
  const { segment, local } = segmentAt(cc);
  // Numbers: a heartbeat that quickens as the pull nears: the timer.
  const beat = segment === 'wrong' ? 1 + 0.07 * Math.max(0, Math.sin((cc - 0.5) * Math.PI * 2)) : 1 + 0.05 * Math.max(0, Math.sin(local * Math.PI * 2));
  const numbers = PIN_NUMBERS.map(({ id, label }): NumberMark => {
    const d = DISC[id]!;
    return { label, x: d.x, y: d.y, alpha: numberAlpha(id, cc, segment, local), scale: beat };
  }).filter((n) => n.alpha > 0.001);

  const keys = HAND_KEYS[segment];
  let hand: HandMark | null = null;
  if (cc >= keys.x[0]!.t && cc <= keys.x[keys.x.length - 1]!.t) {
    const x = curveAt(keys.x, cc).at;
    const y = curveAt(keys.y, cc).at;
    const first = keys.x[0]!.t;
    const last = keys.x[keys.x.length - 1]!.t;
    const press = TAPS.reduce((m, t) => Math.max(m, 1 - clamp01(Math.abs(cc - t) / 0.14)), 0);
    hand = { x, y, alpha: Math.min(ramp(cc, first, first + 0.2), 1 - ramp(cc, last - 0.25, last)), press };
  }

  const failedC = 5.55;
  const checkC = SWAP_C + 2.3;
  let mark: OverlayState['mark'] = null;
  if (cc >= failedC && cc < SWAP_C + 0.1) mark = { kind: 'wrong', u: (cc - failedC) / 0.2, alpha: 1 - ramp(cc, SWAP_C - 0.3, SWAP_C) };
  else if (cc >= checkC && cc < 12.8) mark = { kind: 'right', u: (cc - checkC) / 0.25, alpha: 1 - ramp(cc, 12.2, 12.5) };

  const wipe = cc < WIPE_S ? cc / WIPE_S : cc >= SWAP_C && cc < SWAP_C + WIPE_S ? (cc - SWAP_C) / WIPE_S : null;

  const vt = videoTime(cc);
  const vtt = vt < 0 ? vt + LOOP_S : vt;
  const cta = Math.min(ramp(vtt, CTA.from, CTA.from + CTA.fadeIn), 1 - ramp(vtt, CTA.to - CTA.fadeOut, CTA.to));
  const credit = Math.min(ramp(vtt, CREDIT_FROM, CREDIT_FROM + 0.4), 1 - ramp(vtt, CTA.to - CTA.fadeOut, CTA.to));
  const inset = cc < 3.0 ? 1 : cc < 3.5 ? 1 - ramp(cc, 3.0, 3.5) : 0;
  return { numbers, hand, mark, wipe, credit: Math.max(0, credit), cta: Math.max(0, cta), inset };
}

/** Line-boil frame for the hand-inked marks: the pen redraws them three ways, seven times a second. */
const boilOf = (c: number): number => Math.floor(c * 7) % 3;

function drawNumber(ctx: CanvasRenderingContext2D, n: NumberMark, c: number, seed: number): void {
  ctx.save();
  ctx.globalAlpha = n.alpha;
  ctx.translate(n.x, n.y);
  ctx.scale(n.scale, n.scale);
  // A paper disc, a hand-inked ring, the number.
  ctx.fillStyle = PAPER;
  ctx.beginPath();
  ctx.arc(0, 0, DISC_R, 0, Math.PI * 2);
  ctx.fill();
  const pen = new Pen(ctx, seed * 31 + boilOf(c) * 7 + 3, 1.6);
  const ring: Pt[] = Array.from({ length: 30 }, (_, i) => {
    const a = (i / 29) * Math.PI * 2 + 0.4;
    return { x: Math.cos(a) * (DISC_R - 2), y: Math.sin(a) * (DISC_R - 2) };
  });
  pen.stroke(ring, 9, INK, 1, false);
  ctx.font = `700 128px ${CAPTION_FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = INK;
  ctx.fillText(n.label, 0, 40);
  ctx.restore();
}

/** A pointing hand, fingertip at (0, 0): cream mitten, inked outline. */
function drawHand(ctx: CanvasRenderingContext2D, h: HandMark): void {
  ctx.save();
  ctx.globalAlpha = h.alpha;
  ctx.translate(h.x - h.press * 12, h.y);
  ctx.rotate(Math.PI / 2 - 0.06);
  const s = 1.4 - h.press * 0.1;
  ctx.scale(s, s);
  ctx.lineJoin = 'round';
  ctx.lineWidth = 6;
  ctx.strokeStyle = INK;
  ctx.fillStyle = '#fbf3e0';
  const rr = (x: number, y: number, w: number, hh: number, r: number): void => {
    ctx.beginPath();
    ctx.roundRect(x, y, w, hh, r);
    ctx.fill();
    ctx.stroke();
  };
  // Sleeve, palm, folded fingers, thumb, then the pointing finger on top.
  ctx.fillStyle = '#c8402f';
  rr(-40, 170, 110, 120, 20);
  ctx.fillStyle = '#fbf3e0';
  rr(-40, 70, 104, 120, 36);
  for (const [x, y] of [[26, 86], [42, 104], [54, 124]] as const) {
    ctx.beginPath();
    ctx.arc(x, y, 19, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.ellipse(-44, 122, 19, 30, 0.35, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  rr(-17, 0, 34, 124, 17);
  ctx.restore();
}

/** A thick round-capped ink stroke with a paper halo (the Pen's tapering makes thin flicks of short strokes). */
function inkLine(ctx: CanvasRenderingContext2D, pts: readonly Pt[], w: number, colour: string, jitter = 0): void {
  if (pts.length < 2) return;
  const path = (): void => {
    ctx.beginPath();
    pts.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x + jitter, p.y) : ctx.lineTo(p.x + jitter, p.y - jitter)));
  };
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  path();
  ctx.strokeStyle = PAPER;
  ctx.lineWidth = w + 20;
  ctx.stroke();
  path();
  ctx.strokeStyle = colour;
  ctx.lineWidth = w;
  ctx.stroke();
  ctx.restore();
}

function drawMark(ctx: CanvasRenderingContext2D, m: NonNullable<OverlayState['mark']>, c: number): void {
  const grow = clamp01(m.u);
  const pop = 1 + 0.3 * (1 - clamp01(m.u * 2)) * (1 - clamp01(m.u * 2));
  const cx = 310;
  const cy = 560;
  ctx.save();
  ctx.globalAlpha = m.alpha;
  ctx.translate(cx, cy);
  ctx.scale(pop * 1.3, pop * 1.3);
  const part = (pts: readonly Pt[], from: number, to: number): Pt[] => {
    const f = clamp01((grow - from) / (to - from));
    const n = Math.max(2, Math.round(f * (pts.length - 1)) + 1);
    return pts.slice(0, n);
  };
  const line = (a: Pt, b: Pt, steps = 12): Pt[] => Array.from({ length: steps }, (_, i) => ({ x: a.x + ((b.x - a.x) * i) / (steps - 1), y: a.y + ((b.y - a.y) * i) / (steps - 1) }));
  if (m.kind === 'wrong') {
    const a = line({ x: -105, y: -105 }, { x: 105, y: 105 });
    const b = line({ x: 105, y: -105 }, { x: -105, y: 105 });
    for (const p of [part(a, 0, 0.5), part(b, 0.4, 1)]) {
      if (p.length < 2) continue;
      inkLine(ctx, p, 34, RED, boilOf(c) - 1);
    }
  } else {
    const pts: Pt[] = [...line({ x: -110, y: 0 }, { x: -40, y: 85 }, 8), ...line({ x: -40, y: 85 }, { x: 125, y: -105 }, 14).slice(1)];
    const p = part(pts, 0, 1);
    if (p.length >= 2) {
      inkLine(ctx, p, 34, '#3f7a2a', boilOf(c) - 1);
    }
  }
  ctx.restore();
  void MOSS;
}

/** The ink wipe: a brush of ink sweeping left to right; the new board is revealed behind it, the old one is still on its right. */
export function wipeGeometry(u: number): { readonly edge: number; readonly band: number; readonly slant: number } {
  const band = 330;
  const e = ramp(u, 0, 1);
  return { edge: -band - 250 + e * (VIDEO.width + band + 650), band, slant: 0.22 };
}

/** The x the new board is revealed up to at height y, during a wipe. */
export const wipeEdgeAt = (u: number, y: number): number => {
  const g = wipeGeometry(u);
  return g.edge + (y - VIDEO.height / 2) * g.slant + Math.sin(y * 0.021) * 14 + Math.sin(y * 0.057 + 1) * 7;
};

export function drawWipeBand(ctx: CanvasRenderingContext2D, u: number): void {
  const { band } = wipeGeometry(u);
  const left: Pt[] = [];
  const right: Pt[] = [];
  for (let y = -40; y <= VIDEO.height + 40; y += 24) {
    left.push({ x: wipeEdgeAt(u, y), y });
    right.push({ x: wipeEdgeAt(u, y) + band + Math.sin(y * 0.033 + 2) * 30 + Math.sin(y * 0.09) * 12, y });
  }
  ctx.save();
  ctx.fillStyle = INK;
  ctx.beginPath();
  left.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
  for (let i = right.length - 1; i >= 0; i--) ctx.lineTo(right[i]!.x, right[i]!.y);
  ctx.closePath();
  ctx.fill();
  // A few dry-brush streaks of paper in the ink.
  ctx.strokeStyle = PAPER;
  ctx.globalAlpha = 0.28;
  ctx.lineWidth = 3;
  for (let i = 0; i < 9; i++) {
    const y = 120 + i * 205;
    ctx.beginPath();
    ctx.moveTo(wipeEdgeAt(u, y) + 40 + (i % 3) * 30, y);
    ctx.lineTo(wipeEdgeAt(u, y) + band - 30, y + 14);
    ctx.stroke();
  }
  ctx.restore();
}

function drawArrow(ctx: CanvasRenderingContext2D, alpha: number, c: number): void {
  // A hand-inked arrow curving down-left toward where YouTube shows the channel name.
  const j = boilOf(c) - 1;
  const curve: Pt[] = Array.from({ length: 28 }, (_, i) => {
    const u = i / 27;
    const a = { x: 520, y: 1420 };
    const k = { x: 260, y: 1400 };
    const b = { x: 172, y: 1466 };
    return { x: (1 - u) * (1 - u) * a.x + 2 * u * (1 - u) * k.x + u * u * b.x, y: (1 - u) * (1 - u) * a.y + 2 * u * (1 - u) * k.y + u * u * b.y };
  });
  ctx.save();
  ctx.globalAlpha = alpha;
  inkLine(ctx, curve, 24, INK, j);
  inkLine(ctx, [{ x: 208, y: 1410 }, { x: 172, y: 1466 }, { x: 240, y: 1456 }], 24, INK, j);
  ctx.restore();
}

const nibArt: HTMLCanvasElement[] = [];
/** Nib, big and worried, in a hand-inked circle in the sand above the hall, with a tail pointing down to him. */
function drawInset(ctx: CanvasRenderingContext2D, alpha: number, c: number): void {
  const boil = boilOf(c);
  const art = (nibArt[boil] ??= paintNib({ pose: 'stand', mark: 'none', boil }));
  const cx = 300;
  const cy = 600;
  const r = 150;
  const nib = toScreen(100, 1020);
  ctx.save();
  ctx.globalAlpha = alpha;
  // The tail: a tapering wedge from the circle toward Nib.
  ctx.fillStyle = PAPER;
  ctx.strokeStyle = INK;
  ctx.lineWidth = 9;
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(cx - 90, cy + 120);
  ctx.lineTo(nib.x + 10, nib.y - 20);
  ctx.lineTo(cx - 20, cy + 148);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = PAPER;
  ctx.fill();
  ctx.save();
  ctx.clip();
  const w = 330;
  const h = (w * art.height) / art.width;
  ctx.drawImage(art, cx - w / 2, cy - h / 2 + 8, w, h);
  ctx.restore();
  const pen = new Pen(ctx, 5 + boil * 11, 2);
  const ring: Pt[] = Array.from({ length: 40 }, (_, i) => {
    const a = (i / 39) * Math.PI * 2 + 0.3;
    return { x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r };
  });
  pen.stroke(ring, 10, INK, 1, false);
  ctx.restore();
}

/** Paints the overlay for cycle time c onto a canvas that already holds the game's picture. `revealX` clips the board-bound marks to the new board during a wipe. */
export function drawOverlay(ctx: CanvasRenderingContext2D, c: number): void {
  const o = overlayAt(c);
  const cc = wrapCycle(c);
  ctx.save();
  if (o.wipe !== null) {
    ctx.beginPath();
    const pts: Pt[] = [];
    for (let y = 0; y <= VIDEO.height; y += 24) pts.push({ x: wipeEdgeAt(o.wipe, y), y });
    ctx.moveTo(-10, 0);
    for (const p of pts) ctx.lineTo(p.x, p.y);
    ctx.lineTo(-10, VIDEO.height);
    ctx.closePath();
    ctx.clip();
  }
  o.numbers.forEach((n, i) => drawNumber(ctx, n, cc, i + 1));
  if (o.inset > 0) drawInset(ctx, o.inset, cc);
  ctx.restore();
  if (o.hand) drawHand(ctx, o.hand);
  drawQuestion(ctx);
  if (o.mark) drawMark(ctx, o.mark, cc);
  if (o.credit > 0) drawCredit(ctx, o.credit);
  if (o.cta > 0) {
    drawTextLine(ctx, 'Free to play', VIDEO.width / 2, 1288, 170, 700, o.cta);
    drawTextLine(ctx, 'tap the channel name', VIDEO.width / 2, 1372, 84, 700, o.cta);
    drawArrow(ctx, o.cta, cc);
  }
}
