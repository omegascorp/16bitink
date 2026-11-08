import { cub, normals, pt } from '../../../src/art/kit';
import { glaze } from '../../../src/art/snakes/cornPaint';
import { Pen } from '../../../src/art/pen';
import { mix, rgba } from '../../../src/art/wash';
import { VIDEO } from '../short';
import { drawSprite, type Pt } from '../sprites';
import { RUMP_HIP_FAR, RUMP_HIP_NEAR } from './bearRump';
import type { Cast } from './cast';
import { drawPythonBody, type Lay, lengths, outlineOf, spineOf } from './python';
import { RETIC } from './reticArt';
import { hookPose } from './story';

/**
 * Frame 1: the python's head stretched round a sun bear's back end, side on
 * in the dark forest. The upper jaw arches over the bear's back, its snout
 * (head plates, nostril, pitted lip scales) resting over the hips, the eye
 * set well back; the lower jaw runs under the bear's belly to the chin; the
 * lips curve back round the bear like a stretched sock's mouth and meet at
 * the mouth's corner. Behind them the neck is swollen with the bear's front
 * half, its scales pulled apart over pale pinkish skin. The rump, stubby
 * tail and hind legs stick out in front; the body loops across the ground.
 */
const CY = 1010;
const RUMP_K = 2;
const BEAR_X = 362;
const FOCUS: Pt = { x: 540, y: 1010 };

/** The snout tip resting over the bear's hips, the chin under its belly, and the corner of the mouth where the jaws meet. */
const SNOUT: Pt = pt(290, 806);
const CHIN: Pt = pt(326, 1226);
const CORNER: Pt = pt(660, 1012);

/** The lips, each from its tip back to the corner: the upper over the bear's back, the lower under its belly. */
const UPPER_LIP: readonly Pt[] = cub(SNOUT, pt(470, 784), pt(650, 838), CORNER, 40);
const LOWER_LIP: readonly Pt[] = cub(CHIN, pt(480, 1240), pt(652, 1192), CORNER, 40);

/** The head's top, from the snout's front over the crown and on into the swollen neck. */
const HEAD_TOP: readonly Pt[] = [
  ...cub(pt(284, 814), pt(266, 786), pt(286, 750), pt(336, 738), 12),
  ...cub(pt(336, 738), pt(460, 716), pt(640, 698), pt(800, 694), 18).slice(1),
  ...cub(pt(800, 694), pt(840, 693), pt(870, 696), pt(892, 700), 6).slice(1),
];
/** The head's back edge, where it melts into the neck, down to the corner. */
const HEAD_BACK: readonly Pt[] = cub(pt(892, 700), pt(860, 800), pt(770, 920), CORNER, 14);
const HEAD: readonly Pt[] = [...HEAD_TOP, ...HEAD_BACK.slice(1), ...[...UPPER_LIP].reverse().slice(1)];

/** The lower jaw: a band of lip scales under the lower lip, out to the chin. */
function lowerJaw(): Pt[] {
  const n = normals(LOWER_LIP);
  const outer = LOWER_LIP.map((p, i) => {
    const w = 18 + 26 * Math.sin((i / (LOWER_LIP.length - 1)) * Math.PI * 0.85);
    const s = n[i]!.y > 0 ? 1 : -1;
    return pt(p.x + n[i]!.x * w * s, p.y + n[i]!.y * w * s);
  });
  return [...LOWER_LIP, ...outer.reverse()];
}
const LOWER_JAW = lowerJaw();

const KNOTS: readonly Pt[] = [pt(520, 968), pt(700, 960), pt(880, 966), pt(1060, 984), pt(1260, 1000), pt(1460, 1010)];
const SPINE = spineOf(KNOTS, 2);
const S = lengths(SPINE);
/** The neck's depth from its front (px along): the bear's shoulders and head inside, then narrowing off to the right. */
const DEPTH: readonly (readonly [number, number])[] = [[0, 520], [160, 548], [320, 556], [430, 520], [520, 450], [620, 340], [720, 240], [820, 186], [4000, 176]];

/** The body further back, looping across the foreground from off the right edge. */
const COIL = spineOf([pt(1300, CY + 380), pt(1020, CY + 500), pt(700, CY + 532), pt(350, CY + 516), pt(0, CY + 472), pt(-280, CY + 440)], 5);

function depthAt(s: number): number {
  for (let i = 1; i < DEPTH.length; i++) {
    const [s1, w1] = DEPTH[i]!;
    const [s0, w0] = DEPTH[i - 1]!;
    if (s <= s1) return w0 + (w1 - w0) * (1 - Math.cos(Math.PI * ((s - s0) / (s1 - s0)))) * 0.5;
  }
  return DEPTH[DEPTH.length - 1]![1];
}

const neck = (gulp: number): Lay => ({ spine: SPINE, widths: S.map((s) => depthAt(s) * (s < 700 ? 1 + 0.03 * gulp : 1)), base: 176, headRight: false });

function path(ctx: CanvasRenderingContext2D, pts: readonly Pt[]): void {
  ctx.beginPath();
  pts.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
  ctx.closePath();
}

function fill(ctx: CanvasRenderingContext2D, pts: readonly Pt[], colour: string | CanvasGradient, alpha = 1): void {
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.fillStyle = colour;
  path(ctx, pts);
  ctx.fill();
  ctx.restore();
}

function line(ctx: CanvasRenderingContext2D, pts: readonly Pt[], w: number, colour: string, alpha = 1): void {
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.strokeStyle = colour;
  ctx.lineWidth = w;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  pts.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
  ctx.stroke();
  ctx.restore();
}

/** Everything but the open mouth and what lies in front of it (where the bear shows). */
function clipBehindLips(ctx: CanvasRenderingContext2D): void {
  ctx.beginPath();
  ctx.rect(-400, -400, VIDEO.width + 800, VIDEO.height + 800);
  const front = [pt(-400, SNOUT.y - 60), pt(SNOUT.x, SNOUT.y - 60), ...UPPER_LIP, ...[...LOWER_LIP].reverse(), pt(CHIN.x, CHIN.y + 60), pt(-400, CHIN.y + 60)];
  front.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
  ctx.closePath();
  ctx.clip('evenodd');
}

/**
 * The neck's skin pulled apart over the bear: the scale rows spread on a
 * diagonal net, the pale pinkish-grey skin showing between them, most where
 * it is stretched most; a soft sheen over the round of the bulge.
 */
function stretchedSkin(ctx: CanvasRenderingContext2D, lay: Lay): void {
  ctx.save();
  path(ctx, outlineOf(lay));
  ctx.clip();
  const fade = ctx.createLinearGradient(560, 0, 1080, 0);
  fade.addColorStop(0, rgba('#d8c0b8', 0.62));
  fade.addColorStop(0.62, rgba('#d8c0b8', 0.48));
  fade.addColorStop(1, rgba('#d8c0b8', 0.08));
  ctx.strokeStyle = fade;
  ctx.lineCap = 'butt';
  const step = 36;
  for (const dir of [0.62, -0.62]) {
    ctx.lineWidth = 7;
    ctx.beginPath();
    for (let k = -40; k < 60; k++) {
      const x0 = 300 + k * step;
      ctx.moveTo(x0, 600);
      ctx.lineTo(x0 + Math.tan(dir) * 800, 1400);
    }
    ctx.stroke();
  }
  // The skin's own creases and the shadow it throws on the scale islands.
  ctx.strokeStyle = rgba('#7a5a52', 0.1);
  ctx.lineWidth = 2;
  for (const dir of [0.62, -0.62]) {
    ctx.beginPath();
    for (let k = -40; k < 60; k++) {
      const x0 = 300 + k * step + 4;
      ctx.moveTo(x0, 600);
      ctx.lineTo(x0 + Math.tan(dir) * 800, 1400);
    }
    ctx.stroke();
  }
  const round = ctx.createLinearGradient(0, 700, 0, 1250);
  round.addColorStop(0, 'rgba(20,12,8,0.35)');
  round.addColorStop(0.18, 'rgba(255,246,220,0.16)');
  round.addColorStop(0.5, 'rgba(255,246,220,0)');
  round.addColorStop(0.85, 'rgba(20,12,8,0.3)');
  round.addColorStop(1, 'rgba(20,12,8,0.5)');
  ctx.fillStyle = round;
  ctx.fillRect(400, 600, 800, 700);
  ctx.restore();
}

/** Inside the lips: the mouth's pink lining just showing, and the lips' shadow on the bear. */
function mouthEdge(ctx: CanvasRenderingContext2D): void {
  const lips = [...UPPER_LIP, ...[...LOWER_LIP].reverse().slice(1)];
  // The shadow falls inside the mouth, on the bear.
  ctx.save();
  path(ctx, [...lips, pt(CHIN.x - 200, CHIN.y), pt(SNOUT.x - 200, SNOUT.y)]);
  ctx.clip();
  line(ctx, lips, 70, '#050406', 0.32);
  line(ctx, lips, 34, '#050406', 0.35);
  line(ctx, lips.map((p) => pt(p.x - 7, p.y)), 12, '#c27f78', 0.95);
  line(ctx, lips.map((p) => pt(p.x - 10, p.y)), 3, '#ecb3a8', 0.7);
  ctx.restore();
}

/** Labial scales along a lip, each with its heat pit, `side` the way the jaw lies from the lip. */
function lipScales(ctx: CanvasRenderingContext2D, lip: readonly Pt[], from: number, to: number, depth: number, side: 1 | -1, pits: (i: number) => boolean): void {
  const n = normals(lip);
  for (let i = from; i < to; i += 3) {
    const p = lip[i]!;
    const q = n[i]!;
    const s = (q.y < 0 ? 1 : -1) * side;
    const a = pt(p.x - q.x * depth * s, p.y - q.y * depth * s);
    line(ctx, [p, a], 2, RETIC.line, 0.55);
    if (!pits(i)) continue;
    const c = pt(p.x - q.x * depth * 0.45 * s + 6, p.y - q.y * depth * 0.45 * s);
    ctx.save();
    ctx.fillStyle = '#2c1e10';
    ctx.globalAlpha = 0.9;
    ctx.beginPath();
    ctx.ellipse(c.x, c.y, 4.2, 6.5, Math.atan2(q.y, q.x), 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

function drawHead(ctx: CanvasRenderingContext2D, boil: number): void {
  const pen = new Pen(ctx, 8100 + boil, 0.7);
  const g = ctx.createLinearGradient(0, 690, 0, 1000);
  g.addColorStop(0, '#e2c27a');
  g.addColorStop(0.3, '#cfa55c');
  g.addColorStop(0.7, '#a98244');
  g.addColorStop(1, '#8d6c3c');
  fill(ctx, HEAD, g);
  ctx.save();
  path(ctx, HEAD);
  ctx.clip();
  // The crown's black line and the olive cast over the top of the head.
  line(ctx, HEAD_TOP.slice(4).map((p) => pt(p.x, p.y + 5)), 9, RETIC.net, 0.85);
  glaze(ctx, 640, 735, 260, 30, -0.05, RETIC.olive, 0.4);
  glaze(ctx, 520, 760, 220, 22, -0.1, '#fff2c8', 0.3);
  // The pale upper lip scales along the lip.
  const n = normals(UPPER_LIP);
  const band = UPPER_LIP.map((p, i) => {
    const s = n[i]!.y < 0 ? 1 : -1;
    return pt(p.x + n[i]!.x * 30 * s, p.y + n[i]!.y * 30 * s);
  });
  fill(ctx, [...UPPER_LIP, ...band.reverse()], '#ecdca0', 0.95);
  // The dark line back from the eye towards the corner of the mouth, the scale texture.
  pen.stroke(cub(pt(618, 778), pt(690, 820), pt(760, 880), pt(820, 930), 12), 5, RETIC.net, 0.85, false);
  for (let i = 0; i < 220; i++) {
    const x = 330 + pen.rng() * 650;
    const y = 700 + pen.rng() * 240;
    pen.hair([pt(x, y), pt(x + 7, y + 3), pt(x + 5, y + 9)], 1.1, RETIC.line, 0.16);
  }
  // A sheen of the neck's net showing through at the back of the head.
  glaze(ctx, 840, 760, 80, 70, 0, '#b48a48', 0.5);
  ctx.restore();
  // The snout's plates and the nostril at its tip.
  for (const [x, y, w, h] of [[306, 764, 24, 18], [338, 752, 32, 20], [378, 742, 36, 20], [336, 780, 28, 16], [418, 736, 34, 18]] as const) {
    pen.stroke([pt(x - w / 2, y + h / 2), pt(x - w / 2 + 3, y - h / 2), pt(x + w / 2, y - h / 2 + 2), pt(x + w / 2 - 2, y + h / 2), pt(x - w / 2, y + h / 2)], 1.6, RETIC.line, 0.6, false);
  }
  ctx.save();
  ctx.fillStyle = '#1a120a';
  ctx.beginPath();
  ctx.ellipse(296, 784, 8, 6, -0.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  lipScales(ctx, UPPER_LIP, 1, 26, 28, 1, (i) => i < 18);
  drawEye(ctx, pt(600, 762), 19);
  pen.stroke(HEAD_TOP, 4.5, RETIC.line, 1);
  pen.stroke(UPPER_LIP, 4, RETIC.line, 1);
  pen.hair(HEAD_BACK.slice(0, 10), 3, RETIC.line, 0.25);
}

function drawEye(ctx: CanvasRenderingContext2D, c: Pt, r: number): void {
  ctx.save();
  ctx.fillStyle = 'rgba(80,55,25,0.6)';
  ctx.beginPath();
  ctx.ellipse(c.x, c.y, r + 6, r + 5, 0, 0, Math.PI * 2);
  ctx.fill();
  const g = ctx.createRadialGradient(c.x - 3, c.y + 2, 1, c.x, c.y, r);
  g.addColorStop(0, '#f6c35c');
  g.addColorStop(0.55, '#e08a2c');
  g.addColorStop(1, '#7a3a12');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(c.x, c.y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#0c0806';
  ctx.beginPath();
  ctx.ellipse(c.x + 1, c.y, 3.6, r * 0.86, 0, 0, Math.PI * 2);
  ctx.fill();
  // The brow's shadow, the rim, the catchlight.
  ctx.fillStyle = 'rgba(90,60,25,0.45)';
  ctx.beginPath();
  ctx.ellipse(c.x, c.y - r * 0.85, r, r * 0.45, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = RETIC.line;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(c.x, c.y, r, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = '#fffaf0';
  ctx.beginPath();
  ctx.arc(c.x - r * 0.38, c.y - r * 0.36, r * 0.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawLowerJaw(ctx: CanvasRenderingContext2D, boil: number): void {
  const pen = new Pen(ctx, 8200 + boil, 0.7);
  const g = ctx.createLinearGradient(0, 1180, 0, 1280);
  g.addColorStop(0, '#efe0a8');
  g.addColorStop(1, '#bfa66c');
  fill(ctx, LOWER_JAW, g);
  ctx.save();
  path(ctx, LOWER_JAW);
  ctx.clip();
  glaze(ctx, 480, 1260, 160, 12, 0.02, mix('#8d6c3c', '#000000', 0.2), 0.45);
  ctx.restore();
  lipScales(ctx, LOWER_LIP, 2, 38, 36, -1, (i) => i > 16);
  pen.stroke([...LOWER_JAW, LOWER_JAW[0]!], 4, RETIC.line, 1);
}

/** The hook at time t: draws the whole frame. */
export function drawHook(ctx: CanvasRenderingContext2D, cast: Cast, t: number, boil: number): void {
  const h = hookPose(t);
  ctx.save();
  ctx.translate(FOCUS.x, FOCUS.y);
  ctx.scale(h.zoom, h.zoom);
  ctx.translate(-FOCUS.x, -FOCUS.y);
  ctx.drawImage(cast.night, -100 - h.slide * 0.15, -100);
  drawPythonBody(ctx, cast.python, boil, { spine: COIL, widths: COIL.map(() => 176), base: 176, headRight: true }, 0.8);
  // The bear, slid in by `slide`: the far leg, the rump, the near leg.
  const o = pt(BEAR_X + h.slide, CY);
  const at = (q: Pt): Pt => pt(o.x + q.x * RUMP_K, o.y + q.y * RUMP_K);
  const far = at(RUMP_HIP_FAR);
  const near = at(RUMP_HIP_NEAR);
  drawSprite(ctx, cast.leg.far, boil, { x: far.x, y: far.y, scale: RUMP_K, rotation: h.far });
  drawSprite(ctx, cast.rump, boil, { x: o.x, y: o.y, scale: RUMP_K });
  drawSprite(ctx, cast.leg.near, boil, { x: near.x, y: near.y, scale: RUMP_K, rotation: h.near });
  mouthEdge(ctx);
  // The python: the swollen neck behind the lips, the lower jaw, the head; the head nods about the mouth's corner.
  const lay = neck(h.gulp);
  ctx.save();
  clipBehindLips(ctx);
  drawPythonBody(ctx, cast.sleeve, boil, lay, 0.6);
  stretchedSkin(ctx, lay);
  ctx.restore();
  drawLowerJaw(ctx, boil);
  ctx.save();
  ctx.translate(CORNER.x, CORNER.y);
  ctx.rotate(-h.nod);
  ctx.translate(-CORNER.x, -CORNER.y);
  drawHead(ctx, boil);
  ctx.restore();
  ctx.restore();
  // Moonlight from the upper left, the dark closing in at the edges.
  const v = ctx.createRadialGradient(VIDEO.width / 2, 980, 380, VIDEO.width / 2, 1000, 1250);
  v.addColorStop(0, 'rgba(2,6,8,0)');
  v.addColorStop(1, 'rgba(2,6,8,0.75)');
  ctx.fillStyle = v;
  ctx.fillRect(0, 0, VIDEO.width, VIDEO.height);
}
