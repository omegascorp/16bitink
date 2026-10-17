import type { GameEvent } from '@16bitink/game-sdk';
import type { Profile } from './economy';
import { currentGoal, type Goal } from './repairs';
import { STARSHIP, STARSHIP_IDS } from './starship';

/**
 * InkMine has no levels, so the site's level funnel follows its goals
 * instead: each goal in the chain (repairs.ts) is one step, numbered in
 * the order a player meets them. A step starts when it becomes the goal
 * and is beaten when the goal moves past it.
 */
export interface Step {
  /** The goal's key, sent as the level id: kept stable, as the stats are grouped by it. */
  readonly key: string;
  readonly name: string;
}

const STEP_LIST: readonly Step[] = [
  { key: 'repair:printer', name: 'Repair the printer' },
  { key: 'repair:hull', name: 'Repair the hull' },
  { key: 'find:drill-1', name: 'Find the stone drill' },
  { key: 'print:drill-1', name: 'Print the stone drill' },
  { key: 'repair:thrusters', name: 'Repair the thrusters' },
  { key: 'repair:comms', name: 'Repair the radio' },
  { key: 'receiver', name: 'Print the receiver' },
  { key: 'signal', name: 'Follow the call' },
  { key: 'trade', name: 'Bring the Lamplighters silver' },
  { key: 'collect', name: 'Collect the drive core' },
  { key: 'repair:core', name: 'Fit the drive core' },
  { key: 'fuel', name: 'Fill the lander' },
  { key: 'liftoff', name: 'Fly up to the ship' },
  ...STARSHIP_IDS.map((id) => ({ key: `starship:${id}`, name: `Mend the ${STARSHIP[id].name.toLowerCase()}` })),
  { key: 'shipFuel', name: "Fill the ship's tank" },
  { key: 'course', name: 'Set course for Mycel' },
  // Mycel is paid: how many beat this step is how many bought the full game.
  { key: 'done', name: 'Fly to Mycel (paid)' },
  { key: 'land', name: 'Land on Mycel' },
  { key: 'distress', name: 'Follow the distress call' },
  { key: 'find:pulse', name: 'Study the resonator' },
  { key: 'pulse', name: 'Print the pulse' },
  { key: 'find:drill-2', name: "Find the Aster's drill" },
  { key: 'print:drill-2', name: 'Print the Mk 2 drill' },
  { key: 'explore', name: 'Study the Mk 2 designs' },
  { key: 'trail', name: "Find the Aster's camp" },
  { key: 'wake', name: 'Wake the last Aster' },
  // Was the end of chapter 2 until Brine (chapter 3) came: its key stays.
  { key: 'brine', name: "Fit the Aster's tank" },
  { key: 'tripFuel:brine', name: "Fill the ship's tank for Brine" },
  { key: 'course:brine', name: 'Set course for Brine' },
  { key: 'land:brine', name: 'Land on Brine' },
  { key: 'craft', name: 'Find the Aster craft' },
  { key: 'song', name: 'Follow the song' },
  { key: 'reefTrade', name: 'Bring the Tidesingers copper' },
  { key: 'print:drill-3', name: 'Print the Mk 3 drill' },
  { key: 'rebreather', name: 'Print the rebreather' },
  { key: 'explore:3', name: 'Study the Mk 3 designs' },
  { key: 'raise', name: "Raise the crew's craft" },
  { key: 'heart', name: "Give the craft a new heart" },
  // The end of the story so far: reaching it is beating it.
  { key: 'brineEnd', name: 'The end (more of Brine is coming)' },
];
export const STEPS: readonly Step[] = STEP_LIST;

const LAST = STEPS.length - 1;

/** The goal's step key: its kind, and which repair, design or system it's about. */
export function goalKey(g: Goal): string {
  if (g.kind === 'repair' || g.kind === 'starship') return `${g.kind}:${g.id}`;
  if (g.kind === 'find' || g.kind === 'print') return `${g.kind}:${g.blueprint}`;
  // Mycel's came first and kept the bare names: later worlds' are told apart by world or mark.
  if (g.kind === 'land') return g.world && g.world !== 'mycel' ? `land:${g.world}` : 'land';
  if (g.kind === 'explore') return g.mk && g.mk !== 2 ? `explore:${g.mk}` : 'explore';
  if (g.kind === 'tripFuel') return `tripFuel:${g.to}`;
  if (g.kind === 'setCourse') return `course:${g.to}`;
  return g.kind;
}

const indexOf = (key: string): number => STEPS.findIndex((s) => s.key === key);

/** The step the player is on, or -1 for a goal the funnel doesn't list. */
export const stepIndex = (p: Profile): number => indexOf(goalKey(currentGoal(p)));

export interface Progress {
  readonly profile: Profile;
  readonly events: readonly GameEvent[];
}

const ref = (i: number) => ({ level: STEPS[i]!.key, n: i + 1, name: STEPS[i]!.name });
const start = (i: number): GameEvent => ({ type: 'level_start', ...ref(i) });
const win = (i: number, seconds: number): GameEvent => ({ type: 'level_end', ...ref(i), result: 'win', seconds: Math.max(0, Math.round(seconds)) });
/** Reaching the last step ends the story so far, so it starts and is beaten at once. */
const reach = (i: number): GameEvent[] => (i === LAST ? [start(i), win(i, 0)] : [start(i)]);

const onStep = (p: Profile, i: number, played: number): Profile => ({ ...p, stats: { played, step: STEPS[i]!.key, since: played } });

/**
 * A session begins: the step the player is on starts again (so the funnel's
 * tries count sittings). A save from before the stats picks up from where
 * it is, without reporting the steps it passed long ago.
 */
export function sessionStart(p: Profile): Progress {
  const i = stepIndex(p);
  if (i < 0) return { profile: p, events: [] };
  if (p.stats.step !== STEPS[i]!.key) return { profile: onStep(p, i, p.stats.played), events: reach(i) };
  return { profile: p, events: i === LAST ? [] : [start(i)] };
}

/**
 * The profile is about to be saved with `played` seconds on the clock: the
 * step it was on is beaten if its goal moved on, and so is every step it
 * went straight past (at 0 seconds, so the funnel never has a gap), and
 * the step it's on now starts.
 */
export function advance(p: Profile, played: number): Progress {
  const i = stepIndex(p);
  const was = indexOf(p.stats.step);
  const timed: Profile = { ...p, stats: { ...p.stats, played } };
  if (i < 0 || i === was) return { profile: timed, events: [] };
  if (was < 0 || i < was) return { profile: onStep(p, i, played), events: was < 0 ? reach(i) : [] };
  const passed = Array.from({ length: i - was - 1 }, (_, k) => [start(was + 1 + k), win(was + 1 + k, 0)]).flat();
  return { profile: onStep(p, i, played), events: [win(was, played - p.stats.since), ...passed, ...reach(i)] };
}
