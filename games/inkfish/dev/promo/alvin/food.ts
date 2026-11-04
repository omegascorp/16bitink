import { blob, boiled, hash, ink, lin, LINE, smoothClosed, type Pt } from './art/draw';
import { VIDEO } from '../short';

/** The sunny deck the next day: sky, sea, a ship's rail, a checked cloth, plates of grilled swordfish steak with lemon. */

export const TABLE_Y = 900;

function cloud(ctx: CanvasRenderingContext2D, x: number, y: number, s: number): void {
  for (let i = 0; i < 7; i++) blob(ctx, x + (hash(i + x) - 0.5) * 340 * s, y + (hash(i + 8) - 0.5) * 50 * s, (130 + 90 * hash(i + 4)) * s, (44 + 34 * hash(i + 2)) * s, 0, '255,255,255', 0.75);
}

export function drawSky(ctx: CanvasRenderingContext2D, sun: number, t: number): void {
  ctx.fillStyle = lin(ctx, 0, 0, 0, 640, [[0, '#2f97d6'], [0.7, '#8fd2ee'], [1, '#e6f6f4']]);
  ctx.fillRect(0, 0, VIDEO.width, 640);
  cloud(ctx, 220, 200, 1);
  cloud(ctx, 700, 110, 0.7);
  blob(ctx, 850, 330, 420, 420, 0, '255,244,190', 0.95 * sun);
  ctx.fillStyle = `rgba(255,252,226,${sun})`;
  ctx.beginPath();
  ctx.arc(850, 330, 84, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = lin(ctx, 0, 620, 0, TABLE_Y, [[0, '#3aa8cc'], [1, '#0f6795']]);
  ctx.fillRect(0, 620, VIDEO.width, TABLE_Y - 620);
  for (let i = 0; i < 20; i++) {
    const y = 640 + (i % 9) * 26;
    const x = ((i * 233 + t * 40 * (1 + (i % 3))) % 1300) - 110;
    ink(ctx, [{ x, y }, { x: x + 60, y: y - 3 }, { x: x + 110, y }], 3 + (i % 9) * 0.5, '#e6f8ff', 0.5);
  }
  blob(ctx, 850, 690, 220, 70, 0, '255,250,214', 0.7 * sun);
}

/** The ship's rail behind the men: white stanchions and two white rails, rust at the feet. */
export function drawRail(ctx: CanvasRenderingContext2D): void {
  const post = (x: number): void => {
    ink(ctx, [{ x, y: 690 }, { x, y: TABLE_Y }], 15, LINE);
    ink(ctx, [{ x, y: 690 }, { x, y: TABLE_Y }], 11, '#f1f3ee');
    ink(ctx, [{ x: x - 3, y: 700 }, { x: x - 3, y: TABLE_Y }], 3, '#ffffff');
    ink(ctx, [{ x: x + 3, y: 700 }, { x: x + 3, y: TABLE_Y }], 3, '#9fb0bd', 0.8);
  };
  for (const x of [40, 370, 700, 1030]) post(x);
  for (const [y, w] of [[690, 16], [780, 12]] as const) {
    ink(ctx, [{ x: -10, y }, { x: 1090, y }], w + 4, LINE);
    ink(ctx, [{ x: -10, y }, { x: 1090, y }], w, '#f1f3ee');
    ink(ctx, [{ x: -10, y: y - w * 0.22 }, { x: 1090, y: y - w * 0.22 }], w * 0.3, '#ffffff');
    ink(ctx, [{ x: -10, y: y + w * 0.28 }, { x: 1090, y: y + w * 0.28 }], w * 0.22, '#8fa2b0', 0.9);
  }
}

/** The table: a red-and-white checked cloth in perspective, sun on it. */
export function drawTable(ctx: CanvasRenderingContext2D): void {
  ctx.fillStyle = lin(ctx, 0, TABLE_Y, 0, VIDEO.height, [[0, '#fbf8ef'], [1, '#e9dfcd']]);
  ctx.fillRect(0, TABLE_Y, VIDEO.width, VIDEO.height - TABLE_Y);
  ctx.save();
  ctx.globalAlpha = 0.2;
  ctx.fillStyle = '#c8281e';
  for (let i = 0; i < 12; i++) {
    const [y0, y1] = [TABLE_Y + 1020 * (i / 12) ** 1.7, TABLE_Y + 1020 * ((i + 0.5) / 12) ** 1.7];
    ctx.fillRect(0, y0, VIDEO.width, y1 - y0);
  }
  for (let i = -9; i <= 9; i++) {
    const x = (d: number): number => 540 + (i + 0.0) * 56 * (1 + d * 2.7);
    const x2 = (d: number): number => 540 + (i + 0.5) * 56 * (1 + d * 2.7);
    ctx.beginPath();
    ctx.moveTo(x(0), TABLE_Y);
    ctx.lineTo(x2(0), TABLE_Y);
    ctx.lineTo(x2(1), VIDEO.height);
    ctx.lineTo(x(1), VIDEO.height);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
  ink(ctx, [{ x: 0, y: TABLE_Y }, { x: VIDEO.width, y: TABLE_Y }], 4, LINE, 0.8);
  blob(ctx, 540, 960, 620, 70, 0, '60,40,30', 0.2);
}

function fork(ctx: CanvasRenderingContext2D, x: number, y: number, s: number): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(0.12);
  ctx.scale(s, s);
  const body = [{ x: 0, y: 0 }, { x: 0, y: -70 }];
  ink(ctx, body, 8, '#6f7a85');
  ink(ctx, body, 5, '#e3eaf0');
  for (const dx of [-8, 0, 8]) ink(ctx, [{ x: dx, y: -70 }, { x: dx, y: -118 }], 3.4, '#e3eaf0');
  ink(ctx, [{ x: -8, y: -118 }, { x: -8, y: -68 }, { x: 8, y: -68 }, { x: 8, y: -118 }], 1.6, LINE, 0.8);
  ink(ctx, [{ x: 0, y: 0 }, { x: 0, y: 70 }], 8, '#6f7a85');
  ink(ctx, [{ x: 0, y: 0 }, { x: 0, y: 70 }], 5, '#e3eaf0');
  ctx.restore();
}

const STEAK: Pt[] = [{ x: -128, y: -8 }, { x: -104, y: -54 }, { x: -40, y: -70 }, { x: 34, y: -66 }, { x: 104, y: -50 }, { x: 132, y: -2 }, { x: 108, y: 44 }, { x: 42, y: 62 }, { x: -34, y: 60 }, { x: -104, y: 44 }];

/** A swordfish steak off the grill: a thick pale slab, seared gold, its whorled grain, crossed bars of char. */
function drawSteak(ctx: CanvasRenderingContext2D, boil: number): void {
  const edge = STEAK.map((p) => ({ x: p.x, y: p.y + 20 }));
  smoothClosed(ctx, edge);
  ctx.fillStyle = lin(ctx, 0, 0, 0, 84, [[0, '#d9a55e'], [1, '#8a5424']]);
  ctx.fill();
  ink(ctx, edge, 4, LINE, 1, true);
  const steak = boiled(STEAK, boil, 1.2, 4);
  smoothClosed(ctx, steak);
  ctx.fillStyle = lin(ctx, -60, -70, 60, 60, [[0, '#f6d9a0'], [0.55, '#e7b56e'], [1, '#c98640']]);
  ctx.fill();
  ctx.save();
  ctx.clip();
  for (const r of [0.28, 0.5, 0.72, 0.94]) {
    ctx.strokeStyle = 'rgba(150,92,40,0.5)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.ellipse(-16, -6, 130 * r, 66 * r, -0.12, 0.3, 5.6);
    ctx.stroke();
  }
  blob(ctx, 100, 30, 80, 44, 0, '140,70,24', 0.5);
  blob(ctx, -112, -30, 60, 40, 0, '150,84,30', 0.45);
  for (let i = -3; i <= 3; i++) {
    ink(ctx, [{ x: -60 + i * 44, y: -80 }, { x: 20 + i * 44, y: 80 }], 10, '#3b1c0c', 0.82);
    ink(ctx, [{ x: 56 + i * 56, y: -80 }, { x: -24 + i * 56, y: 80 }], 7, '#3b1c0c', 0.5);
  }
  blob(ctx, -46, -36, 74, 20, -0.1, '255,238,190', 0.55);
  ctx.restore();
  ink(ctx, steak, 4, LINE, 1, true);
}

/** A round lemon slice, rind, pith and segments. */
function lemonSlice(ctx: CanvasRenderingContext2D, x: number, y: number, r: number): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(1, 0.72);
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fillStyle = '#f2cf1e';
  ctx.fill();
  ctx.strokeStyle = LINE;
  ctx.lineWidth = 3.4;
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.86, 0, Math.PI * 2);
  ctx.fillStyle = '#fdf6c8';
  ctx.fill();
  for (let i = 0; i < 8; i++) {
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, r * 0.76, (i * Math.PI) / 4 + 0.08, ((i + 1) * Math.PI) / 4 - 0.08);
    ctx.closePath();
    ctx.fillStyle = '#f7e05a';
    ctx.fill();
  }
  ctx.restore();
}

/** A small sprig: a few inked leaves. */
function parsley(ctx: CanvasRenderingContext2D, x: number, y: number): void {
  for (let i = 0; i < 5; i++) {
    const [px, py] = [x + (i - 2) * 11, y + hash(i) * 10 - 4];
    ctx.beginPath();
    ctx.arc(px, py, 10, 0, Math.PI * 2);
    ctx.fillStyle = i % 2 ? '#3f8a38' : '#62a840';
    ctx.fill();
    ctx.strokeStyle = LINE;
    ctx.lineWidth = 1.6;
    ctx.stroke();
  }
}

/** A plate of one grilled steak, lemon and a fork, at (x, y), `pop` 0 .. 1 growing in, `s` its scale. */
export function drawPlate(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, pop: number, boil: number): void {
  if (pop <= 0.01) return;
  const k = s * (0.4 + 0.6 * pop + 0.12 * Math.sin(Math.PI * pop));
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(k, k);
  ctx.globalAlpha = Math.min(1, pop * 3);
  blob(ctx, 10, 34, 230, 116, 0, '60,30,20', 0.42);
  ctx.beginPath();
  ctx.ellipse(0, 0, 196, 112, 0, 0, Math.PI * 2);
  ctx.fillStyle = lin(ctx, -100, -112, 100, 112, [[0, '#ffffff'], [1, '#c5d0d8']]);
  ctx.fill();
  ctx.strokeStyle = LINE;
  ctx.lineWidth = 4;
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(0, 4, 158, 86, 0, 0, Math.PI * 2);
  ctx.fillStyle = '#eef3f5';
  ctx.fill();
  ctx.strokeStyle = '#a9b6bf';
  ctx.lineWidth = 2.5;
  ctx.stroke();
  drawSteak(ctx, boil);
  lemonSlice(ctx, 66, -18, 40);
  lemonSlice(ctx, 118, 6, 36);
  parsley(ctx, -66, -52);
  ctx.save();
  ctx.translate(-150, 50);
  ctx.rotate(0.82);
  fork(ctx, 0, 0, 0.92);
  ctx.restore();
  ctx.restore();
}

/** The serving dish below: "for the whole crew", a heap of more steaks. */
export function drawPlatter(ctx: CanvasRenderingContext2D, x: number, y: number, pop: number, boil: number): void {
  if (pop <= 0.01) return;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(pop, pop);
  blob(ctx, 0, 54, 520, 180, 0, '60,30,20', 0.42);
  ctx.beginPath();
  ctx.ellipse(0, 0, 480, 200, 0, 0, Math.PI * 2);
  ctx.fillStyle = lin(ctx, -300, -200, 300, 200, [[0, '#f6f9fa'], [1, '#b7c4cd']]);
  ctx.fill();
  ctx.strokeStyle = LINE;
  ctx.lineWidth = 5;
  ctx.stroke();
  for (const [sx, sy, r] of [[-250, -8, -0.2], [250, -8, 0.2], [0, -66, 0.1], [-120, 60, -0.1], [130, 60, 0.12]] as const) {
    ctx.save();
    ctx.translate(sx, sy);
    ctx.rotate(r);
    ctx.scale(1.06, 1.06);
    drawSteak(ctx, boil);
    ctx.restore();
  }
  lemonSlice(ctx, -300, -80, 48);
  lemonSlice(ctx, 330, -70, 48);
  lemonSlice(ctx, 10, 20, 50);
  parsley(ctx, -30, -100);
  ctx.restore();
}
