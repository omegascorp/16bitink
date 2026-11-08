import type { Rng } from '../../logic/rng';
import { blob, body, castShadow, outline, polar, SHADOW } from '../groundKit';
import { capsule, closed, type Draw, pt, TAU } from '../kit';
import { MOSS, PAPER_FILL } from '../palette';
import type { Pt } from '../pen';
import { mix, rgba } from '../wash';
import { specks } from './farmGroundParts';
import { END_GRAIN, IRON, LICHEN, OAK, OAK_DARK, rectPts, STRAW, STRAW_DEEP, STRAW_LIT, strokes, WEATHERED, WEATHERED_DARK } from './farmKit';
import { rngAt, tallShadow } from './farmSolids';

/**
 * The farm's buildings from above, each filling its rect: the corn crib
 * (an open-topped slatted bin heaped with cobs under its tie beams) and the
 * hen coop (a shingled gable roof, its ridge along its length, the lit
 * slope towards the light); and the straw nests the hens lay in.
 */
const CORN = '#efc23e';
const CORN_LIT = '#f7dc7a';
const CORN_DEEP = '#c98a1e';
const CORN_RED = '#c8642a';
const SHINGLE = '#9b8a72';
const SHINGLE_DEEP = '#5e5444';

/** A square of end grain (a post's top): rings round its heart, a check, shade. */
function endGrain(d: Draw, quad: readonly Pt[], rng: Rng): void {
  const { pen } = d;
  const c = pt(quad.reduce((s, p) => s + p.x, 0) / quad.length, quad.reduce((s, p) => s + p.y, 0) / quad.length);
  body(d, quad, mix(END_GRAIN, OAK, rng() * 0.35), 0.85);
  const heart = pt(c.x + (rng() - 0.5) * 3, c.y + (rng() - 0.5) * 3);
  pen.clipped(quad, () => {
    for (const k of [0.3, 0.55, 0.8, 1.05]) pen.hair(closed(quad.map((p) => pt(heart.x + (p.x - c.x) * k, heart.y + (p.y - c.y) * k))), 0.4, OAK_DARK, 0.55);
    const a = rng() * TAU;
    pen.hair([heart, polar(heart, a, 7)], 0.8, OAK_DARK, 0.75);
  });
  pen.crescent(quad, pt(-SHADOW.x * 2.5, -SHADOW.y * 2.5), () => pen.fill(quad, OAK_DARK, 0.35));
  pen.stroke(outline(quad, 4), 1.1, d.ink, 0.95, false);
}

/** One timber along a rect: oak wash, grain along its length, its shade, an outline. */
function timber(d: Draw, quad: readonly Pt[], horizontal: boolean, rng: Rng, colour = OAK): void {
  const { pen } = d;
  const xs = quad.map((p) => p.x);
  const ys = quad.map((p) => p.y);
  const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  body(d, quad, mix(colour, '#a07a52', rng() * 0.4), 0.85);
  pen.clipped(quad, () => {
    for (let k = 0; k < 3; k++) {
      if (horizontal) {
        const gy = y0 + (y1 - y0) * (0.2 + k * 0.3) + (rng() - 0.5) * 2;
        pen.hair([pt(x0, gy), pt((x0 + x1) / 2, gy + (rng() - 0.5) * 1.5), pt(x1, gy)], 0.4, OAK_DARK, 0.5);
      } else {
        const gx = x0 + (x1 - x0) * (0.2 + k * 0.3) + (rng() - 0.5) * 2;
        pen.hair([pt(gx, y0), pt(gx + (rng() - 0.5) * 1.5, (y0 + y1) / 2), pt(gx, y1)], 0.4, OAK_DARK, 0.5);
      }
    }
  });
  pen.crescent(quad, pt(-SHADOW.x * 2.5, -SHADOW.y * 2.5), () => pen.fill(quad, OAK_DARK, 0.4));
  pen.stroke(outline(quad, 6), 1, d.ink, 0.9, false);
}

/** One corn cob lying at c along a, `len` long: a yellow ear in rows of kernels, a few red ones, its husk drawn back. */
function cob(d: Draw, c: Pt, a: number, len: number, rng: Rng, dim: number): void {
  const { pen } = d;
  const p0 = polar(c, a, -len / 2);
  const p1 = polar(c, a, len / 2);
  const wd = len * 0.5;
  const ear = capsule(p0, p1, wd, wd * 0.82);
  castShadow(d, ear, 3, 0.25);
  const tone = rng() < 0.12 ? CORN_RED : mix(CORN, CORN_DEEP, rng() * 0.35);
  body(d, ear, tone, 0.9);
  const dots: [number, number, number][] = [];
  const pits: [number, number, number][] = [];
  const n = pt(-Math.sin(a), Math.cos(a));
  for (let i = 1; i < len / 2.6; i++) {
    const q = polar(p0, a, i * 2.6);
    for (const s of [-0.3, 0, 0.3]) {
      const k = pt(q.x + n.x * s * wd * (1 - (i * 2.6) / len * 0.25), q.y + n.y * s * wd * (1 - (i * 2.6) / len * 0.25));
      dots.push([k.x - 0.3, k.y - 0.4, 0.55]);
      pits.push([k.x + 0.6, k.y + 0.7, 0.5]);
    }
  }
  specks(d, mix(tone, d.ink, 0.45), 0.5, pits);
  specks(d, CORN_LIT, 0.8, dots);
  pen.crescent(ear, pt(-SHADOW.x * wd * 0.3, -SHADOW.y * wd * 0.3), () => pen.fill(ear, mix(CORN_DEEP, d.ink, 0.3), 0.45));
  if (dim > 0) pen.fill(ear, d.ink, dim);
  pen.hair(closed(ear), 0.5, d.ink, 0.8);
}

/**
 * A corn crib filling x, y, w × h: a slatted bin of weathered boards on
 * heavy corner posts, open to the sky, heaped with cobs, mounded in the
 * middle; tie beams across the top throwing their shadows over the corn.
 */
export function cornCrib(d: Draw, x: number, y: number, w: number, h: number): void {
  const { pen } = d;
  const rng = rngAt(x, y, 6);
  const outer = rectPts(x, y, w, h);
  tallShadow(d, outer, 30, 0.4);
  const wall = 9;
  const ix = x + wall;
  const iy = y + wall;
  const iw = w - wall * 2;
  const ih = h - wall * 2;
  const inner = rectPts(ix, iy, iw, ih);
  // The heap: a deep, shaded floor, then cobs from the edges in, the middle ones the highest and lit.
  pen.fill(inner, mix(CORN_DEEP, OAK_DARK, 0.5), 0.9);
  pen.clipped(inner, () => {
    const cobs: [Pt, number][] = [];
    const count = Math.round((iw * ih) / 105);
    for (let k = 0; k < count; k++) cobs.push([pt(ix - 6 + rng() * (iw + 12), iy - 6 + rng() * (ih + 12)), rng() * TAU]);
    const height = (p: Pt): number => 1 - Math.max(Math.abs(p.x - (ix + iw / 2)) / (iw / 2), Math.abs(p.y - (iy + ih / 2)) / (ih / 2));
    cobs.sort((p, q) => height(p[0]) - height(q[0]));
    for (const [p, a] of cobs) cob(d, p, a, 16 + rng() * 5, rng, Math.max(0, 0.2 - height(p) * 0.35));
    // The walls' shade falls in across the corn from the light's side.
    const { ctx } = pen;
    for (const [gx0, gy0, gx1, gy1] of [[ix, iy, ix, iy + 36], [ix, iy, ix + 30, iy]] as const) {
      const g = ctx.createLinearGradient(gx0, gy0, gx1, gy1);
      g.addColorStop(0, rgba(d.ink, 0.5));
      g.addColorStop(0.35, rgba(d.ink, 0.2));
      g.addColorStop(1, rgba(d.ink, 0));
      ctx.save();
      ctx.fillStyle = g;
      ctx.fillRect(ix, iy, iw, ih);
      ctx.restore();
    }
  });
  // The slatted walls: the tops of upright laths, gaps between them.
  const slats = (x0: number, y0: number, x1: number, y1: number, horizontal: boolean): void => {
    const band = rectPts(x0, y0, x1 - x0, y1 - y0);
    body(d, band, mix(WEATHERED, '#b39c78', 0.5), 0.85);
    pen.clipped(band, () => {
      const len = horizontal ? x1 - x0 : y1 - y0;
      for (let s = 3; s < len; s += 6 + rng() * 1.5) {
        const a = horizontal ? pt(x0 + s, y0) : pt(x0, y0 + s);
        const b = horizontal ? pt(x0 + s, y1) : pt(x1, y0 + s);
        pen.stroke([a, b], 1.4, '#2c2218', 0.8, false);
        const m = horizontal ? pt(x0 + s + 3, (y0 + y1) / 2) : pt((x0 + x1) / 2, y0 + s + 3);
        pen.hair(horizontal ? [pt(m.x, y0 + 1.5), pt(m.x + (rng() - 0.5), y1 - 1.5)] : [pt(x0 + 1.5, m.y), pt(x1 - 1.5, m.y + (rng() - 0.5))], 0.4, WEATHERED_DARK, 0.45);
      }
    });
    pen.crescent(band, pt(-SHADOW.x * 2, -SHADOW.y * 2), () => pen.fill(band, WEATHERED_DARK, 0.35));
    pen.stroke(outline(band, 6), 0.9, d.ink, 0.9, false);
  };
  slats(x + 14, y, x + w - 14, y + wall, true);
  slats(x + 14, y + h - wall, x + w - 14, y + h, true);
  slats(x, y + 14, x + wall, y + h - 14, false);
  slats(x + w - wall, y + 14, x + w, y + h - 14, false);
  // Tie beams across the top, each with its shadow on the corn.
  const beams = w > h ? [x + w / 3, x + (2 * w) / 3] : [x + w / 2];
  for (const bx of beams) {
    const beam = rectPts(bx - 4, y + 2, 8, h - 4);
    pen.fill(beam.map((p) => pt(p.x + SHADOW.x * 14, p.y + SHADOW.y * 14)), d.ink, 0.3);
    timber(d, beam, false, rng);
    for (const by of [y + 6, y + h - 6]) pen.dot(bx, by, 1.2, IRON, 0.9);
  }
  // Heavy corner posts showing their end grain.
  for (const [cx, cy] of [[x, y], [x + w - 16, y], [x, y + h - 16], [x + w - 16, y + h - 16]] as const) endGrain(d, rectPts(cx, cy, 16, 16), rng);
  pen.stroke(outline(outer, 8), 1.4, d.ink, 0.95, false);
}

/** One slope of shingles: rows parallel to the ridge from it out to the eave (ridge at y0, eave at y1; either way up). */
function shingles(d: Draw, x0: number, x1: number, ridge: number, eave: number, lit: boolean, rng: Rng): void {
  const { pen } = d;
  const dir = Math.sign(eave - ridge);
  const slope = rectPts(x0, Math.min(ridge, eave), x1 - x0, Math.abs(eave - ridge));
  body(d, slope, mix(SHINGLE, lit ? '#c4a27a' : '#7d6a56', 0.5), 0.85);
  const rowH = 11;
  pen.clipped(slope, () => {
    let row = 0;
    for (let yy = ridge; dir > 0 ? yy < eave : yy > eave; yy += dir * rowH) {
      const ya = yy;
      const yb = yy + dir * rowH;
      let xx = x0 - (row % 2 ? 9 : 0) - rng() * 6;
      while (xx < x1) {
        const sw = 13 + rng() * 9;
        const quad = [pt(xx + 0.6, ya), pt(xx + sw - 0.6, ya), pt(xx + sw - 0.6, yb), pt(xx + 0.6, yb)];
        const tone = rng();
        if (tone < 0.35) pen.fill(quad, tone < 0.15 ? SHINGLE_DEEP : '#c9bda4', 0.18 + rng() * 0.15);
        // Each shingle's grain, running down the slope.
        if (rng() < 0.6) {
          const gx = xx + 3 + rng() * (sw - 6);
          pen.hair([pt(gx, ya + dir * 2), pt(gx + (rng() - 0.5), yb - dir * 2)], 0.35, SHINGLE_DEEP, 0.4);
        }
        pen.hair([pt(xx, ya + dir * 1), pt(xx + (rng() - 0.5), yb)], 0.55, d.ink, 0.55);
        xx += sw;
      }
      // The butt edge of the row: each row overlaps the next, its lower edge throws a thin shadow.
      const butt = Array.from({ length: Math.ceil((x1 - x0) / 20) + 1 }, (_, i) => pt(x0 + i * 20, yb + (rng() - 0.5) * 0.8));
      pen.stroke(butt.map((p) => pt(p.x, p.y + dir * 1.5)), 1.6, d.ink, lit ? 0.14 : 0.24, false);
      pen.stroke(butt, 0.7, d.ink, 0.7, false);
      row++;
    }
    // Moss and lichen where it stays damp, more on the shaded slope.
    for (let k = 0; k < (lit ? 3 : 7); k++) {
      const p = pt(x0 + rng() * (x1 - x0), ridge + dir * (0.3 + rng() * 0.7) * Math.abs(eave - ridge));
      const m = blob(p, 4 + rng() * 7, 3 + rng() * 4, rng, 0.35, 14);
      pen.fill(m, lit ? LICHEN : MOSS, 0.55);
      pen.stipple(m, 30, () => 0.7, 0.5, lit ? '#9a9450' : '#4f6e36');
    }
  });
  if (!lit) {
    pen.fill(slope, d.ink, 0.26);
    pen.hatch(slope, 3.2, 0.9, 0.45, { color: d.ink, alpha: 0.16 });
  } else pen.fill(slope, PAPER_FILL, 0.14);
}

/**
 * The hen coop's roof filling x, y, w × h: a gable with its ridge along
 * the length, the slope towards the light lit and the other in shade,
 * shingles in staggered rows, moss on the shady slope, a ridge board with
 * nails, barge boards at the gable ends, and the coop's tall shadow.
 */
export function coopRoof(d: Draw, x: number, y: number, w: number, h: number): void {
  const { pen } = d;
  const rng = rngAt(x, y, 7);
  const outer = rectPts(x, y, w, h);
  tallShadow(d, outer, 34, 0.42);
  const ridge = y + h * 0.48;
  const barge = 6;
  shingles(d, x + barge, x + w - barge, ridge, y, true, rng);
  shingles(d, x + barge, x + w - barge, ridge, y + h, false, rng);
  // Barge boards up the gable ends.
  for (const bx of [x, x + w - barge]) {
    for (const [ya, yb] of [[y, ridge], [ridge, y + h]] as const) timber(d, rectPts(bx, ya, barge, yb - ya), false, rng, WEATHERED);
  }
  // The ridge board, its shadow on the shaded slope, a nail every so often.
  const board = rectPts(x - 1, ridge - 4.5, w + 2, 9);
  pen.fill(board.map((p) => pt(p.x, p.y + 5)), d.ink, 0.22);
  timber(d, board, true, rng, mix(WEATHERED, OAK, 0.3));
  for (let bx = x + 14; bx < x + w - 8; bx += 26 + rng() * 6) pen.dot(bx, ridge + (rng() - 0.5), 0.9, IRON, 0.85);
  // A vent cap astride the ridge.
  const vx = x + w * (0.3 + rng() * 0.15);
  const cap = rectPts(vx - 13, ridge - 12, 26, 24);
  tallShadow(d, cap, 10, 0.3);
  timber(d, rectPts(vx - 13, ridge - 12, 26, 12), true, rng, WEATHERED);
  timber(d, rectPts(vx - 13, ridge, 26, 12), true, rng, mix(WEATHERED, WEATHERED_DARK, 0.5));
  pen.stroke(outline(cap, 6), 1, d.ink, 0.95, false);
  pen.stroke(outline(outer, 8), 1.5, d.ink, 0.95, false);
}

/** A hen's nest at c, about 44 × 34: a ragged ring of straw wound round a cupped hollow, stalks poking out of its rim, its shadow down-right. */
export function strawNest(d: Draw, c: Pt): void {
  const { pen } = d;
  const { ctx } = pen;
  const rng = rngAt(c.x, c.y, 8);
  const outer = blob(c, 21, 16, rng, 0.16, 32, (rng() - 0.5) * 0.5);
  const hollow = blob(pt(c.x + 0.8, c.y + 0.6), 12, 8.5, rng, 0.14, 22);
  castShadow(d, outer, 5, 0.24);
  body(d, outer, mix(STRAW, STRAW_DEEP, 0.15), 0.85);
  // Strands wound round the hollow, arcs following the ring, dark ones under, lit ones over.
  const wound = (colour: string, alpha: number, wd: number, n: number, lit: boolean): void => {
    ctx.save();
    ctx.lineCap = 'round';
    ctx.strokeStyle = rgba(colour, alpha);
    ctx.lineWidth = wd;
    ctx.beginPath();
    for (let k = 0; k < n; k++) {
      let a = rng() * TAU;
      if (lit && Math.cos(a - 3.99) < -0.2) a += Math.PI;
      const rr = 0.6 + rng() * 0.5;
      const span = 0.35 + rng() * 0.8;
      const lift = (rng() - 0.5) * 0.12;
      for (let i = 0; i <= 6; i++) {
        const t = a + (span * i) / 6;
        const k2 = rr + lift * (i / 6);
        const px = c.x + Math.cos(t) * 21 * k2;
        const py = c.y + Math.sin(t) * 16 * k2;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
    }
    ctx.stroke();
    ctx.restore();
  };
  pen.clipped(outer, () => {
    wound('#7d5e28', 0.55, 0.8, 40, false);
    wound(STRAW_DEEP, 0.75, 0.9, 60, false);
    wound(STRAW, 0.9, 0.9, 50, false);
    pen.crescent(outer, pt(-SHADOW.x * 5, -SHADOW.y * 5), () => pen.fill(outer, mix(STRAW_DEEP, d.ink, 0.35), 0.4));
    wound(STRAW_LIT, 0.95, 0.9, 50, true);
  });
  // Broken contour, then stalks poking out past it.
  const rim = closed(outer);
  for (let i = 0; i < rim.length - 2; i += 3) if (rng() < 0.65) pen.hair(rim.slice(i, i + 4), 0.6, d.ink, 0.55);
  for (let k = 0; k < 34; k++) {
    const a = rng() * TAU;
    const p = pt(c.x + Math.cos(a) * 19, c.y + Math.sin(a) * 14.5);
    const ang = a + Math.PI / 2 * (rng() < 0.5 ? 1 : -1) * (0.4 + rng() * 0.5);
    pen.hair([p, polar(p, ang, 4 + rng() * 6)], 0.6 + rng() * 0.3, rng() < 0.5 ? STRAW_DEEP : STRAW_LIT, 0.9);
  }
  // The hollow: pressed straw in shade, deepest under the near rim (its upper left), lit far side.
  pen.fill(hollow, mix(STRAW_DEEP, '#6b4f22', 0.45), 0.8);
  pen.clipped(hollow, () => {
    strokes(d, STRAW, 0.55, 0.7, 18, () => {
      const p = pt(c.x + (rng() - 0.5) * 20, c.y + (rng() - 0.5) * 14);
      return [p.x, p.y, rng() * TAU, 4 + rng() * 5, (rng() - 0.5) * 2];
    });
    pen.crescent(hollow, pt(SHADOW.x * 5, SHADOW.y * 5), () => pen.fill(hollow, d.ink, 0.35));
    pen.crescent(hollow, pt(-SHADOW.x * 3, -SHADOW.y * 3), () => pen.fill(hollow, STRAW_LIT, 0.35));
  });
  pen.hair(closed(hollow).slice(10, 23), 0.6, d.ink, 0.6);
}
