import { createRng, type Rng } from '../logic/rng';
import { closed, type Draw, makeDraw, oval, pt, ribbon, TAU } from './kit';
import { LEAF, MOSS, PAPER_FILL, STONE, STONE_DARK } from './palette';
import { makeCanvas, type Pt } from './pen';
import { mix, rgba } from './wash';

/**
 * Covers over a stretch of groove in the garden and on the pond, drawn on a
 * transparent layer above the marbles: a mossy hollow log on a nearly
 * straight stretch, a stone-slab footbridge built along a curve. Both fully
 * cover a band wider than the groove, ends included, and darken the groove
 * just outside each end so the marbles visibly roll into the shade beneath.
 * Also the shared pieces the other places' covers are built from, and the
 * raised deck that carries a groove over a crossing (paintRaised).
 */
const BARK = '#87684a';
const CUT_WOOD = '#dcc49b';
const HOLLOW = '#1d1f2b';
const SHADOW = pt(0.55, 0.84);
/** Furthest the centre line may stray from the straight line between its ends for a log to cover it. */
const LOG_MAX_BOW = 9;
/** Margin of cover either side of the groove, beyond the six the brief asks for. */
const SPARE = 5;

/** Unit vector from a to b. */
export const unit = (a: Pt, b: Pt): Pt => {
  const l = Math.hypot(b.x - a.x, b.y - a.y) || 1;
  return pt((b.x - a.x) / l, (b.y - a.y) / l);
};

/** Shade on the groove floor just outside an end, deepest at the mouth: the dark under the cover. */
export function mouth(d: Draw, end: Pt, out: Pt, grooveW: number): void {
  const { ctx } = d.pen;
  const len = 30;
  const n = pt(-out.y, out.x);
  const hw = grooveW / 2;
  const quad = [pt(end.x + n.x * hw, end.y + n.y * hw), pt(end.x + n.x * hw + out.x * len, end.y + n.y * hw + out.y * len), pt(end.x - n.x * hw + out.x * len, end.y - n.y * hw + out.y * len), pt(end.x - n.x * hw, end.y - n.y * hw)];
  const g = ctx.createLinearGradient(end.x, end.y, end.x + out.x * len, end.y + out.y * len);
  g.addColorStop(0, rgba(HOLLOW, 0.8));
  g.addColorStop(0.3, rgba(HOLLOW, 0.5));
  g.addColorStop(1, rgba(HOLLOW, 0));
  ctx.save();
  ctx.fillStyle = g;
  ctx.beginPath();
  quad.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

/** Half the width a cover must span over a groove grooveW wide. */
export const coverHalf = (grooveW: number): number => grooveW / 2 + 6 + SPARE;

/** The dark under each end of a cover over `pts`, on the groove just outside it. */
export function coverEnds(d: Draw, pts: readonly Pt[], grooveW: number): void {
  const near = Math.min(3, pts.length - 1);
  mouth(d, pts[0]!, unit(pts[near]!, pts[0]!), grooveW);
  mouth(d, pts[pts.length - 1]!, unit(pts[pts.length - 1 - near]!, pts[pts.length - 1]!), grooveW);
}

/** An ellipse with radius ra along unit vector u and rb across it. */
export function tilted(c: Pt, u: Pt, ra: number, rb: number, n = 22): Pt[] {
  return Array.from({ length: n }, (_, i) => {
    const t = (i / n) * TAU;
    return pt(c.x + u.x * Math.cos(t) * ra - u.y * Math.sin(t) * rb, c.y + u.y * Math.cos(t) * ra + u.x * Math.sin(t) * rb);
  });
}

/** Moss cushions and a stipple of spores over part of a shape. */
export function mossOver(d: Draw, shape: readonly Pt[], centres: readonly Pt[], spread: number, rng: Rng): void {
  const { pen } = d;
  pen.clipped(shape, () => {
    for (const c of centres) {
      const base = Array.from({ length: 18 }, (_, k) => {
        const a = (k / 18) * TAU;
        const r = spread * (0.75 + 0.25 * Math.sin(a * 3 + c.x) + 0.12 * Math.sin(a * 7 + c.y));
        return pt(c.x + Math.cos(a) * r, c.y + Math.sin(a) * r * 0.7);
      });
      pen.fill(base.map((p) => pt(p.x + 1, p.y + 1.6)), d.ink, 0.12);
      pen.fill(base, MOSS, 0.55);
      for (let k = 0; k < 34; k++) {
        const a = rng() * TAU;
        const r = Math.sqrt(rng()) * spread;
        const s = 1.2 + rng() * 2.2;
        pen.fill(oval(c.x + Math.cos(a) * r, c.y + Math.sin(a) * r * 0.7, s, s * 0.8, 8), rng() < 0.4 ? LEAF : '#b9cc78', 0.55);
      }
      pen.hair(closed(base), 0.45, mix(LEAF, d.ink, 0.5), 0.5);
      pen.stipple(oval(c.x, c.y, spread, spread * 0.7, 14), 40, () => 0.7, 0.5, mix(LEAF, d.ink, 0.4));
    }
  });
}

/** A hollow log laid along a nearly straight stretch, from a to b, `half` wide either side. */
export function hollowLog(d: Draw, a: Pt, b: Pt, half: number, rng: Rng): void {
  const { pen } = d;
  const u = unit(a, b);
  const len = Math.hypot(b.x - a.x, b.y - a.y);
  const n = Math.max(6, Math.ceil(len / 8));
  const spine = Array.from({ length: n + 1 }, (_, i) => pt(a.x + (b.x - a.x) * (i / n), a.y + (b.y - a.y) * (i / n)));
  const knots = [0.3 + rng() * 0.15, 0.62 + rng() * 0.2];
  const girth = (t: number): number => 2 * half + Math.sin(t * len * 0.05 + 1) * 1.2 + knots.reduce((s, k) => s + 3 * Math.exp(-((((t - k) * len) / 9) ** 2)), 0);
  const body = ribbon(spine, girth);
  pen.fill(body.shape.map((p) => pt(p.x + SHADOW.x * 9, p.y + SHADOW.y * 9)), d.ink, 0.17);
  pen.fill(body.shape, PAPER_FILL, 1);
  pen.fill(body.shape, BARK, 0.62);
  pen.clipped(body.shape, () => {
    // Darker runs in the bark, then the splits along the grain.
    for (let i = 0; i < len / 22; i++) {
      const t0 = rng();
      const off = (rng() - 0.5) * 2 * half * 0.85;
      const l = 30 + rng() * 60;
      const p0 = pt(a.x + (b.x - a.x) * t0 - u.y * off, a.y + (b.y - a.y) * t0 + u.x * off);
      pen.stroke([p0, pt(p0.x + u.x * l, p0.y + u.y * l)], 3 + rng() * 5, mix(BARK, d.ink, 0.4), 0.18, false);
    }
    for (let i = 0; i < len / 6; i++) {
      const t0 = rng();
      const t1 = Math.min(1, t0 + (14 + rng() * 34) / len);
      const off = (rng() - 0.5) * 2 * half * 0.9;
      const p0 = pt(a.x + (b.x - a.x) * t0 - u.y * off, a.y + (b.y - a.y) * t0 + u.x * off);
      const p1 = pt(a.x + (b.x - a.x) * t1 - u.y * off, a.y + (b.y - a.y) * t1 + u.x * off);
      pen.hair([p0, pt((p0.x + p1.x) / 2 + (rng() - 0.5), (p0.y + p1.y) / 2 + (rng() - 0.5)), p1], 0.5, d.ink, 0.38);
    }
    // The rounded top catches the light along the side towards it.
    const lit = SHADOW.x * -u.y + SHADOW.y * u.x < 0 ? 1 : -1;
    pen.stroke(spine.map((p) => pt(p.x - u.y * lit * half * 0.45, p.y + u.x * lit * half * 0.45)), half * 0.5, PAPER_FILL, 0.18, false);
  });
  // Round in section: the long side turned from the light in shadow, hatched at its darkest.
  const side = -u.y * SHADOW.x + u.x * SHADOW.y > 0 ? 1 : -1;
  const away = (k: number): Pt => pt(u.y * side * half * k, -u.x * side * half * k);
  pen.crescent(body.shape, away(0.75), () => pen.fill(body.shape, mix(BARK, d.ink, 0.5), 0.4));
  pen.crescent(body.shape, away(0.45), () => pen.hatch(body.shape, 2.6, Math.atan2(u.y, u.x) + 1.2, 0.5, { color: d.ink, alpha: 0.4 }));
  pen.crescent(body.shape, away(0.22), () => pen.hatch(body.shape, 2.8, Math.atan2(u.y, u.x) - 1.1, 0.45, { color: d.ink, alpha: 0.35 }));
  // Moss over the top, and a few fallen leaves of ivy.
  const patches = Math.max(2, Math.round(len / 70));
  const centres = Array.from({ length: patches }, (_, i) => {
    const t = (i + 0.5 + (rng() - 0.5) * 0.4) / patches;
    return pt(a.x + (b.x - a.x) * t - u.y * (rng() - 0.6) * half * 0.6, a.y + (b.y - a.y) * t + u.x * (rng() - 0.6) * half * 0.6);
  });
  mossOver(d, body.shape, centres, half * 0.55, rng);
  for (const k of knots) {
    const c = pt(a.x + (b.x - a.x) * k + u.y * half * 0.3, a.y + (b.y - a.y) * k - u.x * half * 0.3);
    const knot = tilted(c, u, 8, 2.8, 16);
    pen.fill(knot, mix(BARK, d.ink, 0.45), 0.5);
    pen.hair(closed(knot), 0.6, d.ink, 0.75);
    pen.hair(closed(tilted(c, u, 3.6, 1.1, 10)), 0.45, d.ink, 0.7);
  }
  // The cut ends, each opening on the dark hollow the marbles roll into.
  for (const [p, t] of [[spine[0]!, 0], [spine[n]!, 1]] as const) {
    const r = girth(t) / 2;
    const end = tilted(p, u, 6, r, 26);
    pen.fill(end, CUT_WOOD, 1);
    pen.hair(closed(tilted(p, u, 4.6, r - 3.5, 22)), 0.45, d.ink, 0.45);
    const hole = tilted(p, u, 3.4, r - 7, 22);
    pen.fill(hole, HOLLOW, 0.92);
    pen.stroke(closed(hole), 0.8, d.ink, 0.9, false);
    pen.stroke(closed(end), 1, d.ink, 0.9, false);
  }
  pen.stroke(body.top, 1.3, d.ink, 0.9);
  pen.stroke(body.bot, 1.3, d.ink, 0.9);
}

/** One dressed stone: a quad inset by `gap`, corners worn, washed, shaded and outlined. */
export function block(d: Draw, quad: readonly Pt[], rng: Rng, gap = 1.2): void {
  const { pen } = d;
  const c = pt(quad.reduce((s, p) => s + p.x, 0) / quad.length, quad.reduce((s, p) => s + p.y, 0) / quad.length);
  const shape = quad.map((p) => {
    const l = Math.hypot(p.x - c.x, p.y - c.y) || 1;
    const k = Math.max(0.2, (l - gap) / l);
    return pt(c.x + (p.x - c.x) * k, c.y + (p.y - c.y) * k);
  });
  const worn = shape.flatMap((p, i) => {
    const q = shape[(i + 1) % shape.length]!;
    const t = Math.min(0.3, 3 / (Math.hypot(q.x - p.x, q.y - p.y) || 1));
    return [pt(p.x + (q.x - p.x) * t, p.y + (q.y - p.y) * t), pt(p.x + (q.x - p.x) * (1 - t), p.y + (q.y - p.y) * (1 - t))];
  });
  pen.fill(worn, PAPER_FILL, 1);
  pen.fill(worn, mix(rng() < 0.5 ? STONE : '#c7c9b8', STONE_DARK, rng() * 0.35), 0.62);
  pen.clipped(worn, () => {
    pen.stipple(worn, 30, () => 0.6, 0.45, STONE_DARK);
    pen.fill(oval(c.x + (rng() - 0.5) * 8, c.y + (rng() - 0.5) * 8, 4 + rng() * 6, 3 + rng() * 4, 12), STONE_DARK, 0.12);
  });
  pen.crescent(worn, pt(-1.8, -2.6), () => pen.fill(worn, STONE_DARK, 0.4));
  pen.stroke(closed(worn), 0.85, d.ink, 0.85, false);
}

/** A little stone footbridge built along a curving stretch: slabs fanned across it between kerbs, moss and grass in the joints. */
function footbridge(d: Draw, pts: readonly Pt[], half: number, rng: Rng): void {
  const { pen } = d;
  const KERB = 10;
  const deck = ribbon(pts, () => half * 2);
  const inner = ribbon(pts, () => (half - KERB) * 2);
  const last = pts.length - 1;
  pen.fill(deck.shape.map((p) => pt(p.x + SHADOW.x * 10, p.y + SHADOW.y * 10)), d.ink, 0.2);
  pen.fill(deck.shape, PAPER_FILL, 1);
  pen.fill(deck.shape, mix(STONE_DARK, MOSS, 0.35), 0.75);
  // The deck: slabs laid across, fanning round the curve.
  for (let i = 0; i < last; ) {
    let j = Math.min(last, i + 4 + Math.floor(rng() * 2));
    if (last - j < 3) j = last;
    block(d, [inner.top[i]!, inner.top[j]!, inner.bot[j]!, inner.bot[i]!], rng, 1.3);
    i = j;
  }
  // Kerb stones along both edges.
  for (const [outer, edge] of [[deck.top, inner.top], [deck.bot, inner.bot]] as const) {
    for (let i = 0; i < last; ) {
      let j = Math.min(last, i + 6 + Math.floor(rng() * 4));
      if (last - j < 4) j = last;
      block(d, [outer[i]!, outer[j]!, edge[j]!, edge[i]!], rng, 1.1);
      i = j;
    }
  }
  // Rounded over the arch: a pale crown, the edges falling away darker, hatched on the shadow side.
  pen.clipped(deck.shape, () => {
    const { ctx } = pen;
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    const line = (ps: readonly Pt[], wd: number, colour: string): void => {
      ctx.lineWidth = wd;
      ctx.strokeStyle = colour;
      ctx.beginPath();
      ps.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
      ctx.stroke();
    };
    line(deck.top, half * 0.5, rgba(d.ink, 0.1));
    line(deck.bot, half * 0.5, rgba(d.ink, 0.1));
    line(pts, half * 0.5, rgba(PAPER_FILL, 0.22));
    ctx.restore();
  });
  pen.crescent(deck.shape, pt(-SHADOW.x * 12, -SHADOW.y * 12), () => pen.hatch(deck.shape, 3, 0.9, 0.45, { color: d.ink, alpha: 0.3 }));
  // Moss cushions on the kerbs and grass in the joints.
  for (let i = 2; i < last - 1; i += 5 + Math.floor(rng() * 6)) {
    const edge = rng() < 0.5 ? deck.top : deck.bot;
    const inn = edge === deck.top ? inner.top : inner.bot;
    const c = pt((edge[i]!.x + inn[i]!.x) / 2, (edge[i]!.y + inn[i]!.y) / 2);
    mossOver(d, deck.shape, [c], 4 + rng() * 5, rng);
    if (rng() < 0.3) mossOver(d, deck.shape, [pts[i]!], 3 + rng() * 3, rng);
  }
  for (const line of [inner.top, inner.bot]) {
    for (let i = 2; i < last - 1; i += 3 + Math.floor(rng() * 4)) {
      const c = line[i]!;
      for (let k = 0; k < 3; k++) {
        const a = rng() * TAU;
        const l = 3 + rng() * 4;
        pen.hair([c, pt(c.x + Math.cos(a) * l * 0.5 + 0.6, c.y + Math.sin(a) * l * 0.5), pt(c.x + Math.cos(a) * l, c.y + Math.sin(a) * l)], 0.5, mix(LEAF, d.ink, 0.35), 0.65);
      }
    }
  }
  pen.stroke(deck.top, 1.2, d.ink, 0.9);
  pen.stroke(deck.bot, 1.2, d.ink, 0.9);
  // A headwall across each end: the arch's crown, over the dark under it.
  for (const [i, j] of [[0, 3], [pts.length - 1, pts.length - 4]] as const) {
    const t = deck.top[i]!;
    const b = deck.bot[i]!;
    const inward = unit(pts[i]!, pts[Math.max(0, Math.min(pts.length - 1, j))]!);
    const across = unit(t, b);
    const wing = 8;
    const from = pt(t.x - across.x * wing, t.y - across.y * wing);
    const to = pt(b.x + across.x * wing, b.y + across.y * wing);
    const count = 5;
    for (let k = 0; k < count; k++) {
      const s0 = k / count;
      const s1 = (k + 1) / count;
      const o0 = pt(from.x + (to.x - from.x) * s0, from.y + (to.y - from.y) * s0);
      const o1 = pt(from.x + (to.x - from.x) * s1, from.y + (to.y - from.y) * s1);
      const depth = 14 + Math.sin((Math.PI * (s0 + s1)) / 2) * 4;
      block(d, [o0, o1, pt(o1.x + inward.x * depth, o1.y + inward.y * depth), pt(o0.x + inward.x * depth, o0.y + inward.y * depth)], rng);
    }
    pen.stroke([pt(from.x - inward.x * 0.5, from.y - inward.y * 0.5), pt(to.x - inward.x * 0.5, to.y - inward.y * 0.5)], 1.4, d.ink, 0.95);
  }
}

/**
 * A cover over the stretch of groove `pts` (its centre line, every ~4
 * units): a hollow log if the stretch is nearly straight, else a stone
 * footbridge along it. Fully covers a band grooveW + 12 + 2·SPARE wide.
 */
export function paintTunnel(d: Draw, pts: readonly Pt[], grooveW: number): void {
  if (pts.length < 2) return;
  const rng = createRng(Math.round(pts[0]!.x * 13 + pts[0]!.y * 7 + pts.length));
  const a = pts[0]!;
  const b = pts[pts.length - 1]!;
  const u = unit(a, b);
  const bow = pts.reduce((m, p) => Math.max(m, Math.abs((p.x - a.x) * -u.y + (p.y - a.y) * u.x)), 0);
  const half = coverHalf(grooveW);
  coverEnds(d, pts, grooveW);
  if (bow <= LOG_MAX_BOW) hollowLog(d, a, b, half + bow, rng);
  else footbridge(d, pts, half + 2, rng);
}

/** Paints a place's deck (structure either side of the groove) along `pts`, `half` wide either side of the centre line. */
export type DeckPainter = (d: Draw, pts: readonly Pt[], half: number, grooveW: number, rng: Rng) => void;
/** Paints a groove along a centre line (drawTrack). */
export type GroovePainter = (d: Draw, pts: readonly Pt[]) => void;

/** Width of a deck's parapet either side of the groove, and how long the groove fades into the ground at each end. */
export const PARAPET = 10;
const FADE = 16;

/**
 * A raised stretch of groove carried over a cover below: the deck's shadow,
 * the place's deck structure between its end posts, then the groove itself
 * on a bed, fading out at both ends into the same groove on the ground.
 */
export function paintRaised(d: Draw, pts: readonly Pt[], grooveW: number, deck: DeckPainter, groove: GroovePainter, bed: string): void {
  if (pts.length < 4) return;
  const { ctx } = d.pen;
  const rng = createRng(Math.round(pts[0]!.x * 11 + pts[0]!.y * 5 + pts.length));
  const cum = [0];
  for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1]! + Math.hypot(pts[i]!.x - pts[i - 1]!.x, pts[i]!.y - pts[i - 1]!.y));
  const len = cum[cum.length - 1]!;
  const inner = pts.filter((_, i) => cum[i]! >= FADE && cum[i]! <= len - FADE);
  const half = grooveW / 2 + PARAPET;
  if (inner.length >= 3) {
    const shadow = ribbon(inner, () => half * 2 + 2).shape;
    d.pen.fill(shadow.map((p) => pt(p.x + SHADOW.x * 12, p.y + SHADOW.y * 12)), d.ink, 0.16);
    d.pen.fill(shadow.map((p) => pt(p.x + SHADOW.x * 6, p.y + SHADOW.y * 6)), d.ink, 0.1);
    deck(d, inner, half, grooveW, rng);
  }
  // The groove on its bed, on a layer of its own so its ends can fade into the ground.
  const { canvas: off, ctx: oc } = makeCanvas(ctx.canvas.width, ctx.canvas.height);
  oc.setTransform(ctx.getTransform());
  const od = makeDraw(oc, Math.round(rng() * 1e6), d.f, d.g, d.ink);
  od.pen.fill(ribbon(pts, () => grooveW + 1).shape, PAPER_FILL, 1);
  od.pen.fill(ribbon(pts, () => grooveW + 1).shape, bed, 0.5);
  groove(od, pts);
  const a = pts[0]!;
  const b = pts[pts.length - 1]!;
  const g = oc.createLinearGradient(a.x, a.y, b.x, b.y);
  const chord = Math.hypot(b.x - a.x, b.y - a.y) || 1;
  const f = Math.min(0.45, FADE / chord);
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(f, 'rgba(0,0,0,1)');
  g.addColorStop(1 - f, 'rgba(0,0,0,1)');
  g.addColorStop(1, 'rgba(0,0,0,0)');
  oc.globalCompositeOperation = 'destination-in';
  oc.fillStyle = g;
  oc.fillRect(Math.min(a.x, b.x) - 400, Math.min(a.y, b.y) - 400, Math.abs(b.x - a.x) + 800, Math.abs(b.y - a.y) + 800);
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.drawImage(off, 0, 0);
  ctx.restore();
}
