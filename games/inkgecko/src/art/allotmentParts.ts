import { createRng, type Rng } from '../logic/rng';
import { arc, blob, body, castShadow, outline, polar, SHADOW } from './groundKit';
import { closed, type Draw, normals, oval, pt, ribbon, TAU } from './kit';
import { PAPER_FILL } from './palette';
import type { Pt } from './pen';
import { coverEnds, coverHalf, unit } from './tunnel';
import { mix, rgba } from './wash';

/**
 * The allotment's cover, deck and seat: a low cloche tunnel of horticultural
 * fleece stretched over wire hoops along a stretch of groove, its hem pegged
 * and weighted with bricks; a bridge of weathered scaffold boards laid on
 * bricks carrying a groove over another; and an upturned galvanised bucket
 * for the gecko.
 */
const FLEECE = '#e8e8dc';
const FLEECE_SHADE = '#8b96a3';
const WIRE = '#7b8580';
const PEG = '#4f7a52';
const BRICK = '#b0654a';
const SCAFFOLD = '#bcae90';
const BAND = '#a9b4b2';
const ZINC = '#a9b4b2';
const ZINC_LIT = '#e3e8e5';
const ZINC_DEEP = '#66747a';
const SPLASH = '#d9d6cc';
/** Spacing of the tunnel's hoops along the groove, board units. */
const HOOP_GAP = 34;
/** How far a scaffold board runs on past the deck's ends, and how much wider than its parapet the deck is either side. */
const BOARD_OVER = 6;
const BOARD_WIDEN = 9;

/** The ground tone under a raised groove in the allotment: the scaffold boards' weathered timber. */
export const ALLOTMENT_BED = '#cbbd9c';

/** Running length along a polyline at each point. */
function cumulative(pts: readonly Pt[]): number[] {
  const cum = [0];
  for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1]! + Math.hypot(pts[i]!.x - pts[i - 1]!.x, pts[i]!.y - pts[i - 1]!.y));
  return cum;
}

/** A brick of length len and width wd centred at c, its long side along u. */
function brick(d: Draw, c: Pt, u: Pt, len: number, wd: number, rng: Rng): void {
  const { pen } = d;
  const at = (s: number, t: number): Pt => pt(c.x + u.x * s - u.y * t, c.y + u.y * s + u.x * t);
  const b = [at(-len / 2, -wd / 2), at(len / 2, -wd / 2), at(len / 2, wd / 2), at(-len / 2, wd / 2)];
  castShadow(d, b, 3, 0.18);
  body(d, b, mix(BRICK, '#c98a62', rng() * 0.4), 0.78);
  pen.clipped(b, () => pen.stipple(b, Math.round((len * wd) / 8), () => 0.6, 0.5, '#7a3a28'));
  pen.crescent(b, pt(-SHADOW.x * 2, -SHADOW.y * 2), () => pen.fill(b, '#6a2e20', 0.3));
  pen.stroke(outline(b, 4), 0.8, d.ink, 0.85, false);
}

/** The light, up and to the upper left, for shading a curved surface; and how deep the fleece sags between hoops. */
const LIGHT3 = ((x: number, y: number, z: number) => {
  const l = Math.hypot(x, y, z);
  return [x / l, y / l, z / l] as const;
})(-SHADOW.x, -SHADOW.y, 1.1);
const SAG = 0.4;
/** Bands across the tunnel the vault is shaded in. */
const VAULT_BANDS = 12;

/**
 * Shades the fleece as a half-cylinder over the centre line `pts`, sagging
 * between the hoops: each little patch lit by how squarely it faces the
 * light, laid opaque (patches overlap a hair so no seams show).
 */
function vault(ctx: CanvasRenderingContext2D, pts: readonly Pt[], nrm: readonly Pt[], half: number, cum: readonly number[], len: number, hoops: number): void {
  const [lx, ly, lz] = LIGHT3;
  const edge = (i: number, t: number): Pt => pt(pts[i]!.x + nrm[i]!.x * t * half, pts[i]!.y + nrm[i]!.y * t * half);
  ctx.save();
  for (let i = 0; i < pts.length - 1; i++) {
    const u = unit(pts[i]!, pts[i + 1]!);
    const phi = (((cum[i]! + cum[i + 1]!) / 2) / len) * hoops * Math.PI;
    const along = SAG * Math.cos(phi) * Math.sign(Math.sin(phi));
    const j = Math.min(pts.length - 1, i + 2);
    for (let b = 0; b < VAULT_BANDS; b++) {
      const t0 = -1 + (2 * b) / VAULT_BANDS;
      const t1 = -1 + (2 * (b + 1)) / VAULT_BANDS;
      const tm = (t0 + t1) / 2;
      const nx = nrm[i]!.x * tm + u.x * along;
      const ny = nrm[i]!.y * tm + u.y * along;
      const nz = Math.sqrt(Math.max(0, 1 - tm * tm)) * (1 - Math.abs(along) * 0.3);
      const lam = Math.max(0, (nx * lx + ny * ly + nz * lz) / (Math.hypot(nx, ny, nz) || 1));
      const k = Math.max(0, Math.min(1, (lam - 0.15) / 0.75));
      ctx.fillStyle = mix(mix(FLEECE_SHADE, '#b9c1c4', 0.2), FLEECE, k);
      const lo = Math.max(-1.02, t0 - 0.02);
      const hi = Math.min(1.02, t1 + 0.02);
      const q = [edge(i, lo), edge(j, lo), edge(j, hi), edge(i, hi)];
      ctx.beginPath();
      q.forEach((p, n) => (n === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
      ctx.closePath();
      ctx.fill();
    }
  }
  ctx.restore();
}

/**
 * A low cloche tunnel over the stretch of groove `pts`: fleece over hoops,
 * rounded in section (lit along its crown, shaded and hatched on the far
 * side), puckered between the hoops, its hem pinned with pegs and a few
 * bricks. Follows curves; covers coverHalf(grooveW) either side and more.
 */
export function fleeceTunnel(d: Draw, pts: readonly Pt[], grooveW: number): void {
  if (pts.length < 2) return;
  const { pen } = d;
  const rng = createRng(Math.round(pts[0]!.x * 13 + pts[0]!.y * 7 + pts.length));
  coverEnds(d, pts, grooveW);
  const half = coverHalf(grooveW) + 3;
  const cum = cumulative(pts);
  const len = cum[cum.length - 1]!;
  const hoops = Math.max(2, Math.round(len / HOOP_GAP));
  const pinch = (i: number): number => Math.abs(Math.sin((cum[i]! / len) * hoops * Math.PI));
  const hem = ribbon(pts, (u) => (half + 3 + 2.5 * pinch(Math.round(u * (pts.length - 1)))) * 2);
  const tunnel = ribbon(pts, () => half * 2);
  castShadow(d, tunnel.shape, 14, 0.12);
  castShadow(d, tunnel.shape, 7, 0.1);
  // The hem lying on the ground, then the fleece over the hoops.
  body(d, hem.shape, mix(FLEECE, '#c9c2a8', 0.5), 0.75);
  pen.stroke(closed(hem.shape), 0.6, d.ink, 0.5, false);
  pen.fill(tunnel.shape, PAPER_FILL, 1);
  const light = pt(-SHADOW.x, -SHADOW.y);
  const nrm = normals(pts);
  pen.clipped(tunnel.shape, () => {
    vault(pen.ctx, pts, nrm, half, cum, len, hoops);
    // The fabric's fine weave, and creases running out to the pegs.
    pen.stipple(tunnel.shape, Math.round(len * 2), () => 0.5, 0.45, FLEECE_SHADE);
    for (let i = 2; i < pts.length - 2; i += 3 + Math.floor(rng() * 3)) {
      const side = rng() < 0.5 ? 1 : -1;
      const edge = side > 0 ? tunnel.top[i]! : tunnel.bot[i]!;
      const into = polar(edge, Math.atan2(-nrm[i]!.y * side, -nrm[i]!.x * side) + (rng() - 0.5) * 0.7, half * (0.3 + rng() * 0.35));
      pen.hair([edge, into], 0.45, FLEECE_SHADE, 0.6);
    }
  });
  // Hatching where the far side turns from the light.
  pen.crescent(tunnel.shape, pt(light.x * half * 0.4, light.y * half * 0.4), () => pen.hatch(tunnel.shape, 2.8, 0.9, 0.45, { color: d.ink, alpha: 0.28 }));
  // The hoops seen through the fleece as ridges, and the pegs at their feet.
  for (let k = 0; k <= hoops; k++) {
    const i = cum.findIndex((c) => c >= (len * k) / hoops - 0.01);
    const ridge = arc(tunnel.top[i]!, tunnel.bot[i]!, 0, 6);
    pen.stroke(ridge, 2.2, PAPER_FILL, 0.75, false);
    pen.hair(ridge, 0.6, WIRE, k === 0 || k === hoops ? 0.9 : 0.55);
    for (const e of [hem.top[i]!, hem.bot[i]!]) {
      pen.dot(e.x, e.y, 2.2, PEG, 0.9);
      pen.hair(closed(oval(e.x, e.y, 2.2, 2.2, 8)), 0.45, d.ink, 0.8);
    }
  }
  // A few bricks weighting the hem between the hoops.
  for (let k = 0; k < hoops; k += 2 + Math.floor(rng() * 2)) {
    const i = cum.findIndex((c) => c >= (len * (k + 0.5)) / hoops);
    if (i < 0) continue;
    const s = rng() < 0.5 ? 1 : -1;
    const c = pt(pts[i]!.x + nrm[i]!.x * s * (half + 5), pts[i]!.y + nrm[i]!.y * s * (half + 5));
    brick(d, c, unit(pts[Math.max(0, i - 1)]!, pts[Math.min(pts.length - 1, i + 1)]!), 17, 8, rng);
  }
  pen.stroke(tunnel.top, 1.2, d.ink, 0.85);
  pen.stroke(tunnel.bot, 1.2, d.ink, 0.85);
}

/** The polyline run on by `over` past each end along its end tangents. */
function runOn(pts: readonly Pt[], over: number): Pt[] {
  const n = pts.length - 1;
  const a = unit(pts[Math.min(n, 2)]!, pts[0]!);
  const b = unit(pts[Math.max(0, n - 2)]!, pts[n]!);
  return [polar(pts[0]!, Math.atan2(a.y, a.x), over), ...pts, polar(pts[n]!, Math.atan2(b.y, b.x), over)];
}

/**
 * A deck of three weathered scaffold boards laid along the groove on stacks
 * of bricks: brick piers showing past the sides, the boards' grain, splits
 * and splashes of old paint, galvanised bands nailed round their ends.
 */
export function scaffoldDeck(d: Draw, pts: readonly Pt[], half: number, _grooveW: number, rng: Rng): void {
  const { pen } = d;
  const nrm = normals(pts);
  const cum = cumulative(pts);
  const len = cum[cum.length - 1]!;
  // Scaffold boards are broad: the deck is wider than its parapet, so they show either side of the groove.
  const wide = half + BOARD_WIDEN;
  castShadow(d, ribbon(pts, () => wide * 2).shape, 11, 0.12);
  // Brick piers under the ends and the middle, longer than the deck is wide.
  for (const t of [0.06, 0.5, 0.94]) {
    const i = cum.findIndex((c) => c >= len * t);
    const u = pt(nrm[i]!.x, nrm[i]!.y);
    for (const s of [-1, 1]) brick(d, pt(pts[i]!.x + u.x * s * (wide / 2 + 4), pts[i]!.y + u.y * s * (wide / 2 + 4)), u, wide + 6, 12, rng);
  }
  const long = runOn(pts, BOARD_OVER);
  const bw = (wide * 2) / 3;
  for (let k = 0; k < 3; k++) {
    const off = -wide + bw * (k + 0.5);
    const spineN = normals(long);
    const spine = long.map((p, i) => pt(p.x + spineN[i]!.x * off, p.y + spineN[i]!.y * off));
    const board = ribbon(spine, () => bw - 1.4);
    body(d, board.shape, mix(SCAFFOLD, rng() < 0.5 ? '#9a9c8e' : '#c9b48a', rng() * 0.5), 0.8);
    pen.clipped(board.shape, () => {
      for (let g = 0; g < len / 12; g++) {
        const i = Math.floor(rng() * (spine.length - 4));
        const t = (rng() - 0.5) * (bw - 5);
        const seg = spine.slice(i, i + 3 + Math.floor(rng() * 3)).map((p, j) => pt(p.x + spineN[i + j]!.x * t, p.y + spineN[i + j]!.y * t));
        pen.hair(seg, 0.4, d.ink, 0.3);
      }
      for (let s = 0; s < 3; s++) {
        const p = spine[Math.floor(rng() * spine.length)]!;
        pen.fill(blob(p, 2 + rng() * 3, 1.5 + rng() * 2, rng, 0.4, 9, rng() * TAU), SPLASH, 0.7);
      }
    });
    pen.crescent(board.shape, pt(-SHADOW.x * 1.6, -SHADOW.y * 1.6), () => pen.fill(board.shape, '#4a3e30', 0.3));
    // The galvanised band round each end, nailed.
    for (const i of [1, spine.length - 2]) {
      const a = board.top[i]!;
      const b = board.bot[i]!;
      pen.stroke([a, b], 3.4, BAND, 0.95, false);
      pen.hair([a, b], 0.5, d.ink, 0.8);
      pen.dot((a.x + b.x) / 2, (a.y + b.y) / 2, 0.8, d.ink, 0.8);
    }
    pen.stroke(closed(board.shape), 0.8, d.ink, 0.85, false);
  }
}

/** The bucket's sloping side, shaded as a cone: each wedge lit by how squarely it faces the light. */
function coneSide(ctx: CanvasRenderingContext2D, c: Pt, r0: number, r1: number): void {
  const n = 64;
  const toLight = Math.atan2(-SHADOW.y, -SHADOW.x);
  for (let k = 0; k < n; k++) {
    const a0 = (k / n) * TAU;
    const a1 = ((k + 1.15) / n) * TAU;
    const facing = Math.cos((a0 + a1) / 2 - toLight);
    const lit = Math.max(0, Math.min(1, 0.5 + 0.55 * facing));
    ctx.fillStyle = lit > 0.5 ? mix(ZINC, ZINC_LIT, (lit - 0.5) * 2) : mix(ZINC_DEEP, ZINC, lit * 2);
    ctx.beginPath();
    ctx.moveTo(c.x + Math.cos(a0) * r0, c.y + Math.sin(a0) * r0);
    ctx.lineTo(c.x + Math.cos(a0) * r1, c.y + Math.sin(a0) * r1);
    ctx.lineTo(c.x + Math.cos(a1) * r1, c.y + Math.sin(a1) * r1);
    ctx.lineTo(c.x + Math.cos(a1) * r0, c.y + Math.sin(a1) * r0);
    ctx.closePath();
    ctx.fill();
  }
}

/**
 * An upturned galvanised bucket, radius r at c, for the gecko to sit on:
 * the flat base on top, softly spangled zinc, ribbed sloping sides lit on
 * the light's side and in shade on the other, the rolled rim, its wire
 * handle dropped on the ground beside it and a few scuffs of honest wear.
 */
export function upturnedBucket(d: Draw, c: Pt, r: number): void {
  const { pen } = d;
  const rng = createRng(Math.round(c.x * 31 + c.y * 17));
  const rim = oval(c.x, c.y, r, r, 48);
  const rb = r * 0.64;
  // The handle, dropped to the ground from its ears.
  const ear = 0.4 + rng() * 0.5;
  const bail = arc(polar(c, ear, r - 3), polar(c, ear + Math.PI, r - 3), -r * 2.6, 28);
  pen.stroke(bail.map((p) => pt(p.x + SHADOW.x * 2.5, p.y + SHADOW.y * 2.5)), 2.4, d.ink, 0.18, false);
  pen.stroke(bail, 3, d.ink, 0.85, false);
  pen.stroke(bail, 1.9, mix(ZINC, ZINC_LIT, 0.3), 1, false);
  castShadow(d, rim, r * 0.2, 0.14);
  castShadow(d, rim, r * 0.1, 0.12);
  pen.fill(rim, PAPER_FILL, 1);
  pen.clipped(rim, () => coneSide(pen.ctx, c, rb - 1, r + 1));
  // Two pressed ribs round the side, each a dark groove with a lit lip.
  for (const k of [0.76, 0.88]) {
    pen.hair(closed(oval(c.x, c.y, r * k, r * k, 44)), 0.9, ZINC_DEEP, 0.7);
    pen.hair(closed(oval(c.x - 0.6, c.y - 0.9, r * k - 1.4, r * k - 1.4, 44)), 0.8, ZINC_LIT, 0.8);
  }
  pen.crescent(rim, pt(-SHADOW.x * r * 0.14, -SHADOW.y * r * 0.14), () => pen.hatch(rim, 2.6, 0.9, 0.45, { color: d.ink, alpha: 0.3 }));
  // The rolled rim: a bright bead round the edge.
  pen.stroke(closed(oval(c.x, c.y, r - 2, r - 2, 46)), 2.4, ZINC_LIT, 0.6, false);
  // The base: flat, a little darker than the lit side, faintly spangled, crimped round its edge, scuffed.
  const base = oval(c.x, c.y, rb, rb, 40);
  castShadow(d, base, 2, 0.12);
  body(d, base, mix(ZINC, ZINC_LIT, 0.25), 0.85);
  pen.clipped(base, () => {
    for (let k = 0; k < 16; k++) {
      const p = polar(c, rng() * TAU, Math.sqrt(rng()) * rb);
      pen.fill(blob(p, 3 + rng() * 5, 2 + rng() * 4, rng, 0.35, 7, rng() * TAU), rng() < 0.5 ? ZINC_LIT : ZINC_DEEP, 0.1);
    }
    for (let k = 0; k < 6; k++) {
      const p = polar(c, rng() * TAU, rng() * rb * 0.8);
      pen.hair([p, polar(p, rng() * TAU, 6 + rng() * 10)], 0.4, PAPER_FILL, 0.65);
    }
    pen.fill(oval(c.x - rb * 0.3, c.y - rb * 0.35, rb * 0.45, rb * 0.25, 18), PAPER_FILL, 0.18);
  });
  pen.crescent(base, pt(SHADOW.x * 3, SHADOW.y * 3), () => pen.fill(base, ZINC_DEEP, 0.25));
  pen.hair(closed(oval(c.x, c.y, rb - 4, rb - 4, 36)), 0.6, d.ink, 0.45);
  pen.stroke(closed(base), 1, d.ink, 0.85);
  // The ears where the handle hooks on, and a smear of dried soil low on the side.
  for (const a of [ear, ear + Math.PI]) {
    const e = polar(c, a, r - 4);
    const lug = oval(e.x, e.y, 3.6, 3.6, 10);
    body(d, lug, ZINC, 0.8);
    pen.hair(closed(lug), 0.6, d.ink, 0.85);
  }
  pen.clipped(rim, () => pen.stipple(blob(polar(c, 1.1, r * 0.92), r * 0.28, r * 0.1, rng, 0.3, 12, 2.7), 50, () => 0.7, 0.7, '#7a5a3e'));
  pen.stroke(closed(rim), 1.4, d.ink, 0.95);
}
