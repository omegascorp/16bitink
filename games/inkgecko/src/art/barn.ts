import { createRng, type Rng } from '../logic/rng';
import { blob, body, type Edgeness, edgenessOf, edgeWash, groundWash, outline, polar, SHADOW } from './groundKit';
import { fits, type GroundKeep, type Room, roomOf, spotFor, type Taken } from './keep';
import { closed, type Draw, pt, TAU } from './kit';
import { PAPER_FILL } from './palette';
import type { Pt } from './pen';
import { bale, OAK_DARK, STRAW, STRAW_DEEP, STRAW_LIT } from './barnParts';
import { barnLadder, cartWheel, grainSack, horseshoe, lantern, milkChurn, ropeCoil } from './barnThings';
import { BARN_WALL, barnWalls, doorway, wallPoint, wallPosts, wallShadows, type WallSide } from './barnWalls';
import { mix, rgba } from './wash';

export { BARN_WALL } from './barnWalls';

/**
 * Chapter 8's page, "The Old Barn": the inside of an old timber barn seen
 * from above. Wide worn oak floorboards, pale and quiet in the middle where
 * play happens, broken here and there to the packed earth beneath; loose
 * straw drifting towards the walls; hay bales stacked along the sides, a
 * cart wheel leaning, churns, sacks, a coil of rope and the hayloft ladder;
 * shafts of dusty light from gaps in the boarding. Heavy timber walls stand
 * along the left, right and top (shots bounce off them, BARN_WALL in) and
 * the bottom is open on the yard. Big things keep clear of `keep`. Board
 * coordinates.
 */
const FLOOR = '#d7c4a2';
const FLOOR_DEEP = '#93704c';
const PLANK_TONES = ['#b08a60', '#c4a074', '#9c7a58', '#bfa486'] as const;
const EARTH = '#8c6c4a';
const DAY = '#fff1c6';
/** Floorboard width and the spacing of the joists under them (where the nails go). */
const PLANK_W = 46;
const JOIST = 300;
/** A bale in the stacks: length and depth. */
const BALE_L = 74;
const BALE_D = 40;

/** Floorboards in rows across the barn, butt joints staggered, grain and knots, nails over the joists; firmer towards the walls. Returns the rows' edges. */
function floorboards(d: Draw, w: number, h: number, edge: Edgeness, rng: Rng): number[] {
  const { pen } = d;
  const { ctx } = pen;
  groundWash(d, w, h, FLOOR, 0.5);
  edgeWash(d, w, h, FLOOR_DEEP, 0.3, 300);
  const rows: number[] = [];
  for (let y = -8; y < h + PLANK_W; y += PLANK_W + (rng() - 0.5) * 5) rows.push(y);
  for (let r = 0; r + 1 < rows.length; r++) {
    const [y0, y1] = [rows[r]!, rows[r + 1]!];
    for (let x = -30 - rng() * 220; x < w; ) {
      const len = 170 + rng() * 330;
      const board = [pt(x + 1, y0 + 1), pt(x + len - 1, y0 + 1), pt(x + len - 1, y1 - 1), pt(x + 1, y1 - 1)];
      const k = edge(x + len / 2, (y0 + y1) / 2);
      pen.fill(board, PLANK_TONES[Math.floor(rng() * PLANK_TONES.length)]!, 0.05 + 0.18 * k + rng() * 0.07);
      // Grain: long slow waves along the board.
      ctx.save();
      ctx.strokeStyle = rgba(OAK_DARK, 0.07 + 0.3 * k);
      ctx.lineWidth = 0.55;
      ctx.beginPath();
      for (let g = 0; g < 3 + Math.round(k * 3); g++) {
        const gy = y0 + 4 + rng() * (y1 - y0 - 8);
        const ph = rng() * TAU;
        ctx.moveTo(x + 2, gy);
        for (let gx = x + 2; gx < x + len - 2; gx += 18) ctx.lineTo(gx, gy + Math.sin(gx / 55 + ph) * 2.2);
      }
      ctx.stroke();
      ctx.restore();
      if (rng() < 0.12 + 0.4 * k) {
        const c = pt(x + 20 + rng() * (len - 40), y0 + 10 + rng() * (y1 - y0 - 20));
        const knot = blob(c, 4 + rng() * 4, 2.2 + rng() * 1.5, rng, 0.15, 12);
        pen.fill(knot, OAK_DARK, 0.2 + 0.35 * k);
        pen.hair(closed(knot), 0.5, d.ink, 0.15 + 0.45 * k);
        pen.hair(closed(blob(c, 9, 4.5, rng, 0.2, 14)), 0.4, OAK_DARK, 0.1 + 0.3 * k);
      }
      // The butt joint and its nails.
      const ex = x + len;
      if (ex > 0 && ex < w) {
        const kk = edge(ex, (y0 + y1) / 2);
        pen.stroke([pt(ex, y0 + 1), pt(ex + (rng() - 0.5), (y0 + y1) / 2), pt(ex, y1 - 1)], 0.7 + 0.5 * kk, d.ink, 0.18 + 0.5 * kk, false);
        for (const dx of [-5, 5]) for (const t of [0.3, 0.7]) pen.dot(ex + dx, y0 + (y1 - y0) * t, 0.8, d.ink, 0.15 + 0.45 * kk);
      }
      x += len;
    }
    // Nails over the joists.
    for (let jx = 80; jx < w; jx += JOIST) {
      const kk = edge(jx, (y0 + y1) / 2);
      for (const t of [0.3, 0.7]) pen.dot(jx + (rng() - 0.5) * 2, y0 + (y1 - y0) * t, 0.85, d.ink, 0.12 + 0.4 * kk);
    }
  }
  // The gaps between the rows: pen lines, broken and faint in the middle, with the next board's lit edge.
  for (const y of rows) {
    for (let x = 0; x < w; x += 80) {
      const m = pt(x + 40, y);
      const k = edge(m.x, m.y);
      if (rng() > 0.3 + 0.7 * k) continue;
      pen.stroke([pt(x, y + (rng() - 0.5)), pt(x + 40, y + (rng() - 0.5) * 1.4), pt(x + 80, y + (rng() - 0.5))], 0.6 + 0.6 * k, d.ink, 0.12 + 0.45 * k, false);
      pen.hair([pt(x + 4, y + 1.6), pt(x + 76, y + 1.6)], 0.8, PAPER_FILL, 0.15 + 0.2 * k);
    }
  }
  return rows;
}

/** Patches where the boards have gone and the packed earth shows, mostly towards the walls. */
function earthPatches(d: Draw, w: number, h: number, rows: readonly number[], edge: Edgeness, room: Room, rng: Rng): void {
  const { pen } = d;
  const made: Pt[] = [];
  for (let t = 0; t < 80 && made.length < 3; t++) {
    const r = 1 + Math.floor(rng() * (rows.length - 3));
    const [y0, y1] = [rows[r]!, rows[r + 1 + (rng() < 0.35 ? 1 : 0)]!];
    const len = 60 + rng() * 110;
    const x0 = BARN_WALL + 20 + rng() * (w - 2 * BARN_WALL - 40 - len);
    const mid = pt(x0 + len / 2, (y0 + y1) / 2);
    if (edge(mid.x, mid.y) < 0.3 || y1 > h - 30 || y0 < BARN_WALL + 10 || room(mid.x, mid.y) < 0 || room(x0, mid.y) < -10 || room(x0 + len, mid.y) < -10 || made.some((m) => Math.hypot(m.x - mid.x, m.y - mid.y) < 280)) continue;
    // Splintered ends: a zigzag where each board broke off.
    const ragged = (x: number, dir: number): Pt[] => Array.from({ length: 6 }, (_, i) => pt(x + dir * (rng() * 10 - (i % 2) * 6), y0 + ((y1 - y0) * i) / 5));
    const shape = [...ragged(x0, 1), ...ragged(x0 + len, -1).reverse()];
    body(d, shape, EARTH, 0.78);
    pen.clipped(shape, () => {
      pen.fill(blob(pt(x0 + len * 0.6, (y0 + y1) / 2), len * 0.35, (y1 - y0) * 0.35, rng, 0.3, 14), '#6e5238', 0.18);
      pen.stipple(shape, Math.round(len * 4), () => 0.7, 0.6, mix(EARTH, d.ink, 0.5));
      for (let k = 0; k < len / 12; k++) {
        const p = pt(x0 + rng() * len, y0 + rng() * (y1 - y0));
        pen.fill(blob(p, 1.5 + rng() * 2, 1.2 + rng() * 1.5, rng, 0.2, 8), mix('#c9bba0', '#8f8676', rng()), 0.75);
      }
    });
    // The boards stand a little proud: their shadow on the earth along the lit side.
    pen.crescent(shape, pt(SHADOW.x * 5, SHADOW.y * 5), () => pen.fill(shape, d.ink, 0.22));
    pen.crescent(shape, pt(SHADOW.x * 9, SHADOW.y * 9), () => pen.hatch(shape, 2.6, 0.9, 0.4, { color: d.ink, alpha: 0.25 }));
    pen.stroke(outline(shape, 6), 0.9, d.ink, 0.75, false);
    made.push(mid);
  }
}

/** Loose straw over the floor: thick in drifts along the walls, a stray stalk or two in the middle, never in a groove. */
function looseStraw(d: Draw, w: number, h: number, edge: Edgeness, room: Room, rng: Rng): void {
  const { ctx } = d.pen;
  ctx.save();
  ctx.lineCap = 'round';
  for (const [colour, alpha] of [[STRAW_DEEP, 0.7], [STRAW, 0.85], [STRAW_LIT, 0.9]] as const) {
    ctx.strokeStyle = rgba(colour, alpha);
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let k = 0; k < 1500; k++) {
      const x = BARN_WALL + rng() * (w - 2 * BARN_WALL);
      const y = BARN_WALL + rng() * (h - BARN_WALL - 12);
      const e = edge(x, y);
      if (rng() > 0.02 + e * e || room(x, y) < -22) continue;
      const a = rng() * TAU;
      const l = 4 + rng() * 9;
      ctx.moveTo(x, y);
      ctx.quadraticCurveTo(x + Math.cos(a + 0.3) * l * 0.5, y + Math.sin(a + 0.3) * l * 0.5, x + Math.cos(a) * l, y + Math.sin(a) * l);
    }
    ctx.stroke();
  }
  ctx.restore();
  for (let k = 0; k < 90; k++) {
    const p = pt(BARN_WALL + rng() * (w - 2 * BARN_WALL), BARN_WALL + rng() * (h - BARN_WALL - 12));
    if (rng() > edge(p.x, p.y) || room(p.x, p.y) < -22) continue;
    d.pen.hair([p, polar(p, rng() * TAU, 6 + rng() * 8)], 0.45, d.ink, 0.5);
  }
}

/** Shafts of light from gaps in the boarding of the top and left walls, falling away from the light, dust hanging in them. */
function lightShafts(d: Draw, w: number, h: number, rng: Rng): void {
  const { pen } = d;
  const { ctx } = pen;
  const l = Math.hypot(SHADOW.x, SHADOW.y);
  const dir = pt(SHADOW.x / l, SHADOW.y / l);
  const nrm = pt(-dir.y, dir.x);
  const starts: Pt[] = [
    ...Array.from({ length: 4 }, (_, i) => pt(120 + ((w - 520) * (i + rng() * 0.6)) / 4, BARN_WALL)),
    pt(BARN_WALL, 160 + rng() * 220),
  ];
  for (const s of starts) {
    const len = 420 + rng() * 360;
    const wd = 22 + rng() * 34;
    const e = pt(s.x + dir.x * len, s.y + dir.y * len);
    for (const [k, a] of [[1, 0.1], [0.55, 0.1]] as const) {
      const w0 = (wd * k) / 2;
      const w1 = (wd * 1.6 * k) / 2;
      const quad = [pt(s.x + nrm.x * w0, s.y + nrm.y * w0), pt(e.x + nrm.x * w1, e.y + nrm.y * w1), pt(e.x - nrm.x * w1, e.y - nrm.y * w1), pt(s.x - nrm.x * w0, s.y - nrm.y * w0)];
      const g = ctx.createLinearGradient(s.x, s.y, e.x, e.y);
      g.addColorStop(0, rgba(DAY, a * 1.6));
      g.addColorStop(0.5, rgba(DAY, a));
      g.addColorStop(1, rgba(DAY, 0));
      ctx.save();
      ctx.fillStyle = g;
      ctx.beginPath();
      quad.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
    for (let k = 0; k < 26; k++) {
      const t = rng() * 0.7;
      const p = pt(s.x + dir.x * len * t + nrm.x * (rng() - 0.5) * wd, s.y + dir.y * len * t + nrm.y * (rng() - 0.5) * wd);
      pen.dot(p.x, p.y, 0.5 + rng() * 0.6, PAPER_FILL, 0.5 + rng() * 0.4);
    }
  }
}

/** A stack of bales against a wall from u0, `cols` deep and `n` long, a bale or two on top. */
function baleStack(d: Draw, side: WallSide, w: number, u0: number, n: number, cols: number, rng: Rng): void {
  const L = wallPoint(side, w);
  for (let c = 0; c < cols; c++) {
    const v = BARN_WALL + 2 + BALE_D / 2 + c * (BALE_D + 1);
    for (let i = 0; i < n; i++) {
      const u = u0 + i * (BALE_L + 1) + (c % 2) * 6;
      bale(d, L(u, v + (rng() - 0.5) * 2), L(u + BALE_L, v + (rng() - 0.5) * 2), BALE_D / 2, rng, 8);
    }
  }
  // The top layer, laid across the ones below (the way a stack is bonded).
  if (cols < 2) return;
  for (let i = 0; i < n * 2 - 1; i++) {
    if (rng() < 0.3) continue;
    const u = u0 + 12 + i * (BALE_D + 1) + (rng() - 0.5) * 4;
    if (u + BALE_D > u0 + n * BALE_L) break;
    const v0 = BARN_WALL + 4 + (rng() - 0.5) * 4;
    bale(d, L(u + BALE_D / 2, v0), L(u + BALE_D / 2 + (rng() - 0.5) * 5, v0 + BALE_L), BALE_D / 2, rng, 18);
  }
}

/** A rectangle's footprint in wall-local terms, sampled for `fits`. */
function footprint(L: (u: number, v: number) => Pt, u0: number, u1: number, v0: number, v1: number): Pt[] {
  const out: Pt[] = [];
  for (let u = u0; u <= u1 + 0.1; u += Math.max(8, (u1 - u0) / Math.ceil((u1 - u0) / 12))) for (let v = v0; v <= v1 + 0.1; v += Math.max(8, (v1 - v0) / Math.ceil((v1 - v0) / 12))) out.push(L(u, v));
  return out;
}

/** Hay stacked along the walls, the ladder, a cart wheel, churns, sacks, rope; then the lantern and a horseshoe on the posts. */
function furnish(d: Draw, w: number, h: number, room: Room, rng: Rng): void {
  const taken: Taken[] = [];
  const clearOf = (c: Pt, r: number): boolean => !taken.some((t) => Math.hypot(t.x - c.x, t.y - c.y) < t.r + r + 8);
  // Hay along the sides (and maybe one run along the top).
  for (const side of ['left', 'right', 'top'] as const) {
    const L = wallPoint(side, w);
    const len = side === 'top' ? w : h;
    let made = 0;
    for (let u = 40 + rng() * 60; u < len - 120 && made < (side === 'top' ? 1 : 2); u += 30) {
      const n = 3 - Math.floor(rng() * 2);
      const cols = 2;
      const fitsCols = [cols, 1].find((c) => u + n * BALE_L < len - 30 - (side === 'top' ? 0 : 60) && fits(room, footprint(L, u - 4, u + n * (BALE_L + 1) + 6, BARN_WALL, BARN_WALL + 4 + c * (BALE_D + 1))));
      if (!fitsCols) continue;
      const mid = L(u + (n * BALE_L) / 2, BARN_WALL + (fitsCols * BALE_D) / 2);
      if (!clearOf(mid, (n * BALE_L) / 2)) continue;
      baleStack(d, side, w, u, n, fitsCols, rng);
      taken.push({ x: mid.x, y: mid.y, r: (n * BALE_L) / 2 });
      made++;
      u += n * BALE_L + 80 + rng() * 140;
    }
  }
  // The ladder up to the hayloft, against the top wall.
  for (let t = 0; t < 40; t++) {
    const u = 80 + rng() * (w - 160);
    const top = pt(u, BARN_WALL + 1);
    const foot = pt(u + (rng() - 0.5) * 10, BARN_WALL + 104);
    const mid = pt(u, BARN_WALL + 52);
    if (!fits(room, footprint((a, b) => pt(a, b), u - 24, u + 24, BARN_WALL, BARN_WALL + 110)) || !clearOf(mid, 56)) continue;
    barnLadder(d, foot, top, 38, rng);
    taken.push({ x: mid.x, y: mid.y, r: 56 });
    break;
  }
  // A cart wheel leaning on a side wall.
  for (let t = 0; t < 40; t++) {
    const side: WallSide = rng() < 0.5 ? 'left' : 'right';
    const L = wallPoint(side, w);
    const r = 50;
    const u = 80 + rng() * (h - 220);
    const c = L(u, BARN_WALL + r * 0.5 + 3);
    const out = side === 'left' ? pt(1, 0) : pt(-1, 0);
    if (!fits(room, footprint(L, u - r, u + r, BARN_WALL, BARN_WALL + r + 10)) || !clearOf(c, r)) continue;
    cartWheel(d, c, r, out, rng);
    taken.push({ x: c.x, y: c.y, r });
    break;
  }
  const W = BARN_WALL;
  const boxes = [[W + 10, W + 10, 200, h - 40], [w - 200, W + 10, w - W - 10, h - 40], [W + 10, W + 10, w - W - 10, 170], [W + 60, h - 170, w - W - 60, h - 40]] as const;
  const spot = (r: number): Pt | null => {
    for (let t = 0; t < 6; t++) {
      const first = Math.floor(rng() * boxes.length);
      for (let i = 0; i < boxes.length; i++) {
        const p = spotFor(rng, room, boxes[(first + i) % boxes.length]!, r, taken, 12, 10);
        if (p) return p;
      }
    }
    return null;
  };
  const churns = spot(40);
  if (churns) {
    milkChurn(d, polar(churns, 3.6, 15), 19, rng);
    milkChurn(d, polar(churns, 0.5, 17), 17, rng);
    taken.push({ x: churns.x, y: churns.y, r: 40 });
  }
  const sacks = spot(48);
  if (sacks) {
    const a = rng() * TAU;
    for (const [k, rr] of [[0, 25], [1, 22], [2, 23]] as const) grainSack(d, polar(sacks, a + k * 2.1, k === 0 ? 0 : 26), rr, rng);
    taken.push({ x: sacks.x, y: sacks.y, r: 48 });
  }
  const rope = spot(34);
  if (rope) {
    ropeCoil(d, rope, 24, rng);
    taken.push({ x: rope.x, y: rope.y, r: 34 });
  }
}

/** The lantern on a post of the top wall, a horseshoe on a post of a side wall, where there's room. */
function onThePosts(d: Draw, w: number, h: number, room: Room, keep: GroundKeep, rng: Rng): void {
  const tops = wallPosts('top', w, h, keep).filter((u) => room(u + 4, BARN_WALL + 14) > 14);
  if (tops.length) {
    const u = tops[Math.floor(rng() * tops.length)]!;
    lantern(d, pt(u, BARN_WALL - 4), pt(u + 4, BARN_WALL + 14));
  }
  const side: WallSide = rng() < 0.5 ? 'left' : 'right';
  const posts = wallPosts(side, w, h, keep);
  if (posts.length) {
    const u = posts[Math.floor(rng() * posts.length)]!;
    horseshoe(d, wallPoint(side, w)(u, BARN_WALL / 2), 12);
  }
}

/** The barn page: see the module comment. */
export function paintBarn(d: Draw, w: number, h: number, keep: GroundKeep): void {
  const rng = createRng(8810);
  const edge = edgenessOf(w, h, 0.42);
  const room = roomOf(keep, w, h);
  const rows = floorboards(d, w, h, edge, rng);
  earthPatches(d, w, h, rows, edge, room, rng);
  doorway(d, w, h, (p) => room(p.x, p.y) < -24, rng);
  wallShadows(d, w, h, keep);
  looseStraw(d, w, h, edge, room, rng);
  furnish(d, w, h, room, rng);
  lightShafts(d, w, h, rng);
  barnWalls(d, w, h, keep, rng);
  onThePosts(d, w, h, room, keep, rng);
}
