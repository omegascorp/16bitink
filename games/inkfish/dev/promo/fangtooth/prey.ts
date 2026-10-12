/**
 * The shrimp that drifts past the fangtooth's face: a little pale crustacean
 * with long feelers, swimming in small flicks. Drawn on screen at (x, y),
 * `length` px long, heading `angle` (radians, 0 right).
 */
const SHELL = '#f2cbbf';
const LINE = '#dcd6e6';
const INK = '#2a1a18';

export function drawShrimp(ctx: CanvasRenderingContext2D, x: number, y: number, length: number, angle: number, flick: number): void {
  if (length < 2) return;
  // A flick of the tail every so often: a quick curl and spread.
  const curl = Math.max(0, Math.sin(flick)) ** 6;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.scale(length, length);
  const w = 1 / length;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  // Its own faint glow, so it reads in the dark.
  const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, 0.9);
  glow.addColorStop(0, 'rgba(255,214,200,0.22)');
  glow.addColorStop(1, 'rgba(255,214,200,0)');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(0, 0, 0.9, 0, Math.PI * 2);
  ctx.fill();
  // Long feelers, reaching forward and arcing out.
  ctx.strokeStyle = LINE;
  ctx.lineWidth = 1.6 * w;
  for (const side of [-1, 1]) {
    const sway = 0.06 * Math.sin(flick * 0.5 + side);
    ctx.beginPath();
    ctx.moveTo(0.44, -0.05);
    ctx.bezierCurveTo(0.75, -0.08 + side * 0.04, 1.0, side * 0.2 + sway, 1.15, side * 0.42 + sway);
    ctx.stroke();
  }
  // Legs under the body.
  ctx.lineWidth = 1.2 * w;
  for (let i = 0; i < 5; i++) {
    const lx = 0.22 - i * 0.12;
    const swing = 0.05 * Math.sin(flick * 2 + i);
    ctx.beginPath();
    ctx.moveTo(lx, 0.06);
    ctx.lineTo(lx - 0.05 + swing, 0.2);
    ctx.stroke();
  }
  // The body: a curved shell of segments, head forward (+x), tail back, curling down on a flick.
  const bend = 0.18 + 0.35 * curl;
  ctx.beginPath();
  ctx.moveTo(0.48, 0);
  ctx.bezierCurveTo(0.42, -0.13, 0.1, -0.15, -0.15, -0.1);
  ctx.bezierCurveTo(-0.32, -0.06, -0.42, bend * 0.3, -0.45, bend);
  ctx.lineTo(-0.38, bend + 0.02);
  ctx.bezierCurveTo(-0.32, bend * 0.4, -0.2, 0.05, 0.0, 0.06);
  ctx.bezierCurveTo(0.2, 0.07, 0.4, 0.06, 0.48, 0);
  ctx.closePath();
  ctx.fillStyle = SHELL;
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1.6 * w;
  ctx.stroke();
  // Segment lines.
  ctx.lineWidth = 1 * w;
  for (let i = 0; i < 4; i++) {
    const sx = 0.08 - i * 0.1;
    ctx.beginPath();
    ctx.moveTo(sx, -0.12 + i * 0.01);
    ctx.lineTo(sx - 0.03, 0.06);
    ctx.stroke();
  }
  // Tail fan.
  ctx.beginPath();
  ctx.moveTo(-0.42, bend);
  ctx.lineTo(-0.58 - 0.08 * curl, bend + 0.1);
  ctx.lineTo(-0.5, bend + 0.04);
  ctx.lineTo(-0.56, bend - 0.06 + 0.1 * curl);
  ctx.closePath();
  ctx.fillStyle = SHELL;
  ctx.fill();
  ctx.stroke();
  // A black eye.
  ctx.fillStyle = INK;
  ctx.beginPath();
  ctx.arc(0.36, -0.06, 0.035, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}
