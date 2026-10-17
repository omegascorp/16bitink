import { hash } from '../../logic/noise';
import { capsule, cub, oval, pt, ribbon, type Draw } from '../kit';
import { blurs, dab, gleam, glow, LIGHT, mix, paint, SHADOW } from '../paint';
import { PAPER_FILL } from '../palette';
import { pathOf, type Pt } from '../pen';
import { spiral, TIDE } from './style';

/**
 * The Tidesingers (spec, "The Tidesingers"): Brine's ocean people, shaped
 * like manta rays. A broad flat body flying on two wide, sickle-swept wings;
 * two long lobes at the front that roll up like horns as they swim and
 * unroll into hands, three fine digits at each tip; eyes on the wings'
 * leading edges by the head; a long thin tail. Deep blue-violet above with
 * pale chevrons on the shoulders, pale beneath, soft bioluminescent spots
 * along the wing edges. They sing through a slit in the throat.
 *
 * The body is modelled as a curved sheet in 3D and seen from a little above
 * and in front, turned towards whoever it meets (left), so the wings keep
 * their true span and sweep in every pose, and the light falls on each part
 * of the surface as it's turned: the near wing shows its pale underside as
 * it lifts, the throat shows when it rears up to sing. Drawn in blue ink:
 * never a danger. 1 unit = 1 world px: the span is 70, two and a half times
 * the prospector's height.
 */

/** Origin at the middle of its body (it swims, so there's no footing). */
export const TIDESINGER = { w: 104, h: 96, ox: 46, oy: 40 } as const;

export type TidePose = 'glide' | 'sing' | 'point';

interface V3 {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}
const v3 = (x: number, y: number, z: number): V3 => ({ x, y, z });

/** Half the wingspan. */
const SPAN = 35;
/** Grid of the sheet: rows out along each wing, columns across the chord. */
const NY = 20;
const NV = 8;

interface Stance {
  /** How far the wingtips are raised (negative: lowered). */
  readonly flap: number;
  /** Nose up, radians. */
  readonly pitch: number;
  /** Near wing up, radians. */
  readonly roll: number;
  /** How far it's turned from facing straight out of the page towards the left. */
  readonly yaw: number;
}

const STANCE: Readonly<Record<TidePose, Stance>> = {
  glide: { flap: 5, pitch: 0.04, roll: -0.42, yaw: 0.5 },
  sing: { flap: -8, pitch: 1.5, roll: 0.05, yaw: 1.12 },
  point: { flap: -4, pitch: -0.42, roll: -0.36, yaw: 0.62 },
};

/** The camera looks down this far. */
const TILT = 0.5;
/** Towards the light, in world space (x right, y into the page, z up): up, left and in front. */
const TO_SUN = norm(v3(-0.45, -0.55, 0.72));
const TO_VIEWER = v3(0, -Math.cos(TILT), Math.sin(TILT));

function norm(v: V3): V3 {
  const l = Math.hypot(v.x, v.y, v.z) || 1;
  return v3(v.x / l, v.y / l, v.z / l);
}
const dot3 = (a: V3, b: V3): number => a.x * b.x + a.y * b.y + a.z * b.z;
const sub3 = (a: V3, b: V3): V3 => v3(a.x - b.x, a.y - b.y, a.z - b.z);
const cross3 = (a: V3, b: V3): V3 => v3(a.y * b.z - a.z * b.y, a.z * b.x - a.x * b.z, a.x * b.y - a.y * b.x);

/** How a pose (and its boil frame) puts the body in the world, and the world on the page. */
interface View {
  readonly stance: Stance;
  /** Local (x forward, y to its left, z up) to world. */
  world(p: V3): V3;
  page(p: V3): Pt;
  /** Towards the viewer: bigger is nearer. */
  depth(p: V3): number;
  /** Wingtip lift, with the boil's slow beat. */
  readonly flap: number;
  /** The tail's swing, by boil frame. */
  readonly swing: number;
}

function viewOf(pose: TidePose, f: number): View {
  const s = STANCE[pose];
  const [cp, sp] = [Math.cos(s.pitch), Math.sin(s.pitch)];
  const [cr, sr] = [Math.cos(s.roll), Math.sin(s.roll)];
  const [cy, sy] = [Math.cos(s.yaw), Math.sin(s.yaw)];
  const fw = v3(-cy, -sy, 0);
  const left = v3(sy, -cy, 0);
  const world = (p: V3): V3 => {
    // Pitch about its span, then roll about its length.
    const x1 = p.x * cp - p.z * sp;
    const z1 = p.x * sp + p.z * cp;
    const y2 = p.y * cr - z1 * sr;
    const z2 = p.y * sr + z1 * cr;
    return v3(x1 * fw.x + y2 * left.x, x1 * fw.y + y2 * left.y, z2);
  };
  const ct = Math.cos(TILT);
  const st = Math.sin(TILT);
  return {
    stance: s,
    world,
    page: (p) => {
      const w = world(p);
      return pt(w.x, -(w.z * ct + w.y * st));
    },
    depth: (p) => {
      const w = world(p);
      return -w.y * ct + w.z * st;
    },
    flap: s.flap + [0, 0.8, -0.6][f]!,
    swing: [0, 1, -1][f]!,
  };
}

// ---------------------------------------------------------------- the planform

function sampled(p0: Pt, c0: Pt, c1: Pt, p1: Pt): Pt[] {
  return cub(p0, c0, c1, p1, 60);
}
/** The leading edge from the head's corner out to the tip, and the trailing edge back in to the body. */
const LEAD = sampled(pt(10.5, 6.5), pt(9.6, 16), pt(3.5, 28), pt(-9, SPAN));
const TRAIL = sampled(pt(-9, SPAN), pt(-9.8, 26), pt(-12.6, 13), pt(-18, 5.5));

/** x along an edge (sampled by increasing or decreasing y) at `y`. */
function along(edge: readonly Pt[], y: number): number {
  for (let i = 0; i + 1 < edge.length; i++) {
    const a = edge[i]!;
    const b = edge[i + 1]!;
    if ((y - a.y) * (y - b.y) <= 0 && a.y !== b.y) return a.x + ((y - a.y) / (b.y - a.y)) * (b.x - a.x);
  }
  return edge[edge.length - 1]!.x;
}

/** Where the leading edge is at `y` out from the middle: the rounded front of the head, then the wing. */
function leadX(y: number): number {
  const a = Math.abs(y);
  return a <= 6.5 ? 11.6 - 1.1 * (a / 6.5) ** 2 : along(LEAD, a);
}
function trailX(y: number): number {
  const a = Math.abs(y);
  return a <= 5.5 ? -20 + 2 * (a / 5.5) ** 2 : along(TRAIL, a);
}

/** The body's dome over the middle of the sheet, easing to nothing at its rim. */
function dome(x: number, y: number): number {
  const k = Math.max(0, 1 - (y / 11) ** 2 - ((x + 3) / 15.5) ** 2);
  return 4.4 * k * k * (3 - 2 * k);
}

/** The surface's height at a point of the planform; `v` 0..1 across the chord. */
function heightAt(view: View, x: number, y: number, v: number, withDome = true): number {
  const s = Math.abs(y) / SPAN;
  const chord = leadX(y) - trailX(y);
  return (withDome ? dome(x, y) : 0) + view.flap * s ** 1.8 + chord * 0.05 * Math.sin(Math.PI * v);
}

/** A point on the sheet, local: `side` 1 is its left (near) wing, `s` 0..1 out along it, `v` 0..1 across. */
function sheetPoint(view: View, side: number, s: number, v: number, withDome = true): V3 {
  const y = side * SPAN * s;
  const x = leadX(y) + (trailX(y) - leadX(y)) * v;
  return v3(x, y, heightAt(view, x, y, v, withDome));
}

/** The dorsal normal of a quad of the sheet (a, b, c, e round it), in world space. */
function dorsalOf(view: View, side: number, a: V3, b: V3, c: V3, e: V3): V3 {
  const mid = (p: V3, q: V3): V3 => v3((p.x + q.x) / 2, (p.y + q.y) / 2, (p.z + q.z) / 2);
  const n = cross3(sub3(mid(b, c), mid(a, e)), sub3(mid(e, c), mid(a, b)));
  return norm(view.world(v3(-side * n.x, -side * n.y, -side * n.z)));
}

const rowS = (j: number): number => (j / NY) ** 0.85;

interface Quad {
  readonly pts: Pt[];
  readonly depth: number;
  /** Seeing its top (dorsal) side. */
  readonly top: boolean;
  /** Light on it, 0..1. */
  readonly lit: number;
  readonly side: number;
  readonly j: number;
  readonly i: number;
}

function quads(view: View): Quad[] {
  const out: Quad[] = [];
  for (const side of [-1, 1]) {
    // The top is domed over the body; the underside is flat, so which side shows is judged on the flat sheet.
    const grid = (withDome: boolean): V3[][] => Array.from({ length: NY + 1 }, (_, j) => Array.from({ length: NV + 1 }, (_, i) => sheetPoint(view, side, rowS(j), i / NV, withDome)));
    const domed = grid(true);
    const flat = grid(false);
    for (let j = 0; j < NY; j++) {
      for (let i = 0; i < NV; i++) {
        const corners = (g: V3[][]): [V3, V3, V3, V3] => [g[j]![i]!, g[j]![i + 1]!, g[j + 1]![i + 1]!, g[j + 1]![i]!];
        const top = dot3(dorsalOf(view, side, ...corners(flat)), TO_VIEWER) >= 0;
        const cs = corners(top ? domed : flat);
        const dorsal = dorsalOf(view, side, ...cs);
        const seen = top ? dorsal : v3(-dorsal.x, -dorsal.y, -dorsal.z);
        const lit = Math.max(0, Math.min(1, 0.22 + 0.85 * dot3(seen, TO_SUN)));
        out.push({ pts: cs.map(view.page), depth: cs.reduce((sum, p) => sum + view.depth(p), 0) / 4, top, lit, side, j, i });
      }
    }
  }
  return out.sort((p, q) => p.depth - q.depth);
}

/** A quad's points pushed out from its middle by `by`, wound one way, so a path of them fills as one union with no seams. */
function grown(pts: readonly Pt[], by: number): Pt[] {
  const c = pt(pts.reduce((s, p) => s + p.x, 0) / pts.length, pts.reduce((s, p) => s + p.y, 0) / pts.length);
  const g = pts.map((p) => {
    const dx = p.x - c.x;
    const dy = p.y - c.y;
    const l = Math.hypot(dx, dy) || 1;
    return pt(p.x + (dx / l) * by, p.y + (dy / l) * by);
  });
  let area = 0;
  for (let i = 0; i < g.length; i++) area += g[i]!.x * g[(i + 1) % g.length]!.y - g[(i + 1) % g.length]!.x * g[i]!.y;
  return area < 0 ? g.reverse() : g;
}

function unionPath(ctx: CanvasRenderingContext2D, qs: readonly Quad[], by: number): void {
  ctx.beginPath();
  for (const q of qs) {
    grown(q.pts, by).forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
    ctx.closePath();
  }
}

/** The colour of a part of the skin as lit: blue-violet above, pale below, deepening to indigo in shadow. */
function skinTone(q: Quad): string {
  if (!q.top) {
    // Pale, but turning lavender out towards the tips and the trailing edge, as the light goes off the curve.
    const off = rowS(q.j) * 0.35 + (q.i / NV) * 0.25;
    const lit = q.lit - off;
    return lit > 0.5 ? mix(TIDE.belly, LIGHT, (lit - 0.5) * 0.8) : mix(TIDE.belly, TIDE.bellyShade, Math.min(0.85, (0.5 - lit) * 1.4));
  }
  // A little paler towards the wing margins, as a ray's back is.
  const margin = Math.min(q.i / NV, 1 - (q.i + 1) / NV) < 0.13 ? 0.08 : 0;
  const base = mix(TIDE.skin, TIDE.skinLit, margin + rowS(q.j) * 0.1);
  return q.lit > 0.5 ? mix(base, TIDE.skinLit, (q.lit - 0.5) * 1.1) : mix(base, SHADOW, (0.5 - q.lit) * 1.1);
}

/** The outline of the whole sheet, local: round the far wing, the head, the near wing and back. */
function rimLoop(view: View): V3[] {
  const rows = Array.from({ length: NY + 1 }, (_, j) => rowS(j));
  return [
    ...[...rows].reverse().map((s) => sheetPoint(view, -1, s, 0)),
    ...rows.slice(1).map((s) => sheetPoint(view, 1, s, 0)),
    ...[...rows].reverse().slice(1).map((s) => sheetPoint(view, 1, s, 1)),
    ...rows.slice(1).map((s) => sheetPoint(view, -1, s, 1)),
  ];
}

/**
 * The sheet painted as one watercolour form: paper, the lit tones of each
 * part laid in and softened together, granulation and blooms, the pigment
 * pooled at the rim, hatching in the deepest shadow, fine lines where it
 * turns from top to underside, and the pen line round it.
 */
function paintSheet(d: Draw, view: View): Quad[] {
  const { pen } = d;
  const ctx = pen.ctx;
  const qs = quads(view);
  const rim = rimLoop(view).map(view.page);
  ctx.save();
  unionPath(ctx, qs, 0.25);
  ctx.fillStyle = PAPER_FILL;
  ctx.fill('nonzero');
  ctx.clip('nonzero');
  // The tones, on a scratch sheet, laid in softened.
  const layer = document.createElement('canvas');
  layer.width = ctx.canvas.width;
  layer.height = ctx.canvas.height;
  const lctx = layer.getContext('2d');
  if (lctx) {
    lctx.setTransform(ctx.getTransform());
    for (const q of qs) {
      lctx.fillStyle = skinTone(q);
      pathOf(lctx, grown(q.pts, 0.55));
      lctx.fill();
    }
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    const unit = Math.hypot(ctx.getTransform().a, ctx.getTransform().b);
    if (blurs(ctx)) ctx.filter = `blur(${(Math.max(1, unit) * 0.9).toFixed(2)}px)`;
    ctx.drawImage(layer, 0, 0);
    ctx.filter = 'none';
    ctx.restore();
  }
  // Granulation and a few blooms, as the pigment settled.
  const xs = rim.map((p) => p.x);
  const ys = rim.map((p) => p.y);
  const box = [pt(Math.min(...xs) - 2, Math.min(...ys) - 2), pt(Math.max(...xs) + 2, Math.min(...ys) - 2), pt(Math.max(...xs) + 2, Math.max(...ys) + 2), pt(Math.min(...xs) - 2, Math.max(...ys) + 2)];
  const tops = qs.filter((q) => q.top);
  if (tops.length) {
    ctx.save();
    unionPath(ctx, tops, 0);
    ctx.clip('nonzero');
    pen.stipple(box, 520, () => 0.45, 0.26, mix(TIDE.skin, SHADOW, 0.5));
    ctx.restore();
  }
  for (let k = 0; k < 10; k++) {
    const q = qs[Math.floor(hash(k, 3, 1400) * qs.length)]!;
    const c = q.pts[0]!;
    dab(d, oval(c.x, c.y, 3 + hash(k, 4, 1400) * 4, 2 + hash(k, 5, 1400) * 2, 12), q.top ? TIDE.skinLit : TIDE.belly, 0.16, 1.6);
  }
  // Pigment pooled along the rim.
  ctx.save();
  if (blurs(ctx)) ctx.filter = `blur(${(0.6 * Math.hypot(ctx.getTransform().a, ctx.getTransform().b)).toFixed(2)}px)`;
  ctx.globalAlpha = 0.4;
  ctx.strokeStyle = mix(TIDE.skin, SHADOW, 0.55);
  ctx.lineWidth = 1.5;
  pathOf(ctx, rim);
  ctx.stroke();
  ctx.restore();
  ctx.restore();
  // Hatching in the deepest shadow.
  const dark = qs.filter((q) => q.lit < 0.4);
  if (dark.length) {
    ctx.save();
    unionPath(ctx, dark, 0.2);
    ctx.clip('nonzero');
    pen.hatch(box, 1.5, 0.9, 0.3, { color: d.ink, alpha: 0.35 });
    ctx.restore();
  }
  // Where the surface turns from its top to its underside: a fine line along the fold.
  for (const q of qs) {
    const next = qs.find((r) => r.side === q.side && r.i === q.i && r.j === q.j + 1);
    if (next && next.top !== q.top) pen.hair([q.pts[3]!, q.pts[2]!], 0.45, d.ink, 0.7);
  }
  pen.stroke([...rim, rim[0]!], 0.75, d.ink, 0.85);
  return qs;
}

// ---------------------------------------------------------------- its parts

/** Whether the top of the sheet faces the viewer near a local point. */
function topSeen(qs: readonly Quad[], side: number, s: number): boolean {
  const j = Math.min(NY - 1, Math.round(s ** (1 / 0.85) * NY));
  return qs.find((q) => q.side === side && q.j === j && q.i === 1)?.top ?? true;
}

/** The pale chevrons on its shoulders, behind the head, as a manta's back is marked. */
function shoulders(d: Draw, view: View, qs: readonly Quad[]): void {
  for (const side of [-1, 1]) {
    if (!topSeen(qs, side, 0.2)) continue;
    const local = [v3(4, side * 5.5, 0), v3(2, side * 13, 0), v3(-3, side * 17, 0), v3(-1, side * 11, 0), v3(-4, side * 6, 0)];
    const patch = local.map((p) => view.page(v3(p.x, p.y, heightAt(view, p.x, p.y, 0.3) + 0.1)));
    dab(d, patch, TIDE.mark, 0.5, 0.7);
    dab(d, patch, TIDE.mark, 0.3, 1.6);
  }
}

/** Where its bioluminescent spots sit: rows along the leading and trailing edges of both wings. */
function spotPoints(view: View): { at: Pt; side: number; s: number; r: number }[] {
  const out: { at: Pt; side: number; s: number; r: number }[] = [];
  for (const side of [-1, 1]) {
    // A broken row just inside the leading edge, in pairs and singles, smaller towards the tip; a sparser one by the trailing edge.
    for (let k = 0; k < 11; k++) {
      const s = 0.26 + k * 0.066 + (hash(k, side + 2, 1410) - 0.5) * 0.03;
      if (hash(k, side + 5, 1411) < 0.18) continue;
      out.push({ at: view.page(sheetPoint(view, side, s, 0.09 + hash(k, side, 1412) * 0.05)), side, s, r: 0.55 - k * 0.025 });
      if (k % 3 === 1 && s < 0.85) out.push({ at: view.page(sheetPoint(view, side, s + 0.05, 0.86 + hash(k, side, 1413) * 0.04)), side, s, r: 0.42 });
    }
  }
  return out;
}

function spots(d: Draw, view: View): void {
  for (const sp of spotPoints(view)) {
    glow(d.pen.ctx, sp.at, sp.r * 3.2, TIDE.glow, 0.32);
    d.pen.dot(sp.at.x, sp.at.y, sp.r * 0.8, TIDE.glowCore, 0.8);
  }
}

/** A few soft violet spots on its pale belly, as each manta's belly is marked its own way. */
function bellySpots(d: Draw, view: View): void {
  for (let k = 0; k < 9; k++) {
    const x = -12 + hash(k, 1, 1420) * 16;
    const y = (hash(k, 2, 1420) - 0.5) * 22;
    const c = view.page(v3(x, y, heightAt(view, x, y, 0.5, false)));
    const r = 0.25 + hash(k, 3, 1420) * 0.4;
    dab(d, oval(c.x, c.y, r * 1.3, r, 10), TIDE.bellyShade, 0.6, 0.15);
  }
}

/** The wide mouth across the front of its head, between the lobes. */
function mouth(d: Draw, view: View): void {
  const line = Array.from({ length: 9 }, (_, i) => {
    const y = -5.4 + (i / 8) * 10.8;
    const x = leadX(y) - 0.3;
    return view.page(v3(x, y, heightAt(view, x, y, 0.01) - 0.5));
  });
  d.pen.stroke(line, 1.1, '#17163a', 0.9, false);
  d.pen.hair(line.map((p) => pt(p.x + 0.2, p.y + 0.8)), 0.45, TIDE.belly, 0.7);
}

/** An eye on the leading edge by the head: a raised socket, a dark glossy eye, a glint. */
function eye(d: Draw, view: View, side: number): void {
  const y = side * 7.6;
  const x = leadX(y) - 0.9;
  const c = view.page(v3(x, y, heightAt(view, x, y, 0.05) + 1));
  paint(d, oval(c.x, c.y, 1.9, 1.6, 12), mix(TIDE.skin, TIDE.skinLit, 0.45), { alpha: 1, shadow: 0.4, hatch: 0, line: 0.4 });
  d.pen.fill(oval(c.x - 0.2, c.y + 0.1, 1.15, 1.05, 12), '#100f24', 1);
  d.pen.dot(c.x - 0.6, c.y - 0.4, 0.38, PAPER_FILL, 0.95);
}

/** Where its throat slit is: under the head, behind the mouth. */
function throatAt(view: View): Pt {
  return view.page(v3(5.5, 0, -0.4));
}

/** The throat slit it sings through, on its underside: seen when it rears up. */
function throat(d: Draw, view: View): void {
  const line = Array.from({ length: 7 }, (_, i) => {
    const y = -3.6 + (i / 6) * 7.2;
    return view.page(v3(5.5 + Math.abs(y) * 0.25, y, -0.4));
  });
  d.pen.stroke(line, 1, '#2a2050', 0.85, false);
  d.pen.hair(line.map((p) => pt(p.x + 0.3, p.y + 0.6)), 0.4, PAPER_FILL, 0.8);
  // Five small gill slits each side, fainter.
  for (const side of [-1, 1]) {
    for (let k = 0; k < 4; k++) {
      const y = side * (4.6 + k * 1.2);
      d.pen.hair([view.page(v3(3.4 - k * 0.6, y, -0.3)), view.page(v3(1.4 - k * 0.6, y + side * 0.4, -0.3))], 0.45, TIDE.bellyShade, 0.8);
    }
  }
}

/** The tail: a long thin whip trailing behind, swinging a little with the boil. */
function tail(d: Draw, view: View): void {
  const w = view.swing;
  const spine = [v3(-19.5, 0, 0.6), v3(-28, w * 0.6, 1.4), v3(-38, 1.6 + w * 1.4, 2.4), v3(-48, 0.6 + w * 2.4, 3.6), v3(-58, -1.4 + w * 3.2, 5)].map(view.page);
  const smooth = cub(spine[0]!, spine[1]!, spine[3]!, spine[4]!, 20);
  const { shape } = ribbon(smooth, (u) => 2.2 * (1 - u) + 0.25);
  paint(d, shape, mix(TIDE.skin, TIDE.skinLit, 0.15), { alpha: 1, shadow: 0.45, hatch: 0, line: 0.5 });
  gleam(d, smooth.slice(1, 9).map((p) => pt(p.x, p.y - 0.5)), 0.35, 0.5);
}

/** The small dorsal fin at the root of its tail. */
function dorsalFin(d: Draw, view: View): void {
  const fin = [v3(-15.5, 0, heightAt(view, -15.5, 0, 0.9)), v3(-19.6, 0, 3.8), v3(-20.4, 0, 3.2), v3(-19.8, 0, 0.3)].map(view.page);
  paint(d, fin, TIDE.skin, { alpha: 1, shadow: 0.4, hatch: 0, line: 0.55 });
}

type Lobe = 'rolled' | 'open' | 'reach';

/** A lobe's spine, local, from its root at the head's corner. */
function lobeSpine(side: number, kind: Lobe, swing: number): V3[] {
  const y = (v: number): number => side * v;
  if (kind === 'rolled') return [v3(10.6, y(6.4), 0.8), v3(13.6, y(7.4), 0.2), v3(16, y(7), -1.1), v3(16.8, y(5.8), -2.6), v3(15.8, y(5), -3.4)];
  if (kind === 'open') return [v3(10.6, y(6.4), 0.8), v3(13.8, y(8.6), 1.8), v3(17, y(11), 2), v3(19.6, y(12.6), 0.8), v3(21, y(13), -0.6)];
  return [v3(10.6, y(6.4), 0.8), v3(16, y(9.6), -0.6), v3(21, y(10.4), -5.6), v3(22.4, y(8.4), -11), v3(25 + swing * 0.3, y(6.8), -14.6)];
}

/**
 * A cephalic lobe. Rolled, it's a short horn curled tight, its rolled edge
 * spiralling round it; open or reaching, it's a long flat blade, dark
 * above and pale on its inner face, ending in three fine digits.
 */
function lobe(d: Draw, view: View, side: number, kind: Lobe): void {
  const spine = lobeSpine(side, kind, view.swing).map(view.page);
  const line = cub(spine[0]!, spine[1]!, spine[3]!, spine[4]!, 16);
  if (kind === 'rolled') {
    const { shape, top } = ribbon(line, (u) => 3.4 - u * 1.8);
    paint(d, shape, mix(TIDE.skin, TIDE.skinLit, 0.12), { alpha: 1, shadow: 0.5, hatch: 0.15, line: 0.55 });
    // The rolled edge wrapping round it, pale where the underside shows.
    d.pen.clipped(shape, () => {
      for (let i = 2; i < line.length - 1; i += 2) {
        const p = line[i]!;
        const q = top[i]!;
        d.pen.hair([pt(q.x, q.y), pt(p.x + (p.x - q.x) * 0.9 + 0.6, p.y + (p.y - q.y) * 0.9 + 0.5)], 0.4, TIDE.belly, 0.65);
      }
    });
    const tip = line[line.length - 1]!;
    d.pen.hair(spiral(tip, 1.4, 1.2, side > 0 ? 0 : Math.PI, 14), 0.4, TIDE.belly, 0.85);
    return;
  }
  const { shape, bot } = ribbon(line, (u) => (kind === 'reach' ? 3.4 + Math.sin(u * Math.PI) * 1.2 - u * 1.2 : 3.6 - u * 1.4));
  paint(d, shape, mix(TIDE.skin, TIDE.skinLit, 0.15), { alpha: 1, shadow: 0.45, hatch: 0.12, line: 0.55 });
  // Its inner face, pale, along the lower edge.
  const inner = [...line, ...[...bot].reverse()];
  d.pen.clipped(shape, () => dab(d, inner, TIDE.belly, 0.75, 0.4));
  d.pen.hair(line.slice(2), 0.35, TIDE.bellyShade, 0.6);
  // Three fine digits fanned at its tip.
  const tip = line[line.length - 1]!;
  const prev = line[line.length - 3]!;
  const a = Math.atan2(tip.y - prev.y, tip.x - prev.x);
  for (const k of [-1, 0, 1]) {
    const b = a + k * 0.5;
    const mid = pt(tip.x + Math.cos(b) * 1.8, tip.y + Math.sin(b) * 1.8);
    const end = pt(tip.x + Math.cos(b + k * 0.25) * (k === 0 ? 3.8 : 3.2), tip.y + Math.sin(b + k * 0.25) * (k === 0 ? 3.8 : 3.2));
    paint(d, capsule(tip, mid, 1.1, 0.8), TIDE.belly, { alpha: 1, shadow: 0.3, hatch: 0, line: 0.35 });
    paint(d, capsule(mid, end, 0.8, 0.45), TIDE.belly, { alpha: 1, shadow: 0.3, hatch: 0, line: 0.35 });
  }
}

const LOBES: Readonly<Record<TidePose, readonly [Lobe, Lobe]>> = {
  glide: ['rolled', 'rolled'],
  sing: ['open', 'open'],
  point: ['rolled', 'reach'],
};

/**
 * One Tidesinger, turned towards whoever it meets (left). `glide`: flying
 * level, wings in a shallow gull curve, lobes rolled. `sing`: reared up,
 * wings raised, lobes spread open, its throat slit showing (its song's rings
 * are `drawTidesingerAir`). `point`: hovering low, wings down, the near lobe
 * unrolled and reaching down, its three digits drawing. `d.f` beats the
 * wings and swings the tail a little.
 */
export function drawTidesinger(d: Draw, pose: TidePose): void {
  const view = viewOf(pose, d.f);
  const [far, near] = LOBES[pose];
  tail(d, view);
  dorsalFin(d, view);
  const qs = paintSheet(d, view);
  shoulders(d, view, qs);
  spots(d, view);
  if (!topSeen(qs, 1, 0.02) || pose === 'sing') throat(d, view);
  mouth(d, view);
  lobe(d, view, -1, far);
  eye(d, view, -1);
  eye(d, view, 1);
  lobe(d, view, 1, near);
  if (!topSeen(qs, -1, 0.1)) {
    bellySpots(d, view);
    return;
  }
  // The wet gleam along its back.
  const back = [v3(6, -2, 0), v3(1, -3, 0), v3(-5, -4, 0), v3(-11, -3, 0)].map((p) => view.page(v3(p.x, p.y, heightAt(view, p.x, p.y, 0.4) + 0.2)));
  gleam(d, back, 0.6, 0.55);
}

/** What's round a Tidesinger, not of it (drawn after its finish): the halo of its spots and, singing, its song spreading from the throat in faint rings. */
export function drawTidesingerAir(d: Draw, pose: TidePose): void {
  const view = viewOf(pose, d.f);
  const { ctx } = d.pen;
  for (const sp of spotPoints(view)) glow(ctx, sp.at, sp.r * 5, TIDE.glow, 0.2);
  if (pose !== 'sing') return;
  const c = throatAt(view);
  const ahead = view.page(v3(14, 0, -2));
  const a = Math.atan2(ahead.y - c.y, ahead.x - c.x);
  // Rings spreading forward from the throat, each boil frame a little further out.
  for (let k = 0; k < 4; k++) {
    const r = 7 + k * 6 + d.f * 2;
    const arc = Array.from({ length: 15 }, (_, i) => {
      const t = a - 0.85 + (i / 14) * 1.7;
      return pt(c.x + Math.cos(t) * r, c.y + Math.sin(t) * r);
    });
    const alpha = 0.6 - k * 0.12;
    d.pen.stroke(arc, 0.9, TIDE.glow, alpha * 0.7, false);
    d.pen.hair(arc, 0.35, TIDE.glowCore, alpha);
  }
}

/** Every spot's glow as a list of points (for a scene to twinkle), from its origin. */
export function tidesingerSpots(pose: TidePose, f = 0): Pt[] {
  return spotPoints(viewOf(pose, f)).map((s) => s.at);
}

/** Every pose, in order. */
export const TIDE_POSES: readonly TidePose[] = ['glide', 'sing', 'point'];
