import { ellipse, INK, Pen, type Pt } from '../../../src/art/pen';
import { createRng } from '../../../src/logic/rng';

/**
 * A scuba diver hanging upright in the water over the bottle, seen from the
 * side: fins, legs and wetsuit, the tank on its back, an arm and glove, the
 * head out of frame above, its breath bubbling up. Feet-down, it kicks
 * slowly; it jerks up and away when the fringehead charges its fin.
 *
 * Local px: the hips at the origin, the feet down +y, the diver's front to -x.
 */

const SUIT = '#243040';
const SUIT_LIT = '#5b6e86';
const TANK = '#c9c3b2';
const FIN = '#2f7480';
const FIN_EDGE = '#f0c84a';

export interface DiverPose {
  /** The hips, screen px. */
  readonly x: number;
  readonly y: number;
  /** Lean, radians (positive: the feet swing left). */
  readonly lean: number;
  /** Kick phase (radians) and size. */
  readonly kick: number;
  readonly kickSize: number;
  /** Fins splayed in alarm, 0 .. 1. */
  readonly splay: number;
}

const rot = (p: Pt, a: number): Pt => ({ x: p.x * Math.cos(a) - p.y * Math.sin(a), y: p.x * Math.sin(a) + p.y * Math.cos(a) });
const add = (a: Pt, b: Pt): Pt => ({ x: a.x + b.x, y: a.y + b.y });

/** A tapered capsule round the segment a → b, half widths ra and rb. */
function capsule(a: Pt, b: Pt, ra: number, rb: number): Pt[] {
  const ang = Math.atan2(b.y - a.y, b.x - a.x);
  const pts: Pt[] = [];
  for (let i = 0; i <= 10; i++) {
    const t = Math.PI / 2 + (i / 10) * Math.PI;
    pts.push({ x: b.x + Math.cos(ang + t + Math.PI) * rb, y: b.y + Math.sin(ang + t + Math.PI) * rb });
  }
  for (let i = 0; i <= 10; i++) {
    const t = Math.PI / 2 + (i / 10) * Math.PI;
    pts.push({ x: a.x + Math.cos(ang + t) * ra, y: a.y + Math.sin(ang + t) * ra });
  }
  return pts;
}

/** The near fin's tip, screen px (so the fish can aim at it). */
export function finTip(p: DiverPose): Pt {
  return add({ x: p.x, y: p.y }, rot(legOf(p, 0).tip, p.lean));
}

function legOf(p: DiverPose, side: 0 | 1): { hip: Pt; knee: Pt; ankle: Pt; tip: Pt; blade: number } {
  const phase = p.kick + side * Math.PI;
  const swing = p.kickSize * Math.sin(phase);
  const hip = { x: side ? 18 : -14, y: 0 };
  const thigh = rot({ x: 0, y: 220 }, -0.12 + swing * 0.5);
  const knee = add(hip, thigh);
  const shin = rot({ x: 0, y: 215 }, -0.05 + swing * 0.9 + 0.25 * p.splay * (side ? 1 : -1));
  const ankle = add(knee, shin);
  const blade = Math.atan2(shin.y, shin.x) + 0.42 + swing * 0.6 + 0.3 * p.splay * (side ? 1 : -1);
  const tip = add(ankle, { x: Math.cos(blade) * 210, y: Math.sin(blade) * 210 });
  return { hip, knee, ankle, tip, blade };
}

function drawLeg(pen: Pen, p: DiverPose, side: 0 | 1): void {
  const { hip, knee, ankle, blade } = legOf(p, side);
  const dark = side === 1;
  // The fin: a long blade widening to the tip, ribbed, edged in yellow.
  const along = { x: Math.cos(blade), y: Math.sin(blade) };
  const across = { x: -along.y, y: along.x };
  const at = (u: number, w: number): Pt => ({ x: ankle.x + along.x * 210 * u + across.x * w, y: ankle.y + along.y * 210 * u + across.y * w });
  const fin = [at(-0.12, -26), at(0.35, -34), at(1, -50), at(1.04, 0), at(1, 50), at(0.35, 34), at(-0.12, 26)];
  pen.fill(fin, dark ? '#1f4c55' : FIN, 0.95);
  for (const w of [-22, 0, 22]) pen.hair([at(0.1, w * 0.6), at(0.95, w)], 1.4, '#0f2a30', 0.6);
  pen.stroke([at(1, -50), at(1.04, 0), at(1, 50)], 4, FIN_EDGE, dark ? 0.5 : 0.9, false);
  pen.stroke([...fin, fin[0]!], 2.2, INK, 1);
  // The leg.
  const thigh = capsule(hip, knee, 40, 33);
  const shin = capsule(knee, ankle, 33, 24);
  for (const part of [thigh, shin]) {
    pen.fill(part, dark ? '#161d28' : SUIT, 1);
    pen.stroke([...part, part[0]!], 2.2, INK, 1);
  }
  if (!dark) {
    pen.hair([add(hip, { x: -30, y: 30 }), add(knee, { x: -26, y: -8 })], 3, SUIT_LIT, 0.55);
    pen.hair([add(knee, { x: -24, y: 14 }), add(ankle, { x: -18, y: -16 })], 2.6, SUIT_LIT, 0.5);
  }
}

/** The diver at its pose, drawn with a fresh pen each boil frame. */
export function drawDiver(ctx: CanvasRenderingContext2D, p: DiverPose, boil: number): void {
  const pen = new Pen(ctx, 6100 + boil * 331, 1.1);
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.rotate(p.lean);
  drawLeg(pen, p, 1);
  // The tank on its back, the torso, the weight belt.
  const tank = [{ x: 58, y: -40 }, { x: 128, y: -48 }, { x: 132, y: -330 }, { x: 116, y: -352 }, { x: 74, y: -352 }, { x: 58, y: -330 }];
  pen.fill(tank, TANK, 1);
  pen.hatch(tank, 7, 1.57, 0.8, { color: '#6c6658', alpha: 0.35 });
  pen.fill([{ x: 112, y: -50 }, { x: 128, y: -48 }, { x: 132, y: -330 }, { x: 116, y: -350 }], '#7a7466', 0.5);
  pen.stroke([...tank, tank[0]!], 2.4, INK, 1);
  const torso = [{ x: -58, y: 10 }, { x: 62, y: 18 }, { x: 74, y: -160 }, { x: 70, y: -420 }, { x: -46, y: -420 }, { x: -64, y: -160 }];
  pen.fill(torso, SUIT, 1);
  pen.hair([{ x: -50, y: -10 }, { x: -56, y: -150 }, { x: -40, y: -400 }], 4, SUIT_LIT, 0.45);
  pen.stroke([...torso, torso[0]!], 2.4, INK, 1);
  pen.fill([{ x: -62, y: -20 }, { x: 66, y: -12 }, { x: 68, y: -46 }, { x: -64, y: -54 }], '#141414', 0.9);
  for (const x of [-30, 10, 44]) pen.fill([{ x: x - 12, y: -18 }, { x: x + 12, y: -16 }, { x: x + 12, y: -52 }, { x: x - 12, y: -54 }], '#8d8a80', 0.95);
  pen.fill([{ x: -6, y: -16 }, { x: 18, y: -14 }, { x: 18, y: -54 }, { x: -6, y: -56 }], '#c7a54a', 1);
  // The near arm, hanging forward, with a glove and a gauge on its hose.
  const shoulder = { x: -20, y: -390 };
  const elbow = { x: -70, y: -200 };
  const hand = { x: -86, y: -40 };
  const upper = capsule(shoulder, elbow, 34, 28);
  const lower = capsule(elbow, hand, 28, 22);
  for (const part of [upper, lower]) {
    pen.fill(part, SUIT, 1);
    pen.stroke([...part, part[0]!], 2.2, INK, 1);
  }
  pen.hair([add(shoulder, { x: -28, y: 30 }), add(elbow, { x: -26, y: -10 })], 3, SUIT_LIT, 0.5);
  const glove = ellipse(hand.x - 4, hand.y + 14, 22, 30, 16);
  pen.fill(glove, '#121212', 1);
  pen.stroke([...glove, glove[0]!], 2, INK, 1);
  pen.stroke([{ x: 70, y: -330 }, { x: 20, y: -300 }, { x: -40, y: -210 }, { x: -70, y: -120 }], 3.2, '#111', 0.9, false);
  const gauge = ellipse(-74, -112, 18, 18, 14);
  pen.fill(gauge, '#e8e4d6', 1);
  pen.stroke([...gauge, gauge[0]!], 2, INK, 1);
  pen.hair([{ x: -74, y: -112 }, { x: -64, y: -120 }], 1.6, '#b0302a', 1);
  drawLeg(pen, p, 0);
  ctx.restore();
}

// ---------------------------------------------------------------- breath

const BREATH = (() => {
  const rng = createRng(404);
  return Array.from({ length: 22 }, (_, i) => ({ phase: i / 22 + rng() * 0.02, dx: (rng() - 0.5) * 50, r: 5 + rng() * 9, wob: rng() * 6 }));
})();

/** The diver's breath bubbling up past the top of the frame from (x, y): `clock` in seconds; `burst` adds a gush. */
export function drawBreath(ctx: CanvasRenderingContext2D, x: number, y: number, clock: number, burst: number): void {
  ctx.save();
  ctx.strokeStyle = 'rgba(235,250,245,0.85)';
  ctx.fillStyle = 'rgba(235,250,245,0.18)';
  BREATH.forEach((b, i) => {
    const u = (b.phase + clock * 0.55) % 1;
    const bx = x + b.dx * (0.4 + u) + Math.sin(clock * 3 + b.wob) * 6;
    const by = y - u * 420;
    const r = b.r * (0.6 + 0.6 * u) * (1 + burst * (i % 3 === 0 ? 1.2 : 0.4));
    ctx.globalAlpha = Math.min(1, (1 - u) * 2);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(bx, by, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  });
  ctx.restore();
}
