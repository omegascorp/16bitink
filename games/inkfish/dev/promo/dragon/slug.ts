import { halo } from '../../../src/art/glowArt';
import { ellipse, INK, makeCanvas, Pen, type Pt } from '../../../src/art/pen';
import { BOIL_FRAMES } from '../../../src/art/textures';
import { path, tube } from '../sharkskin/ink';
import {
  BODY, branchAt, BUNCHES, core, EYE_R, EYES, type Fan, FANS, fanOf, fanRoot, fingerSpine, gutAt, halfWidth, isLower, MOUTH, STOMACH, strip,
} from './shape';
import type { Bubble, Capsule, Eyes } from './story';

/**
 * The blue dragon in the game's pen and ink, painted rather than doodled:
 * a silvery body with a bright blue band and a dark navy stripe down its
 * middle, speckled and hatched on its shadow side; fans of blue fingers
 * with silver roots and dark tips. Baked once per boil frame (body and each
 * fan shape), then the live parts on top: its eyes and jaws, the
 * see-through gut, the stolen capsules, the gulp of air, the lit fingertips.
 * Everything is in slug px (shape.ts) unless it says screen px.
 */

/** Sprite px per slug px: sharp at the closest shot (about 5.3 screen px per slug px). */
const RES = 6;
const SILVER = '#e3ecf7';
const SKY_BLUE = '#a9c9f0';
export const BLUE = '#3f86e4';
const DEEP = '#2559c4';
const NAVY = '#122a72';
const TIP = '#182a7e';
const GLASS = '#c9f2ff';
export const GLOW = '#7fe9ff';

export interface SlugSprites {
  readonly body: readonly HTMLCanvasElement[];
  readonly xray: readonly HTMLCanvasElement[];
  /** One per fan shape (FANS), each per boil frame. */
  readonly fans: readonly (readonly HTMLCanvasElement[])[];
}

const BODY_BOX = { x0: -118, y0: -28, w: 232, h: 56 } as const;
const FAN_BOX = { x0: -58, y0: -60, w: 116, h: 80 } as const;

function bakeFrames(box: { readonly x0: number; readonly y0: number; readonly w: number; readonly h: number }, seed: number, draw: (pen: Pen, ctx: CanvasRenderingContext2D) => void): HTMLCanvasElement[] {
  return Array.from({ length: BOIL_FRAMES }, (_, f) => {
    const { canvas, ctx } = makeCanvas(box.w * RES, box.h * RES);
    ctx.scale(RES, RES);
    ctx.translate(-box.x0, -box.y0);
    draw(new Pen(ctx, seed + f * 977, 0.32), ctx);
    return canvas;
  });
}

/** A little head tentacle: a tapering blue tube. */
function feeler(pen: Pen, from: Pt, to: Pt, r: number): void {
  const mid = { x: (from.x + to.x) / 2 + (to.y - from.y) * 0.15, y: (from.y + to.y) / 2 - (to.x - from.x) * 0.15 };
  const shape = tube(path(from, [mid, to]), r, r * 0.55);
  pen.fill(shape, DEEP, 0.95);
  pen.fill(tube(path(from, [mid, to]), r * 0.45, r * 0.25), SKY_BLUE, 0.6);
  pen.stroke([...shape, shape[0]!], 0.55, INK, 0.9, false);
}

function drawBody(pen: Pen): void {
  // The head's feelers first, under the body's outline: oral tentacles forward, rhinophores out to the sides.
  for (const s of [-1, 1]) {
    feeler(pen, { x: -95, y: s * 6 }, { x: -110, y: s * 15 }, 2.4);
    feeler(pen, { x: -86, y: s * 10 }, { x: -92, y: s * 20 }, 1.9);
  }
  pen.fill(BODY, SILVER, 1);
  pen.clipped(BODY, () => {
    // A silvery sheen at the edges going to sky blue, the bright band, the deep band, the navy stripe.
    pen.fill(core(0.86), SKY_BLUE, 0.85);
    pen.fill(core(0.7), BLUE, 1);
    pen.fill(core(0.48), DEEP, 0.9);
    pen.fill(core(0.24, -94, 104), NAVY, 0.95);
    // Speckles of darker blue over the band, thicker towards the stripe.
    pen.stipple(core(0.7), 1600, (_x, y) => 0.55 - Math.abs(y) / 30, 0.32, NAVY);
    pen.stipple(core(1), 500, (x, y) => (Math.abs(y) > halfWidth(x) * 0.75 ? 0.5 : 0), 0.28, '#7d9cc8');
    // The shadow side (light from above): hatched along the lower edge.
    pen.hatch(strip(0.45, 1.05, 1), 1.3, 0.75, 0.22, { color: INK, alpha: 0.28 });
    // Glints along the upper edge and the stripe.
    pen.hair(strip(0.82, 0.82, -1, -88, 80).slice(0, 71), 0.5, '#ffffff', 0.7);
    pen.hair(core(0.1, -80, 70).slice(0, 71), 0.35, '#8fb6ff', 0.55);
  });
  // The outline, heavier underneath.
  const half = Math.floor(BODY.length / 2);
  pen.stroke(BODY.slice(0, half + 1), 0.85, INK, 1);
  pen.stroke([...BODY.slice(half), BODY[0]!], 1.25, INK, 1);
}

function drawXray(pen: Pen): void {
  pen.fill(BODY, GLASS, 0.14);
  pen.fill(core(0.55), '#78d6ff', 0.08);
  // The gut from the mouth to the stomach, and its branches out to every bunch.
  const gut = Array.from({ length: 21 }, (_, i) => gutAt(i / 20));
  const gutShape = tube(gut, 2.6, 2.8);
  pen.fill(gutShape, '#dff8ff', 0.16);
  pen.hair([...gutShape, gutShape[0]!], 0.4, GLASS, 0.75);
  for (let i = 0; i < BUNCHES; i++) {
    const br = tube(Array.from({ length: 13 }, (_, k) => branchAt(i, k / 12)), 1.7, 1.3);
    pen.fill(br, '#dff8ff', 0.12);
    pen.hair([...br, br[0]!], 0.35, GLASS, 0.55);
  }
  const stomach = ellipse(STOMACH.x, STOMACH.y, 12, 7.5, 26);
  pen.fill(stomach, '#dff8ff', 0.16);
  pen.hair([...stomach, stomach[0]!], 0.45, GLASS, 0.8);
  pen.stroke([...BODY, BODY[0]!], 0.7, GLASS, 0.9, false);
}

/** One bunch, its root at the origin, as an upper bunch: the stalk from the body's edge, then its fingers. */
function drawFan(pen: Pen, f: Fan): void {
  const root = fanRoot(f);
  const edge = { x: f.x - root.x, y: -halfWidth(f.x) - root.y + 3 };
  const stalk = tube(path(edge, [{ x: edge.x * 0.4, y: edge.y * 0.5 }, { x: 0, y: 0 }]), 5.2, 4.2);
  pen.fill(stalk, SKY_BLUE, 1);
  pen.fill(stalk, BLUE, 0.55);
  pen.stroke([...stalk, stalk[0]!], 0.6, INK, 0.85, false);
  // Outer fingers first, the middle ones on top.
  const order = Array.from({ length: f.fingers }, (_, j) => j).sort((a, b) => Math.abs(b - (f.fingers - 1) / 2) - Math.abs(a - (f.fingers - 1) / 2));
  for (const j of order) {
    const spine = fingerSpine(f, j);
    const shape = tube(spine, 2.1, 3.1);
    const tip = spine[8]!;
    pen.fill(shape, BLUE, 1);
    pen.clipped(shape, () => {
      // Silver at the root, bright blue, then a dark tip.
      pen.fill(ellipse(0, 0, 5.5, 5.5, 16), SILVER, 0.7);
      const back = spine[6]!;
      pen.fill(ellipse(tip.x + (tip.x - back.x) * 0.3, tip.y + (tip.y - back.y) * 0.3, 6.5, 6.5, 16), TIP, 0.85);
      pen.stipple(shape, 160, () => 0.45, 0.25, NAVY);
      pen.hatch(shape, 1.1, Math.atan2(tip.y, tip.x) + 1.2, 0.18, { color: INK, alpha: 0.2 });
    });
    pen.hair(spine.slice(1, 7).map((p) => ({ x: p.x - 0.7, y: p.y - 0.3 })), 0.4, '#ffffff', 0.5);
    pen.stroke([...shape, shape[0]!], 0.55, INK, 0.95, false);
  }
}

export function makeSlugSprites(): SlugSprites {
  return {
    body: bakeFrames(BODY_BOX, 41, drawBody),
    xray: bakeFrames(BODY_BOX, 43, drawXray),
    fans: FANS.map((f, i) => bakeFrames(FAN_BOX, 61 + i * 13, (pen) => drawFan(pen, f))),
  };
}

const stamp = (ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, box: { readonly x0: number; readonly y0: number }, alpha: number): void => {
  if (alpha <= 0) return;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.scale(1 / RES, 1 / RES);
  ctx.drawImage(canvas, box.x0 * RES, box.y0 * RES);
  ctx.restore();
};

export interface SlugLook {
  readonly boil: number;
  readonly fanPose: (i: number) => { readonly rot: number; readonly scale: number };
  readonly xray: number;
  readonly jaw: number;
  readonly eyes: Eyes;
}

/** Runs `draw` in bunch i's frame (root at the origin, as an upper bunch), inside the slug's frame. */
export function inFan(ctx: CanvasRenderingContext2D, i: number, pose: { readonly rot: number; readonly scale: number }, draw: () => void): void {
  const root = fanRoot(fanOf(i));
  ctx.save();
  if (isLower(i)) ctx.scale(1, -1);
  ctx.translate(root.x, root.y);
  ctx.rotate(pose.rot);
  ctx.scale(pose.scale, pose.scale);
  draw();
  ctx.restore();
}

/** The fans, the body and its see-through insides, in the slug's frame (slug px). */
export function drawSlugBody(ctx: CanvasRenderingContext2D, s: SlugSprites, look: SlugLook): void {
  const fanAlpha = 1 - 0.6 * look.xray;
  for (let i = 0; i < BUNCHES; i++) {
    inFan(ctx, i, look.fanPose(i), () => {
      stamp(ctx, s.fans[i % 3]![look.boil]!, FAN_BOX, fanAlpha);
      if (look.xray > 0) {
        // The gut's branches running up every finger.
        ctx.save();
        ctx.strokeStyle = GLASS;
        ctx.lineWidth = 0.55;
        ctx.globalAlpha = 0.6 * look.xray;
        const f = fanOf(i);
        for (let j = 0; j < f.fingers; j++) {
          const sp = fingerSpine(f, j);
          ctx.beginPath();
          sp.forEach((p, k) => (k === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
          ctx.stroke();
        }
        ctx.restore();
      }
    });
  }
  stamp(ctx, s.body[look.boil]!, BODY_BOX, 1 - 0.78 * look.xray);
  stamp(ctx, s.xray[look.boil]!, BODY_BOX, look.xray);
}

/** Its eyes: wide, sly, angry or squeezed shut in a grin. The face's "up" is towards the tail. */
export function drawEyes(ctx: CanvasRenderingContext2D, e: Eyes): void {
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  EYES.forEach((c, k) => {
    const out = k === 0 ? -1 : 1;
    const r = EYE_R;
    const open = 1 - e.happy;
    if (open > 0.02) {
      ctx.globalAlpha = open;
      ctx.fillStyle = '#f7fbff';
      ctx.beginPath();
      ctx.arc(c.x, c.y, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = INK;
      ctx.beginPath();
      ctx.arc(c.x + e.look * r * 0.45, c.y + out * 0.15 * r, r * 0.52 * e.pupil, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(c.x + e.look * r * 0.45 - r * 0.18, c.y + out * 0.15 * r - r * 0.2, r * 0.16, 0, Math.PI * 2);
      ctx.fill();
      // The lid comes down from the tail side; its edge slants out (sly) or in (angry).
      if (e.lid > 0.01) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(c.x, c.y, r * 1.02, 0, Math.PI * 2);
        ctx.clip();
        const edge = r - 2 * r * Math.min(1, e.lid);
        const tilt = 0.32 * r * e.slant;
        ctx.fillStyle = '#5b9ae8';
        ctx.beginPath();
        ctx.moveTo(c.x + r * 1.2, c.y - r * 1.2);
        ctx.lineTo(c.x + edge - tilt * out * -1, c.y - r * 1.2 * -out);
        ctx.lineTo(c.x + edge + tilt * out * -1, c.y + r * 1.2 * -out);
        ctx.lineTo(c.x + r * 1.2, c.y + r * 1.2);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = INK;
        ctx.lineWidth = 0.9;
        ctx.beginPath();
        ctx.moveTo(c.x + edge - tilt * out * -1, c.y - r * 1.2 * -out);
        ctx.lineTo(c.x + edge + tilt * out * -1, c.y + r * 1.2 * -out);
        ctx.stroke();
        ctx.restore();
      }
      ctx.strokeStyle = INK;
      ctx.lineWidth = 0.6;
      ctx.beginPath();
      ctx.arc(c.x, c.y, r, 0, Math.PI * 2);
      ctx.stroke();
    }
    if (e.happy > 0.02) {
      // ^ ^ : arcs bowed towards the tail.
      ctx.globalAlpha = e.happy;
      ctx.strokeStyle = INK;
      ctx.lineWidth = 0.95;
      ctx.beginPath();
      ctx.arc(c.x - r * 0.5, c.y, r * 0.95, -Math.PI * 0.42, Math.PI * 0.42);
      ctx.stroke();
    }
  });
  ctx.restore();
}

/** The mouth at the tip of the head: a dark gape between two pale, beak-like jaw plates, `open` 0 .. 1. */
export function drawMouth(ctx: CanvasRenderingContext2D, open: number): void {
  const gap = 0.6 + 5.2 * open;
  const x = MOUTH.x + 1.2;
  ctx.save();
  ctx.lineJoin = 'round';
  ctx.fillStyle = '#0a0f2c';
  ctx.beginPath();
  ctx.ellipse(x + 0.8, 0, 2.6 + 1.4 * open, gap + 1.2, 0, 0, Math.PI * 2);
  ctx.fill();
  // The jaws: a crescent above and one below, their cutting edges meeting when shut.
  for (const s of [-1, 1]) {
    const edge = s * gap * 0.5;
    ctx.fillStyle = '#efe2b4';
    ctx.beginPath();
    ctx.moveTo(x + 4.2, edge + s * 2.6);
    ctx.quadraticCurveTo(x - 1.2, edge + s * 3.4, x - 2.6, edge + s * 0.3);
    ctx.quadraticCurveTo(x + 0.6, edge + s * 0.9, x + 4.2, edge + s * 0.6);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = INK;
    ctx.lineWidth = 0.55;
    ctx.stroke();
  }
  ctx.restore();
}

/** The swallowed air, a glassy bubble in its belly (slug px). */
export function drawBellyBubble(ctx: CanvasRenderingContext2D, b: Bubble): void {
  if (b.alpha <= 0) return;
  ctx.save();
  ctx.globalAlpha = b.alpha;
  const g = ctx.createRadialGradient(b.x - b.r * 0.3, b.y - b.r * 0.3, b.r * 0.1, b.x, b.y, b.r);
  g.addColorStop(0, 'rgba(240,252,255,0.75)');
  g.addColorStop(0.7, 'rgba(190,235,255,0.35)');
  g.addColorStop(1, 'rgba(240,252,255,0.85)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 0.7;
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(b.x - b.r * 0.15, b.y - b.r * 0.15, b.r * 0.6, Math.PI * 1.05, Math.PI * 1.5);
  ctx.stroke();
  ctx.restore();
}

/**
 * A stinging capsule (a nematocyst), unfired: a glassy pod with its thread
 * coiled up inside and the harpoon tucked in its front end. `len` is its
 * length in whatever units the context is in; it points along +x.
 */
export function drawCapsule(ctx: CanvasRenderingContext2D, c: Capsule, len: number, coil: number): void {
  if (c.alpha <= 0 || c.scale <= 0) return;
  const l = len * c.scale;
  const w = l * 0.42;
  ctx.save();
  ctx.translate(c.x, c.y);
  ctx.rotate(c.angle);
  ctx.globalAlpha = c.alpha;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  // The harpoon's point and barbs, just out of the front.
  ctx.strokeStyle = '#1a2a6e';
  ctx.fillStyle = '#1a2a6e';
  ctx.lineWidth = l * 0.06;
  ctx.beginPath();
  ctx.moveTo(l * 0.42, 0);
  ctx.lineTo(l * 0.66, 0);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(l * 0.74, 0);
  ctx.lineTo(l * 0.6, -l * 0.08);
  ctx.lineTo(l * 0.6, l * 0.08);
  ctx.closePath();
  ctx.fill();
  // The pod.
  ctx.fillStyle = '#d9f5ff';
  ctx.beginPath();
  ctx.ellipse(0, 0, l * 0.5, w * 0.5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#6fa8f0';
  ctx.globalAlpha = c.alpha * 0.35;
  ctx.beginPath();
  ctx.ellipse(-l * 0.05, w * 0.12, l * 0.4, w * 0.3, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = c.alpha;
  // The thread coiled inside.
  ctx.strokeStyle = '#2346a8';
  ctx.lineWidth = l * 0.045;
  ctx.beginPath();
  for (let i = 0; i <= 28; i++) {
    const u = i / 28;
    const x = -l * 0.36 + u * l * 0.7;
    const y = Math.sin(u * Math.PI * 7 + coil) * w * 0.28 * Math.sin(Math.PI * u);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();
  ctx.strokeStyle = INK;
  ctx.lineWidth = l * 0.07;
  ctx.beginPath();
  ctx.ellipse(0, 0, l * 0.5, w * 0.5, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = l * 0.04;
  ctx.beginPath();
  ctx.ellipse(-l * 0.05, -w * 0.12, l * 0.32, w * 0.22, 0, Math.PI * 1.1, Math.PI * 1.7);
  ctx.stroke();
  ctx.restore();
}

/** A lit fingertip's glow (screen px), `k` 0 .. 1, hotter (whiter, bigger) in the danger beat. */
export function drawTipGlow(ctx: CanvasRenderingContext2D, at: Pt, k: number, reach: number, hot: number): void {
  if (k <= 0) return;
  halo(ctx, at.x, at.y, reach * (1.6 + 0.6 * hot), GLOW, 0.55 * k);
  halo(ctx, at.x, at.y, reach * 0.55, hot > 0.3 ? '#f2fdff' : '#c8f8ff', 0.9 * k);
}

/** The see-through capsules drawn in the slug's frame. */
export const CAPSULE_LEN = 9;
