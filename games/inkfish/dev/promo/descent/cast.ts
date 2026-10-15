import type { FishShape } from '../../../src/art/fishArt';
import type { CritterId } from '../../../src/art/critterArt';
import type { BirdId } from '../../../src/logic/birds';
import { createRng } from '../../../src/logic/rng';
import { clamp01, lerp, ramp } from '../short';
import { MEADOW, KELP_ROCKS, PLAIN_Y, POOL_Y, REEF, TRENCH_FLOOR_Y, WRECK } from './terrain';
import { sectionEnd, sectionStart, T } from './timeline';
import { cameraAt, LINE_M, RECORD_M, yAt } from './world';

/**
 * Everyone on screen during the dive, as functions of time: where each one
 * is (screen x, world y), which way it faces, when it bites or is eaten,
 * and when the narration names it (a ring and a label). Each section has
 * the zone's player fish from the game swimming with the camera, and the
 * animals the narrator names. The cold open's close-ups are in open.ts.
 */

export interface Place {
  /** Screen x, world y (world.ts), px. */
  readonly x: number;
  readonly y: number;
  readonly facing: 1 | -1;
  readonly tilt: number;
  /** Tail-beat phase and effort (0 calm .. 1 swimming hard). */
  readonly beat: number;
  readonly effort: number;
  /** 0 shut .. 1 gaping. */
  readonly jaw: number;
  readonly alpha: number;
  /** Jelly wobble (soft deep-sea bodies), 0 .. 1. */
  readonly wobble: number;
  /** The barreleye's eyes, 0 looking ahead .. 1 straight up through its head. */
  readonly eyesUp?: number;
}

export type Kind = 'fish' | 'critter' | 'bird';

export interface Actor {
  readonly id: string;
  readonly shape: FishShape | CritterId | BirdId;
  readonly kind: Kind;
  /** Body length on screen, px. */
  readonly length: number;
  /** On screen over [from, to); `place` is only asked inside it. */
  readonly from: number;
  readonly to: number;
  readonly place: (t: number) => Place;
  /** Glows with its own lights (deep-sea fish). */
  readonly glow?: boolean;
  /** Drawn with less colour (`saturate`, 1 full .. 0 grey), for the snapper as red light runs out. */
  readonly saturation?: (t: number) => number;
}

export interface Callout {
  readonly actor: string;
  readonly label: string;
  /** A second, smaller line under the label. */
  readonly note?: string;
  readonly from: number;
  readonly to: number;
}

export interface Bite {
  readonly t: number;
  readonly eater: string;
  readonly prey: string;
  /** 'crunch' for shells and coral (urchin, the parrotfish's coral). */
  readonly sound: 'eat' | 'crunch' | 'miss';
}

const CENTRE = 540;
/** World y that is at screen height `sy` when the camera is where it is at time t. */
const onScreenAt = (t: number, sy: number): number => cameraAt(t) + sy - CENTRE;

const still = (x: number, y: number, facing: 1 | -1, t: number, extra: Partial<Place> = {}): Place => ({
  x, y, facing, tilt: 0, beat: t * 2 * Math.PI * 1.2, effort: 0.3, jaw: 0, alpha: 1, wobble: 0, ...extra,
});

/** A fish cruising at `vx` px/s past (x0, y) at time t0, bobbing gently. */
function cruise(x0: number, y: number, vx: number, t0: number, bob = 8, seed = 0): (t: number) => Place {
  return (t) => ({
    x: x0 + vx * (t - t0),
    y: y + bob * Math.sin(t * 1.3 + seed),
    facing: vx < 0 ? -1 : 1,
    tilt: 0.04 * Math.sin(t * 0.9 + seed),
    beat: 2 * Math.PI * (1 + Math.abs(vx) / 120) * t + seed,
    effort: Math.min(1, 0.25 + Math.abs(vx) / 300),
    jaw: 0,
    alpha: 1,
    wobble: 0,
  });
}

/** The zone's player fish, swimming with the camera around a screen spot, wandering a little. */
function player(cx: number, cy: number, seed: number): (t: number) => Place {
  return (t) => ({
    x: cx + 40 * Math.sin(t * 0.37 + seed) + 18 * Math.sin(t * 0.91 + seed * 2),
    y: onScreenAt(t, cy + 16 * Math.sin(t * 0.53 + seed)),
    facing: Math.cos(t * 0.37 + seed) > -0.6 ? 1 : -1,
    tilt: 0.05 * Math.sin(t * 0.7 + seed),
    beat: 2 * Math.PI * 1.6 * t + seed,
    effort: 0.4,
    jaw: 0,
    alpha: 1,
    wobble: 0,
  });
}

/** How the relay between zones moves: the leaver's acceleration and climb (px/s²); the arriver's run-in and rise (px, over s). */
const LEAVE_ACCEL = 320;
const LEAVE_CLIMB = 90;
const ARRIVE_PX = 360;
const ARRIVE_RISE = 300;
const ARRIVE_S = 1.2;

/**
 * Leaving its zone: from `at` the fish stops keeping up with the camera, so
 * it stays at its own depth while the camera sinks past it, and it swims
 * off ahead of itself, climbing a little.
 */
function leaving(place: (t: number) => Place, at: number): (t: number) => Place {
  return (t) => {
    if (t <= at) return place(t);
    const p0 = place(at);
    const d = t - at;
    const go = ramp(t, at, at + 0.6);
    return {
      ...place(t),
      x: p0.x + p0.facing * LEAVE_ACCEL * d * d,
      y: p0.y - LEAVE_CLIMB * d * d,
      facing: p0.facing,
      tilt: p0.tilt + 0.22 * go,
      effort: Math.max(p0.effort, go),
    };
  };
}

/**
 * Arriving in its zone: before `at` the fish waits at its own depth (the
 * camera sinks down to it), then swims up and in from behind, slowing
 * into its place at `at`.
 */
function arriving(place: (t: number) => Place, at: number): (t: number) => Place {
  return (t) => {
    if (t >= at) return place(t);
    const p1 = place(at);
    const d = at - t;
    const u = Math.min(1, d / ARRIVE_S);
    // Eased in (still at `at`), and at a steady speed before the easing starts.
    const run = (px: number): number => px * u * u + Math.max(0, d - ARRIVE_S) * (2 * px) / ARRIVE_S;
    return {
      ...place(t),
      x: p1.x - p1.facing * run(ARRIVE_PX),
      y: p1.y + run(ARRIVE_RISE),
      facing: p1.facing,
      tilt: p1.tilt + 0.35 * u,
      effort: Math.max(p1.effort, 0.4 + 0.6 * u),
    };
  };
}

/** In from the dark over `fade` s from `from`, and back into it by `to`: 0 .. 1. */
const outOfDark = (t: number, from: number, to: number, fade = 1): number => ramp(t, from, from + fade) * (1 - ramp(t, to - fade, to));

/** A zone's player fish over its stop: arriving at `arrive` (if given) and leaving at `leave` (if given). */
function relay(place: (t: number) => Place, arrive?: number, leave?: number): (t: number) => Place {
  const arrived = arrive === undefined ? place : arriving(place, arrive);
  return leave === undefined ? arrived : leaving(arrived, leave);
}
/** Before the camera starts down to a stop, the next fish is already there, out of the picture; the last one stays until it has swum out of it. */
const ARRIVER_LEAD = 1;
const LEAVER_TAIL = 2.5;

/**
 * Darts: the fish leaves its path to snap at a target around time `t`
 * (mouth on the target then), and drifts back after. Several in a row.
 */
interface Dart { readonly t: number; readonly target: () => { readonly x: number; readonly y: number }; readonly reach: number; readonly miss?: boolean }

function withDarts(base: (t: number) => Place, length: number, darts: readonly Dart[]): (t: number) => Place {
  return (t) => {
    const p = base(t);
    // Each dart pulls the fish from wherever the earlier ones left it, so one leads smoothly into the next.
    let x = p.x;
    let y = p.y;
    let facing = p.facing;
    let effort = p.effort;
    let jaw = p.jaw;
    let pull = 0;
    for (const d of darts) {
      const go = ramp(t, d.t - 0.55, d.t - 0.04);
      const w = go * (1 - ramp(t, d.t + 0.35, d.t + 1.6));
      if (w <= 0) continue;
      const aim = d.target();
      const from = base(d.t - 0.55);
      const side: 1 | -1 = aim.x >= from.x ? 1 : -1;
      // The body centre sits behind the mouth.
      x += (aim.x - side * length * 0.42 - x) * w;
      y += (aim.y - y) * w;
      if (w > pull && (go < 1 || t < d.t + 0.5)) facing = side;
      pull = Math.max(pull, w);
      effort = Math.max(effort, w);
      jaw = Math.max(jaw, 1 - Math.abs(t - (d.t - 0.08)) / 0.22);
    }
    return { ...p, x, y, facing, effort, jaw: Math.max(0, jaw), beat: p.beat + 4 * Math.PI * pull };
  };
}

/** A school: `n` fish of one kind around a centre path, each offset and out of step. */
function school(
  id: string, shape: FishShape, n: number, length: number, from: number, to: number, centre: (t: number) => { x: number; y: number; vx: number }, spread: { x: number; y: number }, seed: number,
): Actor[] {
  const rng = createRng(seed);
  return Array.from({ length: n }, (_, i) => {
    const ox = (rng() - 0.5) * spread.x;
    const oy = (rng() - 0.5) * spread.y;
    const ph = rng() * 6;
    const size = length * (0.85 + rng() * 0.3);
    return {
      id: `${id}${i}`, shape, kind: 'fish' as const, length: size, from, to,
      place: (t: number): Place => {
        const c = centre(t);
        return {
          x: c.x + ox + 14 * Math.sin(t * 1.1 + ph),
          y: c.y + oy + 10 * Math.sin(t * 0.8 + ph * 2),
          facing: c.vx < 0 ? -1 : 1,
          tilt: 0.06 * Math.sin(t * 1.4 + ph),
          beat: 2 * Math.PI * 2.4 * t + ph,
          effort: 0.5,
          jaw: 0,
          alpha: 1,
          wobble: 0,
        };
      },
    };
  });
}

/** Where an actor's mouth is (screen x, world y): for darting at it. */
export function mouthAt(a: Actor, t: number): { x: number; y: number } {
  const p = a.place(t);
  return { x: p.x + p.facing * Math.cos(p.tilt) * 0.42 * a.length, y: p.y - Math.sin(p.tilt) * 0.42 * a.length };
}

// ---------------------------------------------------------------- the sections

const s = sectionStart;
const e = sectionEnd;
const ACTORS: Actor[] = [];
const CALLOUTS: Callout[] = [];
const BITES: Bite[] = [];
/** A hand-inked "!" over an animal that has seen trouble coming, from `at` for half a second. */
const EXCLAIMS: { readonly actor: string; readonly at: number }[] = [];
const add = (...a: Actor[]): void => void ACTORS.push(...a);
const byId = (id: string): Actor => {
  const a = ACTORS.find((x) => x.id === id);
  if (!a) throw new Error(`No actor ${id}`);
  return a;
};
/** Where an actor's body is at its own time: a target to bite. */
const targetOf = (id: string, at: number) => (): { x: number; y: number } => {
  const p = byId(id).place(at);
  return { x: p.x, y: p.y };
};

// 1 · tide pool ---------------------------------------------------------
{
  const from = T.puddle;
  const to = e(1) + 1.2;
  const minnows = school('minnow', 'minnow', 7, 62, from, to, (t) => ({ x: 1180 - 22 * (t - from), y: POOL_Y - 330, vx: -22 }), { x: 420, y: 180 }, 11);
  add(...minnows);
  const bites = [
    { t: T.food + 0.45, prey: 'minnow2' },
    { t: T.food + 1.35, prey: 'minnow5' },
    { t: T.eatSmaller + 0.5, prey: 'minnow0' },
  ];
  const base = player(760, 560, 1);
  const inkling: Actor = {
    id: 'inkling', shape: 'inkling', kind: 'fish', length: 110, from, to,
    place: withDarts(base, 110, [
      ...bites.map((b) => ({ t: b.t, target: targetOf(b.prey, b.t), reach: 1 })),
    ]),
  };
  // The perch lunges as "bigger" is said; the inkling darts up and away, and the perch's jaws close on nothing.
  const lungeAt = T.bigger + 0.1;
  const inklingDodge = (t: number): Place => {
    const p = inkling.place(t);
    const u = ramp(t, lungeAt - 0.55, lungeAt - 0.1);
    return { ...p, x: p.x - 70 * u, y: p.y - 260 * u, facing: u > 0.05 ? -1 : p.facing, tilt: p.tilt + 0.5 * Math.sin(Math.PI * u), effort: Math.max(p.effort, u) };
  };
  EXCLAIMS.push({ actor: 'inkling', at: lungeAt - 0.85 });
  add({ ...inkling, to: s(2) + LEAVER_TAIL, place: leaving(inklingDodge, e(1)) });
  // It swims in from the left, reaching the inkling's side just as it lunges.
  const perchFrom = T.dontGetEaten - 1;
  const perchBase = cruise(-220, POOL_Y - 300, (440 + 220) / (lungeAt - perchFrom), perchFrom);
  add({
    id: 'perch', shape: 'perch', kind: 'fish', length: 260, from: perchFrom, to,
    place: withDarts(perchBase, 260, [{ t: lungeAt, target: () => { const p = base(lungeAt); return { x: p.x, y: p.y }; }, reach: 1, miss: true }]),
  });
  for (const b of bites) {
    BITES.push({ t: b.t, eater: 'inkling', prey: b.prey, sound: 'eat' });
    const m = minnows.find((x) => x.id === b.prey)!;
    ACTORS.splice(ACTORS.indexOf(m), 1, { ...m, to: b.t });
  }
  BITES.push({ t: lungeAt, eater: 'perch', prey: '', sound: 'miss' });
  add({ id: 'gull', shape: 'gull', kind: 'bird', length: 170, from: T.food - 1, to: T.food + 8, place: (t) => still(2100 - 260 * (t - (T.food - 1)), -150 + 12 * Math.sin(t * 2), -1, t) });
  add({ id: 'crab', shape: 'shorecrab', kind: 'critter', length: 110, from, to, place: (t) => still(1300 + 9 * (t - from), POOL_Y - 34, 1, t) });
  add({ id: 'winkle', shape: 'periwinkle', kind: 'critter', length: 70, from, to, place: (t) => still(1040 + 1.2 * (t - from), POOL_Y - 26, -1, t) });
}

// 2 · seagrass -------------------------------------------------------------
{
  const from = e(1);
  const to = e(2) + 1.2;
  add({ id: 'goby', shape: 'goby', kind: 'fish', length: 130, from: from - ARRIVER_LEAD, to: s(3) + LEAVER_TAIL, place: relay(player(720, 520, 2), s(2), e(2)) });
  add(...school('lance', 'sandlance', 9, 95, from, to, (t) => ({ x: 1700 - 70 * (t - from), y: onScreenAt(s(2) + 4, 360), vx: -70 }), { x: 380, y: 110 }, 21));
  add({ id: 'pipefish', shape: 'pipefish', kind: 'fish', length: 180, from, to, place: (t) => still(1290, MEADOW.y - 210 + 10 * Math.sin(t * 0.8), 1, t, { tilt: 1.25, effort: 0.15 }) });
  CALLOUTS.push({ actor: 'pipefish', label: 'pipefish', note: 'dad carries the eggs', from: T.pipefish, to: e(2) - 0.2 });
}

// 3 · kelp -----------------------------------------------------------------
{
  const from = e(2);
  const to = e(3) + 1.2;
  add({ id: 'perchfry', shape: 'perchfry', kind: 'fish', length: 140, from: from - ARRIVER_LEAD, to: s(4) + LEAVER_TAIL, place: relay(player(680, 470, 3), s(3), e(3)) });
  add({ id: 'garibaldi', shape: 'garibaldi', kind: 'fish', length: 200, from, to, place: cruise(1600, KELP_ROCKS.y - 620, -18, s(3), 10, 1) });
  add({ id: 'kelpfish', shape: 'kelpfish', kind: 'fish', length: 190, from, to, place: (t) => still(1125, KELP_ROCKS.y - 860 + 14 * Math.sin(t * 0.6), -1, t, { tilt: -1.3, effort: 0.1 }) });
  const urchinAt = { x: 1210, y: KELP_ROCKS.y - 30 };
  const crack = T.cracks + 0.55;
  add({ id: 'urchin', shape: 'urchin', kind: 'critter', length: 80, from, to: crack, place: (t) => still(urchinAt.x, urchinAt.y, 1, t) });
  const sheepBase = cruise(2150, KELP_ROCKS.y - 300, -260, T.sheephead - 3.2, 6, 2);
  const sheepPath = (t: number): Place => {
    const p = sheepBase(t);
    // It slows to a hover over the boulders before it strikes.
    const x = Math.max(p.x, 1390);
    return { ...p, x, effort: x > 1390 ? p.effort : 0.25 };
  };
  add({
    id: 'sheephead', shape: 'sheephead', kind: 'fish', length: 330, from: T.sheephead - 3.3, to,
    place: withDarts(sheepPath, 330, [{ t: crack, target: () => urchinAt, reach: 1 }]),
  });
  CALLOUTS.push({ actor: 'sheephead', label: 'California sheephead', note: 'eats sea urchins', from: T.sheephead, to: crack - 0.6 });
  BITES.push({ t: crack, eater: 'sheephead', prey: 'urchin', sound: 'crunch' });
}

// 4 · reef -----------------------------------------------------------------
{
  const from = e(3);
  const to = e(4) + 1.2;
  add({ id: 'butterfly', shape: 'butterfly', kind: 'fish', length: 150, from: from - ARRIVER_LEAD, to: s(5) + LEAVER_TAIL, place: relay(player(640, 460, 4), s(4), e(4)) });
  add(...school('chromis', 'chromis', 10, 58, from, to, (t) => ({ x: 1480 + 30 * Math.sin(t * 0.3), y: REEF.y - 300, vx: Math.cos(t * 0.3) >= 0 ? 1 : -1 }), { x: 360, y: 140 }, 41));
  add({ id: 'clown', shape: 'clownfish', kind: 'fish', length: 100, from, to, place: (t) => still(1640 + 30 * Math.sin(t * 0.9), REEF.y - 150 + 12 * Math.sin(t * 1.3), Math.cos(t * 0.9) > 0 ? 1 : -1, t) });
  const coralAt = { x: 1225, y: REEF.y - 120 };
  const grind = T.grinds + 0.5;
  const parrotBase = cruise(1700, REEF.y - 360, -38, T.parrotfish - 3, 8, 3);
  add({
    id: 'parrotfish', shape: 'parrotfish', kind: 'fish', length: 290, from, to,
    place: withDarts(parrotBase, 290, [{ t: grind, target: () => coralAt, reach: 1 }, { t: grind + 1.6, target: () => ({ x: coralAt.x + 40, y: coralAt.y - 10 }), reach: 1 }]),
  });
  CALLOUTS.push({ actor: 'parrotfish', label: 'parrotfish', note: 'grinds coral into sand', from: T.parrotfish, to: T.sand + 0.8 });
  BITES.push({ t: grind, eater: 'parrotfish', prey: '', sound: 'crunch' }, { t: grind + 1.6, eater: 'parrotfish', prey: '', sound: 'crunch' });
}

/** The parrotfish's sand: white grains streaming from behind it, falling, from "sand" on. */
export const SAND = { from: T.sand - 0.2, to: e(4) + 1.2, actor: 'parrotfish' } as const;

// 5 · wreck ----------------------------------------------------------------
{
  const from = e(4);
  const to = e(5) + 1.2;
  add({ id: 'tuna', shape: 'tuna', kind: 'fish', length: 250, from: from - ARRIVER_LEAD, to: s(6) + LEAVER_TAIL, place: relay(player(600, 450, 5), s(5), e(5)) });
  add(...school('sweeper', 'sweeper', 12, 70, from, to, (t) => ({ x: 1330 + 40 * Math.sin(t * 0.25), y: WRECK.y - 330, vx: Math.cos(t * 0.25) >= 0 ? 1 : -1 }), { x: 520, y: 150 }, 51));
  const drain = (t: number): number => 1 - 0.92 * ramp(t, T.redLight, T.grey + 0.4);
  add({ id: 'snapper', shape: 'snapper', kind: 'fish', length: 270, from, to: s(6) + LEAVER_TAIL, place: cruise(860, onScreenAt(T.snapper, 700), 22, T.snapper, 8, 5), saturation: drain });
  CALLOUTS.push({ actor: 'snapper', label: 'red snapper', note: 'red, but not down here', from: T.snapper, to: e(5) - 0.2 });
}

// 6 · drop-off -------------------------------------------------------------
{
  const from = e(5);
  const to = T.game + 1;
  add({ id: 'mako', shape: 'mako', kind: 'fish', length: 360, from: from - ARRIVER_LEAD, to, place: relay(player(620, 470, 6), s(6)) });
  add(...school('mackerel', 'mackerel', 8, 130, from, to, (t) => ({ x: 2100 - 120 * (t - s(6)), y: onScreenAt(s(6) + 6, 760), vx: -120 }), { x: 500, y: 160 }, 61));
}

// 8 · twilight -------------------------------------------------------------
{
  const from = T.lightsOff + 2;
  const to = e(8) + 1.2;
  add({ id: 'lanternfish', shape: 'lanternfish', kind: 'fish', length: 150, from, to: s(9) + LEAVER_TAIL, glow: true, place: relay(player(700, 520, 8), undefined, e(8)) });
  // Everyone keeping pace with the camera here stays in the twilight zone when it sinks on.
  add(...school('bristle', 'bristlemouth', 9, 70, from, to, (t) => ({ x: 1500 - 15 * (t - from), y: onScreenAt(t, 300), vx: -15 }), { x: 520, y: 160 }, 81)
    .map((a) => ({ ...a, glow: true, to: s(9) + LEAVER_TAIL, place: leaving(a.place, e(8)) })));
  const turn = (t: number): number => ramp(t, T.turn - 0.2, T.turn + 0.8) * (1 - ramp(t, T.lanternfish - 0.6, T.lanternfish + 0.4));
  add({
    id: 'barreleye', shape: 'barreleye', kind: 'fish', length: 300, from: T.barreleye - 3, to: s(9) + LEAVER_TAIL,
    // Its body stays level: the eyes turn inside the clear head.
    place: leaving((t) => still(1360 - 10 * (t - T.barreleye), onScreenAt(t, 600) + 8 * Math.sin(t * 0.7), -1, t, { eyesUp: turn(t), effort: 0.15, alpha: ramp(t, T.barreleye - 3, T.barreleye - 2) }), e(8)),
  });
  CALLOUTS.push({ actor: 'barreleye', label: 'barreleye', note: 'see-through head', from: T.barreleye, to: T.lanternfish - 0.4 });
}

/** The lanternfish rising past the camera: the nightly migration. */
export const MIGRATION = { from: T.lanternfish - 0.4, to: e(8) + 1.2, count: 46 } as const;
{
  const rng = createRng(83);
  for (let i = 0; i < MIGRATION.count; i++) {
    const x = 1000 + rng() * 820;
    const start = MIGRATION.from + rng() * 9;
    const speed = 210 + rng() * 120;
    const len = 80 + rng() * 50;
    const ph = rng() * 6;
    add({
      // Each one until it has risen out of the top of the picture.
      id: `riser${i}`, shape: 'lanternfish', kind: 'fish', length: len, from: start, to: start + (1200 + len) / speed, glow: true,
      place: (t) => ({
        x: x + 30 * Math.sin(t * 1.2 + ph), y: onScreenAt(t, 1200) - speed * (t - start), facing: i % 3 === 0 ? -1 : 1,
        tilt: 1.15, beat: 2 * Math.PI * 2.6 * t + ph, effort: 0.8, jaw: 0, alpha: 1, wobble: 0,
      }),
    });
  }
}

// 9 · midnight -------------------------------------------------------------
const softFrom = T.notice;
const soft = (t: number): number => ramp(t, softFrom, softFrom + 1) * (1 - ramp(t, T.holdOn + 1, T.holdOn + 2));
{
  const from = e(8) + 0.2;
  const to = e(9) + 1.2;
  const viper = relay(player(640, 520, 9), s(9), e(9));
  add({ id: 'viperfish', shape: 'viperfish', kind: 'fish', length: 320, from: e(8) - ARRIVER_LEAD, to: s(10) + LEAVER_TAIL, glow: true, place: (t) => ({ ...viper(t), wobble: soft(t) }) });
  CALLOUTS.push({ actor: 'viperfish', label: 'viperfish', note: 'fangs too long to fit inside', from: T.viperfish, to: T.fangtooth - 0.2 });
  // The deep's animals keep pace with the camera as it sinks: they'd drift out of the picture otherwise.
  const devilAt = { x: 1420, sy: 500 };
  const swallow = T.swallows + 0.35;
  add({
    // It's waiting below when the camera comes down, and dims back into the dark before the fangtooth swims in where it was.
    id: 'seadevil', shape: 'seadevil', kind: 'fish', length: 330, from: e(8) - ARRIVER_LEAD, to: T.fangtooth - 1.6,
    place: arriving((t) => {
      const jaw = Math.max(0, 1 - Math.abs(t - (swallow - 0.08)) / 0.22);
      return { ...still(devilAt.x, onScreenAt(t, devilAt.sy) + 6 * Math.sin(t * 0.5), -1, t, { effort: 0.1, jaw }), alpha: 1 - ramp(t, T.fangtooth - 2.8, T.fangtooth - 1.6) };
    }, s(9)),
  });
  CALLOUTS.push({ actor: 'seadevil', label: 'black seadevil', note: 'an anglerfish', from: T.seadevil, to: T.viperfish - 0.3 });
  // A curious little fish comes to look at the lure, and doesn't leave.
  add({
    id: 'curious', shape: 'bigscale', kind: 'fish', length: 90, from: T.seadevil, to: swallow,
    place: (t) => {
      const u = ramp(t, T.seadevil, swallow - 0.1);
      return { ...still(lerp(980, devilAt.x - 230, u), onScreenAt(t, devilAt.sy - 120 + 30 * (1 - u)), 1, t, { effort: 0.3 }), alpha: ramp(t, T.seadevil, T.seadevil + 0.8) };
    },
  });
  BITES.push({ t: swallow, eater: 'seadevil', prey: 'curious', sound: 'eat' });
  add({
    id: 'fangtooth', shape: 'fangtooth', kind: 'fish', length: 230, from: T.fangtooth - 1.6, to: s(10) + LEAVER_TAIL,
    place: leaving((t) => ({ ...cruise(2100, 0, -260, T.fangtooth - 1.6, 6, 9)(t), x: Math.max(1290, 2100 - 260 * (t - (T.fangtooth - 1.6))), y: onScreenAt(t, 720) + 6 * Math.sin(t * 1.3), wobble: soft(t) }), e(9)),
  });
  CALLOUTS.push({ actor: 'fangtooth', label: 'fangtooth', note: 'sockets for its fangs', from: T.fangtooth, to: T.notice - 0.2 });
}

/** "Soft · watery · weak bones · no air": the labels that come up one by one from "notice something". */
export const SOFT_WORDS = [
  { text: 'soft', at: T.soft },
  { text: 'watery bodies', at: T.soft + 0.82 },
  { text: 'weak bones', at: T.soft + 1.96 },
  { text: 'no air inside', at: T.soft + 3.1 },
] as const;
export const SOFT_UNTIL = T.holdOn + 1.2;

// 10 · abyss ---------------------------------------------------------------
/** The loosejaw's red searchlight: on from when it's named, sweeping, lighting a shrimp from "searchlight". */
export const BEAM = { from: T.loosejaw - 0.3, to: e(10) + 1.2, actor: 'loosejaw', shrimp: 'shrimp', reveal: T.searchlight - 0.8 } as const;
{
  const from = e(9) + 0.2;
  const to = e(10) + 1.4;
  /** On the plain: still there until the camera has sunk into the trench below it. */
  const plainTo = T.pressureWins;
  const loosejaw = (t: number): Place => ({ ...player(560, 470, 10)(t), facing: 1 });
  add({ id: 'loosejaw', shape: 'loosejaw', kind: 'fish', length: 270, from: e(9) - ARRIVER_LEAD, to: e(10) + 3, glow: true, place: relay(loosejaw, s(10), e(10)) });
  CALLOUTS.push({ actor: 'loosejaw', label: 'stoplight loosejaw', note: 'red light, invisible to its prey', from: T.loosejaw, to: T.searchlight - 0.5 });
  // Everything on the mud stands on the plain either side of the trench's mouth.
  add({ id: 'tripod', shape: 'tripodfish', kind: 'fish', length: 230, from, to: plainTo, place: (t) => still(1650, PLAIN_Y - 66, -1, t, { effort: 0.05 }) });
  CALLOUTS.push({ actor: 'tripod', label: 'tripodfish', note: 'stands on its fins', from: T.tripodfish, to: T.rememberRedLight - 0.3 });
  add({ id: 'seapig0', shape: 'seapig', kind: 'critter', length: 120, from, to: plainTo, place: (t) => still(150 + 1.5 * (t - from), PLAIN_Y - 30, 1, t) });
  add({ id: 'seapig1', shape: 'seapig', kind: 'critter', length: 100, from, to: plainTo, place: (t) => still(1850 - 1.5 * (t - from), PLAIN_Y - 26, -1, t) });
  add({ id: 'rattail', shape: 'rattail', kind: 'fish', length: 280, from, to: plainTo, glow: true, place: cruise(1800, PLAIN_Y - 420, -16, from, 10, 4) });
  add({ id: 'shrimp', shape: 'shrimp', kind: 'critter', length: 90, from: T.loosejaw, to: plainTo, place: (t) => still(1060 - 4 * (t - T.loosejaw), onScreenAt(T.loosejaw, 520) + 10 * Math.sin(t * 1.7), -1, t, { alpha: ramp(t, T.loosejaw, T.loosejaw + 0.8) }) });
}

// 11 · trench --------------------------------------------------------------
{
  // The trench's fish keep between its walls, and come out of the dark (and go back into it) rather than popping in.
  const fromDark = (t: number, from: number, to: number): number => ramp(t, from, from + 1.2) * (1 - ramp(t, to - 1.2, to));
  const cuskFrom = s(11) + 4;
  add({ id: 'cuskeel', shape: 'cuskeel', kind: 'fish', length: 320, from: cuskFrom, to: T.invisible, glow: false, place: (t) => ({ ...cruise(1250, 0, -20, cuskFrom, 10, 6)(t), y: onScreenAt(t, 640) + 10 * Math.sin(t * 1.3), wobble: ramp(t, T.rememberSoft, T.rememberSoft + 0.8) * (1 - ramp(t, T.invisible - 1.2, T.invisible - 0.2)), alpha: fromDark(t, cuskFrom, T.invisible) }) });
  CALLOUTS.push({ actor: 'cuskeel', label: 'no air inside', note: 'nothing to crush', from: T.nothingToCrush - 0.6, to: T.invisible - 0.2 });
  add({ id: 'faceless', shape: 'facelesscusk', kind: 'fish', length: 280, from: T.around8200 - 8, to: T.lowered, place: (t) => ({ ...cruise(720, 0, 15, T.around8200 - 8, 10, 7)(t), y: onScreenAt(t, 880), alpha: fromDark(t, T.around8200 - 8, T.lowered) }) });
}

/** The lander that filmed the record: it sinks into the picture, and its lamp comes on. */
export const LANDER = {
  x: 1290,
  /** Where it hangs at the record depth, world y. */
  y: yAt(RECORD_M) - 300,
  open: { sink: T.in2022 + 0.3, lamp: T.camera + 0.5, off: T.toSee + 0.2 },
  close: { sink: T.lowered + 0.2, lamp: T.record + 0.6, off: T.end + 1 },
} as const;

// 12 · payoff --------------------------------------------------------------
{
  const reveal = (t: number): Place => {
    // Out of the dark by the left wall, into the lamp, and it hangs there.
    const u = ramp(t, T.payoff - 0.4, T.baby + 0.6);
    return { ...still(lerp(740, 900, u), yAt(RECORD_M) + 6 * Math.sin(t * 0.8), 1, t, { effort: 0.35 - 0.2 * u }), alpha: clamp01((t - T.payoff + 0.4) / 0.9) };
  };
  add({ id: 'snailfish', shape: 'snailfish', kind: 'fish', length: 320, from: T.payoff - 0.4, to: T.end + 1, place: reveal });
  CALLOUTS.push({ actor: 'snailfish', label: 'snailfish', note: '8,336 m · Izu-Ogasawara Trench', from: T.baby, to: T.belowIt - 0.3 });
  CALLOUTS.push({ actor: 'snailfish', label: 'you', note: 'chapter 10 of InkFish', from: T.beThisFish + 0.4, to: T.startTidePool + 0.4 });
  // Below it: amphipods and sea cucumbers, and no fish.
  const below = yAt(RECORD_M) + 520;
  const rng = createRng(121);
  for (let i = 0; i < 5; i++) {
    const x = 680 + rng() * 560;
    const y = below - 60 + rng() * 120;
    add({ id: `amphipod${i}`, shape: 'shrimp', kind: 'critter', length: 60 + rng() * 20, from: T.belowIt - 1, to: T.beThisFish + 2, place: (t) => still(x + 8 * Math.sin(t + i), y + 6 * Math.sin(t * 1.3 + i), i % 2 ? 1 : -1, t, { alpha: outOfDark(t, T.belowIt - 1, T.beThisFish + 2) }) });
  }
  add({ id: 'cucumber0', shape: 'seapig', kind: 'critter', length: 130, from: T.belowIt - 1, to: T.beThisFish + 2, place: (t) => still(720, TRENCH_FLOOR_Y - 32, 1, t) });
  add({ id: 'cucumber1', shape: 'seapig', kind: 'critter', length: 110, from: T.belowIt - 1, to: T.beThisFish + 2, place: (t) => still(1240, TRENCH_FLOOR_Y - 28, -1, t) });
}

// The cold open's glimpse: something slipping out of the lamp's light into the dark, its tail last.
add({
  id: 'glimpse', shape: 'snailfish', kind: 'fish', length: 320, from: T.swam - 0.1, to: T.swam + 1.7,
  place: (t) => {
    const u = ramp(t, T.swam - 0.1, T.swam + 1.3);
    return { ...still(lerp(880, 1250, u), yAt(RECORD_M) + 30, 1, t, { effort: 0.8 }), alpha: Math.sin(Math.PI * clamp01((t - T.swam + 0.1) / 1.8)) * 0.65 };
  },
});

export { ACTORS, BITES, CALLOUTS, EXCLAIMS };
export const actorById = byId;
export const LINE_Y = yAt(LINE_M);
