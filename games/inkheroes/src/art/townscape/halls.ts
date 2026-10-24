import type { Rng } from '../../logic/rng';
import { bezier, closed, pt, type Draw } from '../kit';
import type { Pt } from '../pen';
import { beam, P, quad, STONE, type Surface } from '../sites/build';
import { blob, boundsOf, crisp, flat, groundShadow, LIGHT, mix, paint, SHADOW, sprite } from '../sites/paintKit';
import {
  apron, atmosphere, banner, BLUE, box, castOn, clock, cornice, door, face, flag, frontAt, gableX, gableZ, GOLD, groundCast, hipRoof, OAK, pinnacle, plane, PLASTER,
  quoins, shadeOn, shield, SLATE, slab, steps, surround, window,
} from './hallParts';
import { GUILD } from './guild';
import { capitol, cityHall, setBack } from './hallsGrand';
import { SLOTS, type TownDrawer } from './types';

/**
 * The seat of government at the head of the square, four drawings, each
 * grander than the last: a timber-framed village hall, a stone town hall
 * under its clock tower, a domed and colonnaded city hall, and the
 * capitol palace under its great gilded dome.
 */

const BOUNDS = boundsOf(SLOTS.hall.frame);
const ROOF_WOOD = '#94603f';
const SHINGLES = { row: 4.6, tab: 5.2 } as const;

// ---- Village hall ----

/** Timbers over a face: a beam between two points of `at`, painted dark oak. */
function timber(d: Draw, at: Surface, u0: number, v0: number, u1: number, v1: number, w = 2.4): void {
  beam(d, at(u0, v0), at(u1, v1), w, OAK, 0.45);
}

/** A leaded casement in a timber frame: diamond panes, oak frame, Crown-blue shutters folded back. */
function casement(d: Draw, at: Surface, u: number, v: number, w: number, h: number, lit = 0, shutters = true): void {
  const { pen } = d;
  for (const s of shutters ? [-1, 1] : []) {
    const u0 = s < 0 ? u - w * 0.5 - 1 : u + w + 1;
    const sh = crisp(quad(at, u0, v, u0 + w * 0.5, v + h), 2);
    flat(d, sh, mix(BLUE, '#4f7d84', 0.45), { tone: s < 0 ? -0.05 : 0.15, line: 0.5 });
    pen.clipped(sh, () => { for (let k = 1; k < 3; k++) pen.hair([at(u0 + (w * 0.5 * k) / 3, v), at(u0 + (w * 0.5 * k) / 3, v + h)], 0.35, d.ink, 0.45); });
    pen.hair([at(u0 + 0.6, v + h * 0.3), at(u0 + w * 0.5 - 0.6, v + h * 0.3)], 0.4, '#3a3640', 0.6);
  }
  const frame = crisp(quad(at, u - 1.4, v - 1.4, u + w + 1.4, v + h + 1.4), 2);
  flat(d, frame, OAK, { tone: 0.05, line: 0.5 });
  const hole = crisp(quad(at, u, v, u + w, v + h), 2);
  pen.fill(hole, '#2f3856', 1);
  pen.clipped(hole, () => {
    pen.fill([at(u - 2, v + h * 0.2), at(u + w * 0.6, v + h + 2), at(u + w + 2, v + h + 2), at(u + w + 2, v + h * 0.8), at(u + w * 0.3, v - 2), at(u - 2, v - 2)], '#9fb2cf', 0.28);
    if (lit > 0) pen.fill(hole, '#f2b45a', lit);
    for (let k = -h; k < w + h; k += Math.max(2.6, w / 6)) {
      pen.hair([at(u + k, v), at(u + k + h, v + h)], 0.3, '#565260', 0.6);
      pen.hair([at(u + k, v + h), at(u + k + h, v)], 0.3, '#565260', 0.6);
    }
    pen.crescent(hole, pt(1.4, 1.6), () => pen.fill(hole, SHADOW, 0.45));
  });
  pen.stroke([at(u + w / 2, v), at(u + w / 2, v + h)], 0.9, OAK, 1, false);
  pen.stroke(closed(hole), 0.5, d.ink, 0.9);
  flat(d, crisp(quad(at, u - 2.4, v - 3, u + w + 2.4, v - 1.2), 2), mix(OAK, LIGHT, 0.2), { tone: -0.1, line: 0.45 });
}

/** The parish notice board on two posts under a little shingled cap, papers pinned to it. */
function noticeBoard(d: Draw, rng: Rng, x: number, z: number): void {
  const { pen } = d;
  for (const dx of [-9, 9]) beam(d, P(x + dx, z, 0), P(x + dx, z, 25), 2, OAK, 0.45);
  const b = box(x - 10, x + 10, z, z + 2, 9, 22);
  slab(d, b, mix(OAK, LIGHT, 0.25), { line: 0.5 });
  const at: Surface = (u, v) => P(x - 10 + u, z, 9 + v);
  const papers: [number, number, number, number][] = [[2, 2.2, 6, 8], [9, 6, 5, 6], [14.5, 1.8, 4, 6.5], [8.6, 0.8, 4.5, 4]];
  for (const [u, v, w, h] of papers) {
    const tilt = (rng() - 0.5) * 0.8;
    const sheet = [at(u, v + tilt), at(u + w, v - tilt), at(u + w, v + h - tilt), at(u, v + h + tilt)];
    pen.fill(sheet.map((p) => pt(p.x + 0.6, p.y + 0.6)), SHADOW, 0.3);
    flat(d, sheet, '#f1e6c8', { tone: -0.1, line: 0.35 });
    for (let k = 1.4; k < h - 1; k += 1.3) pen.hair([at(u + 0.8, v + h - k), at(u + w * (0.5 + rng() * 0.4), v + h - k)], 0.25, '#55504a', 0.6);
  }
  const seal = at(4.5, 3.2);
  pen.dot(seal.x, seal.y, 1, '#a9302a', 1);
  const cap = box(x - 12, x + 12, z - 2, z + 4, 25, 26.4);
  slab(d, cap, OAK, { line: 0.45 });
  plane(d, rng, P(x - 13, z - 3, 26.4), P(x + 13, z - 3, 26.4), P(x + 13, z + 1, 31), P(x - 13, z + 1, 31), ROOF_WOOD, 0.02, { row: 2.4, tab: 3 });
}

/** The belfry on the ridge: an open timber stage with its bell, under a shingled spirelet and a weathervane. */
function belfry(d: Draw, rng: Rng, x: number, z: number): void {
  const { pen } = d;
  plane(d, rng, P(x - 9, z, 100), P(x + 9, z, 100), P(x + 9, z, 108), P(x - 9, z, 108), ROOF_WOOD, 0.1, { row: 2.6, tab: 3 });
  const open = box(x - 8, x + 8, z + 0.5, z + 9.5, 108, 124);
  const at = frontAt(open);
  const back = crisp(quad(at, 0, 0, 16, 16), 2);
  pen.fill(back, '#2a2638', 0.95);
  const bell = [at(4.4, 3), at(11.6, 3), ...bezier(at(11.6, 3), at(11, 12), at(8, 13), 5).slice(1), ...bezier(at(8, 13), at(5, 12), at(4.4, 3), 5).slice(1, -1)];
  paint(d, bell, '#b0823e', { shadow: 0.5, hatch: 0, gloss: true, line: 0.5 });
  pen.hair([at(4.6, 3.2), at(11.4, 3.2)], 0.8, mix('#b0823e', LIGHT, 0.5), 0.8);
  for (const u of [0, 15]) timber(d, at, u + 0.5, 0, u + 0.5, 16, 2);
  timber(d, at, 0, 15.6, 16, 15.6, 1.8);
  timber(d, at, 0, 0.6, 16, 0.6, 1.8);
  for (const [u0, u1] of [[1, 5], [15, 11]] as const) timber(d, at, u0, 12, u1, 15.4, 1.2);
  // A shingled spirelet and the weathervane.
  const top = box(x - 9.5, x + 9.5, z - 0.5, z + 10.5, 124, 125);
  const apex = P(x, z + 5, 150);
  plane(d, rng, P(top.x0 - 1.5, top.z1 + 1, 124), P(top.x0 - 1.5, top.z0 - 1, 124), apex, apex, ROOF_WOOD, -0.2, { row: 3.2, tab: 3.4 });
  plane(d, rng, P(top.x1 + 1.5, top.z0 - 1, 124), P(top.x1 + 1.5, top.z1 + 1, 124), apex, apex, ROOF_WOOD, 0.45, { row: 3.2, tab: 3.4 });
  plane(d, rng, P(top.x0 - 1.5, top.z0 - 1, 124), P(top.x1 + 1.5, top.z0 - 1, 124), apex, apex, ROOF_WOOD, 0.04, { row: 3.2, tab: 3.4 });
  pen.stroke([apex, pt(apex.x, apex.y - 9)], 0.8, d.ink, 0.95, false);
  pen.stroke([pt(apex.x - 3.5, apex.y - 4), pt(apex.x + 3.5, apex.y - 4)], 0.5, d.ink, 0.8, false);
  const vane = [pt(apex.x, apex.y - 9.6), pt(apex.x + 7, apex.y - 8.6), pt(apex.x + 5.6, apex.y - 7.4), pt(apex.x + 7, apex.y - 6.2), pt(apex.x, apex.y - 6.8)];
  paint(d, vane, GOLD, { shadow: 0.3, hatch: 0, line: 0.4 });
  pen.dot(apex.x, apex.y - 9.6, 1, GOLD, 1);
}

/** The front's close timbering: posts, rails and studs, with braces in the end bays. */
function frame(d: Draw, at: Surface, w: number, h: number, posts: readonly number[], skip: (u: number) => boolean, braces: boolean): void {
  for (let u = 0; u < w; u += 7) if (!skip(u) && !posts.some((p) => Math.abs(p - u) < 3)) timber(d, at, u, 1, u, h - 1, 1.8);
  for (const u of posts) timber(d, at, u, 0, u, h, 2.8);
  timber(d, at, 0, 1, w, 1, 2.8);
  timber(d, at, 0, h - 1, w, h - 1, 2.8);
  if (braces) {
    timber(d, at, posts[0]! + 1, 2, posts[1]! - 1, h - 2, 2);
    timber(d, at, posts[posts.length - 1]! - 1, 2, posts[posts.length - 2]! + 1, h - 2, 2);
  }
}

function villageHall(d: Draw, rng: Rng): void {
  // Ground floor on a rubble plinth.
  const lower = box(-56, 56, 0, 34, 0, 34);
  face(d, rng, (u, v) => P(lower.x1, lower.z0 + u, v), 34, 34, PLASTER, { finish: 'plaster', tone: 0.42 });
  const atL = frontAt(lower);
  const wallL = face(d, rng, atL, 112, 34, PLASTER, { finish: 'plaster', tone: 0 });
  face(d, rng, atL, 112, 8, '#b9ab90', { finish: 'rubble', tone: 0.12 });
  frame(d, (u, v) => atL(u, v + 8), 112, 26, [1, 21, 40, 72, 91, 111], (u) => u > 36 && u < 76, false);
  for (const u of [7, 26, 81, 100]) casement(d, atL, u, 15, 9, 12, u === 26 ? 0.35 : 0, false);
  // The jettied upper storey: joist ends under it and its shadow on the wall below.
  shadeOn(d, wallL, quad(atL, 0, 20, 116, 36), 0.42, 3);
  const upper = box(-58, 58, -3, 34, 34, 64);
  const atU = frontAt(upper);
  face(d, rng, (u, v) => P(upper.x1, upper.z0 + u, 34 + v), 37, 30, PLASTER, { finish: 'plaster', tone: 0.42 });
  const wallU = face(d, rng, atU, 116, 30, PLASTER, { finish: 'plaster', tone: -0.02 });
  frame(d, atU, 116, 30, [1, 19, 38, 78, 97, 115], (u) => (u > 4 && u < 16) || (u > 22 && u < 35) || (u > 81 && u < 94) || (u > 100 && u < 112), true);
  timber(d, atU, 38, 15, 78, 15, 2.2);
  for (const u of [6, 25, 84, 103]) {
    casement(d, atU, u, 9, 8, 12);
    flowerBox(d, rng, atU, u - 1, 6.6, 10);
  }
  for (let u = 2; u < 116; u += 6) {
    const j = crisp(quad(atU, u, -2.4, u + 2.6, 0), 1);
    flat(d, j, mix(OAK, LIGHT, 0.1), { tone: 0.15, line: 0.4 });
  }
  roofAndGable(d, rng, upper, wallU);
  belfry(d, rng, 0, 11);
  porch(d, rng, atL, wallL);
  noticeBoard(d, rng, -42, -12);
  atmosphere(d, -80, -170, 80, 10);
}

/** A window box under a casement, spilling geraniums. */
function flowerBox(d: Draw, rng: Rng, at: Surface, u: number, v: number, w: number): void {
  const { pen } = d;
  for (let i = 0; i < w * 1.4; i++) {
    const p = at(u + rng() * w, v + 1.2 + rng() * 2.6);
    pen.fill(blob(p, 1.3, 0.9, rng, 0.2, 8), rng() < 0.5 ? '#5f8f4e' : '#4a7340', 0.95);
  }
  for (let i = 0; i < w * 0.7; i++) {
    const p = at(u + 0.5 + rng() * (w - 1), v + 2 + rng() * 2.6);
    pen.dot(p.x, p.y, 0.75, rng() < 0.6 ? '#c8423a' : '#e07a6a', 1);
  }
  const b = crisp(quad(at, u - 0.6, v - 2.6, u + w + 0.6, v + 0.8), 2);
  flat(d, b, mix(OAK, LIGHT, 0.15), { tone: 0.05, line: 0.45 });
}

/** A rubble-stone chimney stack rising through the roof, capped and blackened at its mouth. */
function chimney(d: Draw, rng: Rng, x: number, z: number, foot: number, top: number): void {
  const b = box(x - 5, x + 5, z, z + 7, foot, top);
  face(d, rng, (u, v) => P(b.x1, b.z0 + u, foot + v), 7, top - foot, '#a8927a', { finish: 'ashlar', tone: 0.45, course: 3.4, stone: 5 });
  face(d, rng, frontAt(b), 10, top - foot, '#a8927a', { finish: 'ashlar', tone: 0.1, course: 3.4, stone: 5 });
  shadeOn(d, crisp(quad(frontAt(b), 0, 0, 10, top - foot), 2), quad(frontAt(b), -1, top - foot - 6, 11, top - foot + 1), 0.35, 2, '#2a2638');
  slab(d, box(x - 6.2, x + 6.2, z - 1.2, z + 8.2, top, top + 2.4), STONE);
  d.pen.fill(crisp([P(x - 4, z + 1, top + 2.4), P(x + 4, z + 1, top + 2.4), P(x + 4, z + 6, top + 2.4), P(x - 4, z + 6, top + 2.4)], 2), '#2a2638', 0.9);
}

/** The long shingled roof, the cross gable over the hall's great window, and the eaves' shadow on the upper storey. */
function roofAndGable(d: Draw, rng: Rng, upper: ReturnType<typeof box>, wallU: Pt[]): void {
  const atU = frontAt(upper);
  shadeOn(d, wallU, quad(atU, -2, 16, 120, 34), 0.42, 3);
  const roof = gableX(d, rng, upper, 40, ROOF_WOOD, PLASTER, SHINGLES, 4);
  castOn(d, roof, [P(43, 6, 84), P(43, 6, 110), P(33, 6, 110), P(33, 6, 84)], 9, 6, 0.32);
  chimney(d, rng, 38, 6, 84, 110);
  // The cross gable: its wall continues the upper storey's, its roof runs back into the main one.
  const cg = box(-20, 20, -3, 8, 34, 64);
  castOn(d, roof, [P(23, -6, 61.6), P(0, -6, 90), P(0, 8, 90), P(23, 8, 61.6)], 8, 4, 0.32);
  const at = gableZ(d, rng, cg, 26, ROOF_WOOD, PLASTER, SHINGLES, 3, 8);
  const tri = crisp([at(0, 0), at(40, 0), at(20, 26)], 3);
  d.pen.clipped(tri, () => {
    timber(d, at, 20, 0, 20, 26, 2.4);
    timber(d, at, 6, 8.5, 34, 8.5, 2.2);
    timber(d, at, 20, 9, 11, 16.5, 1.8);
    timber(d, at, 20, 9, 29, 16.5, 1.8);
    for (const u of [8, 14, 26, 32]) timber(d, at, u, 0.5, u, 8, 1.6);
  });
  shadeOn(d, tri, quad(at, -2, 18, 44, 30), 0.35, 2.5);
  casement(d, atU, 49, 6, 18, 17, 0.25);
  const ridgeTip = at(20, 26);
  d.pen.stroke([ridgeTip, pt(ridgeTip.x, ridgeTip.y - 6)], 0.8, d.ink, 0.9, false);
  d.pen.dot(ridgeTip.x, ridgeTip.y - 6.5, 1.2, GOLD, 1);
}

/** The porch before the door: oak posts with curved braces on a stone step, a little gabled roof with the Crown's shield. */
function porch(d: Draw, rng: Rng, atL: Surface, wallL: readonly Pt[]): void {
  door(d, atL, 47, 18, 25, { arched: true });
  castOn(d, wallL, [P(-17, -3, 30), P(20, -3, 30), P(0, -3, 46), P(-17, -3, 34)], 10, 9, 0.3);
  const p = box(-17, 17, -18, -3, 0, 30);
  slab(d, box(-18, 18, -20, -2, 0, 3), STONE, { line: 0.55 });
  for (const x of [-15, 15]) {
    beam(d, P(x, -17, 3), P(x, -17, 30), 3, OAK, 0.5);
    const inner = x < 0 ? 1 : -1;
    d.pen.stroke(bezier(P(x + inner * 1.5, -17, 23), P(x + inner * 2, -17, 29), P(x + inner * 8, -17, 29.5), 8), 1.6, OAK, 1, false);
  }
  timber(d, (u, v) => P(-17 + u, -17, v), 0, 30, 34, 30, 2.6);
  const at = gableZ(d, rng, p, 16, ROOF_WOOD, PLASTER, { row: 3.6, tab: 4 }, 3, -3);
  const tri = crisp([at(0, 0), at(34, 0), at(17, 16)], 3);
  d.pen.clipped(tri, () => { for (let u = 2; u < 34; u += 3.4) d.pen.hair([at(u, 0), at(u, 16)], 0.4, d.ink, 0.45); });
  const c = at(17, 6.5);
  const sh = [pt(c.x - 4, c.y - 4), pt(c.x + 4, c.y - 4), pt(c.x + 3.6, c.y + 1.5), pt(c.x, c.y + 4.6), pt(c.x - 3.6, c.y + 1.5)];
  paint(d, sh, BLUE, { shadow: 0.35, hatch: 0, line: 0.5 });
  d.pen.stroke(closed(sh.map((q) => pt(c.x + (q.x - c.x) * 0.72, c.y + (q.y - c.y) * 0.72))), 0.6, GOLD, 0.95, false);
  d.pen.dot(c.x, c.y - 0.4, 1.2, GOLD, 1);
}

// ---- Town hall ----

const TOWN_STONE = '#d6c096';
const SLATES = { row: 4, tab: 4.8 } as const;

/** The town hall's front: honey ashlar, quoined, two floors of arched windows, string courses and the Crown's banners. */
function townFront(d: Draw, rng: Rng, m: ReturnType<typeof box>): Pt[] {
  const at = frontAt(m);
  face(d, rng, (u, v) => P(m.x1, m.z0 + u, v), m.z1 - m.z0, m.h1, TOWN_STONE, { tone: 0.42 });
  const wall = face(d, rng, at, 144, m.h1, TOWN_STONE, { tone: 0.02 });
  quoins(d, at, 0, m.h1 - 4, 1, TOWN_STONE);
  quoins(d, at, 144, m.h1 - 4, -1, TOWN_STONE);
  for (const u of [10, 32, 100, 122]) {
    window(d, at, u, 9, 12, 18, TOWN_STONE, { key: true, transoms: 1, frame: 2.4 });
    window(d, at, u, 37, 12, 19, TOWN_STONE, { key: true, transoms: 2, frame: 2.4, lit: u === 32 ? 0.3 : 0 });
  }
  cornice(d, at, wall, 144, 32, 2.6, TOWN_STONE);
  cornice(d, at, wall, 144, 62, 4.5, TOWN_STONE);
  for (const u of [46, 90]) banner(d, at, u, 59, 8, 32);
  slab(d, box(m.x0 - 2, m.x1 + 2, m.z0 - 2, m.z0 + 0.5, 0, 6), mix(TOWN_STONE, '#8f8676', 0.3));
  return wall;
}

/** A dormer on the roof: a little stone face with a window under its own slate gable. */
function dormer(d: Draw, rng: Rng, x: number): void {
  const b = box(x - 7, x + 7, 0, 8, 56, 70);
  const at = frontAt(b);
  face(d, rng, at, 14, 14, TOWN_STONE, { tone: 0.02, course: 4.6, stone: 8 });
  window(d, at, 3.5, 2, 7, 9, TOWN_STONE, { frame: 1.6, transoms: 0, sill: false });
  gableZ(d, rng, b, 8, SLATE, TOWN_STONE, { row: 2.8, tab: 3.2 }, 1.6, 10);
}

/** The clock tower: quoined, the arched doorway up its steps, the Crown's shield, a tall window, the clock, the belfry and a slate spire. */
function clockTower(d: Draw, rng: Rng, wall: readonly Pt[], roof: readonly Pt[]): void {
  const t = box(-17, 17, -6, 22, 0, 118);
  const at = frontAt(t);
  castOn(d, wall, quad(at, 0, 0, 34, 80), 5, 3, 0.35, 2.5);
  castOn(d, roof, quad(at, 2, 60, 34, 118), 14, 6, 0.3, 3);
  face(d, rng, (u, v) => P(t.x1, t.z0 + u, v), t.z1 - t.z0, 118, TOWN_STONE, { tone: 0.42 });
  const tw = face(d, rng, at, 34, 118, TOWN_STONE, { tone: -0.02 });
  quoins(d, at, 0, 116, 1, TOWN_STONE, 6.4, 6);
  quoins(d, at, 34, 116, -1, TOWN_STONE, 6.4, 6);
  const up: Surface = (u, v) => at(u, v + 6);
  surround(d, up, 8, 0, 18, 27, 3, TOWN_STONE, true);
  door(d, up, 8, 18, 27, { arched: true });
  shield(d, at(17, 45), 5.5);
  window(d, at, 11, 54, 12, 20, TOWN_STONE, { key: true, transoms: 2, frame: 2.4 });
  cornice(d, at, tw, 34, 79, 2.6, TOWN_STONE);
  clock(d, at(17, 89.5), 9, TOWN_STONE);
  cornice(d, at, tw, 34, 101, 2.6, TOWN_STONE);
  for (const u of [7, 20]) {
    surround(d, at, u, 102, 7, 12, 1.6, TOWN_STONE, false);
    const hole = crisp([at(u, 102), ...Array.from({ length: 9 }, (_, i) => { const a = Math.PI - (i / 8) * Math.PI; return at(u + 3.5 + Math.cos(a) * 3.5, 110.5 + Math.sin(a) * 3.5); }), at(u + 7, 102)], 1.5);
    d.pen.fill(hole, '#2a2638', 0.95);
    d.pen.clipped(hole, () => { for (let v = 103.5; v < 113; v += 1.8) d.pen.stroke([at(u, v), at(u + 7, v + 0.6)], 0.7, mix(OAK, LIGHT, 0.2), 0.9, false); });
  }
  cornice(d, at, tw, 34, 118, 3.4, TOWN_STONE);
  steps(d, -14, 14, -16, 3, 6, 3.4, mix(TOWN_STONE, '#8f8676', 0.2), 1);
  const spire = hipRoof(d, rng, t, 46, 19, SLATE, SLATES, 2);
  for (const [x, z] of [[-17, -6], [17, -6], [17, 22]] as const) pinnacle(d, rng, x, z, 118, 4, 12, TOWN_STONE, SLATE);
  d.pen.stroke([spire.a, pt(spire.a.x, spire.a.y - 6)], 0.9, d.ink, 0.95, false);
  flag(d, pt(spire.a.x, spire.a.y - 5), 14, 17, 0.6);
}

function townHall(d: Draw, rng: Rng): void {
  const m = box(-72, 72, 0, 40, 0, 64);
  const wall = townFront(d, rng, m);
  const roof = hipRoof(d, rng, m, 34, 34, SLATE, SLATES, 3);
  for (const x of [-46, 46]) dormer(d, rng, x);
  clockTower(d, rng, wall, roof.front);
  atmosphere(d, -90, -190, 90, 10);
}

const townGround = (d: Draw, rng: Rng): void => {
  setBack(d, 10, () => groundCast(d, -72, 72, 0, 40, 30, 0.18));
  groundShadow(d, 4, 4, 92, 11, 0.24);
  apron(d, rng, -30, 30, 12, '#c9b48c');
};

const drawTown: TownDrawer = (ctx, seed) => sprite(ctx, seed, 0, { bounds: BOUNDS, line: 1.3, ground: townGround }, (d, rng) => setBack(d, 10, () => townHall(d, rng)));

const villageGround = (d: Draw, rng: Rng): void => {
  setBack(d, 14, () => groundCast(d, -56, 56, 0, 34, 26, 0.18));
  groundShadow(d, 2, 4, 74, 10, 0.24);
  apron(d, rng, -26, 26, 10);
};

const drawVillage: TownDrawer = (ctx, seed) => sprite(ctx, seed, 0, { bounds: BOUNDS, line: 1.3, ground: villageGround }, (d, rng) => setBack(d, 14, () => villageHall(d, rng)));

const grandGround = (half: number) => (d: Draw, rng: Rng): void => {
  setBack(d, 24, () => groundCast(d, -half, half, 0, 50, 30, 0.18));
  groundShadow(d, 4, -6, half + 16, 14, 0.24);
  apron(d, rng, -40, 40, 10, '#cdb995');
};

const drawCity: TownDrawer = (ctx, seed) => sprite(ctx, seed, 0, { bounds: BOUNDS, line: 1.3, ground: grandGround(112) }, cityHall);
const drawCapitol: TownDrawer = (ctx, seed) => sprite(ctx, seed, 0, { bounds: BOUNDS, line: 1.4, ground: grandGround(120) }, capitol);

export const HALLS: Readonly<Record<'hall-village' | 'hall-town' | 'hall-city' | 'hall-capitol' | 'guild-1' | 'guild-2', TownDrawer>> = {
  'hall-village': drawVillage,
  'hall-town': drawTown,
  'hall-city': drawCity,
  'hall-capitol': drawCapitol,
  ...GUILD,
};
