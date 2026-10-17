import type { OreKey } from './ore';
import { createRng, type Rng } from './rng';
import { isSolid, surfaceRow, TILE, tileAt, wrapX, type Terrain, type TilePos } from './terrain';

/**
 * Mycel's creatures (spec, "Creatures"; the rules in
 * docs/inkmine-xenobiology.md). Graphite, a dead rock, has none. They're
 * few and kept to their places, deeper is fiercer, and none come near the
 * lander:
 * - puffballs sit on cave floors, notice you, swell and spit a clot of
 *   spores (a hit, and air lost); a pulse bursts them;
 * - snap tendrils hang from cave ceilings in the stone and whip down to
 *   hold whoever passes under, until they're shot or struggled free of;
 * - grazers crawl the surface eating caps: harmless, they curl up when shot;
 * - the Mother Mycel, the moon's giant, a heart in a deep chamber: it can't
 *   be hurt, touching it hurts, and each beat sends out a wave of spores.
 * Placed fresh on every landing from the world's rules, never saved: what
 * you burst grows back.
 *
 * Kinds are in world definitions: never rename one.
 */
export const CREATURE_KINDS = ['puffball', 'tendril', 'grazer'] as const;
export type CreatureKind = (typeof CREATURE_KINDS)[number] | 'mother';

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
};

/**
 * One creature. `x`, `y` is where it's anchored, px: a puffball's foot and
 * a grazer's underside on the ground, a tendril's knot in the ceiling, the
 * Mother's base on her chamber floor. `state` and `timer` drive what it's
 * doing; `reach` is how far a tendril is down (0..1).
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
}

export type CreatureState = 'idle' | 'warn' | 'swell' | 'rest' | 'strike' | 'hold' | 'retract' | 'walk' | 'curled' | 'burst' | 'dead';

const SPACING = 6;

/** A creature fresh where it's placed. */
function born(id: number, kind: CreatureKind, x: number, y: number, rng: Rng): Creature {
  const hp = kind === 'puffball' ? CREATURE.puffball.hp : kind === 'tendril' ? CREATURE.tendril.hp : 1;
  return { id, kind, x, y, hp, state: kind === 'grazer' ? 'walk' : 'idle', timer: rng() * 2, facing: rng() < 0.5 ? 1 : -1, reach: 0 };
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

/** Whether (x, y) is on the open surface: the tile over the ground, caps aside (a grazer crawls in among them). */
function surfaceSpot(t: Terrain, x: number, y: number, top: number): boolean {
  let ground = top;
  while (ground < t.height && tileAt(t, x, ground) === TILE.cap) ground++;
  return y === ground - 1 && isSolid(t, x, ground);
}

const FITS = { puffball: caveFloor, tendril: caveCeiling, grazer: surfaceSpot } as const;

/**
 * Every creature a world's rules place on its carved ground, from its seed,
 * so the same spots each landing; each kind kept SPACING tiles apart. Depths
 * are below `surface`, the lander's ground row. `mother`, if given, is her
 * base tile (her chamber's floor).
 */
export function placeCreatures(t: Terrain, rules: readonly CreatureRule[], surface: number, tile: number, seed: number, mother?: TilePos): Creature[] {
  const rng = createRng(seed ^ 0x5eed);
  const out: Creature[] = [];
  const tops = Array.from({ length: t.width }, (_, x) => surfaceRow(t, x));
  let id = 1;
  for (const rule of rules) {
    const [c0, c1] = rule.cols ?? [0, t.width - 1];
    const spots: TilePos[] = [];
    for (let x = c0; x <= c1; x++) {
      for (let y = Math.max(1, surface + rule.from - (rule.kind === 'grazer' ? 8 : 0)); y <= Math.min(t.height - 3, surface + rule.to + (rule.kind === 'grazer' ? 8 : 0)); y++) {
        const wx = wrapX(t, x);
        if (FITS[rule.kind](t, wx, y, tops[wx]!)) spots.push([wx, y]);
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
      const cx = (x + 0.5) * tile;
      out.push(born(id++, rule.kind, cx, rule.kind === 'tendril' ? y * tile : (y + 1) * tile, rng));
    }
  }
  if (mother) out.push(born(id++, 'mother', (mother[0] + 0.5) * tile, (mother[1] + 1) * tile, rng));
  return out;
}

/** Whether a creature can still act (not burst, severed or curled up). */
export const alive = (c: Creature): boolean => c.state !== 'burst' && c.state !== 'dead';
