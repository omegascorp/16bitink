import { lairOfGroup } from '../src/logic/loot';
import type { MapDef } from '../src/level/types';
import {
  afterBattle, answerPrompt, battleSides, buyMachine, fieldOf, cantBuyMachine, dayOfWeek, endDay, garrisonHero, heroInGarrison, heroTown, leadOut, heroVisiting, liveObjects, monsterArmy, planPath, playerTowns, rivalAt, rivalHero, rivalHeroes, startAdventure, stepHero, withTown, type Adventure,
} from '../src/logic/adventure';
import { rideOn } from '../src/logic/chapter';
import { soldOn } from '../src/level/unlocks';
import type { PathStep } from '../src/logic/path';
import { armyStrength, rivalTurn } from '../src/logic/rival';
import { build, cantBuild, hireAll, suggestBuilding } from '../src/logic/town';
import type { MapObject } from '../src/logic/objects';
import { armyOf, moveAll } from '../src/logic/army';
import { dailyMp } from '../src/logic/hero';
import { bagRoom, hasAsGood, hasSpellbook } from '../src/logic/items';
import { tilesOf } from '../src/logic/map';
import { canAfford } from '../src/logic/resources';
import { has } from '../src/logic/town';
import { creature, type CreatureId } from '../src/logic/creatures';
import { act, activeStack, createBattle } from '../src/logic/battle';
import { chooseAction } from '../src/logic/battleAi';
import type { BattleState } from '../src/logic/battleTypes';
import type { SpellId } from '../src/logic/spells';

/**
 * A simple player for balancing a part on the real rules (the chapter-1
 * method, docs/inkheroes-design.md "Balance"): it builds the town's plan a
 * building a day, hires everything it can whenever the hero is home, rides
 * to the nearest thing worth having (piles, chests, mines, sites, and
 * monsters it is at least `edge` times stronger than), comes home at the
 * start of a week to hire, and takes on the goal once it is `bossEdge` times
 * stronger. Every fight is played out by the battle AI on both sides
 * (as `autoBattle` does), so the bot casts no spells unless `casts`: a person should lose less.
 */

export interface Fight {
  readonly id: string;
  readonly day: number;
  /** Strength of the hero's army before and after. */
  readonly before: number;
  readonly after: number;
  readonly won: boolean;
  /** The spells the hero cast in it, in order (only with `casts`). */
  readonly cast: readonly SpellId[];
}

export interface BotRun {
  /** Where the part was left, to ride on into the next. */
  readonly adv: Adventure;
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
  /** Buys the best war machine its Blacksmith (Egypt's Workshop) sells, once the purse allows (default true). */
  readonly machine?: boolean;
  /** Rides for the goal as soon as it is `bossEdge` times stronger, whatever is nearer (a player who knows where they're going). */
  readonly goalFirst?: boolean;
  /** Sees the adventure just before the goal's fight (to replay that fight other ways). */
  readonly beforeGoal?: (adv: Adventure) => void;
  /**
   * Plays a land with a rival lord and several towns of ours as a player
   * would: hires where what the purse can buy is worth the ride (a tenth of
   * the army or more, early in a week), keeps its two lowest lines at home as
   * the town's garrison (up to a third of its army), falls back on a town when the rival is near and
   * strong, retakes a town he took and hunts him once strong enough.
   */
  readonly wise?: boolean;
  /** Sees the adventure each morning, after the rival's night (for probes). */
  readonly morning?: (adv: Adventure) => void;
  /** The hero casts in battle as Auto does (battleCasts.ts), once they have a spellbook: a part whose lesson is magic (Uppsala's runes) is balanced so. Left out, the hero casts nothing, as the older tables were measured. */
  readonly casts?: boolean;
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

/** Gold a wise bot keeps for hiring before it builds. */
const HIRE_RESERVE = 6000;

/** The town's next building in its plan, if it can go up today (a wise bot keeps HIRE_RESERVE for hiring first). */
function buildToday(adv: Adventure, def: MapDef, wise = false): Adventure {
  const town = playerTowns(adv)[0];
  if (!town || town.builtToday || (wise && adv.purse.gold < HIRE_RESERVE)) return adv;
  const b = suggestBuilding(town, adv.purse, def.off);
  if (!b || cantBuild(town, b, adv.purse, def.off)) return adv;
  const r = build(town, b, adv.purse, def.off);
  return { ...withTown(adv, r.town), purse: r.purse };
}

/** Everything the town has that the purse allows, into the hero's army; and a war machine first, if `machine` and one is sold here. */
function hireHome(adv: Adventure, def: MapDef, machine: boolean, wise = false): Adventure {
  const visited = heroTown(adv);
  if (!visited || !heroVisiting(adv)) return adv;
  const sold = machine ? soldOn(def.n).filter((m) => !cantBuyMachine(adv, m)) : [];
  let armed = sold.length ? buyMachine(adv, sold[sold.length - 1]!) : adv;
  let town = visited;
  if (wise && adv.rival) {
    // With a rival about, the two lowest lines stay as the town's garrison, up to a third of the hero's army.
    const low = Object.fromEntries(Object.entries(town.stock).filter(([id]) => creature(id as CreatureId).level <= 2));
    const room = Math.max(0, armyStrength(armed.hero.army) / 3 - armyStrength(town.garrison));
    const g = hireAll({ ...town, stock: low }, town.garrison, armed.purse, 0, room);
    town = { ...town, stock: { ...town.stock, ...g.town.stock }, garrison: g.army };
    armed = { ...withTown(armed, town), purse: g.purse };
  }
  let r = hireAll(town, armed.hero.army, armed.purse);
  if (wise && threatened({ ...armed, hero: { ...armed.hero, army: r.army } })) {
    // The rival near and strong: the garrison rides with the hero, who meets him behind the walls with everything.
    const m = moveAll(r.town.garrison, r.army);
    if (m) r = { ...r, army: m.dst, town: { ...r.town, garrison: m.src } };
  }
  return { ...withTown(armed, r.town), purse: r.purse, hero: { ...armed.hero, army: r.army } };
}

/** A town not ours: what its garrison is worth, and the rival lord's army when he stands in it. */
function townStrength(adv: Adventure, id: string): number {
  const t = adv.towns.find((x) => x.id === id);
  if (!t) return 0;
  return armyStrength(t.garrison) + (rivalAt(adv, t.x, t.y) ? armyStrength(rivalHero(adv)!.army) : 0);
}

/** Whether `o` is worth riding to now. */
function worth(adv: Adventure, def: MapDef, o: MapObject, edge: number, bossEdge: number): boolean {
  const ours = armyStrength(adv.hero.army);
  // A lair's weekly group is farming, not part of the plan: the bot fights it only when it stands in the way.
  if (o.kind === 'monster' && lairOfGroup(o.id)) return false;
  if (o.kind === 'monster') return monsterStrength(o) * (o.id === def.goal.target ? bossEdge : edge) <= ours;
  if (o.kind === 'mine') return o.owner !== 'player';
  // A lair is a door, never visited: only its groups are fought. Training sites aren't part of the plan either.
  if (o.kind === 'windmill' || o.kind === 'stables' || o.kind === 'item' || o.kind === 'lair' || o.kind === 'arena' || o.kind === 'sanctum') return false;
  // A shrine is copied into a spellbook: without one there is nothing to ride there for.
  if (o.kind === 'shrine' && !hasSpellbook(adv.hero)) return false;
  if (['mercCamp', 'watchtower', 'standingStone', 'shrine', 'spellbook'].includes(o.kind)) return !adv.hero.visited.includes(o.id);
  return true;
}

/** A guard too strong for us stands by `o`. */
function guardedTooWell(adv: Adventure, o: MapObject, edge: number): boolean {
  const ours = armyStrength(adv.hero.army);
  return liveObjects(adv).some((m) => m.kind === 'monster' && m.id !== o.id && Math.abs(m.x - o.x) <= 1 && Math.abs(m.y - o.y) <= 1 && monsterStrength(m) * edge > ours);
}

const pathCost = (p: readonly PathStep[]): number => p.reduce((n, s) => n + s.cost, 0);

/** How the rival lord picks a fight with our hero: when he is this many times stronger (src/logic/rival.ts, SAFE.hero). */
const RIVAL_DARES = 1.3;
/** How near (tiles) a rival that strong must be for the bot to fall back on a town. */
const RIVAL_NEAR = 30;

/** What the purse could hire in town `t` now. */
const affordable = (adv: Adventure, t: Adventure['towns'][number]): number => armyStrength(hireAll(t, armyOf([]), adv.purse).army);
/** A wise bot rides home to hire only for this share of its army or more. */
const WORTH_THE_RIDE = 0.1;

/** The nearest town of ours (Abu, Gebtu once taken…) where the purse can hire a tenth of the army or more, else the first (coordinator, Nov 8). */
function homeFor(adv: Adventure, def: MapDef): Adventure['towns'][number] | undefined {
  let best: { t: Adventure['towns'][number]; cost: number } | null = null;
  for (const t of playerTowns(adv)) {
    if (affordable(adv, t) < armyStrength(adv.hero.army) * WORTH_THE_RIDE) continue;
    const p = heroTown(adv)?.id === t.id ? [] : planPath(adv, def, t.x, t.y);
    if (!p) continue;
    const cost = pathCost(p);
    if (!best || cost < best.cost) best = { t, cost };
  }
  return best?.t ?? playerTowns(adv)[0];
}

/** The rival lord near and strong enough to ride at us. */
function threatened(adv: Adventure): boolean {
  const foe = rivalHero(adv);
  if (!foe) return false;
  const near = Math.max(Math.abs(foe.x - adv.hero.x), Math.abs(foe.y - adv.hero.y)) <= RIVAL_NEAR;
  return near && armyStrength(foe.army) >= (armyStrength(adv.hero.army) * RIVAL_DARES) / 1.3;
}

/** The rival lord, at least RIVAL_DARES times stronger, could reach `tile` in a day's ride. */
function inHisReach(adv: Adventure, tile: { x: number; y: number }): boolean {
  const foe = rivalHero(adv);
  if (!foe || armyStrength(foe.army) < armyStrength(adv.hero.army) * RIVAL_DARES) return false;
  return Math.max(Math.abs(foe.x - tile.x), Math.abs(foe.y - tile.y)) <= tilesOf(dailyMp(foe)) + 1;
}

/** A town of ours with a Blacksmith (Egypt's Workshop) selling a machine better than the hero's, and the way there. */
function toBetterMachine(adv: Adventure, def: MapDef): PathStep[] | null {
  if (!soldOn(def.n).some((m) => !hasAsGood(adv.hero, m) && canAfford(adv.purse, creature(m).cost))) return null;
  // A machine it would replace goes to the bag: with the bag full it can't buy, so it doesn't ride there (it rode there and back each day in Halogaland, Nov 11).
  if (adv.hero.gear?.machine && !bagRoom(adv.hero)) return null;
  let best: PathStep[] | null = null;
  for (const t of playerTowns(adv).filter((x) => has(x, 'blacksmith'))) {
    if (heroTown(adv)?.id === t.id) return null;
    const p = planPath(adv, def, t.x, t.y);
    if (p && p.length && (!best || pathCost(p) < pathCost(best))) best = p;
  }
  return best;
}

/**
 * The target, and for a wise bot never a day's end within the rival's reach
 * when he is RIVAL_DARES times stronger: then back to the nearest town of
 * ours instead (coordinator, Nov 8).
 */
function pickTarget(adv: Adventure, def: MapDef, edge: number, bossEdge: number, goalFirst = false, wise = false): PathStep[] | null {
  const way = pickTargetAnywhere(adv, def, edge, bossEdge, goalFirst, wise);
  if (!wise || !way || !rivalHero(adv)) return way;
  const today = way.filter((s) => s.day === 0);
  const end = today.at(-1) ?? adv.hero;
  const endsInTown = !!adv.towns.find((t) => t.owner === 'player' && t.x === end.x && t.y === end.y);
  if (endsInTown || !inHisReach(adv, end) || (way.at(-1)!.day === 0 && way.length === today.length && !!adv.towns.find((t) => t.x === way.at(-1)!.x && t.y === way.at(-1)!.y))) return way;
  // Back to the nearest town of ours (or stay in the one we're in).
  if (heroTown(adv)?.owner === 'player') return null;
  let back: PathStep[] | null = null;
  for (const t of playerTowns(adv)) {
    const p = planPath(adv, def, t.x, t.y);
    if (p && p.length && (!back || pathCost(p) < pathCost(back))) back = p;
  }
  return back ?? way;
}

/** The nearest target worth riding to, and the way there (home at the start of a week, when nothing better is near). */
function pickTargetAnywhere(adv: Adventure, def: MapDef, edge: number, bossEdge: number, goalFirst = false, wise = false): PathStep[] | null {
  const home = wise ? homeFor(adv, def) : playerTowns(adv)[0];
  const stocked = wise
    ? !!home && heroTown(adv)?.id !== home.id && dayOfWeek(adv.day) <= 2 && affordable(adv, home) >= armyStrength(adv.hero.army) * WORTH_THE_RIDE
    : !!home && !heroTown(adv) && Object.values(home.stock).some((n) => (n ?? 0) > 0);
  // The rival lord near and too strong: back to a town of ours to hire behind its walls (and wait there).
  if (wise && threatened(adv)) {
    if (heroTown(adv)?.owner === 'player') return null;
    const back = home ? planPath(adv, def, home.x, home.y) : null;
    if (back && back.length) return back;
  }
  if (goalFirst) {
    const foe = rivalHero(adv);
    // Straight for the goal once strong enough (a town of ours the rival took first, and the rival himself once his town is ours); until then, home to hire whatever the day.
    const ours = armyStrength(adv.hero.army);
    const lost = wise ? adv.towns.find((t) => t.owner === 'rival' && t.id !== def.goal.target && townStrength(adv, t.id) * edge <= ours) : undefined;
    // A wise bot rides at the rival's town while he is out and far from it (he comes home to defend it from 12 tiles).
    const away = (t: { x: number; y: number }): boolean => !!foe && Math.max(Math.abs(foe.x - t.x), Math.abs(foe.y - t.y)) > 12;
    const held = (t: Adventure['towns'][number]): number => (wise && away(t) ? armyStrength(t.garrison) : townStrength(adv, t.id));
    const capital = adv.towns.find((t) => t.id === def.goal.target && t.owner !== 'player');
    // Strong enough for his capital, a wise bot rides there before a lesser town he took back (Halogaland, Nov 11: retaking Gunnhild's empty-town raids, it never reached Bjarkoy).
    // Only against a lord with captains, who raid the empty towns (Eirik rode alone in the Bloodaxe: its tables stand).
    const forCapital = wise && !!lost && !!capital && rivalHeroes(adv).length > 1 && held(capital) * bossEdge <= ours;
    const goal = (forCapital ? undefined : lost) ?? capital ?? liveObjects(adv).find((o) => o.id === def.goal.target);
    const strong = goal && ('built' in goal ? held(goal) * (goal === lost ? edge : bossEdge) : monsterStrength(goal) * bossEdge) <= ours;
    const hunt = wise && !goal && foe && armyStrength(foe.army) * bossEdge <= ours ? planPath(adv, def, foe.x, foe.y) : null;
    // Strong enough for a town's walls: first the best machine a Workshop of ours sells (coordinator, Nov 8).
    const armFirst = wise && strong && 'built' in goal ? toBetterMachine(adv, def) : null;
    const way = armFirst ?? (strong ? planPath(adv, def, goal.x, goal.y) : hunt ?? (stocked ? planPath(adv, def, home!.x, home!.y) : null));
    if (way && way.length) return way;
  }
  // Home at the start of a week to hire, if it's near.
  if (stocked && dayOfWeek(adv.day) <= 2) {
    const back = planPath(adv, def, home!.x, home!.y);
    if (back && back.length && back[back.length - 1]!.day <= 1) return back;
  }
  let best: PathStep[] | null = null;
  // A town to take: the goal's at `bossEdge`, any other at `edge`.
  for (const t of adv.towns) {
    if (t.owner === 'player' || townStrength(adv, t.id) * (t.id === def.goal.target ? bossEdge : edge) > armyStrength(adv.hero.army)) continue;
    const p = planPath(adv, def, t.x, t.y);
    if (p && p.length && (!best || pathCost(p) < pathCost(best))) best = p;
  }
  for (const o of liveObjects(adv)) {
    if (!worth(adv, def, o, edge, bossEdge) || guardedTooWell(adv, o, edge)) continue;
    const p = planPath(adv, def, o.x, o.y);
    if (p && p.length && (!best || pathCost(p) < pathCost(best))) best = p;
  }
  // The rival lord in the field, once `bossEdge` times stronger than him (in a town of his, he is fought with it).
  const foe = rivalHero(adv);
  if (wise && foe && !adv.towns.some((t) => t.x === foe.x && t.y === foe.y) && armyStrength(foe.army) * bossEdge <= armyStrength(adv.hero.army)) {
    const p = planPath(adv, def, foe.x, foe.y);
    if (p && p.length && (!best || pathCost(p) < pathCost(best))) best = p;
  }
  if (best) return best;
  if (home && !heroTown(adv)) return planPath(adv, def, home.x, home.y);
  return null;
}

/** Rides today's part of the way, fighting what stops the hero. */
function ride(adv: Adventure, def: MapDef, path: readonly PathStep[], fights: Fight[], opts: BotOptions): { adv: Adventure; moved: boolean } {
  let a = adv;
  let moved = false;
  const end = path[path.length - 1]!;
  for (const step of path) {
    if (step.day > 0) break;
    const r = stepHero(a, def, step, end);
    a = answerAll(r.adv);
    moved = true;
    if (r.battle) {
      if (r.battle === def.goal.target) opts.beforeGoal?.(a);
      a = fightOut(a, def, r.battle, fights, opts, r.then);
    }
    if (r.town) a = hireHome(a, def, opts.machine ?? true, opts.wise);
    if (r.stop) break;
  }
  return { adv: a, moved };
}

/** A fight the battle AI plays out on both sides (as autoBattle does), with the spells side `me` casts on the way. */
function playOut(setup: ReturnType<typeof battleSides>, casts: readonly [boolean, boolean], me: 0 | 1): { st: BattleState; cast: SpellId[] } {
  let st = createBattle(setup.attacker, setup.defender, setup.seed, setup.siege, fieldOf(setup)).state;
  const cast: SpellId[] = [];
  for (let i = 0; i < 600 && st.winner === null; i++) {
    const side = activeStack(st)?.side ?? 0;
    const a = chooseAction(st, casts[side]);
    if (a.type === 'cast' && side === me) cast.push(a.spell);
    st = act(st, a).state;
  }
  return { st: st.winner === null ? { ...st, winner: 1 } : st, cast };
}

/** Plays out fight `id` by the battle AI on both sides (at walls a siege, war machines and all, on snow the skiers gliding), and records it. */
function fightOut(adv: Adventure, def: MapDef, id: string, fights: Fight[], opts: BotOptions, then?: string): Adventure {
  const before = armyStrength(adv.hero.army);
  const setup = battleSides(adv, id, def);
  // The bot casts no spells unless `casts` (its older tables were measured so); the other side's hero does.
  const me = (setup.siege?.me ?? 0) as 0 | 1;
  const ours = !!opts.casts;
  const { st, cast } = playOut(setup, me === 0 ? [ours, true] : [true, ours], me);
  const a = answerAll(afterBattle(adv, def, id, st, then));
  fights.push({ id, day: a.day, before, after: a.status === 'lost' ? 0 : armyStrength(a.hero.army), won: a.status !== 'lost', cast });
  // A gate fought (either way): the town's walls come next, with what lived.
  return a.rivalFight && a.status === 'playing' ? fightOut(a, def, a.rivalFight, fights, opts) : a;
}

/** The night: the day ends, the rival lord rides, and a fight he starts is played out. */
function night(adv: Adventure, def: MapDef, fights: Fight[], opts: BotOptions): Adventure {
  // A wise bot with the rival near and strong spends the night in the garrison of the town it stands in, as a person would: he must storm its walls, not catch it at the gate (Nov 11).
  const held = opts.wise && threatened(adv) && heroTown(adv)?.owner === 'player' ? garrisonHero(adv) ?? adv : adv;
  const ended = endDay(held, def);
  if (!ended.rival) return answerAll(ended);
  const r = rivalTurn(ended, def);
  const fight = r.adv.rivalFight;
  return fight ? fightOut(answerAll(r.adv), def, fight, fights, opts) : answerAll(r.adv);
}

/** Plays `def` from its start to a win, a loss or `maxDays`. */
export function playPart(def: MapDef, opts: BotOptions): BotRun {
  return playOn(answerAll({ ...startAdventure(def), seed: opts.seed }), def, opts);
}

/** Rides on from a part the bot won (`from`, as `run` left it) into `next`, and plays that to its end. */
export function rideOnInto(run: BotRun, from: MapDef, next: MapDef, opts: BotOptions): BotRun {
  return playOn(answerAll(rideOn(run.adv, from, next)), next, opts);
}

/** Plays `def` on from `start` to a win, a loss or `maxDays` (counted from the part's own first day). */
function playOn(start: Adventure, def: MapDef, opts: BotOptions): BotRun {
  const { maxDays = 80, edge = 2, bossEdge = 1.6 } = opts;
  const machine = opts.machine ?? true;
  const last = start.day - 1 + maxDays;
  let adv = start;
  const fights: Fight[] = [];
  while (adv.status === 'playing' && adv.day <= last) {
    // Out of the garrison it slept in, leading it all.
    if (heroInGarrison(adv)) adv = leadOut(adv);
    adv = hireHome(buildToday(adv, def, opts.wise), def, machine, opts.wise);
    for (let leg = 0; leg < 12 && adv.status === 'playing' && adv.hero.mp > 0; leg++) {
      const path = pickTarget(adv, def, edge, bossEdge, opts.goalFirst, opts.wise);
      if (!path || !path.length) break;
      const r = ride(adv, def, path, fights, opts);
      adv = r.adv;
      if (!r.moved) break;
    }
    if (adv.status !== 'playing') break;
    adv = night(adv, def, fights, opts);
    opts.morning?.(adv);
  }
  const goal = fights.find((f) => f.id === def.goal.target);
  return { adv, won: adv.status === 'won', day: adv.day, fights, ...(goal ? { goal } : {}) };
}
