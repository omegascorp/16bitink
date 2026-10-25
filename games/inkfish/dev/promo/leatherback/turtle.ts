import { INK, Pen, type Pt } from '../../../src/art/pen';
import { createRng } from '../../../src/logic/rng';
import { lerp } from '../short';
import { fillShape, ink, mix, pathOf, smoothClosed, smoothOpen } from './paint';
import type { TurtlePose } from './story';

/**
 * The leatherback side on, swimming right, in its own frame (px at scale 1,
 * the body's middle at the origin, nose along +x, y down): the long
 * teardrop shell of leathery skin with its ridges running nose to tail,
 * blue-black and speckled white; the big rounded head with the notched beak;
 * the huge front flippers beating like wings, the small rear ones trailing.
 */

const SHELL_TOP = '#121924';
const SHELL = '#243041';
const SHELL_FLANK = '#3c4a5d';
const BELLY = '#c9c3b8';
const SKIN = '#2a3546';
const SPOT = '#e8e3d8';

const TOP: readonly Pt[] = [
  { x: 192, y: -44 }, { x: 150, y: -96 }, { x: 80, y: -128 }, { x: 0, y: -136 }, { x: -100, y: -126 }, { x: -200, y: -102 }, { x: -300, y: -64 },
  { x: -380, y: -24 }, { x: -425, y: 0 },
];
const UNDER: readonly Pt[] = [
  { x: -425, y: 0 }, { x: -372, y: 22 }, { x: -262, y: 52 }, { x: -120, y: 70 }, { x: 20, y: 74 }, { x: 132, y: 62 }, { x: 192, y: 38 },
];
/** The edge of the shell along the side (the marginal ridge). */
const MARGIN: readonly Pt[] = [
  { x: 188, y: 22 }, { x: 60, y: 44 }, { x: -80, y: 46 }, { x: -220, y: 34 }, { x: -330, y: 16 }, { x: -418, y: 2 },
];

const BODY = smoothClosed([...TOP, ...UNDER.slice(1, -1)], 5);
const TOP_S = smoothOpen(TOP, 5);
const MARGIN_S = smoothOpen(MARGIN, 5);

/** A ridge between the top line and the margin, at fraction k of the way down. */
function ridge(k: number): Pt[] {
  return Array.from({ length: 30 }, (_, i) => {
    const u = i / 29;
    const a = TOP_S[Math.round(u * (TOP_S.length - 1))]!;
    const b = MARGIN_S[Math.round(u * (MARGIN_S.length - 1))]!;
    return { x: lerp(a.x, b.x, k), y: lerp(a.y, b.y, k) };
  });
}
const RIDGES = [0.3, 0.62].map(ridge);

/** The head, the jaw hinge, and the lower jaw (rotated open about the hinge). */
const HINGE: Pt = { x: 288, y: 18 };
const HEAD: readonly Pt[] = [
  { x: 186, y: -48 }, { x: 236, y: -72 }, { x: 296, y: -68 }, { x: 340, y: -44 }, { x: 358, y: -14 }, { x: 364, y: 8 }, { x: 358, y: 18 },
  { x: 336, y: 16 }, { x: 290, y: 20 }, { x: 250, y: 30 }, { x: 196, y: 40 },
];
const JAW: readonly Pt[] = [{ x: 288, y: 18 }, { x: 330, y: 19 }, { x: 352, y: 22 }, { x: 356, y: 30 }, { x: 330, y: 46 }, { x: 280, y: 52 }, { x: 232, y: 46 }];

/** Speckles fixed to the skin: thick on the head, neck and flippers, sparse on the shell. */
const SHELL_SPOTS = (() => {
  const rng = createRng(1771);
  return Array.from({ length: 140 }, () => ({ u: rng(), k: rng(), r: 1.5 + rng() ** 2 * 5, a: rng() }));
})();

const rot = (p: Pt, o: Pt, a: number): Pt => {
  const c = Math.cos(a);
  const s = Math.sin(a);
  return { x: o.x + (p.x - o.x) * c - (p.y - o.y) * s, y: o.y + (p.x - o.x) * s + (p.y - o.y) * c };
};

/** A flipper: from its root, a long tapering wing pointing back at angle `a` (0 straight back, positive down), its tip lagging the stroke. */
function flipperOf(root: Pt, len: number, width: number, a: number, lag: number): { readonly outline: Pt[]; readonly lead: Pt[]; readonly trail: Pt[] } {
  const lead: Pt[] = [];
  const trail: Pt[] = [];
  for (let i = 0; i <= 14; i++) {
    const u = i / 14;
    const ang = Math.PI - (a + lag * u * u);
    const x = root.x + Math.cos(ang) * len * u;
    const y = root.y - Math.sin(ang) * len * u;
    // Width: broad near the root, a long taper; the leading edge bows forward.
    const w = width * (u < 0.15 ? 0.7 + 2 * u : (1 - u) ** 0.7 * 1.0) + 3;
    const n = { x: -Math.sin(ang), y: -Math.cos(ang) };
    const bow = 14 * Math.sin(Math.PI * u);
    lead.push({ x: x + n.x * (w * 0.45 + bow), y: y + n.y * (w * 0.45 + bow) });
    trail.push({ x: x - n.x * w * 0.55, y: y - n.y * w * 0.55 });
  }
  return { outline: smoothClosed([...lead, ...[...trail].reverse()], 3), lead, trail };
}

export interface TurtleLook {
  /** Warm sunlight on the shell (0 .. 1). */
  readonly sun: number;
}

function enter(ctx: CanvasRenderingContext2D, p: TurtlePose): void {
  ctx.translate(p.x, p.y);
  ctx.rotate(p.tilt);
  ctx.scale(p.scale * p.turn, p.scale);
}

/** The turtle side on (story.ts poses it). */
export function drawTurtle(ctx: CanvasRenderingContext2D, p: TurtlePose, look: TurtleLook, boil: number): void {
  if (p.turn <= 0.01) return;
  const pen = new Pen(ctx, 3301 + boil * 977, 1.1);
  const w = 3.4 / Math.max(0.4, p.scale);
  const beat = Math.sin(p.stroke);
  const flipA = p.sweep * (0.2 + 0.72 * beat);
  const lag = -0.35 * Math.cos(p.stroke) * p.sweep;
  ctx.save();
  enter(ctx, p);
  // The far front flipper, behind everything, darker.
  const far = flipperOf({ x: 120, y: 18 }, 420, 92, flipA - 0.12, lag);
  fillShape(ctx, far.outline.map((q) => ({ x: q.x - 14, y: q.y - 10 })), '#121822');
  ink(pen, far.outline.map((q) => ({ x: q.x - 14, y: q.y - 10 })), w * 0.8);
  // The rear flippers.
  const rearA = 0.55 + 0.18 * Math.sin(p.stroke + 1.2);
  const rear = flipperOf({ x: -300, y: 40 }, 118, 70, rearA, 0.2);
  fillShape(ctx, rear.outline, SKIN);
  ink(pen, rear.outline, w * 0.8);
  drawBody(ctx, pen, look, w);
  drawHead(ctx, pen, p, look, w);
  // The near front flipper.
  const near = flipperOf({ x: 110, y: 34 }, 440, 98, flipA, lag);
  const top = near.lead[7]!;
  const bot = near.trail[7]!;
  const g = ctx.createLinearGradient(top.x, top.y, bot.x, bot.y);
  g.addColorStop(0, mix(SHELL_FLANK, '#ffd79a', look.sun * 0.25));
  g.addColorStop(0.6, SKIN);
  g.addColorStop(1, '#161d28');
  fillShape(ctx, near.outline, g);
  // White speckles along it, a pale trailing edge, the bones' faint ridges.
  const rng = createRng(4401);
  for (let i = 0; i < 46; i++) {
    const u = 0.08 + rng() * 0.85;
    const k = rng();
    const a = near.lead[Math.round(u * 14)]!;
    const b = near.trail[Math.round(u * 14)]!;
    const at = { x: lerp(a.x, b.x, 0.15 + 0.7 * k), y: lerp(a.y, b.y, 0.15 + 0.7 * k) };
    pen.dot(at.x, at.y, 1.5 + rng() * 3.5, SPOT, 0.35 + 0.4 * rng());
  }
  pen.hair(near.trail, 3, '#cfc9be', 0.6);
  pen.hair(near.lead.map((q, i) => ({ x: lerp(q.x, near.trail[i]!.x, 0.35), y: lerp(q.y, near.trail[i]!.y, 0.35) })), 1.6, '#0b0f15', 0.5);
  pen.hair(near.lead, 2.2, mix('#93a7ba', '#ffe0a8', look.sun), 0.5 + 0.3 * look.sun);
  ink(pen, near.outline, w);
  ctx.restore();
}

function drawBody(ctx: CanvasRenderingContext2D, pen: Pen, look: TurtleLook, w: number): void {
  // The shell: dark along the top, lighter down the flank to the margin; the pale belly below it.
  const g = ctx.createLinearGradient(0, -136, 0, 74);
  g.addColorStop(0, SHELL_TOP);
  g.addColorStop(0.45, SHELL);
  g.addColorStop(0.72, SHELL_FLANK);
  g.addColorStop(0.82, '#6d7584');
  g.addColorStop(1, BELLY);
  fillShape(ctx, BODY, g);
  ctx.save();
  pathOf(ctx, BODY);
  ctx.clip();
  // Below the margin: the pale, speckled underside.
  const below = [...MARGIN_S, { x: -430, y: 90 }, { x: 200, y: 90 }];
  fillShape(ctx, below, 'rgba(200,194,184,0.55)');
  pen.stipple(below, 260, () => 0.7, 1.4, '#3a4556');
  // Light from above: a sheen along the crest, warm in the sun.
  const sheen = ctx.createLinearGradient(0, -140, 0, -40);
  sheen.addColorStop(0, mix('#6f8296', '#ffd58a', look.sun, 0.4 + 0.3 * look.sun));
  sheen.addColorStop(1, mix('#6f8296', '#ffd58a', look.sun, 0));
  ctx.fillStyle = sheen;
  ctx.fillRect(-440, -140, 640, 110);
  // Speckles over the shell.
  for (const s of SHELL_SPOTS) {
    const a = TOP_S[Math.round(s.u * (TOP_S.length - 1))]!;
    const b = MARGIN_S[Math.round(s.u * (MARGIN_S.length - 1))]!;
    const at = { x: lerp(a.x, b.x, 0.08 + 0.9 * s.k), y: lerp(a.y, b.y, 0.08 + 0.9 * s.k) };
    ctx.globalAlpha = 0.25 + 0.4 * s.a;
    ctx.fillStyle = SPOT;
    ctx.beginPath();
    ctx.ellipse(at.x, at.y, s.r * 1.4, s.r * 0.8, 0.1, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  // Hatching on the lower flank, in shade.
  pen.hatch([...MARGIN_S, ...[...RIDGES[1]!].reverse()], 9, 2.4, 1.1, { color: '#06090e', alpha: 0.35 });
  ctx.restore();
  // The ridges running nose to tail: a lit crest and an inked edge each.
  const crest = mix('#8ea3b8', '#ffe2a4', look.sun);
  for (const r of [TOP_S, ...RIDGES]) {
    pen.hair(r.map((q) => ({ x: q.x, y: q.y + 4 })), 3 + 2 * look.sun, crest, 0.45 + 0.4 * look.sun);
  }
  for (const r of RIDGES) pen.stroke(r, 2.2, INK, 0.85);
  pen.stroke(MARGIN_S, 2.6, INK, 0.9);
  ink(pen, BODY, w);
}

function drawHead(ctx: CanvasRenderingContext2D, pen: Pen, p: TurtlePose, look: TurtleLook, w: number): void {
  const open = p.mouth * 0.55;
  const jaw = JAW.map((q) => rot(q, HINGE, open));
  // The inside of the open mouth: pink, with a row of tiny spines.
  if (open > 0.02) {
    const inside = [HINGE, { x: 356, y: 16 }, jaw[3]!, jaw[4]!, jaw[5]!];
    fillShape(ctx, smoothClosed(inside, 3), '#7a2c32');
    for (let i = 0; i < 6; i++) {
      const u = i / 5;
      const a = { x: lerp(300, 350, u), y: 20 + 3 * u };
      pen.hair([a, { x: a.x - 12, y: a.y + 10 * p.mouth }], 1.6, '#f2e6d6', 0.9);
    }
  }
  // The lower jaw, then the head over it.
  const jawS = smoothClosed(jaw, 3);
  fillShape(ctx, jawS, mix(SKIN, BELLY, 0.35));
  pen.stipple(jawS, 40, () => 0.8, 1.4, SPOT);
  ink(pen, jawS, w * 0.9);
  const head = smoothClosed(HEAD, 4);
  const g = ctx.createLinearGradient(260, -72, 260, 40);
  g.addColorStop(0, mix('#1a2230', '#5a4a3a', look.sun * 0.4));
  g.addColorStop(0.6, SKIN);
  g.addColorStop(1, '#58626f');
  fillShape(ctx, head, g);
  ctx.save();
  pathOf(ctx, head);
  ctx.clip();
  const rng = createRng(5151);
  for (let i = 0; i < 60; i++) pen.dot(190 + rng() * 170, -70 + rng() * 110, 1.2 + rng() * 3, SPOT, 0.3 + 0.4 * rng());
  // The pink spot on its crown.
  pen.dot(262, -64, 9, '#d79aa2', 0.5);
  ctx.restore();
  // The beak: the cusp hanging at the notch, the jaw line.
  pen.stroke([{ x: 300, y: 19 }, { x: 336, y: 17 }, { x: 352, y: 22 }, { x: 362, y: 12 }], 2.4, INK);
  fillShape(ctx, [{ x: 346, y: 14 }, { x: 356, y: 30 }, { x: 362, y: 12 }], '#d8d0c3');
  ink(pen, head, w);
  // Its eye.
  const e = { x: 306, y: -26 };
  if (p.eye === 'happy') {
    pen.stroke([{ x: e.x - 11, y: e.y + 2 }, { x: e.x, y: e.y - 6 }, { x: e.x + 11, y: e.y + 2 }], 3, INK);
    pen.dot(e.x + 2, e.y + 12, 6, '#d98f98', 0.35);
  } else {
    const big = p.eye === 'wide' ? 1.45 : 1;
    pen.dot(e.x, e.y, 13 * big, '#7d5f66', 1);
    pen.dot(e.x, e.y, 9.5 * big, '#06080b', 1);
    pen.dot(e.x - 3, e.y - 3, 2.6 * big, '#fff8ec', 1);
    if (p.eye !== 'wide') pen.stroke([{ x: e.x - 14, y: e.y - 4 }, { x: e.x, y: e.y - 10 }, { x: e.x + 13, y: e.y - 5 }], 2.4, INK);
  }
}

/** A point of the turtle's frame on screen (for the cutaway shrinking into its throat). */
export function turtleToScreen(p: TurtlePose, q: Pt): Pt {
  const c = Math.cos(p.tilt);
  const s = Math.sin(p.tilt);
  const x = q.x * p.scale * p.turn;
  const y = q.y * p.scale;
  return { x: p.x + x * c - y * s, y: p.y + x * s + y * c };
}

/** Its throat (where the cutaway sits) and its mouth (where the jellyfish go), in its frame. */
export const THROAT: Pt = { x: 225, y: 8 };
export const MOUTH: Pt = { x: 360, y: 20 };
