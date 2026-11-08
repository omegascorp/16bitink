import { blob, boiled, hash, ink, lin, type Pt } from './draw';

/**
 * The Titanic's bow as the world knows it: 3/4 from the front, looking up at the
 * sharp prow rising out of the black, the rail coming to a point at the very
 * tip, rusticles hanging in curtains, the anchor in its pipe, and the silt the
 * bow ploughed up at its foot, all in Alvin's lamps. Drawn straight in screen
 * space: the picture is one fixed view.
 */

export interface BowPose {
  /** The lamp light on it, 0 (black water) .. 1 (lit). */
  readonly light: number;
  /** How far the dark has drawn back from the stem, 0 .. 1. */
  readonly reveal: number;
}

const TIP: Pt = { x: 650, y: 570 };
const FOOT: Pt = { x: 606, y: 1500 };
const LEFT_TOP: Pt = { x: -300, y: 1180 };
const LEFT_LOW: Pt = { x: -300, y: 1340 };
const RIGHT_TOP: Pt = { x: 1030, y: 1060 };
const RIGHT_LOW: Pt = { x: 900, y: 1420 };

/** A point on a side of the hull: u from the stem back along it (foreshortened), v from the deck edge down. */
function onSide(top: Pt, low: Pt, u: number, v: number): Pt {
  const w = 1 - (1 - u) ** 1.7;
  const a = { x: TIP.x + (top.x - TIP.x) * w, y: TIP.y + (top.y - TIP.y) * w - 70 * Math.sin(u * Math.PI) * (top === LEFT_TOP ? 1 : 0.5) };
  const b = { x: FOOT.x + (low.x - FOOT.x) * w, y: FOOT.y + (low.y - FOOT.y) * w };
  return { x: a.x + (b.x - a.x) * v, y: a.y + (b.y - a.y) * v };
}

function sidePath(ctx: CanvasRenderingContext2D, top: Pt, low: Pt): void {
  ctx.beginPath();
  for (let i = 0; i <= 20; i++) {
    const p = onSide(top, low, i / 20, 0);
    if (i) ctx.lineTo(p.x, p.y);
    else ctx.moveTo(p.x, p.y);
  }
  for (let i = 20; i >= 0; i--) {
    const p = onSide(top, low, i / 20, 1);
    ctx.lineTo(p.x, p.y);
  }
  ctx.closePath();
}

/** Plates, rivet lines and rust washes on one side. */
function plates(ctx: CanvasRenderingContext2D, top: Pt, low: Pt, big: boolean): void {
  for (let i = 0; i < 28; i++) {
    const p = onSide(top, low, hash(i + 3) * 0.8, 0.05 + hash(i + 9) * 0.9);
    blob(ctx, p.x, p.y, 60 + 130 * hash(i + 2), 40 + 110 * hash(i + 6), 0.6, i % 3 ? '112,58,28' : '168,92,40', 0.3);
  }
  for (let v = 1; v < 9; v++) ink(ctx, Array.from({ length: 12 }, (_, i) => onSide(top, low, i / 11, v / 9)), 2.2, '#070a10', 0.5);
  for (let u = 1; u < (big ? 16 : 8); u++) ink(ctx, [onSide(top, low, u / 16, 0.02), onSide(top, low, u / 16, 1)], 1.6, '#070a10', 0.3);
}

function portholes(ctx: CanvasRenderingContext2D, top: Pt, low: Pt, count: number): void {
  for (const v of [0.12, 0.2]) {
    for (let i = 1; i <= count; i++) {
      const u = 0.05 + (i / count) * 0.62;
      const p = onSide(top, low, u, v);
      const r = 9.5 * (1 - u * 0.62);
      ctx.fillStyle = '#05070c';
      ctx.beginPath();
      ctx.ellipse(p.x, p.y, r * 0.8, r, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(214,150,90,0.8)';
      ctx.lineWidth = 2;
      ctx.stroke();
      if (i % 2) ink(ctx, [{ x: p.x, y: p.y + r }, { x: p.x + 2, y: p.y + r + 26 * (1 - u) + 10 }], 3, '#a8591f', 0.6);
    }
  }
}

/** The stockless anchor drawn up into its hawse pipe, on the plane of the hull. */
function anchor(ctx: CanvasRenderingContext2D): void {
  const c = onSide(LEFT_TOP, LEFT_LOW, 0.1, 0.26);
  ctx.save();
  ctx.translate(c.x, c.y);
  ctx.transform(1, -0.34, 0, 1, 0, 0);
  ctx.fillStyle = '#04060a';
  ctx.beginPath();
  ctx.ellipse(0, -14, 24, 26, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#7a4a2a';
  ctx.lineWidth = 5;
  ctx.stroke();
  const pts: Pt[] = [{ x: -9, y: -8 }, { x: 9, y: -8 }, { x: 9, y: 58 }, { x: 44, y: 44 }, { x: 34, y: 92 }, { x: 8, y: 118 }, { x: -8, y: 118 }, { x: -34, y: 92 }, { x: -44, y: 44 }, { x: -9, y: 58 }];
  ctx.beginPath();
  pts.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
  ctx.closePath();
  ctx.fillStyle = lin(ctx, -40, 0, 40, 0, [[0, '#2a2522'], [0.45, '#6b4a34'], [1, '#14161c']]);
  ctx.fill();
  ctx.strokeStyle = '#0a0c12';
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.restore();
}

/** Rusticles: tapering icicles of rust hanging in a curtain from an edge. */
function rusticles(ctx: CanvasRenderingContext2D, top: Pt, low: Pt, n: number, seed: number): void {
  for (let i = 0; i < n; i++) {
    const u = (i + hash(i + seed) * 0.9) / n;
    const p = onSide(top, low, u * 0.8, 0.004 + hash(i + seed + 40) * 0.02);
    const scale = 1 - u * 0.66;
    const [w, h] = [(4 + 9 * hash(i + seed + 2)) * scale, (34 + 150 * hash(i + seed + 5) ** 2) * scale];
    ctx.fillStyle = lin(ctx, 0, p.y, 0, p.y + h, [[0, '#7a3e18'], [0.55, '#b4662a'], [1, '#d99a56']]);
    ctx.beginPath();
    ctx.moveTo(p.x - w, p.y);
    ctx.quadraticCurveTo(p.x - w * 0.5, p.y + h * 0.5, p.x + (hash(i) - 0.5) * 5, p.y + h);
    ctx.quadraticCurveTo(p.x + w * 0.5, p.y + h * 0.5, p.x + w, p.y);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(30,14,6,0.6)';
    ctx.lineWidth = 1;
    ctx.stroke();
  }
}

/** The rail: it runs along both deck edges and meets in a sharp point at the very tip. */
function rail(ctx: CanvasRenderingContext2D, top: Pt, low: Pt, tone: string): void {
  const edge = Array.from({ length: 18 }, (_, i) => onSide(top, low, (i / 17) ** 1.6, 0));
  const lifted = (h: number) => edge.map((p, i) => ({ x: p.x, y: p.y - h * (1 - (i / 17) * 0.8) }));
  for (const h of [64, 42, 22]) ink(ctx, lifted(h), h === 64 ? 4.5 : 2.6, tone, 1);
  edge.forEach((p, i) => ink(ctx, [p, lifted(64)[i]!], 2.6, tone, 1));
}

/** The dark drawing back from the stem, with the warm pool of Alvin's lamps. */
function lampLight(ctx: CanvasRenderingContext2D, p: BowPose): void {
  blob(ctx, 590, 900, 560, 620, 0, '255,226,170', 0.3 * p.light);
  const hole = 160 + 620 * p.reveal;
  const g = ctx.createRadialGradient(600, 900, hole * 0.2, 590, 920, hole);
  g.addColorStop(0, `rgba(1,5,12,${0.9 * (1 - p.light)})`);
  g.addColorStop(0.7, `rgba(1,5,12,${0.5 + 0.42 * (1 - p.light)})`);
  g.addColorStop(1, 'rgba(1,5,12,0.97)');
  ctx.fillStyle = g;
  ctx.fillRect(-200, 0, 1500, 1920);
}

/** The silt the bow ploughed up, heaped at its foot. */
function seabed(ctx: CanvasRenderingContext2D, boil: number): void {
  const heap: Pt[] = [{ x: -60, y: 1290 }, { x: 240, y: 1340 }, { x: 470, y: 1420 }, { x: 610, y: 1450 }, { x: 800, y: 1410 }, { x: 1140, y: 1320 }, { x: 1140, y: 1980 }, { x: -60, y: 1980 }];
  ctx.beginPath();
  boiled(heap, boil, 1.4, 3).forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
  ctx.closePath();
  ctx.fillStyle = lin(ctx, 0, 1290, 0, 1920, [[0, '#6c7377'], [0.25, '#3f4a52'], [1, '#121a22']]);
  ctx.fill();
  for (let i = 0; i < 18; i++) blob(ctx, hash(i + 4) * 1100, 1380 + hash(i + 7) * 460, 90 + hash(i + 9) * 160, 18 + hash(i + 1) * 30, 0, i % 2 ? '150,150,140' : '20,28,36', 0.34);
}

export function drawBow(ctx: CanvasRenderingContext2D, p: BowPose, boil: number): void {
  const iron = (top: Pt, low: Pt): void => {
    ctx.save();
    sidePath(ctx, top, low);
    ctx.fillStyle = lin(ctx, 640, 0, top.x, 0, [[0, '#5b3c2b'], [0.45, '#2c2524'], [1, '#0e1218']]);
    ctx.fill();
    ctx.clip();
    plates(ctx, top, low, top === LEFT_TOP);
    ctx.restore();
  };
  rail(ctx, RIGHT_TOP, RIGHT_LOW, '#8d7a64');
  iron(RIGHT_TOP, RIGHT_LOW);
  ctx.save();
  sidePath(ctx, RIGHT_TOP, RIGHT_LOW);
  ctx.fillStyle = 'rgba(2,6,12,0.5)';
  ctx.fill();
  ctx.restore();
  portholes(ctx, RIGHT_TOP, RIGHT_LOW, 4);
  rail(ctx, LEFT_TOP, LEFT_LOW, '#c9b294');
  iron(LEFT_TOP, LEFT_LOW);
  portholes(ctx, LEFT_TOP, LEFT_LOW, 13);
  anchor(ctx);
  // The stem: the sharp lit edge the whole picture points up to.
  ink(ctx, boiled([TIP, { x: 622, y: 900 }, { x: 604, y: 1200 }, FOOT], boil, 0.8, 2), 15, '#0a0c12');
  ink(ctx, [{ x: TIP.x - 4, y: TIP.y + 8 }, { x: 618, y: 900 }, { x: 600, y: 1200 }, { x: FOOT.x - 4, y: FOOT.y }], 5, '#e8b98a', 0.9);
  rusticles(ctx, RIGHT_TOP, RIGHT_LOW, 16, 200);
  rusticles(ctx, LEFT_TOP, LEFT_LOW, 46, 100);
  const pipe = onSide(LEFT_TOP, LEFT_LOW, 0.1, 0.26);
  for (let i = 0; i < 7; i++) ink(ctx, [{ x: pipe.x - 34 + i * 11, y: pipe.y + 28 }, { x: pipe.x - 34 + i * 11 + 2, y: pipe.y + 80 + hash(i) * 110 }], 5, '#a8591f', 0.5);
  seabed(ctx, boil);
  lampLight(ctx, p);
}
