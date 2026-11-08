import { INK, PAPER } from '../../../src/art/pen';

/**
 * Simple ink silhouettes for the cut-ins: a hand, a fish, a molar and a
 * fang, a stick person, a turtle's shell, a small car and an elephant. Each
 * is drawn about (x, y) at `s` px across.
 */

function inked(ctx: CanvasRenderingContext2D, fill: string, width: number): void {
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = width;
  ctx.lineJoin = 'round';
  ctx.stroke();
}

/** A cupped hand from the side, palm up: thumb rising at the left, fingers curling up at the right, the forearm off to the bottom left. (x, y) is the middle of the palm's hollow. */
export function drawHand(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, fill = INK): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = fill;
  ctx.strokeStyle = fill;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  // The forearm.
  ctx.beginPath();
  ctx.moveTo(-0.3 * s, 0.05 * s);
  ctx.lineTo(-0.95 * s, 0.75 * s);
  ctx.lineTo(-0.6 * s, 0.95 * s);
  ctx.lineTo(0.05 * s, 0.25 * s);
  ctx.closePath();
  ctx.fill();
  // The palm: a shallow bowl.
  ctx.beginPath();
  ctx.moveTo(-0.42 * s, 0.02 * s);
  ctx.quadraticCurveTo(-0.05 * s, 0.1 * s, 0.38 * s, 0.0);
  ctx.quadraticCurveTo(0.4 * s, 0.3 * s, 0.05 * s, 0.32 * s);
  ctx.quadraticCurveTo(-0.35 * s, 0.3 * s, -0.42 * s, 0.02 * s);
  ctx.fill();
  // Four fingers curling up, the nearest lowest.
  ctx.lineWidth = 0.11 * s;
  for (let i = 0; i < 4; i++) {
    const bx = 0.28 * s + i * 0.02 * s;
    const by = 0.17 * s - i * 0.05 * s;
    ctx.globalAlpha = 1 - 0.12 * (3 - i);
    ctx.beginPath();
    ctx.moveTo(bx, by);
    ctx.quadraticCurveTo(bx + 0.24 * s, by - 0.02 * s, bx + 0.22 * s, by - 0.2 * s);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  // The thumb.
  ctx.lineWidth = 0.13 * s;
  ctx.beginPath();
  ctx.moveTo(-0.3 * s, 0.1 * s);
  ctx.quadraticCurveTo(-0.42 * s, -0.08 * s, -0.36 * s, -0.2 * s);
  ctx.stroke();
  ctx.restore();
}

/** A small fish lying on its side, facing right. */
export function drawFishShape(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, fill = INK): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.beginPath();
  ctx.moveTo(0.5 * s, 0);
  ctx.bezierCurveTo(0.3 * s, -0.34 * s, -0.22 * s, -0.3 * s, -0.32 * s, 0);
  ctx.lineTo(-0.52 * s, -0.2 * s);
  ctx.lineTo(-0.46 * s, 0);
  ctx.lineTo(-0.52 * s, 0.2 * s);
  ctx.lineTo(-0.32 * s, 0);
  ctx.bezierCurveTo(-0.22 * s, 0.3 * s, 0.3 * s, 0.34 * s, 0.5 * s, 0);
  ctx.closePath();
  inked(ctx, fill, Math.max(3, s * 0.02));
  ctx.beginPath();
  ctx.arc(0.3 * s, -0.05 * s, 0.035 * s, 0, Math.PI * 2);
  ctx.fillStyle = fill === INK ? PAPER : INK;
  ctx.fill();
  ctx.restore();
}

/** A back tooth, crown up: (x, y) is the middle of its biting surface. */
export function drawMolar(ctx: CanvasRenderingContext2D, x: number, y: number, s: number): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.beginPath();
  ctx.moveTo(-0.5 * s, 0);
  ctx.quadraticCurveTo(-0.38 * s, -0.12 * s, -0.22 * s, -0.02 * s);
  ctx.quadraticCurveTo(0, -0.14 * s, 0.22 * s, -0.02 * s);
  ctx.quadraticCurveTo(0.38 * s, -0.12 * s, 0.5 * s, 0);
  ctx.quadraticCurveTo(0.56 * s, 0.4 * s, 0.36 * s, 0.52 * s);
  ctx.quadraticCurveTo(0.34 * s, 1.0 * s, 0.2 * s, 1.1 * s);
  ctx.quadraticCurveTo(0.08 * s, 0.8 * s, 0, 0.6 * s);
  ctx.quadraticCurveTo(-0.08 * s, 0.8 * s, -0.2 * s, 1.1 * s);
  ctx.quadraticCurveTo(-0.34 * s, 1.0 * s, -0.36 * s, 0.52 * s);
  ctx.quadraticCurveTo(-0.56 * s, 0.4 * s, -0.5 * s, 0);
  ctx.closePath();
  inked(ctx, '#fbf7ec', Math.max(3, s * 0.025));
  ctx.restore();
}

/** A long curved fang, point down: (x, y) is the top of its root. */
export function drawFang(ctx: CanvasRenderingContext2D, x: number, y: number, s: number): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.beginPath();
  ctx.moveTo(-0.32 * s, 0);
  ctx.quadraticCurveTo(-0.3 * s, 0.7 * s, 0.12 * s, 1.3 * s);
  ctx.quadraticCurveTo(0.2 * s, 0.7 * s, 0.32 * s, 0);
  ctx.closePath();
  inked(ctx, '#fbf7ec', Math.max(3, s * 0.03));
  ctx.restore();
}

/** A stick person standing on (x, y), `s` tall. */
export function drawStickPerson(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, wobble = 0): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.strokeStyle = INK;
  ctx.lineWidth = Math.max(4, s * 0.06);
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-0.14 * s, 0);
  ctx.lineTo(0, -0.42 * s);
  ctx.lineTo(0.14 * s, 0);
  ctx.moveTo(0, -0.42 * s);
  ctx.lineTo(0, -0.78 * s);
  ctx.moveTo(-0.24 * s, -0.62 * s + wobble * s * 0.05);
  ctx.lineTo(0, -0.7 * s);
  ctx.lineTo(0.24 * s, -0.62 * s - wobble * s * 0.05);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(0, -0.88 * s, 0.11 * s, 0, Math.PI * 2);
  ctx.fillStyle = INK;
  ctx.fill();
  ctx.restore();
}

/** A turtle's domed shell from the side, cracking open as `crack` goes 0 .. 1: (x, y) is the middle of its base. */
export function drawShell(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, crack: number): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.beginPath();
  ctx.moveTo(-0.5 * s, 0);
  ctx.bezierCurveTo(-0.46 * s, -0.5 * s, 0.46 * s, -0.5 * s, 0.5 * s, 0);
  ctx.closePath();
  inked(ctx, '#8a7a3c', Math.max(3, s * 0.02));
  ctx.strokeStyle = 'rgba(27,26,31,0.6)';
  ctx.lineWidth = Math.max(2, s * 0.012);
  for (const [cx, cy, r] of [[0, -0.22, 0.12], [-0.25, -0.14, 0.1], [0.25, -0.14, 0.1]] as const) {
    ctx.beginPath();
    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * Math.PI * 2;
      ctx[k ? 'lineTo' : 'moveTo']((cx + r * Math.cos(a)) * s, (cy + r * 0.8 * Math.sin(a)) * s);
    }
    ctx.closePath();
    ctx.stroke();
  }
  if (crack > 0) {
    const pts = [[0.02, -0.38], [-0.04, -0.28], [0.05, -0.18], [-0.03, -0.08], [0.04, 0]];
    ctx.strokeStyle = INK;
    ctx.lineWidth = Math.max(3, s * 0.025);
    ctx.beginPath();
    const n = Math.max(2, Math.ceil(pts.length * crack));
    pts.slice(0, n).forEach(([px, py], i) => ctx[i ? 'lineTo' : 'moveTo'](px! * s, py! * s));
    if (crack > 0.6) {
      ctx.moveTo(-0.04 * s, -0.28 * s);
      ctx.lineTo(-0.2 * s, -0.3 * s);
      ctx.moveTo(0.05 * s, -0.18 * s);
      ctx.lineTo(0.22 * s, -0.24 * s);
    }
    ctx.stroke();
  }
  ctx.restore();
}

/** A small car from the side, standing on (x, y). */
export function drawCar(ctx: CanvasRenderingContext2D, x: number, y: number, s: number): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.beginPath();
  ctx.moveTo(-0.5 * s, -0.1 * s);
  ctx.lineTo(-0.48 * s, -0.24 * s);
  ctx.lineTo(-0.28 * s, -0.27 * s);
  ctx.lineTo(-0.14 * s, -0.44 * s);
  ctx.lineTo(0.16 * s, -0.44 * s);
  ctx.lineTo(0.32 * s, -0.27 * s);
  ctx.lineTo(0.48 * s, -0.22 * s);
  ctx.lineTo(0.5 * s, -0.1 * s);
  ctx.closePath();
  inked(ctx, '#d8433b', Math.max(3, s * 0.015));
  ctx.beginPath();
  ctx.moveTo(-0.12 * s, -0.4 * s);
  ctx.lineTo(0.14 * s, -0.4 * s);
  ctx.lineTo(0.26 * s, -0.28 * s);
  ctx.lineTo(-0.22 * s, -0.28 * s);
  ctx.closePath();
  inked(ctx, '#bfe1ea', Math.max(2, s * 0.01));
  for (const wx of [-0.3, 0.3]) {
    ctx.beginPath();
    ctx.arc(wx * s, -0.1 * s, 0.1 * s, 0, Math.PI * 2);
    inked(ctx, '#2a2a2e', Math.max(3, s * 0.012));
  }
  ctx.restore();
}

/** An elephant from the side, standing on (x, y), facing right. */
export function drawElephant(ctx: CanvasRenderingContext2D, x: number, y: number, s: number): void {
  ctx.save();
  ctx.translate(x, y);
  const grey = '#8f949a';
  for (const lx of [-0.3, -0.14, 0.12, 0.26]) {
    ctx.beginPath();
    ctx.rect(lx * s - 0.06 * s, -0.3 * s, 0.12 * s, 0.3 * s);
    inked(ctx, grey, Math.max(3, s * 0.012));
  }
  ctx.beginPath();
  ctx.ellipse(-0.02 * s, -0.42 * s, 0.4 * s, 0.24 * s, 0, 0, Math.PI * 2);
  inked(ctx, grey, Math.max(3, s * 0.012));
  ctx.beginPath();
  ctx.ellipse(0.38 * s, -0.5 * s, 0.15 * s, 0.15 * s, 0, 0, Math.PI * 2);
  inked(ctx, grey, Math.max(3, s * 0.012));
  ctx.beginPath();
  ctx.moveTo(0.48 * s, -0.52 * s);
  ctx.quadraticCurveTo(0.62 * s, -0.3 * s, 0.55 * s, -0.08 * s);
  ctx.lineTo(0.5 * s, -0.1 * s);
  ctx.quadraticCurveTo(0.52 * s, -0.32 * s, 0.42 * s, -0.42 * s);
  ctx.closePath();
  inked(ctx, grey, Math.max(3, s * 0.012));
  ctx.beginPath();
  ctx.ellipse(0.3 * s, -0.48 * s, 0.1 * s, 0.14 * s, -0.2, 0, Math.PI * 2);
  inked(ctx, '#7c8187', Math.max(2, s * 0.01));
  ctx.beginPath();
  ctx.arc(0.43 * s, -0.56 * s, 0.015 * s, 0, Math.PI * 2);
  ctx.fillStyle = INK;
  ctx.fill();
  ctx.restore();
}
