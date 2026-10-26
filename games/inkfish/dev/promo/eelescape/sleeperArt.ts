import { PAPER_FILL } from '../../../src/art/fish/kit';
import { ellipse, INK, makeCanvas, pathOf, Pen, type Pt } from '../../../src/art/pen';
import { BOIL_FRAMES } from '../../../src/art/textures';
import { createRng } from '../../../src/logic/rng';
import { inside, lerpPt, smoothCurve } from './geom';
import { BODY, EYE, EYE_R, GILL_EDGE, HINGE, JAW, JAW_TOP, JAW_UNDER, jawAngle, PECTORAL_BASE, UPPER_LIP } from './shape';

/**
 * The dark sleeper painted in the game's pen and ink: a brown wash darker
 * on the back and pale cream underneath, black-brown saddles and mottling,
 * a scatter of pale flecks, fine scales behind the gill cover, hatching and
 * stipple on the shadow side, a pale rim of light along the back; the big
 * rounded pectoral fin and the fins rayed and banded with dark spots; thick
 * lips with a row of fine teeth. Baked per boil frame in two pieces: the
 * body (everything but the lower jaw) and the lower jaw, which swings.
 * Drawn in world px (shape.ts).
 */

const RES = 1.15;
const BODY_BOX = { x0: 150, y0: 300, w: 1420, h: 980 } as const;
const JAW_BOX = { x0: 200, y0: 770, w: 440, h: 250 } as const;

const BACK = '#45311f';
const BROWN = '#7a5a37';
const TAN = '#a8875b';
const BELLY = '#dccba2';
const BLOTCH = '#2a1c12';
const FLECK = '#ead8ad';
const FIN = '#86663f';
const LIP = '#94704a';
const SHADE = '#24170d';

export interface SleeperSprites {
  readonly body: readonly HTMLCanvasElement[];
  readonly jaw: readonly HTMLCanvasElement[];
}

function bake(box: { readonly x0: number; readonly y0: number; readonly w: number; readonly h: number }, seed: number, draw: (pen: Pen, ctx: CanvasRenderingContext2D) => void): HTMLCanvasElement[] {
  return Array.from({ length: BOIL_FRAMES }, (_, f) => {
    const { canvas, ctx } = makeCanvas(Math.ceil(box.w * RES), Math.ceil(box.h * RES));
    ctx.scale(RES, RES);
    ctx.translate(-box.x0, -box.y0);
    draw(new Pen(ctx, seed + f * 977, 1.3), ctx);
    return canvas;
  });
}

export function makeSleeperSprites(): SleeperSprites {
  return { body: bake(BODY_BOX, 4101, drawBody), jaw: bake(JAW_BOX, 4307, drawJaw) };
}

export function drawBodySprite(ctx: CanvasRenderingContext2D, s: SleeperSprites, boil: number): void {
  ctx.drawImage(s.body[boil % s.body.length]!, BODY_BOX.x0, BODY_BOX.y0, BODY_BOX.w, BODY_BOX.h);
}
/** Turns the drawing so the lower jaw (drawn in its shut place) swings open round its hinge. */
export function jawSwing(ctx: CanvasRenderingContext2D, open: number): void {
  ctx.translate(HINGE.x, HINGE.y);
  ctx.rotate(jawAngle(open));
  ctx.translate(-HINGE.x, -HINGE.y);
}
export function drawJawSprite(ctx: CanvasRenderingContext2D, s: SleeperSprites, boil: number): void {
  ctx.drawImage(s.jaw[boil % s.jaw.length]!, JAW_BOX.x0, JAW_BOX.y0, JAW_BOX.w, JAW_BOX.h);
}

// ---------------------------------------------------------------- helpers

/** The body's top edge at x (the first crossing from above). */
function topAt(x: number): number {
  let best = Infinity;
  for (let i = 0; i < BODY.length; i++) {
    const a = BODY[i]!;
    const b = BODY[(i + 1) % BODY.length]!;
    if ((a.x - x) * (b.x - x) > 0 || a.x === b.x) continue;
    best = Math.min(best, a.y + ((b.y - a.y) * (x - a.x)) / (b.x - a.x));
  }
  return best;
}
function bottomAt(x: number): number {
  let best = -Infinity;
  for (let i = 0; i < BODY.length; i++) {
    const a = BODY[i]!;
    const b = BODY[(i + 1) % BODY.length]!;
    if ((a.x - x) * (b.x - x) > 0 || a.x === b.x) continue;
    best = Math.max(best, a.y + ((b.y - a.y) * (x - a.x)) / (b.x - a.x));
  }
  return best;
}

/** A blob: an ellipse with a wobbly edge. */
function blob(pen: Pen, cx: number, cy: number, rx: number, ry: number, rough = 0.28): Pt[] {
  const n = 16;
  const k = Array.from({ length: n }, () => 1 + (pen.rng() - 0.5) * 2 * rough);
  return smoothCurve(
    Array.from({ length: n }, (_, i) => {
      const a = (i / n) * Math.PI * 2;
      return { x: cx + Math.cos(a) * rx * k[i]!, y: cy + Math.sin(a) * ry * k[i]! };
    }),
    3,
    true,
  );
}

/** A fin: rays fanning from its base to a scalloped edge, a translucent wash, rows of dark spots across the rays. */
function drawFin(pen: Pen, base: readonly Pt[], edge: readonly Pt[], spots: number): void {
  const shape = [...base, ...[...edge].reverse()];
  pen.fill(shape, PAPER_FILL, 0.55);
  pen.fill(shape, FIN, 0.62);
  pen.clipped(shape, () => {
    // Darker near the base.
    const inner = [...base, ...edge.map((p, i) => lerpPt(base[Math.round((i / (edge.length - 1)) * (base.length - 1))]!, p, 0.35)).reverse()];
    pen.fill(inner, BACK, 0.35);
    for (let i = 0; i < edge.length; i++) {
      const from = base[Math.round((i / (edge.length - 1)) * (base.length - 1))]!;
      for (let r = 1; r <= spots; r++) {
        const p = lerpPt(from, edge[i]!, r / (spots + 1) + (pen.rng() - 0.5) * 0.06);
        pen.dot(p.x, p.y, 3.2 + pen.rng() * 2.2, BLOTCH, 0.55);
      }
    }
  });
  edge.forEach((p, i) => {
    const from = base[Math.round((i / (edge.length - 1)) * (base.length - 1))]!;
    pen.hair([from, lerpPt(from, p, 0.5), p], 1.1, INK, 0.55);
  });
  pen.stroke(edge, 2.2, INK, 0.9, false);
}

// ---------------------------------------------------------------- the body

function drawBackFins(pen: Pen): void {
  // The first dorsal fin (spiny, rounded) and the start of the second, raked back.
  for (const [from, to, h, n] of [[880, 1090, 150, 7], [1180, 1560, 120, 12]] as const) {
    const base = Array.from({ length: n }, (_, i) => {
      const x = from + ((to - from) * i) / (n - 1);
      return { x, y: topAt(x) + 6 };
    });
    const edge = base.map((b, i) => {
      const f = i / (n - 1);
      const hh = h * Math.sin(Math.PI * Math.min(1, 0.15 + f * 0.95)) ** 0.6 * (1 + 0.06 * Math.sin(i * 2.3));
      return { x: b.x + hh * 0.42, y: b.y - hh };
    });
    drawFin(pen, base, edge, 3);
  }
  // A pelvic fin under the belly.
  const pb = [{ x: 690, y: 1066 }, { x: 760, y: 1090 }];
  const pe = Array.from({ length: 7 }, (_, i) => {
    const a = 1.25 - i * 0.12;
    return { x: 700 + Math.cos(a) * 150, y: 1060 + Math.sin(a) * 110 };
  });
  drawFin(pen, pb, pe, 2);
}

function drawPectoral(pen: Pen): void {
  const [b0, b1] = PECTORAL_BASE;
  const base = [b0, lerpPt(b0, b1, 0.5), b1];
  const c = lerpPt(b0, b1, 0.5);
  const n = 15;
  const edge = Array.from({ length: n }, (_, i) => {
    const a = -0.85 + (i / (n - 1)) * 1.6;
    const r = 195 + 9 * Math.sin(i * 2.1) - 55 * Math.abs(i / (n - 1) - 0.5) ** 1.5;
    return { x: c.x + Math.cos(a) * r, y: c.y + Math.sin(a) * r };
  });
  drawFin(pen, base, edge, 4);
  pen.stroke([b0, lerpPt(b0, b1, 0.5), b1], 2, INK, 0.7);
}

function drawBody(pen: Pen, ctx: CanvasRenderingContext2D): void {
  drawBackFins(pen);
  pen.fill(BODY, PAPER_FILL, 1);
  const rng = createRng(77);
  pen.clipped(BODY, () => {
    // Countershading: dark back, brown flanks, pale belly.
    const g = ctx.createLinearGradient(0, 430, 0, 1146);
    g.addColorStop(0, BACK);
    g.addColorStop(0.42, BROWN);
    g.addColorStop(0.7, TAN);
    g.addColorStop(0.9, BELLY);
    ctx.save();
    ctx.globalAlpha = 0.93;
    ctx.fillStyle = g;
    ctx.fillRect(100, 300, 1500, 1000);
    ctx.restore();
    // Saddles across the back, and mottling.
    for (const x of [520, 700, 905, 1130, 1380]) {
      const top = topAt(x);
      const depth = bottomAt(x) - top;
      pen.fill(blob(pen, x, top + depth * 0.28, 70 + rng() * 25, depth * 0.36), BLOTCH, 0.42);
      pen.fill(blob(pen, x + 10, top + depth * 0.2, 40 + rng() * 15, depth * 0.2), BLOTCH, 0.3);
    }
    for (let i = 0; i < 70; i++) {
      const p = { x: 300 + rng() * 1250, y: 450 + rng() * 520 };
      if (!inside(BODY, p) || p.y > bottomAt(p.x) - 140) continue;
      pen.fill(blob(pen, p.x, p.y, 10 + rng() * 22, 7 + rng() * 15, 0.35), BLOTCH, 0.18 + rng() * 0.2);
    }
    for (let i = 0; i < 90; i++) {
      const p = { x: 300 + rng() * 1250, y: 450 + rng() * 600 };
      if (!inside(BODY, p)) continue;
      pen.dot(p.x, p.y, 2 + rng() * 3.2, FLECK, 0.35 + rng() * 0.3);
    }
    // Dark bands from the eye down across the cheek.
    for (const [dx, dy, len] of [[-30, 50, 120], [40, 60, 170]] as const) {
      const from = { x: EYE.x + dx * 0.4, y: EYE.y + EYE_R * 0.8 };
      pen.stroke([from, { x: from.x + dx, y: from.y + dy }, { x: from.x + dx * 1.4, y: from.y + len }], 22, BLOTCH, 0.22, false);
    }
    // Scales behind the gill cover: little arcs in staggered rows.
    for (let row = 0, y = 470; y < 1130; y += 22, row++) {
      for (let x = 820 + (row % 2) * 13; x < 1560; x += 26) {
        if (!inside(BODY, { x, y }) || x < GILL_EDGE[Math.min(GILL_EDGE.length - 1, Math.max(0, Math.round(((y - 540) / 545) * (GILL_EDGE.length - 1))))]!.x + 18) continue;
        const arc = [0, 1, 2, 3, 4].map((k) => {
          const a = -1.2 + k * 0.6;
          return { x: x - 3 + Math.cos(a) * 11, y: y + Math.sin(a) * 9 };
        });
        pen.hair(arc, 0.9, y < 820 ? SHADE : '#6b5536', 0.22);
      }
    }
    // The shadow side: hatching and stipple low on the flank and under the head.
    pen.hatch(BODY, 9, 0.85, 1.1, { color: SHADE, alpha: 0.16, onlyBelow: 930 });
    pen.stipple(BODY, 5200, (x, y) => {
      const b = bottomAt(x);
      const near = 1 - Math.min(1, Math.abs(b - 70 - y) / 110);
      return 0.12 + 0.6 * near * near;
    }, 1.4, SHADE);
    // Light along the back.
    const rim = BODY.filter((p) => p.y < topAt(p.x) + 1 && p.x > 270 && p.x < 1560).map((p) => ({ x: p.x, y: p.y + 12 }));
    pen.stroke(rim, 7, '#d9bf8c', 0.35, false);
  });
  // The gill cover's edge, with a pale membrane behind it, and the preopercle's curve.
  pen.stroke(GILL_EDGE.map((p) => ({ x: p.x + 7, y: p.y })), 4, '#cdb385', 0.5, false);
  pen.stroke(GILL_EDGE, 3.6, INK, 0.95);
  pen.hair(smoothCurve([{ x: 590, y: 640 }, { x: 640, y: 760 }, { x: 650, y: 880 }, { x: 618, y: 960 }], 6), 1.6, SHADE, 0.55);
  drawPectoral(pen);
  // The upper lip: a thick fleshy band with fine teeth under it.
  const lipTop = UPPER_LIP.map((p, i) => ({ x: p.x, y: p.y - 26 * Math.sin(Math.PI * Math.min(1, 0.15 + (i / (UPPER_LIP.length - 1)) * 0.9)) }));
  const lip = [...UPPER_LIP, ...[...lipTop].reverse()];
  pen.fill(lip, LIP, 0.85);
  pen.hair(lipTop, 1.4, SHADE, 0.6);
  pen.stroke(lipTop.map((p) => ({ x: p.x, y: p.y + 7 })), 3, '#d9bf8c', 0.4, false);
  teeth(pen, UPPER_LIP, 1);
  // Nostrils.
  pen.dot(300, 728, 5, INK, 0.8);
  pen.dot(335, 712, 4, INK, 0.7);
  // The eye's socket (the eye itself is drawn live).
  pen.fill(ellipse(EYE.x, EYE.y, EYE_R + 9, EYE_R + 8, 28), SHADE, 0.55);
  pen.stroke([...ellipse(EYE.x, EYE.y, EYE_R + 8, EYE_R + 7, 28), ellipse(EYE.x, EYE.y, EYE_R + 8, EYE_R + 7, 28)[0]!], 2.4, INK, 0.9);
  // The outline.
  pen.stroke([...BODY, BODY[0]!], 4.4, INK, 1);
}

/** A row of small teeth along a lip, pointing `dir` (1 down, -1 up). */
function teeth(pen: Pen, lip: readonly Pt[], dir: 1 | -1): void {
  for (let i = 1; i < lip.length - 2; i++) {
    const p = lerpPt(lip[i]!, lip[i + 1]!, 0.5);
    pen.fill([{ x: p.x - 4, y: p.y }, { x: p.x + 4, y: p.y }, { x: p.x + 1, y: p.y + dir * 11 }], '#f2ead6', 0.9);
    pen.hair([{ x: p.x - 4, y: p.y }, { x: p.x + 1, y: p.y + dir * 11 }, { x: p.x + 4, y: p.y }], 0.8, INK, 0.6);
  }
}

// ---------------------------------------------------------------- the lower jaw

function drawJaw(pen: Pen, ctx: CanvasRenderingContext2D): void {
  pen.fill(JAW, PAPER_FILL, 1);
  pen.clipped(JAW, () => {
    const g = ctx.createLinearGradient(0, 815, 0, 990);
    g.addColorStop(0, BROWN);
    g.addColorStop(0.45, TAN);
    g.addColorStop(1, BELLY);
    ctx.save();
    ctx.globalAlpha = 0.92;
    ctx.fillStyle = g;
    ctx.fillRect(200, 770, 440, 250);
    ctx.restore();
    const rng = createRng(91);
    for (let i = 0; i < 14; i++) pen.fill(blob(pen, 260 + rng() * 330, 860 + rng() * 70, 9 + rng() * 14, 6 + rng() * 9, 0.35), BLOTCH, 0.25);
    pen.stipple(JAW, 1400, (_, y) => Math.min(1, Math.max(0, (y - 900) / 90)) * 0.5, 1.3, SHADE);
  });
  // The lower lip: a thick band along the top, teeth pointing up.
  const lipLow = JAW_TOP.map((p, i) => ({ x: p.x, y: p.y + 20 * Math.sin(Math.PI * Math.min(1, 0.1 + (i / (JAW_TOP.length - 1)) * 0.9)) }));
  pen.fill([...JAW_TOP, ...[...lipLow].reverse()], LIP, 0.85);
  pen.hair(lipLow, 1.3, SHADE, 0.55);
  teeth(pen, JAW_TOP, -1);
  pen.hair(smoothCurve([{ x: 280, y: 880 }, { x: 400, y: 925 }, { x: 540, y: 950 }], 6), 1.4, SHADE, 0.35);
  pen.stroke([...JAW_UNDER.slice(12), ...JAW_TOP], 4.2, INK, 1);
  pen.hair(JAW_UNDER.slice(0, 13), 1.6, SHADE, 0.5);
}

// ---------------------------------------------------------------- live parts

/** Inside the open mouth: a dark throat, a fleshy floor on the swung jaw, and the stretched skin under the throat. */
export function drawMouthInside(ctx: CanvasRenderingContext2D, pen: Pen, swing: (p: Pt) => Pt, open: number): void {
  if (open <= 0.01) return;
  const lowerLip = JAW_TOP.map(swing);
  const chin = lowerLip[0]!;
  // The front of the gape curves in a little, like the rim of a mouth seen from the side.
  const mid = lerpPt(chin, UPPER_LIP[0]!, 0.5);
  const rim = smoothCurve([chin, { x: mid.x + 48 * open, y: mid.y }, UPPER_LIP[0]!], 6).slice(1, -1);
  const cavity = [...UPPER_LIP, HINGE, ...[...lowerLip].reverse(), ...rim];
  // The stretched throat skin between the body and the swung jaw's back.
  const membrane = [{ x: 606, y: 925 }, { x: 588, y: 985 }, { x: 602, y: 1016 }, { x: 662, y: 1068 }, swing({ x: 520, y: 990 }), swing({ x: 588, y: 985 }), swing({ x: 606, y: 925 })];
  pen.fill(membrane, TAN, 0.95);
  pen.fill(membrane, SHADE, 0.25);
  ctx.save();
  pathOf(ctx, cavity);
  const g = ctx.createRadialGradient(HINGE.x - 30, HINGE.y + 10, 10, HINGE.x - 120, HINGE.y + 40, 380);
  g.addColorStop(0, '#060302');
  g.addColorStop(0.45, '#2a1210');
  g.addColorStop(1, '#5a2a22');
  ctx.fillStyle = g;
  ctx.fill();
  ctx.clip();
  // The floor of the mouth and the tongue on the swung jaw.
  const tongue = ellipse(380, 860, 120, 26, 20).map(swing);
  pen.fill(tongue, '#8a4038', 0.55 * Math.min(1, open * 2));
  pen.fill(ellipse(HINGE.x - 40, HINGE.y + 6, 60, 34, 16), '#000000', 0.55);
  ctx.restore();
  pen.stroke(cavity.slice(UPPER_LIP.length - 2, UPPER_LIP.length + 2), 2.5, INK, 0.8, false);
}

/** The eye: a golden iris, the pupil (size and gaze from the face), a glint, and a lid narrowing it for the sly end. */
export function drawEye(pen: Pen, pupil: number, look: number, sly: number): void {
  const { ctx } = pen;
  ctx.save();
  const g = ctx.createRadialGradient(EYE.x - 10, EYE.y - 12, 4, EYE.x, EYE.y, EYE_R);
  g.addColorStop(0, '#f0d27a');
  g.addColorStop(0.6, '#c49a3e');
  g.addColorStop(1, '#6a4a1c');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(EYE.x, EYE.y, EYE_R, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  const pr = EYE_R * (0.3 + 0.32 * pupil);
  const px = EYE.x + look * EYE_R * 0.24;
  const py = EYE.y + 5 - (look > 0 ? 3 : 0);
  pen.fill(ellipse(px, py, pr, pr, 22), '#0b0705', 1);
  pen.dot(px - pr * 0.4, py - pr * 0.45, Math.max(3, pr * 0.28), '#fffaf0', 0.95);
  pen.dot(px + pr * 0.35, py + pr * 0.4, 2.4, '#fffaf0', 0.5);
  if (sly > 0.01) {
    // A heavy upper lid sliding down over the top of the eye.
    const drop = sly * EYE_R * 0.9;
    const lid: Pt[] = [];
    for (let i = 0; i <= 16; i++) {
      const a = Math.PI + (i / 16) * Math.PI;
      lid.push({ x: EYE.x + Math.cos(a) * (EYE_R + 3), y: EYE.y + Math.sin(a) * (EYE_R + 3) });
    }
    const edge = Array.from({ length: 9 }, (_, i) => {
      const x = EYE.x + EYE_R + 3 - (i / 8) * (2 * EYE_R + 6);
      return { x, y: EYE.y - EYE_R + drop + 6 * Math.sin((i / 8) * Math.PI) - (x - EYE.x) * 0.12 * sly };
    });
    const shape = [...lid, ...edge];
    pen.fill(shape, BROWN, 0.97);
    pen.fill(shape, BACK, 0.4);
    pen.stroke(edge, 3, INK, 0.95, false);
  }
  pen.stroke([...ellipse(EYE.x, EYE.y, EYE_R, EYE_R, 26), ellipse(EYE.x, EYE.y, EYE_R, EYE_R, 26)[0]!], 2.6, INK, 0.95, false);
}

/** The gill cover lifting where the eel squeezes out: a dark gap along the slit and the flap's raised rim. */
export function drawGillGap(pen: Pen, lift: number): void {
  if (lift <= 0.01) return;
  const i0 = Math.round(GILL_EDGE.length * 0.48);
  const i1 = Math.round(GILL_EDGE.length * 0.86);
  const seg = GILL_EDGE.slice(i0, i1);
  const gap = [...seg, ...[...seg].reverse().map((p, i, a) => ({ x: p.x + 18 * lift * Math.sin((Math.PI * i) / (a.length - 1)), y: p.y }))];
  pen.fill(gap, '#0a0503', 0.85);
  pen.stroke(seg.map((p) => ({ x: p.x - 3, y: p.y })), 4.5, INK, 1, false);
  pen.stroke(seg.map((p) => ({ x: p.x - 9, y: p.y })), 3, '#e3c996', 0.5 * lift, false);
}
