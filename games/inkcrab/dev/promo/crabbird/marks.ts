import { makeCanvas, Pen, type Pt } from '../../../src/art/pen';
import { blob, inside, MOON_RIM, NIGHT_INK, seeded, soft, spline, trace } from './art/paint';
import { VIDEO } from '../short';
import { CTA, type EyePair, eyeCreepAt, eyeRiseAt, type Feather } from './story';

/** The story's marks: the ink impact, loose feathers, eyes in the dark, the ink wash and the arrow. */

const TAU = Math.PI * 2;

/** One big pen-and-ink burst at the snap: long black spikes, a white heart, flung drops. `u` 0 .. 1 over its life. */
export function drawImpact(ctx: CanvasRenderingContext2D, x: number, y: number, u: number, boil: number): void {
  if (u <= 0 || u >= 1) return;
  const grow = 1 - (1 - Math.min(1, u * 3.4)) ** 3;
  const fade = 1 - Math.max(0, (u - 0.5) / 0.5);
  const star = (r0: number, r1: number, seed: number): Pt[] => {
    const rnd = seeded(seed);
    const n = 15;
    return Array.from({ length: n * 2 }, (_, i) => {
      const a = (i / (n * 2)) * TAU + (rnd() - 0.5) * 0.12;
      const r = (i % 2 === 0 ? r1 * (0.62 + rnd() * 0.5) : r0 * (0.8 + rnd() * 0.4)) * grow;
      return { x: x + Math.cos(a) * r, y: y + Math.sin(a) * r * 0.86 };
    });
  };
  ctx.save();
  ctx.globalAlpha = fade;
  ctx.fillStyle = NIGHT_INK;
  trace(ctx, star(150, 400, 11 + boil));
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  trace(ctx, star(96, 250, 21 + boil));
  ctx.fill();
  ctx.fillStyle = '#ffd25e';
  trace(ctx, star(54, 140, 31 + boil));
  ctx.fill();
  const rnd = seeded(41 + boil);
  ctx.fillStyle = NIGHT_INK;
  for (let i = 0; i < 26; i++) {
    const a = rnd() * TAU;
    const r = (240 + rnd() * 280) * grow;
    ctx.beginPath();
    ctx.arc(x + Math.cos(a) * r, y + Math.sin(a) * r * 0.86, 3 + rnd() * 11, 0, TAU);
    ctx.fill();
  }
  ctx.restore();
}

/** A loose feather: a soft curved vane with fine barbs, a bare quill, downy at the root. */
export function drawFeather(ctx: CanvasRenderingContext2D, f: Feather, alpha = 1): void {
  const s = f.size;
  ctx.save();
  ctx.translate(f.x, f.y);
  ctx.rotate(f.angle);
  ctx.globalAlpha = alpha;
  const shaft = (u: number): Pt => ({ x: -s + 2 * s * u, y: -s * 0.14 * Math.sin(Math.PI * u) });
  const side = (k: number, w: number): Pt[] => Array.from({ length: 11 }, (_, i) => {
    const u = 0.1 + (i / 10) * 0.9;
    const p = shaft(u);
    return { x: p.x + k * 0.1 * s, y: p.y + k * w * s * Math.sin(Math.PI * Math.min(1, u * 1.04)) ** 0.7 };
  });
  const shape = [...side(-1, 0.3), ...side(1, 0.2).reverse()];
  const g = ctx.createLinearGradient(0, -s * 0.34, 0, s * 0.24);
  g.addColorStop(0, f.pale ? '#fffaf0' : '#c4a486');
  g.addColorStop(0.55, f.pale ? '#ded9e6' : '#7a5a42');
  g.addColorStop(1, f.pale ? '#8f90bc' : '#32211f');
  ctx.fillStyle = g;
  trace(ctx, shape);
  ctx.fill();
  ctx.lineCap = 'round';
  ctx.strokeStyle = f.pale ? 'rgba(90,90,140,0.5)' : 'rgba(30,18,24,0.6)';
  ctx.lineWidth = 0.9;
  for (let i = 1; i < 12; i++) {
    const u = 0.14 + (i / 12) * 0.8;
    const p = shaft(u);
    for (const [k, w] of [[-1, 0.28], [1, 0.18]] as const) {
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(p.x + s * 0.16, p.y + k * w * s * Math.sin(Math.PI * u) ** 0.7);
      ctx.stroke();
    }
  }
  ctx.strokeStyle = f.pale ? '#6d6f9e' : '#1c1218';
  ctx.lineWidth = Math.max(1.6, s * 0.035);
  ctx.beginPath();
  ctx.moveTo(-s * 1.28, s * 0.04);
  for (let i = 0; i <= 10; i++) {
    const p = shaft(i / 10);
    ctx.lineTo(p.x, p.y);
  }
  ctx.stroke();
  ctx.restore();
}

/** A pair of eyes rising on stalks out of the dark, with just enough of the crab behind them. */
export function drawEyePair(ctx: CanvasRenderingContext2D, p: EyePair, t: number, boil: number): void {
  const rise = eyeRiseAt(p, t);
  if (rise <= 0) return;
  const s = p.size;
  const toCentre = p.x < 540 ? 1 : -1;
  const x = p.x + eyeCreepAt(p, t) * toCentre;
  const y = p.y + 8 * s * Math.sin(t * 1.9 + p.x);
  const stalk = 118 * s * rise;
  // The shield and the arch of a leg, barely there: moonlight on the rims.
  ctx.save();
  ctx.globalAlpha = 0.9 * rise;
  const shell = spline([{ x: -116, y: 30 }, { x: -74, y: -18 }, { x: 0, y: -34 }, { x: 74, y: -18 }, { x: 116, y: 30 }, { x: 0, y: 66 }], 6, true).map((q) => ({ x: x + q.x * s, y: y + q.y * s }));
  ctx.fillStyle = '#0a0718';
  trace(ctx, shell);
  ctx.fill();
  inside(ctx, shell, () => soft(ctx, spline([{ x: x - 96 * s, y: y + 4 * s }, { x: x, y: y - 30 * s }, { x: x + 96 * s, y: y + 4 * s }], 6), 12 * s, '#ff7a3c', 0.55));
  for (const side of [-1, 1]) {
    const arch = spline([{ x: x + side * 90 * s, y: y + 10 * s }, { x: x + side * 190 * s, y: y - 74 * s }, { x: x + side * 276 * s, y: y + 60 * s }], 8);
    ctx.strokeStyle = '#0a0718';
    ctx.lineWidth = 20 * s;
    ctx.lineCap = 'round';
    trace(ctx, arch, false);
    ctx.stroke();
    soft(ctx, arch.map((q) => ({ x: q.x, y: q.y - 8 * s })), 6 * s, '#ff8c52', 0.6);
  }
  ctx.restore();
  for (const side of [-1, 1]) {
    const bx = x + side * 15 * s;
    const ex = bx + side * 22 * s + 4 * Math.sin(t * 2.3 + side + p.y);
    const ey = y - 14 * s - stalk;
    const pen = new Pen(ctx, 5100 + Math.round(p.x) + side + boil * 3, 0.5);
    pen.stroke([{ x: bx, y: y - 12 * s }, { x: (bx + ex) / 2, y: (y + ey) / 2 }, { x: ex, y: ey }], 15 * s, '#2b1830', rise, false);
    pen.stroke([{ x: bx, y: y - 12 * s }, { x: (bx + ex) / 2, y: (y + ey) / 2 }, { x: ex, y: ey }], 5 * s, '#ff8c52', 0.75 * rise, false);
    blob(ctx, ex, ey, 62 * s, '#ffcf8a', 0.42 * rise);
    ctx.save();
    ctx.globalAlpha = rise;
    ctx.fillStyle = '#ffe9b8';
    ctx.beginPath();
    ctx.arc(ex, ey, 19 * s, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#0a0610';
    ctx.beginPath();
    ctx.arc(ex + toCentre * 2.5 * s, ey + 1, 13 * s, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(ex + toCentre * -3 * s, ey - 5 * s, 4.2 * s, 0, TAU);
    ctx.fill();
    ctx.restore();
  }
}

/** What moves in a quiet sky: a thin cloud sliding over the moon, a few stars twinkling. */
export function drawDrift(ctx: CanvasRenderingContext2D, px: number, py: number, time: number): void {
  blob(ctx, 40 + px + 62 * time, 770 + py, 340, '#46599f', 0.26, 60);
  blob(ctx, 200 + px + 44 * time, 640 + py, 300, '#51649f', 0.18, 44);
  const rnd = seeded(71);
  for (let i = 0; i < 22; i++) {
    const [x, y, phase] = [rnd() * 1080, rnd() * 620, rnd() * TAU];
    const a = Math.max(0, Math.sin(time * 3.4 + phase));
    ctx.fillStyle = `rgba(232,240,255,${0.8 * a})`;
    ctx.beginPath();
    ctx.arc(x + px, y + py, 2.2, 0, TAU);
    ctx.fill();
  }
}

// ---------------------------------------------------------------- the ink wash

interface Blot {
  readonly x: number;
  readonly y: number;
  readonly r: number;
  readonly from: number;
  readonly edge: readonly number[];
}

const BLOTS: readonly Blot[] = (() => {
  const rnd = seeded(61);
  const spots = [[540, 960, 1500, 0.34], [220, 480, 620, 0], [860, 340, 560, 0.06], [140, 1320, 640, 0.1], [920, 1200, 680, 0.04], [520, 1700, 700, 0.16], [560, 640, 520, 0.12], [80, 880, 520, 0.2], [1020, 780, 500, 0.22]] as const;
  return spots.map(([x, y, r, from]) => ({ x, y, r, from, edge: Array.from({ length: 22 }, () => 0.86 + rnd() * 0.28) }));
})();

function blotPath(ctx: CanvasRenderingContext2D, b: Blot, r: number): void {
  const pts = b.edge.map((k, i) => {
    const a = (i / b.edge.length) * TAU;
    return { x: b.x + Math.cos(a) * r * k, y: b.y + Math.sin(a) * r * k };
  });
  const line = spline(pts, 4, true);
  line.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
  ctx.closePath();
}

const blotR = (b: Blot, u: number, grow: number): number => {
  const k = Math.max(0, (u - b.from) / (1 - b.from));
  return b.r * (1 - (1 - k) ** 2) * grow;
};

/** Paints `over` onto ctx through spreading ink blots, a dark ink edge running ahead of it. */
export function inkWash(ctx: CanvasRenderingContext2D, over: HTMLCanvasElement, mask: CanvasRenderingContext2D, u: number): void {
  const { width: W, height: H } = VIDEO;
  ctx.save();
  ctx.fillStyle = '#080a1c';
  ctx.beginPath();
  for (const b of BLOTS) blotPath(ctx, b, blotR(b, u, 1.1));
  ctx.fill();
  ctx.restore();
  mask.save();
  mask.setTransform(1, 0, 0, 1, 0, 0);
  mask.globalCompositeOperation = 'destination-in';
  mask.fillStyle = '#000';
  mask.beginPath();
  for (const b of BLOTS) blotPath(mask, b, blotR(b, u, 1));
  mask.fill();
  mask.restore();
  ctx.drawImage(over, 0, 0, W, H);
}

export function makeLayer(): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } {
  const layer = makeCanvas(VIDEO.width, VIDEO.height);
  layer.ctx.imageSmoothingQuality = 'high';
  return layer;
}

// ---------------------------------------------------------------- the invitation's arrow

/** A hand-inked arrow, drawn on as it fades in, curving down-left to the channel name. */
export function drawArrow(ctx: CanvasRenderingContext2D, alpha: number, boil: number): void {
  if (alpha <= 0) return;
  const line = spline(CTA.arrow, 12);
  const tip = line[line.length - 1]!;
  const before = line[line.length - 6]!;
  const a = Math.atan2(tip.y - before.y, tip.x - before.x);
  const head = (side: number): Pt => ({ x: tip.x + Math.cos(a + side * 2.5) * 78, y: tip.y + Math.sin(a + side * 2.5) * 78 });
  ctx.save();
  ctx.globalAlpha = alpha;
  for (const [w, colour] of [[34, '#0d1230'], [19, '#ff5a3c']] as const) {
    const pen = new Pen(ctx, 5300 + boil * 7, 1.6);
    pen.stroke(line, w, colour, 1, false);
    // Two firm, blunt strokes for the head, the pen pressed down.
    ctx.strokeStyle = colour;
    ctx.lineWidth = w * 0.86;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    trace(ctx, [head(-1), { x: tip.x + boil * 0.6, y: tip.y }, head(1)], false);
    ctx.stroke();
  }
  ctx.restore();
}
