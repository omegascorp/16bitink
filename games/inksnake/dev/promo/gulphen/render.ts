import { makeDraw } from '../../../src/art/kit';
import { INK, RED } from '../../../src/art/palette';
import { CORN } from '../../../src/art/snakes/corn';
import { drawTextLine } from '../captions';
import { ramp, type Short, VIDEO } from '../short';
import { bakeSprite, bakeStrip, boilAt, drawBody, drawBodyShadow, drawSprite, type Pt, type Sprite, type Strip, taper } from '../sprites';
import { renderGulpHenAudio } from './audio';
import { drawYard, paintYard, type Yard } from './ground';
import { HEN_BODY, HEN_FEATHER, HEN_HEAD, HEN_LEG, HEN_TAIL, JOINTS, PER_ART } from './henArt';
import { pathAt } from './path';
import { JAW_ART, SNAKE_INSIDE, SNAKE_LOWER, SNAKE_UPPER } from './snakeSide';
import {
  alarmAt, biggerAt, BODY_LEN, CAPTIONS, captionAlpha, combBump, CREDIT_TEXT, feathersAt, groundAt, type HenPose, henAt, headU, type JawFrame, jawsAt, lumpSize, LOOP_S,
  mealRim, NECK_W, scoreAt, SCORE_TEXT, shakeAt, sideView, snakeEye, swellBottom, swellTop, tongue, toScreen, type View, viewAt, wrap,
} from './story';

/** Draws the corn snake and the hen short (story.ts has the beats). */

interface Cast {
  readonly yard: Yard;
  readonly strip: Strip;
  readonly head: Sprite;
  readonly tongue: Sprite;
  readonly upper: Readonly<Record<'open' | 'squeeze' | 'happy', Sprite>>;
  readonly lower: Sprite;
  readonly roof: Sprite;
  readonly floor: Sprite;
  readonly henBody: Sprite;
  readonly henTail: Sprite;
  readonly henCalm: Sprite;
  readonly henAlarm: Sprite;
  readonly henLeg: Sprite;
  readonly feather: Sprite;
}

function bakeCast(): Cast {
  return {
    yard: paintYard(),
    strip: bakeStrip(CORN, 9),
    head: bakeSprite(CORN.head, 'shut', 9, 300),
    tongue: bakeSprite(CORN.tongue, 'flick', 9, 320),
    upper: {
      open: bakeSprite(SNAKE_UPPER, 'open', 7, 340),
      squeeze: bakeSprite(SNAKE_UPPER, 'squeeze', 7, 340),
      happy: bakeSprite(SNAKE_UPPER, 'happy', 7, 340),
    },
    lower: bakeSprite(SNAKE_LOWER, 'jaw', 7, 350),
    roof: bakeSprite(SNAKE_INSIDE, 'roof', 7, 360),
    floor: bakeSprite(SNAKE_INSIDE, 'floor', 7, 360),
    henBody: bakeSprite(HEN_BODY, 'body', 7, 400),
    henTail: bakeSprite(HEN_TAIL, 'tail', 7, 410),
    henCalm: bakeSprite(HEN_HEAD, 'calm', 7, 420),
    henAlarm: bakeSprite(HEN_HEAD, 'alarm', 7, 420),
    henLeg: bakeSprite(HEN_LEG, 'leg', 7, 430),
    feather: bakeSprite(HEN_FEATHER, 'feather', 8, 440),
  };
}

// ---------------------------------------------------------------- the snake

interface Axis {
  /** The way the head points, and the side that's up on screen. */
  readonly e: Pt;
  readonly up: Pt;
}

const axisOf = (heading: number): Axis => {
  const e = { x: Math.cos(heading), y: Math.sin(heading) };
  return { e, up: { x: -e.y, y: e.x } };
};

const along = (p: Pt, a: Axis, forward: number, up: number): Pt => ({ x: p.x + a.e.x * forward + a.up.x * up, y: p.y + a.e.y * forward + a.up.y * up });

/** What the side-on head needs of the neck behind it. */
interface HeadRoom {
  readonly reach: number;
  readonly top: number;
  readonly bottom: number;
  readonly side: number;
}

/** World units the skull stands above the upper hinge, and the chin below the lower. */
const SKULL_RISE = 80;
const CHIN_DROP = 52;

interface BodyShape {
  /** The path under the body, and how far the skin stands off it to each side, world units. */
  readonly spine: readonly Pt[];
  readonly upper: readonly Pt[];
  readonly lower: readonly Pt[];
  readonly widths: readonly number[];
  /** Whether the body is swollen here (it gets its own contour: the strip's lies outside the clip). */
  readonly swollen: readonly boolean[];
}

/** The body from `d0` behind the rim back to the tail, swollen round the meal to her outline. */
function bodyWorld(t: number, d0: number, head: HeadRoom): BodyShape {
  const h = headU(t);
  const rim = mealRim(t);
  const size = lumpSize(t);
  const spine: Pt[] = [];
  const upper: Pt[] = [];
  const lower: Pt[] = [];
  const widths: number[] = [];
  const swollen: boolean[] = [];
  for (let d = d0; d <= BODY_LEN; d += 4) {
    const p = pathAt(h - d);
    const a = rim - d;
    const thin = taper(d / BODY_LEN, 0.5, 0.03);
    // Behind the hinges the neck rises to meet the skull and chin, whose backs dissolve into it.
    const room = head.side * (1 - ramp(d, head.reach, head.reach + 200));
    const swellT = (swellTop(a, size) + combBump(a, size)) * thin;
    const swellB = swellBottom(a, size) * thin;
    const top = swellT + room * Math.max(0, head.top - swellT);
    const bottom = swellB + room * Math.max(0, head.bottom - swellB);
    const axis = axisOf(p.heading);
    spine.push(p);
    upper.push(along(p, axis, 0, top));
    lower.push(along(p, axis, 0, -bottom));
    // Laid wide enough for both sides, the strip is clipped to her outline, so the slices never fan.
    widths.push(2 * Math.max(top, bottom));
    swollen.push(Math.max(top, bottom) > (NECK_W / 2 + 3) * thin);
  }
  return { spine, upper, lower, widths, swollen };
}

function strokeRuns(ctx: CanvasRenderingContext2D, edge: readonly Pt[], on: readonly boolean[], width: number): void {
  ctx.beginPath();
  edge.forEach((p, i) => {
    if (!on[i]) return;
    if (i === 0 || !on[i - 1]) ctx.moveTo(p.x, p.y);
    else ctx.lineTo(p.x, p.y);
  });
  ctx.lineWidth = width;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.strokeStyle = INK;
  ctx.stroke();
}

/** Drawn under everything but the ground. */
function drawSnakeBody(ctx: CanvasRenderingContext2D, cast: Cast, t: number, boil: number, view: View, d0: number, head: HeadRoom): void {
  const body = bodyWorld(t, d0, head);
  const upper = body.upper.map((p) => toScreen(view, p));
  const lower = body.lower.map((p) => toScreen(view, p));
  const pose = {
    spine: body.spine.map((p) => toScreen(view, p)),
    widths: body.widths.map((w) => w * view.zoom),
    along: (NECK_W * view.zoom) / 24,
    offset: d0 / (NECK_W / 24),
  };
  drawBodyShadow(ctx, pose, NECK_W * view.zoom);
  ctx.save();
  ctx.beginPath();
  [...upper, ...[...lower].reverse()].forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
  ctx.closePath();
  ctx.clip();
  drawBody(ctx, cast.strip, boil, pose);
  ctx.restore();
  strokeRuns(ctx, upper, body.swollen, 6 * view.zoom);
  strokeRuns(ctx, lower, body.swollen, 7.5 * view.zoom);
}

interface JawPlace {
  /** The hinges' offsets from the axis. */
  readonly offU: number;
  readonly offL: number;
  readonly hingeU: Pt;
  readonly hingeL: Pt;
  readonly tipU: Pt;
  readonly tipL: Pt;
}

function jawPlace(t: number, j: JawFrame): JawPlace {
  const p = pathAt(headU(t));
  const a = axisOf(p.heading);
  // Shut, the lips meet back to the hinge; open, the jaws spring from the top and bottom of the neck.
  const hinge = 0.04 + 0.68 * Math.min(1, (j.tipTop + j.tipBottom) / 120);
  const offU = Math.max(j.hingeTop - NECK_W / 2, 0) + (NECK_W / 2) * hinge;
  const offL = Math.max(j.hingeBottom - NECK_W / 2, 0) + (NECK_W / 2) * hinge;
  return {
    offU,
    offL,
    hingeU: along(p, a, -j.reach, offU),
    hingeL: along(p, a, -j.reach, -offL),
    tipU: along(p, a, 0, j.tipTop),
    tipL: along(p, a, 0, -j.tipBottom),
  };
}

/** The inside of the mouth, behind whatever is in it. */
function drawMouth(ctx: CanvasRenderingContext2D, view: View, q: JawPlace, alpha: number): void {
  const [hu, hl, tu, tl] = [q.hingeU, q.hingeL, q.tipU, q.tipL].map((p) => toScreen(view, p)) as [Pt, Pt, Pt, Pt];
  const back = { x: (hu.x + hl.x) / 2, y: (hu.y + hl.y) / 2 };
  const front = { x: (tu.x + tl.x) / 2, y: (tu.y + tl.y) / 2 };
  const g = ctx.createLinearGradient(back.x, back.y, front.x, front.y);
  g.addColorStop(0, '#5a1a28');
  g.addColorStop(0.16, '#a03a4e');
  g.addColorStop(0.5, '#e08a96');
  g.addColorStop(1, '#f2b8bc');
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(hu.x, hu.y);
  ctx.lineTo(tu.x, tu.y);
  ctx.quadraticCurveTo(front.x + (back.x - front.x) * 0.28, front.y + (back.y - front.y) * 0.28, tl.x, tl.y);
  ctx.lineTo(hl.x, hl.y);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

/** One jaw sprite laid from hinge to tip, the skull's top towards the head's up. */
function drawJaw(ctx: CanvasRenderingContext2D, sprite: Sprite, boil: number, view: View, hinge: Pt, tip: Pt, alpha: number): void {
  const [h, e] = [toScreen(view, hinge), toScreen(view, tip)];
  const rotation = Math.atan2(e.y - h.y, e.x - h.x);
  drawSprite(ctx, sprite, boil, { x: h.x, y: h.y, rotation, flip: -1, scale: (Math.hypot(e.x - h.x, e.y - h.y) / JAW_ART), alpha });
}

function drawTopHead(ctx: CanvasRenderingContext2D, cast: Cast, t: number, boil: number, view: View, alpha: number): void {
  const p = pathAt(headU(t));
  const k = (NECK_W * view.zoom) / 22;
  const a = axisOf(p.heading);
  const c = toScreen(view, along(p, a, -20.2 * (NECK_W / 22), 0));
  drawSprite(ctx, cast.head, boil, { x: c.x, y: c.y, rotation: p.heading, scale: k, alpha });
}

function drawTongue(ctx: CanvasRenderingContext2D, cast: Cast, t: number, boil: number, view: View): void {
  const out = tongue(t);
  if (out <= 0) return;
  const p = pathAt(headU(t));
  const k = (NECK_W * view.zoom) / 22;
  const a = axisOf(p.heading);
  const tip = toScreen(view, along(p, a, -6 + 95 * out - 60, 0));
  drawSprite(ctx, cast.tongue, boil, { x: tip.x, y: tip.y, rotation: p.heading, scale: k * 0.9 });
}

// ---------------------------------------------------------------- the hen

/** Keeps what the jaws have passed from showing round the neck: only the side of the hinge the rim is on. */
function clipPastHinge(ctx: CanvasRenderingContext2D, view: View, q: JawPlace): void {
  const hinge = { x: (q.hingeU.x + q.hingeL.x) / 2, y: (q.hingeU.y + q.hingeL.y) / 2 };
  const up = { x: q.tipU.x - q.tipL.x, y: q.tipU.y - q.tipL.y };
  const len = Math.hypot(up.x, up.y) || 1;
  const n = { x: (up.x / len) * 4000, y: (up.y / len) * 4000 };
  const out = { x: -n.y, y: n.x };
  const forward = out.x * (q.tipU.x - hinge.x) + out.y * (q.tipU.y - hinge.y) > 0 ? out : { x: -out.x, y: -out.y };
  const corners = [
    { x: hinge.x + n.x, y: hinge.y + n.y }, { x: hinge.x + n.x + forward.x, y: hinge.y + n.y + forward.y },
    { x: hinge.x - n.x + forward.x, y: hinge.y - n.y + forward.y }, { x: hinge.x - n.x, y: hinge.y - n.y },
  ].map((p) => toScreen(view, p));
  ctx.beginPath();
  corners.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
  ctx.closePath();
  ctx.clip();
}

function drawHen(ctx: CanvasRenderingContext2D, cast: Cast, h: HenPose, boil: number, view: View, stage: 'shadow' | 'hen'): void {
  const rot = -h.tilt;
  const nose = { x: h.x, y: h.y };
  const cos = Math.cos(rot);
  const sin = Math.sin(rot);
  /** Her axis place, `y` art units down from it, to the world. */
  const at = (a: number, y: number): Pt => {
    const lx = -a;
    const ly = y * PER_ART;
    return { x: nose.x + lx * cos - ly * sin, y: nose.y + lx * sin + ly * cos };
  };
  const k = PER_ART * view.zoom;
  if (stage === 'shadow') {
    const c = toScreen(view, at(400, 62));
    ctx.save();
    ctx.globalAlpha = 0.24 * h.shadow;
    ctx.fillStyle = INK;
    ctx.beginPath();
    ctx.ellipse(c.x + 14, c.y + 14, 300 * view.zoom, 56 * view.zoom, rot, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    return;
  }
  const place = (s: Sprite, a: number, y: number, rotation: number, extra = 1): void => {
    const q = toScreen(view, at(a, y));
    drawSprite(ctx, s, boil, { x: q.x, y: q.y, rotation, scale: k * extra });
  };
  const shudder = 1 + 0.02 * h.shudder;
  // Stretched out behind her as she goes in.
  const trail = (h.nearLeg - 0.15) / 1.3;
  const reachBack = 150 * Math.max(0, Math.min(1, trail));
  place(cast.henLeg, JOINTS.farHip.a + reachBack * 1.1, JOINTS.farHip.y, rot + h.farLeg, 0.95);
  if (h.tail < 0.97) place(cast.henTail, JOINTS.tail.a, JOINTS.tail.y, rot + 1.3 * (1 - h.tail), 1 - 0.72 * h.tail);
  place(cast.henBody, JOINTS.body.a, JOINTS.body.y, rot, shudder);
  place(cast.henLeg, JOINTS.nearHip.a + reachBack, JOINTS.nearHip.y, rot + h.nearLeg);
  place(h.alarm ? cast.henAlarm : cast.henCalm, JOINTS.neck.a, JOINTS.neck.y, rot + h.neck);
}

function drawFeathers(ctx: CanvasRenderingContext2D, cast: Cast, t: number, boil: number, view: View): void {
  for (const f of feathersAt(t)) {
    const q = toScreen(view, f);
    drawSprite(ctx, cast.feather, boil, { x: q.x, y: q.y, rotation: f.rot, scale: PER_ART * view.zoom * f.size, alpha: f.alpha });
  }
}

// ---------------------------------------------------------------- marks and words

function drawAlarm(ctx: CanvasRenderingContext2D, t: number, h: HenPose | null, view: View): void {
  const a = alarmAt(t);
  if (a <= 0 || !h) return;
  const q = toScreen(view, { x: h.x - 345, y: h.y - 262 });
  ctx.save();
  ctx.translate(q.x, q.y);
  ctx.rotate(-0.14);
  ctx.scale(a, a);
  drawTextLine(ctx, '!', 0, 80, 280 * view.zoom, 700, 1, { fill: RED, halo: '#fffaf0' });
  ctx.restore();
}

function drawWords(ctx: CanvasRenderingContext2D, t: number, view: View): void {
  const head = toScreen(view, pathAt(headU(t)));
  const score = scoreAt(t);
  if (score) drawTextLine(ctx, SCORE_TEXT, Math.max(220, head.x + 120), head.y - 150 - 90 * score.rise, 128, 700, score.alpha);
  const bigger = biggerAt(t);
  if (bigger) drawTextLine(ctx, 'Bigger!', 540, 1120 - 120 * bigger.rise, 140, 700, bigger.alpha, { fill: RED, halo: '#fffaf0' });
  for (const c of CAPTIONS) drawTextLine(ctx, c.text, VIDEO.width / 2, c.y, c.size, 700, captionAlpha(c, t));
  // In every frame, from the first: the short's credit (see credit.ts for the others', which fade in late).
  drawTextLine(ctx, CREDIT_TEXT.text, VIDEO.width / 2, CREDIT_TEXT.y, CREDIT_TEXT.size, 700, CREDIT_TEXT.alpha);
}

// ---------------------------------------------------------------- a frame

function drawFrame(ctx: CanvasRenderingContext2D, cast: Cast, t: number): void {
  const boil = boilAt(t);
  const shake = shakeAt(t);
  const view = viewAt(t);
  const side = sideView(t);
  const hen = henAt(t);
  ctx.save();
  ctx.translate(shake.x, shake.y);
  ctx.fillStyle = '#b9c67c';
  ctx.fillRect(-40, -40, VIDEO.width + 80, VIDEO.height + 80);
  drawYard(ctx, cast.yard, groundAt(t));
  if (hen) drawHen(ctx, cast, hen, boil, view, 'shadow');
  const j = jawsAt(t);
  const q = jawPlace(t, j);
  if (side > 0 && j.tipTop + j.tipBottom > 8) drawMouth(ctx, view, q, side);
  if (hen) {
    ctx.save();
    if (t < 6) clipPastHinge(ctx, view, q);
    drawHen(ctx, cast, hen, boil, view, 'hen');
    ctx.restore();
  }
  drawSnakeBody(ctx, cast, t, boil, view, j.reach * 0.86, { reach: j.reach, top: q.offU + SKULL_RISE, bottom: q.offL + CHIN_DROP, side });
  if (side > 0) {
    const open = side * Math.min(1, Math.max(0, (j.tipTop + j.tipBottom - 12) / 70));
    drawJaw(ctx, cast.floor, boil, view, q.hingeL, q.tipL, open);
    drawJaw(ctx, cast.lower, boil, view, q.hingeL, q.tipL, side);
    drawJaw(ctx, cast.roof, boil, view, q.hingeU, q.tipU, open);
    drawJaw(ctx, cast.upper[snakeEye(t)], boil, view, q.hingeU, q.tipU, side);
  }
  if (side < 1) drawTopHead(ctx, cast, t, boil, view, 1 - side);
  drawTongue(ctx, cast, t, boil, view);
  drawFeathers(ctx, cast, t, boil, view);
  drawAlarm(ctx, t, hen, view);
  ctx.restore();
  drawWords(ctx, t, view);
}

export function createGulpHen(ctx: CanvasRenderingContext2D): Short {
  const cast = bakeCast();
  return { loopSeconds: LOOP_S, draw: (seconds) => drawFrame(ctx, cast, wrap(seconds)), audio: renderGulpHenAudio };
}

