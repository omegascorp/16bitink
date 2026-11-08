import { PAPER_FILL } from '../../../src/art/fish/kit';
import { ellipse, INK, Pen, type Pt } from '../../../src/art/pen';
import { createRng } from '../../../src/logic/rng';

/**
 * The stargazer, face-on: a wide, flat, boxy head; two eyes on top of the
 * crown, looking up under heavy grumpy brows; the mouth a great frowning slot
 * across the front with fringed lips, opening upward as the lower jaw drops;
 * the gill covers with a venom spine jutting out behind each; the pectoral
 * fins spread like wings behind. Painted like the game's fish: paper, a wash
 * of mottled olive-brown with pale spots, shaded with stipple and hatching,
 * and inked with the wobbly pen (a fresh seed per boil frame).
 *
 * Head px, origin at the middle of the face, y down. The sand cuts it off
 * wherever it's buried. Drawn in two parts so a fish in its mouth can go
 * between them: the back (everything down to the upper lip and the inside of
 * the mouth), then the chin (the lower jaw, its teeth and fringe).
 */

export interface FaceLook {
  /** 0 shut .. 1 gaping. */
  readonly gape: number;
  /** Pupils, -1 .. 1 each way (up is -y). */
  readonly look: { readonly x: number; readonly y: number };
  /** Eyelids, 0 open .. 1 shut. */
  readonly lids: number;
  /** Sand over the face, 0 .. 1. */
  readonly dust: number;
  /** The spines pushed out from behind the gill covers, 0 .. 1. */
  readonly spines: number;
  readonly boil: number;
}

export const FACE = {
  crown: -224,
  eyeX: 120,
  eyeY: -205,
  eyeR: 58,
  cornerX: 290,
  cornerY: 20,
  lipMid: -100,
  /** How far the lower lip's middle drops at full gape. */
  drop: 340,
  /** Half the width across the cheeks. */
  halfWidth: 384,
  bottom: 480,
} as const;

const SKIN = '#5e4931';
const SKIN_DARK = '#3e2f22';
const SKIN_LIGHT = '#c9b48a';
const SPOT = '#f4ecd6';
const CHIN = '#735c3e';
const MOUTH = '#2a1218';
const THROAT = '#0b0507';
const IRIS = '#dba63a';
const FIN = '#a3713e';
const SPINE = '#efe4c8';
const SAND_DUST = '#cdb98c';

const LIP_N = 23;
const bump = (x: number, cx: number): number => Math.max(0, 1 - (x / cx) ** 2) ** 0.75;
export const cornerXAt = (gape: number): number => FACE.cornerX * (1 + 0.06 * gape);
const cornerYAt = (gape: number): number => FACE.cornerY + 26 * gape;

function lip(gape: number, mid: number): Pt[] {
  const cx = cornerXAt(gape);
  const cy = cornerYAt(gape);
  return Array.from({ length: LIP_N }, (_, i) => {
    const x = -cx + (2 * cx * i) / (LIP_N - 1);
    return { x, y: cy + (mid - cy) * bump(x, cx) };
  });
}

/** The upper lip, left corner to right: a frown, its middle high. It lifts a little as the mouth opens. */
export const upperLip = (gape: number): Pt[] => lip(gape, FACE.lipMid - 28 * gape);
/** The lower lip, left corner to right: on the upper lip when shut, dropping into a deep U as it opens. */
export const lowerLip = (gape: number): Pt[] => lip(gape, FACE.lipMid + FACE.drop * gape);

/** The open mouth, between the lips. */
export const cavity = (gape: number): Pt[] => [...upperLip(gape), ...lowerLip(gape).reverse()];

/** The lower jaw: from the lower lip down past the sand. */
export function chinPlate(gape: number): Pt[] {
  const cx = cornerXAt(gape);
  return [...lowerLip(gape), { x: cx + 45, y: FACE.bottom }, { x: -cx - 45, y: FACE.bottom }];
}

/** Anything held in the mouth is seen only below the upper lip (between the corners) or out past the corners. */
export function belowUpperLip(gape: number): Pt[] {
  const cx = cornerXAt(gape);
  const cy = cornerYAt(gape);
  return [
    { x: -3000, y: -900 }, { x: -cx - 30, y: -900 }, { x: -cx - 30, y: cy }, ...upperLip(gape), { x: cx + 30, y: cy },
    { x: cx + 30, y: -900 }, { x: 3000, y: -900 }, { x: 3000, y: 3000 }, { x: -3000, y: 3000 },
  ];
}

/** The head's outline (fixed): flat crown, cheeks widening to the gill covers. */
export const HEAD: readonly Pt[] = (() => {
  const right: Pt[] = [
    { x: 0, y: -224 }, { x: 110, y: -226 }, { x: 210, y: -218 }, { x: 282, y: -190 }, { x: 330, y: -135 }, { x: 356, y: -50 },
    { x: 374, y: 50 }, { x: 390, y: 150 }, { x: 398, y: 250 }, { x: 396, y: 360 }, { x: 392, y: FACE.bottom },
  ];
  // Down the right side, across the bottom, and up the left (mirrored) back to the crown's middle.
  const left = right.slice(1).reverse().map((p) => ({ x: -p.x, y: p.y }));
  return [...right, ...left];
})();

/** A closed, slightly lumpy blob round (cx, cy). */
function blob(cx: number, cy: number, rx: number, ry: number, seed: number): Pt[] {
  const rng = createRng(seed);
  const ph = [rng() * 6, rng() * 6];
  return Array.from({ length: 18 }, (_, i) => {
    const a = (i / 18) * Math.PI * 2;
    const k = 1 + 0.12 * Math.sin(a * 3 + ph[0]!) + 0.07 * Math.sin(a * 5 + ph[1]!);
    return { x: cx + Math.cos(a) * rx * k, y: cy + Math.sin(a) * ry * k };
  });
}

/** Fixed pale spots, and soft dark blotches over the head (head px). */
const MOTTLE = (() => {
  const rng = createRng(4242);
  const spots: { shape: Pt[]; pale: boolean; x: number; y: number; r: number }[] = [];
  let i = 0;
  while (spots.length < 110) {
    i++;
    const x = (rng() * 2 - 1) * 360;
    const y = -222 + rng() * 680;
    const inEye = Math.hypot(Math.abs(x) - FACE.eyeX, y - FACE.eyeY) < FACE.eyeR * 1.35;
    if (inEye || Math.abs(x) > 350 - Math.max(0, -y - 100) * 0.55) continue;
    const pale = spots.length % 4 !== 0;
    const r = pale ? 5 + rng() * 12 : 22 + rng() * 30;
    spots.push({ shape: blob(x, y, r, r * (0.7 + 0.3 * rng()), 900 + i), pale, x, y, r });
  }
  return spots;
})();

/** Little bony pores over the crown and cheeks (head px). */
const PORES = (() => {
  const rng = createRng(777);
  const out: { x: number; y: number; r: number }[] = [];
  while (out.length < 260) {
    const x = (rng() * 2 - 1) * 360;
    const y = -222 + rng() * 560;
    if (Math.hypot(Math.abs(x) - FACE.eyeX, y - FACE.eyeY) < FACE.eyeR * 1.3 || Math.abs(x) > 350 - Math.max(0, -y - 100) * 0.55) continue;
    out.push({ x, y, r: 1.6 + rng() * 2.6 });
  }
  return out;
})();

/** Behind the head: the shoulders, the pectoral fins spread out, and the spines from behind the gill covers. */
function drawBehind(pen: Pen, ctx: CanvasRenderingContext2D, look: FaceLook): void {
  for (const s of [-1, 1] as const) {
    // The shoulders under the cheeks.
    const shoulder = [{ x: s * 300, y: 160 }, { x: s * 440, y: 320 }, { x: s * 470, y: 700 }, { x: s * 240, y: 700 }];
    pen.fill(shoulder, SKIN_DARK, 0.95);
    // The pectoral fin: a big fan, rays radiating out and down, banded.
    const root = { x: s * 360, y: 250 };
    const rays = Array.from({ length: 10 }, (_, i) => {
      const a = -0.6 + (i / 9) * 1.5;
      const len = 270 - 50 * Math.abs(i - 3) / 5;
      return { x: root.x + s * Math.cos(a) * len, y: root.y + Math.sin(a) * len };
    });
    const fan = [{ x: root.x, y: root.y - 34 }, ...rays, { x: root.x, y: root.y + 80 }];
    pen.fill(fan, PAPER_FILL, 1);
    pen.clipped(fan, () => {
      pen.fill(fan, FIN, 0.7);
      const g = ctx.createRadialGradient(root.x, root.y, 30, root.x, root.y, 280);
      g.addColorStop(0, 'rgba(40,22,10,0.5)');
      g.addColorStop(1, 'rgba(255,230,190,0.15)');
      ctx.fillStyle = g;
      ctx.fillRect(root.x - 300, root.y - 300, 600, 600);
      for (let k = 0; k < 3; k++) {
        pen.stroke(rays.map((r) => ({ x: root.x + (r.x - root.x) * (0.42 + 0.2 * k), y: root.y + (r.y - root.y) * (0.42 + 0.2 * k) })), 9, SKIN_DARK, 0.3, false);
      }
    });
    for (const r of rays) pen.hair([root, r], 1.6, INK, 0.65);
    pen.stroke([...fan.slice(1, -1)], 2.6, INK, 1);
    // The venom spine: a sharp ivory blade jutting out from behind the gill cover, up and out.
    const tip = spineTip(s, look.spines);
    const blade = [{ x: s * 330, y: 128 }, { x: tip.x - s * 22, y: tip.y + 3 }, tip, { x: tip.x - s * 28, y: tip.y + 14 }, { x: s * 334, y: 176 }];
    pen.fill(blade, SPINE, 1);
    pen.clipped(blade, () => pen.hatch(blade, 5, s > 0 ? 0.35 : Math.PI - 0.35, 1, { alpha: 0.4, onlyBelow: 138 }));
    pen.stroke([...blade, blade[0]!], 2.4, INK, 1);
  }
}

/** The tip of a spine (head px), for its glint: further out and higher as it's pushed out. */
export const spineTip = (side: 1 | -1, spines: number): Pt => ({ x: side * (430 + 150 * spines), y: 104 - 70 * spines });

/** A soft round wash of colour (radial gradient) at (x, y). */
function wash(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, rgb: string, alpha: number): void {
  const g = ctx.createRadialGradient(x, y, r * 0.1, x, y, r);
  g.addColorStop(0, `rgba(${rgb},${alpha})`);
  g.addColorStop(1, `rgba(${rgb},0)`);
  ctx.fillStyle = g;
  ctx.fillRect(x - r, y - r, 2 * r, 2 * r);
}

function drawHead(pen: Pen, ctx: CanvasRenderingContext2D, look: FaceLook): void {
  const shape = HEAD;
  pen.fill(shape, PAPER_FILL, 1);
  pen.clipped(shape, () => {
    pen.fill(shape, SKIN, 0.95);
    // Lit from above: the crown pale, the cheeks and the throat in shadow, the edges darker (it's round).
    const g = ctx.createLinearGradient(0, FACE.crown, 0, 400);
    g.addColorStop(0, 'rgba(255,238,200,0.5)');
    g.addColorStop(0.4, 'rgba(255,238,200,0)');
    g.addColorStop(1, 'rgba(25,14,8,0.62)');
    ctx.fillStyle = g;
    ctx.fillRect(-420, FACE.crown - 20, 840, 760);
    const side = ctx.createRadialGradient(-40, -80, 140, 0, -40, 420);
    side.addColorStop(0, 'rgba(25,14,8,0)');
    side.addColorStop(1, 'rgba(25,14,8,0.5)');
    ctx.fillStyle = side;
    ctx.fillRect(-420, FACE.crown - 20, 840, 760);
    // Watercolour: soft dark blotches and warm glazes, then pores and the pale spots.
    for (const m of MOTTLE) if (!m.pale) wash(ctx, m.x, m.y, m.r * 1.7, '44,30,18', 0.42);
    wash(ctx, -150, -170, 190, '255,236,190', 0.3);
    wash(ctx, 170, 60, 220, '160,100,52', 0.25);
    wash(ctx, -220, 120, 200, '110,120,70', 0.18);
    for (const p of PORES) {
      pen.dot(p.x + 1.5, p.y + 1.5, p.r, SKIN_DARK, 0.55);
      pen.dot(p.x - 0.8, p.y - 0.8, p.r * 0.7, SKIN_LIGHT, 0.5);
    }
    for (const m of MOTTLE) {
      if (!m.pale) continue;
      pen.fill(m.shape, SPOT, 0.85);
      pen.stroke([...m.shape, m.shape[0]!], 1, SKIN_DARK, 0.35, false);
    }
    // Bony plates on the crown: fine grooves.
    for (const s of [-1, 1]) {
      pen.hair([{ x: s * 26, y: -224 }, { x: s * 36, y: -150 }, { x: s * 70, y: -128 }], 1.3, INK, 0.45);
      pen.hair([{ x: s * 205, y: -216 }, { x: s * 222, y: -150 }, { x: s * 262, y: -110 }], 1.3, INK, 0.45);
    }
    pen.stipple(shape, 4200, (x, y) => 0.12 + 0.5 * Math.min(1, Math.max(0, (y + 40) / 380)) + 0.4 * (Math.abs(x) / 380) ** 3, 1.7, SKIN_DARK);
    pen.hatch(shape, 8, 0.8, 1.1, { alpha: 0.28, onlyBelow: 60 });
    pen.hatch(shape, 11, -0.7, 1, { alpha: 0.12, onlyBelow: 200 });
    // The gill covers: a curved fold low on each cheek.
    for (const s of [-1, 1]) {
      const edge = [{ x: s * 300, y: -30 }, { x: s * 338, y: 70 }, { x: s * 346, y: 170 }, { x: s * 336, y: 270 }];
      pen.stroke(edge.map((p) => ({ x: p.x - s * 7, y: p.y })), 5, SKIN_LIGHT, 0.25, false);
      pen.stroke(edge, 2, INK, 0.45, false);
    }
    if (look.dust > 0.01) {
      pen.fill(shape, SAND_DUST, 0.5 * look.dust);
      pen.stipple(shape, Math.round(3000 * look.dust), () => 0.8, 1.7, '#e9dab0');
    }
  });
  pen.stroke([...shape], 3.6, INK, 1);
}

function drawEye(pen: Pen, ctx: CanvasRenderingContext2D, look: FaceLook, s: 1 | -1): void {
  const ex = s * FACE.eyeX;
  const ey = FACE.eyeY;
  const r = FACE.eyeR;
  // The socket: a bulge of skin on the crown.
  const socket = ellipse(ex, ey + 4, r * 1.2, r * 1.08, 28);
  pen.fill(socket, PAPER_FILL, 1);
  pen.fill(socket, SKIN, 0.85);
  pen.fill(ellipse(ex - s * 8, ey - 12, r * 0.9, r * 0.6, 20), 'rgba(255,240,205,1)', 0.25);
  if (look.dust > 0.01) pen.fill(socket, SAND_DUST, 0.4 * look.dust);
  pen.stroke([...socket, socket[0]!], 2.6, INK, 1);
  // The eye: a gold iris and a big pupil, looking where it's told.
  const ball = ellipse(ex, ey, r * 0.86, r * 0.82, 26);
  pen.fill(ball, IRIS, 1);
  pen.clipped(ball, () => {
    const g = ctx.createRadialGradient(ex, ey - r * 0.3, r * 0.1, ex, ey, r);
    g.addColorStop(0, 'rgba(255,236,170,0.6)');
    g.addColorStop(1, 'rgba(90,50,10,0.55)');
    ctx.fillStyle = g;
    ctx.fillRect(ex - r, ey - r, 2 * r, 2 * r);
    const px = ex + look.look.x * r * 0.34;
    const py = ey + look.look.y * r * 0.3;
    pen.fill(ellipse(px, py, r * 0.44, r * 0.46, 22), INK, 1);
    pen.dot(px - r * 0.16, py - r * 0.18, r * 0.12, '#fffaf0', 0.95);
    // The lids: skin coming down over the eye.
    if (look.lids > 0.01) {
      const edge = ey - r + 2 * r * look.lids;
      const lid = [{ x: ex - r * 1.1, y: ey - r * 1.2 }, { x: ex + r * 1.1, y: ey - r * 1.2 }, { x: ex + r * 1.1, y: edge }, { x: ex - r * 1.1, y: edge }];
      pen.fill(lid, PAPER_FILL, 1);
      pen.fill(lid, SKIN, 0.9);
      pen.stroke([{ x: ex - r, y: edge }, { x: ex + r, y: edge }], 2.6, INK, 1, false);
    }
  });
  pen.stroke([...ball, ball[0]!], 2.2, INK, 1);
  // The brow: a heavy bony ridge, low over the inner corner, so it always glares.
  const inner = { x: ex - s * r * 1.0, y: ey - r * 0.42 };
  const outer = { x: ex + s * r * 1.05, y: ey - r * 1.0 };
  const brow = [inner, { x: ex, y: ey - r * 0.98 }, outer, { x: outer.x + s * 4, y: outer.y - 16 }, { x: ex, y: ey - r * 1.28 }, { x: inner.x - s * 6, y: inner.y - 22 }];
  pen.fill(brow, SKIN_DARK, 0.95);
  pen.stroke([...brow, brow[0]!], 2.4, INK, 1);
}

/** The inside of the open mouth and the upper teeth. */
function drawMouth(pen: Pen, ctx: CanvasRenderingContext2D, look: FaceLook): void {
  if (look.gape < 0.01) return;
  const hole = cavity(look.gape);
  pen.fill(hole, MOUTH, 1);
  pen.clipped(hole, () => {
    const deep = FACE.lipMid + FACE.drop * look.gape * 0.45;
    const g = ctx.createRadialGradient(0, deep, 10, 0, deep, 60 + 220 * look.gape);
    g.addColorStop(0, THROAT);
    g.addColorStop(1, 'rgba(11,5,7,0)');
    ctx.fillStyle = g;
    ctx.fillRect(-300, -200, 600, 600);
  });
  // Small sharp teeth hanging from the upper lip.
  const teeth = upperLip(look.gape);
  const a = Math.min(1, look.gape * 6);
  for (let i = 2; i < teeth.length - 2; i++) {
    const p = teeth[i]!;
    const len = 12 + 5 * ((i * 7) % 3);
    pen.fill([{ x: p.x - 5, y: p.y }, { x: p.x + 5, y: p.y }, { x: p.x, y: p.y + len }], SPOT, a);
  }
  // The fleshy upper lip.
  pen.stroke(teeth, 7, SKIN_LIGHT, 0.8, false);
  pen.stroke(teeth, 3, INK, 1, false);
}

export function faceSeed(boil: number): number {
  return 7001 + boil * 977;
}

/** The back of the stargazer: fins, spines, head, eyes and the inside of the mouth. */
export function drawFaceBack(ctx: CanvasRenderingContext2D, look: FaceLook): void {
  const pen = new Pen(ctx, faceSeed(look.boil), 1.1);
  drawBehind(pen, ctx, look);
  drawHead(pen, ctx, look);
  drawEye(pen, ctx, look, -1);
  drawEye(pen, ctx, look, 1);
  drawMouth(pen, ctx, look);
  if (look.gape < 0.01) {
    // Shut: the grim line of the lips.
    const line = upperLip(0);
    pen.stroke(line, 4, INK, 1, false);
  }
}

/** The lower jaw, its teeth, and the fringe of little tassels along its lip. */
export function drawChin(ctx: CanvasRenderingContext2D, look: FaceLook): void {
  const pen = new Pen(ctx, faceSeed(look.boil) + 13, 1.1);
  const g = look.gape;
  const plate = chinPlate(g);
  if (g > 0.01) {
    pen.fill(plate, PAPER_FILL, 1);
    pen.clipped(plate, () => {
      pen.fill(plate, CHIN, 0.9);
      const lipY = FACE.lipMid + FACE.drop * g;
      // The jaw's front lit pale under the lip, darkening down into the throat; its own pale spots.
      const shade = ctx.createLinearGradient(0, lipY - 40, 0, lipY + 300);
      shade.addColorStop(0, 'rgba(255,244,214,0.3)');
      shade.addColorStop(1, 'rgba(40,24,12,0.6)');
      ctx.fillStyle = shade;
      ctx.fillRect(-360, lipY - 120, 720, 900);
      wash(ctx, -200, lipY + 140, 160, '52,36,22', 0.3);
      wash(ctx, 210, lipY + 110, 150, '52,36,22', 0.25);
      for (const m of MOTTLE) if (m.pale && m.y > 0) pen.fill(m.shape.map((q) => ({ x: q.x * 0.8, y: q.y + lipY - 20 })), SPOT, 0.55);
      pen.stipple(plate, 1100, (_x, y) => Math.min(1, Math.max(0.1, (y - lipY) / 280)), 1.2, SKIN_DARK);
      pen.hatch(plate, 9, 0.8, 1, { alpha: 0.16, onlyBelow: lipY + 120 });
    });
    // The lower teeth, pointing up.
    const lower = lowerLip(g);
    const a = Math.min(1, g * 6);
    for (let i = 3; i < lower.length - 3; i += 1) {
      const p = lower[i]!;
      pen.fill([{ x: p.x - 4, y: p.y + 2 }, { x: p.x + 4, y: p.y + 2 }, { x: p.x, y: p.y - 10 - 4 * ((i * 5) % 3) }], SPOT, a);
    }
  }
  // The fringe: little cream tassels along the lower lip, pointing up.
  const fringe = lowerLip(g);
  for (let i = 1; i < fringe.length - 1; i++) {
    const p = fringe[i]!;
    const len = 20 + 7 * Math.sin(i * 2.3);
    const lean = 4 * Math.sin(i * 1.7);
    const tassel = [{ x: p.x - 3.2, y: p.y + 3 }, { x: p.x + lean, y: p.y - len }, { x: p.x + 3.2, y: p.y + 3 }];
    pen.fill(tassel, SPOT, 0.95);
    pen.hair([p, { x: p.x + lean, y: p.y - len }], 1.2, INK, 0.8);
  }
  pen.stroke(fringe, g > 0.01 ? 4 : 2.5, INK, 1, false);
}
