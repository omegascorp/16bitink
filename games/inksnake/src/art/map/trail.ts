import { closed, makeDraw, oval, pt, TAU } from '../kit';
import { PAPER_FILL } from '../palette';
import type { Pt } from '../pen';
import { mix, rgba } from '../wash';
import type { TrailLook } from './band';
import { blob } from './brush';
import { Blobs, type Geo, hash, LIGHT_DIR, NEST_R, PENCIL, SHADOW_DIR, seedOf, type Span, Ticks, TRAIL_HALF } from './common';

/**
 * The snake's worn trail the levels sit along: a soft track of bare earth
 * or sand a little sunk into the ground, pale where it's most worn, the bank
 * nearer the light in shade, grass leaning over its edges, and down its
 * middle the S-shaped trace a snake's belly leaves, with the little ridges
 * of sand it pushes up on the outside of each bend. Drafts get the same
 * trail in pencil. Fills are plain canvas strokes over the path indices a
 * chunk needs (identical wherever chunks overlap); pen lines are drawn in
 * fixed runs of RUN points, each with its own seed, so seams never show.
 */
const RUN = 32;
/** The S-trace: how far it swings either side of the middle, and the length of one full S, world px. */
const SWAY = 6.5;
const WAVE = 52;
/** Path samples are this far apart (logic/path STEP). */
const STEP = 4;

/** The path indices a chunk paints, within a stretch i0..i1. */
function visible(geo: Geo, span: Span, i0: number, i1: number): [number, number] {
  const [a, b] = geo.range(span.y0, span.y1, 70);
  return [Math.max(a, i0), Math.min(b, i1)];
}

function polyline(pts: readonly Pt[], a: number, b: number): Path2D {
  const p = new Path2D();
  for (let i = a; i <= b; i++) (i === a ? p.moveTo(pts[i]!.x, pts[i]!.y) : p.lineTo(pts[i]!.x, pts[i]!.y));
  return p;
}

const inNest = (nests: readonly Pt[], q: Pt, r: number): boolean => nests.some((c) => (c.x - q.x) ** 2 + (c.y - q.y) ** 2 < r * r);

/** A band hugging the edge whose bank faces `toward`, up to `depth` deep where it faces it squarely. */
function bankBand(ctx: CanvasRenderingContext2D, geo: Geo, a: number, b: number, toward: Pt, depth: number, colour: string, alpha: number): void {
  const { pts, nrm } = geo;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = colour;
  for (const side of [1, -1]) {
    const path = new Path2D();
    for (let i = a; i <= b; i++) {
      const n = nrm[i]!;
      const x = pts[i]!.x + n.x * side * TRAIL_HALF;
      const y = pts[i]!.y + n.y * side * TRAIL_HALF;
      (i === a ? path.moveTo(x, y) : path.lineTo(x, y));
    }
    for (let i = b; i >= a; i--) {
      const n = nrm[i]!;
      const f = Math.max(0, side * (n.x * toward.x + n.y * toward.y));
      const off = TRAIL_HALF - depth * f;
      path.lineTo(pts[i]!.x + n.x * side * off, pts[i]!.y + n.y * side * off);
    }
    path.closePath();
    ctx.fill(path);
  }
  ctx.restore();
}

/** The trail's edges in fixed pen runs, broken here and there and at each nest. */
function rims(ctx: CanvasRenderingContext2D, geo: Geo, span: Span, i0: number, i1: number, nests: readonly Pt[], o: { width: number; alpha: number; ink: string; salt: number; gaps: number }): void {
  const { pts, nrm } = geo;
  const [a, b] = visible(geo, span, i0, i1);
  for (let k = Math.floor(a / RUN); k * RUN <= b; k++) {
    const r0 = Math.max(i0, k * RUN);
    const r1 = Math.min(i1, (k + 1) * RUN + 2);
    if (r1 - r0 < 2) continue;
    for (const side of [1, -1]) {
      if (hash(k, side, o.salt) < o.gaps) continue;
      const { pen } = makeDraw(ctx, seedOf(o.salt, k, side), 0, 0);
      let run: Pt[] = [];
      let lit = 0;
      const flush = (): void => {
        // Heavier on the bank in shade, lighter where the light catches it.
        if (run.length > 2) pen.stroke(run, o.width * (lit > 0 ? 1.25 : 0.75), o.ink, o.alpha, false);
        run = [];
        lit = 0;
      };
      for (let i = r0; i <= r1 && i < pts.length; i++) {
        const n = nrm[i]!;
        const off = TRAIL_HALF + Math.sin(i * 0.11 + side) * 1.2 + Math.sin(i * 0.37) * 0.5;
        const q = pt(pts[i]!.x + n.x * side * off, pts[i]!.y + n.y * side * off);
        if (inNest(nests, q, NEST_R + 2)) {
          flush();
          continue;
        }
        run.push(q);
        lit += side * (n.x * LIGHT_DIR.x + n.y * LIGHT_DIR.y);
      }
      flush();
    }
  }
}

/** Where the S-trace runs at path index i: its offset along the normal. */
const sway = (i: number, phase: number, amp: number, wave: number): number => amp * Math.sin((TAU * i * STEP) / wave + phase);

/** The belly's S-trace (and an older, fainter one), in fixed runs; ridges pushed up on the outside of each bend. */
function trace(ctx: CanvasRenderingContext2D, geo: Geo, span: Span, i0: number, i1: number, nests: readonly Pt[], ink: string, alpha: number, painted: boolean, salt: number): void {
  const { pts, nrm } = geo;
  const [a, b] = visible(geo, span, i0, i1);
  const at = (i: number, off: number): Pt => pt(pts[i]!.x + nrm[i]!.x * off, pts[i]!.y + nrm[i]!.y * off);
  const tracks = [
    { amp: SWAY, wave: WAVE, phase: 0, w: painted ? 1.3 : 0.7, alpha },
    { amp: SWAY * 0.7, wave: WAVE * 0.82, phase: 2.1, w: painted ? 0.8 : 0.5, alpha: alpha * 0.45 },
  ];
  tracks.forEach((t, ti) => {
    for (let k = Math.floor(a / RUN); k * RUN <= b; k++) {
      const r0 = Math.max(i0, k * RUN);
      const r1 = Math.min(i1, (k + 1) * RUN + 1);
      if (r1 - r0 < 2 || hash(k, ti, salt + 3) < 0.08 * (ti + 1)) continue;
      const { pen } = makeDraw(ctx, seedOf(salt, k, ti), 0, 0);
      let run: Pt[] = [];
      const flush = (): void => {
        if (run.length > 2) pen.hair(run, t.w, ink, t.alpha);
        run = [];
      };
      for (let i = r0; i <= r1 && i < pts.length; i++) {
        const q = at(i, sway(i, t.phase, t.amp, t.wave));
        if (inNest(nests, q, NEST_R + 4)) flush();
        else run.push(q);
      }
      flush();
    }
  });
  if (!painted) return;
  // The ridges: at each crest of the main trace, a lit lip of sand just outside it and its shadow beyond.
  const lit = new Ticks();
  const dark = new Ticks();
  const per = WAVE / STEP;
  for (let i = Math.ceil(a / (per / 2)) * (per / 2); i <= b; i += per / 2) {
    const c = Math.round(i + per / 4);
    if (c < i0 + 3 || c > i1 - 3 || c >= pts.length - 3) continue;
    const s = Math.sign(Math.sin((TAU * c * STEP) / WAVE)) || 1;
    const q0 = at(c - 3, s * (SWAY + 2.2));
    const q1 = at(c, s * (SWAY + 3.6));
    const q2 = at(c + 3, s * (SWAY + 2.2));
    if (inNest(nests, q1, NEST_R + 6)) continue;
    lit.curve(q0.x, q0.y, q1.x, q1.y, q2.x, q2.y);
    const d0 = at(c - 2, s * (SWAY + 4.6));
    const d1 = at(c, s * (SWAY + 5.6));
    const d2 = at(c + 2, s * (SWAY + 4.6));
    dark.curve(d0.x, d0.y, d1.x, d1.y, d2.x, d2.y);
  }
  dark.stroke(ctx, ink, 0.7, alpha * 0.45);
  lit.stroke(ctx, PAPER_FILL, 1.6, 0.6);
}

/** Grass leaning over the trail's edges, and grit on its floor. */
function edgesAndGrit(ctx: CanvasRenderingContext2D, geo: Geo, a: number, b: number, look: TrailLook, nests: readonly Pt[]): void {
  const { pts, nrm } = geo;
  const grit = new Blobs();
  const blades = new Ticks();
  for (let i = a; i <= b; i++) {
    const p = pts[i]!;
    const n = nrm[i]!;
    if (i % 2 === 0) {
      const r = (hash(i, 1) - 0.5) * TRAIL_HALF * 1.6;
      const ang = hash(i, 2) * TAU;
      grit.add(p.x + n.x * r + Math.cos(ang) * 2, p.y + n.y * r + Math.sin(ang) * 2, 0.4 + hash(i, 3) * 0.7);
    }
    if (!look.fringe) continue;
    for (const side of [1, -1]) {
      if (hash(i, side, 7) > 0.42) continue;
      const off = TRAIL_HALF + 2 - hash(i, side, 8) * 5;
      const q = pt(p.x + n.x * side * off, p.y + n.y * side * off);
      if (inNest(nests, q, NEST_R + 3)) continue;
      const lean = 3 + hash(i, side, 9) * 5;
      const along = (hash(i, side, 10) - 0.5) * 6;
      blades.add(q.x, q.y, q.x - n.x * side * lean + (n.y * along), q.y - n.y * side * lean - n.x * along - 2);
    }
  }
  grit.fill(ctx, mix(look.bed, '#3a2c20', 0.45), 0.4);
  if (look.fringe) blades.stroke(ctx, look.fringe, 0.8, 0.7);
}

/** The painted trail over path indices i0..i1; nests (node centres) break its edges and trace. */
export function paintedTrail(ctx: CanvasRenderingContext2D, geo: Geo, span: Span, i0: number, i1: number, look: TrailLook, nests: readonly Pt[], salt: number): void {
  const [a, b] = visible(geo, span, i0, i1);
  if (b - a < 1) return;
  const path = polyline(geo.pts, a, b);
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  for (const [w, colour, alpha] of [
    [TRAIL_HALF * 2 + 18, look.bed, 0.1],
    [TRAIL_HALF * 2 + 4, look.bed, 0.3],
    [TRAIL_HALF * 2 - 4, look.bed, 0.32],
    [TRAIL_HALF * 0.9, PAPER_FILL, 0.16],
  ] as const) {
    ctx.lineWidth = w;
    ctx.strokeStyle = rgba(colour, alpha);
    ctx.stroke(path);
  }
  ctx.restore();
  bankBand(ctx, geo, a, b, LIGHT_DIR, 7, mix(look.bed, '#2b2118', 0.5), 0.2);
  bankBand(ctx, geo, a, b, SHADOW_DIR, 3, PAPER_FILL, 0.4);
  edgesAndGrit(ctx, geo, a, b, look, nests);
  trace(ctx, geo, span, i0, i1, nests, mix(look.mark, '#26316a', 0.25), 0.6, true, salt + 10);
  rims(ctx, geo, span, i0, i1, nests, { width: 0.8, alpha: 0.42, ink: '#26316a', salt: salt + 20, gaps: 0.22 });
}

/** The trail as a pencil draft: its edges sketched in runs that sometimes leave a gap, the S-trace, a little hatching on the shaded bank. */
export function pencilTrail(ctx: CanvasRenderingContext2D, geo: Geo, span: Span, i0: number, i1: number, nests: readonly Pt[], salt: number): void {
  const [a, b] = visible(geo, span, i0, i1);
  if (b - a < 1) return;
  rims(ctx, geo, span, i0, i1, nests, { width: 0.75, alpha: 0.6, ink: PENCIL, salt: salt + 30, gaps: 0.12 });
  trace(ctx, geo, span, i0, i1, nests, PENCIL, 0.55, false, salt + 40);
  const { pts, nrm } = geo;
  const hatch = new Ticks();
  for (let i = a + (a & 1); i <= b; i += 2) {
    for (const side of [1, -1]) {
      const n = nrm[i]!;
      if (side * (n.x * LIGHT_DIR.x + n.y * LIGHT_DIR.y) < 0.25) continue;
      const p = pts[i]!;
      const o = pt(p.x + n.x * side * (TRAIL_HALF - 0.5), p.y + n.y * side * (TRAIL_HALF - 0.5));
      if (inNest(nests, o, NEST_R + 1)) continue;
      const l = 3.5 + hash(i, side, 31) * 3;
      hatch.add(o.x, o.y, o.x - n.x * side * l + 1.5, o.y - n.y * side * l + 1.5);
    }
  }
  hatch.stroke(ctx, PENCIL, 0.5, 0.32);
}

/**
 * A painted nest at a level: a ragged ring of `look.nest` material wound
 * round a cupped hollow the game's egg sits in, stalks poking out past its
 * rim, its shadow thrown down-right.
 */
export function paintedNest(ctx: CanvasRenderingContext2D, c: Pt, look: TrailLook, seed: number): void {
  const d = makeDraw(ctx, seed, 0, 0);
  const { pen } = d;
  const rng = pen.rng;
  const [mid, deep, lit] = look.nest;
  const outer = blob(c, NEST_R, NEST_R * 0.82, rng, 0.14, 32, (rng() - 0.5) * 0.5);
  const hollow = blob(pt(c.x + 1, c.y + 0.8), NEST_R * 0.62, NEST_R * 0.46, rng, 0.12, 24);
  pen.fill(outer.map((p) => pt(p.x + 4, p.y + 6)), d.ink, 0.2);
  pen.fill(outer, PAPER_FILL, 1);
  pen.fill(outer, mix(mid, deep, 0.15), 0.85);
  const wound = (colour: string, alpha: number, w: number, n: number, litSide: boolean): void => {
    const t = new Ticks();
    for (let k = 0; k < n; k++) {
      let a0 = rng() * TAU;
      if (litSide && Math.cos(a0 - 3.99) < -0.2) a0 += Math.PI;
      const rr = 0.62 + rng() * 0.42;
      const arcLen = 0.35 + rng() * 0.8;
      const p0 = pt(c.x + Math.cos(a0) * NEST_R * rr, c.y + Math.sin(a0) * NEST_R * 0.82 * rr);
      const am = a0 + arcLen / 2;
      const pm = pt(c.x + Math.cos(am) * NEST_R * (rr + 0.08), c.y + Math.sin(am) * NEST_R * 0.82 * (rr + 0.08));
      const a1 = a0 + arcLen;
      const r1 = rr + (rng() - 0.5) * 0.12;
      t.curve(p0.x, p0.y, pm.x, pm.y, c.x + Math.cos(a1) * NEST_R * r1, c.y + Math.sin(a1) * NEST_R * 0.82 * r1);
    }
    t.stroke(ctx, colour, w, alpha);
  };
  pen.clipped(outer, () => {
    wound(mix(deep, '#3a2a14', 0.4), 0.55, 0.9, 50, false);
    wound(deep, 0.75, 1, 70, false);
    wound(mid, 0.9, 1, 60, false);
    pen.crescent(outer, pt(-SHADOW_DIR.x * 6, -SHADOW_DIR.y * 6), () => pen.fill(outer, mix(deep, d.ink, 0.35), 0.4));
    wound(lit, 0.95, 1, 60, true);
  });
  const rim = closed(outer);
  for (let i = 0; i < rim.length - 2; i += 3) if (rng() < 0.65) pen.hair(rim.slice(i, i + 4), 0.7, d.ink, 0.55);
  const stalks = new Ticks();
  for (let k = 0; k < 40; k++) {
    const a = rng() * TAU;
    const p = pt(c.x + Math.cos(a) * NEST_R * 0.92, c.y + Math.sin(a) * NEST_R * 0.76);
    const ang = a + (Math.PI / 2) * (rng() < 0.5 ? 1 : -1) * (0.4 + rng() * 0.5);
    const l = 5 + rng() * 7;
    stalks.add(p.x, p.y, p.x + Math.cos(ang) * l, p.y + Math.sin(ang) * l);
  }
  stalks.stroke(ctx, deep, 0.8, 0.85);
  pen.fill(hollow, mix(deep, '#5b4220', 0.45), 0.8);
  pen.clipped(hollow, () => {
    pen.crescent(hollow, pt(SHADOW_DIR.x * 6, SHADOW_DIR.y * 6), () => pen.fill(hollow, d.ink, 0.35));
    pen.crescent(hollow, pt(-SHADOW_DIR.x * 4, -SHADOW_DIR.y * 4), () => pen.fill(hollow, lit, 0.35));
  });
  pen.hair(closed(hollow).slice(10, 24), 0.7, d.ink, 0.6);
}

/** A nest in pencil: its ring traced and traced again, strands sketched round it, the hollow hatched. */
export function pencilNest(ctx: CanvasRenderingContext2D, c: Pt, seed: number): void {
  const { pen } = makeDraw(ctx, seed, 0, 0);
  const rng = pen.rng;
  const outer = oval(c.x, c.y, NEST_R, NEST_R * 0.82, 32);
  pen.fill(outer, PAPER_FILL, 0.55);
  pen.stroke(closed(outer), 0.8, PENCIL, 0.65);
  pen.hair(closed(oval(c.x + 0.8, c.y - 0.6, NEST_R - 1.5, NEST_R * 0.82 - 1.5, 30)), 0.45, PENCIL, 0.3);
  const t = new Ticks();
  for (let k = 0; k < 26; k++) {
    const a0 = rng() * TAU;
    const rr = 0.7 + rng() * 0.3;
    const a1 = a0 + 0.4 + rng() * 0.6;
    const am = (a0 + a1) / 2;
    t.curve(c.x + Math.cos(a0) * NEST_R * rr, c.y + Math.sin(a0) * NEST_R * 0.82 * rr, c.x + Math.cos(am) * NEST_R * (rr + 0.1), c.y + Math.sin(am) * NEST_R * 0.82 * (rr + 0.1), c.x + Math.cos(a1) * NEST_R * rr, c.y + Math.sin(a1) * NEST_R * 0.82 * rr);
  }
  t.stroke(ctx, PENCIL, 0.5, 0.4);
  const hollow = oval(c.x, c.y, NEST_R * 0.6, NEST_R * 0.45, 24);
  pen.crescent(hollow, pt(5, 7), () => pen.hatch(hollow, 3, 0.9, 0.4, { color: PENCIL, alpha: 0.3 }));
  pen.hair(closed(hollow).slice(8, 22), 0.5, PENCIL, 0.5);
}
