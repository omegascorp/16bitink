import { INK, Pen, type Pt } from '../../../src/art/pen';
import { createRng } from '../../../src/logic/rng';
import { lerp } from '../short';
import { GAPE_MAX, type EyeMood, type WhalePose } from './story';

/**
 * The humpback, in the game's pen: a slate-dark body washed and hatched
 * like the game's fish, the flat head studded with knobbly tubercles, the
 * long white pectoral fin with its scalloped edge, the pale pleated throat
 * that balloons when it gulps, and the baleen hanging inside the open mouth.
 *
 * Drawn in its own frame (px, snout along +x, belly +y, the jaw hinge at the
 * origin; story.ts `onWhale` maps it to the world) in two passes, so the
 * kayak can be drawn between them: `drawWhaleBack` (fluke, body, the dark
 * inside of the mouth), then `drawWhaleFront` (the head over it: the snout,
 * the ballooned throat and lower jaw, the eye, the near fin).
 */

const SLATE_TOP = '#181d23';
const SLATE = '#2c353e';
const SLATE_FLANK = '#46525c';
const SLATE_LIGHT = '#6b7880';
const HATCH = '#0b0e11';
const PLEAT_PALE = '#e3ded0';
const PLEAT_GROOVE = '#3a3f45';
const FIN_WHITE = '#ece7da';
const MOUTH = '#2a1416';
const BALEEN = '#1a1412';
const BALEEN_FRINGE = '#8c7a62';
const TONGUE = '#9b5a5c';
const SHEEN = '#dfe8ec';

const rot = (p: Pt, a: number): Pt => ({ x: p.x * Math.cos(a) - p.y * Math.sin(a), y: p.x * Math.sin(a) + p.y * Math.cos(a) });
const range = (n: number, f: (u: number) => Pt): Pt[] => Array.from({ length: n + 1 }, (_, i) => f(i / n));

// ---------------------------------------------------------------- the shapes, in the whale's frame

/** The upper lip, hinge to snout. */
const UPPER_LIP: readonly Pt[] = range(14, (u) => ({ x: u * 425, y: -14 * Math.sin(Math.PI * u) - 6 * u }));
/** The snout's rounded front and the flat top of the head back to the blowhole. */
const HEAD_TOP: readonly Pt[] = [
  { x: 432, y: -14 }, { x: 428, y: -28 }, { x: 412, y: -38 }, { x: 380, y: -46 }, { x: 300, y: -58 }, { x: 200, y: -70 }, { x: 100, y: -84 },
  { x: 0, y: -98 }, { x: -90, y: -114 }, { x: -180, y: -128 },
];
const BACK: readonly Pt[] = [
  { x: -320, y: -142 }, { x: -480, y: -147 }, { x: -640, y: -139 }, { x: -740, y: -131 }, { x: -785, y: -150 }, { x: -822, y: -156 },
  { x: -850, y: -132 }, { x: -960, y: -98 }, { x: -1080, y: -54 }, { x: -1170, y: -24 }, { x: -1195, y: -10 },
];
const BELLY: readonly Pt[] = [
  { x: -1195, y: 12 }, { x: -1170, y: 26 }, { x: -1080, y: 48 }, { x: -950, y: 88 }, { x: -800, y: 122 }, { x: -640, y: 143 }, { x: -520, y: 150 },
  { x: -360, y: 146 }, { x: -200, y: 128 }, { x: -90, y: 96 }, { x: -24, y: 48 },
];
/** The navel: where the pleated throat ends. */
const NAVEL: Pt = { x: -520, y: 150 };
/** The eye, just above and behind the corner of the mouth. */
const EYE: Pt = { x: -42, y: -30 };

const lowerLip = (a: number): Pt[] => range(14, (u) => rot({ x: u * 445, y: 4 * Math.sin(Math.PI * u) + 4 * u }, a));
const jawUnder = (a: number): Pt[] => range(10, (u) => rot({ x: u * 440, y: 40 + 10 * Math.sin(Math.PI * u) - 8 * u }, a));
const chin = (a: number): Pt[] => [{ x: 452, y: 12 }, { x: 450, y: 24 }, { x: 442, y: 32 }].map((p) => rot(p, a));

interface Throat {
  readonly outer: readonly Pt[];
  /** The pleats: curves from the chin to the navel, spread across the throat. */
  readonly pleats: readonly (readonly Pt[])[];
}

/** The throat's outer edge from the chin to the navel, bulging out as it balloons. */
function throatOf(a: number, balloon: number): Throat {
  const s = rot({ x: 444, y: 32 }, a);
  const len = Math.hypot(NAVEL.x - s.x, NAVEL.y - s.y);
  const d = { x: (NAVEL.x - s.x) / len, y: (NAVEL.y - s.y) / len };
  const n = { x: d.y, y: -d.x };
  const height = 44 + 270 * balloon;
  const curve = (k: number): Pt[] =>
    range(18, (v) => {
      const bulge = height * k * Math.sin(Math.PI * v ** 0.72) ** 0.9;
      return { x: s.x + (NAVEL.x - s.x) * v + n.x * bulge, y: s.y + (NAVEL.y - s.y) * v + n.y * bulge };
    });
  const pleats = Array.from({ length: 13 }, (_, i) => curve(0.08 + (i / 12) * 0.86));
  return { outer: curve(1), pleats };
}

/** The open mouth: along the upper lip, round between the lips' tips, back along the lower lip. */
function mouthOf(a: number): Pt[] {
  const top = UPPER_LIP[UPPER_LIP.length - 1]!;
  const lower = lowerLip(a);
  const bottom = lower[lower.length - 1]!;
  const inward = Math.hypot(bottom.x - top.x, bottom.y - top.y) * 0.18;
  const mid = { x: (top.x + bottom.x) / 2, y: (top.y + bottom.y) / 2 };
  const toHinge = Math.hypot(mid.x, mid.y) || 1;
  const front = { x: mid.x - (mid.x / toHinge) * inward, y: mid.y - (mid.y / toHinge) * inward };
  return [...UPPER_LIP, front, ...[...lower].reverse()];
}

/** The pectoral fin from its root, sweeping back and down: long, white, its leading edge scalloped with knobs. */
function finOf(sweep: number): { readonly outline: Pt[]; readonly lead: Pt[] } {
  const root = { x: -150, y: 92 };
  const ang = Math.PI - 0.62 + sweep;
  const dir = { x: Math.cos(ang), y: Math.sin(ang) };
  const nrm = { x: -dir.y, y: dir.x };
  const len = 430;
  const at = (u: number, side: number): Pt => {
    const w = (u < 0.1 ? 52 + 120 * u : 64 * (1 - u) ** 0.8 + 6) * side;
    const curl = 22 * Math.sin(Math.PI * u);
    return { x: root.x + dir.x * len * u + nrm.x * (w + curl), y: root.y + dir.y * len * u + nrm.y * (w + curl) };
  };
  // The leading edge (the outer side, as it trails back): bumps along it.
  const lead = range(40, (u) => {
    const bump = 7 * Math.max(0, Math.sin(u * Math.PI * 18)) * (1 - u * 0.5);
    const p = at(u, -1);
    return { x: p.x - nrm.x * bump, y: p.y - nrm.y * bump };
  });
  const trail = range(20, (u) => at(1 - u, 1));
  return { outline: [...lead, ...trail], lead };
}

/** The fluke and its stock. */
const FLUKE: readonly Pt[] = [
  { x: -1190, y: -10 }, { x: -1240, y: -60 }, { x: -1300, y: -150 }, { x: -1330, y: -170 }, { x: -1320, y: -120 }, { x: -1290, y: -40 },
  { x: -1280, y: 0 }, { x: -1290, y: 40 }, { x: -1320, y: 120 }, { x: -1330, y: 170 }, { x: -1300, y: 150 }, { x: -1240, y: 60 }, { x: -1190, y: 12 },
];

// ---------------------------------------------------------------- drawing

const penFor = (ctx: CanvasRenderingContext2D, seed: number, boil: number): Pen => new Pen(ctx, seed * 131 + boil * 977, 1.4);

function enter(ctx: CanvasRenderingContext2D, w: WhalePose): void {
  ctx.translate(w.x, w.y);
  ctx.rotate(-w.tilt);
}

/** Soft blotches of a lighter and a darker tone, fixed to the body (not the line boil), like a wet wash drying unevenly. */
const MOTTLE = (() => {
  const rng = createRng(1937);
  return Array.from({ length: 90 }, () => ({ u: rng(), v: rng(), r: 0.04 + rng() * 0.09, light: rng() < 0.45, a: 0.08 + rng() * 0.14 }));
})();

/**
 * A body part, painted: a wash from `from` to `to` through the colour stops,
 * mottled, hatched only on its shadowed side (towards `to`), inked round.
 */
function paint(ctx: CanvasRenderingContext2D, pen: Pen, outline: readonly Pt[], from: Pt, to: Pt, stops: readonly string[], ink = 3.2): void {
  const g = ctx.createLinearGradient(from.x, from.y, to.x, to.y);
  stops.forEach((c, i) => g.addColorStop(i / (stops.length - 1), c));
  const xs = outline.map((p) => p.x);
  const ys = outline.map((p) => p.y);
  const box = { x: Math.min(...xs), y: Math.min(...ys), w: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys) };
  const size = Math.max(box.w, box.h);
  ctx.save();
  ctx.beginPath();
  outline.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
  ctx.closePath();
  ctx.fillStyle = g;
  ctx.fill();
  ctx.clip();
  for (const m of MOTTLE) {
    const x = box.x + m.u * box.w;
    const y = box.y + m.v * box.h;
    const r = m.r * size;
    const blot = ctx.createRadialGradient(x, y, 0, x, y, r);
    blot.addColorStop(0, m.light ? `rgba(190,200,204,${m.a.toFixed(3)})` : `rgba(6,9,12,${m.a.toFixed(3)})`);
    blot.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = blot;
    ctx.fillRect(x - r, y - r, 2 * r, 2 * r);
  }
  ctx.restore();
  // Hatching on the shadowed side only: a band clipped to the far third along the wash.
  const len = Math.hypot(to.x - from.x, to.y - from.y) || 1;
  const d = { x: (to.x - from.x) / len, y: (to.y - from.y) / len };
  const n = { x: -d.y, y: d.x };
  const start = { x: from.x + d.x * len * 0.62, y: from.y + d.y * len * 0.62 };
  const far = size * 2;
  const band = [
    { x: start.x - n.x * far, y: start.y - n.y * far }, { x: start.x + n.x * far, y: start.y + n.y * far },
    { x: start.x + n.x * far + d.x * far, y: start.y + n.y * far + d.y * far }, { x: start.x - n.x * far + d.x * far, y: start.y - n.y * far + d.y * far },
  ];
  pen.clipped(outline, () => pen.hatch(band, 8, Math.atan2(d.y, d.x) + 1.1, 1, { color: HATCH, alpha: 0.32 }));
  pen.stroke([...outline, outline[0]!], ink, INK, 1, true);
}

/** A tubercle: a soft knob, lit on top, shadowed beneath, with a touch of ink under it. */
function knob(pen: Pen, p: Pt, r: number): void {
  pen.dot(p.x, p.y + r * 0.2, r, '#11161b', 0.55);
  pen.dot(p.x, p.y, r * 0.92, SLATE_FLANK, 1);
  pen.dot(p.x - r * 0.25, p.y - r * 0.3, r * 0.45, '#8d9aa2', 0.8);
  pen.hair([{ x: p.x - r * 0.9, y: p.y + r * 0.2 }, { x: p.x, y: p.y + r }, { x: p.x + r * 0.9, y: p.y + r * 0.2 }], 1.4, INK, 0.8);
}

export function drawWhaleBack(ctx: CanvasRenderingContext2D, w: WhalePose, boil: number): void {
  const pen = penFor(ctx, 3, boil);
  const a = w.gape * GAPE_MAX;
  ctx.save();
  enter(ctx, w);
  paint(ctx, pen, FLUKE, { x: -1300, y: -170 }, { x: -1300, y: 170 }, [SLATE_TOP, SLATE, SLATE_FLANK]);
  const body = [...UPPER_LIP, ...HEAD_TOP, ...BACK, ...BELLY];
  paint(ctx, pen, body, { x: 0, y: -150 }, { x: 0, y: 150 }, [SLATE_TOP, SLATE, SLATE_FLANK, SLATE_LIGHT]);
  // Pale scars and barnacle scratches along the flank.
  pen.stipple(body, 260, (x, y) => (y > -40 && y < 110 && x < -100 && x > -900 ? 0.5 : 0.05), 2.2, '#c9d0cf');
  // Wet light along the top of the back.
  pen.hair([{ x: -200, y: -118 }, { x: -480, y: -134 }, { x: -700, y: -124 }], 4, SHEEN, 0.35);
  if (a > 0.01) drawMouthInside(ctx, pen, a);
  ctx.restore();
}

function drawMouthInside(ctx: CanvasRenderingContext2D, pen: Pen, a: number): void {
  const mouth = mouthOf(a);
  const lower = lowerLip(a);
  pen.fill(mouth, MOUTH, 1);
  pen.clipped(mouth, () => {
    // Deeper towards the hinge.
    const g = ctx.createRadialGradient(0, 0, 10, 0, 0, 380);
    g.addColorStop(0, 'rgba(8,3,4,0.95)');
    g.addColorStop(1, 'rgba(60,24,28,0)');
    ctx.fillStyle = g;
    ctx.fillRect(-50, -60, 520, 520);
    // The tongue along the floor of the mouth.
    const floor = lower.slice(0, 10);
    const tongue = [...floor, ...[...floor].reverse().map((p) => rot({ x: Math.hypot(p.x, p.y), y: 0 }, a * 0.72))];
    pen.fill(tongue, TONGUE, 0.75);
    // Baleen: dark plates hanging from the upper jaw, fringed at their tips.
    for (let i = 1; i < UPPER_LIP.length - 1; i++) {
      for (let k = 0; k < 3; k++) {
        const u = (i + k / 3) / (UPPER_LIP.length - 1);
        const top = { x: u * 425, y: -14 * Math.sin(Math.PI * u) - 6 * u };
        const len = 34 + 60 * Math.sin(Math.PI * Math.min(1, u * 1.3));
        const tip = { x: top.x - len * 0.18, y: top.y + len };
        pen.hair([top, tip], 3.2, BALEEN, 0.9);
        pen.hair([{ x: tip.x + 1, y: tip.y - 10 }, { x: tip.x - 3, y: tip.y + 4 }], 2, BALEEN_FRINGE, 0.7);
      }
    }
  });
  pen.stroke(mouth, 2.2, INK, 0.9, false);
}

export function drawWhaleFront(ctx: CanvasRenderingContext2D, w: WhalePose, boil: number): void {
  const pen = penFor(ctx, 5, boil);
  const a = w.gape * GAPE_MAX;
  ctx.save();
  enter(ctx, w);
  drawFin(ctx, pen, w.fin);
  drawThroat(ctx, pen, a, w.balloon);
  drawLowerJaw(ctx, pen, a);
  drawSnout(ctx, pen);
  drawEye(ctx, pen, w.eye);
  ctx.restore();
}

function drawFin(ctx: CanvasRenderingContext2D, pen: Pen, sweep: number): void {
  const fin = finOf(sweep);
  paint(ctx, pen, fin.outline, fin.lead[0]!, fin.outline[fin.outline.length - 1]!, [SLATE, '#9aa3a6', FIN_WHITE, FIN_WHITE], 2.6);
  for (let i = 4; i < fin.lead.length - 2; i += 2) knob(pen, fin.lead[i]!, 4.5);
}

function drawThroat(ctx: CanvasRenderingContext2D, pen: Pen, a: number, balloon: number): void {
  const throat = throatOf(a, balloon);
  const under = jawUnder(a);
  const shape = [...[...under].reverse(), { x: -60, y: 70 }, { x: -300, y: 140 }, ...[...throat.outer].reverse()];
  const mid = throat.outer[Math.round(throat.outer.length * 0.4)]!;
  paint(ctx, pen, shape, under[5]!, mid, [SLATE, '#8f9493', PLEAT_PALE, PLEAT_PALE, '#b8b4a8'], 3);
  pen.clipped(shape, () => {
    throat.pleats.forEach((p, i) => {
      pen.hair(p, 2.2 + balloon, PLEAT_GROOVE, 0.75);
      if (i % 2 === 0) pen.hair(p.map((q) => ({ x: q.x + 4, y: q.y + 4 })), 1.6, '#f6f2e8', 0.55);
    });
    // Water streaming off the stretched skin.
    pen.stipple(shape, 120, () => 0.6, 2.4, '#f4f7f6');
  });
  pen.stroke(throat.outer, 3.2, INK, 1, true);
}

function drawLowerJaw(ctx: CanvasRenderingContext2D, pen: Pen, a: number): void {
  const lip = lowerLip(a);
  const under = jawUnder(a);
  const shape = [...lip, ...chin(a), ...[...under].reverse()];
  paint(ctx, pen, shape, rot({ x: 200, y: 0 }, a), rot({ x: 200, y: 44 }, a), [SLATE_FLANK, SLATE, SLATE_TOP], 3);
  pen.hair(lip.slice(2), 2.4, '#b8c2c4', 0.55);
  // Knobs round the chin.
  for (const p of [{ x: 420, y: 18 }, { x: 395, y: 28 }, { x: 370, y: 20 }, { x: 345, y: 30 }, { x: 435, y: 30 }]) knob(pen, rot(p, a), 7);
  pen.stipple(shape, 50, (x) => (x > 330 * Math.cos(a) ? 0.8 : 0), 2.6, '#d9dcd6');
}

/** The flat head over the upper lip, redrawn over the kayak, with its rows of tubercles. */
function drawSnout(ctx: CanvasRenderingContext2D, pen: Pen): void {
  const snout = [...UPPER_LIP, ...HEAD_TOP, { x: -120, y: -40 }, { x: -60, y: -4 }];
  paint(ctx, pen, snout, { x: 0, y: -100 }, { x: 0, y: 0 }, [SLATE_TOP, SLATE, SLATE_FLANK], 3.2);
  // Along the top edge and in a row down the side of the snout.
  for (let i = 0; i < 9; i++) {
    const u = i / 8;
    const x = lerp(400, 10, u);
    const top = lerp(-44, -96, u);
    knob(pen, { x, y: top + 4 }, 9 - 2 * u);
    if (i % 2 === 0 && i < 8) knob(pen, { x: x - 18, y: lerp(top, -10, 0.5) }, 6.5);
  }
  pen.hair(UPPER_LIP.slice(1), 2.6, '#a6b0b4', 0.45);
  pen.hair([{ x: 40, y: -88 }, { x: 240, y: -64 }, { x: 390, y: -44 }], 3, SHEEN, 0.35);
}

/** The eye, with a lid and a brow crease that carry its mood. */
function drawEye(ctx: CanvasRenderingContext2D, pen: Pen, mood: EyeMood): void {
  const r = 13;
  const { x, y } = EYE;
  const open = mood === 'wide' ? 1.15 : mood === 'squint' ? 0.35 : mood === 'smug' ? 0.5 : 0.7;
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(x, y, r * 1.25, r * open, -0.15, 0, Math.PI * 2);
  ctx.fillStyle = mood === 'wide' ? '#f1ede2' : '#c9c3b6';
  ctx.fill();
  ctx.clip();
  pen.dot(x + (mood === 'wide' ? 2 : 4), y + 1, r * 0.62, '#120d0c', 1);
  pen.dot(x + 1, y - 3, r * 0.2, '#f5f1e6', 0.9);
  ctx.restore();
  pen.stroke(
    Array.from({ length: 13 }, (_, i) => {
      const ang = Math.PI + (i / 12) * Math.PI;
      return { x: x + Math.cos(ang) * r * 1.3, y: y + Math.sin(ang) * r * open * 1.05 };
    }),
    2.6,
    INK,
  );
  if (mood === 'smug') pen.stroke([{ x: x - 15, y: y + 4 }, { x, y: y + 9 }, { x: x + 15, y: y + 4 }], 2, INK);
  else pen.hair([{ x: x - 14, y: y + r * open }, { x: x + 14, y: y + r * open + 2 }], 1.6, INK, 0.7);
  // The brow: raised in surprise, pressed down and slanted when annoyed.
  const brow = mood === 'wide' ? -r * 1.9 : mood === 'squint' ? -r * 0.85 : -r * 1.4;
  const slant = mood === 'squint' ? 7 : mood === 'smug' ? -3 : 0;
  pen.stroke([{ x: x - 18, y: y + brow - slant }, { x, y: y + brow - 4 }, { x: x + 18, y: y + brow + slant }], 3.2, INK);
}

// ---------------------------------------------------------------- for the scene and the cutaway

/** The whale's lips in its own frame (for water pouring off them): the upper lip, the lower lip, the throat's outer edge. */
export function rimsOf(w: WhalePose): { readonly upper: readonly Pt[]; readonly lower: readonly Pt[]; readonly throat: readonly Pt[] } {
  const a = w.gape * GAPE_MAX;
  return { upper: HEAD_TOP, lower: lowerLip(a), throat: throatOf(a, w.balloon).outer };
}

/** The whole head's outline in the whale's own frame, for the cutaway's edge and the surface's churn. */
export function headOutline(w: WhalePose): readonly Pt[] {
  const a = w.gape * GAPE_MAX;
  return [...HEAD_TOP.slice().reverse(), ...UPPER_LIP.slice().reverse(), ...throatOf(a, w.balloon).outer.slice().reverse()];
}
