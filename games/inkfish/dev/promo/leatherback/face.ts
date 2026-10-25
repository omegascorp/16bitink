import { INK, Pen, type Pt } from '../../../src/art/pen';
import { createRng } from '../../../src/logic/rng';
import { lerp } from '../short';
import { addPath, fillShape, hash, ink, mix, pathOf, smoothClosed, smoothOpen } from './paint';

/**
 * The leatherback head-on, in its own frame (px at scale 1, the middle of the
 * open mouth at the origin, y down): the broad dark head speckled white, the
 * eyes set far out at the sides, the upper beak's two sharp cusps either side
 * of its notch and the lower beak's hook, and, seen from further back, the
 * front of its ridged shell and the long front flippers spread like wings.
 * The mouth's opening is a hole: the throat (tunnel.ts) is drawn through it.
 */

const SKIN_TOP = '#1f2a3a';
const SKIN = '#344255';
const SKIN_FLANK = '#506075';
const SPOT = '#e7e2d6';
const BEAK = '#8d847c';
const BEAK_DARK = '#3a3537';
const BEAK_EDGE = '#ddd3c4';
const PALATE = '#d7a3a0';

/** The opening's upper edge, corner to corner over the notch, wide open; and the lower edge back round under the hook. */
const UPPER_OPEN: readonly Pt[] = [
  { x: -390, y: 0 }, { x: -372, y: -150 }, { x: -312, y: -268 }, { x: -205, y: -348 }, { x: -128, y: -370 }, { x: -96, y: -362 },
  { x: -66, y: -236 }, { x: -44, y: -350 }, { x: 0, y: -384 }, { x: 44, y: -350 }, { x: 66, y: -236 }, { x: 96, y: -362 }, { x: 128, y: -370 },
  { x: 205, y: -348 }, { x: 312, y: -268 }, { x: 372, y: -150 }, { x: 390, y: 0 },
];
const LOWER_OPEN: readonly Pt[] = [
  { x: 390, y: 0 }, { x: 362, y: 170 }, { x: 290, y: 300 }, { x: 182, y: 380 }, { x: 70, y: 408 }, { x: 26, y: 398 }, { x: 0, y: 296 },
  { x: -26, y: 398 }, { x: -70, y: 408 }, { x: -182, y: 380 }, { x: -290, y: 300 }, { x: -362, y: 170 }, { x: -390, y: 0 },
];
/** Where the shut mouth's line runs. */
const SHUT_Y = 150;

/** The opening at gape g (0 shut .. 1 wide). */
export function mouthOf(g: number): { readonly upper: Pt[]; readonly lower: Pt[]; readonly hole: Pt[] } {
  const upper = UPPER_OPEN.map((p) => ({ x: p.x * lerp(0.92, 1, g), y: lerp(SHUT_Y + 0.14 * p.y, p.y, g) }));
  const lower = LOWER_OPEN.map((p) => ({ x: p.x * lerp(0.92, 1, g), y: lerp(SHUT_Y + 6 + 0.05 * p.y, p.y, g) }));
  return { upper, lower, hole: [...upper, ...lower.slice(1, -1)] };
}

/** The head's outline at gape g: the skull over the top (fixed), the jaws and chin dropping as it opens. */
function headOf(g: number): Pt[] {
  const chin = lerp(380, 610, g);
  const jaw = lerp(250, 430, g);
  return smoothClosed([
    { x: 0, y: -680 }, { x: 290, y: -640 }, { x: 455, y: -515 }, { x: 530, y: -330 }, { x: 548, y: -120 }, { x: 525, y: 80 },
    { x: 475, y: jaw * 0.62 }, { x: 395, y: jaw }, { x: 230, y: chin - 50 }, { x: 0, y: chin }, { x: -230, y: chin - 50 }, { x: -395, y: jaw },
    { x: -475, y: jaw * 0.62 }, { x: -525, y: 80 }, { x: -548, y: -120 }, { x: -530, y: -330 }, { x: -455, y: -515 }, { x: -290, y: -640 },
  ], 5);
}

/** White speckles on the head and jaws, fixed to the skin (not the line boil): sparse on the crown, thick down the jaws. */
const SPOTS = (() => {
  const rng = createRng(1956);
  const out: { x: number; y: number; r: number; k: number; a: number }[] = [];
  while (out.length < 420) {
    const x = (rng() - 0.5) * 1090;
    const y = -690 + rng() * 1350;
    if ((x / 550) ** 2 + ((y + 20) / 680) ** 2 > 0.97) continue;
    // Not in the mouth or on the beak.
    if ((x / 450) ** 2 + (y / 470) ** 2 < 1) continue;
    const dense = 0.25 + 0.75 * Math.min(1, Math.max(0, (y + 300) / 800)) + 0.4 * Math.min(1, Math.abs(x) / 560);
    if (rng() > dense) continue;
    const r = 2 + rng() ** 2 * 8;
    const k = rng();
    const a = rng() * Math.PI;
    out.push({ x, y, r, k, a });
    // Speckles come in little clusters.
    if (rng() < 0.5) out.push({ x: x + (rng() - 0.5) * 22, y: y + (rng() - 0.5) * 16, r: r * 0.55, k, a: a + 1 });
  }
  return out;
})();

export interface FaceView {
  /** Screen point of the face's origin, its scale, its horizontal squeeze (turning). */
  readonly at: Pt;
  readonly s: number;
  readonly squeeze: number;
  readonly gape: number;
}

/** Face frame → screen. */
export const faceToScreen = (v: FaceView) => (p: Pt): Pt => ({ x: v.at.x + p.x * v.s * v.squeeze, y: v.at.y + p.y * v.s });

/** The mouth's hole on screen, for clipping the throat to it. */
export function mouthHole(v: FaceView): Pt[] {
  return smoothClosed(mouthOf(v.gape).hole, 3).map(faceToScreen(v));
}

/** The body behind the head, seen from the front: the front of the shell and the front flippers (only worth drawing from further back). */
export function drawFrontBody(ctx: CanvasRenderingContext2D, v: FaceView, boil: number, t: number): void {
  if (v.s > 1.8) return;
  const S = faceToScreen(v);
  const pen = new Pen(ctx, 6113 + boil * 977, 1.1);
  const w = Math.max(1.2, 6 * v.s);
  // The front flippers, spread wide and a little down: long tapering blades, beating slowly.
  for (const side of [-1, 1]) {
    const beat = 0.08 * Math.sin(t * 3.2);
    const root = { x: side * 470, y: 360 };
    const blade: Pt[] = [];
    const back: Pt[] = [];
    for (let i = 0; i <= 12; i++) {
      const u = i / 12;
      const a = 0.85 + beat + 0.25 * u;
      const x = root.x + side * Math.cos(a) * 1300 * u;
      const y = root.y + Math.sin(a) * 1300 * u - 160 * Math.sin(Math.PI * u);
      const half = lerp(200, 40, u ** 0.8);
      blade.push({ x, y: y - half });
      back.push({ x, y: y + half * 0.8 });
    }
    const outline = smoothClosed([...blade, ...[...back].reverse()], 3).map(S);
    const top = S({ x: root.x, y: root.y - 150 });
    const bot = S({ x: root.x, y: root.y + 150 });
    const g = ctx.createLinearGradient(top.x, top.y, bot.x, bot.y);
    g.addColorStop(0, '#8496ad');
    g.addColorStop(1, '#43526a');
    fillShape(ctx, outline, g);
    // Pale trailing edge, white specks.
    pen.hair(back.map(S), Math.max(1, 5 * v.s), '#c9c4b8', 0.7);
    pen.hair(blade.map(S), Math.max(1.2, 10 * v.s), '#7f97ad', 0.6);
    for (let i = 0; i < 26; i++) {
      const u = 0.1 + 0.85 * hash(i * 7 + (side > 0 ? 3 : 0));
      const p = blade[Math.round(u * 12)]!;
      const q = back[Math.round(u * 12)]!;
      const k = 0.2 + 0.6 * hash(i * 13 + 1);
      const at = S({ x: lerp(p.x, q.x, k), y: lerp(p.y, q.y, k) });
      pen.dot(at.x, at.y, Math.max(1.2, 14 * v.s), SPOT, 0.8);
    }
    ink(pen, outline, w);
  }
  // The shell's front: a dark dome over the shoulders, its ridges running back over the top.
  const dome = smoothClosed([
    { x: -960, y: 420 }, { x: -1040, y: 120 }, { x: -930, y: -260 }, { x: -600, y: -600 }, { x: 0, y: -740 }, { x: 600, y: -600 },
    { x: 930, y: -260 }, { x: 1040, y: 120 }, { x: 960, y: 420 }, { x: 0, y: 500 },
  ], 6).map(S);
  const top = S({ x: 0, y: -740 });
  const bottom = S({ x: 0, y: 420 });
  const g = ctx.createLinearGradient(top.x, top.y, bottom.x, bottom.y);
  g.addColorStop(0, '#3e4e63');
  g.addColorStop(0.5, '#1f2a38');
  g.addColorStop(1, '#0c1118');
  fillShape(ctx, dome, g);
  for (let k = -3; k <= 3; k++) {
    const x0 = k * 260;
    const ridge = smoothOpen([{ x: x0 * 1.12, y: -150 }, { x: x0 * 0.85, y: -450 }, { x: x0 * 0.35, y: -720 }], 5).map(S);
    pen.hair(ridge, Math.max(1.5, 12 * v.s), '#7f97ad', 0.75);
    pen.hair(ridge.map((p) => ({ x: p.x + 2, y: p.y + 3 })), Math.max(0.8, 3 * v.s), INK, 0.6);
  }
  // Light from the surface along the top of the shell.
  pen.hair(smoothOpen([{ x: -1010, y: 120 }, { x: -910, y: -260 }, { x: -590, y: -590 }, { x: 0, y: -725 }, { x: 590, y: -590 }, { x: 910, y: -260 }, { x: 1010, y: 120 }], 6).map((p) => S({ x: p.x * 0.97, y: p.y * 0.97 + 10 })), Math.max(1.5, 14 * v.s), '#7f97ad', 0.55);
  ink(pen, dome, w);
  // The neck under the head: dark skin, speckled.
  const neck = smoothClosed([{ x: -440, y: 250 }, { x: 0, y: 200 }, { x: 440, y: 250 }, { x: 470, y: 620 }, { x: 0, y: 700 }, { x: -470, y: 620 }], 5).map(S);
  const nt = S({ x: 0, y: 250 });
  const nb = S({ x: 0, y: 700 });
  const ng = ctx.createLinearGradient(nt.x, nt.y, nb.x, nb.y);
  ng.addColorStop(0, '#4a5562');
  ng.addColorStop(1, '#151b24');
  fillShape(ctx, neck, ng);
  pen.stipple(neck, 160, () => 0.7, Math.max(0.6, 2.6 * v.s), SPOT);
  for (const k of [-0.6, -0.2, 0.2, 0.6]) pen.hair(smoothOpen([{ x: k * 520, y: 300 }, { x: k * 580, y: 480 }, { x: k * 620, y: 640 }], 4).map(S), Math.max(0.6, 3 * v.s), INK, 0.35);
  ink(pen, neck, w * 0.8);
}

/** The head over the throat: skin with the mouth as a hole, speckles, the beak's rims, cusps and hook, and the eyes. */
export function drawFace(ctx: CanvasRenderingContext2D, v: FaceView, boil: number): void {
  const S = faceToScreen(v);
  const pen = new Pen(ctx, 7177 + boil * 977, 1.2);
  const w = Math.max(1.2, 6.5 * v.s);
  const mouth = mouthOf(v.gape);
  const hole = smoothClosed(mouth.hole, 3).map(S);
  const head = headOf(v.gape).map(S);
  const top = S({ x: 0, y: -690 });
  const bottom = S({ x: 0, y: 650 });
  // Shadow just inside the lips: the mouth is deep.
  ctx.save();
  pathOf(ctx, hole);
  ctx.clip();
  ctx.strokeStyle = 'rgba(18,4,7,0.55)';
  ctx.lineWidth = 70 * v.s;
  ctx.lineJoin = 'round';
  pathOf(ctx, hole);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(18,4,7,0.35)';
  ctx.lineWidth = 160 * v.s;
  ctx.stroke();
  ctx.restore();
  // The skin: dark over the top, a little lighter down the cheeks.
  ctx.save();
  pathOf(ctx, head);
  addPath(ctx, hole);
  ctx.clip('evenodd');
  const g = ctx.createLinearGradient(top.x, top.y, bottom.x, bottom.y);
  g.addColorStop(0, SKIN_TOP);
  g.addColorStop(0.45, SKIN);
  g.addColorStop(0.8, SKIN_FLANK);
  g.addColorStop(1, '#55606d');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  // Light from above on the crown, shade down the sides.
  const c = S({ x: 0, y: -520 });
  const sheen = ctx.createRadialGradient(c.x, c.y, 0, c.x, c.y, 520 * v.s);
  sheen.addColorStop(0, 'rgba(120,140,160,0.35)');
  sheen.addColorStop(1, 'rgba(120,140,160,0)');
  ctx.fillStyle = sheen;
  ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  // The snout over the beak catches the light; the cheeks under the eyes fall into shade.
  const snout = S({ x: 0, y: -430 });
  const sg = ctx.createRadialGradient(snout.x, snout.y, 0, snout.x, snout.y, 330 * v.s);
  sg.addColorStop(0, 'rgba(150,165,185,0.22)');
  sg.addColorStop(1, 'rgba(150,165,185,0)');
  ctx.fillStyle = sg;
  ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  for (const side of [-1, 1]) {
    const cheek = S({ x: side * 470, y: 120 });
    const cg = ctx.createRadialGradient(cheek.x, cheek.y, 0, cheek.x, cheek.y, 260 * v.s);
    cg.addColorStop(0, 'rgba(4,6,10,0.45)');
    cg.addColorStop(1, 'rgba(4,6,10,0)');
    ctx.fillStyle = cg;
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  }
  // The leatherback's pink spot on the crown.
  const pink = S({ x: 0, y: -610 });
  const pg = ctx.createRadialGradient(pink.x, pink.y, 0, pink.x, pink.y, 80 * v.s);
  pg.addColorStop(0, 'rgba(222,150,160,0.55)');
  pg.addColorStop(1, 'rgba(222,150,160,0)');
  ctx.fillStyle = pg;
  ctx.beginPath();
  ctx.ellipse(pink.x, pink.y, 80 * v.s * v.squeeze, 46 * v.s, 0, 0, Math.PI * 2);
  ctx.fill();
  for (const sp of SPOTS) {
    const p = S(sp);
    ctx.globalAlpha = 0.4 + 0.5 * sp.k;
    ctx.fillStyle = sp.k > 0.88 ? '#d9aeb0' : SPOT;
    ctx.beginPath();
    ctx.ellipse(p.x, p.y, sp.r * v.s * v.squeeze * (0.8 + 0.6 * sp.k), sp.r * v.s * 0.7, sp.a, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  // Hatching down the shaded cheeks.
  for (const side of [-1, 1]) {
    const band = [S({ x: side * 600, y: -400 }), S({ x: side * 430, y: -400 }), S({ x: side * 440, y: 500 }), S({ x: side * 600, y: 500 })];
    pen.hatch(band, Math.max(4, 16 * v.s), side > 0 ? 2.1 : 1.05, Math.max(0.6, 2.2 * v.s), { color: '#05080c', alpha: 0.45 });
  }
  ctx.restore();
  // The beak's rims: a pale horny band round the opening, upper and lower.
  drawRim(ctx, pen, v, mouth.upper, -1);
  drawRim(ctx, pen, v, mouth.lower, 1);
  drawFangs(ctx, pen, v, mouth);
  // Light from the surface along the crown.
  const crown = headOf(v.gape).filter((p) => p.y < -150).map((p) => ({ x: p.x * 0.975, y: p.y * 0.975 + 6 })).sort((a, b) => a.x - b.x).map(S);
  ctx.save();
  ctx.globalAlpha = 0.4;
  ctx.strokeStyle = '#9fb6cc';
  ctx.lineWidth = Math.max(1.5, 14 * v.s);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  pathOf(ctx, crown, false);
  ctx.stroke();
  ctx.restore();
  ink(pen, head, w);
  ink(pen, hole, w * 0.9);
  // Furrows over the brow and the beak's ridge line down to the notch.
  pen.hair(smoothOpen([{ x: -210, y: -560 }, { x: -60, y: -600 }, { x: 60, y: -600 }, { x: 210, y: -560 }], 4).map(S), Math.max(0.8, 3 * v.s), INK, 0.55);
  pen.hair(smoothOpen([{ x: 0, y: -640 }, { x: 4, y: -540 }, { x: 0, y: -440 }], 3).map(S), Math.max(0.8, 3 * v.s), INK, 0.4);
  for (const side of [-1, 1]) drawEye(ctx, pen, v, side);
}

/** A band of pale beak round one edge of the opening, its cusps (upper) or hook (lower) picked out. */
function drawRim(ctx: CanvasRenderingContext2D, pen: Pen, v: FaceView, edge: readonly Pt[], dir: 1 | -1): void {
  const S = faceToScreen(v);
  const smooth = smoothOpen(edge, 3);
  // Outward from the opening: away from the mouth's middle.
  const out = smooth.map((p) => {
    const len = Math.hypot(p.x, p.y) || 1;
    const k = 40 * (0.45 + 0.55 * Math.min(1, Math.abs(p.y) / 200));
    return { x: p.x + (p.x / len) * k * 0.6, y: p.y + (p.y / len) * k + dir * 8 };
  });
  const band = [...smooth, ...[...out].reverse()].map(S);
  const a = S({ x: 0, y: dir * 200 });
  const b = S({ x: 0, y: dir * 420 });
  const g = ctx.createLinearGradient(a.x, a.y, b.x, b.y);
  g.addColorStop(0, BEAK);
  g.addColorStop(1, BEAK_DARK);
  fillShape(ctx, band, g);
  // The inner lip: the palate's pink just inside the edge.
  ctx.save();
  ctx.globalAlpha = 0.7;
  ctx.strokeStyle = PALATE;
  ctx.lineWidth = Math.max(1, 9 * v.s);
  pathOf(ctx, smooth.map((p) => S({ x: p.x * 0.985, y: p.y * 0.985 })), false);
  ctx.stroke();
  ctx.restore();
  pen.hair(out.map(S), Math.max(0.8, 3.2 * v.s), INK, 0.8);
  // The cutting edge, pale and sharp.
  pen.hair(smooth.map((p) => S({ x: p.x * 1.012, y: p.y * 1.012 })), Math.max(0.8, 5 * v.s), BEAK_EDGE, 0.85);
  // Ridges on the horn.
  for (let i = 2; i < smooth.length - 2; i += 3) pen.hair([S(smooth[i]!), S(out[i]!)], Math.max(0.5, 1.6 * v.s), BEAK_DARK, 0.5);
}

/** The upper beak's two sharp cusps either side of its notch, and the lower beak's hook: pale horn, like fangs. */
function drawFangs(ctx: CanvasRenderingContext2D, pen: Pen, v: FaceView, mouth: ReturnType<typeof mouthOf>): void {
  const S = faceToScreen(v);
  const u = mouth.upper;
  const l = mouth.lower;
  const fangs: Pt[][] = [
    [u[5]!, u[6]!, u[7]!],
    [u[9]!, u[10]!, u[11]!],
    [l[5]!, l[6]!, l[7]!],
  ];
  for (const [a, tip, b] of fangs) {
    const base = { x: (a!.x + b!.x) / 2, y: (a!.y + b!.y) / 2 };
    const shape = [{ x: a!.x, y: a!.y }, { x: (a!.x + tip!.x) / 2 + (base.x - tip!.x) * 0.06, y: (a!.y + tip!.y) / 2 }, tip!, { x: (b!.x + tip!.x) / 2 - (base.x - tip!.x) * 0.06, y: (b!.y + tip!.y) / 2 }, { x: b!.x, y: b!.y }].map(S);
    const g = ctx.createLinearGradient(S(base).x, S(base).y, S(tip!).x, S(tip!).y);
    g.addColorStop(0, '#9b928a');
    g.addColorStop(0.7, '#e2d9cc');
    g.addColorStop(1, '#f6efe3');
    fillShape(ctx, shape, g);
    pen.stroke(shape, Math.max(1, 4.5 * v.s), INK);
    pen.hair([S({ x: base.x * 0.7 + tip!.x * 0.3 - 6, y: base.y * 0.7 + tip!.y * 0.3 }), S({ x: base.x * 0.2 + tip!.x * 0.8 - 2, y: base.y * 0.2 + tip!.y * 0.8 })], Math.max(0.6, 3 * v.s), '#fffaf0', 0.7);
  }
}

function drawEye(ctx: CanvasRenderingContext2D, pen: Pen, v: FaceView, side: number): void {
  const S = faceToScreen(v);
  const c = S({ x: side * 448, y: -260 });
  const rx = 60 * v.s * v.squeeze;
  const ry = 46 * v.s;
  const tilt = side * 0.22;
  ctx.save();
  // A sunken socket of soft skin, the pinkish lids, the dark wet eye looking straight at us under a heavy lid.
  const socket = ctx.createRadialGradient(c.x, c.y, 0, c.x, c.y, rx * 2.1);
  socket.addColorStop(0, 'rgba(5,7,10,0.75)');
  socket.addColorStop(1, 'rgba(5,7,10,0)');
  ctx.fillStyle = socket;
  ctx.beginPath();
  ctx.ellipse(c.x, c.y, rx * 2.1, ry * 2.1, tilt, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#8a6870';
  ctx.beginPath();
  ctx.ellipse(c.x, c.y, rx * 1.3, ry * 1.3, tilt, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#050608';
  ctx.beginPath();
  ctx.ellipse(c.x, c.y + ry * 0.08, rx, ry, tilt, 0, Math.PI * 2);
  ctx.fill();
  const shine = ctx.createRadialGradient(c.x - side * rx * 0.2, c.y - ry * 0.1, 0, c.x, c.y, rx);
  shine.addColorStop(0, 'rgba(90,70,60,0.6)');
  shine.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = shine;
  ctx.fill();
  ctx.fillStyle = 'rgba(255,248,236,0.95)';
  ctx.beginPath();
  ctx.ellipse(c.x - side * rx * 0.3, c.y - ry * 0.05, rx * 0.16, ry * 0.18, 0, 0, Math.PI * 2);
  ctx.fill();
  // The heavy upper lid, drooping over the top of the eye.
  // The upper lid over the top third, its inner corner raised: worried.
  ctx.fillStyle = SKIN;
  ctx.beginPath();
  ctx.ellipse(c.x + side * rx * 0.15, c.y - ry * 1.2, rx * 1.5, ry * 0.85, -side * 0.28, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  const lid = [{ x: c.x - rx * 1.25, y: c.y - ry * 0.45 + side * ry * 0.3 }, { x: c.x, y: c.y - ry * 0.55 }, { x: c.x + rx * 1.25, y: c.y - ry * 0.45 - side * ry * 0.3 }];
  pen.stroke(lid, Math.max(1, 5 * v.s), INK);
  pen.hair(lid.map((p) => ({ x: p.x, y: p.y - ry * 0.55 })), Math.max(0.6, 2 * v.s), INK, 0.5);
  pen.hair([{ x: c.x - rx * 1.1, y: c.y + ry * 0.9 }, { x: c.x, y: c.y + ry * 1.2 }, { x: c.x + rx * 1.1, y: c.y + ry * 0.9 }], Math.max(0.6, 2.5 * v.s), INK, 0.6);
}
