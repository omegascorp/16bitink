import { lerp, ramp } from '../short';
import { drawSprite, type Pt } from '../sprites';
import { COLLAR_BOX } from './bearStand';
import { type Cast, DAY_W, GROUND_Y } from './cast';
import { drawBearGhost, drawCalendar, drawCircleMark, drawLength, drawRings, drawUnits, drawWaves } from './marks';
import { ANTENNA_TIP } from './person';
import { drawPythonBody, drawPythonHead, type Lay, lengths, outlineOf } from './python';
import {
  bearLabel, bulgeAt, calendarAt, collarRing, CUT, FOOT_AT, INSIDE_AT, insideKick, insideShown, IT_AT, jungleZoom, lengthBar, signalPan,
  stillSignal, wavePhase, wrap,
} from './story';

/**
 * The field shots, side on in the forest: the researcher and the collared
 * bear; the signal leading to the python with a bear-shaped bulge; and the
 * waiting, the bulge going down while the calendar flies and the signal
 * still comes. World px: x along the forest floor, y up from it negative.
 */
interface Camera {
  readonly x: number;
  readonly zoom: number;
  /** Where the ground line lands on screen. */
  readonly ground: number;
}

const toScreen = (c: Camera, p: Pt): Pt => ({ x: (p.x - c.x) * c.zoom + 540, y: p.y * c.zoom + c.ground });

const MAN_K = 1.25;
const BEAR_K = 1.6;
const MAN_X = 250;
const BEAR_X = 840;

function drawForest(ctx: CanvasRenderingContext2D, forest: HTMLCanvasElement, c: Camera): void {
  const x = -Math.min(DAY_W - 1080, Math.max(0, (c.x - 400) * 0.35));
  ctx.drawImage(forest, x, c.ground - GROUND_Y);
  if (c.ground > GROUND_Y) ctx.drawImage(forest, 0, GROUND_Y - 200, forest.width, 200, x, c.ground - 200, forest.width, 200);
  ctx.fillStyle = '#2c2418';
  ctx.fillRect(0, c.ground + (forest.height - GROUND_Y), 1080, 2000);
}

function drawMan(ctx: CanvasRenderingContext2D, cast: Cast, c: Camera, x: number, boil: number): Pt {
  const k = MAN_K * c.zoom;
  const o = toScreen(c, { x, y: -192 * MAN_K });
  drawSprite(ctx, cast.researcher, boil, { x: o.x, y: o.y, scale: k });
  return { x: o.x + ANTENNA_TIP.x * k, y: o.y + ANTENNA_TIP.y * k };
}

function grade(ctx: CanvasRenderingContext2D, alpha: number): void {
  const v = ctx.createRadialGradient(540, 960, 420, 540, 960, 1200);
  v.addColorStop(0, 'rgba(4,10,8,0)');
  v.addColorStop(1, `rgba(4,10,8,${alpha})`);
  ctx.fillStyle = v;
  ctx.fillRect(0, 0, 1080, 1920);
}

// ---------------------------------------------------------------- the researcher and the bear

export function drawJungle(ctx: CanvasRenderingContext2D, cast: Cast, t: number, boil: number): void {
  const u = wrap(t);
  const zoom = jungleZoom(t);
  const c: Camera = { x: 560 + 30 * ramp(u, CUT.jungle, CUT.signal), zoom, ground: GROUND_Y + 40 * (zoom - 1) * 4 };
  drawForest(ctx, cast.day, c);
  const tip = drawMan(ctx, cast, c, MAN_X, boil);
  const k = BEAR_K * zoom;
  const o = toScreen(c, { x: BEAR_X, y: -140 * BEAR_K });
  drawSprite(ctx, cast.bear, boil, { x: o.x, y: o.y, scale: k, rotation: Math.PI, flip: -1 });
  const box = { x: o.x - COLLAR_BOX.x * k, y: o.y + COLLAR_BOX.y * k };
  grade(ctx, 0.55);
  drawWaves(ctx, box, tip, wavePhase(t), 0.9);
  drawCircleMark(ctx, box, 62 * zoom, collarRing(t));
  drawUnits(ctx, '23 kg', '51 lb', { x: o.x + 20, y: 640 }, 92, bearLabel(t));
}

// ---------------------------------------------------------------- the snake with the bear inside

/** The python lying on the forest floor, head to the right, 7 m long (1920 world px: the researcher is 1.75 m). */
const HEAD_X = 2300;
const TAIL_X = 380;
const BASE = 100;
const BULGE_S = 880;

/** The bear inside: its rump nearest the snake's head, its body, its head bump further back. Relative to BULGE_S, px → share of the bulge's height. */
const BEAR_SHAPE: readonly (readonly [number, number])[] = [
  [-230, 0], [-160, 0.78], [-90, 1], [0, 0.96], [80, 0.84], [125, 0.62], [170, 0.66], [215, 0.42], [270, 0],
];
/** Floor px in front of the ground line where the snake lies (it lies on the floor, not on the horizon). */
const LIE_Y = 110;

function shapeAt(off: number): number {
  if (off <= BEAR_SHAPE[0]![0] || off >= BEAR_SHAPE[BEAR_SHAPE.length - 1]![0]) return 0;
  for (let i = 1; i < BEAR_SHAPE.length; i++) {
    const [o1, h1] = BEAR_SHAPE[i]!;
    const [o0, h0] = BEAR_SHAPE[i - 1]!;
    if (off <= o1) return h0 + (h1 - h0) * (1 - Math.cos(Math.PI * ((off - o0) / (o1 - o0)))) * 0.5;
  }
  return 0;
}

/** The lay: `bulge` 0..1 (a whole bear .. digested), `collar` the lump of the collar left behind. */
export function lyingPython(bulge: number, collar: number, height = 300): Lay {
  const n = 480;
  const xs = Array.from({ length: n + 1 }, (_, i) => HEAD_X - ((HEAD_X - TAIL_X) * i) / n);
  const s = xs.map((x) => HEAD_X - x);
  const raw = s.map((d) => {
    const tail = d > 1350 ? 1 - 0.85 * ((d - 1350) / 570) ** 1.4 : 1;
    const bear = BASE + (height - BASE) * shapeAt(d - BULGE_S) * bulge;
    const lump = Math.exp(-(((d - BULGE_S - 120) / 40) ** 2)) * 52 * collar;
    return Math.max(BASE * tail, bear, BASE + lump);
  });
  // Smoothed, so the skin swells and narrows gently.
  const widths = raw.map((_, i) => {
    const near = raw.slice(Math.max(0, i - 16), i + 17);
    return near.reduce((a, b) => a + b, 0) / near.length;
  });
  const spine = xs.map((x) => ({ x, y: LIE_Y + 6 * Math.sin(x * 0.006) }));
  return { spine, widths, base: BASE, headRight: true };
}

const toLay = (c: Camera, l: Lay): Lay => ({
  spine: l.spine.map((p) => toScreen(c, p)), widths: l.widths.map((w) => w * c.zoom), base: l.base * c.zoom, headRight: true,
});

/** Where the bulge's middle is, world px. */
const bulgeAtWorld = (l: Lay): Pt => {
  const s = lengths(l.spine);
  const i = s.findIndex((d) => d >= BULGE_S);
  return { x: l.spine[i]!.x, y: l.spine[i]!.y };
};

export function drawSignal(ctx: CanvasRenderingContext2D, cast: Cast, t: number, boil: number): void {
  const u = wrap(t);
  const out = ramp(u, FOOT_AT - 0.12, FOOT_AT + 0.5);
  const kick = insideKick(t);
  const zoom = lerp(lerp(1, 1.2, signalPan(t)), 0.46, out) * (1 + 0.14 * kick);
  const c: Camera = { x: lerp(lerp(560, 1420, signalPan(t)), 1250, out), zoom, ground: lerp(lerp(GROUND_Y, 1040, signalPan(t)), 1060, out) };
  drawForest(ctx, cast.day, c);
  const tip = drawMan(ctx, cast, c, MAN_X - 120, boil);
  const world = lyingPython(1, 0);
  const lay = toLay(c, world);
  drawPythonBody(ctx, cast.python, boil, lay);
  drawPythonHead(ctx, cast.python, boil, lay, 'shut');
  grade(ctx, 0.5);
  const mid = toScreen(c, bulgeAtWorld(world));
  ctx.save();
  const clip = outlineOf(lay);
  ctx.beginPath();
  clip.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
  ctx.closePath();
  ctx.clip();
  drawBearGhost(ctx, { x: mid.x - 10 * zoom, y: mid.y + 6 * zoom }, 1.3 * zoom, insideShown(t) * (1 - 0.5 * out));
  ctx.restore();
  if (u < INSIDE_AT) drawWaves(ctx, mid, tip, wavePhase(t), 0.9 * (1 - ramp(u, INSIDE_AT - 0.3, INSIDE_AT)));
  drawRings(ctx, mid, u - INSIDE_AT + 0.03, 180 * zoom, 1 - 0.6 * out);
  const a = toScreen(c, { x: TAIL_X, y: -240 });
  const b = toScreen(c, { x: HEAD_X + 70, y: -240 });
  drawLength(ctx, a, b, lengthBar(t));
  drawUnits(ctx, '7 m', '23 ft', { x: 540, y: a.y - 170 }, 120, lengthBar(t));
}

// ---------------------------------------------------------------- waiting

export function drawWait(ctx: CanvasRenderingContext2D, cast: Cast, t: number, boil: number): void {
  const u = wrap(t);
  const c: Camera = { x: 1330, zoom: 0.62 + 0.04 * ramp(u, CUT.wait, CUT.vet), ground: 1160 };
  drawForest(ctx, cast.dusk, { ...c, x: 400 });
  drawMan(ctx, cast, { ...c, x: c.x - 120 }, 450, boil);
  const bulge = bulgeAt(t);
  const world = lyingPython(bulge, 1 - bulge);
  const lay = toLay(c, world);
  drawPythonBody(ctx, cast.python, boil, lay);
  drawPythonHead(ctx, cast.python, boil, lay, 'shut');
  grade(ctx, 0.6);
  const pages = calendarAt(t);
  drawCalendar(ctx, { x: 790, y: 760 }, 230, 7 + Math.floor(pages), pages % 1, 1);
  const lump = toScreen(c, { x: HEAD_X - BULGE_S - 120, y: LIE_Y });
  drawRings(ctx, lump, u - IT_AT + 0.05, 170, stillSignal(t));
}
