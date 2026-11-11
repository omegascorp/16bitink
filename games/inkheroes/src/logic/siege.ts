import { colOf, distance, hexAt, hexCentre, hexUnder, neighbours, rowOf, ROWS, type Hex } from './hex';
import type { Side } from './battleTypes';

/** What a war machine can hit: four stretches of wall, the gate, and up to three towers. */
export const WALLS = ['wallNorth', 'wallGateNorth', 'wallGateSouth', 'wallSouth'] as const;
export const TOWERS = ['keep', 'towerNorth', 'towerSouth'] as const;
export const MAX_TOWERS = TOWERS.length;
export type WallPart = (typeof WALLS)[number];
export type TowerPart = (typeof TOWERS)[number];
export type SiegePart = WallPart | TowerPart | 'gate';
/** The wall beside the gate, each side: what the finest battering ram cracks with it. */
export const BESIDE_GATE: readonly WallPart[] = ['wallGateNorth', 'wallGateSouth'];

/** What a town's Fort, Citadel and Castle put round a battle. */
export interface Fortification {
  /** Blows each stretch of wall takes to bring down. */
  readonly wall: number;
  readonly moat: boolean;
  /** How many towers stand, each a place for one company (TOWERS, in that order). */
  readonly places: number;
}

/** The walls in a battle. The attacker is always side 0, on the left, the defender behind the walls on the right. */
export interface Siege {
  /** Blows each part still takes; 0 is down. */
  readonly parts: Readonly<Partial<Record<SiegePart, number>>>;
  /** Strikes by hand each part has taken towards its next blow. */
  readonly dents?: Readonly<Partial<Record<SiegePart, number>>>;
  readonly moat: boolean;
  /** The side the player plays. */
  readonly me: Side;
  /** Egypt's earthen ramps against the wall, in the order they were begun. */
  readonly ramps?: readonly Ramp[];
}

/**
 * An earthen ramp Egypt's workers raise against a stretch of wall (never the
 * gate): it grows a stage at the start of each round, and once grown to
 * `need` the stretch can be walked over both ways and its moat is filled.
 * The wall itself still stands: shots over it are halved, and nothing falls.
 */
export interface Ramp {
  readonly part: WallPart;
  readonly stage: number;
  readonly need: number;
}

/** The wall's column on each row: a curve bowed towards the attacker, the gate at its middle (our own curve on our hexes; H3's shape). */
const WALL_COL: readonly number[] = [12, 11, 11, 10, 10, 9, 10, 10, 11, 11, 12];
const GATE_ROW = 5;

const wallHex = (row: number): Hex => hexAt(WALL_COL[row]!, row);

/** The hex of each part. A tower's hex stays blocked even when it falls; the wall's corners under the outer towers are always solid. */
export const PART_HEX: Readonly<Record<SiegePart, Hex>> = {
  wallNorth: wallHex(1), wallGateNorth: wallHex(4), gate: wallHex(GATE_ROW), wallGateSouth: wallHex(6), wallSouth: wallHex(9),
  keep: hexAt(14, GATE_ROW), towerNorth: wallHex(0), towerSouth: wallHex(10),
};

/** The hexes of the wall no catapult can open. */
const SOLID: readonly Hex[] = [0, 2, 3, 7, 8, 10].map(wallHex);
/** The drawbridge: a hex of the moat while the gate holds, plain ground once it falls. */
export const BRIDGE: Hex = hexAt(WALL_COL[GATE_ROW]! - 1, GATE_ROW);
/** The moat: the hex before the wall on each row. */
const MOAT: readonly Hex[] = WALL_COL.map((c, r) => hexAt(c - 1, r));

/** How the catapult shares its shots: VCMI's chances, unskilled. */
const AIM: Readonly<Record<SiegePart, number>> = { wallNorth: 50, wallGateNorth: 50, wallGateSouth: 50, wallSouth: 50, gate: 25, towerNorth: 10, towerSouth: 10, keep: 5 };
const TOWER_HP = 2;
const GATE_HP = 2;
/** Strikes by hand a gate or tower takes for one blow of a catapult: troops can get through without a machine, slowly and under fire. */
export const HAND_STRIKES = 5;
/** HP the moat takes off a stack that enters it (H3's castle moat). */
export const MOAT_DAMAGE = 70;

/** The fortifications `built` gives; null without a Fort, when a battle at the town is fought in the open. */
export function fortification(built: readonly string[]): Fortification | null {
  if (!built.includes('fort')) return null;
  const citadel = built.includes('citadel');
  const castle = built.includes('castle');
  return { wall: castle ? 3 : 2, moat: citadel, places: castle ? 3 : citadel ? 2 : 1 };
}

/** A new siege of `fort`, with the player on side `me`. */
export function raiseWalls(fort: Fortification, me: Side): Siege {
  const walls = WALLS.map((w) => [w, fort.wall]);
  const towers = TOWERS.slice(0, fort.places).map((t) => [t, TOWER_HP]);
  return { parts: Object.fromEntries([...walls, ['gate', GATE_HP], ...towers]), moat: fort.moat, me };
}

export const standing = (s: Siege, part: SiegePart): boolean => (s.parts[part] ?? 0) > 0;

/** The parts still up, with how many shots each draws. */
export function aimFor(s: Siege): { part: SiegePart; weight: number }[] {
  return (Object.keys(s.parts) as SiegePart[]).filter((p) => standing(s, p)).map((part) => ({ part, weight: AIM[part] }));
}

/** `s` with `part` taking `blows`. */
export function batter(s: Siege, part: SiegePart, blows: number): Siege {
  return { ...s, parts: { ...s.parts, [part]: Math.max(0, (s.parts[part] ?? 0) - blows) } };
}

/** How many strikes by hand `part` has left in it. */
export const strikesLeft = (s: Siege, part: SiegePart): number => (s.parts[part] ?? 0) * HAND_STRIKES - (s.dents?.[part] ?? 0);

/** `s` with one more strike by hand on `part`. */
export function strikeByHand(s: Siege, part: SiegePart): Siege {
  const dents = (s.dents?.[part] ?? 0) + 1;
  return dents < HAND_STRIKES ? { ...s, dents: { ...s.dents, [part]: dents } } : { ...batter(s, part, 1), dents: { ...s.dents, [part]: 0 } };
}

/** Whether ramp `r` has grown all the way up. */
export const rampDone = (r: Ramp): boolean => r.stage >= r.need;

/** The stretches a finished ramp crosses. */
const rampedParts = (s: Siege): WallPart[] => (s.ramps ?? []).filter(rampDone).map((r) => r.part);

/** The moat hex before a stretch: where its ramp's foot stands, filled once the ramp is done. */
export const rampFoot = (part: WallPart): Hex => hexAt(colOf(PART_HEX[part]) - 1, rowOf(PART_HEX[part]));

/** The stretches a ramp can still go against: any standing one without a ramp. */
export const rampSpots = (s: Siege): WallPart[] => WALLS.filter((w) => standing(s, w) && !(s.ramps ?? []).some((r) => r.part === w));

/** `s` with a ramp begun against `part`, ready after `need` rounds' growth. */
export function raiseRamp(s: Siege, part: WallPart, need: number): Siege {
  if (!rampSpots(s).includes(part)) throw new Error('no ramp can go there');
  return { ...s, ramps: [...(s.ramps ?? []), { part, stage: 0, need }] };
}

/** `s` a round on: every ramp still going up grows a stage. */
export function growRamps(s: Siege): Siege {
  if (!s.ramps?.length) return s;
  return { ...s, ramps: s.ramps.map((r) => (rampDone(r) ? r : { ...r, stage: r.stage + 1 })) };
}

/**
 * Where a bot raises its ramp: the stretch the fewest of the `manned` towers
 * can shoot at in full (within the range a shot keeps its strength), ties to
 * the one nearest the gate, then the northern. Null when none is left.
 */
export function rampStretch(s: Siege, manned: readonly TowerPart[], reach: number = RAMP_FIRE_REACH): WallPart | null {
  const fire = (w: WallPart): number => manned.filter((t) => t in s.parts && distance(PART_HEX[t], rampFoot(w)) <= reach).length;
  const nearGate = (w: WallPart): number => distance(rampFoot(w), BRIDGE);
  const spots = rampSpots(s);
  return spots.reduce<WallPart | null>((best, w) => (best === null || fire(w) < fire(best) || (fire(w) === fire(best) && nearGate(w) < nearGate(best)) ? w : best), null);
}

/** How near a tower must be to a ramp's foot to shoot at it without the range penalty (damage.ts's RANGE_PENALTY_DISTANCE). */
const RAMP_FIRE_REACH = 7;

/** Hexes the walls close to `side`. The defender's own gate opens for them, and a finished ramp opens its stretch to both. */
export function wallsAgainst(s: Siege, side: Side): Hex[] {
  const ramped = rampedParts(s);
  const open = (p: SiegePart): boolean => standing(s, p) && !(p === 'gate' && side === 1) && !(ramped as SiegePart[]).includes(p);
  const parts = [...WALLS, 'gate' as const].filter(open).map((p) => PART_HEX[p]);
  const towers = TOWERS.filter((t) => t in s.parts).map((t) => PART_HEX[t]);
  return [...SOLID, ...parts, ...towers];
}

/** Moat hexes that stop `side`: a walker ends its move on the first it enters, and is hurt. The bridge is down for the defender, and once the gate falls; a finished ramp fills the hex before its stretch. */
export function moatFor(s: Siege, side: Side): Set<Hex> {
  if (!s.moat) return new Set();
  const filled = new Set(rampedParts(s).map(rampFoot));
  return new Set(MOAT.filter((h) => !filled.has(h) && (h !== BRIDGE || (standing(s, 'gate') && side === 0))));
}

/** Whether `hexes` lie on the way through the gate: its own hex or the bridge before it. */
export const throughGate = (hexes: readonly Hex[]): boolean => hexes.includes(PART_HEX.gate) || hexes.includes(BRIDGE);

/** Whether `h` lies behind the wall's line. */
export const insideWalls = (h: Hex): boolean => colOf(h) > WALL_COL[rowOf(h)]!;

/** Whether a shot from outside the walls crosses a part of them still up: H3's half damage. */
export function shotOverWall(s: Siege, from: Hex, to: Hex): boolean {
  if (insideWalls(from) || !insideWalls(to)) return false;
  // A ramp is walked over, but the wall it leans on still stands in a shot's way.
  const closed = new Set([...wallsAgainst(s, 0), ...rampedParts(s).filter((p) => standing(s, p)).map((p) => PART_HEX[p])]);
  const a = hexCentre(from, 1);
  const b = hexCentre(to, 1);
  const samples = Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) * 3);
  return Array.from({ length: samples + 1 }, (_, i) => i / samples).some((u) => {
    const h = hexUnder(a.x + (b.x - a.x) * u, a.y + (b.y - a.y) * u, 1);
    return h !== null && closed.has(h);
  });
}

/** The nearest hex to `from` where nothing in `taken` stands, ring by ring: where a company lands when its tower falls. */
export function nearestFree(from: Hex, taken: ReadonlySet<Hex>, fits: (h: Hex) => boolean = () => true): Hex | null {
  const seen = new Set<Hex>([from]);
  let ring = [from];
  for (let i = 0; i < ROWS * 2 && ring.length; i++) {
    const free = ring.find((h) => h !== from && !taken.has(h) && insideWalls(h) && fits(h));
    if (free !== undefined) return free;
    ring = ring.flatMap(neighbours).filter((h) => !seen.has(h) && !!seen.add(h));
  }
  return null;
}
