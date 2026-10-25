import { INK, Pen, type Pt } from '../../../src/art/pen';
import { createRng } from '../../../src/logic/rng';
import { drawExclaim } from '../effects';
import { VIDEO } from '../short';
import { drawHole } from './hull';
import { cycles, type SubPose } from './story';

/**
 * A grey naval harbour, painted: an overcast sky over the paper, a base on
 * the far shore (sheds, cranes, another submarine tied up), the grey-green
 * harbour water, a submarine surfacing bow up with round bites in its black
 * rubber dome, and three sailors on the pier pointing at them. Screen px.
 */

const HORIZON = 700;
/** Where the sea meets the submarine's hull (it floats at this level). */
export const WATERLINE = 930;
const PIER_TOP = 1012;
const PIER_RIGHT = 350;

const SKY_TOP = 'rgba(120,132,140,0.55)';
const SKY_LOW = 'rgba(190,190,182,0.35)';
const SEA_FAR = 'rgba(92,108,108,0.9)';
const SEA_NEAR = 'rgba(30,44,46,0.96)';
const NAVY = '#1f2a44';
const NAVY_DARK = '#121a2c';
const SKIN = '#d9b48f';
const WHITE = '#f1ede4';
const STEEL = '#2e3735';
const RUBBER = '#141a1e';

const range = (n: number, f: (u: number) => Pt): Pt[] => Array.from({ length: n + 1 }, (_, i) => f(i / n));

function pathOf(ctx: CanvasRenderingContext2D, pts: readonly Pt[]): void {
  ctx.beginPath();
  pts.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
  ctx.closePath();
}

// ---------------------------------------------------------------- sky, shore, sea

const CLOUDS = (() => {
  const rng = createRng(1970);
  return Array.from({ length: 16 }, () => ({ x: rng() * VIDEO.width, y: 290 + rng() * 330, rx: 120 + rng() * 220, ry: 30 + rng() * 50, a: 0.1 + rng() * 0.16 }));
})();

export function drawSkyAndShore(ctx: CanvasRenderingContext2D, paper: HTMLCanvasElement, boil: number, t: number): void {
  const pen = new Pen(ctx, 3301 + boil * 97, 1.2);
  ctx.drawImage(paper, 0, 0);
  const sky = ctx.createLinearGradient(0, 0, 0, HORIZON);
  sky.addColorStop(0, SKY_TOP);
  sky.addColorStop(1, SKY_LOW);
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, VIDEO.width, HORIZON);
  // Low grey cloud, drifting a little.
  for (const c of CLOUDS) {
    const x = c.x + 20 * Math.sin(cycles(1, t) + c.y);
    const g = ctx.createRadialGradient(x, c.y, 0, x, c.y, c.rx);
    g.addColorStop(0, `rgba(70,78,86,${c.a.toFixed(3)})`);
    g.addColorStop(1, 'rgba(70,78,86,0)');
    ctx.save();
    ctx.translate(x, c.y);
    ctx.scale(1, c.ry / c.rx);
    ctx.translate(-x, -c.y);
    ctx.fillStyle = g;
    ctx.fillRect(x - c.rx, c.y - c.rx, 2 * c.rx, 2 * c.rx);
    ctx.restore();
  }
  // The base on the far shore: sheds, two cranes, a water tower.
  const shore = [
    { x: -20, y: HORIZON }, { x: -20, y: HORIZON - 30 }, { x: 120, y: HORIZON - 34 }, { x: 120, y: HORIZON - 70 }, { x: 300, y: HORIZON - 70 }, { x: 300, y: HORIZON - 40 },
    { x: 470, y: HORIZON - 44 }, { x: 470, y: HORIZON - 88 }, { x: 640, y: HORIZON - 96 }, { x: 640, y: HORIZON - 40 }, { x: 1100, y: HORIZON - 34 }, { x: 1100, y: HORIZON },
  ];
  pen.fill(shore, '#5d6668', 0.55);
  pen.stroke(shore.slice(1, -1), 2.2, INK, 0.6, false);
  for (const cx of [380, 760]) {
    pen.stroke([{ x: cx, y: HORIZON - 40 }, { x: cx, y: HORIZON - 210 }], 3, INK, 0.65, false);
    pen.stroke([{ x: cx - 30, y: HORIZON - 200 }, { x: cx + 160, y: HORIZON - 210 }], 3, INK, 0.65, false);
    pen.hair([{ x: cx + 140, y: HORIZON - 208 }, { x: cx + 140, y: HORIZON - 120 }], 1.4, INK, 0.6);
    for (let k = 0; k < 6; k++) pen.hair([{ x: cx - 8, y: HORIZON - 50 - k * 26 }, { x: cx + 8, y: HORIZON - 70 - k * 26 }], 1.4, INK, 0.5);
  }
  pen.fill([{ x: 920, y: HORIZON - 34 }, { x: 920, y: HORIZON - 120 }, { x: 960, y: HORIZON - 120 }, { x: 960, y: HORIZON - 34 }], '#5d6668', 0.6);
  pen.fill(range(12, (u) => ({ x: 940 + 46 * Math.cos(Math.PI * 2 * u), y: HORIZON - 140 + 26 * Math.sin(Math.PI * 2 * u) })), '#5d6668', 0.7);
  // The sea.
  const sea = ctx.createLinearGradient(0, HORIZON, 0, VIDEO.height);
  sea.addColorStop(0, SEA_FAR);
  sea.addColorStop(1, SEA_NEAR);
  ctx.fillStyle = sea;
  ctx.fillRect(0, HORIZON, VIDEO.width, VIDEO.height - HORIZON);
  pen.stroke([{ x: -10, y: HORIZON }, { x: VIDEO.width + 10, y: HORIZON }], 2.4, INK, 0.7, false);
  // Another submarine tied up across the harbour: a low dark hull and its sail.
  const far = [{ x: 640, y: HORIZON + 22 }, { x: 650, y: HORIZON + 8 }, { x: 760, y: HORIZON + 4 }, { x: 770, y: HORIZON - 34 }, { x: 812, y: HORIZON - 34 }, { x: 818, y: HORIZON + 4 }, { x: 1040, y: HORIZON + 6 }, { x: 1040, y: HORIZON + 22 }];
  pen.fill(far, '#1e2526', 0.85);
  pen.stroke([...far], 2, INK, 0.8, false);
  drawRipples(ctx, pen, t, HORIZON + 30, WATERLINE - 10, 0.35);
}

/** Inked ripples on the water between two heights, sliding with whole cycles a loop. */
function drawRipples(ctx: CanvasRenderingContext2D, pen: Pen, t: number, y0: number, y1: number, alpha: number): void {
  const rng = createRng(31);
  for (let i = 0; i < 26; i++) {
    const y = y0 + rng() * (y1 - y0);
    const depth = (y - HORIZON) / (VIDEO.height - HORIZON);
    const len = 40 + 120 * depth;
    const x = ((rng() * VIDEO.width + 30 * Math.sin(cycles(2, t) + i)) % (VIDEO.width + 100)) - 50;
    pen.hair(range(6, (u) => ({ x: x + u * len, y: y + Math.sin(u * Math.PI * 2 + i) * 3 })), 1.2 + 2 * depth, '#c9d2cc', alpha);
  }
}

// ---------------------------------------------------------------- the submarine

/** In the boat's own frame: nose at the origin, the stern towards +x, radius R. */
const R = 150;
const CAP_LEN = 175;
const HOLES = [
  { x: 64, y: -46, r: 21 },
  { x: 118, y: 48, r: 19 },
  { x: 44, y: 34, r: 15 },
  { x: 140, y: -8, r: 14 },
] as const;

/** The submarine, nose at its pose, rising bow up out of the water. */
export function drawHarbourSub(ctx: CanvasRenderingContext2D, pose: SubPose, boil: number): void {
  const pen = new Pen(ctx, 8807 + boil * 59, 1.2);
  ctx.save();
  ctx.translate(pose.nose.x, pose.nose.y);
  ctx.rotate(pose.tilt);
  const hull = [{ x: CAP_LEN - 4, y: -R }, { x: 2600, y: -R }, { x: 2600, y: R }, { x: CAP_LEN - 4, y: R }];
  const g = ctx.createLinearGradient(0, -R, 0, R);
  g.addColorStop(0, '#5a6662');
  g.addColorStop(0.25, STEEL);
  g.addColorStop(1, '#0a0e0e');
  ctx.save();
  pathOf(ctx, hull);
  ctx.fillStyle = g;
  ctx.fill();
  ctx.restore();
  for (let x = CAP_LEN + 150; x < 2000; x += 170) pen.hair([{ x, y: -R + 4 }, { x: x + 1, y: R - 4 }], 1.4, '#0a0f10', 0.6);
  for (let x = CAP_LEN + 70; x < 2000; x += 30) pen.dot(x, -R + 18, 4, '#030505', 0.9);
  pen.stroke([{ x: CAP_LEN, y: -R }, { x: 2600, y: -R }], 3, INK, 1, true);
  // The sail and its planes.
  const sail = [{ x: 470, y: -R + 4 }, { x: 492, y: -R - 120 }, { x: 520, y: -R - 150 }, { x: 640, y: -R - 150 }, { x: 664, y: -R - 130 }, { x: 700, y: -R + 4 }];
  pen.fill(sail, STEEL, 1);
  pen.stroke([...sail], 3, INK, 1, true);
  pen.fill([{ x: 500, y: -R - 92 }, { x: 512, y: -R - 100 }, { x: 600, y: -R - 96 }, { x: 610, y: -R - 88 }, { x: 512, y: -R - 84 }], STEEL, 1);
  pen.stroke([{ x: 500, y: -R - 92 }, { x: 512, y: -R - 100 }, { x: 600, y: -R - 96 }, { x: 610, y: -R - 88 }, { x: 512, y: -R - 84 }, { x: 500, y: -R - 92 }], 2, INK, 1, false);
  pen.stroke([{ x: 600, y: -R - 150 }, { x: 600, y: -R - 200 }], 5, INK, 1, false);
  // The rubber dome at the bow.
  const cap = range(30, (u) => {
    const a = -Math.PI / 2 - u * Math.PI;
    return { x: CAP_LEN + CAP_LEN * Math.cos(a), y: R * Math.sin(a) };
  });
  const dg = ctx.createRadialGradient(CAP_LEN * 0.55, -R * 0.55, 6, CAP_LEN * 0.8, 0, R * 1.3);
  dg.addColorStop(0, '#46525a');
  dg.addColorStop(0.4, RUBBER);
  dg.addColorStop(1, '#050708');
  ctx.save();
  pathOf(ctx, cap);
  ctx.fillStyle = dg;
  ctx.fill();
  ctx.restore();
  pen.stipple(cap, 120, () => 0.4, 1.4, '#5b6a72');
  pen.hair(cap.slice(3, 13).map((p) => ({ x: p.x + 8, y: p.y + 8 })), 5, 'rgba(220,234,236,0.6)', 0.4);
  pen.stroke([...cap], 3.2, INK, 1, true);
  for (let y = -R + 20; y < R - 10; y += 26) pen.dot(CAP_LEN + 2, y, 4, '#7a8780', 1);
  for (const h of HOLES) {
    const u = (h.x - CAP_LEN) / CAP_LEN;
    const v = h.y / R;
    const nz = Math.sqrt(Math.max(0.05, 1 - u * u - v * v));
    drawHole(ctx, pen, h, h.r, Math.atan2(v / R, u / CAP_LEN), Math.min(1, nz * 1.15), 2);
  }
  ctx.restore();
}

/** The sea over the submerged part of the hull, foam where it meets the hull, and spray as the bow bursts out. */
export function drawNearWater(ctx: CanvasRenderingContext2D, pose: SubPose, burst: number, boil: number, t: number): void {
  const pen = new Pen(ctx, 4407 + boil * 131, 1.2);
  const g = ctx.createLinearGradient(0, WATERLINE - 6, 0, WATERLINE + 30);
  g.addColorStop(0, 'rgba(58,74,74,0)');
  g.addColorStop(0.3, 'rgba(58,74,74,0.8)');
  g.addColorStop(1, 'rgba(32,46,48,0.88)');
  ctx.fillStyle = g;
  ctx.fillRect(0, WATERLINE - 6, VIDEO.width, VIDEO.height - WATERLINE + 6);
  drawRipples(ctx, pen, t, WATERLINE + 20, 1300, 0.4);
  // Where the hull cuts the water: from the bow back along the boat.
  const dir = { x: Math.cos(pose.tilt), y: Math.sin(pose.tilt) };
  const along = (WATERLINE - pose.nose.y) / Math.max(0.05, dir.y);
  const at = { x: pose.nose.x + dir.x * along, y: WATERLINE };
  const foam = range(14, (u) => ({ x: at.x - 120 + u * 640, y: WATERLINE + 2 + 5 * Math.sin(u * 14 + cycles(5, t)) }));
  pen.stroke(foam, 5, '#eef0ea', 0.8, false);
  pen.hair(foam.map((p) => ({ x: p.x + 20, y: p.y + 10 })), 3, '#eef0ea', 0.5);
  // Spray thrown up as the bow bursts out.
  if (burst > 0 && burst < 1) {
    const rng = createRng(1974);
    ctx.save();
    ctx.fillStyle = '#f4f2ea';
    for (let i = 0; i < 46; i++) {
      const a = -Math.PI / 2 + (rng() - 0.5) * 2.4;
      const v = 380 + rng() * 520;
      const x = at.x + (rng() - 0.5) * 220 + Math.cos(a) * v * burst;
      const y = WATERLINE + Math.sin(a) * v * burst + 700 * burst * burst;
      ctx.globalAlpha = 0.85 * (1 - burst);
      ctx.beginPath();
      ctx.arc(x, y, 4 + rng() * 9, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
}

// ---------------------------------------------------------------- the pier and the sailors

export function drawPier(ctx: CanvasRenderingContext2D, boil: number): void {
  const pen = new Pen(ctx, 5503 + boil * 41, 1.2);
  for (const x of [30, 150, 270]) {
    const post = [{ x, y: PIER_TOP + 30 }, { x: x + 34, y: PIER_TOP + 30 }, { x: x + 34, y: 1320 }, { x, y: 1320 }];
    pen.fill(post, '#3b2f26', 1);
    pen.stroke([...post], 2.4, INK, 1, false);
  }
  const deck = [{ x: -30, y: PIER_TOP }, { x: PIER_RIGHT, y: PIER_TOP + 4 }, { x: PIER_RIGHT + 6, y: PIER_TOP + 40 }, { x: -30, y: PIER_TOP + 40 }];
  pen.fill(deck, '#5a4a3c', 1);
  pen.hatch(deck, 10, 0.2, 1, { color: '#2a2018', alpha: 0.45 });
  pen.stroke([...deck, deck[0]!], 3, INK, 1, true);
  // A bollard with a rope.
  pen.fill(range(10, (u) => ({ x: 318 + 16 * Math.cos(Math.PI * 2 * u), y: PIER_TOP - 18 + 18 * Math.sin(Math.PI * 2 * u) })), '#222', 1);
}

/** A sailor on the pier: navy jumper and bell-bottoms, a white cap, one arm pointing up at the bow (`point` 0 .. 1). */
export function drawSailor(ctx: CanvasRenderingContext2D, x: number, h: number, point: number, seed: number, boil: number, t: number): void {
  const pen = new Pen(ctx, seed * 71 + boil * 13, 1);
  const k = h / 180;
  const jitter = 2 * Math.sin(cycles(23, t) + seed);
  const y = PIER_TOP + 2;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(k, k);
  ctx.translate(0, jitter * 0.3);
  // Legs (bell-bottoms).
  for (const s of [-1, 1]) {
    const leg = [{ x: s * 4, y: -86 }, { x: s * 20, y: -86 }, { x: s * 24, y: 0 }, { x: s * 2, y: 0 }];
    pen.fill(leg, NAVY_DARK, 1);
    pen.stroke([...leg, leg[0]!], 2.2, INK, 1, false);
  }
  // Torso: rounded shoulders, washed lighter on the side towards the light, hatched on the other.
  const body = [
    { x: -20, y: -154 }, { x: 20, y: -154 }, { x: 28, y: -146 }, { x: 31, y: -120 }, { x: 32, y: -84 }, { x: -32, y: -84 }, { x: -31, y: -120 }, { x: -28, y: -146 },
  ];
  const wash = ctx.createLinearGradient(-32, 0, 32, 0);
  wash.addColorStop(0, '#2c3a5c');
  wash.addColorStop(0.6, NAVY);
  wash.addColorStop(1, NAVY_DARK);
  ctx.save();
  pathOf(ctx, body);
  ctx.fillStyle = wash;
  ctx.fill();
  ctx.restore();
  pen.clipped(body, () => pen.hatch([{ x: 8, y: -160 }, { x: 40, y: -160 }, { x: 40, y: -80 }, { x: 8, y: -80 }], 6, 1.2, 1, { color: '#05070d', alpha: 0.45 }));
  pen.stroke([...body, body[0]!], 2.4, INK, 1, true);
  // The square sailor's collar with its white stripes, and the black neckerchief.
  pen.stroke([{ x: -22, y: -150 }, { x: 0, y: -122 }, { x: 22, y: -150 }], 3.4, WHITE, 0.9, false);
  pen.stroke([{ x: -18, y: -146 }, { x: 0, y: -126 }, { x: 18, y: -146 }], 1.6, WHITE, 0.7, false);
  pen.fill([{ x: -6, y: -126 }, { x: 6, y: -126 }, { x: 3, y: -108 }, { x: -3, y: -108 }], '#0a0a0e', 1);
  // The resting arm, and the pointing arm swinging up to the bow.
  pen.stroke([{ x: -26, y: -144 }, { x: -36, y: -112 }, { x: -32, y: -90 }], 9, NAVY, 1, false);
  const a = -0.15 - 0.5 * point;
  const elbow = { x: 26 + 30 * Math.cos(a), y: -144 + 30 * Math.sin(a) };
  const hand = { x: elbow.x + 34 * Math.cos(a - 0.1), y: elbow.y + 34 * Math.sin(a - 0.1) };
  pen.stroke([{ x: 24, y: -144 }, elbow, hand], 9, NAVY, 1, false);
  pen.dot(hand.x, hand.y, 6, SKIN, 1);
  pen.stroke([hand, { x: hand.x + 14 * Math.cos(a), y: hand.y + 14 * Math.sin(a) }], 3, SKIN, 1, false);
  // Head, wide eyes, mouth open in an "o".
  const face = ctx.createRadialGradient(-6, -184, 2, 0, -176, 26);
  face.addColorStop(0, '#ecd0ae');
  face.addColorStop(1, '#bf9470');
  ctx.save();
  pathOf(ctx, range(14, (u) => ({ x: 22 * Math.cos(Math.PI * 2 * u), y: -176 + 24 * Math.sin(Math.PI * 2 * u) })));
  ctx.fillStyle = face;
  ctx.fill();
  ctx.restore();
  pen.dot(-10, -168, 5, '#d98c7a', 0.35);
  pen.stroke(range(14, (u) => ({ x: 22 * Math.cos(Math.PI * 2 * u), y: -176 + 24 * Math.sin(Math.PI * 2 * u) })), 2.2, INK, 1, false);
  for (const s of [-1, 1]) {
    pen.dot(4 + s * 8, -178, 3.6, '#fff', 1);
    pen.dot(5 + s * 8, -178, 2, INK, 1);
    pen.stroke([{ x: 4 + s * 8 - 5, y: -190 - s }, { x: 4 + s * 8 + 5, y: -191 + s }], 1.8, INK, 1, false);
  }
  pen.fill(range(10, (u) => ({ x: 8 + 5 * Math.cos(Math.PI * 2 * u), y: -164 + 6 * Math.sin(Math.PI * 2 * u) })), '#3a1a16', 1);
  // The white Dixie cup cap.
  const cap = [{ x: -22, y: -196 }, { x: -16, y: -214 }, { x: 16, y: -214 }, { x: 22, y: -196 }];
  pen.fill(cap, WHITE, 1);
  pen.stroke([...cap], 2, INK, 1, false);
  pen.stroke([{ x: -26, y: -196 }, { x: 26, y: -196 }], 3, INK, 1, false);
  ctx.restore();
}

/** The sailors' "!", above their heads. */
export function drawAlarmMarks(ctx: CanvasRenderingContext2D, sailors: readonly { readonly x: number; readonly h: number }[], pop: number): void {
  if (pop <= 0) return;
  sailors.forEach((s, i) => drawExclaim(ctx, s.x + 6, PIER_TOP - s.h * 1.38, 64 * pop, (i - 1) * 0.18));
}
