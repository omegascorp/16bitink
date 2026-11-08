import { INK, Pen, type Pt } from '../../../src/art/pen';
import { createRng } from '../../../src/logic/rng';
import { VIDEO } from '../short';
import { CONTACT, SUB } from './story';

/**
 * The submarine under water, painted: its black rubber sonar dome at the bow
 * (matte, the light catching its upper curve), the ring of bolts where the
 * rubber meets the steel hull, the hull's welded plates and the row of
 * limber holes along its casing, and the sail far back with its planes. In
 * the hull scene's world px: the caller sets up the camera.
 *
 * Also the close-up of the rubber for the bite, in screen px.
 */

const RUBBER_LIGHT = '#3c4950';
const RUBBER = '#161d22';
const RUBBER_DARK = '#06090b';
const STEEL_LIGHT = '#56635f';
const STEEL = '#2c3634';
const STEEL_DARK = '#0c1112';
const CUT_WALL = '#59646a';
const SHEEN = 'rgba(214,234,236,0.5)';

const range = (n: number, f: (u: number) => Pt): Pt[] => Array.from({ length: n + 1 }, (_, i) => f(i / n));

function pathOf(ctx: CanvasRenderingContext2D, pts: readonly Pt[]): void {
  ctx.beginPath();
  pts.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
  ctx.closePath();
}

const TOP = SUB.axisY - SUB.radius;
const BOTTOM = SUB.axisY + SUB.radius;
const HULL_END = SUB.capX + 7000;

/** The cap's outline: the left half of an ellipse from the seam's top round the nose to its bottom. */
const CAP: readonly Pt[] = range(48, (u) => {
  const a = -Math.PI / 2 - u * Math.PI;
  return { x: SUB.capX + SUB.capLen * Math.cos(a), y: SUB.axisY + SUB.radius * Math.sin(a) };
});

const SAIL: readonly Pt[] = (() => {
  const x0 = SUB.sailX;
  const w = SUB.sailW;
  const top = TOP - SUB.sailH;
  // A tall rounded fin: the leading edge curving up from the deck, a flat top, the trailing edge raked back.
  return [
    { x: x0 - 34, y: TOP + 8 }, { x: x0 - 8, y: TOP - 30 }, { x: x0 + 2, y: TOP - SUB.sailH * 0.5 }, { x: x0 + 8, y: top + 36 }, { x: x0 + 30, y: top + 6 },
    { x: x0 + 70, y: top }, { x: x0 + w - 50, y: top }, { x: x0 + w - 24, y: top + 10 }, { x: x0 + w + 6, y: TOP - 24 }, { x: x0 + w + 40, y: TOP + 8 },
  ];
})();

/** A fairwater plane on the sail, seen end on: a short wing. */
const PLANE: readonly Pt[] = (() => {
  const y = TOP - SUB.sailH * 0.6;
  const x0 = SUB.sailX - 40;
  return [{ x: x0, y: y + 2 }, { x: x0 + 16, y: y - 11 }, { x: x0 + 120, y: y - 14 }, { x: x0 + 190, y: y - 6 }, { x: x0 + 200, y: y + 2 }, { x: x0 + 120, y: y + 12 }, { x: x0 + 20, y: y + 13 }];
})();

/** Soft blotches on the rubber and steel, fixed to the hull. */
const BLOTS = (() => {
  const rng = createRng(1978);
  return Array.from({ length: 70 }, () => ({ x: SUB.capX - SUB.capLen + rng() * 3200, y: TOP + rng() * (BOTTOM - TOP), r: 60 + rng() * 140, light: rng() < 0.4, a: 0.05 + rng() * 0.08 }));
})();

function blotches(ctx: CanvasRenderingContext2D, clip: readonly Pt[]): void {
  ctx.save();
  pathOf(ctx, clip);
  ctx.clip();
  for (const b of BLOTS) {
    const g = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, b.r);
    g.addColorStop(0, b.light ? `rgba(150,170,172,${b.a.toFixed(3)})` : `rgba(0,0,0,${(b.a * 1.4).toFixed(3)})`);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(b.x - b.r, b.y - b.r, 2 * b.r, 2 * b.r);
  }
  ctx.restore();
}

/** The steel hull behind the dome, the sail on top of it. */
function drawSteel(ctx: CanvasRenderingContext2D, pen: Pen, zoom: number): void {
  const body = [{ x: SUB.capX - 4, y: TOP }, { x: HULL_END, y: TOP }, { x: HULL_END, y: BOTTOM }, { x: SUB.capX - 4, y: BOTTOM }];
  const g = ctx.createLinearGradient(0, TOP, 0, BOTTOM);
  g.addColorStop(0, STEEL_LIGHT);
  g.addColorStop(0.18, STEEL);
  g.addColorStop(0.7, STEEL_DARK);
  g.addColorStop(1, '#050808');
  pen.fill(body, '#000', 0);
  ctx.save();
  pathOf(ctx, body);
  ctx.fillStyle = g;
  ctx.fill();
  ctx.restore();
  blotches(ctx, body);
  const w = 2.4 / zoom;
  // Welded plates: rings round the hull and two long seams.
  for (let x = SUB.capX + 250; x < SUB.capX + 3600; x += 280) pen.hair([{ x, y: TOP + 6 }, { x: x + 2, y: BOTTOM - 4 }], w, '#0a0f10', 0.7);
  for (const y of [SUB.axisY - SUB.radius * 0.5, SUB.axisY + SUB.radius * 0.38]) pen.hair([{ x: SUB.capX + 10, y }, { x: SUB.capX + 3600, y: y + 3 }], w, '#0a0f10', 0.6);
  // The limber holes along the casing.
  ctx.save();
  ctx.fillStyle = '#030505';
  for (let x = SUB.capX + 60; x < SUB.capX + 3600; x += 34) {
    if (x > SUB.sailX - 50 && x < SUB.sailX + SUB.sailW + 50) continue;
    ctx.beginPath();
    ctx.ellipse(x, TOP + 26, 9, 5, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
  // Grime streaking down from the casing, as on a boat long at sea.
  const rng = createRng(42);
  ctx.save();
  for (let i = 0; i < 26; i++) {
    const x = SUB.capX + 40 + rng() * 3400;
    const len = 80 + rng() * 260;
    const g2 = ctx.createLinearGradient(0, TOP + 30, 0, TOP + 30 + len);
    g2.addColorStop(0, `rgba(120,132,120,${(0.08 + rng() * 0.1).toFixed(3)})`);
    g2.addColorStop(1, 'rgba(120,132,120,0)');
    ctx.fillStyle = g2;
    ctx.fillRect(x, TOP + 30, 4 + rng() * 10, len);
  }
  ctx.restore();
  // Light along the top of the hull.
  pen.hair([{ x: SUB.capX + 20, y: TOP + 14 }, { x: SUB.capX + 3600, y: TOP + 16 }], 7 / zoom, SHEEN, 0.35);
  pen.stroke([{ x: SUB.capX, y: TOP }, { x: HULL_END, y: TOP }], 3.6 / zoom, INK, 1, true);
  pen.stroke([{ x: SUB.capX, y: BOTTOM }, { x: HULL_END, y: BOTTOM }], 3.6 / zoom, INK, 1, true);

  // The sail.
  const sg = ctx.createLinearGradient(SUB.sailX, TOP - SUB.sailH, SUB.sailX + SUB.sailW, TOP);
  sg.addColorStop(0, STEEL_LIGHT);
  sg.addColorStop(0.5, STEEL);
  sg.addColorStop(1, STEEL_DARK);
  ctx.save();
  pathOf(ctx, SAIL);
  ctx.fillStyle = sg;
  ctx.fill();
  ctx.restore();
  blotches(ctx, SAIL);
  pen.stroke([...SAIL], 3.6 / zoom, INK, 1, true);
  pen.hair([{ x: SUB.sailX + 60, y: TOP - SUB.sailH + 16 }, { x: SUB.sailX + SUB.sailW - 40, y: TOP - SUB.sailH + 16 }], 6 / zoom, SHEEN, 0.3);
  // A periscope and a mast, raised.
  pen.stroke([{ x: SUB.sailX + 90, y: TOP - SUB.sailH }, { x: SUB.sailX + 90, y: TOP - SUB.sailH - 70 }, { x: SUB.sailX + 112, y: TOP - SUB.sailH - 70 }], 8 / zoom, INK, 1, false);
  pen.stroke([{ x: SUB.sailX + 160, y: TOP - SUB.sailH }, { x: SUB.sailX + 160, y: TOP - SUB.sailH - 46 }], 6 / zoom, INK, 1, false);
  // Rows of rivets down the sail.
  for (let y = TOP - SUB.sailH + 40; y < TOP - 10; y += 36) pen.hair([{ x: SUB.sailX + 40, y }, { x: SUB.sailX + SUB.sailW - 30, y: y + 1 }], 1.2 / zoom, '#0a0f10', 0.35);
  ctx.save();
  pathOf(ctx, PLANE);
  ctx.fillStyle = STEEL;
  ctx.fill();
  ctx.restore();
  pen.stroke([...PLANE, PLANE[0]!], 3 / zoom, INK, 1, false);
}

/** How a round hole at (x, y) on the dome is foreshortened: the way the surface turns away, and by how much. */
function foreshorten(x: number, y: number): { readonly angle: number; readonly squash: number } {
  const u = (x - SUB.capX) / SUB.capLen;
  const v = (y - SUB.axisY) / SUB.radius;
  const nz = Math.sqrt(Math.max(0.04, 1 - u * u - v * v));
  return { angle: Math.atan2(v / SUB.radius, u / SUB.capLen), squash: Math.min(1, nz * 1.1) };
}

/**
 * A round bite out of the rubber: a perfectly round hole, seen at the
 * surface's slant (`angle` the way it turns away, `squash` how much), its
 * cut wall showing pale on the far side.
 */
export function drawHole(ctx: CanvasRenderingContext2D, pen: Pen, c: Pt, r: number, angle: number, squash: number, ink: number): void {
  ctx.save();
  ctx.translate(c.x, c.y);
  ctx.rotate(angle);
  ctx.scale(squash, 1);
  // A faint dent round it, where the lips pressed.
  const dent = ctx.createRadialGradient(0, 0, r * 0.9, 0, 0, r * 1.6);
  dent.addColorStop(0, 'rgba(0,0,0,0.35)');
  dent.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = dent;
  ctx.fillRect(-r * 1.7, -r * 1.7, r * 3.4, r * 3.4);
  // The cut wall, then the dark inside.
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fillStyle = CUT_WALL;
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(r * 0.22, 0, r * 0.82, r * 0.9, 0, 0, Math.PI * 2);
  ctx.fillStyle = '#020304';
  ctx.fill();
  // The rim catching the light along its top.
  ctx.strokeStyle = 'rgba(200,220,224,0.45)';
  ctx.lineWidth = ink * 0.8;
  ctx.beginPath();
  ctx.arc(0, 0, r * 1.04, Math.PI * 1.05, Math.PI * 1.75);
  ctx.stroke();
  ctx.restore();
  // The ink round it, through the same slant.
  const ring = range(20, (u) => {
    const a = u * Math.PI * 2;
    const lx = r * Math.cos(a) * squash;
    const ly = r * Math.sin(a);
    return { x: c.x + lx * Math.cos(angle) - ly * Math.sin(angle), y: c.y + lx * Math.sin(angle) + ly * Math.cos(angle) };
  });
  pen.stroke(ring, ink, INK, 0.95, false);
}

/** A hole on the dome, at its place. */
export function drawDomeHole(ctx: CanvasRenderingContext2D, pen: Pen, x: number, y: number, r: number, zoom: number): void {
  const f = foreshorten(x, y);
  drawHole(ctx, pen, { x, y }, r, f.angle, f.squash, 3 / zoom);
}

/** The rubber dome at the bow, and the seam where it meets the steel. */
function drawDome(ctx: CanvasRenderingContext2D, pen: Pen, zoom: number): void {
  const shape = [...CAP];
  const g = ctx.createRadialGradient(SUB.capX - SUB.capLen * 0.5, SUB.axisY - SUB.radius * 0.62, 30, SUB.capX - SUB.capLen * 0.2, SUB.axisY, SUB.radius * 1.35);
  g.addColorStop(0, RUBBER_LIGHT);
  g.addColorStop(0.35, RUBBER);
  g.addColorStop(1, RUBBER_DARK);
  ctx.save();
  pathOf(ctx, shape);
  ctx.fillStyle = g;
  ctx.fill();
  ctx.restore();
  blotches(ctx, shape);
  // The rubber's fine grain, and hatching in its shadow underneath.
  pen.stipple(shape, 260, (_, y) => (y < SUB.axisY ? 0.5 : 0.25), 1.4 / Math.sqrt(zoom), '#5b6a72');
  const under = [{ x: SUB.capX - SUB.capLen, y: SUB.axisY + SUB.radius * 0.35 }, { x: SUB.capX, y: SUB.axisY + SUB.radius * 0.35 }, { x: SUB.capX, y: BOTTOM }, { x: SUB.capX - SUB.capLen, y: BOTTOM }];
  pen.clipped(shape, () => pen.hatch(under, 10, 0.9, 1.2 / zoom, { color: '#000', alpha: 0.4 }));
  // Light catching the upper curve of the dome.
  pen.hair(CAP.slice(4, 22).map((p) => ({ x: p.x + 16, y: p.y + 14 })), 9 / zoom, SHEEN, 0.32);
  pen.stroke([...CAP], 4 / zoom, INK, 1, true);
  // The seam ring: a strap of steel with its bolts.
  const strap = [{ x: SUB.capX - 12, y: TOP + 2 }, { x: SUB.capX + 14, y: TOP + 2 }, { x: SUB.capX + 14, y: BOTTOM - 2 }, { x: SUB.capX - 12, y: BOTTOM - 2 }];
  pen.fill(strap, '#39443f', 1);
  pen.stroke([strap[0]!, strap[3]!], 2.6 / zoom, INK, 0.9, false);
  pen.stroke([strap[1]!, strap[2]!], 2.6 / zoom, INK, 0.9, false);
  for (let y = TOP + 26; y < BOTTOM - 14; y += 34) {
    pen.dot(SUB.capX + 2, y + 2, 6, '#050707', 0.8);
    pen.dot(SUB.capX + 1, y, 5, '#77857f', 1);
  }
}

/** The whole submarine, with the round bites in its dome; `fresh` adds the one just made at `freshAt`. */
export function drawSubmarine(
  ctx: CanvasRenderingContext2D, boil: number, zoom: number, holes: readonly { readonly x: number; readonly y: number; readonly r: number }[],
): void {
  const pen = new Pen(ctx, 6113 + boil * 389, 1.3 / zoom);
  drawSteel(ctx, pen, zoom);
  drawDome(ctx, pen, zoom);
  for (const h of holes) drawDomeHole(ctx, pen, h.x, h.y, h.r, zoom);
}

/** A veil of water over the hull, thickening downwards, so it sits in the sea and the shark stands out. */
export function drawHaze(ctx: CanvasRenderingContext2D): void {
  const g = ctx.createLinearGradient(0, 0, 0, VIDEO.height);
  g.addColorStop(0, 'rgba(18,54,64,0.22)');
  g.addColorStop(1, 'rgba(2,8,12,0.4)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, VIDEO.width, VIDEO.height);
}

// ---------------------------------------------------------------- the close-up rubber

/** The size of the bite in the close-up (screen px). */
export const CLOSE_HOLE_R = 88;
/** How flat the rubber looks in the close-up: we look down at it at a slant. */
const CLOSE_SQUASH = 0.36;
const FAR_EDGE = 900;

/** The rubber of the dome up close, curving away at its far edge, with the bite in it once it's cut. */
export function drawCloseRubber(ctx: CanvasRenderingContext2D, boil: number, hole: number): void {
  const pen = new Pen(ctx, 7717 + boil * 271, 1.2);
  const edge = range(30, (u) => ({ x: -40 + u * (VIDEO.width + 80), y: FAR_EDGE + 70 * (2 * u - 1) ** 2 - 20 }));
  const shape = [...edge, { x: VIDEO.width + 40, y: VIDEO.height + 20 }, { x: -40, y: VIDEO.height + 20 }];
  const g = ctx.createLinearGradient(0, FAR_EDGE - 40, 0, VIDEO.height);
  g.addColorStop(0, RUBBER_LIGHT);
  g.addColorStop(0.12, RUBBER);
  g.addColorStop(1, RUBBER_DARK);
  ctx.save();
  pathOf(ctx, shape);
  ctx.fillStyle = g;
  ctx.fill();
  ctx.restore();
  pen.stipple(shape, 900, (_, y) => 0.55 - 0.3 * Math.min(1, (y - FAR_EDGE) / 700), 2.2, '#56656c');
  // Old healed bites further off, smaller with distance.
  for (const old of [{ x: 190, y: 980, r: 46 }, { x: 900, y: 1130, r: 66 }, { x: 850, y: 960, r: 38 }]) {
    drawHole(ctx, pen, old, old.r, Math.PI / 2, CLOSE_SQUASH, 2.4);
  }
  pen.hair(edge.map((p) => ({ x: p.x, y: p.y + 10 })), 8, SHEEN, 0.3);
  pen.stroke(edge, 4, INK, 1, true);
  if (hole > 0) drawHole(ctx, pen, CONTACT, CLOSE_HOLE_R, Math.PI / 2, CLOSE_SQUASH, 3.6);
}

/** The gold ring drawn round the bite as it's called "perfect", `sweep` of the way round. */
export function drawPerfectRing(ctx: CanvasRenderingContext2D, sweep: number, alpha: number, colour: string): void {
  if (sweep <= 0 || alpha <= 0) return;
  const rx = CLOSE_HOLE_R * 1.32;
  const ry = CLOSE_HOLE_R * 1.32 * CLOSE_SQUASH;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = colour;
  ctx.lineCap = 'round';
  ctx.lineWidth = 7;
  ctx.setLineDash([22, 14]);
  ctx.beginPath();
  // Round from the near side (the bottom), anticlockwise.
  ctx.ellipse(CONTACT.x, CONTACT.y, rx, ry, 0, Math.PI / 2, Math.PI / 2 + sweep * Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

/** The dimple the clamped lips pull in the rubber: a soft dark dent with light catching its far lip. */
export function drawDimple(ctx: CanvasRenderingContext2D, at: Pt, amount: number): void {
  if (amount <= 0) return;
  ctx.save();
  ctx.globalAlpha = amount;
  const g = ctx.createRadialGradient(at.x, at.y, 4, at.x, at.y, 62);
  g.addColorStop(0, 'rgba(0,0,0,0.75)');
  g.addColorStop(0.55, 'rgba(0,0,0,0.35)');
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.fillRect(at.x - 64, at.y - 64, 128, 128);
  ctx.strokeStyle = 'rgba(200,220,224,0.4)';
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  for (const r of [46, 58]) {
    ctx.beginPath();
    ctx.arc(at.x, at.y, r, 0.2, 1.5);
    ctx.stroke();
  }
  ctx.restore();
}
