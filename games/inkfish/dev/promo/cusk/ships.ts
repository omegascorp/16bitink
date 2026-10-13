import { createRng } from '../../../src/logic/rng';
import { CHALK, toScreen } from './scene';
import { type Camera, LAMP, SHEAVE } from './story';

/**
 * The two ships at the top of the column, in chalk on the night, bows to
 * the left and sterns over the fish: CSIRO's RV Investigator (2017), with
 * the A-frame the net hangs from and the deck lamp; and HMS Challenger
 * (1870s), a steam-assisted sailing corvette drawn like an old engraving.
 * Neither is to scale with the fish. World px, the sea's surface at y 0.
 */

type P = readonly [number, number];

const HULL = '#1b2234';
const PAPERISH = '#e9e3d3';
const WINDOW = '#f6d77a';

/** Draws in world px about the sea's surface under the stern, lines `px` screen px wide. */
function inWorld(ctx: CanvasRenderingContext2D, cam: Camera, alpha: number, draw: (px: number) => void): void {
  if (alpha <= 0) return;
  const o = toScreen(cam, 0, 0);
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(o.x, o.y);
  ctx.scale(cam.zoom, cam.zoom);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  draw(1 / cam.zoom);
  ctx.restore();
}

function poly(ctx: CanvasRenderingContext2D, pts: readonly P[], close = true): void {
  ctx.beginPath();
  pts.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)));
  if (close) ctx.closePath();
}

function line(ctx: CanvasRenderingContext2D, a: P, b: P): void {
  ctx.beginPath();
  ctx.moveTo(a[0], a[1]);
  ctx.lineTo(b[0], b[1]);
  ctx.stroke();
}

/** Parallel hatching inside a shape, engraving-style: lines `gap` apart at `angle`. */
function hatch(ctx: CanvasRenderingContext2D, shape: readonly P[], angle: number, gap: number, width: number, alpha: number): void {
  const xs = shape.map((p) => p[0]);
  const ys = shape.map((p) => p[1]);
  const cx = (Math.min(...xs) + Math.max(...xs)) / 2;
  const cy = (Math.min(...ys) + Math.max(...ys)) / 2;
  const reach = Math.hypot(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys)) / 2;
  ctx.save();
  poly(ctx, shape);
  ctx.clip();
  ctx.globalAlpha *= alpha;
  ctx.lineWidth = width;
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  for (let d = -reach; d <= reach; d += gap) {
    line(ctx, [cx - s * d - c * reach, cy + c * d - s * reach], [cx - s * d + c * reach, cy + c * d + s * reach]);
  }
  ctx.restore();
}

// ---------------------------------------------------------------- RV Investigator

const INV_HULL: readonly P[] = [
  [-1330, -175], [-1250, 80], [-230, 80], [-95, 30], [-95, -115], [-640, -118], [-1100, -140],
];
/** Deckhouses, white: [left, top, right, bottom]. */
const INV_HOUSES: readonly (readonly [number, number, number, number])[] = [
  [-1190, -235, -600, -118], [-1150, -320, -700, -235], [-1170, -400, -840, -320],
];

export function drawInvestigator(ctx: CanvasRenderingContext2D, cam: Camera, alpha: number, aim: number, lampOn: number): void {
  inWorld(ctx, cam, alpha, (px) => {
    ctx.strokeStyle = CHALK;
    // Mast and radar over the bridge.
    ctx.lineWidth = 3 * px;
    line(ctx, [-960, -400], [-960, -600]);
    line(ctx, [-1010, -540], [-910, -540]);
    line(ctx, [-990, -585], [-930, -585]);
    // Funnel aft of the houses.
    poly(ctx, [[-660, -235], [-575, -235], [-585, -345], [-650, -345]]);
    ctx.fillStyle = HULL;
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = PAPERISH;
    ctx.fillRect(-655, -330, 72, 16);
    for (const [l, tp, r, b] of INV_HOUSES) {
      poly(ctx, [[l, b], [l, tp], [r, tp], [r, b]]);
      ctx.fillStyle = PAPERISH;
      ctx.fill();
      ctx.lineWidth = 2.5 * px;
      ctx.stroke();
    }
    // Bridge windows, lit, and portholes below.
    ctx.fillStyle = WINDOW;
    for (let x = -1150; x < -860; x += 42) ctx.fillRect(x, -385, 30, 22);
    ctx.fillStyle = '#3a4258';
    for (let x = -1160; x < -640; x += 60) ctx.fillRect(x, -195, 24, 18);
    for (let x = -1120; x < -720; x += 60) ctx.fillRect(x, -290, 24, 18);
    // The hull, a white band under the bulwark, and its outline.
    poly(ctx, INV_HULL);
    ctx.fillStyle = HULL;
    ctx.fill();
    ctx.lineWidth = 3 * px;
    ctx.stroke();
    ctx.save();
    poly(ctx, INV_HULL);
    ctx.clip();
    ctx.fillStyle = PAPERISH;
    ctx.globalAlpha *= 0.85;
    poly(ctx, [[-1400, -150], [-1100, -128], [-640, -106], [-60, -103], [-60, -90], [-640, -93], [-1100, -114], [-1400, -136]]);
    ctx.fill();
    ctx.restore();
    hatch(ctx, INV_HULL, 0.5, 26, 1.2 * px, 0.25);
    // Rails along the working deck.
    ctx.lineWidth = 1.5 * px;
    line(ctx, [-600, -150], [-110, -145]);
    for (let x = -600; x <= -110; x += 49) line(ctx, [x, -118], [x, -149]);
    drawAFrame(ctx, px, aim, lampOn);
  });
}

/** The stern's A-frame: two legs leaning out over the water, the crossbar, the sheave, and the lamp on its bracket. */
function drawAFrame(ctx: CanvasRenderingContext2D, px: number, aim: number, lampOn: number): void {
  ctx.strokeStyle = CHALK;
  ctx.fillStyle = HULL;
  const top = SHEAVE.y - 18;
  for (const [x0, x1] of [[-210, -40], [-170, 0]] as const) {
    poly(ctx, [[x0 - 14, -115], [x0 + 14, -115], [x1 + 12, top], [x1 - 12, top]]);
    ctx.fill();
    ctx.lineWidth = 2.5 * px;
    ctx.stroke();
  }
  poly(ctx, [[-90, top - 22], [40, top - 22], [40, top + 6], [-90, top + 6]]);
  ctx.fill();
  ctx.stroke();
  // The sheave the warp runs over.
  ctx.beginPath();
  ctx.arc(SHEAVE.x, SHEAVE.y, 16, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(SHEAVE.x, SHEAVE.y, 4, 0, Math.PI * 2);
  ctx.stroke();
  // The lamp: a box on a pivot clamped to the leg, its glass facing where it aims.
  ctx.lineWidth = 3 * px;
  ctx.beginPath();
  ctx.arc(LAMP.x, LAMP.y, 12, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.save();
  ctx.translate(LAMP.x, LAMP.y);
  ctx.rotate(aim);
  poly(ctx, [[-26, -20], [18, -20], [26, -26], [26, 26], [18, 20], [-26, 20]]);
  ctx.fillStyle = HULL;
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = lampOn > 0.5 ? '#fff4c8' : '#5a5848';
  ctx.fillRect(22, -22, 7, 44);
  ctx.restore();
}

// ---------------------------------------------------------------- HMS Challenger

const CH_HULL: readonly P[] = [
  [-1360, -130], [-1300, 0], [-1250, 70], [-230, 70], [-140, 10], [-110, -105], [-700, -88], [-1100, -96],
];
/** Masts: x, top, and the heights of its three yards. */
const MASTS: readonly { readonly x: number; readonly top: number; readonly yards: readonly number[]; readonly span: number }[] = [
  { x: -1060, top: -780, yards: [-250, -470, -650], span: 190 },
  { x: -730, top: -830, yards: [-260, -500, -690], span: 210 },
  { x: -400, top: -680, yards: [-240, -430, -580], span: 160 },
];

/** A square sail between two yards, bellied forward (to the left) by the wind. */
function sail(ctx: CanvasRenderingContext2D, x: number, top: number, bottom: number, half: number, topHalf: number, px: number): void {
  const belly = 0.16 * (bottom - top);
  const shape: P[] = [];
  for (let k = 0; k <= 10; k++) shape.push([x - topHalf + (2 * topHalf * k) / 10, top + 6]);
  for (let k = 0; k <= 10; k++) {
    const u = k / 10;
    shape.push([x + half - belly * Math.sin(Math.PI * u) * 0.5, top + 6 + (bottom - top - 6) * u]);
  }
  for (let k = 10; k >= 0; k--) shape.push([x - half + (2 * half * k) / 10, bottom - belly * 0.25 * Math.sin((Math.PI * k) / 10)]);
  for (let k = 10; k >= 0; k--) {
    const u = k / 10;
    shape.push([x - half - belly * Math.sin(Math.PI * u) * 0.6, top + 6 + (bottom - top - 6) * u]);
  }
  poly(ctx, shape);
  ctx.fillStyle = PAPERISH;
  ctx.fill();
  ctx.lineWidth = 2 * px;
  ctx.stroke();
  // Shading down the lee side, and the seams.
  hatch(ctx, shape.slice(22, 33).concat([[x - half * 0.4, bottom], [x - half * 0.4, top + 6]]), 1.35, 9, 1 * px, 0.55);
  ctx.save();
  ctx.globalAlpha *= 0.35;
  ctx.lineWidth = 1 * px;
  for (let k = -2; k <= 2; k++) line(ctx, [x + (k * half) / 3, top + 8], [x + (k * half) / 3 - belly * 0.2, bottom - 4]);
  ctx.restore();
}

export function drawChallenger(ctx: CanvasRenderingContext2D, cam: Camera, alpha: number): void {
  inWorld(ctx, cam, alpha, (px) => {
    const rng = createRng(1872);
    ctx.strokeStyle = CHALK;
    // Stays and shrouds first, behind the sails.
    ctx.lineWidth = 1.2 * px;
    ctx.save();
    ctx.globalAlpha *= 0.7;
    line(ctx, [-1060, -780], [-1640, -235]);
    line(ctx, [-1060, -600], [-1500, -180]);
    line(ctx, [-730, -830], [-1060, -560]);
    line(ctx, [-400, -680], [-730, -600]);
    line(ctx, [-400, -680], [-120, -110]);
    for (const m of MASTS) {
      for (const dx of [-60, -30, 30, 60]) line(ctx, [m.x, m.yards[0]! - 20], [m.x + dx * 2, -100]);
    }
    ctx.restore();
    // Bowsprit and jib boom, and the jibs.
    ctx.lineWidth = 4 * px;
    line(ctx, [-1330, -125], [-1660, -230]);
    for (const [tip, foot] of [[[-1060, -700], [-1600, -215]], [[-1060, -560], [-1470, -175]]] as const) {
      poly(ctx, [tip as P, foot as P, [foot[0] + 220, foot[1] + 50]]);
      ctx.fillStyle = PAPERISH;
      ctx.fill();
      ctx.lineWidth = 2 * px;
      ctx.stroke();
    }
    // Masts, yards and square sails.
    for (const m of MASTS) {
      ctx.lineWidth = 6 * px;
      line(ctx, [m.x, -100], [m.x, m.top]);
      const [y1, y2, y3] = m.yards as [number, number, number];
      sail(ctx, m.x, y2, y1, m.span, m.span * 0.86, px);
      sail(ctx, m.x, y3, y2, m.span * 0.82, m.span * 0.66, px);
      sail(ctx, m.x, m.top + 40, y3, m.span * 0.62, m.span * 0.45, px);
      ctx.lineWidth = 4 * px;
      for (const [y, w] of [[y1, m.span * 1.05], [y2, m.span * 0.9], [y3, m.span * 0.7]] as const) line(ctx, [m.x - w, y], [m.x + w, y]);
    }
    // The ensign at the mizzen.
    poly(ctx, [[-400, -680], [-330, -668], [-342, -640], [-400, -650]]);
    ctx.fillStyle = PAPERISH;
    ctx.fill();
    ctx.lineWidth = 1.5 * px;
    ctx.stroke();
    // Her funnel between main and mizzen, a wisp of smoke.
    poly(ctx, [[-590, -95], [-535, -95], [-540, -250], [-585, -250]]);
    ctx.fillStyle = HULL;
    ctx.fill();
    ctx.lineWidth = 2.5 * px;
    ctx.stroke();
    ctx.save();
    ctx.globalAlpha *= 0.35;
    ctx.lineWidth = 10 * px;
    ctx.beginPath();
    ctx.moveTo(-562, -255);
    ctx.bezierCurveTo(-520, -330, -440, -310, -360, -380);
    ctx.stroke();
    ctx.restore();
    // The hull: dark, hatched, with a pale band of gunports.
    poly(ctx, CH_HULL);
    ctx.fillStyle = HULL;
    ctx.fill();
    hatch(ctx, CH_HULL, 0.12, 12, 1.1 * px, 0.45);
    ctx.lineWidth = 3 * px;
    poly(ctx, CH_HULL);
    ctx.stroke();
    ctx.fillStyle = PAPERISH;
    poly(ctx, [[-1290, -82], [-700, -60], [-150, -70], [-145, -45], [-700, -35], [-1270, -56]]);
    ctx.fill();
    ctx.fillStyle = HULL;
    for (let x = -1200; x < -200; x += 72 + rng() * 4) ctx.fillRect(x, -66 + (x + 700) * -0.004, 26, 18);
    // Her stern gallery and a cutwater scroll.
    ctx.lineWidth = 2 * px;
    line(ctx, [-180, -100], [-150, -20]);
    line(ctx, [-210, -98], [-185, -25]);
    ctx.beginPath();
    ctx.arc(-1335, -112, 14, 0, Math.PI * 1.6);
    ctx.stroke();
  });
}
