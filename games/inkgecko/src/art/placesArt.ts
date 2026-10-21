import type { Place } from '../level/levels';
import { createRng } from '../logic/rng';
import { paintGarden } from './garden';
import { paintGreenhouse } from './greenhouse';
import { brickDeck, drainPipe, GREENHOUSE_BED, upturnedSaucer } from './greenhouseParts';
import type { GroundKeep } from './keep';
import { paintOrchard } from './orchard';
import { ORCHARD_BED, orchardCover, plankDeck, treeStump } from './orchardParts';
import { paintPond, type PondKeep } from './pond';
import { padRing, seatPad } from './pondLife';
import { paintRockery } from './rockery';
import { ROCKERY_BED, slabBridge, stepStone, stoneDeck } from './rockeryParts';
import { type DeckPainter, paintRaised, paintTunnel } from './tunnel';
import { bezier, closed, type Draw, oval, pt, ribbon, shade, TAU } from './kit';
import { LEAF, MOSS, PAPER_FILL, STONE, STONE_DARK } from './palette';
import { makeCanvas, type Pt } from './pen';
import { mix, rgba } from './wash';

/** Where shadows fall: away from a light at the upper left. */
const SHADOW_DIR = { x: 0.55, y: 0.84 };
const DEPTH = '#1d1f2b';
const EARTH = '#8a6a4a';

/** The well is drawn centred in a WELL_FRAME square. */
export const WELL_FRAME = 140;

/** A ring of `n` fitted stones between radii r0 and r1, each a little different. */
function ringStones(n: number, r0: number, r1: number, seed: number): Pt[][] {
  const rng = createRng(seed);
  const cuts = Array.from({ length: n }, (_, i) => ((i + 0.3 + rng() * 0.4) / n) * TAU);
  return cuts.map((a0, i) => {
    const a1 = (cuts[(i + 1) % n]! + (i + 1 === n ? TAU : 0));
    const gap = 1.6;
    const inner = r0 + rng() * 1.5;
    const outer = r1 - rng() * 2.5;
    const out: Pt[] = [];
    const steps = 7;
    for (let k = 0; k <= steps; k++) {
      const a = a0 + (gap / outer) + ((a1 - a0 - (2 * gap) / outer) * k) / steps;
      const bulge = Math.sin((k / steps) * Math.PI) * 0.8;
      out.push(pt(Math.cos(a) * (outer + bulge), Math.sin(a) * (outer + bulge)));
    }
    for (let k = steps; k >= 0; k--) {
      const a = a0 + (gap / inner) + ((a1 - a0 - (2 * gap) / inner) * k) / steps;
      out.push(pt(Math.cos(a) * inner, Math.sin(a) * inner));
    }
    return out;
  });
}

/**
 * An old stone well seen from above: a ring of fitted, mossy stones (outer
 * radius ~50) round a dark shaft (radius ~30) whose lit far wall falls away
 * into the dark, with a glint of water at the bottom. Centred at 0,0.
 */
export function drawWell(d: Draw): void {
  const { pen } = d;
  const { ctx } = pen;
  const R0 = 30;
  const R1 = 51;
  const rng = createRng(611);
  // Its shadow on the ground, and the mortar between the stones.
  pen.fill(oval(3, 4.5, R1 + 1, R1 + 1, 48), d.ink, 0.14);
  pen.fill(oval(0, 0, R1, R1, 48), mix(STONE_DARK, '#5a5040', 0.3), 0.75);
  // The stones.
  for (const s of ringStones(13, R0, R1, 612)) {
    pen.fill(s, PAPER_FILL, 1);
    pen.fill(s, mix(STONE, STONE_DARK, rng() * 0.45), 0.75);
    pen.clipped(s, () => {
      for (let i = 0; i < 3; i++) {
        const a = rng() * TAU;
        const r = R0 + 4 + rng() * 14;
        pen.fill(oval(Math.cos(a) * r, Math.sin(a) * r, 3 + rng() * 5, 2 + rng() * 4, 12), STONE_DARK, 0.12);
      }
      pen.stipple(s, 40, () => 0.7, 0.45, STONE_DARK);
    });
    pen.crescent(s, pt(-2.4, -3.6), () => pen.fill(s, STONE_DARK, 0.35));
    shade(d, s, 0.3);
    // Moss creeping over the outer edge of some stones.
    if (rng() < 0.55) {
      pen.clipped(s, () => {
        const a = Math.atan2(s[3]!.y, s[3]!.x);
        for (let k = 0; k < 14; k++) {
          const aa = a + (rng() - 0.5) * 0.35;
          const r = R1 - 2 - rng() * 7;
          pen.fill(oval(Math.cos(aa) * r, Math.sin(aa) * r, 1.6 + rng() * 2.2, 1.4 + rng() * 1.8, 8), rng() < 0.4 ? LEAF : MOSS, 0.6);
        }
      });
    }
    pen.stroke(closed(s), 0.9, d.ink, 0.75);
  }
  // The shaft: dark, with the far wall lit where light reaches in.
  const shaft = oval(0, 0, R0 - 0.5, R0 - 0.5, 40);
  pen.fill(shaft, DEPTH, 0.95);
  pen.crescent(shaft, pt(-7, -10.5), () => {
    pen.fill(shaft, mix(STONE_DARK, DEPTH, 0.35), 0.85);
    // Courses of the shaft's lining, falling away.
    for (const r of [R0 - 3, R0 - 7, R0 - 11.5]) pen.hair(oval(0, 0, r, r, 36).slice(1, 18), 0.5, d.ink, 0.5);
    for (let k = 0; k < 10; k++) {
      const a = 0.1 + k * 0.29;
      pen.hair([pt(Math.cos(a) * (R0 - 1), Math.sin(a) * (R0 - 1)), pt(Math.cos(a) * (R0 - 3.5), Math.sin(a) * (R0 - 3.5))], 0.4, d.ink, 0.4);
    }
  });
  pen.clipped(shaft, () => {
    const g = ctx.createRadialGradient(-2, -3, 2, 0, 0, R0);
    g.addColorStop(0, rgba(DEPTH, 0.95));
    g.addColorStop(0.55, rgba(DEPTH, 0.75));
    g.addColorStop(1, rgba(DEPTH, 0));
    ctx.fillStyle = g;
    ctx.fillRect(-R0, -R0, R0 * 2, R0 * 2);
    pen.hatch(shaft, 2.2, -0.6, 0.45, { color: '#0c0d14', alpha: 0.35 });
  });
  // Water far down: a dim disc of sky and a glint.
  pen.hair(bezier(pt(-5, 2), pt(-1, -3), pt(5, -2), 5), 0.9, '#9fb3cf', 0.5);
  pen.dot(-2, -1.5, 0.9, PAPER_FILL, 0.7);
  pen.stroke(closed(shaft), 1.4, d.ink, 1);
  pen.stroke(closed(oval(0, 0, R1, R1, 48)), 1.3, d.ink, 0.9);
}

/** The burrow is drawn centred in a BURROW_FRAME square. */
export const BURROW_FRAME = 100;

/**
 * Where the line comes from: a dark hole (radius ~26) dug through the
 * paving, its rim of crumbled earth and broken stone, a root or two and
 * some pebbles. Centred at 0,0.
 */
export function drawBurrow(d: Draw): void {
  const { pen } = d;
  const { ctx } = pen;
  const rng = createRng(733);
  const lumpy = (r: number, amp: number, n: number, ph: number): Pt[] =>
    Array.from({ length: n }, (_, i) => {
      const a = (i / n) * TAU;
      const rr = r + Math.sin(a * 3 + ph) * amp * 0.6 + Math.sin(a * 7 + ph * 2) * amp * 0.4;
      return pt(Math.cos(a) * rr, Math.sin(a) * rr * 0.96);
    });
  // The spoil: loose earth thrown up round the hole.
  const spoil = lumpy(37, 4, 44, 1.2);
  pen.fill(spoil.map((p) => pt(p.x + 2, p.y + 3)), d.ink, 0.1);
  pen.fill(spoil, PAPER_FILL, 0.9);
  pen.fill(spoil, EARTH, 0.45);
  pen.clipped(spoil, () => {
    pen.stipple(spoil, 260, () => 0.8, 0.7, mix(EARTH, d.ink, 0.45));
    for (let i = 0; i < 18; i++) {
      const a = rng() * TAU;
      const r = 27 + rng() * 9;
      const c = pt(Math.cos(a) * r, Math.sin(a) * r);
      const s = 1.2 + rng() * 2;
      pen.fill(oval(c.x, c.y, s, s * 0.8, 8), mix(EARTH, '#ffffff', 0.25), 0.7);
      pen.hair(closed(oval(c.x, c.y, s, s * 0.8, 8)).slice(3, 8), 0.4, d.ink, 0.6);
    }
  });
  pen.crescent(spoil, pt(-4, -6), () => pen.fill(spoil, mix(EARTH, d.ink, 0.4), 0.3));
  pen.hair(closed(spoil), 0.7, d.ink, 0.55);
  // Broken bits of paving round the rim.
  for (let i = 0; i < 6; i++) {
    const a = rng() * TAU;
    const r = 33 + rng() * 9;
    const c = pt(Math.cos(a) * r, Math.sin(a) * r);
    const s = 3 + rng() * 3;
    const shard = Array.from({ length: 5 }, (_, k) => {
      const aa = a + (k / 5) * TAU + rng() * 0.6;
      return pt(c.x + Math.cos(aa) * s * (0.6 + rng() * 0.5), c.y + Math.sin(aa) * s * (0.6 + rng() * 0.5));
    });
    pen.fill(shard, PAPER_FILL, 1);
    pen.fill(shard, STONE, 0.6);
    pen.crescent(shard, pt(-1, -1.5), () => pen.fill(shard, STONE_DARK, 0.45));
    pen.stroke(closed(shard), 0.7, d.ink, 0.85, false);
  }
  // The hole: its lit far wall, then the dark.
  const hole = lumpy(26, 2.4, 40, 0.4);
  pen.fill(hole, DEPTH, 0.95);
  pen.crescent(hole, pt(-6, -9), () => {
    pen.fill(hole, mix(EARTH, DEPTH, 0.35), 0.9);
    pen.hatch(hole, 1.9, 0.9, 0.45, { color: d.ink, alpha: 0.45 });
  });
  pen.clipped(hole, () => {
    const g = ctx.createRadialGradient(-3, -4, 2, 0, 0, 26);
    g.addColorStop(0, rgba(DEPTH, 0.95));
    g.addColorStop(0.6, rgba(DEPTH, 0.7));
    g.addColorStop(1, rgba(DEPTH, 0));
    ctx.fillStyle = g;
    ctx.fillRect(-27, -27, 54, 54);
  });
  // Roots hanging in over the edge.
  for (const [a, l] of [[-2.3, 9], [-1.2, 7], [2.6, 8]] as const) {
    const p = pt(Math.cos(a) * 25, Math.sin(a) * 25);
    pen.hair(bezier(p, pt(p.x * 0.85 + 2, p.y * 0.85 + 1), pt(p.x * (1 - l / 30), p.y * (1 - l / 30) + 3), 6), 0.8, mix(EARTH, '#ffffff', 0.2), 0.85);
  }
  pen.stroke(closed(hole), 1.5, d.ink, 1);
}

/** Width of the groove the marbles roll along, board units. */
export const TRACK_W = 40;

/**
 * Paints a layer the size of the target canvas with the target's
 * transform, then lays it over the target: how the groove's soft bands are
 * cut (a stroke minus a shifted copy of itself) without clipping per point.
 */
function overlay(ctx: CanvasRenderingContext2D, alpha: number, paint: (c: CanvasRenderingContext2D) => void): void {
  const { ctx: off } = makeCanvas(ctx.canvas.width, ctx.canvas.height);
  off.setTransform(ctx.getTransform());
  off.lineCap = 'round';
  off.lineJoin = 'round';
  paint(off);
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = alpha;
  ctx.drawImage(off.canvas, 0, 0);
  ctx.restore();
}

function polyPath(pts: readonly Pt[], dx = 0, dy = 0): Path2D {
  const p = new Path2D();
  pts.forEach((q, i) => (i === 0 ? p.moveTo(q.x + dx, q.y + dy) : p.lineTo(q.x + dx, q.y + dy)));
  return p;
}

/** A band of the groove next to the rim facing `toward` (a unit vector), `width` deep. */
function rimBand(c: CanvasRenderingContext2D, pts: readonly Pt[], colour: string, width: number, toward: Pt): void {
  c.lineWidth = TRACK_W;
  c.strokeStyle = colour;
  c.stroke(polyPath(pts));
  c.globalCompositeOperation = 'destination-out';
  c.stroke(polyPath(pts, -toward.x * width, -toward.y * width));
  c.globalCompositeOperation = 'source-over';
}

/** The groove's two rims, offset from the centre line with a slow wobble, broken where another stretch of groove runs (tight bends, crossings). */
function rims(d: Draw, pts: readonly Pt[], inset: number, width: number, alpha: number): void {
  const { pen } = d;
  const cell = TRACK_W / 2;
  const grid = new Map<string, Pt[]>();
  for (const p of pts) {
    const k = `${Math.floor(p.x / cell)},${Math.floor(p.y / cell)}`;
    const list = grid.get(k);
    if (list) list.push(p);
    else grid.set(k, [p]);
  }
  const near = (q: Pt, r: number): boolean => {
    const cx = Math.floor(q.x / cell);
    const cy = Math.floor(q.y / cell);
    for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) {
      for (const p of grid.get(`${cx + i},${cy + j}`) ?? []) if ((p.x - q.x) ** 2 + (p.y - q.y) ** 2 < r * r) return true;
    }
    return false;
  };
  const rng = createRng(pts.length * 7 + 3);
  for (const side of [1, -1]) {
    const [ph1, ph2] = [rng() * TAU, rng() * TAU];
    let s = 0;
    let run: Pt[] = [];
    let heavy = 0;
    const flush = (): void => {
      if (run.length > 2) {
        // Heavier on the rim whose wall stands in shadow (the one nearer the light).
        const w = width * (heavy / run.length < 0 ? 1.3 : 0.8);
        pen.stroke(run, w, d.ink, alpha, false);
      }
      run = [];
      heavy = 0;
    };
    for (let i = 0; i < pts.length; i++) {
      const a = pts[Math.max(0, i - 1)]!;
      const b = pts[Math.min(pts.length - 1, i + 1)]!;
      const l = Math.hypot(b.x - a.x, b.y - a.y) || 1;
      const n = pt((-(b.y - a.y) / l) * side, ((b.x - a.x) / l) * side);
      if (i > 0) s += Math.hypot(pts[i]!.x - pts[i - 1]!.x, pts[i]!.y - pts[i - 1]!.y);
      const off = TRACK_W / 2 - inset + Math.sin(s / 37 + ph1) * 0.7 + Math.sin(s / 13 + ph2) * 0.35;
      const q = pt(pts[i]!.x + n.x * off, pts[i]!.y + n.y * off);
      if (near(q, TRACK_W / 2 - inset - 1.6)) {
        flush();
        continue;
      }
      run.push(q);
      heavy += n.x * SHADOW_DIR.x + n.y * SHADOW_DIR.y;
      // Lift the pen now and then, as a hand drawing a long line does.
      if (run.length > 28 + ((i * 7) % 13)) {
        const last = run[run.length - 1]!;
        flush();
        run.push(last);
      }
    }
    flush();
  }
}

/**
 * A groove worn into the ground along `pts` (a dense, smooth polyline in
 * BOARD coordinates, about every 4 units): a channel TRACK_W wide, its
 * floor a little darker than the ground, the wall nearer the light in
 * shadow and the far one catching it, between two slightly wobbling pen
 * rims. Fast on long paths; crossings are fine.
 */
export function drawTrack(d: Draw, pts: readonly Pt[]): void {
  if (pts.length < 2) return;
  const { pen } = d;
  const { ctx } = pen;
  const path = polyPath(pts);
  // The floor: worn smooth, the paving's joints mostly scuffed away.
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.lineWidth = TRACK_W;
  ctx.strokeStyle = rgba(mix(STONE, PAPER_FILL, 0.4), 0.7);
  ctx.stroke(path);
  ctx.strokeStyle = rgba(STONE_DARK, 0.16);
  ctx.stroke(path);
  ctx.lineWidth = TRACK_W * 0.45;
  ctx.strokeStyle = rgba(STONE_DARK, 0.06);
  ctx.stroke(path);
  ctx.restore();
  // Shadow under the wall nearer the light, soft at its edge; light on the far wall.
  const light = pt(-SHADOW_DIR.x, -SHADOW_DIR.y);
  overlay(ctx, 0.2, (c) => rimBand(c, pts, STONE_DARK, 9, light));
  overlay(ctx, 0.3, (c) => rimBand(c, pts, mix(STONE_DARK, d.ink, 0.3), 4.5, light));
  overlay(ctx, 0.55, (c) => rimBand(c, pts, PAPER_FILL, 3.5, SHADOW_DIR));
  // Grit on the floor.
  const rng = createRng(pts.length);
  ctx.save();
  ctx.fillStyle = rgba(STONE_DARK, 0.45);
  for (let i = 0; i < pts.length; i += 2) {
    const p = pts[i]!;
    const r = (rng() - 0.5) * TRACK_W * 0.8;
    const a = rng() * TAU;
    ctx.beginPath();
    ctx.arc(p.x + Math.cos(a) * r, p.y + Math.sin(a) * r, 0.4 + rng() * 0.6, 0, TAU);
    ctx.fill();
  }
  ctx.restore();
  // The rims, and a fainter line where each wall meets the floor.
  rims(d, pts, 0, 1, 0.75);
  rims(d, pts, 4.5, 0.6, 0.22);
}

/**
 * Chapter 1's page, "The Garden", in BOARD coordinates 0..w × 0..h: old
 * flagstones with moss in the joints, ferns, clover, fallen leaves and
 * pebbles gathered at the edges, pale and quiet in the middle.
 */
export function drawGarden(d: Draw, w: number, h: number): void {
  paintGarden(d, w, h);
}

/**
 * Chapter 2's page, "The Pond", in BOARD coordinates 0..w × 0..h: a damp
 * flagstone terrace across the play area with the pond lapping round it in
 * bays at the corners and down the sides, lily pads, reeds, kingcups and a
 * goldfish in the water. The shore gives way round `keep` (the level's
 * groove centre lines and pad centres) so no water or coping comes near
 * them; pondReach with the same `keep` says where the water is.
 */
export function drawPond(d: Draw, w: number, h: number, keep: PondKeep | GroundKeep): void {
  paintPond(d, w, h, keep);
}

/** Shortest and longest covered stretch the tunnel art is made for, board units. */
export const TUNNEL_MIN = 80;
export const TUNNEL_MAX = 400;

/**
 * A cover over a stretch of track, for a transparent layer drawn ABOVE the
 * marbles: `pts` is the stretch of the track's centre line (BOARD
 * coordinates, every ~4 units). Garden and pond: a mossy hollow log on a
 * nearly straight stretch, a mossy stone-slab footbridge along a curve.
 * Greenhouse: a salt-glazed drain pipe in jointed sections. Orchard: a
 * hollow log on a straight, a row of upturned apple crates along a curve.
 * Rockery: rough stone slabs laid across like a clapper bridge. Each fully
 * covers a band at least TRACK_W + 22 wide, ends included, and shades the groove
 * just outside each end where the marbles roll in and out.
 */
export function drawTunnel(d: Draw, pts: readonly Pt[], place: Place = 'pond'): void {
  if (place === 'greenhouse') drainPipe(d, pts, TRACK_W);
  else if (place === 'orchard') orchardCover(d, pts, TRACK_W);
  else if (place === 'rockery') slabBridge(d, pts, TRACK_W);
  else paintTunnel(d, pts, TRACK_W);
}

/** Each place's deck for a raised groove, and the ground tone under the groove on it. */
const DECKS: Readonly<Record<Place, readonly [DeckPainter, string]>> = {
  garden: [stoneDeck, ROCKERY_BED],
  pond: [stoneDeck, ROCKERY_BED],
  greenhouse: [brickDeck, GREENHOUSE_BED],
  orchard: [plankDeck, ORCHARD_BED],
  rockery: [stoneDeck, ROCKERY_BED],
};

/**
 * Where one track rolls over another (a crossing): the upper groove's
 * stretch `pts` (its centre line, BOARD coordinates every ~4 units, ~60–220
 * long and roughly straight) carried over the cover below on a little deck —
 * brick causeway (greenhouse), plank bridge (orchard), stone slabs (rockery,
 * garden, pond). For the covers layer, drawn AFTER the tunnels; marbles on
 * it are drawn above it. The groove runs across it at TRACK_W and fades into
 * the same groove on the ground at both ends.
 */
export function drawRaised(d: Draw, pts: readonly Pt[], place: Place): void {
  const [deck, bed] = DECKS[place];
  paintRaised(d, pts, TRACK_W, deck, drawTrack, bed);
}

/**
 * A level's ground for its place, in BOARD coordinates 0..w × 0..h. Every
 * place but the garden keeps its water and big or raised features clear of
 * `keep` (the level's groove centre lines and pad centres).
 */
export function drawGround(d: Draw, place: Place, w: number, h: number, keep: GroundKeep): void {
  if (place === 'pond') paintPond(d, w, h, keep);
  else if (place === 'greenhouse') paintGreenhouse(d, w, h, keep);
  else if (place === 'orchard') paintOrchard(d, w, h, keep);
  else if (place === 'rockery') paintRockery(d, w, h, keep);
  else paintGarden(d, w, h);
}

/** Radius of a lily pad the gecko sits on (hop levels). */
export const PAD_R = 58;

/**
 * A big lily pad the gecko sits on, centred at x, y (BOARD coordinates):
 * by default floating in a small pool sunk in the paving (radius ~1.3 r),
 * with its slit, veins, a bead of water and a bud at its rim. Pass
 * `inPool = false` where the pad sits on open pond water.
 */
export function drawLilyPad(d: Draw, x: number, y: number, r: number = PAD_R, inPool = true): void {
  seatPad(d, pt(x, y), r, inPool);
}

/**
 * The spot a gecko hops between on hop levels, centred at x, y (BOARD
 * coordinates), PAD_R across: a lily pad in its pool (pond, garden), an
 * upturned terracotta saucer (greenhouse), a sawn stump with its rings
 * (orchard), a big flat stepping stone set in gravel (rockery).
 */
export function drawPad(d: Draw, place: Place, x: number, y: number): void {
  if (place === 'greenhouse') upturnedSaucer(d, pt(x, y), PAD_R);
  else if (place === 'orchard') treeStump(d, pt(x, y), PAD_R);
  else if (place === 'rockery') stepStone(d, pt(x, y), PAD_R);
  else seatPad(d, pt(x, y), PAD_R, true);
}

/** A faint dotted ink ring round a pad the gecko can hop to, radius a little beyond r. */
export function drawPadRing(d: Draw, x: number, y: number, r: number = PAD_R): void {
  padRing(d, pt(x, y), r);
}

const BARK = '#8b6a4a';

/**
 * A twig the gecko runs along on rail levels, in BOARD coordinates: from
 * x0 to x1 at height y, ~14 thick, with bark lines, knots, a few leaves
 * and cut ends.
 */
export function drawBranch(d: Draw, x0: number, x1: number, y: number): void {
  const { pen } = d;
  const rng = createRng(Math.round(x0 * 3 + x1 * 7 + y));
  const n = Math.max(8, Math.ceil((x1 - x0) / 8));
  const spine = Array.from({ length: n + 1 }, (_, i) => {
    const x = x0 + ((x1 - x0) * i) / n;
    return pt(x, y + Math.sin(x / 90) * 2.2 + Math.sin(x / 31 + 1) * 0.9);
  });
  const knotCount = Math.max(1, Math.round((x1 - x0) / 260));
  const knots = Array.from({ length: knotCount }, (_, i) => x0 + ((i + 0.5 + (rng() - 0.5) * 0.5) / knotCount) * (x1 - x0));
  const girth = (u: number): number => {
    const x = x0 + (x1 - x0) * u;
    let w = 13.5 + Math.sin(x / 57) * 0.8;
    for (const k of knots) w += 2.5 * Math.exp(-(((x - k) / 10) ** 2));
    return w;
  };
  const twig = ribbon(spine, girth);
  // Leaves first, then the twig over their stems.
  const at = (x: number): Pt => spine[Math.max(0, Math.min(spine.length - 1, Math.round(((x - x0) / (x1 - x0)) * n)))]!;
  for (let x = x0 + 50 + rng() * 50, k = 0; x < x1 - 30; x += 90 + rng() * 90, k++) {
    const side = k % 2 === 0 ? -1 : 1;
    const base = at(x);
    const lean = 0.45 + rng() * 0.7;
    const ang = side * (rng() < 0.3 ? Math.PI - lean : lean);
    const len = 30 + rng() * 10;
    const tip = pt(base.x + Math.cos(ang) * len, base.y + Math.sin(ang) * len);
    const mid = pt((base.x + tip.x) / 2, (base.y + tip.y) / 2);
    const nx = -(tip.y - base.y) / len;
    const ny = (tip.x - base.x) / len;
    const from = pt(base.x + (tip.x - base.x) * 0.25, base.y + (tip.y - base.y) * 0.25);
    const blade = [...bezier(from, pt(mid.x + nx * 12, mid.y + ny * 12), tip, 12), ...bezier(tip, pt(mid.x - nx * 12, mid.y - ny * 12), from, 12).slice(1)];
    pen.fill(blade, PAPER_FILL, 1);
    pen.fill(blade, LEAF, 0.65);
    pen.crescent(blade, pt(-1.6, -2.4), () => pen.fill(blade, mix(LEAF, d.ink, 0.5), 0.35));
    pen.hair([base, tip], 0.55, d.ink, 0.65);
    pen.stroke(closed(blade), 0.8, d.ink, 0.85, false);
  }
  pen.fill(twig.shape.map((p) => pt(p.x + 2.5, p.y + 4.5)), d.ink, 0.1);
  pen.fill(twig.shape, PAPER_FILL, 1);
  pen.fill(twig.shape, BARK, 0.62);
  pen.clipped(twig.shape, () => {
    // Bark: long split lines along the grain.
    for (let i = 0; i < (x1 - x0) / 14; i++) {
      const xa = x0 + rng() * (x1 - x0);
      const len = 18 + rng() * 40;
      const off = (rng() - 0.5) * 10;
      const a = at(xa);
      const b = at(Math.min(x1, xa + len));
      pen.hair([pt(a.x, a.y + off), pt((a.x + b.x) / 2, (a.y + b.y) / 2 + off + (rng() - 0.5)), pt(b.x, b.y + off)], 0.45, d.ink, 0.35);
    }
    pen.fill(twig.top.map((p) => pt(p.x, p.y + 2.5)).concat([...twig.top].reverse()), PAPER_FILL, 0.3);
  });
  pen.crescent(twig.shape, pt(0, -6), () => pen.fill(twig.shape, mix(BARK, d.ink, 0.5), 0.35));
  shade(d, twig.shape, 0.3);
  // Knots, each a little eye of rings.
  for (const k of knots) {
    const c = at(k);
    pen.fill(oval(c.x, c.y + 1, 4.2, 3, 14), mix(BARK, d.ink, 0.45), 0.55);
    pen.hair(closed(oval(c.x, c.y + 1, 4.2, 3, 14)), 0.55, d.ink, 0.8);
    pen.hair(closed(oval(c.x, c.y + 1, 2, 1.3, 10)), 0.45, d.ink, 0.7);
  }
  // Cut ends showing the grain.
  for (const p of [spine[0]!, spine[spine.length - 1]!]) {
    const end = oval(p.x, p.y, 2.6, girth(p === spine[0] ? 0 : 1) / 2, 14);
    pen.fill(end, '#d9c29a', 0.95);
    pen.hair(closed(oval(p.x, p.y, 1.2, 3, 10)), 0.4, d.ink, 0.5);
    pen.stroke(closed(end), 0.8, d.ink, 0.9, false);
  }
  pen.stroke(twig.top, 1.1, d.ink, 0.9);
  pen.stroke(twig.bot, 1.4, d.ink, 0.95);
}
