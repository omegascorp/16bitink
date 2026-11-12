import { route } from '../krait/path';
import { ramp } from '../short';
import type { Pt } from '../sprites';
import { RETIC } from '../pythonbear/reticArt';
import { FLAT, type Cast } from './cast';
import { COBRA } from './cobraArt';
import { drawHeadOn, drawLaid, type Lay, outline, strokeLine } from './lay';
import { drawBite, drawClock, drawLength, drawTag } from './marks';
import { drawMonitor } from './monitor';
import {
  BIT_AT, clock2h, cockAt, THEN_AT, TWO_AT, MONITOR_AT, UP_END, cobraLabel, crawlOut, CUT, drawOff, jawsOpen, lateAt, monitorIn, monitorLabel, placeLabel, pythonLabel, stir, strikeAt,
  WAITED_AT, wrap,
} from './story';

/**
 * The channel's edge at Sungei Buloh, one shot from the bite to the
 * monitor's arrival: the king cobra and the shorter python side by side in
 * the water (their lengths on screen), the bite on "bit", the python
 * crawling out onto the mud and the cobra drawing off to wait, head up; the
 * clock running two hours round as the light goes late and the python's
 * wriggle dies away; then a water monitor walking in over the mud.
 */
const PY_W = 82;
const PY_LEN = 800;
const CO_W = 100;
const CO_LEN = 1500;

const PY_PATH = route([
  { x: -700, y: 1228 }, { x: 200, y: 1226 }, { x: 640, y: 1220 }, { x: 860, y: 1238 }, { x: 960, y: 1300 }, { x: 950, y: 1386 },
  { x: 760, y: 1450 }, { x: 500, y: 1470 }, { x: 300, y: 1455 }, { x: 140, y: 1420 },
], 2);
const CO_PATH = route([{ x: -1300, y: 1150 }, { x: -100, y: 1144 }, { x: 300, y: 1150 }, { x: 700, y: 1162 }], 2);

/** Where along its path each head is. */
const PY_HEAD = { swim: 1520, out: 2575 } as const;
const CO_HEAD = { from: 1520, bite: 1640, wait: 1460 } as const;

function pythonHeadAt(t: number): number {
  const u = wrap(t);
  return PY_HEAD.swim + 40 * ramp(u, CUT.flat, BIT_AT) + (PY_HEAD.out - PY_HEAD.swim - 40) * crawlOut(t);
}

function cobraHeadAt(t: number): number {
  const u = wrap(t);
  return CO_HEAD.from + (CO_HEAD.bite - CO_HEAD.from) * ramp(u, CUT.flat, BIT_AT - 0.1) - (CO_HEAD.bite - CO_HEAD.wait) * drawOff(t);
}

/** A body laid back along a path from its head, `bend` pushing its front, `wave` a wriggle across it. */
function layAlong(path: ReturnType<typeof route>, head: number, len: number, w: number, bend: Pt, wave: (s: number) => number): Lay {
  const n = Math.ceil(len / 4);
  const spine: Pt[] = [];
  const widths: number[] = [];
  for (let i = 0; i <= n; i++) {
    const s = (i / n) * len;
    const p = path.at(head - s);
    const h = path.heading(head - s);
    const f = Math.max(0, 1 - s / 260) ** 2;
    const off = wave(s);
    spine.push({ x: p.x + bend.x * f - Math.sin(h) * off, y: p.y + bend.y * f + Math.cos(h) * off });
    const tail = s / len;
    widths.push(w * (tail < 0.65 ? 1 : 1 - 0.88 * ((tail - 0.65) / 0.35) ** 1.3) * (s < 30 ? 0.92 + 0.08 * (s / 30) : 1));
  }
  return { spine, widths, base: w, headRight: Math.cos(path.heading(head)) >= 0 };
}

/** The water over the part of a swimming body that lies in the channel: its lower half tinted under, ripples at the waterline. */
function inWater(ctx: CanvasRenderingContext2D, l: Lay, water: string): void {
  ctx.save();
  ctx.beginPath();
  ctx.rect(-200, 0, 1500, FLAT.bank - 6);
  ctx.clip();
  ctx.beginPath();
  outline(l).forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
  ctx.closePath();
  ctx.clip();
  strokeLine(ctx, l.spine.map((p, i) => ({ x: p.x, y: p.y + l.widths[i]! * 0.3 })), l.base * 0.55, water, 0.62);
  ctx.restore();
  ctx.save();
  ctx.beginPath();
  ctx.rect(-200, 0, 1500, FLAT.bank - 6);
  ctx.clip();
  for (let i = 6; i < l.spine.length - 6; i += 9) {
    const p = l.spine[i]!;
    const y = p.y + l.widths[i]! * 0.08;
    strokeLine(ctx, [{ x: p.x - 18, y }, { x: p.x + 14, y: y + 1 }], 3, '#f4f8f0', 0.55);
  }
  ctx.restore();
}

/**
 * The camera, pushed in about twice on the action and panning with it: the
 * bite, the python on the mud with the cobra waiting by it, the python lying
 * still, the monitor arriving. Keys: time, the shore point at the screen's
 * centre, zoom.
 */
const CAM: readonly (readonly [number, number, number, number])[] = [
  [CUT.flat, 400, 1170, 2],
  [BIT_AT + 0.3, 470, 1190, 2],
  [THEN_AT, 450, 1250, 1.75],
  [WAITED_AT + 0.4, 420, 1300, 1.7],
  [TWO_AT, 400, 1370, 1.85],
  [MONITOR_AT - 0.1, 470, 1430, 1.8],
  [MONITOR_AT + 0.6, 660, 1480, 1.75],
  [UP_END, 720, 1500, 1.75],
  [CUT.face, 730, 1500, 1.75],
];
const CENTRE = { x: 540, y: 1130 } as const;

export interface Camera {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

export function cameraAt(t: number): Camera {
  const u = wrap(t);
  let i = 0;
  while (i < CAM.length - 2 && u > CAM[i + 1]![0]) i++;
  const [t0, x0, y0, z0] = CAM[i]!;
  const [t1, x1, y1, z1] = CAM[i + 1]!;
  const k = ramp(u, t0, t1);
  return { x: x0 + (x1 - x0) * k, y: y0 + (y1 - y0) * k, z: z0 + (z1 - z0) * k };
}

/** Where a shore point lands on screen. */
const onScreen = (c: Camera, p: Pt): Pt => ({ x: CENTRE.x + (p.x - c.x) * c.z, y: CENTRE.y + (p.y - c.y) * c.z });
const clampTo = (p: Pt, x0: number, x1: number, y0: number, y1: number): Pt => ({ x: Math.min(x1, Math.max(x0, p.x)), y: Math.min(y1, Math.max(y0, p.y)) });

export function drawFlat(ctx: CanvasRenderingContext2D, cast: Cast, t: number, boil: number): void {
  const u = wrap(t);
  const late = lateAt(t);
  const cam = cameraAt(t);
  ctx.save();
  ctx.translate(CENTRE.x, CENTRE.y);
  ctx.scale(cam.z, cam.z);
  ctx.translate(-cam.x, -cam.y);
  ctx.drawImage(cast.day, 0, 0, FLAT.width, FLAT.height);
  if (late > 0) {
    ctx.save();
    ctx.globalAlpha = late;
    ctx.drawImage(cast.late, 0, 0, FLAT.width, FLAT.height);
    ctx.restore();
  }
  const water = late > 0.5 ? '#cdbf98' : '#a9c2c0';
  // The cobra lies beyond the python, so it goes down first: the python's body hides its chin, and in the
  // bite its dropped jaw, with the upper jaw over the python's back. It draws its head up, strikes with the
  // jaws open on "bit", shuts them on the python, then draws off with its head up, waiting.
  const k = strikeAt(t);
  const cock = cockAt(t);
  const co = layAlong(CO_PATH, cobraHeadAt(t), CO_LEN, CO_W, { x: 34 * k - 10 * cock, y: 10 * k - 40 * cock }, (s) => 7 * Math.sin(s * 0.018 - u * 2.2));
  drawLaid(ctx, cast.cobra, boil, co, COBRA.line, 0.3);
  inWater(ctx, co, water);
  const lift = 0.4 * ramp(u, BIT_AT + 0.6, WAITED_AT);
  drawHeadOn(ctx, jawsOpen(t) ? cast.cobraHead.strike : cast.cobraHead.shut, boil, co, lift * (1 - k) + 0.3 * cock - 0.22 * k);
  // The python, bitten, crawling out; its wriggle dying away over the wait.
  const st = stir(t);
  const py = layAlong(PY_PATH, pythonHeadAt(t), PY_LEN, PY_W, { x: 0, y: 0 }, (s) => (10 * st + 2) * Math.sin(s * 0.03 - u * 7) * Math.min(1, s / 120));
  drawLaid(ctx, cast.python, boil, py, RETIC.line, 0.5);
  inWater(ctx, py, water);
  drawHeadOn(ctx, cast.pythonHead, boil, py, 0.05 * st);
  // The burst where the fangs went in: on the python's back under the cobra's snout.
  const snout = co.spine[0]!;
  const fade = u > BIT_AT - 0.05 && u < BIT_AT + 0.45 ? 1 - (u - BIT_AT + 0.05) / 0.5 : 0;
  drawBite(ctx, { x: snout.x + 160, y: snout.y + 30 }, fade, Math.PI * 0.28, 0.6);
  // The monitor walking in over the mud from the right, and stopping by the python.
  const m = monitorIn(t);
  if (m > 0) {
    drawMonitor(ctx, { x: 1250 - 330 * m, y: 1660 }, 3, -1, { gait: 2.6 * m, lift: 0.14, tongue: m >= 1 ? Math.max(0, Math.sin((u % 0.9) / 0.9 * Math.PI * 2)) : 0, sway: u * 1.3 }, boil);
  }
  ctx.restore();
  // The lengths beside their animals, in screen space.
  const coHead = onScreen(cam, co.spine[0]!);
  drawLength(ctx, 'king cobra', '2.5 m', '8.2 ft', clampTo({ x: coHead.x + 40, y: coHead.y - 250 }, 190, 890, 720, 1100), cobraLabel(t));
  const mid = onScreen(cam, py.spine[Math.floor(py.spine.length * 0.3)]!);
  drawLength(ctx, 'python', '1.5 m', '4.9 ft', clampTo({ x: mid.x, y: mid.y + 260 }, 190, 890, 720, 1560), pythonLabel(t));
  const mon = onScreen(cam, { x: 1250 - 330 * m + 60, y: 1500 });
  drawLength(ctx, 'water monitor', '1.5 m', '4.9 ft', clampTo({ x: mon.x, y: mon.y - 120 }, 240, 840, 720, 1100), monitorLabel(t));
  drawTag(ctx, 'Singapore, 2021', { x: 540, y: 600 }, 56, placeLabel(t));
  const c = clock2h(t);
  drawClock(ctx, { x: 790, y: 720 }, 105, c.hand, c.show, '+2 hours');
}
