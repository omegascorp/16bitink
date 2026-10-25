import { createRng, type Rng } from '../../logic/rng';
import { blob } from '../groundKit';
import { bezier, closed, type Draw, pt, TAU } from '../kit';
import type { Pt } from '../pen';
import type { SpriteArt } from '../types';
import { mix } from '../wash';
import { glaze } from '../critters/preyKit';

/**
 * The wildfire's front, seen from above as it sweeps along a lane (+x): a
 * band of flames about 70 across the path and 30 deep, each tongue leaning
 * forward in the wind, white-gold at its root through orange to red at its
 * ragged edges; grey smoke rolling back and curling off behind it; sparks
 * thrown ahead; and the scorched trail it leaves, charcoal and ash with
 * embers still glowing near the front. Two flicker phases ('flame0',
 * 'flame1'); the boil frame stirs the tongues a little.
 */
type Pose = 'flame0' | 'flame1';

const F = {
  char: '#2b2420',
  charWarm: '#4a3328',
  ash: '#8d8782',
  ashPale: '#c3bdb4',
  ember: '#e8692a',
  emberHot: '#ffb347',
  red: '#b8321f',
  redDeep: '#7c2116',
  orange: '#ea7a26',
  gold: '#f7b93c',
  yellow: '#fbe07a',
  white: '#fff6d6',
  smoke: '#6f6a66',
  smokeDeep: '#47423f',
  smokePale: '#b9b3ab',
  glow: '#f5a443',
} as const;

/** Half the band's width across the lane. */
const HALF = 35;

/** Where the front's flames stand at y: a little convex, rippling. */
const frontAt = (y: number, ph: number): number => 10 - 0.004 * y * y + 2.4 * Math.sin(y * 0.19 + ph) + 1.2 * Math.sin(y * 0.47 + ph * 2);

/** The scorched ground behind the front: charcoal, darkest at the front, ash patches, embers. */
function scorch(d: Draw, rng: Rng, ph: number): void {
  const { pen } = d;
  const edge = (y: number): number => frontAt(y, ph) - 6;
  const ys = Array.from({ length: 29 }, (_, i) => -HALF + (i / 28) * HALF * 2);
  // The burnt ground: overlapping charcoal blots, ragged at the sides, densest just behind the front.
  for (let i = 0; i < 34; i++) {
    const y = (rng() - 0.5) * HALF * 1.85;
    const back = rng() ** 0.8;
    const c = pt(edge(y) - 4 - back * 38, y);
    glaze(d, c.x, c.y, 6 + rng() * 5, 4 + rng() * 4, rng() * TAU, back < 0.35 ? F.charWarm : F.char, 0.42 * (1 - back * 0.6));
  }
  void ys;
  // Ash: pale grey patches, more of them further back where it has burnt out.
  for (let i = 0; i < 16; i++) {
    const c = pt(-46 + rng() * 44, (rng() - 0.5) * HALF * 1.7);
    const b = blob(c, 2 + rng() * 4, 1.4 + rng() * 2.4, rng, 0.4, 12, rng() * TAU);
    pen.fill(b, rng() < 0.5 ? F.ash : F.ashPale, 0.2 + rng() * 0.15);
  }
  // Charred stems and twigs lying across the trail.
  for (let i = 0; i < 14; i++) {
    const a = pt(-46 + rng() * 40, (rng() - 0.5) * HALF * 1.7);
    const ang = rng() * TAU;
    const l = 2 + rng() * 4;
    pen.hair([a, pt(a.x + Math.cos(ang) * l * 0.5 + 0.4, a.y + Math.sin(ang) * l * 0.5), pt(a.x + Math.cos(ang) * l, a.y + Math.sin(ang) * l)], 0.6, F.char, 0.7);
  }
  // Embers still glowing just behind the flames.
  for (let i = 0; i < 46; i++) {
    const y = (rng() - 0.5) * HALF * 1.9;
    const x = edge(y) - 2 - rng() ** 1.6 * 26;
    const hot = rng() < 0.35;
    pen.dot(x, y, 0.35 + rng() * 0.55, hot ? F.emberHot : F.ember, 0.45 + rng() * 0.45);
  }
  pen.stipple([pt(-46, -HALF), pt(edge(0), -HALF), pt(edge(0), HALF), pt(-46, HALF)], 240, (x) => Math.max(0, (x + 46) / 56) * 0.7, 0.4, F.char);
}

/** A rolling plume of smoke: overlapping puffs drifting back from the front along a curling path, paler and wider as they go. */
function smoke(d: Draw, rng: Rng, ph: number): void {
  const { pen } = d;
  for (let k = 0; k < 4; k++) {
    const y0 = -HALF * 0.75 + (k / 3) * HALF * 1.5 + (rng() - 0.5) * 6;
    // The outer plumes curl in towards the middle, so the smoke stays on the trail.
    const curl = (Math.abs(y0) > 8 ? -Math.sign(y0) : rng() < 0.5 ? -1 : 1) * (6 + rng() * 8);
    const path = [...bezier(pt(frontAt(y0, ph) - 10, y0), pt(-20, y0 + curl * 0.3), pt(-34, y0 + curl), 5)];
    // The plume's end curls round on itself.
    const e = path[path.length - 1]!;
    for (let j = 1; j <= 2; j++) path.push(pt(e.x - 4 * j, e.y + curl * 0.25 * j - Math.sign(curl) * 3 * j * j));
    path.forEach((c, i) => {
      const t = i / (path.length - 1);
      const r = 3.6 + t * 4.2 + rng() * 1.4;
      const puff = blob(c, r, r * (0.7 + rng() * 0.25), rng, 0.35, 16, rng() * TAU);
      const col = t < 0.25 ? F.smoke : F.smokePale;
      glaze(d, c.x + 1.2, c.y + 1.8, r * 1.2, r, 0, F.smokeDeep, 0.12 * (1 - t * 0.6));
      glaze(d, c.x, c.y, r * 1.15, r * 0.95, 0, col, 0.26 * (1 - t * 0.5));
      pen.fill(puff, col, 0.06);
      glaze(d, c.x - r * 0.35, c.y - r * 0.4, r * 0.6, r * 0.45, 0, '#e4dfd6', 0.3);
      // An ink curl round the billow's lit edge, the way a pen draws smoke.
      if (rng() < 0.6) {
        const a0 = Math.PI * (1 + rng() * 0.6);
        const arc = Array.from({ length: 7 }, (_, j) => {
          const a = a0 + (j / 6) * (1.6 + rng() * 0.3);
          const rr = r * (0.95 - j * 0.04);
          return pt(c.x + Math.cos(a) * rr, c.y + Math.sin(a) * rr * 0.85);
        });
        pen.hair(arc, 0.4, d.ink, 0.28 * (1 - t * 0.5));
      }
    });
  }
}

interface Flame {
  readonly root: Pt;
  readonly ang: number;
  readonly len: number;
  readonly w: number;
  readonly bend: number;
  readonly phase: number;
  /** A forked lick off its side: where along it, which way. */
  readonly fork: number;
}

/** The front's flames: a rank of tongues across the band leaning forward, longer in the middle, and a shorter rank behind. */
function flames(ph: number, f: number, phase: number): Flame[] {
  const rng = createRng(9500 + phase * 131);
  const make = (y: number, x: number, len: number, w: number): Flame => ({
    root: pt(x, y), ang: (rng() - 0.5) * 0.45 - y * 0.005 + (f - 1) * 0.05, len, w,
    bend: (rng() - 0.5) * 2.4, phase: rng() * TAU + f * 0.4, fork: rng() < 0.55 ? (rng() < 0.5 ? -1 : 1) : 0,
  });
  const back: Flame[] = [];
  for (let i = 0; i < 12; i++) {
    const y = -HALF + 4 + (i / 11) * (HALF * 2 - 8) + (rng() - 0.5) * 4;
    back.push(make(y, frontAt(y, ph) - 16 + rng() * 4, 8 + rng() * 6, 3.6 + rng() * 1.6));
  }
  const front: Flame[] = [];
  for (let i = 0; i < 15; i++) {
    const y = -HALF + 3 + (i / 14) * (HALF * 2 - 6) + (rng() - 0.5) * 4;
    const mid = 1 - Math.abs(y) / HALF;
    const tall = rng();
    front.push(make(y, frontAt(y, ph) - 10 + rng() * 5, 6 + mid * 8 + tall * tall * 16 + phase * (rng() - 0.4) * 5, 3.6 + tall * 3.4 + rng()));
  }
  return [...back, ...front];
}

/** The burning line itself: a ragged bed of fire across the band where the fuel is alight, white-hot along its middle. */
function bed(d: Draw, ph: number, rng: Rng): void {
  const ys = Array.from({ length: 31 }, (_, i) => -HALF + 1 + (i / 30) * (HALF * 2 - 2));
  // Each band thins to nothing at the ends of the front.
  const env = (y: number): number => Math.sqrt(Math.max(0, 1 - (y / HALF) ** 2));
  const band = (back: number, front: number, jit: number): Pt[] => {
    const mid = (back + front) / 2;
    const half = (back - front) / 2;
    return [
      ...ys.map((y) => pt(frontAt(y, ph) - mid + half * env(y) + (rng() - 0.5) * jit, y)),
      ...[...ys].reverse().map((y) => pt(frontAt(y, ph) - mid - half * env(y) + (rng() - 0.5) * jit, y)),
    ];
  };
  // Wet-in-wet heat round the bed, so the flames read as one burning mass.
  for (let i = 0; i < 9; i++) {
    const y = -HALF * 0.85 + (i / 8) * HALF * 1.7;
    glaze(d, frontAt(y, ph) - 8, y, 9, 6.5 * env(y) + 2, 0, F.orange, 0.55);
    glaze(d, frontAt(y, ph) - 8, y, 5, 3.5 * env(y) + 1, 0, F.gold, 0.6);
  }
  d.pen.fill(band(17, 3, 3), F.red, 0.75);
  d.pen.fill(band(15, 5, 2.4), F.orange, 0.85);
  d.pen.fill(band(13, 7, 2), F.gold, 0.75);
  for (let i = 0; i < 12; i++) {
    const y = -HALF * 0.8 + (i / 11) * HALF * 1.6;
    glaze(d, frontAt(y, ph) - 10, y, 2.6, 4.4 * env(y) + 0.5, 0, F.white, 0.75);
  }
}

/** The curve a tongue licks along: its S-curved spine. */
function lickPath(root: Pt, ang: number, len: number, bend: number, phase: number): Pt[] {
  const u = pt(Math.cos(ang), Math.sin(ang));
  const v = pt(-u.y, u.x);
  return Array.from({ length: 9 }, (_, i) => {
    const t = i / 8;
    const off = bend * len * (0.14 * Math.sin(Math.PI * t * 1.3 + phase) + 0.06 * Math.sin(Math.PI * t * 3.1 + phase * 2)) * t;
    return pt(root.x + u.x * len * t + v.x * off, root.y + u.y * len * t + v.y * off);
  });
}

/**
 * Paints one tongue as a brush would: a broad red stroke tapering to its
 * tip, orange laid wet inside it, a gold and white-hot core low down, and a
 * fine dark flick down its shadow side.
 */
function paintFlame(d: Draw, fl: Flame): void {
  const { pen } = d;
  const path = lickPath(fl.root, fl.ang, fl.len, fl.bend, fl.phase);
  const part = (k: number): Pt[] => lickPath(fl.root, fl.ang, fl.len * k, fl.bend, fl.phase);
  // Starting a little behind the root so the stroke's swell sits low on the tongue.
  const back = (pts: Pt[]): Pt[] => [pt(pts[0]!.x - Math.cos(fl.ang) * fl.w * 0.6, pts[0]!.y - Math.sin(fl.ang) * fl.w * 0.6), ...pts];
  pen.hair(back(path).map((p) => pt(p.x + 0.5, p.y + 0.7)), fl.w * 1.05, F.redDeep, 0.25);
  pen.hair(back(path), fl.w, F.red, 0.82);
  pen.hair(back(part(0.85)), fl.w * 0.72, F.orange, 0.85);
  pen.hair(back(part(0.6)), fl.w * 0.46, F.gold, 0.9);
  pen.hair(back(part(0.36)), fl.w * 0.26, F.yellow, 0.95);
  pen.hair(back(part(0.2)), fl.w * 0.14, F.white, 0.9);
  if (fl.fork) {
    // A lick forking off one side halfway up.
    const at = path[4]!;
    const lick = lickPath(at, fl.ang + fl.fork * 0.55, fl.len * 0.42, -fl.bend, fl.phase + 1);
    pen.hair(lick, fl.w * 0.5, F.red, 0.85);
    pen.hair(lickPath(at, fl.ang + fl.fork * 0.55, fl.len * 0.3, -fl.bend, fl.phase + 1), fl.w * 0.28, F.orange, 0.9);
  }
  const u = pt(Math.cos(fl.ang), Math.sin(fl.ang));
  const nrm = pt(-u.y, u.x);
  pen.hair(path.slice(2).map((p, i) => pt(p.x + nrm.x * fl.w * 0.32 * (1 - i / 7), p.y + nrm.y * fl.w * 0.32 * (1 - i / 7))), 0.3, mix(F.redDeep, d.ink, 0.35), 0.45);
}

/** Sparks: hot points and short streaks flung up and ahead of the front. */
function sparks(d: Draw, rng: Rng, ph: number): void {
  const { pen } = d;
  for (let i = 0; i < 26; i++) {
    const y = (rng() - 0.5) * HALF * 2.1;
    const x = frontAt(y, ph) + 4 + rng() * 22;
    const a = (rng() - 0.5) * 1.4;
    const l = 0.8 + rng() * 2.4;
    const col = rng() < 0.5 ? F.yellow : F.gold;
    if (rng() < 0.55) pen.hair([pt(x, y), pt(x + Math.cos(a) * l, y + Math.sin(a) * l)], 0.45, col, 0.9);
    else pen.dot(x, y, 0.35 + rng() * 0.4, col, 0.9);
  }
}

function draw(d: Draw, pose: Pose): void {
  const phase = pose === 'flame0' ? 0 : 1;
  const ph = phase * 1.7 + d.f * 0.25;
  const rng = createRng(9401 + phase * 11);
  scorch(d, createRng(9301), 0);
  // The glow the fire throws on the ground round it.
  glaze(d, frontAt(0, ph) + 2, 0, 34, HALF * 1.25, 0, F.glow, 0.32);
  glaze(d, frontAt(0, ph) - 4, 0, 18, HALF, 0, F.ember, 0.22);
  smoke(d, rng, ph);
  const all = flames(ph, d.f, phase);
  for (const fl of all.slice(0, 12)) paintFlame(d, fl);
  bed(d, ph, createRng(9450 + phase));
  for (const fl of all.slice(12)) paintFlame(d, fl);
  sparks(d, rng, ph);
  // A wisp of smoke over the front, lifting off the tallest flames.
  for (let i = 0; i < 4; i++) {
    const y = (rng() - 0.5) * HALF * 1.4;
    const c = pt(frontAt(y, ph) - 14 - rng() * 6, y);
    const puff = blob(c, 5 + rng() * 3, 3.5 + rng() * 2, rng, 0.3, 14, rng() * TAU);
    d.pen.fill(puff, F.smoke, 0.14);
    d.pen.hair(closed(puff).slice(8, 14), 0.35, d.ink, 0.22);
  }
}

export const WILDFIRE_ART: SpriteArt<Pose> = {
  frame: 120,
  res: 2,
  poses: ['flame0', 'flame1'],
  draw,
};
