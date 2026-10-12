import { halo } from '../../../src/art/glowArt';
import { Pen } from '../../../src/art/pen';
import { createRng } from '../../../src/logic/rng';
import { clamp01, smooth, VIDEO } from '../short';
import { groundAt } from './rock';
import { type Pt, pt } from './shape';
import { blastAt, IMPACT_AT, LOOP_S, meteorAt } from './story';

/**
 * Above the rock, 66 million years ago: a dusky sky over a ridge where a
 * Tyrannosaurus faces a Triceratops and a titanosaur browses, a pterosaur
 * overhead. A meteor streaks down beyond the far hills, the sky flares, and
 * a wall of dust sweeps across the ridge, taking the dinosaurs with it.
 * World coordinates (the stone world's), seen from camera height camY.
 */
const W = VIDEO.width;
const SIL = '#0c0910';
const RIM = '#c8774f';
/** Where the meteor comes from and where it strikes (world), beyond the far hills on the right. */
const METEOR_FROM = pt(-120, -1080);
export const IMPACT = pt(930, -265);

const poly = (xs: readonly number[]): Pt[] => {
  const out: Pt[] = [];
  for (let i = 0; i < xs.length; i += 2) out.push(pt(xs[i]!, xs[i + 1]!));
  return out;
};

/** Silhouettes facing right, feet at y 0. */
const TREX = poly([
  -165, -116, -120, -128, -80, -140, -40, -152, 0, -160, 40, -158, 72, -150, 96, -152, 112, -168, 140, -172, 172, -164, 190, -150, 188, -138, 160, -133,
  180, -126, 177, -117, 140, -113, 118, -110, 100, -100, 90, -88, 97, -80, 104, -71, 97, -68, 86, -76, 70, -70, 56, -60, 44, -48, 40, -30, 46, -12, 64, -5,
  66, 0, 22, 0, 22, -8, 16, -24, 8, -40, -6, -50, -14, -40, -8, -20, 2, -6, 12, -2, 12, 0, -26, 0, -26, -10, -34, -30, -36, -56, -46, -80, -70, -100,
  -110, -110,
]);
const TRIKE = poly([
  -125, -48, -80, -78, -30, -98, 20, -98, 48, -100, 62, -142, 84, -150, 104, -132, 108, -118, 152, -132, 120, -104, 134, -82, 152, -96, 154, -70, 140, -57,
  118, -58, 96, -54, 82, -44, 84, -20, 88, 0, 66, 0, 62, -24, 20, -36, -18, -32, -16, 0, -42, 0, -46, -30, -72, -40,
]);
const TITAN = poly([
  -210, -58, -140, -100, -60, -150, 40, -162, 82, -172, 120, -232, 150, -292, 172, -322, 200, -324, 210, -312, 192, -303, 166, -298, 140, -242, 114, -182,
  102, -132, 100, -62, 104, 0, 76, 0, 72, -70, 20, -82, -40, -82, -52, -62, -48, 0, -76, 0, -82, -70, -112, -90, -152, -80,
]);
const CYCAD = poly([0, 0, -4, -40, -40, -60, -6, -48, -30, -86, 0, -54, 30, -88, 6, -48, 42, -60, 6, -40, 4, 0]);
const CONIFER = poly([0, 0, -6, -50, -40, -50, -10, -90, -32, -92, -6, -130, -24, -132, 0, -180, 24, -132, 6, -130, 32, -92, 10, -90, 40, -50, 6, -50, 6, 0]);

interface Figure {
  readonly shape: readonly Pt[];
  readonly x: number;
  readonly scale: number;
  readonly facing: 1 | -1;
  /** How it moves while it can: a slow sway (radians), a few times per loop. */
  readonly sway: number;
}

const FIGURES: readonly Figure[] = [
  { shape: CONIFER, x: 60, scale: 1.25, facing: 1, sway: 0.01 },
  { shape: TREX, x: 250, scale: 1.05, facing: 1, sway: 0.03 },
  { shape: TRIKE, x: 560, scale: 0.95, facing: -1, sway: 0.02 },
  { shape: CYCAD, x: 660, scale: 0.9, facing: 1, sway: 0.03 },
  { shape: TITAN, x: 860, scale: 0.92, facing: -1, sway: 0.02 },
  { shape: CYCAD, x: 1010, scale: 1.1, facing: -1, sway: 0.03 },
];

/** Far hills beyond the ridge: the meteor strikes behind them. */
const HILLS = Array.from({ length: 30 }, (_, k) => {
  const x = -30 + (k / 29) * (W + 60);
  return pt(x, -250 - 40 * Math.sin(x * 0.006 + 1) - 22 * Math.sin(x * 0.017) - 50 * Math.exp(-(((x - 420) / 140) ** 2)));
});

/** Billows of the dust wall, fixed. */
const BILLOWS = (() => {
  const rng = createRng(65);
  const out: { dx: number; up: number; r: number }[] = [];
  for (let c = 0; c < 20; c++) {
    for (let k = 0; k < 4; k++) {
      // The wall is taller behind its front, and its billows bigger.
      out.push({ dx: c * 72 + rng() * 40, up: 20 + k * 105 + Math.min(c, 4) * 30 + rng() * 30, r: 62 + rng() * 40 + k * 8 });
    }
  }
  return out.sort((a, b) => b.up - a.up);
})();

function drawShape(ctx: CanvasRenderingContext2D, f: Figure, x: number, y: number, tilt: number, alpha: number, boil: number, seed: number): void {
  if (alpha <= 0) return;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(x, y);
  ctx.rotate(tilt);
  ctx.scale(f.scale * f.facing, f.scale);
  const pen = new Pen(ctx, seed + boil * 977, 1.6);
  pen.fill(f.shape, SIL, 1);
  // The warm sky catching the top edges.
  pen.hair(f.shape.filter((p) => p.y < -20).map((p) => pt(p.x, p.y + 2)), 2, RIM, 0.35);
  pen.stroke([...f.shape, f.shape[0]!], 3, SIL, 1, false);
  ctx.restore();
}

/** The pterosaur: wings flapping a whole number of times per loop. */
function drawPterosaur(ctx: CanvasRenderingContext2D, x: number, y: number, t: number, alpha: number): void {
  const flap = Math.sin((2 * Math.PI * 21 * t) / LOOP_S);
  const tipY = -26 * flap;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = SIL;
  ctx.beginPath();
  ctx.moveTo(x - 80, y + tipY);
  ctx.quadraticCurveTo(x - 36, y - 10 + tipY * 0.4, x - 8, y);
  ctx.lineTo(x + 24, y - 8);
  ctx.lineTo(x + 40, y - 16);
  ctx.lineTo(x + 28, y - 4);
  ctx.lineTo(x + 8, y + 4);
  ctx.quadraticCurveTo(x + 36, y - 6 + tipY * 0.4, x + 80, y + tipY);
  ctx.quadraticCurveTo(x + 30, y + 10, x, y + 10);
  ctx.quadraticCurveTo(x - 30, y + 10, x - 80, y + tipY);
  ctx.fill();
  ctx.restore();
}

/** The sky, the far hills, the dinosaurs, the meteor and the blast, above the ground (drawn before the rock). */
export function drawLand(ctx: CanvasRenderingContext2D, t: number, camY: number, boil: number): void {
  const groundTop = -150 - 110 - camY;
  if (groundTop < 0) return;
  const flare = t < IMPACT_AT ? 0 : Math.exp(-(t - IMPACT_AT) * 2.2);
  const blast = blastAt(t);
  const sky = ctx.createLinearGradient(0, -1100 - camY, 0, -150 - camY);
  sky.addColorStop(0, '#120f22');
  sky.addColorStop(0.6, '#2b1d2e');
  sky.addColorStop(1, '#5a3326');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, groundTop + 140);
  // After the strike the sky burns orange, then fills with smoke.
  if (blast > 0) {
    ctx.save();
    ctx.globalAlpha = 0.55 * smooth(blast * 2);
    const burn = ctx.createLinearGradient(0, -1100 - camY, 0, -150 - camY);
    burn.addColorStop(0, '#2a1410');
    burn.addColorStop(1, '#b4502a');
    ctx.fillStyle = burn;
    ctx.fillRect(0, 0, W, groundTop + 140);
    ctx.restore();
  }
  // A few stars.
  const rng = createRng(9);
  ctx.fillStyle = '#e8e0d0';
  for (let k = 0; k < 40; k++) {
    const sx = rng() * W;
    const sy = -1100 + rng() * 650 - camY;
    ctx.globalAlpha = (0.25 + rng() * 0.4) * (1 - blast);
    ctx.fillRect(sx, sy, 2, 2);
  }
  ctx.globalAlpha = 1;
  drawMeteor(ctx, t, camY);
  // The flash of the strike, from behind the hills.
  if (flare > 0) {
    halo(ctx, IMPACT.x, IMPACT.y - camY, 900, '#ffd8a0', 0.9 * flare);
    halo(ctx, IMPACT.x, IMPACT.y - camY, 260, '#fff6e0', flare);
  }
  ctx.fillStyle = '#1d1420';
  ctx.beginPath();
  HILLS.forEach((p, k) => (k === 0 ? ctx.moveTo(p.x, p.y - camY) : ctx.lineTo(p.x, p.y - camY)));
  ctx.lineTo(W + 30, -100 - camY);
  ctx.lineTo(-30, -100 - camY);
  ctx.closePath();
  ctx.fill();
  drawPterosaur(ctx, 760 - 220 * ((t % LOOP_S) / LOOP_S) * 3, -720 - camY + 20 * Math.sin(t * 1.3), t, 1 - clamp01(blast * 3));
  // The dust wall: rolling in from the strike, right to left.
  const front = IMPACT.x + 200 - blast * 1500;
  FIGURES.forEach((f, k) => {
    const hit = clamp01((f.x + 120 - front) / 160);
    const y = groundAt(f.x) - camY + 4;
    const sway = f.sway * Math.sin((2 * Math.PI * 4 * t) / LOOP_S + k);
    drawShape(ctx, f, f.x - hit * 120, y, sway - hit * 0.6 * f.facing, 1 - hit, boil, 70 + k * 11);
  });
  if (blast > 0) drawDust(ctx, front, camY, blast);
}

function drawMeteor(ctx: CanvasRenderingContext2D, t: number, camY: number): void {
  const u = meteorAt(t);
  if (u <= 0 || u >= 1) return;
  const e = u * u;
  const head = pt(METEOR_FROM.x + (IMPACT.x - METEOR_FROM.x) * e, METEOR_FROM.y + (IMPACT.y - METEOR_FROM.y) * e - camY);
  const dir = pt(IMPACT.x - METEOR_FROM.x, IMPACT.y - METEOR_FROM.y);
  const len = Math.hypot(dir.x, dir.y);
  const back = pt(head.x - (dir.x / len) * 520 * Math.min(1, u * 3), head.y - (dir.y / len) * 520 * Math.min(1, u * 3));
  const trail = ctx.createLinearGradient(head.x, head.y, back.x, back.y);
  trail.addColorStop(0, 'rgba(255,246,220,1)');
  trail.addColorStop(0.2, 'rgba(255,190,110,0.8)');
  trail.addColorStop(1, 'rgba(255,120,60,0)');
  ctx.save();
  ctx.strokeStyle = trail;
  ctx.lineCap = 'round';
  ctx.lineWidth = 18;
  ctx.beginPath();
  ctx.moveTo(head.x, head.y);
  ctx.lineTo(back.x, back.y);
  ctx.stroke();
  ctx.restore();
  halo(ctx, head.x, head.y, 120, '#ffe2b0', 0.9);
  halo(ctx, head.x, head.y, 30, '#ffffff', 1);
}

function drawDust(ctx: CanvasRenderingContext2D, front: number, camY: number, blast: number): void {
  ctx.save();
  const pen = new Pen(ctx, 77, 2);
  for (const b of BILLOWS) {
    const x = front + b.dx;
    if (x - b.r > W + 40) continue;
    const y = groundAt(Math.max(0, Math.min(W, x))) - camY - b.up;
    const r = b.r * (0.85 + 0.3 * blast);
    ctx.globalAlpha = 1;
    ctx.fillStyle = b.up > 200 ? '#33241f' : '#3d2b25';
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
    pen.hair(Array.from({ length: 10 }, (_, k) => pt(x + Math.cos(Math.PI * 1.05 + k * 0.33) * r, y + Math.sin(Math.PI * 1.05 + k * 0.33) * r)), 2, '#d08a5c', 0.45);
  }
  ctx.restore();
}
