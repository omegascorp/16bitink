import type { MapDef } from '../../level/types';
import {
  afterBattle, answerPrompt, battleSides, fieldOf, GATE, liveObjects, ourHeroes, planPath, playerTowns, RIVAL, rivalHeroes, stepHero, townById, withTown, type Adventure,
} from '../adventure';
import { addTroops, type Army } from '../army';
import { playerSide, survivors } from '../battle';
import type { BattleState } from '../battleTypes';
import { hireAtDwelling } from '../dwellings';
import { selectHero, withHero } from '../heroes';
import type { Hero } from '../hero';
import type { PathStep } from '../path';
import { autoBattle } from '../autoBattle';
import { armyStrength } from '../strength';
import { lookAbout, remember, type LordMemory } from './knowledge';
import { goalOf, keepFor, savingTown } from './build';
import { RESOURCES } from '../resources';
import { ranked, reachOf, SAFE, targetsFor, threatAt, throughView, type Ctx, type Job } from './targets';
import { findPath } from '../path';
import { dailyMp } from '../hero';
import { lordHeroes, outfit, spendable, townsEvening, townsMorning, type LordRules } from './towns';
import { portalDuty } from './portal';

/**
 * A lord's whole day, for the side played as "ours" (the player's, or the
 * rival's on the mirrored adventure): his towns build and hire, then each
 * hero rides (the runners first, the main hero last; a Portal's duty
 * first, portal.ts), choosing from what the side knows, under the
 * player's rules; the evening hires garrisons where a foe draws near. A fight with the other side is fought at once
 * (`auto`, AI against AI) or stops the day (`stop`: the player plays it).
 */

export interface LordOptions extends LordRules {
  readonly resolve: 'auto' | 'stop';
  /** The side's odds for a fight (targets.ts Ctx.dare); none: the lord's own, SAFE. */
  readonly dare?: number;
  /** The part's day from which he rides for a raced town (Ctx.raceFrom). */
  readonly raceFrom?: number;
  /** The main hero commits to a siege he can win (Ctx.commit). */
  readonly commit?: boolean;
}

export interface LordDay {
  readonly adv: Adventure;
  readonly memory: LordMemory;
  /** The fight with the other side that stopped the day (`stop`): RIVAL, or the id of a town of theirs. */
  readonly fight?: string;
  /** The tiles the side's heroes walked, in order. */
  readonly path: readonly { x: number; y: number }[];
}

/** How many legs a hero rides in a day at most (a stop at a site, a fight, a meeting each end one). */
const LEGS = 8;
/** How many of the best targets are tried for a safe way before giving up. */
const TRIES = 6;

export function lordDay(adv: Adventure, def: MapDef, memory: LordMemory, opts: LordOptions): LordDay {
  let a = lookAbout(adv, def);
  let mem = remember(a, def, memory);
  const morning = townsMorning(a, def, mem, opts);
  a = morning.adv;
  mem = morning.memory;
  const path: { x: number; y: number }[] = [];
  const main = mainHero(a, mem);
  mem = { ...mem, ...(main ? { main: main.id } : {}) };
  // Runners first: the main hero's ride, which may end in a fight that stops the day, comes last.
  const order = lordHeroes(a).sort((x, y) => (x.id === main?.id ? 1 : 0) - (y.id === main?.id ? 1 : 0)).map((h) => h.id);
  for (const id of order) {
    // A Portal first: home through a Great Portal to a town in danger, or a band fought (src/logic/lord/portal.ts); either ends his day.
    if (a.status === 'playing') a = portalDuty(a, def, mem, id, id === main?.id, opts);
    for (let leg = 0; leg < LEGS && a.status === 'playing'; leg++) {
      const hero = ourHeroes(a).find((h) => h.id === id);
      if (!hero || hero.mp <= 0 || armyStrength(hero.army) <= 0) break;
      a = selectHero(a, id);
      const job: Job = id === mainHero(a, mem)?.id ? 'main' : 'runner';
      const way = chooseWay(a, def, mem, a.hero, job, opts);
      if (!way) break;
      const g = (way as { goal?: { x: number; y: number } }).goal;
      if (g) mem = { ...mem, goals: { ...mem.goals, [id]: g } };
      const r = walk(a, def, mem, way, opts);
      a = r.adv;
      path.push(...r.walked);
      a = lookAbout(a, def);
      mem = remember(a, def, mem);
      if (r.fight) return { adv: a, memory: mem, fight: r.fight, path };
      if (!r.moved) break;
    }
  }
  a = townsEvening(a, def, mem);
  return { adv: lookAbout(a, def), memory: remember(a, def, mem), path };
}

/** The main hero: the one remembered, while his army is near the strongest's (KEEP_MAIN); else the strongest. */
function mainHero(adv: Adventure, memory: LordMemory): Hero | null {
  const heroes = lordHeroes(adv);
  const strongest = heroes.reduce<Hero | null>((best, h) => (!best || armyStrength(h.army) > armyStrength(best.army) ? h : best), null);
  const kept = heroes.find((h) => h.id === memory.main);
  return kept && strongest && armyStrength(kept.army) >= armyStrength(strongest.army) * KEEP_MAIN ? kept : strongest;
}

/** The main hero stays the main while his army is this share of the strongest's. */
const KEEP_MAIN = 0.75;
/** The target a hero rode for yesterday is worth this much more today. */
const KEEP_GOAL = 1.6;

/** The way to the best target whose day's end is safe (rule 6), or null. */
function chooseWay(adv: Adventure, def: MapDef, memory: LordMemory, hero: Hero, job: Job, opts: LordOptions, bold = false): PathStep[] | null {
  const ctx: Ctx = {
    adv, def, memory, main: mainHero(adv, memory), gold: spendable(adv, memory), short: lacking(adv, def), bold,
    ...(opts.dare !== undefined ? { dare: opts.dare } : {}), ...(opts.raceFrom !== undefined ? { raceFrom: opts.raceFrom } : {}), ...(opts.commit ? { commit: true } : {}),
  };
  const share = job === 'main' ? opts.dare ?? SAFE.guard : SAFE.runner;
  const reach = reachOf(adv, def, hero, share);
  const mine = armyStrength(hero.army);
  const goal = memory.goals?.[hero.id];
  const kept = targetsFor(ctx, hero, job, reach).map((t) => (goal && t.x === goal.x && t.y === goal.y ? { ...t, value: t.value * KEEP_GOAL } : t));
  for (const t of ranked(kept, reach, TRIES)) {
    // The way round, or the way through a guard he would fight (fought on the step into its zone) when that is shorter.
    const round = planPath(adv, def, t.x, t.y);
    const through = findPath(throughView(adv, def, hero, share), hero, t.x, t.y, hero.mp, dailyMp(hero));
    const way = through && (!round || through.length < round.length) ? through : round;
    if (!way?.length || way[0]!.day > 0) continue;
    const end = way.filter((s) => s.day === 0).at(-1)!;
    const home = playerTowns(adv).some((x) => x.x === end.x && x.y === end.y);
    // Never a day's end within reach of a hero clearly stronger (behind his own walls excepted).
    if (!home && t.kind !== 'hero' && threatAt(ctx, end.x, end.y, mine)) continue;
    return Object.assign(way, { goal: { x: t.x, y: t.y } });
  }
  // Nothing worth a ride: the main hero fights through a stronger guard that shuts him in (once a day).
  return bold || job !== 'main' ? null : chooseWay(adv, def, memory, hero, job, opts, true);
}

/** The goods the side's big goal (build.ts) still lacks. */
function lacking(adv: Adventure, def: MapDef): Set<string> {
  const town = savingTown(playerTowns(adv), def.off);
  const goal = town ? goalOf(town, def.off) : null;
  if (!town || !goal) return new Set();
  // The goal's goods, and the step's on the way to it (keepFor).
  const keep = keepFor(goal, 0, town, def.off);
  return new Set(RESOURCES.filter((r) => r !== 'gold' && (keep[r] ?? 0) > adv.purse[r]));
}

interface Walk {
  readonly adv: Adventure;
  readonly walked: { x: number; y: number }[];
  readonly moved: boolean;
  readonly fight?: string;
}

/** Today's part of `way`, step by step as the player's hero walks it: visits, fights, meetings and towns on the way. */
function walk(adv: Adventure, def: MapDef, memory: LordMemory, way: readonly PathStep[], opts: LordOptions): Walk {
  let a = adv;
  const walked: { x: number; y: number }[] = [];
  const end = way[way.length - 1]!;
  const id = adv.hero.id;
  for (const step of way) {
    if (step.day > 0 || a.hero.id !== id) break;
    const r = stepHero(a, def, step, end);
    a = answerAll(r.adv, memory);
    if (!r.battle && !r.meet && (a.hero.x !== adv.hero.x || a.hero.y !== adv.hero.y || r.stop)) walked.push({ x: a.hero.x, y: a.hero.y });
    if (r.battle) {
      if (opts.resolve === 'stop' && theirs(a, r.battle)) return { adv: a, walked, moved: true, fight: r.battle };
      a = fightOut(a, def, r.battle, memory, r.then);
      // The gate won: the town's walls are fought next, with what lived.
      if (a.rivalFight && a.status === 'playing' && a.hero.id === id) a = fightOut(a, def, a.rivalFight, memory);
      return { adv: a, walked, moved: true };
    }
    // A meeting that hands nothing over ends the hero's day (it would only be met again).
    if (r.meet) { const met = handOver(a, r.meet); return { adv: met ?? a, walked, moved: !!met }; }
    if (r.town) a = outfit(a, def, id, memory, opts);
    if (r.stop) return { adv: a, walked, moved: true };
  }
  return { adv: a, walked, moved: walked.length > 0 };
}

/** A fight with the other side: their hero, or a town of theirs. */
const theirs = (adv: Adventure, id: string): boolean => id === RIVAL || id.startsWith(GATE) || townById(adv, id)?.owner === 'rival' || rivalHeroes(adv).some((h) => townById(adv, id)?.x === h.x && townById(adv, id)?.y === h.y);

/**
 * Fight `id` played out by the battle AI on both sides, spells and all. The
 * side's hero leaves a lost battle for a town of his (rule 8), as Kassander
 * does: back home with no army, to hire again.
 */
function fightOut(adv: Adventure, def: MapDef, id: string, memory: LordMemory, then?: string): Adventure {
  const setup = battleSides(adv, id, def);
  const me = setup.siege?.me ?? 0;
  const refuge = playerTowns(adv).find((t) => t.id !== id);
  const mySide = me === 0 ? setup.attacker : setup.defender;
  const fleeing = refuge && mySide.hero ? { ...mySide, hero: { ...mySide.hero, canFlee: true } } : mySide;
  const st = autoBattle(me === 0 ? fleeing : setup.attacker, me === 0 ? setup.defender : fleeing, setup.seed, setup.siege, undefined, fieldOf(setup));
  if (st.fled === playerSide(st) && refuge) return retreat(adv, id, st, refuge);
  return answerAll(afterBattle(adv, def, id, st, then), memory);
}

/** The side's hero left the field: home to `refuge` with no army and no move left; the foe keeps what lived. */
function retreat(adv: Adventure, id: string, st: BattleState, refuge: { x: number; y: number }): Adventure {
  const his = playerSide(st) === 0 ? 1 : 0;
  let a = withHero(adv, { ...adv.hero, x: refuge.x, y: refuge.y, mp: 0, army: adv.hero.army.map(() => null) });
  const town = townById(a, id);
  if (town) a = withTown(a, { ...town, garrison: survivors(st, his, town.garrison) });
  const foe = a.rival?.hero;
  if ((id === RIVAL || id.startsWith(GATE)) && foe) a = { ...a, rival: { ...a.rival!, hero: { ...foe, army: survivors(st, his, foe.army) } } };
  return a;
}

/** A runner meets the main hero (or any hero of the side): every company of the weaker that fits joins the stronger, but his weakest. */
function handOver(adv: Adventure, otherId: string): Adventure | null {
  const other = ourHeroes(adv).find((h) => h.id === otherId);
  if (!other) return null;
  const [giver, taker] = armyStrength(adv.hero.army) <= armyStrength(other.army) ? [adv.hero, other] : [other, adv.hero];
  const r = gives(giver.army, taker.army);
  return r ? withHero(withHero(adv, { ...giver, army: r.from }), { ...taker, army: r.to }) : null;
}

/** `from`'s companies that fit into `to` (a like one, or a free slot), all but its weakest; null when none moves. */
export function gives(from: Army, to: Army): { from: Army; to: Army } | null {
  const order = from.map((s, i) => ({ s, i })).filter((x) => x.s).sort((x, y) => armyStrength([y.s]) - armyStrength([x.s]));
  let a = from;
  let b = to;
  for (const { s, i } of order.slice(0, -1)) {
    const next = addTroops(b, s!.creature, s!.count);
    if (!next) continue;
    b = next;
    a = a.map((x, j) => (j === i ? null : x));
  }
  return b === to ? null : { from: a, to: b };
}

/** The cards a lord's day raises, answered as he would: gold from chests, the first skill offered, all a dwelling has to hire. */
export function answerAll(adv: Adventure, memory: LordMemory): Adventure {
  let a = adv;
  for (let i = 0; i < 50 && a.prompts.length; i++) {
    const p = a.prompts[0]!;
    if (p.kind === 'dwelling') {
      const o = liveObjects(a).find((x) => x.id === p.id);
      const gold = spendable(a, memory);
      const r = o ? hireAtDwelling(o, { ...a.purse, gold }, a.hero.army) : null;
      a = r ? { ...a, purse: { ...r.purse, gold: r.purse.gold + (a.purse.gold - gold) }, hero: { ...a.hero, army: r.army }, objects: a.objects.map((x) => (x.id === p.id ? r.dwelling : x)) } : a;
      a = { ...a, prompts: a.prompts.slice(1) };
      continue;
    }
    a = answerPrompt(a, p.kind === 'chest' ? 'gold' : p.kind === 'levelUp' ? p.offer.choices[0] : undefined);
  }
  return a;
}

