import { makeCanvas, type Pt } from '../../../src/art/pen';
import { drawOrca } from '../foodchain/art/orca';
import { lerp, VIDEO } from '../short';
import {
  drawBlueWhaleBack, drawBlueWhaleFront, drawBlueWhaleTongue, jawTipOf, MOUTH_CORNER, mouthOf, SNOUT_TIP, tongueMid, whaleToScreen,
} from './blueWhale';
import { css, drawRays, drawSnow, drawVignette, drawWater, mixRgb, type Rgb, wash } from './sea';
import { cycles, diveAt, gapeAt, hushAt, mawZoomAt, tongueGlowAt, tonguePushAt } from './story';

/**
 * Frame 1, "Then one went in head-first…" and the end: the blue whale's head
 * side on, its mouth gaping (baleen, pleated throat, the jaw dropped), and an
 * orca, head first, half inside it. Deep blue water with light from above.
 * Drawn in scene px (1080 × 1920 at zoom 1), through a camera.
 */

/** The whale: snout to flukes in scene px, tilted a little nose up, the mouth's middle at MOUTH_AT. */
export const WHALE = { length: 3900, angle: -0.1 } as const;
const MOUTH_FOCUS: Pt = { x: 1190, y: 250 };
const MOUTH_ON_SCREEN: Pt = { x: 470, y: 760 };
const centreOf = (): Pt => {
  const off = whaleToScreen(MOUTH_FOCUS, 0, 0, WHALE.length, WHALE.angle);
  return { x: MOUTH_ON_SCREEN.x - off.x, y: MOUTH_ON_SCREEN.y - off.y };
};
export const WHALE_AT: Pt = centreOf();
export const onWhale = (p: Pt): Pt => whaleToScreen(p, WHALE_AT.x, WHALE_AT.y, WHALE.length, WHALE.angle);

/** The orca: its length, and the line it swims in along: through the mouth's open front, towards the tongue. */
export const ORCA_LEN = 1000;
/** Its heading: left and up, into the mouth from below its open front. */
const HEADING = Math.PI + 0.36;
const GATE: Pt = (() => {
  const a = onWhale(SNOUT_TIP);
  const b = onWhale(jawTipOf(0.78));
  return { x: lerp(a.x, b.x, 0.5), y: lerp(a.y, b.y, 0.5) };
})();
const INWARD: Pt = { x: Math.cos(HEADING), y: Math.sin(HEADING) };
/** Where the orca's middle is at frame 1: just past the open front, so its head is in the mouth and its tail out. */
const ORCA_HOME: Pt = { x: GATE.x + INWARD.x * 150 + 30, y: GATE.y + INWARD.y * 150 + 60 };

export interface OrcaInMaw {
  /** Its middle, scene px. */
  readonly x: number;
  readonly y: number;
  /** Heading, radians (it faces along INWARD). */
  readonly angle: number;
}

export function orcaAt(t: number): OrcaInMaw {
  const d = diveAt(t);
  const sway = 0.03 * Math.sin(cycles(13, t));
  return {
    x: ORCA_HOME.x + INWARD.x * d * ORCA_LEN,
    y: ORCA_HOME.y + INWARD.y * d * ORCA_LEN,
    angle: Math.atan2(INWARD.y, INWARD.x) + sway,
  };
}

/** The orca's snout, scene px. */
export function snoutOf(o: OrcaInMaw): Pt {
  return { x: o.x + Math.cos(o.angle) * ORCA_LEN * 0.5, y: o.y + Math.sin(o.angle) * ORCA_LEN * 0.5 };
}

/** The camera: zoom about the middle of the frame, pushing towards the tongue on "tongue". */
export function mawCamAt(t: number): { readonly zoom: number; readonly focus: Pt } {
  const push = tonguePushAt(t);
  const tongue = onWhale(tongueMid(gapeAt(t)));
  const centre = { x: VIDEO.width / 2, y: 800 };
  return { zoom: mawZoomAt(t), focus: { x: lerp(centre.x, tongue.x + 60, push), y: lerp(centre.y, tongue.y - 40, push) } };
}

export const toMawScreen = (p: Pt, t: number): Pt => {
  const cam = mawCamAt(t);
  return { x: VIDEO.width / 2 + (p.x - cam.focus.x) * cam.zoom, y: 800 + (p.y - cam.focus.y) * cam.zoom };
};

// ---------------------------------------------------------------- drawing

const DEEP_TOP: Rgb = [30, 74, 120];
const DEEP_MID: Rgb = [12, 36, 72];
const DEEP_BOTTOM: Rgb = [3, 10, 24];
const HUSH_TOP: Rgb = [14, 26, 52];
const HUSH_MID: Rgb = [6, 13, 30];

const path = (ctx: CanvasRenderingContext2D, pts: readonly Pt[]): void => {
  ctx.beginPath();
  pts.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
  ctx.closePath();
};

/** Bubbles streaming off the orca's back as it shoves in. */
function drawBubbles(ctx: CanvasRenderingContext2D, o: OrcaInMaw, t: number, alpha: number): void {
  ctx.save();
  ctx.strokeStyle = 'rgba(225,238,250,0.7)';
  ctx.fillStyle = 'rgba(225,238,250,0.16)';
  for (let i = 0; i < 18; i++) {
    const along = ((i * 0.137 + cycles(3, t) / (2 * Math.PI)) % 1);
    const back = -0.1 - along * 0.55;
    const x = o.x + Math.cos(o.angle) * back * ORCA_LEN + 30 * Math.sin(i * 2.1 + cycles(5, t));
    const y = o.y + Math.sin(o.angle) * back * ORCA_LEN - 90 - along * 260 - (i % 3) * 30;
    const r = 5 + (i % 4) * 4;
    ctx.globalAlpha = alpha * (1 - along) * 0.9;
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
  ctx.restore();
}

/** A polygon wound clockwise on screen (so two of them in one path make their union under the nonzero rule). */
function clockwise(pts: readonly Pt[]): Pt[] {
  let area = 0;
  pts.forEach((p, i) => {
    const q = pts[(i + 1) % pts.length]!;
    area += p.x * q.y - q.x * p.y;
  });
  return area >= 0 ? [...pts] : [...pts].reverse();
}

/** The water in front of the mouth: everything past the line from the snout's tip to the lower lip's, away from the throat. */
function frontWater(gape: number): Pt[] {
  const a = onWhale(SNOUT_TIP);
  const b = onWhale(jawTipOf(gape));
  const len = Math.hypot(b.x - a.x, b.y - a.y);
  const u = { x: (b.x - a.x) / len, y: (b.y - a.y) / len };
  const corner = onWhale(MOUTH_CORNER);
  let n = { x: -u.y, y: u.x };
  if ((corner.x - a.x) * n.x + (corner.y - a.y) * n.y > 0) n = { x: -n.x, y: -n.y };
  const far = 8000;
  const p0 = { x: a.x - u.x * far, y: a.y - u.y * far };
  const p1 = { x: b.x + u.x * far, y: b.y + u.y * far };
  return [p0, p1, { x: p1.x + n.x * far, y: p1.y + n.y * far }, { x: p0.x + n.x * far, y: p0.y + n.y * far }];
}

/** The orca, kept behind the whale's head, and darkened where it's inside the mouth. */
function drawOrcaInside(ctx: CanvasRenderingContext2D, layer: { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D }, t: number, gape: number, setCam: (c: CanvasRenderingContext2D) => void): void {
  const o = orcaAt(t);
  const l = layer.ctx;
  l.save();
  l.setTransform(1, 0, 0, 1, 0, 0);
  l.clearRect(0, 0, VIDEO.width, VIDEO.height);
  setCam(l);
  drawOrca(l, o.x, o.y, ORCA_LEN, o.angle, t, { jaw: 0.32, tail: cycles(17, t) }, true);
  // Inside the mouth the light fades: dark plum towards the throat.
  l.globalCompositeOperation = 'source-atop';
  l.save();
  path(l, mouthOf(gape).map(onWhale));
  l.clip();
  const deep = onWhale(MOUTH_CORNER);
  const g = l.createLinearGradient(GATE.x, GATE.y, deep.x, deep.y);
  g.addColorStop(0, 'rgba(14,6,14,0.1)');
  g.addColorStop(0.35, 'rgba(14,6,14,0.55)');
  g.addColorStop(0.75, 'rgba(10,3,8,0.92)');
  g.addColorStop(1, 'rgba(10,3,8,0.97)');
  l.fillStyle = g;
  l.fillRect(-2000, -2000, 6000, 6000);
  l.restore();
  l.restore();
  // Seen only in the open mouth and in the water in front of it.
  ctx.save();
  ctx.beginPath();
  for (const shape of [clockwise(mouthOf(gape).map(onWhale)), clockwise(frontWater(gape))]) {
    shape.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
    ctx.closePath();
  }
  ctx.clip('nonzero');
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.drawImage(layer.canvas, 0, 0);
  ctx.restore();
  ctx.restore();
}

export function makeMawLayer(): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } {
  return makeCanvas(VIDEO.width, VIDEO.height);
}

export function drawMaw(ctx: CanvasRenderingContext2D, sheet: HTMLCanvasElement, layer: { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D }, t: number): void {
  const hush = hushAt(t);
  drawWater(ctx, sheet, mixRgb(DEEP_TOP, HUSH_TOP, hush), mixRgb(DEEP_MID, HUSH_MID, hush), DEEP_BOTTOM);
  drawRays(ctx, t, 1 - 0.6 * hush, -150, '200,228,250', 1900);
  drawSnow(ctx, t, '#dfe8ff', 0.9 - 0.4 * hush);
  const cam = mawCamAt(t);
  const setCam = (c: CanvasRenderingContext2D): void => {
    c.translate(VIDEO.width / 2, 800);
    c.scale(cam.zoom, cam.zoom);
    c.translate(-cam.focus.x, -cam.focus.y);
  };
  const gape = gapeAt(t);
  const pose = { gape, throat: 0.15, tail: cycles(3, t), tongue: tongueGlowAt(t) };
  ctx.save();
  setCam(ctx);
  drawBlueWhaleBack(ctx, WHALE_AT.x, WHALE_AT.y, WHALE.length, WHALE.angle, t, pose);
  drawOrcaInside(ctx, layer, t, gape, setCam);
  drawBlueWhaleTongue(ctx, WHALE_AT.x, WHALE_AT.y, WHALE.length, WHALE.angle, t, pose, pose.tongue);
  drawBlueWhaleFront(ctx, WHALE_AT.x, WHALE_AT.y, WHALE.length, WHALE.angle, t, pose);
  drawBubbles(ctx, orcaAt(t), t, 1 - 0.5 * hush);
  ctx.restore();
  drawVignette(ctx, 0.55 + 0.3 * hush);
  wash(ctx, 'multiply', css([60, 70, 120]), 0.25 * hush);
}
