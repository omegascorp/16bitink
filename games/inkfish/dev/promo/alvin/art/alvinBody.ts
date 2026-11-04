import { blob, boiled, hash, type Pt, ink, lin, LINE, smoothClosed } from './draw';
import { stencil } from './stencil';

/**
 * Alvin's body, painted: the white fairing with its seams, bolts, scuffs and rust
 * streaks, curved light from above and a dark underside; the bare steel crew
 * sphere showing low at the front under the fairing's brow; the small sail with
 * its hatch ring.
 */

export const SEAM_X = 17;
/** The crew sphere's centre and radius. */
export const SPHERE: Pt & { readonly r: number } = { x: 37, y: 6, r: 16.4 };

const FAIRING: Pt[] = [
  { x: 53.6, y: -2.6 }, { x: 55, y: -8 }, { x: 50, y: -13.8 }, { x: 40, y: -16.8 }, { x: 20, y: -17.8 }, { x: 0, y: -18 }, { x: -25, y: -17.2 }, { x: -40, y: -14.6 }, { x: -49, y: -9.6 }, { x: -53.4, y: -3 },
  { x: -53.4, y: 3 }, { x: -49, y: 9.6 }, { x: -40, y: 14 }, { x: -25, y: 16.6 }, { x: 0, y: 17.4 }, { x: 13.6, y: 17 }, { x: 19.4, y: 14.4 }, { x: 21.4, y: 8 }, { x: 23.4, y: 0.4 }, { x: 28, y: -3.8 }, { x: 40, y: -4.6 }, { x: 50, y: -3.6 },
];
const SAIL: Pt[] = [{ x: -18, y: -16.4 }, { x: -15.6, y: -25 }, { x: -10, y: -28.4 }, { x: 8, y: -28.8 }, { x: 13, y: -25.4 }, { x: 16.4, y: -16.6 }];

/** A panel seam: a dark groove with a lit edge beside it, so it has thickness. */
function seam(ctx: CanvasRenderingContext2D, pts: readonly Pt[], lw: number, across: Pt): void {
  ink(ctx, pts, lw * 2.8, '#566575', 0.5);
  ink(ctx, pts, lw * 1, LINE, 0.85);
  ink(ctx, pts.map((p) => ({ x: p.x + across.x, y: p.y + across.y })), lw * 0.9, '#ffffff', 0.85);
}

function bolt(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, lw: number): void {
  ctx.fillStyle = 'rgba(40,52,64,0.55)';
  ctx.beginPath();
  ctx.arc(x + r * 0.3, y + r * 0.4, r * 1.15, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = lin(ctx, x - r, y - r, x + r, y + r, [[0, '#f5f8fa'], [1, '#7f8e9c']]);
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(18,20,28,0.6)';
  ctx.lineWidth = lw * 0.35;
  ctx.stroke();
}

/** Rust weeping from the fittings: hair-thin streaks running down the white, fading as they go. */
function rustStreaks(ctx: CanvasRenderingContext2D, lw: number): void {
  for (let i = 0; i < 30; i++) {
    const [x, y] = [-48 + hash(i + 40) * 66, -15 + hash(i + 70) * 22];
    const h = 2.5 + hash(i + 90) * 7;
    ctx.strokeStyle = lin(ctx, 0, y, 0, y + h, [[0, 'rgba(126,74,36,0.55)'], [1, 'rgba(126,74,36,0)']]);
    ctx.lineWidth = lw * (0.5 + hash(i + 11) * 0.8);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.quadraticCurveTo(x + 0.15, y + h * 0.5, x - 0.05, y + h);
    ctx.stroke();
  }
}

function scuffs(ctx: CanvasRenderingContext2D, lw: number): void {
  for (let i = 0; i < 34; i++) {
    const [x, y] = [-50 + hash(i + 3) * 100, -14 + hash(i + 200) * 28];
    const a = (hash(i + 8) - 0.5) * 0.7;
    const d = 1 + hash(i + 19) * 3.4;
    ink(ctx, [{ x, y }, { x: x + d, y: y + d * a }], lw * 0.5, i % 3 === 0 ? '#ffffff' : '#7f8b96', 0.4);
  }
}

function drawDetails(ctx: CanvasRenderingContext2D, lw: number): void {
  // A long seam along the shoulder of the fairing, the rings of panels across it.
  seam(ctx, [{ x: -50, y: -6 }, { x: -20, y: -10 }, { x: 18, y: -10.6 }, { x: 54, y: -9.6 }], lw, { x: 0, y: 0.34 });
  for (const [x, w] of [[SEAM_X, 1.3], [-20, 1], [-38, 1], [36, 0.7]] as const) {
    const pts: Pt[] = x > 30 ? [{ x: x - 0.4, y: -17.8 }, { x, y: -10.4 }, { x: x + 0.3, y: -4 }] : [{ x: x - 0.5, y: -18.2 }, { x, y: -6 }, { x: x + 0.4, y: 6 }, { x: x - 0.3, y: 18 }];
    seam(ctx, pts, lw * w, { x: 0.36, y: 0 });
  }
  for (let i = 0; i < 13; i++) {
    const x = -46 + i * 7.8;
    bolt(ctx, x + 2, -11.6 + Math.abs(x + 4) * 0.018, 0.42, lw);
    if (x < 14) bolt(ctx, x + 2, 12.4, 0.42, lw);
  }
  for (const seamX of [SEAM_X, -20, -38]) for (const y of [-15, -8, -1, 6, 13]) { bolt(ctx, seamX - 1.2, y, 0.42, lw); bolt(ctx, seamX + 1.5, y, 0.42, lw); }
  scuffs(ctx, lw);
  rustStreaks(ctx, lw);
  // Hatch plate and lifting eye on the flank.
  ctx.strokeStyle = 'rgba(40,52,64,0.6)';
  ctx.lineWidth = lw * 0.8;
  ctx.beginPath();
  ctx.roundRect(-14, -5, 22, 12, 1.4);
  ctx.stroke();
}

export interface HullLook {
  readonly lit: number;
  readonly beams: number;
  /** The name on the flank, 0 .. 1 (none in frame 1, which has no writing). */
  readonly name: number;
}

export function drawFairing(ctx: CanvasRenderingContext2D, look: HullLook, boil: number, lw: number): void {
  const outline = boiled(FAIRING, boil, 0.05, 11);
  smoothClosed(ctx, outline);
  ctx.fillStyle = lin(ctx, 0, -18, 0, 17.6, [[0, '#ffffff'], [0.2, '#fbfdfe'], [0.5, '#dbe5ec'], [0.74, '#9fb2c2'], [1, '#55697d']]);
  ctx.fill();
  ctx.save();
  ctx.clip();
  // Curved form: a long soft highlight up top, the shoulder turning away, shade at the two ends.
  blob(ctx, 14, -13.5, 44, 3.6, 0, '255,255,255', 0.95);
  blob(ctx, -2, 14, 62, 7, 0, '38,62,88', 0.6);
  blob(ctx, -50, 0, 16, 26, 0, '60,84,108', 0.6);
  blob(ctx, 56, -9, 11, 16, 0, '84,108,130', 0.5);
  blob(ctx, -2, -15.5, 30, 3.4, 0, '60,80,100', 0.28);
  drawDetails(ctx, lw);
  stencil(ctx, 'ALVIN', -3, -5.5, 9.4, '#233a56', look.name);
  // Cool dark water over the hull when it isn't lit.
  const dim = 1 - look.lit;
  if (dim > 0.01) {
    ctx.fillStyle = `rgba(8,26,56,${0.74 * dim})`;
    ctx.fillRect(-60, -30, 130, 60);
  }
  blob(ctx, 40, -8, 22, 10, 0, '255,244,200', 0.4 * look.beams);
  ctx.restore();
  ink(ctx, outline, lw * 1.1, LINE, 1, true);
}

export function drawSail(ctx: CanvasRenderingContext2D, look: HullLook, lw: number): void {
  // Its shadow on the fairing, and the ladder of grab rails behind.
  blob(ctx, 2, -15.6, 25, 3, 0, '30,48,70', 0.55);
  smoothClosed(ctx, SAIL);
  ctx.fillStyle = lin(ctx, -18, 0, 16, 0, [[0, '#b7c6d2'], [0.32, '#fdfeff'], [0.7, '#e6edf2'], [1, '#93a7b7']]);
  ctx.fill();
  ctx.save();
  ctx.clip();
  ctx.fillStyle = lin(ctx, 0, -29, 0, -16, [[0, 'rgba(255,255,255,0)'], [1, 'rgba(50,72,96,0.5)']]);
  ctx.fillRect(-20, -30, 40, 15);
  ink(ctx, [{ x: -16, y: -21.6 }, { x: 15, y: -21.6 }], lw * 0.8, '#59697a', 0.8);
  if (look.lit < 1) {
    ctx.fillStyle = `rgba(8,26,56,${0.7 * (1 - look.lit)})`;
    ctx.fillRect(-20, -30, 40, 15);
  }
  ctx.restore();
  ink(ctx, SAIL, lw * 1.1, LINE, 1, true);
  // The hatch ring on top: a heavy collar and a domed lid.
  ctx.fillStyle = lin(ctx, 0, -31, 0, -27.6, [[0, '#d6dfe6'], [1, '#6c7d8c']]);
  ctx.beginPath();
  ctx.ellipse(-1, -28.7, 7, 1.9, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = LINE;
  ctx.lineWidth = lw * 0.9;
  ctx.stroke();
  ctx.fillStyle = lin(ctx, 0, -31.8, 0, -29, [[0, '#ffffff'], [1, '#a9b8c4']]);
  ctx.beginPath();
  ctx.ellipse(-1, -29.8, 4.8, 1.8, 0, Math.PI, 0);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // A short aerial, a red marker lamp on it.
  ink(ctx, [{ x: 9.5, y: -27.6 }, { x: 11.2, y: -37 }], lw * 0.9, '#3d4650');
  ctx.fillStyle = '#d33a2a';
  ctx.beginPath();
  ctx.arc(11.3, -37.4, 0.8, 0, Math.PI * 2);
  ctx.fill();
}

/** The crew sphere: bare steel under the fairing's brow, its shadow across the top. */
export function drawSphere(ctx: CanvasRenderingContext2D, look: HullLook, lw: number): void {
  const { x, y, r } = SPHERE;
  const g = ctx.createRadialGradient(x - r * 0.1, y + r * 0.1, r * 0.1, x, y, r);
  g.addColorStop(0, '#aeb9c2');
  g.addColorStop(0.62, '#7f8d9a');
  g.addColorStop(0.9, '#46535f');
  g.addColorStop(1, '#262f39');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.save();
  ctx.clip();
  blob(ctx, x, y - 12, 26, 8, 0, '12,20,30', 0.85);
  blob(ctx, x + 2, y + 15, 14, 3, 0, '200,216,228', 0.35);
  for (let i = 0; i < 18; i++) {
    const [px, py] = [x - r + hash(i + 300) * r * 2, y - 4 + hash(i + 340) * 20];
    ctx.fillStyle = lin(ctx, 0, py, 0, py + 4, [[0, 'rgba(120,66,32,0.42)'], [1, 'rgba(120,66,32,0)']]);
    ctx.fillRect(px, py, 0.5, 4);
  }
  ink(ctx, [{ x: x - r, y: y + 11.6 }, { x, y: y + 12.6 }, { x: x + r, y: y + 11.6 }], lw * 0.8, '#262f39', 0.7);
  for (let i = 0; i < 11; i++) {
    const a = 0.2 + (i / 10) * (Math.PI - 0.4);
    bolt(ctx, x + Math.cos(a) * (r - 2), y + 0.3 + Math.sin(a) * (r - 2), 0.42, lw);
  }
  if (look.lit < 1) {
    ctx.fillStyle = `rgba(8,26,56,${0.6 * (1 - look.lit)})`;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }
  ctx.restore();
  ctx.strokeStyle = LINE;
  ctx.lineWidth = lw * 1.1;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.stroke();
}
