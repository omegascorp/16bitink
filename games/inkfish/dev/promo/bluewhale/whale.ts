import { INK, Pen, type Pt } from '../../../src/art/pen';
import { createRng } from '../../../src/logic/rng';
import { lerp } from '../short';
import { GAPE_MAX, type EyeMood, type WhalePose } from './story';

/**
 * The blue whale, in the game's pen: a long, slender body washed in mottled
 * blue-grey and hatched on its shadowed side, the broad flat head with its
 * splash guard, a tiny dorsal fin far back, the slim flipper, and the pale
 * pleated throat that balloons into a pouch bigger than the rest of it. The
 * black baleen hangs inside the open mouth.
 *
 * Drawn in its own frame (snout along +x, belly +y, the jaw hinge at the
 * origin; story.ts `onWhale` maps it to the world) in two passes, so the
 * krill can go between them: `drawWhaleBack` (fluke, body, the inside of the
 * mouth), then `drawWhaleFront` (the pouch, the lower jaw, the snout, the
 * eye, the flipper).
 */

const TOP = '#17263a';
const BLUE = '#30495f';
const FLANK = '#4f6a80';
const LIGHT = '#86a0b2';
const HATCH = '#08111b';
const PLEAT_PALE = '#dde2de';
const PLEAT_DEEP = '#a9b6bb';
const PLEAT_GROOVE = '#3d4e5c';
const PLEAT_PINK = '#c99a9c';
const MOUTH = '#2c1519';
const BALEEN = '#121314';
const BALEEN_FRINGE = '#7c7262';
const TONGUE = '#a2646a';
const SHEEN = '#e2ecf2';
const KRILL = '#f28d9c';

const rot = (p: Pt, a: number): Pt => ({ x: p.x * Math.cos(a) - p.y * Math.sin(a), y: p.x * Math.sin(a) + p.y * Math.cos(a) });
const range = (n: number, f: (u: number) => Pt): Pt[] => Array.from({ length: n + 1 }, (_, i) => f(i / n));

// ---------------------------------------------------------------- the shapes, in the whale's frame

/** The upper lip, hinge to snout: nearly straight, curving up a little at the back. */
const UPPER_LIP: readonly Pt[] = range(14, (u) => ({ x: u * 418, y: -8 * Math.sin(Math.PI * u) - 6 * u }));
/** The snout's rounded front and the flat top of the head back to the splash guard round the blowhole. */
const HEAD_TOP: readonly Pt[] = [
  { x: 424, y: -12 }, { x: 422, y: -24 }, { x: 408, y: -34 }, { x: 370, y: -42 }, { x: 290, y: -54 }, { x: 190, y: -66 }, { x: 100, y: -80 },
  { x: 30, y: -94 }, { x: -6, y: -108 }, { x: -30, y: -114 }, { x: -60, y: -112 }, { x: -130, y: -116 },
];
const BACK: readonly Pt[] = [
  { x: -260, y: -122 }, { x: -420, y: -124 }, { x: -580, y: -117 }, { x: -720, y: -104 }, { x: -830, y: -92 }, { x: -872, y: -104 },
  { x: -900, y: -122 }, { x: -912, y: -118 }, { x: -912, y: -96 }, { x: -960, y: -76 }, { x: -1050, y: -50 }, { x: -1140, y: -26 }, { x: -1192, y: -12 },
];
const BELLY: readonly Pt[] = [
  { x: -1192, y: 12 }, { x: -1140, y: 26 }, { x: -1050, y: 48 }, { x: -950, y: 72 }, { x: -820, y: 94 }, { x: -680, y: 106 }, { x: -540, y: 110 },
  { x: -380, y: 106 }, { x: -220, y: 94 }, { x: -100, y: 72 }, { x: -30, y: 44 },
];
/** The navel: where the pleated throat ends. */
const NAVEL: Pt = { x: -640, y: 106 };
/** The eye, just above and behind the corner of the mouth. */
const EYE: Pt = { x: -46, y: -16 };

const lowerLip = (a: number): Pt[] => range(14, (u) => rot({ x: u * 440, y: 5 * Math.sin(Math.PI * u) + 4 * u }, a));
const jawUnder = (a: number): Pt[] => range(10, (u) => rot({ x: u * 436, y: 46 + 16 * Math.sin(Math.PI * u) - 12 * u }, a));
const chin = (a: number): Pt[] => [{ x: 446, y: 12 }, { x: 446, y: 22 }, { x: 438, y: 32 }].map((p) => rot(p, a));

/** The fluke's stroke bends the tail stock up and down. */
function bend(p: Pt, w: WhalePose): Pt {
  if (p.x > -620) return p;
  const k = ((-620 - p.x) / 620) ** 2;
  return { x: p.x, y: p.y + 70 * w.stroke * k * Math.sin(w.beat - k * 1.2) };
}

/** The fluke and its stock, seen a little from above. */
const FLUKE: readonly Pt[] = [
  { x: -1186, y: -10 }, { x: -1232, y: -50 }, { x: -1290, y: -120 }, { x: -1322, y: -150 }, { x: -1316, y: -104 }, { x: -1286, y: -36 },
  { x: -1278, y: 0 }, { x: -1286, y: 36 }, { x: -1316, y: 104 }, { x: -1322, y: 150 }, { x: -1290, y: 120 }, { x: -1232, y: 50 }, { x: -1186, y: 10 },
];

/** Resample a polyline into n + 1 points evenly spaced along it. */
function resample(pts: readonly Pt[], n: number): Pt[] {
  const lens = [0];
  for (let i = 1; i < pts.length; i++) lens.push(lens[i - 1]! + Math.hypot(pts[i]!.x - pts[i - 1]!.x, pts[i]!.y - pts[i - 1]!.y));
  const total = lens[lens.length - 1]! || 1;
  return range(n, (u) => {
    const at = u * total;
    let i = 1;
    while (i < lens.length - 1 && lens[i]! < at) i++;
    const k = (at - lens[i - 1]!) / (lens[i]! - lens[i - 1]! || 1);
    return { x: lerp(pts[i - 1]!.x, pts[i]!.x, k), y: lerp(pts[i - 1]!.y, pts[i]!.y, k) };
  });
}

export interface Throat {
  /** Chin to navel along the jaw's underside and the belly. */
  readonly inner: readonly Pt[];
  /** Chin to navel round the outside of the pouch. */
  readonly outer: readonly Pt[];
  /** The pleats: curves from the chin to the navel, fanned across the pouch. */
  readonly pleats: readonly (readonly Pt[])[];
}

const STEPS = 28;

/** The throat from the chin to the navel, ballooning out into a vast round pouch. */
export function throatOf(a: number, balloon: number): Throat {
  const under = jawUnder(a);
  const s = chin(a)[2]!;
  const inner = resample([s, ...[...under].reverse(), { x: -30, y: 50 }, { x: -200, y: 96 }, { x: -420, y: 108 }, NAVEL], STEPS);
  const len = Math.hypot(NAVEL.x - s.x, NAVEL.y - s.y);
  const d = { x: (NAVEL.x - s.x) / len, y: (NAVEL.y - s.y) / len };
  const n = { x: d.y, y: -d.x };
  const height = 46 + 640 * balloon;
  const outer = range(STEPS, (v) => {
    // Fullest a third of the way back, like a sail filling, rounding off at the chin.
    const bulge = height * Math.sin(Math.PI * v ** 0.75) ** (0.85 - 0.25 * balloon);
    // The front swings forwards as it fills, the pouch billowing ahead of the chin.
    const ahead = 120 * balloon * Math.sin(Math.PI * Math.min(1, v * 2.2)) * (1 - v);
    return { x: s.x + (NAVEL.x - s.x) * v + n.x * bulge - d.x * ahead, y: s.y + (NAVEL.y - s.y) * v + n.y * bulge - d.y * ahead };
  });
  const pleats = Array.from({ length: 15 }, (_, i) => {
    const k = 0.06 + (i / 14) * 0.9;
    return inner.map((p, j) => ({ x: lerp(p.x, outer[j]!.x, k), y: lerp(p.y, outer[j]!.y, k) }));
  });
  return { inner, outer, pleats };
}

/** The open mouth: along the upper lip, round between the lips' tips, back along the lower lip. */
export function mouthOf(a: number): Pt[] {
  const top = UPPER_LIP[UPPER_LIP.length - 1]!;
  const lower = lowerLip(a);
  const bottom = lower[lower.length - 1]!;
  const inward = Math.hypot(bottom.x - top.x, bottom.y - top.y) * 0.12;
  const mid = { x: (top.x + bottom.x) / 2, y: (top.y + bottom.y) / 2 };
  const toHinge = Math.hypot(mid.x, mid.y) || 1;
  const front = { x: mid.x - (mid.x / toHinge) * inward, y: mid.y - (mid.y / toHinge) * inward };
  return [...UPPER_LIP, front, ...[...lower].reverse()];
}

/** The flipper from its root, sweeping back and down: slim and pale-edged. */
function finOf(w: WhalePose): Pt[] {
  const root = { x: -170, y: 70 };
  const ang = Math.PI - 0.55 + 0.08 * Math.sin(w.beat * 0.5);
  const dir = { x: Math.cos(ang), y: Math.sin(ang) };
  const nrm = { x: -dir.y, y: dir.x };
  const len = 220;
  const at = (u: number, side: number): Pt => {
    const half = (u < 0.15 ? 20 + 60 * u : 29 * (1 - u) ** 0.7 + 3) * side;
    const curl = 10 * Math.sin(Math.PI * u);
    return { x: root.x + dir.x * len * u + nrm.x * (half + curl), y: root.y + dir.y * len * u + nrm.y * (half + curl) };
  };
  return [...range(16, (u) => at(u, -1)), ...range(16, (u) => at(1 - u, 1))];
}

/** The body outline (without the throat), for the krill to stay off it. */
export function bodyOutline(w: WhalePose): Pt[] {
  return [...UPPER_LIP, ...HEAD_TOP, ...BACK, ...BELLY].map((p) => bend(p, w));
}

// ---------------------------------------------------------------- painting

const penFor = (ctx: CanvasRenderingContext2D, seed: number, boil: number): Pen => new Pen(ctx, seed * 131 + boil * 977, 1.4);

function enter(ctx: CanvasRenderingContext2D, w: WhalePose): void {
  ctx.translate(w.x, w.y);
  ctx.rotate(-w.tilt);
  ctx.scale(w.scale, w.scale);
}

/** Soft blotches fixed to the body (not the line boil): the blue whale's pale mottling, like a wash drying unevenly. */
const MOTTLE = (() => {
  const rng = createRng(1964);
  return Array.from({ length: 120 }, () => ({ u: rng(), v: rng(), r: 0.015 + rng() * 0.05, light: rng() < 0.62, a: 0.1 + rng() * 0.16 }));
})();

/** A body part, painted: a wash through the colour stops from `from` to `to`, mottled, hatched on its shadowed side, inked round. */
function paint(ctx: CanvasRenderingContext2D, pen: Pen, outline: readonly Pt[], from: Pt, to: Pt, stops: readonly string[], ink = 3.4, mottle = true): void {
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
  if (mottle) {
    for (const m of MOTTLE) {
      const x = box.x + m.u * box.w;
      const y = box.y + m.v * box.h;
      const r = m.r * size;
      const blot = ctx.createRadialGradient(x, y, 0, x, y, r);
      blot.addColorStop(0, m.light ? `rgba(176,198,214,${m.a.toFixed(3)})` : `rgba(6,12,20,${m.a.toFixed(3)})`);
      blot.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = blot;
      ctx.fillRect(x - r, y - r, 2 * r, 2 * r);
    }
  }
  ctx.restore();
  const len = Math.hypot(to.x - from.x, to.y - from.y) || 1;
  const d = { x: (to.x - from.x) / len, y: (to.y - from.y) / len };
  const n = { x: -d.y, y: d.x };
  const start = { x: from.x + d.x * len * 0.64, y: from.y + d.y * len * 0.64 };
  const far = size * 2;
  const band = [
    { x: start.x - n.x * far, y: start.y - n.y * far }, { x: start.x + n.x * far, y: start.y + n.y * far },
    { x: start.x + n.x * far + d.x * far, y: start.y + n.y * far + d.y * far }, { x: start.x - n.x * far + d.x * far, y: start.y - n.y * far + d.y * far },
  ];
  pen.clipped(outline, () => pen.hatch(band, 9, Math.atan2(d.y, d.x) + 1.1, 1, { color: HATCH, alpha: 0.3 }));
  pen.stroke([...outline, outline[0]!], ink, INK, 1, true);
}

/** Krill fixed in the mouth (its own frame), kept behind the baleen as the water goes out. */
const MOUTH_KRILL = (() => {
  const rng = createRng(457);
  return Array.from({ length: 70 }, () => ({ u: 0.15 + rng() * 0.8, v: 0.15 + rng() * 0.8, angle: rng() * Math.PI * 2, phase: rng() * Math.PI * 2 }));
})();

export function drawWhaleBack(ctx: CanvasRenderingContext2D, w: WhalePose, boil: number): void {
  const pen = penFor(ctx, 3, boil);
  const a = w.gape * GAPE_MAX;
  ctx.save();
  enter(ctx, w);
  paint(ctx, pen, FLUKE.map((p) => bend(p, w)), { x: -1300, y: -150 }, { x: -1300, y: 150 }, [TOP, BLUE, FLANK]);
  const body = bodyOutline(w);
  paint(ctx, pen, body, { x: 0, y: -125 }, { x: 0, y: 110 }, [TOP, BLUE, FLANK, LIGHT]);
  // Pale freckles of the mottling along the flank, and wet light along the back.
  pen.stipple(body, 340, (x, y) => (y > -90 && y < 80 && x < -60 && x > -1100 ? 0.55 : 0.08), 2.4, '#b9cbd6');
  pen.hair([{ x: -150, y: -104 }, { x: -420, y: -112 }, { x: -700, y: -96 }], 4, SHEEN, 0.32);
  if (a > 0.01) drawMouthInside(ctx, pen, a, w);
  ctx.restore();
}

function drawMouthInside(ctx: CanvasRenderingContext2D, pen: Pen, a: number, w: WhalePose): void {
  const mouth = mouthOf(a);
  const lower = lowerLip(a);
  pen.fill(mouth, MOUTH, 1);
  pen.clipped(mouth, () => {
    const g = ctx.createRadialGradient(0, 0, 10, 0, 0, 420);
    g.addColorStop(0, 'rgba(8,3,4,0.95)');
    g.addColorStop(1, 'rgba(70,28,34,0)');
    ctx.fillStyle = g;
    ctx.fillRect(-60, -80, 560, 560);
    const floor = lower.slice(0, 10);
    const tongue = [...floor, ...[...floor].reverse().map((p) => rot({ x: Math.hypot(p.x, p.y), y: 0 }, a * 0.7))];
    pen.fill(tongue, TONGUE, 0.7);
    // The krill already in: a pink haze and the nearest ones.
    if (w.krill > 0) {
      ctx.save();
      ctx.globalAlpha = 0.55 * w.krill;
      const haze = ctx.createRadialGradient(200 * Math.cos(a / 2), 200 * Math.sin(a / 2), 10, 200, 100, 340);
      haze.addColorStop(0, 'rgba(242,141,156,0.9)');
      haze.addColorStop(1, 'rgba(242,141,156,0)');
      ctx.fillStyle = haze;
      ctx.fillRect(-60, -80, 560, 560);
      ctx.restore();
      for (const k of MOUTH_KRILL) {
        const p = rot({ x: k.u * 400, y: 0 }, a * k.v);
        drawOneKrill(ctx, { x: p.x + 4 * Math.sin(w.beat * 2 + k.phase), y: p.y - 6 }, k.angle, 1.9, w.krill);
      }
    }
    // Baleen: black plates hanging from the upper jaw, fringed at their tips.
    for (let i = 1; i < UPPER_LIP.length - 1; i++) {
      for (let k = 0; k < 3; k++) {
        const u = (i + k / 3) / (UPPER_LIP.length - 1);
        const top = { x: u * 418, y: -8 * Math.sin(Math.PI * u) - 6 * u };
        const len = 30 + 56 * Math.sin(Math.PI * Math.min(1, u * 1.25));
        const tip = { x: top.x - len * 0.16, y: top.y + len };
        pen.hair([top, tip], 3.4, BALEEN, 0.92);
        pen.hair([{ x: tip.x + 1, y: tip.y - 12 }, { x: tip.x - 3, y: tip.y + 5 }], 2.2, BALEEN_FRINGE, 0.75);
      }
    }
  });
  pen.stroke(mouth, 2.4, INK, 0.9, false);
}

/** One krill: a pink, curled little shrimp with a dark eye. */
export function drawOneKrill(ctx: CanvasRenderingContext2D, p: Pt, angle: number, size: number, alpha: number): void {
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.rotate(angle);
  ctx.globalAlpha = alpha;
  ctx.fillStyle = KRILL;
  ctx.beginPath();
  ctx.ellipse(0, 0, 9 * size, 3.6 * size, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#b24f62';
  ctx.lineWidth = 1.6 * size;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-8 * size, 0);
  ctx.quadraticCurveTo(-13 * size, 3 * size, -12 * size, 7 * size);
  ctx.stroke();
  ctx.fillStyle = '#1b1015';
  ctx.beginPath();
  ctx.arc(6 * size, -1 * size, 1.6 * size, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

export function drawWhaleFront(ctx: CanvasRenderingContext2D, w: WhalePose, boil: number): void {
  const pen = penFor(ctx, 5, boil);
  const a = w.gape * GAPE_MAX;
  ctx.save();
  enter(ctx, w);
  drawThroat(ctx, pen, a, w.balloon);
  drawLowerJaw(ctx, pen, a);
  drawSnout(ctx, pen);
  drawEye(ctx, pen, w.eye);
  paint(ctx, pen, finOf(w), { x: -170, y: 50 }, { x: -300, y: 230 }, [BLUE, FLANK, '#b8c6cc'], 2.8, false);
  ctx.restore();
}

function drawThroat(ctx: CanvasRenderingContext2D, pen: Pen, a: number, balloon: number): void {
  const throat = throatOf(a, balloon);
  const shape = [...throat.inner, ...[...throat.outer].reverse()];
  const mid = throat.outer[Math.round(STEPS * 0.35)]!;
  const root = throat.inner[Math.round(STEPS * 0.35)]!;
  paint(ctx, pen, shape, root, mid, [FLANK, PLEAT_DEEP, PLEAT_PALE, PLEAT_PALE, '#b4bcbc'], 3.4, false);
  pen.clipped(shape, () => {
    // Stretched, the skin between the pleats shows pink.
    if (balloon > 0.2) {
      ctx.save();
      ctx.globalAlpha = 0.28 * Math.min(1, (balloon - 0.2) * 1.6);
      const g = ctx.createRadialGradient(mid.x, mid.y, 0, mid.x, mid.y, 500);
      g.addColorStop(0, PLEAT_PINK);
      g.addColorStop(1, 'rgba(201,154,156,0)');
      ctx.fillStyle = g;
      ctx.fillRect(mid.x - 600, mid.y - 600, 1200, 1200);
      ctx.restore();
    }
    throat.pleats.forEach((p, i) => {
      pen.hair(p, 2.2 + 1.4 * balloon, PLEAT_GROOVE, 0.7);
      if (i % 2 === 0) pen.hair(p.map((q) => ({ x: q.x + 5, y: q.y + 5 })), 1.8, '#f7f4ec', 0.5);
    });
    // Shadow on the far side of the round pouch, light on its near curve.
    const shade = ctx.createLinearGradient(root.x, root.y, mid.x, mid.y);
    shade.addColorStop(0, 'rgba(10,20,30,0.35)');
    shade.addColorStop(0.45, 'rgba(10,20,30,0)');
    shade.addColorStop(0.85, 'rgba(255,255,255,0.12)');
    shade.addColorStop(1, 'rgba(10,20,30,0.25)');
    ctx.fillStyle = shade;
    ctx.fillRect(-1500, -1500, 3000, 3000);
    pen.stipple(shape, 160, () => 0.5, 2.6, '#f4f7f6');
  });
  pen.stroke(throat.outer, 3.6, INK, 1, true);
}

function drawLowerJaw(ctx: CanvasRenderingContext2D, pen: Pen, a: number): void {
  const lip = lowerLip(a);
  const under = jawUnder(a);
  const shape = [...lip, ...chin(a), ...[...under].reverse()];
  paint(ctx, pen, shape, rot({ x: 200, y: 0 }, a), rot({ x: 200, y: 46 }, a), [FLANK, BLUE, TOP], 3.2);
  pen.hair(lip.slice(2), 2.4, '#b8c8d0', 0.55);
}

/** The flat head over the upper lip: the broad rostrum, a ridge down its middle, the splash guard. */
function drawSnout(ctx: CanvasRenderingContext2D, pen: Pen): void {
  const snout = [...UPPER_LIP, ...HEAD_TOP, { x: -110, y: -40 }, { x: -50, y: -4 }];
  paint(ctx, pen, snout, { x: 0, y: -100 }, { x: 0, y: 0 }, [TOP, BLUE, FLANK], 3.4);
  pen.hair([{ x: 400, y: -30 }, { x: 260, y: -46 }, { x: 120, y: -64 }, { x: 10, y: -84 }], 2.2, '#0c1622', 0.55);
  pen.hair(UPPER_LIP.slice(1), 2.6, '#a8b8c2', 0.45);
  pen.hair([{ x: 40, y: -82 }, { x: 240, y: -58 }, { x: 390, y: -38 }], 3, SHEEN, 0.35);
  pen.stroke([{ x: -4, y: -100 }, { x: -26, y: -110 }, { x: -52, y: -106 }], 2.4, INK, 0.8, false);
}

/** The eye, with a lid and a brow that carry its mood. */
function drawEye(ctx: CanvasRenderingContext2D, pen: Pen, mood: EyeMood): void {
  const r = 16;
  const { x, y } = EYE;
  if (mood === 'happy') {
    // Shut in a contented curve, a cheek pushed up under it.
    pen.stroke([{ x: x - 20, y: y + 4 }, { x: x - 8, y: y - 8 }, { x: x + 8, y: y - 8 }, { x: x + 20, y: y + 4 }], 5, INK);
    pen.hair([{ x: x - 16, y: y + 15 }, { x, y: y + 20 }, { x: x + 18, y: y + 14 }], 2.4, INK, 0.65);
    pen.stroke([{ x: x - 22, y: y - 26 }, { x, y: y - 32 }, { x: x + 22, y: y - 26 }], 3.4, INK);
    return;
  }
  const open = mood === 'wide' ? 1.2 : mood === 'smug' ? 0.48 : 0.75;
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(x, y, r * 1.25, r * open, -0.15, 0, Math.PI * 2);
  ctx.fillStyle = mood === 'wide' ? '#f1ede2' : '#cfc9bc';
  ctx.fill();
  ctx.clip();
  pen.dot(x + (mood === 'wide' ? 2 : 4), y + 1, r * 0.62, '#120d0c', 1);
  pen.dot(x + 1, y - 3, r * 0.2, '#f5f1e6', 0.9);
  ctx.restore();
  pen.stroke(range(12, (u) => ({ x: x + Math.cos(Math.PI + u * Math.PI) * r * 1.3, y: y + Math.sin(Math.PI + u * Math.PI) * r * open * 1.05 })), 2.6, INK);
  if (mood === 'smug') pen.stroke([{ x: x - 15, y: y + 4 }, { x, y: y + 9 }, { x: x + 15, y: y + 4 }], 2, INK);
  const brow = mood === 'wide' ? -r * 2 : mood === 'smug' ? -r * 1.1 : -r * 1.45;
  const slant = mood === 'smug' ? -4 : 0;
  pen.stroke([{ x: x - 18, y: y + brow - slant }, { x, y: y + brow - 4 }, { x: x + 18, y: y + brow + slant }], 3.2, INK);
}

// ---------------------------------------------------------------- for the scene

/** The gap between the lips, upper lip and lower lip (whale frame): where the water squirts out through the baleen. */
export function lipsOf(w: WhalePose): { readonly upper: readonly Pt[]; readonly lower: readonly Pt[] } {
  return { upper: UPPER_LIP, lower: lowerLip(w.gape * GAPE_MAX) };
}
