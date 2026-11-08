import { along, blob, hash, type Pt, ink, lin, LINE, smoothClosed } from './draw';

/** Alvin's working parts, as real objects: the tube frame, sample basket, arm, lamps, side thruster, stern propeller and rudder. */

/** A tube: an ink edge, a body colour and a lit top. */
function tube(ctx: CanvasRenderingContext2D, pts: readonly Pt[], w: number, body: string, lit: string, lw: number): void {
  ink(ctx, pts, w + lw * 1.5, LINE);
  ink(ctx, pts, w, body);
  ink(ctx, pts.map((p) => ({ x: p.x, y: p.y - w * 0.2 })), w * 0.3, lit, 0.75);
}

export function drawFrame(ctx: CanvasRenderingContext2D, lw: number): void {
  for (const x of [-36, -14, 8]) tube(ctx, [{ x, y: 15 }, { x: x - 1.5, y: 21.4 }], 1.4, '#6d7985', '#b6c2cc', lw);
  tube(ctx, along({ x: -42, y: 21 }, { x: 24, y: 21.6 }, 4), 1.7, '#59646f', '#aab7c2', lw);
}

/** The sample basket, a wire tray hung at the nose, with a few stones in it. */
export function drawBasket(ctx: CanvasRenderingContext2D, lw: number): void {
  ctx.fillStyle = 'rgba(16,26,38,0.55)';
  ctx.beginPath();
  ctx.roundRect(44, 20.5, 25, 6.4, 1);
  ctx.fill();
  ctx.fillStyle = '#2f3a44';
  for (let i = 0; i < 6; i++) {
    const [x, y, r] = [47 + i * 3.7, 24.4 + hash(i) * 1.2, 1.1 + hash(i + 3) * 0.9];
    ctx.beginPath();
    ctx.moveTo(x - r * 1.3, y + r);
    ctx.lineTo(x - r * 0.4, y - r);
    ctx.lineTo(x + r, y - r * 0.6);
    ctx.lineTo(x + r * 1.3, y + r);
    ctx.closePath();
    ctx.fill();
  }
  for (let i = 0; i <= 12; i++) ink(ctx, [{ x: 44 + i * 2.08, y: 20.5 }, { x: 44 + i * 2.08, y: 26.9 }], lw * 0.55, '#8a97a2', 0.9);
  for (const y of [22.6, 24.8]) ink(ctx, [{ x: 44, y }, { x: 69, y }], lw * 0.55, '#8a97a2', 0.9);
  ink(ctx, [{ x: 44, y: 20.5 }, { x: 69, y: 20.5 }, { x: 69, y: 26.9 }, { x: 44, y: 26.9 }, { x: 44, y: 20.5 }], lw * 1.1, '#b9c4cc');
  ink(ctx, [{ x: 44, y: 26.9 }, { x: 69, y: 26.9 }], lw * 0.8, LINE);
  tube(ctx, [{ x: 24, y: 21.6 }, { x: 36, y: 23.4 }, { x: 44, y: 23.6 }], 1.5, '#59646f', '#aab7c2', lw);
}

function joint(ctx: CanvasRenderingContext2D, at: Pt, r: number, lw: number): void {
  ctx.fillStyle = lin(ctx, at.x - r, at.y - r, at.x + r, at.y + r, [[0, '#8d97a1'], [1, '#2e353d']]);
  ctx.beginPath();
  ctx.arc(at.x, at.y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = LINE;
  ctx.lineWidth = lw * 0.8;
  ctx.stroke();
  ctx.fillStyle = '#1b2026';
  ctx.beginPath();
  ctx.arc(at.x, at.y, r * 0.35, 0, Math.PI * 2);
  ctx.fill();
}

/** The mechanical arm, folded forward over the basket, its claw ready. */
export function drawArm(ctx: CanvasRenderingContext2D, lw: number): void {
  const [shoulder, elbow, wrist] = [{ x: 49, y: 14 }, { x: 60, y: 8.5 }, { x: 66.5, y: 15.5 }];
  tube(ctx, [shoulder, elbow], 2.5, '#d98a26', '#f7c56e', lw);
  tube(ctx, [elbow, wrist], 2, '#d98a26', '#f7c56e', lw);
  ink(ctx, [{ x: 51, y: 12 }, { x: 59, y: 6.8 }, { x: 65, y: 12 }], lw * 0.6, '#20262d', 0.9);
  tube(ctx, [wrist, { x: 67.5, y: 17.2 }], 1.4, '#59646f', '#aab7c2', lw);
  ink(ctx, [{ x: 67.5, y: 17 }, { x: 65.4, y: 18.6 }, { x: 65.8, y: 20.4 }], lw * 1.9, '#2e353d');
  ink(ctx, [{ x: 67.5, y: 17 }, { x: 69.8, y: 18.5 }, { x: 69.4, y: 20.4 }], lw * 1.9, '#2e353d');
  joint(ctx, shoulder, 2, lw);
  joint(ctx, elbow, 1.8, lw);
  joint(ctx, wrist, 1.4, lw);
}

/** A lamp in its housing, on a bracket, looking forward and down. */
export function drawLamp(ctx: CanvasRenderingContext2D, at: Pt, strength: number, lw: number): void {
  ctx.save();
  ctx.translate(at.x, at.y);
  ctx.rotate(0.3);
  ctx.scale(0.7, 0.7);
  ink(ctx, [{ x: -2.6, y: 2 }, { x: -3.4, y: 4.6 }], lw * 2.6, '#59646f');
  blob(ctx, 3.4, 0, 7 + 3 * strength, 6, 0, '255,244,200', 0.9 * strength);
  ctx.fillStyle = lin(ctx, 0, -2.4, 0, 2.4, [[0, '#7c8894'], [0.45, '#3d4650'], [1, '#191e24']]);
  ctx.beginPath();
  ctx.roundRect(-3.6, -2.3, 6.2, 4.6, 0.9);
  ctx.fill();
  ctx.strokeStyle = LINE;
  ctx.lineWidth = lw * 0.8;
  ctx.stroke();
  ctx.fillStyle = strength > 0.2 ? '#fffdf0' : '#8b97a2';
  ctx.beginPath();
  ctx.ellipse(2.7, 0, 0.95, 2.5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

/** The side thruster: a shrouded fan set into the flank. */
export function drawThruster(ctx: CanvasRenderingContext2D, at: Pt, spin: number, lw: number): void {
  ctx.fillStyle = lin(ctx, at.x, at.y - 5.5, at.x, at.y + 5.5, [[0, '#8d99a4'], [1, '#2d353e']]);
  ctx.beginPath();
  ctx.ellipse(at.x, at.y, 5, 5.5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = LINE;
  ctx.lineWidth = lw;
  ctx.stroke();
  ctx.fillStyle = '#10151b';
  ctx.beginPath();
  ctx.ellipse(at.x, at.y, 3.8, 4.3, 0, 0, Math.PI * 2);
  ctx.fill();
  for (let i = 0; i < 3; i++) {
    const a = spin + (i * Math.PI * 2) / 3;
    ink(ctx, [at, { x: at.x + 3.4 * Math.cos(a), y: at.y + 3.8 * Math.sin(a) }], lw * 1.5, '#7b8793');
  }
}

/** The stern: a rudder fin above and below, the propeller in its ring. */
export function drawStern(ctx: CanvasRenderingContext2D, spin: number, lw: number): void {
  const fin: Pt[] = [{ x: -49, y: -6 }, { x: -52, y: -12.6 }, { x: -58, y: -12.8 }, { x: -58, y: 0 }, { x: -58, y: 12 }, { x: -52, y: 12 }, { x: -49, y: 6 }];
  smoothClosed(ctx, fin);
  ctx.fillStyle = lin(ctx, 0, -13, 0, 12, [[0, '#8e9dab'], [0.6, '#5c6c7b'], [1, '#3a4856']]);
  ctx.fill();
  ink(ctx, fin, lw, LINE, 1, true);
  ctx.save();
  ctx.translate(-60.5, 0);
  tubeRing(ctx, lw);
  ctx.fillStyle = 'rgba(175,192,206,0.4)';
  ctx.beginPath();
  ctx.ellipse(0, 0, 1.3, 1.6 + 5.4 * Math.abs(Math.cos(spin * 3)), 0, 0, Math.PI * 2);
  ctx.fill();
  ink(ctx, [{ x: 7, y: 0 }, { x: 0, y: 0 }], lw * 2.4, '#59646f');
  ctx.restore();
}

function tubeRing(ctx: CanvasRenderingContext2D, lw: number): void {
  ctx.strokeStyle = LINE;
  ctx.lineWidth = lw * 4.4;
  ctx.beginPath();
  ctx.ellipse(0, 0, 2.2, 7.6, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = '#7f8c98';
  ctx.lineWidth = lw * 3;
  ctx.stroke();
}
