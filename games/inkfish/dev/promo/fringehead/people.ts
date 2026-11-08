import { ellipse, INK, pathOf, Pen, type Pt } from '../../../src/art/pen';

/**
 * The gag: two generic, faceless people in ink silhouette, in profile across
 * a desk, who try the fringehead's way of settling things. Their jaws drop
 * open into yellow-rimmed fringehead gapes and they bonk mouths.
 *
 * Local px for one person facing right, the neck's base at the origin.
 */

const SKIN_INK = '#1f1e26';
const RIM_LIGHT = '#f4eddc';

const HEAD: readonly Pt[] = [
  { x: -48, y: -80 }, { x: -92, y: -118 }, { x: -124, y: -178 }, { x: -132, y: -240 }, { x: -118, y: -300 }, { x: -82, y: -344 },
  { x: -22, y: -368 }, { x: 40, y: -360 }, { x: 84, y: -330 }, { x: 103, y: -292 }, { x: 108, y: -262 }, { x: 103, y: -246 },
  { x: 127, y: -214 }, { x: 123, y: -204 }, { x: 106, y: -198 }, { x: 112, y: -187 }, { x: 105, y: -177 }, { x: -10, y: -172 }, { x: -30, y: -122 },
];
const HINGE = { x: -10, y: -172 };
const JAW: readonly Pt[] = [
  { x: 105, y: -177 }, { x: 111, y: -161 }, { x: 106, y: -146 }, { x: 95, y: -125 }, { x: 42, y: -110 }, { x: 4, y: -114 }, { x: -12, y: -140 }, HINGE,
];
const BODY: readonly Pt[] = [
  { x: -42, y: -96 }, { x: 36, y: -100 }, { x: 40, y: -30 }, { x: 64, y: 0 }, { x: 196, y: 54 }, { x: 236, y: 140 }, { x: 250, y: 330 },
  { x: -250, y: 330 }, { x: -236, y: 140 }, { x: -196, y: 54 }, { x: -64, y: 0 },
];

export type Outfit = 'tie' | 'badge';

export interface PersonPose {
  /** The neck's base, screen px. */
  readonly x: number;
  readonly y: number;
  readonly dir: 1 | -1;
  readonly scale: number;
  /** Jaw drop 0 .. 1, and a forward lean (radians). */
  readonly jaw: number;
  readonly lean: number;
  readonly outfit: Outfit;
}

const rotAbout = (p: Pt, c: Pt, a: number): Pt => {
  const dx = p.x - c.x;
  const dy = p.y - c.y;
  return { x: c.x + dx * Math.cos(a) - dy * Math.sin(a), y: c.y + dx * Math.sin(a) + dy * Math.cos(a) };
};

/** A closed outline smoothed through its points (Catmull-Rom), so the silhouettes read as drawn, not cut. */
function smoothClosed(pts: readonly Pt[], steps = 5): Pt[] {
  const n = pts.length;
  const out: Pt[] = [];
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n]!;
    const p1 = pts[i]!;
    const p2 = pts[(i + 1) % n]!;
    const p3 = pts[(i + 2) % n]!;
    for (let k = 0; k < steps; k++) {
      const t = k / steps;
      const t2 = t * t;
      const t3 = t2 * t;
      out.push({
        x: 0.5 * (2 * p1.x + (-p0.x + p2.x) * t + (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 + (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3),
        y: 0.5 * (2 * p1.y + (-p0.y + p2.y) * t + (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 + (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3),
      });
    }
  }
  return out;
}

const UPPER_LIP = { x: 112, y: -187 };

/** The dropped jaw for an opening (0 .. 1). */
const jawOf = (open: number): Pt[] => JAW.map((q) => {
  const r = rotAbout(q, HINGE, open * 0.42);
  return { x: r.x, y: r.y + 14 * open };
});

/** The fringehead gape between the lips: its rim's centre and half sizes (local px). */
function gapeOf(open: number): { readonly c: Pt; readonly rx: number; readonly ry: number; readonly lower: Pt } {
  const lower = jawOf(open)[1]!;
  const ry = 26 + 118 * open;
  return { c: { x: (UPPER_LIP.x + lower.x) / 2 + 74 * open, y: (UPPER_LIP.y + lower.y) / 2 }, rx: ry * 0.42, ry, lower };
}

/** The front of the open mouth's rim (local px), for effects: where two mouths meet. */
export function mouthFront(jaw: number): Pt {
  const g = gapeOf(jaw);
  return { x: g.c.x + g.rx, y: g.c.y };
}

/** A local point to screen px through a pose. */
export function personToScreen(p: PersonPose, q: Pt): Pt {
  const r = rotAbout(q, { x: 0, y: 0 }, p.lean);
  return { x: p.x + p.dir * r.x * p.scale, y: p.y + r.y * p.scale };
}

function shape(pen: Pen, pts: readonly Pt[], fill: string, width: number): void {
  pen.fill(pts, fill, 1);
  pen.stroke([...pts, pts[0]!], width, INK, 1);
}

/** The gape: gold membrane out to a yellow rim, the blue fringe, the dark throat and small teeth, like the fish's. */
function drawGape(pen: Pen, ctx: CanvasRenderingContext2D, open: number): void {
  const g = gapeOf(open);
  const rim = ellipse(g.c.x, g.c.y, g.rx, g.ry, 32);
  const top = { x: g.c.x, y: g.c.y - g.ry };
  const bottom = { x: g.c.x, y: g.c.y + g.ry };
  const back = Array.from({ length: 13 }, (_, i) => {
    const a = -Math.PI / 2 - (i / 12) * Math.PI;
    return { x: g.c.x + Math.cos(a) * g.rx, y: g.c.y + Math.sin(a) * g.ry };
  });
  const membrane = [{ x: 30, y: -182 }, UPPER_LIP, ...back, g.lower, { x: 30, y: -150 }];
  const wash = ctx.createLinearGradient(30, 0, g.c.x, 0);
  wash.addColorStop(0, '#8a7434');
  wash.addColorStop(1, '#ecc23e');
  ctx.save();
  ctx.fillStyle = wash;
  pathOf(ctx, membrane);
  ctx.fill();
  ctx.restore();
  pen.hair([UPPER_LIP, top], 1.6, INK, 0.8);
  pen.hair([g.lower, bottom], 1.6, INK, 0.8);
  (['#e9b934', '#4a58c0', '#26090f'] as const).forEach((c, i) => {
    const k = [1, 0.86, 0.74][i]!;
    pen.fill(ellipse(g.c.x + g.rx * (1 - k) * 0.6, g.c.y, g.rx * k, g.ry * k, 32), c, 1);
  });
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * Math.PI * 2 + 0.1;
    const cx = g.c.x + g.rx * 0.16;
    const base = { x: cx + Math.cos(a) * g.rx * 0.74, y: g.c.y + Math.sin(a) * g.ry * 0.74 };
    const tip = { x: cx + Math.cos(a) * g.rx * 0.62, y: g.c.y + Math.sin(a) * g.ry * 0.64 };
    const side = { x: -Math.sin(a) * 4, y: Math.cos(a) * 4 };
    pen.fill([{ x: base.x + side.x, y: base.y + side.y }, tip, { x: base.x - side.x, y: base.y - side.y }], '#fffaf0', 1);
  }
  pen.stroke([...rim, rim[0]!], 7, '#ffd447', 1, false);
  pen.stroke([...rim, rim[0]!], 2, INK, 1, false);
}

export function drawPerson(ctx: CanvasRenderingContext2D, p: PersonPose, boil: number, seed: number): void {
  const pen = new Pen(ctx, seed + boil * 97, 0.9);
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.scale(p.dir * p.scale, p.scale);
  ctx.rotate(p.lean);
  // Shoulders and neck, then the shirt.
  const body = smoothClosed(BODY, 4);
  shape(pen, body, '#2c2b36', 2.6);
  pen.hatch(body, 9, 0.7, 1, { color: '#0e0d12', alpha: 0.35 });
  if (p.outfit === 'tie') {
    shape(pen, [{ x: -10, y: -8 }, { x: 64, y: 0 }, { x: 30, y: 60 }], '#f4eddc', 2);
    shape(pen, [{ x: -10, y: -8 }, { x: -64, y: 0 }, { x: -30, y: 60 }], '#e8dfc8', 2);
    shape(pen, [{ x: -10, y: 4 }, { x: 4, y: 4 }, { x: 14, y: 40 }, { x: 2, y: 200 }, { x: -18, y: 200 }, { x: -22, y: 40 }], '#b8503d', 2);
  } else {
    pen.stroke([{ x: -56, y: 4 }, { x: -10, y: 26 }, { x: 56, y: 4 }], 9, '#c9b48a', 0.95, false);
    pen.stroke([{ x: 40, y: 16 }, { x: 70, y: 120 }], 3, '#2f6f9a', 1, false);
    shape(pen, [{ x: 54, y: 118 }, { x: 98, y: 112 }, { x: 102, y: 170 }, { x: 58, y: 176 }], '#f4eddc', 2);
    pen.hair([{ x: 64, y: 136 }, { x: 90, y: 133 }], 2, INK, 0.6);
    pen.hair([{ x: 64, y: 150 }, { x: 84, y: 148 }], 2, INK, 0.6);
  }
  const open = p.jaw;
  const jaw = smoothClosed(jawOf(open), 4);
  if (open > 0.02) drawGape(pen, ctx, open);
  shape(pen, jaw, SKIN_INK, 2.4);
  const head = smoothClosed(HEAD, 4);
  shape(pen, head, SKIN_INK, 2.6);
  // Hair: a short crop, or a bun.
  if (p.outfit === 'tie') {
    pen.hair(smoothClosed([{ x: -110, y: -300 }, { x: -60, y: -352 }, { x: 20, y: -366 }, { x: 70, y: -338 }, { x: 20, y: -346 }, { x: -60, y: -334 }], 4), 2.4, '#4a4656', 0.7);
  } else {
    const bun = ellipse(-118, -318, 40, 36, 18);
    shape(pen, bun, SKIN_INK, 2.4);
    pen.hair([{ x: -146, y: -330 }, { x: -96, y: -300 }], 2, '#4a4656', 0.8);
  }
  // A pale rim of light down the profile: faceless, but it reads as a face.
  const profile = head.filter((q) => q.x > 60 && q.y < -180);
  pen.hair(profile.map((q) => ({ x: q.x - 5, y: q.y })), 3, RIM_LIGHT, 0.35);
  ctx.restore();
}

/** The desk across the bottom of the gag, with two mugs on it. */
export function drawDesk(ctx: CanvasRenderingContext2D, top: number, boil: number, t: number): void {
  const pen = new Pen(ctx, 8100 + boil * 41, 1.2);
  const desk = [{ x: -40, y: top }, { x: 1120, y: top - 6 }, { x: 1120, y: 1980 }, { x: -40, y: 1980 }];
  pen.fill(desk, '#8a6440', 1);
  pen.clipped(desk, () => {
    const g = ctx.createLinearGradient(0, top, 0, top + 500);
    g.addColorStop(0, 'rgba(255,230,190,0.25)');
    g.addColorStop(1, 'rgba(20,10,0,0.55)');
    ctx.fillStyle = g;
    ctx.fillRect(-40, top - 10, 1200, 1000);
    for (let i = 0; i < 9; i++) pen.hair(Array.from({ length: 12 }, (_, k) => ({ x: -40 + k * 105, y: top + 40 + i * 60 + 8 * Math.sin(k * 0.8 + i) })), 1.6, '#3e2a18', 0.45);
  });
  pen.stroke([{ x: -40, y: top }, { x: 1120, y: top - 6 }], 3.4, INK, 1);
  pen.stroke([{ x: -40, y: top + 26 }, { x: 1120, y: top + 20 }], 1.6, INK, 0.6);
  for (const [x, band] of [[120, '#3f7f9a'], [960, '#c4573e']] as const) {
    const y = top + 4;
    const body = [{ x: x - 44, y: y - 110 }, { x: x + 44, y: y - 110 }, { x: x + 40, y }, { x: x - 40, y }];
    pen.fill(body, '#f4eddc', 1);
    pen.fill([{ x: x - 43, y: y - 76 }, { x: x + 43, y: y - 76 }, { x: x + 42, y: y - 54 }, { x: x - 42, y: y - 54 }], band, 0.9);
    pen.stroke([...body, body[0]!], 2.4, INK, 1);
    const handle = ellipse(x + (x < 540 ? 56 : -56), y - 58, 18, 26, 14);
    pen.stroke([...handle, handle[0]!], 7, INK, 1, false);
    pen.fill(ellipse(x, y - 110, 44, 10, 16), '#4a2c1a', 1);
    for (let i = 0; i < 2; i++) {
      const sx = x - 12 + i * 22;
      pen.hair(Array.from({ length: 7 }, (_, k) => ({ x: sx + 8 * Math.sin(k * 1.2 + t * 3 + i), y: y - 130 - k * 14 })), 2.4, '#7a6f60', 0.45);
    }
  }
}
