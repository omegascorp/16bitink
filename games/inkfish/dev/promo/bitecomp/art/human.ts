import type { Pt } from '../../../../src/art/pen';
import type { KitEntry } from '../../foodchain/kit';
import { spline } from '../../kraken/whale';
import { screenScale, step01, turn } from '../../seal/art/paint';
import { BITES } from '../timeline';
import type { DrawHead } from './contract';
import { bustAt } from './humanBody';
import { drawHair, FRINGE } from './humanHair';
import {
  BROW, CORNER, EAR, EAR_BOWL, EAR_RIM, EYE_BACK, EYE_FRONT, GRIP, HINGE, IRIS, IRIS_R, JAW_MAX, JAWLINE, LEN, LIP_FRONT,
  LOWER_LID, type MouthShapes, NECK_BOX, REST, short, UPPER_LID,
} from './humanShape';
import { BLUSH, fill, HAIR_LINE, type Ink, INNER, line, OUTER, SKIN, SKIN_SH, within } from './humanSkin';

/**
 * "YOU (an adult)": a friendly young guy drawn like a modern anime key visual,
 * in profile facing right. Clean tapered line art, flat cel colour with one
 * crisp shadow tone, a big eye with sparkles, a small pointed nose, a gentle
 * pointed chin, big clumpy brown hair with a highlight band.
 *
 * Drawn live as vector paths at the screen's own scale (only the neck and
 * shirt are baked, at screen resolution). The lower jaw turns about its hinge
 * in front of the ear while the mouth's corner stays put, so the open mouth is
 * a small wedge: a shocked anime gasp. While he's on the sensor bar (his bite's
 * window in the timeline) the lips part round it and both rows of teeth grip.
 */

// ---------------------------------------------------------------- the jaw and mouth

/** How far the chin's front eases forward at full open, so the jaw drops down rather than swinging back under the face. */
const JAW_FORWARD = 17;

/** Where a point on the lower jaw goes: turned about the hinge, its front eased forward. */
const jawAt = (open: number) => (p: Pt): Pt => {
  const q = turn(p, HINGE, open);
  const w = Math.max(0, Math.min(1.2, (p.x - HINGE.x) / (LIP_FRONT.x - HINGE.x)));
  return { x: q.x + JAW_FORWARD * (open / JAW_MAX) * w, y: q.y };
};

/** The lower lip's inner edge, front to the corner: closed, it's the lip line; open, it rounds down from the corner to the dropped lip. */
function lowerEdge(m: MouthShapes, open: number): Pt[] {
  const front = jawAt(open)(m.lipBot[0]!);
  const back = m.lipBot[m.lipBot.length - 1]!;
  const drop = front.y - m.lipBot[0]!.y;
  const ctrl = { x: back.x + 1, y: back.y + drop * 0.95 };
  return m.lipBot.map((p, i, all) => {
    const v = 1 - i / (all.length - 1);
    const u = 1 - v;
    const rounded = { x: u * u * back.x + 2 * u * v * ctrl.x + v * v * front.x, y: u * u * back.y + 2 * u * v * ctrl.y + v * v * front.y };
    const moved = jawAt(open)(p);
    const k = Math.min(1, drop / 3);
    return { x: moved.x + (rounded.x - moved.x) * k, y: moved.y + (rounded.y - moved.y) * k };
  });
}

/** The lower jaw, dropped: the lower lip's inner edge from the corner, the chin, the jawline back to the hinge. */
function jawShape(m: MouthShapes, open: number): Pt[] {
  const t = jawAt(open);
  return [...lowerEdge(m, open).reverse(), ...m.chin.slice(1).map(t), ...JAWLINE.slice(1).map(t)];
}

/** The open mouth: the upper lip's inner edge back to the corner, the lower lip's forward, and a soft front between the lips. */
function mouthShape(m: MouthShapes, low: readonly Pt[]): Pt[] {
  const top = m.lipTop[0]!;
  const tip = low[0]!;
  const gap = Math.hypot(top.x - tip.x, top.y - tip.y);
  const front = Array.from({ length: 9 }, (_, i) => {
    const v = i / 8;
    return { x: tip.x + (top.x - tip.x) * v - (1.5 + gap * 0.07) * Math.sin(Math.PI * v), y: tip.y + (top.y - tip.y) * v };
  });
  return [...m.lipTop, ...[...low].reverse().slice(1), ...front.slice(1, -1)];
}

/** The jaw's crisp shadow: under the jawline and up its back to the hinge. */
const JAW_SHADE: readonly Pt[] = [
  ...JAWLINE,
  ...spline([HINGE, { x: -61, y: -42 }, { x: -58, y: -14 }, { x: -52, y: 4 }, { x: -38, y: 17 }, { x: -18, y: 28 }, { x: 4, y: 36 }, { x: 24, y: 41.5 }, { x: 40, y: 44.5 }], 4).map(short),
];
/** The crease under the lower lip. */
const LIP_SHADE: readonly Pt[] = spline([{ x: 57, y: 12 }, { x: 53.4, y: 16.4 }, { x: 53.6, y: 22 }, { x: 50, y: 18 }, { x: 52, y: 13.5 }], 3).map(short);
/** The side of the face turned from the light, back of the cheek to the ear. */
const SIDE_SHADE: readonly Pt[] = [
  ...spline([{ x: -80, y: -170 }, { x: -76, y: -110 }, { x: -68, y: -70 }, { x: -61, y: -42 }, { x: -58, y: -14 }, { x: -52, y: 4 }], 4),
  { x: -200, y: 0 }, { x: -200, y: -200 },
];
const UNDER_NOSE: readonly Pt[] = spline([{ x: 74, y: -40.6 }, { x: 67, y: -38.2 }, { x: 63.4, y: -34.6 }, { x: 62.4, y: -29 }, { x: 66, y: -34 }, { x: 72, y: -38 }], 3);

function drawMouth(k: Ink, m: MouthShapes, low: readonly Pt[], open: number, shocked: boolean): void {
  const { ctx } = k;
  const shape = mouthShape(m, low);
  fill(ctx, shape, '#7c2b31');
  within(ctx, shape, () => {
    fill(ctx, [{ x: CORNER.x + 6, y: -30 }, { x: CORNER.x - 4, y: 60 }, { x: -20, y: 60 }, { x: -20, y: -30 }], '#561b20');
    const t = jawAt(open);
    if (m.grip) {
      // Both rows clenched on the bar: white blocks, a dark bite line, faint gaps between the front teeth.
      const upper = [{ x: 58, y: -12 }, { x: 58, y: 0 }, { x: 38, y: 0 }, { x: 38, y: -12 }];
      const lower = [{ x: 58, y: 0 }, { x: 58, y: 12 }, { x: 38, y: 12 }, { x: 38, y: 0 }].map(t);
      fill(ctx, upper, '#fffdfa');
      fill(ctx, lower, '#f4eef0');
      fill(ctx, [{ x: 58, y: -12 }, { x: 58, y: -9.5 }, { x: 38, y: -9.5 }, { x: 38, y: -12 }], '#d9d2dc');
      for (const x of [51.5, 46.5]) {
        line(k, [{ x, y: -7.5 }, { x: x - 0.3, y: -0.6 }], INNER * 0.6, { colour: '#b8afbd', in: 0.3, out: 0.05, min: 0.4 });
        line(k, [t({ x: x - 0.6, y: 0.6 }), t({ x: x - 0.8, y: 7 })], INNER * 0.6, { colour: '#b8afbd', in: 0.05, out: 0.3, min: 0.4 });
      }
      line(k, [{ x: 58, y: 0 }, { x: 38, y: 0 }], INNER, { in: 0, out: 0.3 });
    } else {
      // The gasp: a pink tongue low in the mouth, a sliver of the top teeth.
      const tongue = t({ x: 49, y: 7.5 });
      ctx.fillStyle = '#e88488';
      ctx.beginPath();
      ctx.ellipse(tongue.x, tongue.y, 11, 5.5, open * 0.6, 0, Math.PI * 2);
      ctx.fill();
      const teeth = m.lipTop.filter((p) => p.x > 46.5);
      fill(ctx, [...teeth, ...[...teeth].reverse().map((p) => ({ x: p.x, y: p.y + (shocked ? 3.6 : 3) }))], '#fffdfa');
    }
  });
  line(k, m.lipTop, INNER * 1.25, { in: 0.05, out: 0.4 });
  line(k, low, INNER, { in: 0.05, out: 0.4 });
  const top = m.lipTop[0]!;
  const tip = low[0]!;
  const front = shape.slice(m.lipTop.length + low.length - 1);
  line(k, [tip, ...front, top], OUTER * 0.9, { in: 0.15, out: 0.15 });
}

// ---------------------------------------------------------------- the eye and brow

/** 0 open .. 1 shut: a quick blink every few seconds. */
function blinkAt(t: number): number {
  const phase = (((t - 3.3) % 3.9) + 3.9) % 3.9;
  return phase < 0.18 ? Math.sin((phase / 0.18) * Math.PI) : 0;
}

const lerp = (a: Pt, b: Pt, u: number): Pt => ({ x: a.x + (b.x - a.x) * u, y: a.y + (b.y - a.y) * u });
const ellipse = (ctx: CanvasRenderingContext2D, x: number, y: number, rx: number, ry: number, colour: string): void => {
  ctx.fillStyle = colour;
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();
};

/** The big anime eye in profile: the white, a tall iris near the front with sparkles, the thick upper lash line and its flick. */
function drawEye(k: Ink, shut: number, shocked: boolean): void {
  const { ctx } = k;
  if (shut > 0.55) {
    const closed = spline([EYE_BACK, { x: 30, y: -79 }, { x: 43, y: -73 }, { x: 54, y: -75 }], 6);
    line(k, closed, 3.6, { colour: HAIR_LINE, in: 0.1, out: 0.4 });
    line(k, [{ x: 22, y: -91 }, { x: 13, y: -94 }], 2.2, { colour: HAIR_LINE, in: 0, out: 0.9 });
    return;
  }
  const bottom = (u: number): Pt => LOWER_LID[Math.round(u * (LOWER_LID.length - 1))]!;
  const lid = UPPER_LID.map((p, i) => lerp(p, bottom(i / (UPPER_LID.length - 1)), shut * 0.9));
  const white = [...lid, ...EYE_FRONT.slice(1), ...[...LOWER_LID].reverse().slice(1)];
  fill(ctx, white, '#fffcf8');
  within(ctx, white, () => {
    fill(ctx, [...lid, ...[...lid].reverse().map((p) => ({ x: p.x, y: p.y + 6.5 }))], '#dcd4e8');
    const rx = IRIS_R.x * (shocked ? 0.86 : 1);
    const ry = IRIS_R.y * (shocked ? 0.8 : 1);
    const cy = IRIS.y + (shocked ? 1.5 : 0);
    ellipse(ctx, IRIS.x, cy, rx, ry, '#9c5f36');
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(IRIS.x, cy, rx, ry, 0, 0, Math.PI * 2);
    ctx.clip();
    ellipse(ctx, IRIS.x, cy - ry * 0.55, rx * 1.3, ry * 0.75, '#45230f');
    ellipse(ctx, IRIS.x + 0.8, cy + ry * 0.62, rx * 0.72, ry * 0.42, '#dba46a');
    ellipse(ctx, IRIS.x + 1, cy - ry * 0.05, rx * 0.42, ry * (shocked ? 0.32 : 0.42), '#1d0e07');
    ctx.restore();
    ctx.save();
    ctx.lineWidth = Math.max(INNER * 0.7, 0.5 * k.lw);
    ctx.strokeStyle = '#2a160c';
    ctx.beginPath();
    ctx.ellipse(IRIS.x, cy, rx, ry, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
    ellipse(ctx, IRIS.x + 1.8, cy - ry * 0.42, rx * 0.36, ry * 0.25, '#ffffff');
    ellipse(ctx, IRIS.x - 1.6, cy + ry * 0.5, rx * 0.17, ry * 0.1, '#ffffff');
    ellipse(ctx, IRIS.x + 3.4, cy + ry * 0.12, rx * 0.11, ry * 0.07, 'rgba(255,255,255,0.85)');
  });
  // The lid's crease above, the lower lid, a faint front edge.
  line(k, UPPER_LID.slice(8, -8).map((p) => ({ x: p.x - 1, y: p.y - 6 })), INNER * 0.75, { in: 0.4, out: 0.4, alpha: 0.6 });
  line(k, LOWER_LID.filter((p) => p.x > 30), INNER * 1.1, { in: 0.4, out: 0.2 });
  line(k, EYE_FRONT, INNER * 0.6, { in: 0.2, out: 0.5, alpha: 0.45 });
  // The thick upper lash line: heaviest toward the outer corner, flicking out behind it.
  line(k, lid, 4.6, { colour: HAIR_LINE, in: 0.06, out: 0.3, min: 1.1 });
  const back = lid[Math.round(lid.length * 0.12)]!;
  line(k, [lid[0]!, { x: back.x - 9, y: back.y - 5 }], 2.6, { colour: HAIR_LINE, in: 0, out: 1, min: 0.6 });
}

function drawBrow(k: Ink, lift: number): void {
  line(k, BROW.map((p) => ({ x: p.x, y: p.y - lift * (0.4 + 0.6 * step01(p.x, 10, 50)) })), 4, { colour: HAIR_LINE, in: 0.55, out: 0.12, min: 0.8 });
}

// ---------------------------------------------------------------- the head

function drawEar(k: Ink): void {
  const { ctx } = k;
  fill(ctx, EAR, SKIN);
  within(ctx, EAR, () => {
    fill(ctx, EAR_BOWL, SKIN_SH);
    fill(ctx, [{ x: -124, y: -112 }, { x: -80, y: -112 }, { x: -80, y: -101 }, { x: -96, y: -96 }, { x: -124, y: -94 }], SKIN_SH);
  });
  line(k, EAR_RIM, INNER, { in: 0.2, out: 0.4 });
  line(k, [{ x: -85, y: -76 }, { x: -89, y: -70 }, { x: -88, y: -64 }], INNER * 0.9, { in: 0.3, out: 0.3 });
  line(k, [...EAR], OUTER * 0.85, { in: 0.05, out: 0.05 });
}

function drawHeadSkin(k: Ink, m: MouthShapes): void {
  const { ctx } = k;
  fill(ctx, m.head, SKIN);
  within(ctx, m.head, () => {
    fill(ctx, SIDE_SHADE, SKIN_SH);
    fill(ctx, [...FRINGE.map((p) => ({ x: p.x + 3, y: p.y + 9 })), { x: 100, y: -134 }, { x: 100, y: -320 }, { x: -120, y: -320 }], SKIN_SH);
    fill(ctx, UNDER_NOSE, SKIN_SH);
    // Blush: a soft pink patch and three little strokes.
    ctx.save();
    ctx.globalAlpha = 0.34;
    ellipse(ctx, 26, -52, 15, 6.5, BLUSH);
    ctx.restore();
    for (const x of [18, 25, 32]) line(k, [{ x: x + 2.5, y: -56 }, { x: x - 1.5, y: -49 }], INNER * 0.75, { colour: '#e07a7a', in: 0.3, out: 0.3, alpha: 0.8, min: 0.4 });
    // A glint on the nose's tip.
    ctx.save();
    ctx.globalAlpha = 0.85;
    ellipse(ctx, 73.5, -50.5, 2.2, 1.4, '#fff3ea');
    ctx.restore();
  });
}

function drawJawSkin(k: Ink, m: MouthShapes, open: number): Pt[] {
  const { ctx } = k;
  const jaw = jawShape(m, open);
  fill(ctx, jaw, SKIN);
  within(ctx, jaw, () => {
    fill(ctx, JAW_SHADE.map(jawAt(open)), SKIN_SH);
    fill(ctx, LIP_SHADE.map(jawAt(open)), SKIN_SH);
  });
  return jaw;
}

// ---------------------------------------------------------------- on screen

/** His turn on the sensor bar (sliding in to backing off): the lips part round it. */
const MINE = BITES.find((b) => b.animal === 'human');
const onBar = (t: number): boolean => !!MINE && t >= MINE.arrive - 1 && t < MINE.leave + 1;

/** The head in profile facing right, placed by its bite point; see contract.ts. */
export const drawHuman: DrawHead = (ctx, p) => {
  const u = p.size / LEN;
  ctx.save();
  ctx.translate(p.x, p.y);
  const screen = Math.max(1e-3, u * screenScale(ctx));
  ctx.scale(u, u);
  const k: Ink = { ctx, lw: 1 / screen };
  const m = onBar(p.t) ? GRIP : REST;
  const jaw = Math.max(0, Math.min(1, p.jaw));
  const open = jaw * JAW_MAX;
  const shocked = !m.grip && jaw > 0.35;

  const bust = bustAt(screen);
  ctx.drawImage(bust.canvas, NECK_BOX.x0, NECK_BOX.y0, bust.canvas.width / bust.res, bust.canvas.height / bust.res);

  drawHeadSkin(k, m);
  drawEar(k);
  drawJawSkin(k, m, open);
  const low = lowerEdge(m, open);
  if (m.grip || open > 0.004) drawMouth(k, m, low, open, shocked);
  else line(k, m.lipTop, INNER * 1.3, { in: 0.05, out: 0.55 });

  // The profile: brow, nose and upper lip; the lower lip, chin and jawline, fading out toward the ear.
  line(k, m.face.filter((p) => p.y > -170), OUTER, { in: 0.08, out: 0.02 });
  const t = jawAt(open);
  line(k, [low[0]!, ...m.chin.slice(1).map(t), ...JAWLINE.slice(1).filter((q) => q.y > -16).map(t)], OUTER, { in: 0.02, out: 0.25 });
  line(k, [{ x: 66.5, y: -38.3 }, { x: 63.5, y: -41.5 }], INNER * 1.1, { in: 0.1, out: 0.6 });

  drawEye(k, blinkAt(p.t), shocked);
  drawHair(k);
  drawBrow(k, shocked ? 6 * jaw : 0);
  ctx.restore();
};

/** Nothing heavy to bake ahead: the bust bakes the first time each size is drawn. */
export async function prepare(): Promise<void> {
  bustAt(1);
}

export const KIT: KitEntry = {
  name: 'human',
  draw: (ctx, w, h, t) => drawHuman(ctx, { x: w * 0.68, y: h * 0.52, size: Math.min(w, h) * 0.6, jaw: Math.max(0, Math.sin(t * 2)), t }),
};

