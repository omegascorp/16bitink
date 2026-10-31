import { INK, Pen, type Pt } from '../../../src/art/pen';
import { createRng } from '../../../src/logic/rng';
import { lerp } from '../short';
import type { EyeMood, WhalePose } from './story';

/**
 * The Bryde's whale hanging head-up at the surface, in the game's pen: a
 * slimmer body than a blue whale's, a dark grey back washed from slate to a
 * paler flank, the pale pleated throat, the narrow pointed head with its three
 * ridges, a falcate dorsal fin, the dark baleen hanging in the open mouth.
 *
 * Drawn in its own frame (the jaw hinge at the origin, the snout up -y, the
 * belly +x; ~1,700 units snout to fluke, 12 m); `enterWhale` maps it to the world.
 */

const SLATE = '#1b232b';
const BACK = '#2f3a44';
const FLANK = '#4b5863';
const LIGHT = '#7d8b95';
const PLEAT = '#e6e2d6';
const PLEAT_DEEP = '#b9b7ae';
const GROOVE = '#6f7a82';
const MOUTH = '#2a1317';
const TONGUE = '#b06a70';
const BALEEN = '#15161a';
const SHEEN = '#dfe8ee';


const lerpPt = (a: Pt, b: Pt, u: number): Pt => ({ x: lerp(a.x, b.x, u), y: lerp(a.y, b.y, u) });
const range = (n: number, f: (u: number) => Pt): Pt[] => Array.from({ length: n + 1 }, (_, i) => f(i / n));

/** Chaikin corner cutting: rounds a polygon into a smooth body. */
export function smoothed(pts: readonly Pt[], rounds: number): Pt[] {
  let cur = [...pts];
  for (let r = 0; r < rounds; r++) {
    const next: Pt[] = [];
    for (let i = 0; i < cur.length; i++) {
      const a = cur[i]!;
      const b = cur[(i + 1) % cur.length]!;
      next.push({ x: 0.75 * a.x + 0.25 * b.x, y: 0.75 * a.y + 0.25 * b.y }, { x: 0.25 * a.x + 0.75 * b.x, y: 0.25 * a.y + 0.75 * b.y });
    }
    cur = next;
  }
  return cur;
}

// ---------------------------------------------------------------- the shapes

/** The upper lip, hinge to the pointed snout. */
const UPPER_LIP: readonly Pt[] = [{ x: 30, y: 0 }, { x: 40, y: -20 }, { x: 46, y: -100 }, { x: 40, y: -190 }, { x: 28, y: -290 }, { x: 10, y: -380 }, { x: -6, y: -430 }];
/** Snout down the back to the tail stock. */
const BACK_EDGE: readonly Pt[] = [
  { x: -6, y: -430 }, { x: -30, y: -380 }, { x: -70, y: -290 }, { x: -110, y: -190 }, { x: -140, y: -90 }, { x: -165, y: -10 }, { x: -185, y: 100 }, { x: -195, y: 250 },
  { x: -190, y: 450 }, { x: -170, y: 700 }, { x: -135, y: 950 }, { x: -95, y: 1200 }, { x: -60, y: 1420 }, { x: -32, y: 1520 },
];
/** Tail stock up the belly to the hinge. */
const BELLY_EDGE: readonly Pt[] = [
  { x: 30, y: 1520 }, { x: 40, y: 1420 }, { x: 70, y: 1200 }, { x: 100, y: 900 }, { x: 115, y: 640 }, { x: 95, y: 300 }, { x: 60, y: 100 }, { x: 30, y: 10 },
];
const BODY: readonly Pt[] = smoothed([...BACK_EDGE, ...BELLY_EDGE, ...[...UPPER_LIP].reverse().slice(1, -1)], 2);
const FLUKE: readonly Pt[] = [
  { x: -40, y: 1490 }, { x: -170, y: 1560 }, { x: -310, y: 1610 }, { x: -318, y: 1666 }, { x: -130, y: 1640 }, { x: 0, y: 1606 }, { x: 130, y: 1640 }, { x: 318, y: 1666 },
  { x: 310, y: 1610 }, { x: 170, y: 1560 }, { x: 40, y: 1490 },
];
const DORSAL: readonly Pt[] = [{ x: -100, y: 1170 }, { x: -150, y: 1250 }, { x: -205, y: 1340 }, { x: -172, y: 1346 }, { x: -108, y: 1300 }, { x: -86, y: 1260 }];
const FLIPPER: readonly Pt[] = [{ x: 92, y: 560 }, { x: 140, y: 650 }, { x: 188, y: 790 }, { x: 214, y: 920 }, { x: 198, y: 962 }, { x: 168, y: 900 }, { x: 122, y: 790 }, { x: 84, y: 680 }];
const EYE: Pt = { x: -236, y: 28 };

const backEdgeAt = (y: number): number => {
  for (let i = 1; i < BACK_EDGE.length; i++) {
    const [a, b] = [BACK_EDGE[i - 1]!, BACK_EDGE[i]!];
    if (y >= a.y && y <= b.y) return lerp(a.x, b.x, (y - a.y) / (b.y - a.y));
  }
  return BACK_EDGE[BACK_EDGE.length - 1]!.x;
};

// ---------------------------------------------------------------- painting

const MOTTLE = (() => {
  const rng = createRng(2017);
  return Array.from({ length: 70 }, () => ({ u: rng(), v: rng(), r: 0.02 + rng() * 0.06, light: rng() < 0.6, a: 0.08 + rng() * 0.14 }));
})();

function paint(ctx: CanvasRenderingContext2D, pen: Pen, outline: readonly Pt[], from: Pt, to: Pt, stops: readonly string[], ink = 3.6, mottle = true): void {
  const g = ctx.createLinearGradient(from.x, from.y, to.x, to.y);
  stops.forEach((c, i) => g.addColorStop(i / (stops.length - 1), c));
  const xs = outline.map((p) => p.x);
  const ys = outline.map((p) => p.y);
  const box = { x: Math.min(...xs), y: Math.min(...ys), w: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys) };
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
      const r = m.r * Math.max(box.w, box.h);
      const blot = ctx.createRadialGradient(x, y, 0, x, y, r);
      blot.addColorStop(0, m.light ? `rgba(170,190,205,${m.a.toFixed(3)})` : `rgba(4,8,14,${m.a.toFixed(3)})`);
      blot.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = blot;
      ctx.fillRect(x - r, y - r, 2 * r, 2 * r);
    }
  }
  ctx.restore();
  pen.stroke([...outline, outline[0]!], ink, INK, 1, true);
}

/** Puts the whale's own frame on the canvas (the snout leans back, away from the fish). */
export function enterWhale(ctx: CanvasRenderingContext2D, w: WhalePose): void {
  ctx.translate(w.x, w.y);
  ctx.rotate(-w.tilt);
  ctx.scale(w.scale, w.scale);
}

/** In the whale's frame: the lip's centre line (at the waterline) and the arch of the palate, which rises as the jaw drops. */
export const LIP_Y = 100;
export const CAVITY_W = 195;
export const cavityTop = (gape: number): number => LIP_Y - 330 * gape;
const mirror = (pts: readonly Pt[]): Pt[] => pts.map((p) => ({ x: -p.x, y: p.y }));

/**
 * The whale seen from the water's edge, three-quarters on: the narrow rostrum
 * standing up behind, the jaw dropped forward with its lip at the waterline,
 * the dark cavity between with baleen hanging down both sides, the pale
 * pleated throat curving down into the water. `fish(inside)` draws the
 * anchovies in this frame: those still in the water before the lip is drawn
 * (so they pass over it), those already over it before it (so the lip hides them).
 */
export function drawWhale(ctx: CanvasRenderingContext2D, w: WhalePose, boil: number, seed = 3, fish?: (inside: boolean) => void): void {
  const pen = new Pen(ctx, seed * 131 + boil * 977, 1.5);
  const g = w.gape;
  const top = cavityTop(g);
  ctx.save();
  enterWhale(ctx, w);
  paint(ctx, pen, FLUKE, { x: -300, y: 1600 }, { x: 300, y: 1660 }, [BACK, FLANK, BACK], 3.4, false);
  paint(ctx, pen, DORSAL, { x: -200, y: 1340 }, { x: -90, y: 1200 }, [SLATE, BACK], 3, false);
  ctx.save();
  ctx.beginPath();
  ctx.rect(-1000, 30, 2000, 3000);
  ctx.clip();
  paint(ctx, pen, BODY, { x: -200, y: 0 }, { x: 120, y: 0 }, [SLATE, BACK, FLANK, LIGHT]);
  drawMarkings(ctx, pen);
  ctx.restore();
  drawRostrum(ctx, pen, top, g);
  drawCheeks(ctx, pen, top);
  drawCavity(ctx, pen, top, g);
  fish?.(true);
  drawLowerJaw(ctx, pen, g);
  drawThroat(ctx, pen, w.bulge);
  fish?.(false);
  for (const side of [-1, 1]) {
    ctx.save();
    ctx.scale(side, 1);
    drawEye(ctx, pen, w.eye);
    ctx.restore();
  }
  ctx.restore();
}

/** Wet light along the back and pale freckles on the flank. */
function drawMarkings(ctx: CanvasRenderingContext2D, pen: Pen): void {
  pen.hair(range(10, (u) => ({ x: backEdgeAt(120 + u * 1000) + 20, y: 120 + u * 1000 })), 4, SHEEN, 0.18);
  pen.stipple(BODY, 260, (x, y) => (y > 150 && x < 40 ? 0.5 : 0.04), 2.2, '#b9c6cf');
  ctx.save();
  pen.clipped(BODY, () => pen.hatch([{ x: -210, y: -440 }, { x: -120, y: -440 }, { x: -120, y: 1500 }, { x: -210, y: 1500 }], 12, 1.2, 1, { color: '#04080c', alpha: 0.4 }));
  ctx.restore();
}

/** The rostrum: a narrow pointed ridge standing up behind the mouth, three ridges running down it. */
function drawRostrum(ctx: CanvasRenderingContext2D, pen: Pen, top: number, g: number): void {
  const tip = -440;
  const base = Math.min(top + 70, LIP_Y - 10);
  const left = range(14, (u) => ({ x: -215 * u ** 0.75, y: tip + (base - tip) * u }));
  const shape = [...left, ...mirror(left).reverse()];
  paint(ctx, pen, shape, { x: -215, y: 0 }, { x: 215, y: 0 }, [SLATE, FLANK, BACK, SLATE], 3.8);
  const end = Math.min(top + 20, base);
  pen.hair([{ x: 0, y: tip + 14 }, { x: 0, y: end }], 3.4, SHEEN, 0.5);
  for (const s of [-1, 1]) {
    pen.hair(range(10, (u) => ({ x: s * (14 + 78 * u ** 1.2), y: tip + 30 + (end - tip - 30) * u })), 2.6, SHEEN, 0.42);
  }
  if (g < 0.02) pen.hair([{ x: -120, y: LIP_Y - 30 }, { x: 0, y: LIP_Y - 20 }, { x: 120, y: LIP_Y - 30 }], 3, '#0b1016', 0.6);
}

const CHEEK: readonly Pt[] = [{ x: -212, y: 0 }, { x: -258, y: 90 }, { x: -270, y: 150 }, { x: -262, y: 200 }, { x: -222, y: 214 }, { x: -196, y: 150 }, { x: -200, y: 40 }];

/** The sides of the head either side of the mouth, from the rostrum's base down to the lip's corners. */
function drawCheeks(ctx: CanvasRenderingContext2D, pen: Pen, top: number): void {
  const left = CHEEK.map((p) => ({ x: p.x, y: top + 40 + (p.y / 214) * (LIP_Y + 8 - top - 40) }));
  for (const side of [left, mirror(left)]) paint(ctx, pen, side, { x: -270, y: 0 }, { x: 270, y: 0 }, [SLATE, BACK, FLANK], 3.4);
}

/** The cavity's two edges: the palate's arch and the lip's inner curve. */
const arch = (x: number, top: number): number => top + 90 * (x / CAVITY_W) ** 2;
const lipAt = (x: number, drop = 0): number => LIP_Y - 46 * (x / CAVITY_W) ** 2 + drop;

/** The mouth's inside: the darkest thing in the picture, baleen hanging down both sides of the upper jaw. */
function drawCavity(ctx: CanvasRenderingContext2D, pen: Pen, top: number, g: number): void {
  if (g < 0.04) return;
  const xs = range(16, (u) => ({ x: -CAVITY_W + 2 * CAVITY_W * u, y: 0 }));
  const cavity = [...xs.map((p) => ({ x: p.x, y: arch(p.x, top) })), ...[...xs].reverse().map((p) => ({ x: p.x, y: lipAt(p.x, -14) }))];
  const mid = { x: 0, y: (top + LIP_Y) / 2 };
  const grad = ctx.createRadialGradient(mid.x, mid.y, 10, mid.x, mid.y, 260);
  grad.addColorStop(0, '#030102');
  grad.addColorStop(0.6, '#12080a');
  grad.addColorStop(1, '#2a1317');
  ctx.save();
  ctx.fillStyle = grad;
  pathOfPts(ctx, cavity);
  ctx.fill();
  ctx.restore();
  pen.clipped(cavity, () => {
    // The tongue, dim at the bottom, and the baleen curtains down both sides.
    pen.fill(range(12, (u) => ({ x: -120 + 240 * u, y: LIP_Y - 30 - 28 * Math.sin(Math.PI * u) })), TONGUE, 0.28);
    for (const side of [-1, 1]) {
      const edge = range(12, (u) => ({ x: side * (CAVITY_W - 6 - 120 * u), y: arch(side * (CAVITY_W - 120 * u), top) }));
      const reach = (u: number): number => (70 + 70 * Math.sin(Math.PI * Math.min(1, u * 1.1 + 0.15))) * Math.min(1, g * 1.4);
      const curtain = [...edge, ...[...edge].reverse().map((p, i) => ({ x: p.x, y: p.y + reach(1 - i / 12) }))];
      pen.fill(curtain, '#1b1c20', 0.95);
      for (let i = 0; i <= 12; i++) {
        for (let k = 0; k < 3; k++) {
          const u = Math.min(1, (i + k / 3) / 12);
          const p = { x: side * (CAVITY_W - 6 - 120 * u), y: arch(side * (CAVITY_W - 120 * u), top) };
          const len = reach(u) + 10;
          pen.hair([p, { x: p.x - side * 4, y: p.y + len }], 3.6, BALEEN, 0.95);
          pen.hair([{ x: p.x - side * 4, y: p.y + len - 14 }, { x: p.x - side * 5, y: p.y + len + 2 }], 2, '#8a8372', 0.7);
        }
      }
    }
  });
  pen.stroke(xs.map((p) => ({ x: p.x, y: arch(p.x, top) })), 3.4, INK, 0.9, false);
}

function pathOfPts(ctx: CanvasRenderingContext2D, pts: readonly Pt[]): void {
  ctx.beginPath();
  pts.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
  ctx.closePath();
}

/** The dropped lower jaw: a thick curved lip across the bottom of the cavity, its centre at the waterline. */
function drawLowerJaw(ctx: CanvasRenderingContext2D, pen: Pen, g: number): void {
  const xs = range(16, (u) => ({ x: -232 + 464 * u, y: 0 }));
  const inner = xs.map((p) => ({ x: p.x, y: lipAt(Math.max(-CAVITY_W, Math.min(CAVITY_W, p.x)), -14) }));
  const outer = xs.map((p) => ({ x: p.x, y: lipAt(Math.max(-CAVITY_W, Math.min(CAVITY_W, p.x)), 52 - 26 * (1 - g)) + 26 * (p.x / 232) ** 2 }));
  paint(ctx, pen, [...inner, ...[...outer].reverse()], { x: 0, y: LIP_Y - 30 }, { x: 0, y: LIP_Y + 70 }, [LIGHT, FLANK, BACK], 3.4);
  pen.hair(inner.slice(1, -1), 3, '#c3cfd6', 0.6);
}

/** The pale pleated throat curving down from the lip into the water, swelling with the gulp. */
function drawThroat(ctx: CanvasRenderingContext2D, pen: Pen, bulge: number): void {
  const wide = 1 + 0.3 * bulge;
  const deep = LIP_Y + 400 + 120 * bulge;
  const edge = (side: number): Pt[] => [
    { x: side * 232 * wide, y: LIP_Y + 18 }, { x: side * 236 * wide, y: LIP_Y + 120 }, { x: side * 200 * wide, y: LIP_Y + 250 },
    { x: side * 110 * wide, y: deep - 60 }, { x: side * 30, y: deep },
  ];
  const lip = range(16, (u) => ({ x: -232 + 464 * u, y: LIP_Y + 40 + 26 * (((u - 0.5) * 2) ** 2) - 20 }));
  const poly = [...lip, ...edge(1), { x: 0, y: deep + 14 }, ...[...edge(-1)].reverse()];
  paint(ctx, pen, poly, { x: -230, y: LIP_Y }, { x: 230, y: LIP_Y + 200 }, [PLEAT_DEEP, PLEAT, PLEAT, PLEAT_DEEP], 3.6, false);
  pen.clipped(poly, () => {
    for (let i = 0; i <= 18; i++) {
      const u = i / 18;
      const x = -225 * wide + 450 * wide * u;
      const start = { x, y: LIP_Y + 44 };
      const end = { x: x * 0.12, y: deep + 6 };
      const ctl = { x: x * 1.02, y: LIP_Y + 240 };
      const line = range(12, (v) => ({
        x: (1 - v) ** 2 * start.x + 2 * v * (1 - v) * ctl.x + v * v * end.x,
        y: (1 - v) ** 2 * start.y + 2 * v * (1 - v) * ctl.y + v * v * end.y,
      }));
      pen.hair(line, 2.6 + 1.2 * bulge, GROOVE, 0.75);
      if (i % 2 === 0) pen.hair(line.map((q) => ({ x: q.x + 5, y: q.y + 3 })), 1.8, '#fbf9f2', 0.5);
    }
  });
}

/** The eye behind the mouth's corner: its lid and brow carry the mood. */
function drawEye(ctx: CanvasRenderingContext2D, pen: Pen, mood: EyeMood): void {
  const r = 14;
  const { x, y } = EYE;
  if (mood === 'happy') {
    pen.stroke([{ x: x - 21, y: y + 5 }, { x: x - 8, y: y - 9 }, { x: x + 8, y: y - 9 }, { x: x + 21, y: y + 5 }], 5.4, INK);
    pen.hair([{ x: x - 16, y: y + 16 }, { x, y: y + 21 }, { x: x + 18, y: y + 15 }], 2.4, '#0b1016', 0.65);
    return;
  }
  const open = { sly: 0.55, smug: 0.42, wide: 1.2, lazy: 0.3 }[mood];
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(x, y, r * 1.3, r * open, -0.12, 0, Math.PI * 2);
  ctx.fillStyle = mood === 'wide' ? '#f2eee3' : '#d3cdbe';
  ctx.fill();
  ctx.clip();
  const look = mood === 'sly' ? 7 : mood === 'wide' ? 3 : 1;
  pen.dot(x + look, y + (mood === 'lazy' ? 3 : 0), r * 0.62, '#120d0c', 1);
  pen.dot(x + look - 2, y - 3, r * 0.2, '#f5f1e6', 0.9);
  if (mood !== 'wide') {
    // The heavy lid over the top of the eye.
    ctx.fillStyle = FLANK;
    ctx.fillRect(x - r * 1.5, y - r * 1.5, r * 3, r * (1.5 - open * (mood === 'lazy' ? 0.55 : 0.8)));
  }
  ctx.restore();
  pen.stroke(range(12, (u) => ({ x: x + Math.cos(Math.PI + u * Math.PI) * r * 1.35, y: y + Math.sin(Math.PI + u * Math.PI) * r * open })), 2.8, INK);
  pen.stroke(range(12, (u) => ({ x: x + Math.cos(u * Math.PI) * r * 1.3, y: y + Math.sin(u * Math.PI) * r * open * 0.9 })), mood === 'lazy' ? 2.4 : 1.8, INK, 0.8, false);
  if (mood === 'lazy') pen.hair([{ x: x - 16, y: y + 14 }, { x, y: y + 20 }, { x: x + 16, y: y + 14 }], 2.2, '#0b1016', 0.6);
  const brow = mood === 'wide' ? -r * 2.1 : mood === 'lazy' ? -r * 1.0 : -r * 1.35;
  const tilt = mood === 'sly' ? 6 : mood === 'smug' ? -5 : 0;
  pen.stroke([{ x: x - 20, y: y + brow + tilt }, { x, y: y + brow - 3 }, { x: x + 20, y: y + brow - tilt }], 3.4, INK);
}
