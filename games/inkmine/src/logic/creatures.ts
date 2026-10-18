import type { OreKey } from './ore';
import { createRng, type Rng } from './rng';
import { isGrowth, isSolid, surfaceRow, TILE, tileAt, wrapX, type Terrain, type TilePos } from './terrain';

/**
 * The creatures of the living worlds (spec, "Creatures"; the rules in
 * docs/inkmine-xenobiology.md). Graphite, a dead rock, has none. They're
 * few and kept to their places, deeper is fiercer, and none come near the
 * lander. Mycel's:
 * - puffballs sit on cave floors, notice you, swell and spit a clot of
 *   spores (a hit, and air lost); a pulse bursts them;
 * - snap tendrils hang from cave ceilings in the stone and whip down to
 *   hold whoever passes under, until they're shot or struggled free of;
 * - grazers crawl the surface eating caps: harmless, they curl up when shot;
 * - the Mother Mycel, the moon's giant, a heart in a deep chamber: it can't
 *   be hurt, touching it hurts, and each beat sends out a wave of spores.
 * Brine's (seaFauna.ts):
 * - shore crabs walk the islands and the seabed: harmless, they tuck in when shot;
 * - bubble jellies drift in the water and come for a swimmer: a sting is a
 *   hit and air lost; a pulse bursts them;
 * - rasp eels wait in burrows in flooded cave walls and lunge out at
 *   whatever swims in front of them;
 * - the Leviathan, Brine's giant, asleep in the deepest flooded cave: it
 *   can't be hurt, and noise wakes it (drilling or blasting near it, or
 *   swimming right up to it); awake, it sweeps its cave a while.
 * Talus's (talusFauna.ts):
 * - boulder crabs sit on the slopes of loose rock looking like boulders,
 *   until you come close: then they pinch, and scuttle off;
 * - sand skates cruise just under the crust of the flats, feeling for
 *   footsteps, and strike up at whoever walks over them;
 * - dew beetles walk the open ground: harmless, they tuck in when shot, and
 *   whenever a dust storm blows;
 * - the Rockslide, Talus's giant, a crab the size of a hill asleep in a
 *   cave under a mesa: it can't be hurt, noise wakes it, and awake it
 *   scuttles back and forth shaking rock down from the roof.
 * Placed fresh on every landing from the world's rules, never saved: what
 * you burst grows back.
 *
 * Kinds are in world definitions: never rename one.
 */
export const CREATURE_KINDS = ['puffball', 'tendril', 'grazer', 'crab', 'jelly', 'lamprey', 'rockcrab', 'skate', 'beetle'] as const;
/** A world's giant: one, in its deepest place. */
export const GIANT_KINDS = ['mother', 'leviathan', 'rockslide'] as const;
export type GiantKind = (typeof GIANT_KINDS)[number];
export type CreatureKind = (typeof CREATURE_KINDS)[number] | GiantKind;

/** A rule placing creatures of a kind: how many, between which depths below the surface, and optionally between which columns. */
export interface CreatureRule {
  readonly kind: (typeof CREATURE_KINDS)[number];
  readonly count: number;
  readonly from: number;
  readonly to: number;
  readonly cols?: readonly [number, number];
}

/** The numbers each kind lives by. Distances are in tiles, times in seconds. */
export const CREATURE = {
  puffball: { hp: 1, notice: 5, warn: 0.35, swell: 0.7, rest: 2.4, glob: 260, air: 6, burstAir: 6, burstReach: 1.6 },
  tendril: { hp: 2, sense: 0.9, warn: 0.3, strike: 0.15, retract: 0.5, rest: 2.5, squeeze: 1.2, struggle: 3, reach: 5 },
  grazer: { speed: 0.6, curl: 3 },
  /** `wave`: tiles from her body that a beat's spores reach. */
  mother: { w: 8, h: 6, beat: 4, wave: 7, waveAir: 10, push: 380 },
  crab: { speed: 0.5, tuck: 3 },
  /** `speed` tiles/s drifting at you; `sting` air a sting costs; `lose` how far off (×notice) it gives up. */
  jelly: { hp: 1, notice: 5, warn: 0.5, speed: 0.9, sting: 4, rest: 2, lose: 1.6, recoil: 1.2 },
  /** `sense` tiles ahead of its burrow it sees, within `band` tiles up or down; `reach` tiles it lunges at most. */
  lamprey: { hp: 2, sense: 4, band: 0.7, warn: 0.35, strike: 0.15, retract: 0.5, rest: 2.2, reach: 4 },
  /**
   * Its body in tiles; noise (0..1 wakes it): `drill` per tile drilled
   * within `hear` tiles, `blast` per blast within `hearBlast`, `near` a
   * second while you swim within `close` tiles of it, `shot` per pulse;
   * `decay` a second. Awake it stirs for `warn` s, sweeps its cave for
   * `awake` s at `speed` tiles/s (no further than `range` from home), then
   * goes home to sleep.
   */
  leviathan: { w: 10, h: 4, hear: 10, drill: 0.14, hearBlast: 18, blast: 0.8, close: 3, near: 0.18, shot: 0.5, decay: 0.03, stir: 0.5, warn: 1.6, awake: 12, speed: 3, range: 14, push: 420 },
  /**
   * Still, it's a boulder: it notices you within `notice` tiles, rears up
   * for `warn` s, pinches what's within `pinch` tiles of its claws, then
   * scuttles off at `speed` tiles/s for `flee` s and rests `rest` s before
   * it settles back into a boulder. Its hematite shell takes two shots.
   */
  rockcrab: { hp: 2, notice: 1.4, warn: 0.4, pinch: 0.5, speed: 2.2, flee: 2, rest: 1.5 },
  /**
   * Cruises under the crust at `speed` tiles/s, no further than `range`
   * from where it lives; feels footsteps within `sense` tiles (never a
   * flyer), darts under them at `dash` for `warn` s, then strikes up
   * `reach` tiles in `strike` s, pulls back in `retract` s and rests.
   */
  skate: { hp: 1, speed: 1, range: 8, sense: 3, warn: 0.6, dash: 3.5, strike: 0.16, reach: 1.6, retract: 0.4, rest: 2.6, toss: 380 },
  /** Walks the open ground; shot, or in a storm, it tucks in. */
  beetle: { speed: 0.45, tuck: 3 },
  /**
   * The Leviathan's numbers for waking (see leviathan), on its feet: awake,
   * it scuttles its cave and every `quake` s shakes `rocks` rocks down from
   * the roof within `spread` tiles of it.
   */
  rockslide: { w: 9, h: 5, hear: 9, drill: 0.12, hearBlast: 16, blast: 0.7, close: 2.5, near: 0.2, shot: 0.4, decay: 0.03, stir: 0.5, warn: 1.8, awake: 10, speed: 1.8, range: 10, push: 420, quake: 1.3, rocks: 3, spread: 8 },
} as const;

/**
 * What a creature leaves when it's killed, as pieces to pick up: a puffball
 * is a cap's flesh round a sac of water, a tendril a resinous root (the
 * stalks' resin, fresh). Grazers only curl up and the Mother can't be hurt,
 * so they leave nothing.
 */
export const SPOILS: Partial<Record<CreatureKind, readonly OreKey[]>> = {
  puffball: ['carbon', 'water'],
  tendril: ['carbon', 'amber'],
  // A jelly is mostly salt water; a rasp eel's teeth are capped with magnetite, as a real chiton's are.
  jelly: ['water', 'halite'],
  lamprey: ['magnetite'],
  // A boulder crab's shell is hematite; a sand skate keeps water in its gut, as the dry world's animals must.
  rockcrab: ['hematite'],
  skate: ['water'],
};

/**
 * One creature. `x`, `y` is where it's anchored, px: a puffball's foot and
 * a grazer's or a crab's underside on the ground, a tendril's knot in the
 * ceiling, a jelly's middle, a rasp eel's burrow mouth in its wall (it
 * faces out of it), a giant's base on its chamber floor. `state` and
 * `timer` drive what it's doing; `reach` is how far a tendril is down or a
 * rasp eel is out (0..1). A giant that moves keeps its `home` (px along
 * the ground); the Leviathan's `noise` is how near it is to waking (0..1).
 */
export interface Creature {
  readonly id: number;
  readonly kind: CreatureKind;
  readonly x: number;
  readonly y: number;
  readonly hp: number;
  readonly state: CreatureState;
  readonly timer: number;
  readonly facing: 1 | -1;
  readonly reach: number;
  readonly home?: number;
  readonly noise?: number;
  /** Seconds since the Rockslide last shook the roof. */
  readonly quake?: number;
}

export type CreatureState = 'idle' | 'warn' | 'swell' | 'rest' | 'strike' | 'hold' | 'retract' | 'walk' | 'curled' | 'burst' | 'dead';

const SPACING = 6;

/** A creature fresh where it's placed. */
function born(id: number, kind: CreatureKind, x: number, y: number, rng: Rng): Creature {
  const hp = kind === 'puffball' || kind === 'tendril' || kind === 'lamprey' || kind === 'rockcrab' || kind === 'skate' ? CREATURE[kind].hp : 1;
  const walks = kind === 'grazer' || kind === 'crab' || kind === 'beetle' || kind === 'skate';
  const c: Creature = { id, kind, x, y, hp, state: walks ? 'walk' : 'idle', timer: rng() * 2, facing: rng() < 0.5 ? 1 : -1, reach: 0 };
  if (kind === 'leviathan' || kind === 'rockslide') return { ...c, home: x, noise: 0 };
  return kind === 'skate' ? { ...c, home: x } : c;
}

/** Whether (x, y) is a cave floor: open, with ground under it and a roof somewhere over it (`top`: the column's first solid row). */
function caveFloor(t: Terrain, x: number, y: number, top: number): boolean {
  return !isSolid(t, x, y) && !isSolid(t, x, y - 1) && isSolid(t, x, y + 1) && y > top;
}

/** Whether (x, y) hangs under a cave ceiling with room below to whip down, and a floor within its reach (so it can get you). */
function caveCeiling(t: Terrain, x: number, y: number, top: number): boolean {
  if (!isSolid(t, x, y - 1) || isSolid(t, x, y) || isSolid(t, x, y + 1) || isSolid(t, x, y + 2) || y <= top) return false;
  for (let k = 3; k <= CREATURE.tendril.reach; k++) if (isSolid(t, x, y + k)) return true;
  return false;
}

/** Whether (x, y) is on the open surface: the tile over the ground, growths aside (a grazer crawls in among them). */
function surfaceSpot(t: Terrain, x: number, y: number, top: number): boolean {
  let ground = top;
  while (ground < t.height && isGrowth(tileAt(t, x, ground))) ground++;
  return y === ground - 1 && isSolid(t, x, ground);
}

/** Whether (x, y) is on a slope of loose rock: the open tile over a boulder, where a boulder crab can pass for one. */
function slopeSpot(t: Terrain, x: number, y: number, top: number): boolean {
  return surfaceSpot(t, x, y, top) && tileAt(t, x, y + 1) === TILE.loose;
}

/** Whether (x, y) is the crust of a flat: the first solid tile of its column, sand, with sand level either side, where a sand skate can cruise. */
export function crustSpot(t: Terrain, x: number, y: number, top: number): boolean {
  if (y !== top || tileAt(t, x, y) !== TILE.soil) return false;
  return [-1, 1].every((d) => tileAt(t, x + d, y) === TILE.soil && !isSolid(t, x + d, y - 1));
}

/** Whether a tile is under water (on a world with none, nothing is). */
export type WetAt = (x: number, y: number) => boolean;

/** Whether (x, y) is open water with water above and below it: room for a jelly to hang in. */
function openWater(t: Terrain, x: number, y: number, wet: WetAt): boolean {
  return !isSolid(t, x, y) && wet(x, y) && wet(x, y - 1) && wet(x, y + 1) && wet(x - 1, y) && wet(x + 1, y);
}

/** Which way a rasp eel's burrow at (x, y) would face out (a wall behind it, three tiles of water in front), or 0. */
export function burrowFacing(t: Terrain, x: number, y: number, wet: WetAt): 1 | -1 | 0 {
  if (isSolid(t, x, y) || !wet(x, y)) return 0;
  for (const dir of [1, -1] as const) {
    if (!isSolid(t, x - dir, y)) continue;
    let room = 0;
    while (room < 3 && !isSolid(t, x + dir * room, y) && wet(x + dir * room, y)) room++;
    if (room >= 3) return dir;
  }
  return 0;
}

type Fit = (t: Terrain, x: number, y: number, top: number, wet: WetAt) => boolean;
const FITS: Record<(typeof CREATURE_KINDS)[number], Fit> = {
  puffball: caveFloor,
  tendril: caveCeiling,
  grazer: surfaceSpot,
  // A crab walks the open ground, dry or under the sea.
  crab: surfaceSpot,
  jelly: (t, x, y, _top, wet) => openWater(t, x, y, wet),
  lamprey: (t, x, y, _top, wet) => burrowFacing(t, x, y, wet) !== 0,
  rockcrab: slopeSpot,
  skate: crustSpot,
  beetle: surfaceSpot,
};
/** Kinds that live at the surface: their rule's depths reach a little above and below it (the ground rolls, and mesas stand up). */
const WALKERS = new Set<string>(['grazer', 'crab', 'rockcrab', 'skate', 'beetle']);

/** Where a world's giant lives, and which it is. */
export interface GiantAt {
  readonly at: TilePos;
  readonly kind: GiantKind;
}

/**
 * Every creature a world's rules place on its carved ground, from its seed,
 * so the same spots each landing; each kind kept SPACING tiles apart. Depths
 * are below `surface`, the lander's ground row. `giant`, if given, stands on
 * its base tile (its chamber's floor). `wet` says where the carved water is.
 */
export function placeCreatures(t: Terrain, rules: readonly CreatureRule[], surface: number, tile: number, seed: number, giant?: GiantAt, wet: WetAt = () => false): Creature[] {
  const rng = createRng(seed ^ 0x5eed);
  const out: Creature[] = [];
  const tops = Array.from({ length: t.width }, (_, x) => surfaceRow(t, x));
  let id = 1;
  for (const rule of rules) {
    const [c0, c1] = rule.cols ?? [0, t.width - 1];
    const spots: TilePos[] = [];
    for (let x = c0; x <= c1; x++) {
      const slack = WALKERS.has(rule.kind) ? 8 : 0;
      for (let y = Math.max(1, surface + rule.from - slack); y <= Math.min(t.height - 3, surface + rule.to + slack); y++) {
        const wx = wrapX(t, x);
        if (FITS[rule.kind](t, wx, y, tops[wx]!, wet)) spots.push([wx, y]);
      }
    }
    // Shuffled with the seed, then taken in turn wherever there's room.
    for (let i = spots.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [spots[i], spots[j]] = [spots[j]!, spots[i]!];
    }
    const taken: TilePos[] = [];
    for (const [x, y] of spots) {
      if (taken.length >= rule.count) break;
      if (taken.some(([tx, ty]) => Math.abs(tx - x) < SPACING && Math.abs(ty - y) < SPACING)) continue;
      taken.push([x, y]);
      out.push(placed(id++, rule.kind, x, y, tile, rng, t, wet));
    }
  }
  if (giant) out.push(born(id++, giant.kind, (giant.at[0] + 0.5) * tile, (giant.at[1] + 1) * tile, rng));
  return out;
}

/** A creature born on its tile, anchored as its kind is (see Creature). */
function placed(id: number, kind: (typeof CREATURE_KINDS)[number], x: number, y: number, tile: number, rng: Rng, t: Terrain, wet: WetAt): Creature {
  const cx = (x + 0.5) * tile;
  if (kind === 'tendril') return born(id, kind, cx, y * tile, rng);
  if (kind === 'jelly') return born(id, kind, cx, (y + 0.5) * tile, rng);
  // A sand skate lies in its crust tile, its back at the ground line.
  if (kind === 'skate') return born(id, kind, cx, y * tile, rng);
  if (kind === 'lamprey') {
    const facing = burrowFacing(t, x, y, wet) || 1;
    // Its mouth on the wall's face, facing out into the water.
    return { ...born(id, kind, (facing === 1 ? x : x + 1) * tile, (y + 0.5) * tile, rng), facing };
  }
  return born(id, kind, cx, (y + 1) * tile, rng);
}

/** Whether a creature can still act (not burst, severed or curled up). */
export const alive = (c: Creature): boolean => c.state !== 'burst' && c.state !== 'dead';
