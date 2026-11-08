import type { MapDef } from '../src/level/types';
import {
  afterBattle, answerPrompt, battleSides, dayOfWeek, endDay, heroTown, heroVisiting, liveObjects, monsterArmy, planPath, playerTowns, startAdventure, stepHero, withTown, type Adventure,
} from '../src/logic/adventure';
import type { PathStep } from '../src/logic/path';
import { armyStrength, autoBattle } from '../src/logic/rival';
import { build, cantBuild, hireAll, suggestBuilding } from '../src/logic/town';
import type { MapObject } from '../src/logic/objects';

/**
 * A simple player for balancing a part on the real rules (the chapter-1
 * method, docs/inkheroes-design.md "Balance"): it builds the town's plan a
 * building a day, hires everything it can whenever the hero is home, rides
 * to the nearest thing worth having (piles, chests, mines, sites, and
 * monsters it is at least `edge` times stronger than), comes home at the
 * start of a week to hire, and takes on the goal once it is `bossEdge` times
 * stronger. Every fight is played out by the battle AI on both sides
 * (`autoBattle`), so the bot casts no spells: a person should lose less.
 */

export interface Fight {
  readonly id: string;
  readonly day: number;
  /** Strength of the hero's army before and after. */
  readonly before: number;
  readonly after: number;
  readonly won: boolean;
}

export interface BotRun {
  readonly won: boolean;
  /** The day the part ended (won or lost), or the last day played. */
  readonly day: number;
  readonly fights: readonly Fight[];
  /** The goal's fight, if it came to it. */
  readonly goal?: Fight;
}

export interface BotOptions {
  readonly seed: number;
  readonly maxDays?: number;
  /** How many times stronger the hero's army must be to fight a monster. */
  readonly edge?: number;
  /** How many times stronger to take on the goal. */
  readonly bossEdge?: number;
}

/** What a monster's army is worth (a boss's brood counts too). */
export const monsterStrength = (m: MapObject): number => armyStrength(monsterArmy(m));

/** Answers every card waiting: gold from chests, the first skill offered. */
function answerAll(adv: Adventure): Adventure {
  let a = adv;
  for (let i = 0; i < 50 && a.prompts.length; i++) {
    const p = a.prompts[0]!;
    a = answerPrompt(a, p.kind === 'chest' ? 'gold' : p.kind === 'levelUp' ? p.offer.choices[0] : undefined);
  }
  return a;
}

/** The town's next building in its plan, if it can go up today. */
function buildToday(adv: Adventure, def: MapDef): Adventure {
  const town = playerTowns(adv)[0];
  if (!town || town.builtToday) return adv;
  const b = suggestBuilding(town, adv.purse, def.off);
  if (!b || cantBuild(town, b, adv.purse, def.off)) return adv;
  const r = build(town, b, adv.purse, def.off);
  return { ...withTown(adv, r.town), purse: r.purse };
}

/** Everything the town has that the purse allows, into the hero's army. */
function hireHome(adv: Adventure): Adventure {
  const town = heroTown(adv);
  if (!town || !heroVisiting(adv)) return adv;
  const r = hireAll(town, adv.hero.army, adv.purse);
  return { ...withTown(adv, r.town), purse: r.purse, hero: { ...adv.hero, army: r.army } };
}

/** Whether `o` is worth riding to now. */
function worth(adv: Adventure, def: MapDef, o: MapObject, edge: number, bossEdge: number): boolean {
  const ours = armyStrength(adv.hero.army);
  if (o.kind === 'monster') return monsterStrength(o) * (o.id === def.goal.target ? bossEdge : edge) <= ours;
  if (o.kind === 'mine') return o.owner !== 'player';
  if (o.kind === 'windmill' || o.kind === 'stables' || o.kind === 'item') return false;
  if (['mercCamp', 'watchtower', 'standingStone', 'shrine', 'spellbook'].includes(o.kind)) return !adv.hero.visited.includes(o.id);
  return true;
}

/** A guard too strong for us stands by `o`. */
function guardedTooWell(adv: Adventure, o: MapObject, edge: number): boolean {
  const ours = armyStrength(adv.hero.army);
  return liveObjects(adv).some((m) => m.kind === 'monster' && m.id !== o.id && Math.abs(m.x - o.x) <= 1 && Math.abs(m.y - o.y) <= 1 && monsterStrength(m) * edge > ours);
}

const pathCost = (p: readonly PathStep[]): number => p.reduce((n, s) => n + s.cost, 0);

/** The nearest target worth riding to, and the way there (home at the start of a week, when nothing better is near). */
function pickTarget(adv: Adventure, def: MapDef, edge: number, bossEdge: number): PathStep[] | null {
  const home = playerTowns(adv)[0];
  if (home && dayOfWeek(adv.day) <= 2 && !heroTown(adv) && Object.values(home.stock).some((n) => (n ?? 0) > 0)) {
    const back = planPath(adv, def, home.x, home.y);
    if (back && back.length && back[back.length - 1]!.day <= 1) return back;
  }
  let best: PathStep[] | null = null;
  for (const o of liveObjects(adv)) {
    if (!worth(adv, def, o, edge, bossEdge) || guardedTooWell(adv, o, edge)) continue;
    const p = planPath(adv, def, o.x, o.y);
    if (p && p.length && (!best || pathCost(p) < pathCost(best))) best = p;
  }
  if (best) return best;
  if (home && !heroTown(adv)) return planPath(adv, def, home.x, home.y);
  return null;
}

/** Rides today's part of the way, fighting what stops the hero. */
function ride(adv: Adventure, def: MapDef, path: readonly PathStep[], fights: Fight[]): { adv: Adventure; moved: boolean } {
  let a = adv;
  let moved = false;
  const end = path[path.length - 1]!;
  for (const step of path) {
    if (step.day > 0) break;
    const r = stepHero(a, def, step, end);
    a = answerAll(r.adv);
    moved = true;
    if (r.battle) {
      const before = armyStrength(a.hero.army);
      const setup = battleSides(a, r.battle);
      const st = autoBattle(setup.attacker, setup.defender, setup.seed);
      a = answerAll(afterBattle(a, def, r.battle, st, r.then));
      fights.push({ id: r.battle, day: a.day, before, after: a.status === 'lost' ? 0 : armyStrength(a.hero.army), won: a.status !== 'lost' });
    }
    if (r.town) a = hireHome(a);
    if (r.stop) break;
  }
  return { adv: a, moved };
}

/** Plays `def` from its start to a win, a loss or `maxDays`. */
export function playPart(def: MapDef, opts: BotOptions): BotRun {
  const { seed, maxDays = 80, edge = 2, bossEdge = 1.6 } = opts;
  let adv: Adventure = answerAll({ ...startAdventure(def), seed });
  const fights: Fight[] = [];
  while (adv.status === 'playing' && adv.day <= maxDays) {
    adv = hireHome(buildToday(adv, def));
    for (let leg = 0; leg < 12 && adv.status === 'playing' && adv.hero.mp > 0; leg++) {
      const path = pickTarget(adv, def, edge, bossEdge);
      if (!path || !path.length) break;
      const r = ride(adv, def, path, fights);
      adv = r.adv;
      if (!r.moved) break;
    }
    if (adv.status !== 'playing') break;
    adv = answerAll(endDay(adv));
  }
  const goal = fights.find((f) => f.id === def.goal.target);
  return { won: adv.status === 'won', day: adv.day, fights, ...(goal ? { goal } : {}) };
}
