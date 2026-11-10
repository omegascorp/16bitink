import { cub, normals, pt } from '../../../src/art/kit';
import { makeCanvas, Pen } from '../../../src/art/pen';
import { glaze } from '../../../src/art/snakes/cornPaint';
import { mix, rgba } from '../../../src/art/wash';
import { VIDEO } from '../short';
import { taper, type Pt } from '../sprites';
import { lengths, spineOf } from '../pythonbear/python';
import { RETIC } from '../pythonbear/reticArt';
import type { Cast } from './cast';
import { COBRA } from './cobraArt';
import { drawLaid, edges, type Lay, outline, strokeLine } from './lay';
import { drawClock } from './marks';
import { clock45, headInside, swallowPose } from './story';

/**
 * The swallow, side on at dusk on the mudflat: frame 1, and the swallow shot
 * after the face-off. The king cobra faces left, its head stretched round
 * the reticulated python's body: the upper jaw arched over the python's
 * back, the snout's broad tip resting on it, the eye high and forward, the
 * pale lip scales along the stretched lip; the lower jaw under the python's
 * belly to the chin; the lips curving back round the python to the mouth's
 * corner. Behind them the neck is swollen with the python's front half, its
 * olive scales pulled apart over dark skin. The python's free half runs out
 * of the mouth to the left; the cobra's own body loops across the mud in
 * front. As the swallow goes on (depth) the python slides in along itself.
 */
const FOCUS: Pt = { x: 540, y: 1000 };

const SNOUT: Pt = pt(296, 770);
const CHIN: Pt = pt(316, 1190);
const CORNER: Pt = pt(652, 994);

const UPPER_LIP: readonly Pt[] = cub(SNOUT, pt(430, 738), pt(592, 800), CORNER, 40);
const LOWER_LIP: readonly Pt[] = cub(CHIN, pt(462, 1214), pt(614, 1162), CORNER, 40);

/** The head's top, from the snout's blunt front over the crown (a low rise over the eye) on into the swollen neck. */
const HEAD_TOP: readonly Pt[] = [
  ...cub(pt(290, 778), pt(268, 742), pt(282, 690), pt(336, 672), 14),
  ...cub(pt(336, 672), pt(400, 652), pt(470, 632), pt(560, 634), 14).slice(1),
  ...cub(pt(560, 634), pt(660, 636), pt(790, 652), pt(906, 694), 16).slice(1),
];
const HEAD_BACK: readonly Pt[] = cub(pt(906, 694), pt(880, 790), pt(790, 910), CORNER, 14);
const HEAD: readonly Pt[] = [...HEAD_TOP, ...HEAD_BACK.slice(1), ...[...UPPER_LIP].reverse().slice(1)];
const EYE: Pt = pt(478, 702);

/** The lower jaw and throat: from the chin back along the lower lip to the mouth's corner, then down the stretched throat to the neck's underside and forward under the python to the chin. */
function lowerJaw(): Pt[] {
  const throat = cub(CORNER, pt(700, 1070), pt(760, 1170), pt(800, 1232), 12);
  const under = cub(pt(800, 1232), pt(640, 1250), pt(460, 1252), pt(CHIN.x + 6, CHIN.y + 34), 16);
  const tip = cub(pt(CHIN.x + 6, CHIN.y + 34), pt(CHIN.x - 8, CHIN.y + 24), pt(CHIN.x - 8, CHIN.y + 6), CHIN, 6);
  return [...LOWER_LIP, ...throat.slice(1), ...under.slice(1), ...tip.slice(1, -1)];
}
const LOWER_JAW = lowerJaw();

// ---------------------------------------------------------------- the cobra's neck and coil

const NECK = spineOf([pt(540, 966), pt(720, 960), pt(900, 966), pt(1080, 984), pt(1260, 1000), pt(1460, 1010)], 2);
const NS = lengths(NECK);
/** The neck's depth from its front (px along): the python inside, then narrowing off to the right. */
const DEPTH: readonly (readonly [number, number])[] = [[0, 520], [160, 548], [340, 540], [480, 480], [620, 380], [760, 292], [900, 244], [4000, 228]];
const BASE = 228;

function depthAt(s: number): number {
  for (let i = 1; i < DEPTH.length; i++) {
    const [s1, w1] = DEPTH[i]!;
    const [s0, w0] = DEPTH[i - 1]!;
    if (s <= s1) return w0 + (w1 - w0) * (1 - Math.cos(Math.PI * ((s - s0) / (s1 - s0)))) * 0.5;
  }
  return DEPTH[DEPTH.length - 1]![1];
}

const neck = (gulp: number): Lay => ({ spine: NECK, widths: NS.map((s) => depthAt(s) * (s < 700 ? 1 + 0.03 * gulp : 1)), base: BASE, headRight: false });

/** The cobra's body further back, looping across the mud in front from off the right edge, its tail off the left. */
const COIL_SPINE = spineOf([pt(1320, 1470), pt(1080, 1590), pt(760, 1640), pt(420, 1626), pt(100, 1590), pt(-300, 1550)], 4);
const COIL: Lay = { spine: COIL_SPINE, widths: COIL_SPINE.map(() => 184), base: 184, headRight: true };

// ---------------------------------------------------------------- the python

/** The python's free half: out of the mouth and away to the left, drooping to the mud. */
const PY_SPINE = spineOf([pt(600, 980), pt(420, 982), pt(240, 1000), pt(60, 1040), pt(-160, 1100), pt(-420, 1170)], 2);
const PY_S = lengths(PY_SPINE);
const PY_W = 372;
/** The python's whole length, screen px (from its head inside the cobra to its tail's tip). */
export const PY_LEN = 2600;

/** The python's visible part at `depth` (how much of it is inside): its spine from the mouth out to its tail tip, its widths and its pattern slid along. */
export function pythonLay(depth: number): Lay {
  const inside = depth * PY_LEN;
  const left = PY_LEN - inside;
  const spine: Pt[] = [];
  const widths: number[] = [];
  for (let i = 0; i < PY_SPINE.length && PY_S[i]! <= left; i++) {
    spine.push(PY_SPINE[i]!);
    widths.push(PY_W * taper((inside + PY_S[i]!) / PY_LEN, 0.7, 0.05));
  }
  return { spine, widths, base: PY_W, headRight: true, offset: (inside / (PY_W / 24)) };
}

// ---------------------------------------------------------------- drawing

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

/** Everything but the open mouth and what lies in front of it (where the python shows). */
function clipBehindLips(ctx: CanvasRenderingContext2D): void {
  ctx.beginPath();
  ctx.rect(-400, -400, VIDEO.width + 800, VIDEO.height + 800);
  const front = [pt(-400, SNOUT.y - 80), pt(SNOUT.x, SNOUT.y - 80), ...UPPER_LIP, ...[...LOWER_LIP].reverse(), pt(CHIN.x, CHIN.y + 80), pt(-400, CHIN.y + 80)];
  front.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
  ctx.closePath();
  ctx.clip('evenodd');
}

/**
 * The neck's skin pulled apart over the python: the olive scales stand
 * apart as islands with the dark skin between them showing, most where it is
 * stretched most; a soft sheen over the round of the bulge.
 */
function stretchedSkin(ctx: CanvasRenderingContext2D, lay: Lay): void {
  ctx.save();
  path(ctx, outline(lay));
  ctx.clip();
  const fade = ctx.createLinearGradient(600, 0, 1080, 0);
  fade.addColorStop(0, rgba(COBRA.skin, 0.46));
  fade.addColorStop(0.55, rgba(COBRA.skin, 0.22));
  fade.addColorStop(1, rgba(COBRA.skin, 0));
  ctx.strokeStyle = fade;
  ctx.lineCap = 'butt';
  const step = 34;
  for (const dir of [0.62, -0.62]) {
    ctx.lineWidth = 7;
    ctx.beginPath();
    for (let k = -40; k < 70; k++) {
      const x0 = 300 + k * step;
      ctx.moveTo(x0, 600);
      ctx.lineTo(x0 + Math.tan(dir) * 800, 1400);
    }
    ctx.stroke();
  }
  // The neck in the cobra's own darker olive-brown, so it stands apart from the golden python.
  ctx.save();
  ctx.globalCompositeOperation = 'multiply';
  ctx.fillStyle = 'rgba(138,116,72,0.5)';
  ctx.fillRect(400, 600, 1100, 700);
  ctx.restore();
  const round = ctx.createLinearGradient(0, 700, 0, 1240);
  round.addColorStop(0, 'rgba(20,12,8,0.3)');
  round.addColorStop(0.16, 'rgba(255,214,150,0.14)');
  round.addColorStop(0.45, 'rgba(255,240,210,0)');
  round.addColorStop(0.8, 'rgba(20,12,8,0.25)');
  round.addColorStop(1, 'rgba(20,12,8,0.45)');
  ctx.fillStyle = round;
  ctx.fillRect(400, 600, 900, 700);
  ctx.restore();
}

/** Inside the lips: the mouth's pale lining just showing, and the lips' shadow on the python. */
function mouthEdge(ctx: CanvasRenderingContext2D): void {
  const lips = [...UPPER_LIP, ...[...LOWER_LIP].reverse().slice(1)];
  ctx.save();
  path(ctx, [...lips, pt(CHIN.x - 240, CHIN.y), pt(SNOUT.x - 240, SNOUT.y)]);
  ctx.clip();
  strokeLine(ctx, lips, 80, '#050406', 0.34);
  strokeLine(ctx, lips, 36, '#050406', 0.38);
  strokeLine(ctx, lips.map((p) => pt(p.x - 8, p.y)), 13, '#d9aaa0', 0.95);
  strokeLine(ctx, lips.map((p) => pt(p.x - 11, p.y)), 3, '#f4d2c6', 0.7);
  ctx.restore();
}

/** Lip scales along a lip, each with its back edge inked black (the king cobra's barred lips), `side` the way the jaw lies from the lip. */
function lipScales(ctx: CanvasRenderingContext2D, lip: readonly Pt[], from: number, to: number, depth: number, side: 1 | -1): void {
  const n = normals(lip);
  for (let i = from; i < to; i += 4) {
    const p = lip[i]!;
    const q = n[i]!;
    const s = (q.y < 0 ? 1 : -1) * side;
    strokeLine(ctx, [p, pt(p.x - q.x * depth * s + 8, p.y - q.y * depth * s)], 3.4, COBRA.line, 0.75);
  }
}

function drawEye(ctx: CanvasRenderingContext2D, c: Pt, r: number): void {
  ctx.save();
  ctx.fillStyle = 'rgba(30,26,12,0.7)';
  ctx.beginPath();
  ctx.ellipse(c.x, c.y + 2, r + 9, r + 7, 0, 0, Math.PI * 2);
  ctx.fill();
  const g = ctx.createRadialGradient(c.x - 4, c.y + 4, 2, c.x, c.y, r);
  g.addColorStop(0, '#e6c070');
  g.addColorStop(0.5, '#b98b3e');
  g.addColorStop(1, '#3a2610');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(c.x, c.y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(58,38,16,0.45)';
  ctx.lineWidth = 1.4;
  for (let i = 0; i < 22; i++) {
    const a = (i / 22) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(c.x + Math.cos(a) * r * 0.45, c.y + Math.sin(a) * r * 0.45);
    ctx.lineTo(c.x + Math.cos(a) * r * 0.95, c.y + Math.sin(a) * r * 0.95);
    ctx.stroke();
  }
  // The round pupil (an elapid's), the brow's shade, the rim, the catchlight.
  ctx.fillStyle = '#0a0705';
  ctx.beginPath();
  ctx.arc(c.x - 1, c.y + 1, r * 0.42, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(30,26,12,0.5)';
  ctx.beginPath();
  ctx.ellipse(c.x, c.y - r * 0.9, r * 1.05, r * 0.45, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = COBRA.line;
  ctx.lineWidth = 3.5;
  ctx.beginPath();
  ctx.arc(c.x, c.y, r, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = '#fffaf0';
  ctx.beginPath();
  ctx.arc(c.x - r * 0.36, c.y - r * 0.36, r * 0.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 0.6;
  ctx.beginPath();
  ctx.arc(c.x + r * 0.36, c.y + r * 0.4, r * 0.08, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawHead(ctx: CanvasRenderingContext2D, boil: number): void {
  const pen = new Pen(ctx, 9100 + boil, 0.7);
  const g = ctx.createLinearGradient(0, 630, 0, 1000);
  g.addColorStop(0, '#5f5630');
  g.addColorStop(0.25, '#6f633a');
  g.addColorStop(0.62, '#574c2a');
  g.addColorStop(1, '#463c22');
  fill(ctx, HEAD, g);
  ctx.save();
  path(ctx, HEAD);
  ctx.clip();
  glaze(ctx, 560, 650, 300, 22, -0.02, '#d9b77a', 0.32);
  glaze(ctx, 780, 760, 160, 120, 0, COBRA.deep, 0.45);
  glaze(ctx, 360, 720, 90, 50, 0, '#8d8660', 0.4);
  // The pale lip band along the upper lip, its scales edged black behind.
  const n = normals(UPPER_LIP);
  const band = UPPER_LIP.map((p, i) => {
    const s = n[i]!.y < 0 ? 1 : -1;
    const w = 44 - 16 * (i / (UPPER_LIP.length - 1));
    return pt(p.x + n[i]!.x * w * s, p.y + n[i]!.y * w * s);
  });
  const lipWash = ctx.createLinearGradient(0, 740, 0, 1000);
  lipWash.addColorStop(0, '#e4d396');
  lipWash.addColorStop(1, '#c4ae6c');
  fill(ctx, [...UPPER_LIP, ...band.reverse()], lipWash, 0.95);
  glaze(ctx, 430, 760, 120, 10, 0.1, '#ffffff', 0.25);
  for (let i = 0; i < 260; i++) {
    const x = 320 + pen.rng() * 620;
    const y = 640 + pen.rng() * 260;
    pen.hair([pt(x, y), pt(x + 8, y + 3), pt(x + 6, y + 10)], 1.2, COBRA.line, 0.16);
  }
  ctx.restore();
  lipScales(ctx, UPPER_LIP, 2, 36, 44, 1);
  // The crown's big shields seen from the side: the prefrontal, supraocular, parietal and the big occipitals behind.
  for (const [x, y, d] of [[352, 676, 26], [410, 656, 30], [548, 636, 40], [668, 636, 46], [800, 642, 52]] as const) {
    pen.stroke(cub(pt(x, y + 3), pt(x + 6, y + d * 0.5), pt(x + 18, y + d * 0.8), pt(x + 28, y + d), 8), 2.2, COBRA.line, 0.6, false);
  }
  pen.stroke(cub(pt(430, 664), pt(462, 650), pt(510, 652), pt(536, 668), 10), 3, COBRA.line, 0.7, false);
  // The scales behind the eye.
  for (const pts of [[pt(530, 690), pt(518, 724), pt(526, 752)], [pt(600, 668), pt(586, 720), pt(596, 772)], [pt(536, 728), pt(600, 736), pt(660, 724)]]) {
    pen.stroke(pts, 2, COBRA.line, 0.5, false);
  }
  ctx.save();
  ctx.fillStyle = COBRA.line;
  ctx.beginPath();
  ctx.ellipse(318, 724, 10, 8, -0.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  drawEye(ctx, EYE, 31);
  // The low sun behind catching the crown.
  ctx.save();
  path(ctx, HEAD);
  ctx.clip();
  strokeLine(ctx, HEAD_TOP.map((p) => pt(p.x + 4, p.y + 9)), 12, '#ffb86e', 0.45);
  strokeLine(ctx, HEAD_TOP.map((p) => pt(p.x + 3, p.y + 6)), 4, '#ffe0a8', 0.5);
  ctx.restore();
  pen.stroke(HEAD_TOP, 5, COBRA.line, 1);
  pen.stroke(UPPER_LIP, 4.5, COBRA.line, 1);
  pen.hair(HEAD_BACK.slice(0, 10), 3, COBRA.line, 0.25);
}

function drawLowerJaw(ctx: CanvasRenderingContext2D, boil: number): void {
  const pen = new Pen(ctx, 9200 + boil, 0.7);
  const g = ctx.createLinearGradient(0, 1000, 0, 1260);
  g.addColorStop(0, '#d9c78a');
  g.addColorStop(0.5, '#e8d9a2');
  g.addColorStop(1, '#a08c55');
  fill(ctx, LOWER_JAW, g);
  ctx.save();
  path(ctx, LOWER_JAW);
  ctx.clip();
  glaze(ctx, 520, 1250, 260, 18, 0.02, mix('#5e5833', '#000000', 0.2), 0.5);
  glaze(ctx, 700, 1120, 90, 110, 0, '#4a4024', 0.4);
  glaze(ctx, 430, 1205, 120, 8, 0.05, '#fff6d8', 0.35);
  // The throat's skin stretched between its scales, and a few dark mottles.
  for (let i = 0; i < 9; i++) {
    const x = 520 + i * 34;
    pen.hair(cub(pt(x, 1236), pt(x + 8, 1180), pt(x + 18, 1120), pt(x + 30, 1060), 6), 2, '#8a7848', 0.45);
  }
  for (const [x, y] of [[560, 1210], [640, 1160], [700, 1210], [610, 1236]] as const) glaze(ctx, x, y, 14, 9, 0, '#3a3420', 0.4);
  ctx.restore();
  lipScales(ctx, LOWER_LIP, 3, 38, 40, -1);
  pen.stroke([...LOWER_LIP, ...LOWER_JAW.slice(LOWER_LIP.length, LOWER_LIP.length + 4)], 4.5, COBRA.line, 1);
  pen.stroke(LOWER_JAW.slice(LOWER_LIP.length + 12), 4, COBRA.line, 1);
}

/** The python's head inside the cobra's neck, dashed, nose first (shown on "head first"). */
function drawInside(ctx: CanvasRenderingContext2D, show: number): void {
  if (show <= 0) return;
  const c = pt(820, 972);
  const k = 4.6;
  const head = [
    ...cub(pt(-12, -12), pt(10, -12), pt(32, -10), pt(44, -6), 10),
    ...cub(pt(44, -6), pt(51, -3), pt(51.5, 3), pt(44, 6), 6).slice(1),
    ...cub(pt(44, 6), pt(30, 10), pt(10, 12), pt(-12, 12), 10).slice(1),
  ].map((p) => pt(c.x + p.x * k, c.y + p.y * k));
  const half = 12 * k;
  const body = [[pt(600, c.y - half), pt(c.x - 12 * k, c.y - half)], [pt(600, c.y + half), pt(c.x - 12 * k, c.y + half)]];
  ctx.save();
  ctx.globalAlpha = show;
  fill(ctx, [pt(600, c.y - half), ...head, pt(600, c.y + half)], 'rgba(240,210,140,0.24)');
  ctx.setLineDash([22, 14]);
  ctx.lineCap = 'round';
  for (const [w, colour] of [[14, 'rgba(11,26,42,0.7)'], [6, '#fff3d0']] as const) {
    ctx.strokeStyle = colour;
    ctx.lineWidth = w;
    ctx.beginPath();
    head.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
    for (const [a, b] of body) {
      ctx.moveTo(a!.x, a!.y);
      ctx.lineTo(b!.x, b!.y);
    }
    ctx.stroke();
  }
  ctx.setLineDash([]);
  ctx.fillStyle = '#fff3d0';
  ctx.beginPath();
  ctx.arc(c.x + 37 * k, c.y - 4.6 * k, 10, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

let layer: { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } | null = null;

/** The head, nodding about the mouth's corner, painted on its own layer so its back can melt into the neck. */
function drawHeadLayer(ctx: CanvasRenderingContext2D, boil: number, nod: number): void {
  layer ??= makeCanvas(VIDEO.width, VIDEO.height);
  const l = layer.ctx;
  l.setTransform(1, 0, 0, 1, 0, 0);
  l.clearRect(0, 0, VIDEO.width, VIDEO.height);
  l.setTransform(ctx.getTransform());
  drawLowerJaw(l, boil);
  l.save();
  l.globalCompositeOperation = 'destination-out';
  const j = l.createLinearGradient(640, 0, 790, 0);
  j.addColorStop(0, 'rgba(0,0,0,0)');
  j.addColorStop(1, 'rgba(0,0,0,1)');
  l.fillStyle = j;
  l.fillRect(600, 1000, 400, 300);
  l.restore();
  l.translate(CORNER.x, CORNER.y);
  l.rotate(-nod);
  l.translate(-CORNER.x, -CORNER.y);
  drawHead(l, boil);
  l.globalCompositeOperation = 'destination-out';
  const g = l.createLinearGradient(740, 0, 912, 0);
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(1, 'rgba(0,0,0,1)');
  l.fillStyle = g;
  l.fillRect(700, 560, 400, 480);
  l.globalCompositeOperation = 'source-over';
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.drawImage(layer.canvas, 0, 0);
  ctx.restore();
}

/** The low sun's warm rim along a body's top edge. */
function rim(ctx: CanvasRenderingContext2D, l: Lay, alpha = 1): void {
  if (l.spine.length < 2) return;
  const { a, b } = edges(l, 0.9);
  const mean = (pts: readonly Pt[]): number => pts.reduce((m, p) => m + p.y, 0) / pts.length;
  const top = mean(a) < mean(b) ? a : b;
  ctx.save();
  path(ctx, outline(l));
  ctx.clip();
  strokeLine(ctx, top.map((p) => pt(p.x, p.y + 6)), 14, '#ffb86e', 0.32 * alpha);
  strokeLine(ctx, top.map((p) => pt(p.x, p.y + 3)), 5, '#ffe2ae', 0.4 * alpha);
  ctx.restore();
}

/** The swallow at time t: draws the whole frame. */
export function drawSwallow(ctx: CanvasRenderingContext2D, cast: Cast, t: number, boil: number): void {
  const h = swallowPose(t);
  ctx.save();
  ctx.translate(FOCUS.x, FOCUS.y);
  ctx.scale(h.zoom, h.zoom);
  ctx.translate(-FOCUS.x, -FOCUS.y);
  ctx.drawImage(cast.dusk, -100 - 20 * h.depth, -100);
  drawLaid(ctx, cast.cobra, boil, COIL, COBRA.line, 0.8);
  rim(ctx, COIL, 0.8);
  // The python, slid in by `depth`, then the lips' shadow on it.
  const py = pythonLay(h.depth);
  drawLaid(ctx, cast.pythonBig, boil, py, RETIC.line, 0.6);
  rim(ctx, py);
  mouthEdge(ctx);
  // The cobra: the swollen neck behind the lips, the lower jaw, the head; the head nods about the mouth's corner.
  const lay = neck(h.gulp);
  ctx.save();
  clipBehindLips(ctx);
  drawLaid(ctx, cast.sleeve, boil, lay, COBRA.line, 0.6);
  stretchedSkin(ctx, lay);
  rim(ctx, lay);
  ctx.restore();
  drawInside(ctx, headInside(t));
  drawHeadLayer(ctx, boil, h.nod);
  ctx.restore();
  const c = clock45(t);
  drawClock(ctx, { x: 150, y: 640 }, 76, 0.75 * c.hand, c.show, '45 min');
  // Everything in the low sun's warm light; the dark closing in at the edges.
  ctx.save();
  ctx.globalCompositeOperation = 'multiply';
  ctx.fillStyle = 'rgba(246,206,160,0.22)';
  ctx.fillRect(0, 0, VIDEO.width, VIDEO.height);
  ctx.restore();
  const v = ctx.createRadialGradient(VIDEO.width / 2, 1000, 420, VIDEO.width / 2, 1000, 1250);
  v.addColorStop(0, 'rgba(8,4,2,0)');
  v.addColorStop(1, 'rgba(8,4,2,0.62)');
  ctx.fillStyle = v;
  ctx.fillRect(0, 0, VIDEO.width, VIDEO.height);
}
