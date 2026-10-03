import { SPECIES_INFO } from './species';
import type { LevelDef, Modifiers, Objective, SpawnEntry, SpeciesId, TwistId } from './types';

/**
 * Every chapter runs the same arc so new rules arrive one at a time:
 * a plain opener, one level per twist, a remix of two, then a giant.
 * Slot 8 (the remix) is picked per chapter so no two chapters repeat it.
 */
const ARC: readonly (TwistId | 'remix')[] = ['grow', 'collect', 'current', 'bounty', 'rush', 'storm', 'dark', 'survive', 'remix', 'boss'];

/** A goal twist paired with a rule twist; one per chapter, in order. */
const REMIXES: readonly (readonly [TwistId, TwistId])[] = [
  ['collect', 'current'], ['bounty', 'current'], ['survive', 'storm'], ['rush', 'current'], ['collect', 'dark'],
  ['bounty', 'storm'], ['bounty', 'dark'], ['survive', 'dark'], ['rush', 'dark'], ['collect', 'storm'],
];

export function twistsFor(chapter: number, index: number): readonly TwistId[] {
  const slot = ARC[index % ARC.length]!;
  return slot === 'remix' ? REMIXES[(chapter - 1) % REMIXES.length]! : [slot];
}

/** Twists that only add a rule; the rest decide the goal. */
const RULES: ReadonlySet<TwistId> = new Set<TwistId>(['current', 'storm', 'dark']);

/** Where a level sits in its chapter, and the chapter's giant. */
export interface TwistContext {
  readonly index: number;
  readonly boss: SpeciesId;
}

/** The giant is the biggest thing in its level: everything else is kept at most this share of its size. */
const BOSS_HEADROOM = 0.85;

function objectiveFor(goal: TwistId, level: LevelDef, boss: SpeciesId): Objective {
  const ch = level.chapter;
  const [small, mid, full] = level.playerSizes;
  switch (goal) {
    case 'collect':
      return { kind: 'collect', count: 8 + Math.floor(ch / 2) };
    case 'bounty':
      // Edible only once the player has grown once: hunt, but earn it.
      return { kind: 'bounty', count: 3, species: level.spawns[1]?.species ?? level.spawns[0]!.species, size: [small, Math.floor(mid * 0.85)] };
    case 'boss':
      return { kind: 'boss', species: boss, size: Math.round(full * 0.82) };
    default:
      return { kind: 'grow' };
  }
}

/** Applies a level's twists to the plain generated level. Pure: returns a new level. */
export function applyTwists(level: LevelDef, twists: readonly TwistId[], ctx: TwistContext): LevelDef {
  const { index } = ctx;
  const goal = twists.find((t) => !RULES.has(t)) ?? 'grow';
  const has = (t: TwistId): boolean => twists.includes(t);
  const hooksHere = level.hazards.hookEverySec > 0;
  const goalPts = level.tiers[2];
  const modifiers: Modifiers = {
    ...(has('rush') ? { timeLimit: Math.round(goalPts * 1.1 + 30) } : {}),
    ...(has('current') ? { current: (index % 2 === 0 ? 1 : -1) * (70 + level.chapter * 6) } : {}),
    ...(has('dark') ? { dark: true } : {}),
    ...(has('survive') ? { lives: 1 } : {}),
  };
  const staple = (w: number): readonly SpawnEntry[] => level.spawns.map((s, i) => (i === 0 ? { ...s, weight: s.weight * w } : s));
  const predators = (w: number): readonly SpawnEntry[] => level.spawns.map((s, i) => (i === 0 ? s : { ...s, weight: s.weight * w }));
  const objective = objectiveFor(goal, level, ctx.boss);
  const cap = objective.kind === 'boss' ? Math.floor(objective.size * BOSS_HEADROOM) : Infinity;
  const capped = (list: readonly SpawnEntry[]): readonly SpawnEntry[] =>
    list.map((s) => ({ ...s, size: [Math.min(s.size[0], cap), Math.min(s.size[1], cap)] as const }));
  return {
    ...level,
    twists,
    objective,
    modifiers,
    spawns: capped(has('rush') ? staple(2.5) : has('survive') ? predators(1.3) : level.spawns),
    maxFish: Math.round(level.maxFish * (has('rush') ? 1.4 : has('survive') ? 1.1 : 1)),
    hazards: has('storm')
      ? hooksHere
        ? { ...level.hazards, hookEverySec: 4 }
        : { ...level.hazards, jellyfish: Math.round(level.hazards.jellyfish * 2 + 4) }
      : level.hazards,
    parTime: parTimeFor(objective, modifiers, level.parTime, goalPts),
  };
}

function parTimeFor(objective: Objective, modifiers: Modifiers, base: number, goalPts: number): number {
  if (modifiers.timeLimit) return Math.round(goalPts * 0.8 + 15);
  switch (objective.kind) {
    // Growing is always part of the job; the twist's task adds time on top.
    case 'collect': return base + objective.count * 5;
    case 'bounty': return base + 25;
    case 'boss': return base + 30;
    default: return base;
  }
}


const LABEL: Readonly<Record<TwistId, string>> = {
  grow: 'Feeding time', collect: 'Ink drops', current: 'Strong current', bounty: 'Marked fish', rush: 'School rush',
  storm: 'Hook storm', dark: 'Lights out', survive: 'One life', boss: 'The giant',
};

export interface LevelDescription {
  /** Short name of the twist(s), shown above the level name. */
  readonly tag: string;
  /** What to do to win. */
  readonly goal: string;
  /** Extra rules worth knowing before you start. */
  readonly notes: readonly string[];
}

function goalText(level: LevelDef): string {
  const o = level.objective;
  switch (o.kind) {
    case 'collect': return `Grow to full size and collect all ${o.count} ink drops.`;
    case 'bounty': return `Grow to full size and eat the ${o.count} ${SPECIES_INFO[o.species].plural} circled in red.`;
    case 'boss': return `Grow to full size, then eat the giant ${SPECIES_INFO[o.species].name}.`;
    default:
      return level.modifiers.timeLimit
        ? `Grow to full size in ${level.modifiers.timeLimit} seconds.`
        : 'Eat smaller fish and grow to full size.';
  }
}

export interface DescribeOptions {
  /** Name of the player fish when this level is the first one with it. */
  readonly newPlayer?: string;
}

export function describeLevel(level: LevelDef, opts: DescribeOptions = {}): LevelDescription {
  const jellyBloom = level.twists.includes('storm') && level.hazards.hookEverySec === 0;
  const labels = level.twists.map((t) => (t === 'storm' && jellyBloom ? 'Jelly bloom' : LABEL[t]));
  const notes: string[] = [];
  if (opts.newPlayer) notes.push(`You swim as a ${opts.newPlayer} now.`);
  for (const id of level.debuts) notes.push(`New fish: ${SPECIES_INFO[id].name}. ${SPECIES_INFO[id].note}`);
  const c = level.modifiers.current;
  if (c) notes.push(`A strong current pulls everything to the ${c > 0 ? 'right' : 'left'}.`);
  if (level.modifiers.lives === 1) notes.push('Only one life: a single hit ends the level.');
  if (level.modifiers.dark) notes.push('It’s dark: you only see what’s close to you.');
  if (level.twists.includes('storm')) notes.push(jellyBloom ? 'The water is thick with jellyfish.' : 'Hooks keep dropping. Watch for the dotted lines.');
  const tag = labels.map((l, i) => (i === 0 ? l : l.charAt(0).toLowerCase() + l.slice(1))).join(', ');
  return { tag, goal: goalText(level), notes };
}
