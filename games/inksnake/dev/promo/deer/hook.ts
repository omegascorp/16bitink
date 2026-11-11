import { createRng } from '../../../src/logic/rng';
import { cub, normals, pt } from '../../../src/art/kit';
import { glaze } from '../../../src/art/snakes/cornPaint';
import { Pen } from '../../../src/art/pen';
import { mix, rgba } from '../../../src/art/wash';
import { lengths, spineOf } from '../pythonbear/python';
import type { Lay } from '../cobra/lay';
import { VIDEO } from '../short';
import { drawSprite, type Pt } from '../sprites';
import { BURM } from './burmeseArt';
import type { Cast } from './cast';
import { drawSeg } from './lay';
import { hookPose } from './story';

/**
 * Frame 1: the Burmese python's jaws stretched round the back half of a
 * spotted fawn, side on, on the swamp's bank at late light. The fawn lies
 * limp with its front half out (head, big ears, shut eye, slender legs, the
 * spots along its back), its back half inside; the upper jaw arches over
 * the fawn's back, the arrowhead on the crown and the dark eye stripe; the
 * lower jaw runs under its belly to the chin; the lips curve back round it
 * to the corner of the mouth. Behind them the neck is ballooned round the
 * fawn's haunches, the blotched skin pulled apart over pale skin; the body
 * loops across the foreground. The fawn is clearly bigger than the head.
 */
const FOCUS: Pt = { x: 540, y: 1080 };
const FAWN_AT = { x: 449, y: 1077, k: 1.7 } as const;

/** The head's shapes are #107's, scaled and moved onto the fawn: k 0.78 about its snout. */
const K = 0.72;
const m = (x: number, y: number): Pt => pt(500 + (x - 290) * K, 935 + (y - 806) * K);

const SNOUT = m(290, 806);
const CHIN = m(326, 1226);
const CORNER = m(660, 1012);
const UPPER_LIP: readonly Pt[] = cub(SNOUT, m(470, 784), m(650, 838), CORNER, 40);
const LOWER_LIP: readonly Pt[] = cub(CHIN, m(480, 1240), m(652, 1192), CORNER, 40);
/** The crown, raised over #107's so the skull reads deeper behind the snout. */
const mt = (x: number, y: number): Pt => m(x, y - 46 * Math.min(1, Math.max(0, (x - 300) / 260)) ** 0.8);
const HEAD_TOP: readonly Pt[] = [
  ...cub(mt(284, 814), mt(266, 786), mt(286, 750), mt(336, 738), 12),
  ...cub(mt(336, 738), mt(460, 716), mt(640, 698), mt(800, 694), 18).slice(1),
  ...cub(mt(800, 694), mt(840, 693), mt(870, 696), mt(892, 700), 6).slice(1),
];
const HEAD_BACK: readonly Pt[] = cub(mt(892, 700), m(860, 790), m(770, 920), CORNER, 14);
const HEAD: readonly Pt[] = [...HEAD_TOP, ...HEAD_BACK.slice(1), ...[...UPPER_LIP].reverse().slice(1)];

function lowerJaw(): Pt[] {
  const n = normals(LOWER_LIP);
  const outer = LOWER_LIP.map((p, i) => {
    const w = (18 + 26 * Math.sin((i / (LOWER_LIP.length - 1)) * Math.PI * 0.85)) * K;
    const s = n[i]!.y > 0 ? 1 : -1;
    return pt(p.x + n[i]!.x * w * s, p.y + n[i]!.y * w * s);
  });
  return [...LOWER_LIP, ...outer.reverse()];
}
const LOWER_JAW = lowerJaw();

const SPINE = spineOf([m(520, 968), m(700, 960), m(880, 966), m(1060, 984), m(1260, 1000), m(1460, 1010)], 2);
const S = lengths(SPINE);
const DEPTH: readonly (readonly [number, number])[] = [[0, 520], [160, 548], [320, 556], [430, 520], [520, 450], [620, 340], [720, 240], [820, 186], [4000, 176]];
const BASE = 176 * K;

/** The body further back, looping across the foreground from off the right edge. */
const COIL = spineOf([pt(1320, 1420), pt(1040, 1540), pt(700, 1572), pt(350, 1556), pt(0, 1512), pt(-300, 1480)], 5);

function depthAt(s: number): number {
  const v = s / K;
  for (let i = 1; i < DEPTH.length; i++) {
    const [s1, w1] = DEPTH[i]!;
    const [s0, w0] = DEPTH[i - 1]!;
    if (v <= s1) return (w0 + (w1 - w0) * (1 - Math.cos(Math.PI * ((v - s0) / (s1 - s0)))) * 0.5) * K;
  }
  return DEPTH[DEPTH.length - 1]![1] * K;
}

const neck = (gulp: number): Lay => ({ spine: SPINE, widths: S.map((s) => depthAt(s) * (s < 560 ? 1 + 0.03 * gulp : 1)), base: BASE, headRight: false });

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

function clipBehindLips(ctx: CanvasRenderingContext2D): void {
  ctx.beginPath();
  ctx.rect(-400, -400, VIDEO.width + 800, VIDEO.height + 800);
  const front = [pt(-400, SNOUT.y - 60), pt(SNOUT.x, SNOUT.y - 60), ...UPPER_LIP, ...[...LOWER_LIP].reverse(), pt(CHIN.x, CHIN.y + 60), pt(-400, CHIN.y + 60)];
  front.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
  ctx.closePath();
  ctx.clip('evenodd');
}

/**
 * The neck's skin pulled apart over the fawn, the Burmese way: the blotched
 * scale rows spread along the body, the pale cream skin showing in the gaps
 * between them (widest near the jaws, where it is stretched thinnest), the
 * scales there standing apart as separate flecks; a sheen over the round.
 * No cross-hatch: the rows run with the body.
 */
function stretchedSkin(ctx: CanvasRenderingContext2D, lay: Lay, boil: number): void {
  const n = lay.spine.length;
  const top = lay.spine.map((p, i) => pt(p.x, p.y - lay.widths[i]! / 2));
  const low = lay.spine.map((p, i) => pt(p.x, p.y + lay.widths[i]! / 2));
  ctx.save();
  path(ctx, [...top, ...[...low].reverse()]);
  ctx.clip();
  // How stretched the skin is at x: most just behind the lips, easing off down the neck.
  const stretch = (x: number): number => Math.max(0, Math.min(1, 1 - (x - 640) / 520));
  const rng = createRng(8300 + boil);
  const rows = 15;
  for (let r = 1; r < rows; r++) {
    const v = r / rows;
    ctx.beginPath();
    for (let i = 0; i < n; i += 2) {
      const p = lay.spine[i]!;
      const y = p.y - lay.widths[i]! / 2 + lay.widths[i]! * v;
      if (i === 0) ctx.moveTo(p.x, y);
      else ctx.lineTo(p.x, y);
    }
    const g = ctx.createLinearGradient(600, 0, 1100, 0);
    g.addColorStop(0, rgba('#efe2c6', 0.62));
    g.addColorStop(0.55, rgba('#efe2c6', 0.34));
    g.addColorStop(1, rgba('#efe2c6', 0));
    ctx.strokeStyle = g;
    ctx.lineWidth = 7 * (1 - Math.abs(v - 0.5)) + 1.5;
    ctx.stroke();
  }
  // The scales standing apart where it is stretched thinnest: small separate flecks in the gaps.
  for (let i = 0; i < 520; i++) {
    const x = 620 + rng() ** 1.6 * 480;
    const k = stretch(x);
    if (rng() > k) continue;
    const j = Math.min(n - 1, Math.max(0, Math.round(((x - lay.spine[0]!.x) / (lay.spine[n - 1]!.x - lay.spine[0]!.x)) * (n - 1))));
    const p = lay.spine[j]!;
    const y = p.y + (rng() - 0.5) * lay.widths[j]! * 0.92;
    ctx.fillStyle = rgba(rng() < 0.5 ? BURM.brown : BURM.tan, 0.75);
    ctx.beginPath();
    ctx.ellipse(x, y, 4.5, 2.6, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  const round = ctx.createLinearGradient(0, 830, 0, 1290);
  round.addColorStop(0, 'rgba(20,12,8,0.3)');
  round.addColorStop(0.16, 'rgba(255,240,205,0.2)');
  round.addColorStop(0.5, 'rgba(255,240,205,0)');
  round.addColorStop(0.85, 'rgba(20,12,8,0.3)');
  round.addColorStop(1, 'rgba(20,12,8,0.5)');
  ctx.fillStyle = round;
  ctx.fillRect(600, 780, 700, 560);
  glaze(ctx, 860, 900, 220, 40, 0, '#ffd8a0', 0.22);
  ctx.restore();
}

/** Inside the lips: the mouth's pink lining just showing, and the lips' shadow on the fawn. */
function mouthEdge(ctx: CanvasRenderingContext2D): void {
  const lips = [...UPPER_LIP, ...[...LOWER_LIP].reverse().slice(1)];
  ctx.save();
  path(ctx, [...lips, pt(CHIN.x - 200, CHIN.y), pt(SNOUT.x - 200, SNOUT.y)]);
  ctx.clip();
  line(ctx, lips, 56, '#050406', 0.3);
  line(ctx, lips, 26, '#050406', 0.35);
  line(ctx, lips.map((p) => pt(p.x - 6, p.y)), 10, '#c27f78', 0.95);
  line(ctx, lips.map((p) => pt(p.x - 8, p.y)), 2.5, '#ecb3a8', 0.7);
  ctx.restore();
}

function lipScales(ctx: CanvasRenderingContext2D, lip: readonly Pt[], from: number, to: number, depth: number, side: 1 | -1, pits: (i: number) => boolean): void {
  const n = normals(lip);
  for (let i = from; i < to; i += 3) {
    const p = lip[i]!;
    const q = n[i]!;
    const s = (q.y < 0 ? 1 : -1) * side;
    line(ctx, [p, pt(p.x - q.x * depth * s, p.y - q.y * depth * s)], 1.7, BURM.line, 0.5);
    if (!pits(i)) continue;
    const c = pt(p.x - q.x * depth * 0.45 * s + 5, p.y - q.y * depth * 0.45 * s);
    ctx.save();
    ctx.fillStyle = '#2c1e10';
    ctx.globalAlpha = 0.9;
    ctx.beginPath();
    ctx.ellipse(c.x, c.y, 3.4, 5.2, Math.atan2(q.y, q.x), 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

function drawEye(ctx: CanvasRenderingContext2D, c: Pt, r: number): void {
  ctx.save();
  const g = ctx.createRadialGradient(c.x - 3, c.y + 2, 1, c.x, c.y, r);
  g.addColorStop(0, '#ecbd62');
  g.addColorStop(0.55, '#c9862e');
  g.addColorStop(1, '#5e3514');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(c.x, c.y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(94,53,20,0.45)';
  ctx.lineWidth = 0.9;
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(c.x + Math.cos(a) * r * 0.3, c.y + Math.sin(a) * r * 0.3);
    ctx.lineTo(c.x + Math.cos(a) * r * 0.92, c.y + Math.sin(a) * r * 0.92);
    ctx.stroke();
  }
  ctx.fillStyle = '#0c0806';
  ctx.beginPath();
  ctx.ellipse(c.x + 1, c.y, 3, r * 0.86, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(60,36,16,0.45)';
  ctx.beginPath();
  ctx.ellipse(c.x, c.y - r * 0.85, r, r * 0.45, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = BURM.line;
  ctx.lineWidth = 2.6;
  ctx.beginPath();
  ctx.arc(c.x, c.y, r, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = '#fffaf0';
  ctx.beginPath();
  ctx.arc(c.x - r * 0.38, c.y - r * 0.36, r * 0.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

const EYE = m(590, 744);

/** The Burmese markings on the head: the arrowhead over the crown, the pale stripe, the eye stripe and the wedge under the eye. */
function markings(ctx: CanvasRenderingContext2D, pen: Pen): void {
  const crown = HEAD_TOP.slice(3);
  const depth = (i: number): number => (8 + 70 * (i / (crown.length - 1)) ** 0.8) * K;
  const arrow = [...crown, ...[...crown].reverse().map((p, j) => pt(p.x, p.y + depth(crown.length - 1 - j)))];
  fill(ctx, arrow, BURM.brown, 0.97);
  ctx.save();
  path(ctx, arrow);
  ctx.clip();
  glaze(ctx, 740, 880, 150, 12, -0.03, BURM.brownLit, 0.6);
  glaze(ctx, 870, 905, 90, 22, 0, BURM.brownDeep, 0.6);
  ctx.restore();
  line(ctx, crown.map((p, i) => pt(p.x, p.y + depth(i))), 3, BURM.edge, 0.85);
  line(ctx, crown.map((p, i) => pt(p.x, p.y + depth(i) + 6)), 5, '#f0dcae', 0.55);
  // The eye stripe: from the nostril back through the eye to the corner of the mouth.
  const top = cub(m(300, 790), m(420, 730), m(540, 722), m(640, 752), 16);
  const back = cub(m(640, 752), m(720, 790), m(780, 870), m(830, 930), 12);
  const low = cub(m(820, 960), m(760, 890), m(690, 820), m(620, 782), 12);
  const front = cub(m(620, 782), m(540, 762), m(420, 772), m(306, 806), 16);
  const stripe = [...top, ...back.slice(1), ...low, ...front.slice(1)];
  fill(ctx, stripe, BURM.brownDeep, 0.92);
  line(ctx, [...top, ...back.slice(1)], 2.2, BURM.edge, 0.7);
  // The dark wedge under the eye, down to the lip.
  fill(ctx, [m(568, 764), m(614, 766), m(606, 822), m(586, 826)], BURM.brownDeep, 0.9);
  pen.hair([m(568, 764), m(586, 826)], 1.4, BURM.edge, 0.6);
}

function drawHead(ctx: CanvasRenderingContext2D, boil: number): void {
  const pen = new Pen(ctx, 8100 + boil, 0.7);
  const g = ctx.createLinearGradient(0, 860, 0, 1080);
  g.addColorStop(0, '#e0c088');
  g.addColorStop(0.3, '#cda468');
  g.addColorStop(0.7, '#a9844c');
  g.addColorStop(1, '#8e6c40');
  fill(ctx, HEAD, g);
  ctx.save();
  path(ctx, HEAD);
  ctx.clip();
  glaze(ctx, 640, 900, 160, 18, -0.1, '#fff2c8', 0.3);
  const n = normals(UPPER_LIP);
  const band = UPPER_LIP.map((p, i) => {
    const s = n[i]!.y < 0 ? 1 : -1;
    return pt(p.x + n[i]!.x * 24 * s, p.y + n[i]!.y * 24 * s);
  });
  fill(ctx, [...UPPER_LIP, ...band.reverse()], '#ecdcaa', 0.95);
  markings(ctx, pen);
  for (let i = 0; i < 220; i++) {
    const x = 520 + pen.rng() * 440;
    const y = 860 + pen.rng() * 200;
    pen.hair([pt(x, y), pt(x + 6, y + 2.5), pt(x + 4, y + 7)], 0.9, BURM.line, 0.16);
  }
  // The neck's blotches showing through at the back of the head.
  glaze(ctx, 900, 930, 60, 50, 0, BURM.tan, 0.5);
  ctx.restore();
  for (const [x, y, w, h] of [[306, 764, 24, 18], [338, 752, 32, 20], [378, 742, 36, 20], [336, 780, 28, 16], [418, 736, 34, 18]] as const) {
    const c = m(x, y);
    const hw = (w * K) / 2;
    const hh = (h * K) / 2;
    pen.stroke([pt(c.x - hw, c.y + hh), pt(c.x - hw + 2, c.y - hh), pt(c.x + hw, c.y - hh + 2), pt(c.x + hw - 2, c.y + hh), pt(c.x - hw, c.y + hh)], 1.4, BURM.line, 0.55, false);
  }
  ctx.save();
  ctx.fillStyle = '#1a120a';
  ctx.beginPath();
  const nostril = m(296, 784);
  ctx.ellipse(nostril.x, nostril.y, 6.5, 5, -0.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  lipScales(ctx, UPPER_LIP, 1, 26, 22, 1, (i) => i < 18);
  drawEye(ctx, EYE, 19);
  pen.stroke(HEAD_TOP, 4, BURM.line, 1);
  pen.stroke(UPPER_LIP, 3.6, BURM.line, 1);
  pen.hair(HEAD_BACK.slice(0, 10), 2.6, BURM.line, 0.25);
}

function drawLowerJaw(ctx: CanvasRenderingContext2D, boil: number): void {
  const pen = new Pen(ctx, 8200 + boil, 0.7);
  const g = ctx.createLinearGradient(0, 1210, 0, 1280);
  g.addColorStop(0, '#efe0b0');
  g.addColorStop(1, '#bfa670');
  fill(ctx, LOWER_JAW, g);
  ctx.save();
  path(ctx, LOWER_JAW);
  ctx.clip();
  glaze(ctx, 640, 1255, 120, 10, 0.02, mix('#8e6c40', '#000000', 0.2), 0.45);
  ctx.restore();
  lipScales(ctx, LOWER_LIP, 2, 38, 28, -1, (i) => i > 16);
  pen.stroke([...LOWER_JAW, LOWER_JAW[0]!], 3.6, BURM.line, 1);
}

/** The python and the fawn of frame 1 (no backdrop), for reuse. */
export function drawSwallowed(ctx: CanvasRenderingContext2D, cast: Cast, boil: number, gulp: number, nod: number, walk: number): void {
  drawSeg(ctx, cast.burm, boil, { spine: COIL, widths: COIL.map(() => 140), base: 140, headRight: true }, 0.8);
  drawSprite(ctx, cast.fawn, boil, { x: FAWN_AT.x + walk, y: FAWN_AT.y, scale: FAWN_AT.k });
  mouthEdge(ctx);
  const lay = neck(gulp);
  ctx.save();
  clipBehindLips(ctx);
  drawSeg(ctx, cast.burmBig, boil, lay, 0.25);
  stretchedSkin(ctx, lay, boil);
  ctx.restore();
  drawLowerJaw(ctx, boil);
  ctx.save();
  ctx.translate(CORNER.x, CORNER.y);
  ctx.rotate(-nod);
  ctx.translate(-CORNER.x, -CORNER.y);
  drawHead(ctx, boil);
  ctx.restore();
}

/** The hook at time t: draws the whole frame. */
export function drawHook(ctx: CanvasRenderingContext2D, cast: Cast, t: number, boil: number): void {
  const h = hookPose(t);
  ctx.save();
  ctx.translate(FOCUS.x, FOCUS.y);
  ctx.scale(h.zoom, h.zoom);
  ctx.translate(-FOCUS.x, -FOCUS.y);
  ctx.drawImage(cast.hookBg, -50, -50);
  drawSwallowed(ctx, cast, boil, h.gulp, h.nod, h.walk);
  ctx.restore();
  const v = ctx.createRadialGradient(VIDEO.width / 2, 1040, 420, VIDEO.width / 2, 1040, 1250);
  v.addColorStop(0, 'rgba(14,10,6,0)');
  v.addColorStop(1, 'rgba(14,10,6,0.6)');
  ctx.fillStyle = v;
  ctx.fillRect(0, 0, VIDEO.width, VIDEO.height);
}
