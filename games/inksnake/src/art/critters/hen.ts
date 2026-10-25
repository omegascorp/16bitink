import { createRng, type Rng } from '../../logic/rng';
import { polar } from '../groundKit';
import { bezier, cub, type Draw, pt, TAU } from '../kit';
import type { Pt } from '../pen';
import type { SpriteArt } from '../types';
import { type Blade, looseFeather, mapBlade, petalBlade, scalloped, shadowOf } from './birdKit';
import { hackles, henFeather, henFoot, henHead, type HenHead, henPlumage, henTail } from './birdHenParts';
import { buildWing, mapWing, mirrorY, type Wing } from './birdWing';
import { CRITTER_POSES, type CritterPose } from './poses';

/**
 * The farmyard hen, a russet layer, seen from above facing +x: plump and
 * round, laced mahogany feathers, golden hackles, a short dark tail, the red
 * comb and wattles. 'walk0'/'walk1' step a yellow foot out from under the
 * breast on alternate sides, the head bobbing; 'peck' stretches the neck and
 * points the head down at a scatter of grain; 'flap' throws the wings out,
 * feathers askew and flying, beak open in a squawk.
 */
type HenPose = CritterPose<'hen'>;

const SEED = 6151;

/** The body: a plump egg, broad across the middle. */
function egg(cx: number, rx: number, ry: number): Pt[] {
  return Array.from({ length: 44 }, (_, i) => {
    const a = (i / 44) * TAU;
    const c = Math.cos(a);
    return pt(cx + c * rx, Math.sin(a) * ry * (1 - 0.12 * Math.max(0, c) ** 2 - 0.1 * Math.max(0, -c) ** 2));
  });
}

const BODY = egg(-2, 17, 13);

interface FoldedWing {
  readonly primaries: Blade[];
  readonly secondaries: Blade[];
  readonly coverts: Pt[];
}

/** The folded wing along the +y flank: the flight feathers' dark-tipped ends at the rear, the covert patch over them. */
function foldedWing(mirror: boolean): FoldedWing {
  const f = (p: Pt): Pt => (mirror ? mirrorY(p) : p);
  const primaries = Array.from({ length: 4 }, (_, i) => petalBlade(pt(-3 - i * 1.3, 10.5 - i * 0.9), Math.PI - 0.06 + i * 0.07, 13 - i * 0.6, 5));
  const secondaries = Array.from({ length: 5 }, (_, i) => petalBlade(pt(5 - i * 2.4, 11.8 - i * 0.35), Math.PI + 0.04 + i * 0.03, 12.5 - i * 0.7, 5.6));
  const coverts = [
    ...cub(pt(10, 5), pt(11, 9.5), pt(7, 13.2), pt(0, 13.4), 10),
    ...cub(pt(0, 13.4), pt(-5, 13.4), pt(-8, 10.5), pt(-6.5, 6.5), 8).slice(1),
    ...bezier(pt(-6.5, 6.5), pt(2, 4.6), pt(10, 5), 6).slice(1, -1),
  ];
  return { primaries: primaries.map((b) => mapBlade(b, f)), secondaries: secondaries.map((b) => mapBlade(b, f)), coverts: coverts.map(f) };
}

function paintFolded(d: Draw, w: FoldedWing, rng: Rng): void {
  for (const f of w.primaries) henFeather(d, f, 5);
  for (const f of w.secondaries) henFeather(d, f, 5.6);
  henPlumage(d, w.coverts, rng, { n: 22, size: 3.2, line: 0.55 });
}

/** The flustered open wing: short and rounded, no fingers. */
function openWing(): Wing {
  const lead = [...cub(pt(4, 8), pt(8, 12), pt(10, 16), pt(9.5, 20), 8), ...cub(pt(9.5, 20), pt(9, 23), pt(7.5, 25.5), pt(5, 27), 8).slice(1)];
  const wrist = 0.55;
  return buildWing({
    lead,
    wrist,
    dir: (t) => (t < wrist ? Math.PI - 0.1 - (t / wrist) * 0.12 : Math.PI - 0.22 - ((t - wrist) / (1 - wrist)) ** 1.4 * 0.45),
    chord: (t) => (t < wrist ? 17 : 17 + ((t - wrist) / (1 - wrist)) * 3),
    secondaries: 8,
    primaries: 8,
    secW: 6.4,
    priW: 6.4,
    coverts: (t) => (t < wrist ? 0.58 : 0.58 - (t - wrist) * 0.5),
  });
}

/** A blade turned about its root by `a`: a feather knocked askew. */
function askew(b: Blade, a: number): Blade {
  const o = b.at(0, 0);
  const c = Math.cos(a);
  const s = Math.sin(a);
  return mapBlade(b, (p) => pt(o.x + (p.x - o.x) * c - (p.y - o.y) * s, o.y + (p.x - o.x) * s + (p.y - o.y) * c));
}

function paintOpen(d: Draw, w: Wing, rng: Rng, side: number): void {
  w.feathers.forEach((x, i) => henFeather(d, askew(x.f, side * (((i * 53) % 9) - 4) * 0.05), x.w));
  henPlumage(d, w.coverts, rng, { n: 34, size: 3.4, ruffle: 0.5, line: 0.95 });
}

/** A few grains and a scuffed mark where the beak strikes. */
function grain(d: Draw, at: Pt): void {
  for (const [a, r] of [[-1, 3.5], [0.4, 4.5], [1.4, 3.2], [2.6, 5]] as const) {
    const p = polar(at, a, r);
    d.pen.fill([pt(p.x - 0.9, p.y - 0.5), pt(p.x + 0.9, p.y - 0.6), pt(p.x + 0.8, p.y + 0.6), pt(p.x - 0.8, p.y + 0.5)], '#e0bf63', 1);
    d.pen.hair([pt(p.x - 0.9, p.y + 0.5), pt(p.x + 0.8, p.y + 0.6)], 0.4, d.ink, 0.8);
  }
  for (const a of [-0.6, 0.6]) d.pen.hair([polar(at, a, 1.6), polar(at, a, 2.8)], 0.45, d.ink, 0.7);
}

/** Ticks of fluster round the flapping wings. */
function fluster(d: Draw): void {
  for (const s of [-1, 1]) {
    for (const [x, y, a] of [[16, 33, -0.5], [-4, 40, 0.3], [6, 41, 0]] as const) {
      const p = pt(x, s * y);
      d.pen.hair([p, polar(p, s * (Math.PI / 2 + a), 3.5)], 0.6, d.ink, 0.65);
    }
  }
}

function draw(d: Draw, pose: HenPose): void {
  const rng = createRng(SEED);
  const flap = pose === 'flap';
  const peck = pose === 'peck';
  const step = pose === 'walk0' ? 1 : pose === 'walk1' ? -1 : 0;
  const head: HenHead = peck ? { c: pt(21.5, 0), r: 5, beak: 2.6 } : flap ? { c: pt(17.5, 0), r: 5.4, beak: 4.2, open: true } : { c: pt(step > 0 ? 18 : 16.6, 0), r: 5.4, beak: 4.2 };
  const neck = peck ? { c: pt(13, 0), rx: 9.5, ry: 7.4 } : { c: pt(head.c.x - 7.5, 0), rx: 8.5, ry: 8.6 };
  const body = flap ? scalloped(BODY, 3.4, 0.7) : BODY;
  const right = openWing();
  const wings = flap ? [right, mapWing(right, mirrorY)] : [];
  const folded = flap ? [] : [foldedWing(false), foldedWing(true)];
  shadowOf(d, [BODY, ...wings.map((w) => w.coverts), ...wings.flatMap((w) => w.feathers.map((x) => x.f.shape))], flap ? 4 : 2.4, flap ? 0.12 : 0.16);
  if (flap) {
    looseFeather(d, pt(-30, -30), 2.4, 9, (f, w) => henFeather(d, f, w));
    looseFeather(d, pt(30, 26), -0.6, 8, (f, w) => henFeather(d, f, w));
  }
  if (step !== 0) {
    henFoot(d, pt(11, step * 8.5), step * 0.25);
    henFoot(d, pt(-3, -step * 11), -step * 0.1);
  }
  if (peck) {
    henFoot(d, pt(7, 10), 0.3);
    henFoot(d, pt(7, -10), -0.3);
  }
  henTail(d, -13, peck ? 13 : 15, peck ? 11 : 9, flap ? 1 : 0);
  wings.forEach((w, i) => paintOpen(d, w, rng, i ? -1 : 1));
  henPlumage(d, body, rng, { n: 90, size: 4, ruffle: flap ? 0.6 : 0 });
  for (const w of folded) paintFolded(d, w, rng);
  hackles(d, rng, neck.c, neck.rx, neck.ry, flap ? 0.6 : 0);
  henHead(d, rng, head);
  if (peck) grain(d, pt(head.c.x + head.r * 0.85 + head.beak + 0.8, 0));
  if (flap) {
    fluster(d);
    looseFeather(d, pt(-26, 33), 1.2, 8, (f, w) => henFeather(d, f, w));
  }
}

/** The hen. */
export const HEN: SpriteArt<HenPose> = { frame: 96, res: 3, poses: CRITTER_POSES.hen, draw };
