import { ink, lin, LINE } from './draw';

/** A man's arm thrown up from behind the table, fist round a fork with a bite of grilled steak on it. */

export interface RaisedFork {
  /** The fist. */
  readonly x: number;
  readonly y: number;
  /** Where the arm comes up from. */
  readonly fromX: number;
  readonly fromY: number;
  readonly tilt: number;
  readonly skin: readonly [string, string, string];
  readonly sleeve: string;
}

function fork(ctx: CanvasRenderingContext2D): void {
  ink(ctx, [{ x: 0, y: -24 }, { x: 0, y: -150 }], 15, LINE);
  ink(ctx, [{ x: 0, y: -24 }, { x: 0, y: -150 }], 9, '#dfe6ea');
  ctx.beginPath();
  ctx.roundRect(-20, -176, 40, 34, 8);
  ctx.fillStyle = '#dfe6ea';
  ctx.fill();
  ctx.strokeStyle = LINE;
  ctx.lineWidth = 3.5;
  ctx.stroke();
  for (const x of [-15, -5, 5, 15]) {
    ink(ctx, [{ x, y: -170 }, { x, y: -240 }], 10, LINE);
    ink(ctx, [{ x, y: -170 }, { x, y: -240 }], 5, '#eef3f5');
  }
}

function bite(ctx: CanvasRenderingContext2D): void {
  ctx.beginPath();
  ctx.roundRect(-52, -232, 104, 58, 16);
  ctx.fillStyle = lin(ctx, -40, -232, 40, -174, [[0, '#f6d9a0'], [1, '#c98640']]);
  ctx.fill();
  ctx.strokeStyle = LINE;
  ctx.lineWidth = 3.5;
  ctx.stroke();
  for (const x of [-26, 2, 30]) ink(ctx, [{ x, y: -228 }, { x: x - 10, y: -178 }], 7, '#3b1c0c', 0.8);
}

export function drawRaisedFork(ctx: CanvasRenderingContext2D, f: RaisedFork): void {
  const arm = [{ x: f.fromX, y: f.fromY }, { x: f.x, y: f.y }];
  const cuff = { x: f.fromX + (f.x - f.fromX) * 0.34, y: f.fromY + (f.y - f.fromY) * 0.34 };
  ink(ctx, arm, 92, LINE);
  ink(ctx, arm, 85, f.skin[1]);
  ink(ctx, arm.map((p) => ({ x: p.x - 14, y: p.y })), 34, f.skin[0], 0.75);
  ink(ctx, [arm[0]!, cuff], 104, LINE);
  ink(ctx, [arm[0]!, cuff], 96, f.sleeve);
  ctx.save();
  ctx.translate(f.x, f.y);
  ctx.rotate(f.tilt);
  fork(ctx);
  bite(ctx);
  ctx.beginPath();
  ctx.roundRect(-52, -46, 104, 92, 30);
  ctx.fillStyle = lin(ctx, -50, -40, 50, 40, [[0, f.skin[0]], [1, f.skin[1]]]);
  ctx.fill();
  ctx.strokeStyle = LINE;
  ctx.lineWidth = 3.5;
  ctx.stroke();
  for (const y of [-20, 2, 24]) ink(ctx, [{ x: -48, y }, { x: 18, y }], 2.8, LINE, 0.65);
  ctx.restore();
}
