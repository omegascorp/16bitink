import { SLOT_FACING, SLOT_SIZES, SLOT_X, SLOTS, widthOf } from './layout';
import { lerp, ramp, smooth, window01 } from '../short';
import {
  AND_AT, BIGGEST2_AT, CHAIN_AT, GATHER_AT, IN_AT, LINING_AT, LOOP_S, QUEUE_AT, SCIENTISTS_AT, SO_AT, TURNS_AT, WAIT_AT,
} from './story';

/**
 * The queue (layout.ts has where it stands): the big shell in slot 0, slot
 * i a size 8 - i shell. At the loop point slots 1..7 hold crabs that fill
 * their shells, and slot 0's shell is empty.
 *
 * The chain moves each crab one slot up the line, out of its shell naked
 * (red, as in the game) and into the next one up, round the turns of the
 * snake. Then it all comes round: each grows into its roomier shell, the
 * biggest walks off in its new house, a tiny naked crab takes the shell left
 * empty at the end, and a wave rolls in a fresh big shell at slot 0.
 * Everything that moves is keyed by slot, not by crab, so the line at the
 * end of the loop is the line it began with.
 */
export { ROWS, SLOT_FACING, SLOT_KINDS, SLOT_SIZES, SLOT_X, SLOT_Y, SLOTS, widthOf } from './layout';

// ---------------------------------------------------------------- the chain

/** The crabs, by the slot each starts the loop in. */
export const CRABS: readonly number[] = Array.from({ length: SLOTS - 1 }, (_, i) => i + 1);
/** Seconds between one crab of the chain setting off and the next, and how long each takes to reach the next shell up. */
const DOMINO_S = 0.2;
const DASH_S = 0.38;
/** When the crab that starts in slot i (1..7) slips out of its shell, and when it is in the next one up. */
export const LEAVE: readonly number[] = [NaN, BIGGEST2_AT - 0.1, ...CRABS.slice(1).map((i) => AND_AT - 0.05 + DOMINO_S * (i - 2))];
export const ARRIVE: readonly number[] = [NaN, IN_AT, ...CRABS.slice(1).map((i) => LEAVE[i]! + DASH_S)];

/** The grown crabs: each fills its new shell, from "Scientists". */
export const GROW_FROM = SCIENTISTS_AT;
export const GROW_S = 0.7;
/** The biggest walks off left in its new shell. */
export const WALK_FROM = SCIENTISTS_AT + 0.45;
export const WALK_TO = CHAIN_AT + 0.15;
const WALK_PX = 720;
/** A tiny naked crab runs in from the right and moves into the shell left at the end. */
export const NEWCOMER_FROM = SCIENTISTS_AT + 0.6;
export const NEWCOMER_IN = CHAIN_AT + 0.1;
/** The wave that rolls the fresh big shell in to slot 0. */
export const WAVE_FROM = CHAIN_AT - 0.35;
export const WAVE_TO = SO_AT + 0.45;
export const SHELL_LANDS = SO_AT - 0.05;

// ---------------------------------------------------------------- crabs

export interface InShell {
  readonly mode: 'in';
  readonly slot: number;
  /** Body size in the game's units (1 .. 8): a crab fills a shell of its own size. */
  readonly size: number;
  /** Offset of crab and shell together, screen px. */
  readonly dx: number;
  readonly dy: number;
  readonly walking: boolean;
}
export interface Naked {
  readonly mode: 'naked';
  /** From one slot's opening to another's (-1: off the right edge, along the last row), `u` 0 .. 1 of the way. */
  readonly from: number;
  readonly to: number;
  readonly u: number;
  readonly size: number;
  /** Height of its hop, screen px. */
  readonly dy: number;
}
export type CrabPose = InShell | Naked;

/** A small restless twitch for whoever is in a slot: whole cycles a loop, so it comes round. */
function twitch(slot: number, t: number): number {
  return 2.2 * Math.sin((2 * Math.PI * (7 + slot) * t) / LOOP_S + slot * 1.9);
}

/** A hop running down the line on "QUEUE UP", front to back. */
function queueHop(slot: number, t: number): number {
  const u = (t - (QUEUE_AT - 0.05 + 0.07 * slot)) / 0.32;
  return u <= 0 || u >= 1 ? 0 : -16 * Math.sin(Math.PI * u);
}

/** The biggest walking off in its new house, screen px. */
const walkDx = (t: number): number => -WALK_PX * ramp(t, WALK_FROM, WALK_TO);
/** The twitch of a crab that has moved in: the one in slot 0 stops twitching as it sets off. */
const settled = (slot: number, t: number): number => twitch(slot, t) * (slot === 0 ? 1 - ramp(t, WALK_FROM - 0.3, WALK_FROM) : 1);

/** "crabs gather round": they shuffle up the way they face, towards the big shell, then "lining up" sets them back in their places. */
function gatherDx(slot: number, t: number): number {
  const w = window01(t, GATHER_AT - 0.05, LINING_AT + 0.35, 0.5);
  return SLOT_FACING[slot]! * w * (8 + 2 * slot) + w * 3 * Math.sin(t * 9 + slot);
}
const shuffling = (t: number): boolean => t > GATHER_AT && t < WAIT_AT + 0.1;

/** Body size of the crab that started in slot i, through the loop: the size of its shell, then one up as it grows. */
const grownSize = (i: number, t: number): number => SLOT_SIZES[i]! + smooth((t - GROW_FROM - 0.12 * (i - 1)) / GROW_S);

export function crabsAt(t: number): CrabPose[] {
  const crabs: CrabPose[] = [];
  for (const i of CRABS) {
    const size = SLOT_SIZES[i]!;
    if (t < LEAVE[i]!) {
      crabs.push({ mode: 'in', slot: i, size, dx: twitch(i, t) + gatherDx(i, t), dy: queueHop(i, t), walking: shuffling(t) });
    } else if (t < ARRIVE[i]!) {
      const u = (t - LEAVE[i]!) / (ARRIVE[i]! - LEAVE[i]!);
      crabs.push({ mode: 'naked', from: i, to: i - 1, u: smooth(u), size, dy: -10 * Math.abs(Math.sin(Math.PI * 3 * u)) });
    } else {
      const slot = i - 1;
      const walk = slot === 0 ? walkDx(t) : 0;
      // Off the left edge: gone until the loop brings in its successor.
      if (walk > -WALK_PX + 1) {
        crabs.push({ mode: 'in', slot, size: grownSize(i, t), dx: settled(slot, t) + walk, dy: 0, walking: walk < 0 });
      }
    }
  }
  // The newcomer: naked from off the right edge into the shell at the end, then in it (the crab slot 5 starts with).
  if (t >= NEWCOMER_FROM && t < NEWCOMER_IN) {
    const u = (t - NEWCOMER_FROM) / (NEWCOMER_IN - NEWCOMER_FROM);
    crabs.push({ mode: 'naked', from: -1, to: SLOTS - 1, u: smooth(u), size: SLOT_SIZES[SLOTS - 1]!, dy: -6 * Math.abs(Math.sin(Math.PI * 4 * u)) });
  } else if (t >= NEWCOMER_IN) {
    const slot = SLOTS - 1;
    crabs.push({ mode: 'in', slot, size: SLOT_SIZES[slot]!, dx: twitch(slot, t), dy: 0, walking: false });
  }
  return crabs;
}

// ---------------------------------------------------------------- shells

export interface ShellPose {
  readonly slot: number;
  readonly dx: number;
  readonly dy: number;
  readonly rotation: number;
  /** The fresh shell the wave is still rolling in (not yet at rest in its slot). */
  readonly rolling: boolean;
  /** Highlighted as the game marks a shell a crab can take: empty, and on the sand. */
  readonly highlight: number;
}

/** The big shell landing on "turns up": a little bump. */
const landBump = (t: number): number => {
  const u = (t - (TURNS_AT - 0.05)) / 0.4;
  return u <= 0 || u >= 1 ? 0 : -18 * Math.sin(Math.PI * u) * (1 - u);
};

/**
 * Where the fresh big shell is while the wave rolls it in: from off the left
 * edge, rocking over as the water pushes it (lifted enough that it never
 * dips into the sand), to rest in slot 0.
 */
function rolledIn(t: number): { readonly dx: number; readonly dy: number; readonly rotation: number } {
  const raw = (t - WAVE_FROM - 0.1) / (SHELL_LANDS - WAVE_FROM - 0.1);
  const u = smooth(raw);
  const rotation = -0.55 * Math.sin(3 * Math.PI * Math.min(1, Math.max(0, raw))) * (1 - u);
  return { dx: lerp(-SLOT_X[0]! - 260, 0, u), dy: -widthOf(SLOT_SIZES[0]) * 0.42 * Math.abs(Math.sin(rotation)), rotation };
}

export function shellsAt(t: number): ShellPose[] {
  const shells: ShellPose[] = [];
  for (let slot = 0; slot < SLOTS; slot++) {
    // Who is in this slot's shell, and whether it moves with them.
    const leaver = slot + 1;
    if (slot === 0) {
      // Empty and highlighted until the biggest moves in; it then walks off with it.
      const walk = walkDx(t);
      const moved = t >= ARRIVE[1]! ? settled(0, t) : 0;
      if (walk > -WALK_PX + 1) {
        shells.push({ slot, dx: walk + moved, dy: landBump(t), rotation: 0, rolling: false, highlight: 1 - ramp(t, IN_AT - 0.1, IN_AT + 0.1) });
      }
      continue;
    }
    const before = t < LEAVE[slot]!;
    const after = leaver < SLOTS ? t >= ARRIVE[leaver]! : t >= NEWCOMER_IN;
    const own = before ? twitch(slot, t) + gatherDx(slot, t) : after ? twitch(slot, t) : 0;
    const hop = before ? queueHop(slot, t) : 0;
    // The shell at the end stands empty from its crab leaving until the newcomer moves in.
    const empty = slot === SLOTS - 1 ? window01(t, LEAVE[slot]! + 0.1, NEWCOMER_IN, 0.2) : 0;
    shells.push({ slot, dx: own, dy: hop, rotation: 0, rolling: false, highlight: empty });
  }
  if (t >= WAVE_FROM) {
    const { dx, dy, rotation } = rolledIn(t);
    shells.push({ slot: 0, dx, dy, rotation, rolling: t < SHELL_LANDS, highlight: ramp(t, SHELL_LANDS, SHELL_LANDS + 0.35) });
  }
  return shells;
}

// ---------------------------------------------------------------- puffs and the wave

/** Puffs of sand where a crab slips out of a shell or into one: [time, slot]. */
export const PUFFS: readonly (readonly [number, number])[] = [
  ...CRABS.flatMap((i) => [[LEAVE[i]!, i], [ARRIVE[i]!, i - 1]] as const),
  [NEWCOMER_IN, SLOTS - 1],
];
export const PUFF_S = 0.45;

/** Where the wave starts, off the left of the line, and how far in it runs at most. */
export const WAVE_LEFT = -320;
const WAVE_REACH = 720;

/** How far the wave's edge has run in from WAVE_LEFT, line px, and how strong its wash is. */
export function waveAt(t: number): { readonly reach: number; readonly alpha: number } {
  const u = (t - WAVE_FROM) / (WAVE_TO - WAVE_FROM);
  if (u <= 0 || u >= 1) return { reach: 0, alpha: 0 };
  return { reach: WAVE_REACH * Math.sin(Math.PI * Math.min(1, u * 1.25)), alpha: Math.min(1, 4 * (1 - u)) };
}
