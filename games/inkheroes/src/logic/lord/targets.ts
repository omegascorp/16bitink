import type { MapDef } from '../../level/types';
import { gridOf, guardAt, liveObjects, monsterArmy, playerTowns, terrainView, type Adventure } from '../adventure';
import { dwellingStock, hireAtDwelling } from '../dwellings';
import { dailyMp, sightOf, type Hero } from '../hero';
import { hasAsGood, hasSpellbook } from '../items';
import { soldOn } from '../../level/unlocks';
import { creature } from '../creatures';
import { tileIndex, tilesOf } from '../map';
import type { Terrainview } from '../path';
import type { MapObject } from '../objects';
import { armyStrength } from '../strength';
import { has, hireAll, towersOf, type Town } from '../town';
import { knownFoes, seenBy, type LordMemory, type Sighting } from './knowledge';
import { daysFor, reachFrom } from './reach';
import { gives } from './day';

/**
 * What a lord's hero rides for (rules 1, 2, 6, 7 and 9): everything he
 * knows of, each worth so much for the days it takes. The main hero takes
 * on weak towns and lone heroes while our main is far, races for the
 * neutral towns and the forge when he thinks he can win, and comes home to
 * hire or to defend; a runner flags mines and dwellings, gathers piles,
 * scouts, and carries the towns' recruits to the main. Neither ends a day
 * in reach of a hero clearly stronger than himself.
 */

export type Job = 'main' | 'runner';

export interface Target {
  readonly x: number;
  readonly y: number;
  readonly value: number;
  /** What it is, for the plan and the tests. */
  readonly kind: string;
}

/** What each kind of target is worth. */
export const VALUE = {
  pile: 600, campfire: 700, chest: 900, item: 800, spellbook: 1500, site: 700, learningStone: 1400,
  mine: 1600, goldMine: 2500, theirMine: 2200, dwelling: 2000, keep: 2500, forge: 9000, monster: 300,
  explore: 500, theirHero: 5000, theirTown: 4500, machine: 3000, neutralTown: 6000, defend: 6000, retreat: 9000, meet: 4000, home: 200,
} as const;
/** He only picks fights he expects to win easily: their strength over his. */
export const SAFE = { monster: 0.4, bold: 0.6, runner: 0.25, guard: 0.5, town: 0.5, hero: 1 / 1.3 } as const;
/** A trip to a town to hire is worth this much per point of strength (up to HIRE_MAX), for at least HIRE_SHARE of the army. */
const HIRE_WORTH = 15;
const HIRE_MAX = 9000;
const HIRE_SHARE = 0.15;
/** A foe this many times stronger is kept out of reach of; one of ours this far (days) from a town of theirs leaves it open. */
export const DARES = 1.3;
const FAR_DAYS = 1;
/** A foe this weak beside his own town doesn't keep us from it (heldBy counts him anyway). */
const MATTERS = 0.3;
/** Exploring weighs more in the part's first week; frontier tiles are sampled one in this many. */
const EARLY_DAYS = 7;
const SAMPLE = 3;
/** A committed main hero weighs a town he can storm this many times more. */
const COMMIT = 2.5;
/** A neutral town not yet seen is worth this share of one he could take. */
const UNSEEN_TOWN = 0.5;

export interface Ctx {
  readonly adv: Adventure;
  readonly def: MapDef;
  readonly memory: LordMemory;
  /** The side's main hero (null: none riding). */
  readonly main: Hero | null;
  /** Spendable gold (above the savings). */
  readonly gold: number;
  /** The goods the big goal still lacks: their mines and piles are worth SHORT times more. */
  readonly short: ReadonlySet<string>;
  /** With nothing else to ride for, the main hero takes on monsters up to SAFE.bold of his strength. */
  readonly bold?: boolean;
  /** The side's own odds: the share of his strength a foe may have for him to take it on (a person casting spells fights at about 1.5 to 1); none, SAFE's. */
  readonly dare?: number;
  /** Once stronger than a town of theirs by the siege margin, the main hero rides at it (a machine on the way) rather than home to hire. */
  readonly commit?: boolean;
  /** The part's day from which a town both sides race for (`race`) is ridden for (the rival's: after the third night, as Kassander's and Sethi's). */
  readonly raceFrom?: number;
}
const SHORT = 2;

/** A hero's ride costs to every tile, and the days they take. */
export interface Reach {
  readonly cost: Float64Array;
  readonly days: (x: number, y: number) => number;
}

/**
 * The pathfinder's view with the guard zones of monsters `h` would fight
 * (under `share` of his strength) open: a way through them is a way, fought
 * on the step into the zone, as a person rides at a guard on the road.
 */
export function throughView(adv: Adventure, def: MapDef, h: Hero, share: number): Terrainview {
  const v = terrainView(adv, def);
  const g = gridOf(def);
  const mine = armyStrength(h.army);
  const stopAt = new Set(v.stopAt);
  for (const o of liveObjects(adv)) {
    if (o.kind !== 'monster' || armyStrength(monsterArmy(o)) >= mine * share) continue;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (o.x + dx >= 0 && o.y + dy >= 0 && o.x + dx < g.w && o.y + dy < g.h) stopAt.delete(tileIndex(g, o.x + dx, o.y + dy));
  }
  // Gates still end a way.
  for (const t of adv.towns) stopAt.add(tileIndex(g, t.x, t.y));
  return { ...v, stopAt };
}

export function reachOf(adv: Adventure, def: MapDef, h: Hero, share: number = SAFE.guard): Reach {
  const g = gridOf(def);
  const cost = reachFrom(throughView(adv, def, h, share), h);
  const daily = dailyMp(h);
  return { cost, days: (x, y) => { const c = cost[tileIndex(g, x, y)]!; return c === Infinity ? Infinity : c / daily + (c > h.mp ? 1 - h.mp / daily : 0); } };
}

const chebyshev = (a: { x: number; y: number }, b: { x: number; y: number }): number => Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y));

/** The tiles a seen foe may ride in a day, and further for each day since he was seen. */
export const foeReach = (f: Sighting & { age: number }): number => tilesOf(1700) * (1 + f.age) + 1;

/** Known foes clearly stronger than `strength` who could reach (x, y) by tomorrow. */
export function threatAt(ctx: Ctx, x: number, y: number, strength: number): number {
  return knownFoes(ctx.adv, ctx.memory).filter((f) => f.age <= FRESH && f.strength > strength * DARES && chebyshev(f, { x, y }) <= foeReach(f)).reduce((n, f) => Math.max(n, f.strength), 0);
}

/** Only a foe seen this lately says where danger is (an older sighting would make the whole land unsafe). */
const FRESH = 1;

/** What a site is worth to `h` (0: nothing, or it isn't for him). */
function siteValue(ctx: Ctx, h: Hero, o: MapObject, job: Job): number {
  switch (o.kind) {
    case 'pile': return VALUE.pile * (ctx.short.has(o.resource!) ? SHORT : 1);
    case 'campfire': return VALUE.campfire;
    case 'chest': return VALUE.chest;
    case 'item': return VALUE.item;
    case 'spellbook': return hasSpellbook(h) ? 0 : VALUE.spellbook;
    case 'mine': return (o.owner === 'player' ? 0 : o.owner === 'rival' ? VALUE.theirMine : o.resource === 'gold' ? VALUE.goldMine : VALUE.mine) * (ctx.short.has(o.resource!) ? SHORT : 1);
    case 'learningStone': return o.visitedBy?.includes(h.id) ? 0 : VALUE.learningStone;
    case 'mercCamp': case 'watchtower': case 'standingStone': return h.visited.includes(o.id) ? 0 : VALUE.site;
    case 'shrine': return h.visited.includes(o.id) || !hasSpellbook(h) ? 0 : VALUE.site;
    case 'bank': return o.looted || job === 'runner' ? 0 : VALUE.keep;
    case 'dwelling': {
      if (o.owner !== 'player') return o.look === 'titanForge' ? VALUE.forge : VALUE.dwelling;
      // One of ours: worth the ride for what can be hired there.
      const got = armyStrength(hireAtDwelling(o, { ...ctx.adv.purse, gold: ctx.gold }, h.army).army) - armyStrength(h.army);
      return dwellingStock(o) > 0 ? hireValue(got, ctx.main ?? h) : 0;
    }
    default: return 0;
  }
}

/** A trip to hire `got` strength, for the army of `main`. */
const hireValue = (got: number, main: Hero): number => (got >= armyStrength(main.army) * HIRE_SHARE ? Math.min(HIRE_MAX, got * HIRE_WORTH) : 0);

/** What a town's walls hold, as far as the side knows: its garrison and towers, and the foes in it or within a day's ride of it. */
function heldBy(ctx: Ctx, t: Town): number {
  const near = knownFoes(ctx.adv, ctx.memory).filter((f) => chebyshev(f, t) <= foeReach(f)).reduce((n, f) => n + f.strength, 0);
  return armyStrength(t.garrison) + armyStrength(towersOf(t)) + near;
}

/** Everything `h` could ride for now, with what it's worth to him. */
export function targetsFor(ctx: Ctx, h: Hero, job: Job, reach: Reach): Target[] {
  const { adv, def } = ctx;
  const mine = armyStrength(h.army);
  const out: Target[] = [];
  const add = (x: number, y: number, value: number, kind: string): void => { if (value > 0 && reach.days(x, y) < Infinity) out.push({ x, y, value, kind }); };
  const guardOk = (o: MapObject, share: number): boolean => {
    const g = guardAt(adv, o.x, o.y);
    return !g || armyStrength(monsterArmy(g)) < mine * share;
  };
  for (const o of liveObjects(adv)) {
    if (!seenBy(adv, def, o.x, o.y)) continue;
    if (o.kind === 'monster') {
      if (armyStrength(monsterArmy(o)) < mine * (job === 'main' ? (ctx.bold ? SAFE.bold : ctx.dare ?? SAFE.monster) : SAFE.runner)) add(o.x, o.y, VALUE.monster, 'monster');
      continue;
    }
    const share = o.kind === 'dwelling' && o.look === 'titanForge' ? (ctx.dare ?? SAFE.guard) * 1.2 : job === 'main' ? ctx.dare ?? SAFE.guard : SAFE.runner;
    if (guardOk(o, share)) add(o.x, o.y, siteValue(ctx, h, o, job), o.kind);
  }
  const foes = knownFoes(adv, ctx.memory);
  const raced = new Set((def.towns ?? []).filter((t) => t.race).map((t) => t.id));
  const partDay = adv.day - (adv.begun ?? 1) + 1;
  // Their heroes in the field: a lone one he is clearly stronger than (rule 6).
  for (const f of foes.filter((x) => x.age <= 1)) {
    const inTown = adv.towns.some((t) => t.x === f.x && t.y === f.y);
    if (!inTown && f.strength < mine * SAFE.hero && (job === 'main' || f.strength < mine * SAFE.runner)) add(f.x, f.y, VALUE.theirHero, 'hero');
  }
  let siege = false;
  // Their towns, weakly held while their heroes are far; neutral towns he can take (rules 6 and 9).
  for (const t of adv.towns) {
    if (t.owner === 'player' || job !== 'main') continue;
    const known = seenBy(adv, def, t.x, t.y);
    if (t.owner === 'neutral') {
      // Its place is known (the land's towns are no secret), its garrison only once seen: worth riding to see.
      if (raced.has(t.id) && partDay < (ctx.raceFrom ?? 0)) continue;
      if (known && armyStrength(t.garrison) < mine * (ctx.dare ?? SAFE.town)) add(t.x, t.y, VALUE.neutralTown, 'neutralTown');
      else if (!known) add(t.x, t.y, VALUE.neutralTown * UNSEEN_TOWN, 'explore');
      continue;
    }
    // Far: none of their heroes could be back at it by tomorrow, as far as he knows.
    const far = foes.every((f) => f.strength < mine * MATTERS || chebyshev(f, t) > foeReach(f) * FAR_DAYS);
    const open = known && far && heldBy(ctx, t) < mine * (ctx.dare ?? SAFE.town);
    siege ||= open && !!ctx.commit;
    if (open) add(t.x, t.y, VALUE.theirTown * (ctx.commit ? COMMIT : 1), 'theirTown');
    else if (!known) add(t.x, t.y, VALUE.theirTown * UNSEEN_TOWN, 'explore');
  }
  // Home: to hire (the main, or a runner who carries the recruits on), or to defend a town a stronger foe draws near (rule 7).
  for (const t of playerTowns(adv)) {
    const here = h.x === t.x && h.y === t.y;
    const got = armyStrength(hireAll(t, h.army, { ...adv.purse, gold: ctx.gold }).army) - mine;
    const danger = threatAt(ctx, t.x, t.y, armyStrength(t.garrison) * DARES);
    // Committed to a siege, the main hero doesn't ride home to hire (runners bring the recruits); he stops for a better machine on the way.
    const hire = siege && job === 'main' ? 0 : hireValue(got, ctx.main ?? h);
    const machine = siege && job === 'main' && has(t, 'blacksmith') && soldOn(def.n).some((m) => !hasAsGood(h, m) && ctx.gold >= (creature(m).cost.gold ?? 0)) ? VALUE.machine : 0;
    if (!here) add(t.x, t.y, VALUE.home + hire + machine + (danger && job === 'main' ? VALUE.defend : 0), danger ? 'defend' : machine ? 'machine' : 'home');
  }
  // A runner with recruits rides them to the main hero.
  if (job === 'runner' && ctx.main && ctx.main.id !== h.id && mine >= armyStrength(ctx.main.army) * HIRE_SHARE && gives(h.army, ctx.main.army)) {
    add(ctx.main.x, ctx.main.y, VALUE.meet + Math.min(HIRE_MAX * 2, mine * HIRE_WORTH), 'meet');
  }
  // In danger now: back behind walls (rule 6).
  if (threatAt(ctx, h.x, h.y, mine)) {
    for (const t of playerTowns(adv)) add(t.x, t.y, VALUE.retreat, 'retreat');
  }
  return [...out, ...frontier(ctx, h, job, reach)];
}

/** Unseen land worth riding to the edge of (rule 1): the more of it a hero would see from there, the more. */
function frontier(ctx: Ctx, h: Hero, job: Job, reach: Reach): Target[] {
  const { adv, def } = ctx;
  const g = gridOf(def);
  const r = sightOf(h);
  const early = adv.day - (adv.begun ?? 1) < EARLY_DAYS ? 2 : 1;
  const out: Target[] = [];
  for (let y = 0; y < g.h; y += 1) {
    for (let x = (y % SAMPLE); x < g.w; x += SAMPLE) {
      const c = reach.cost[tileIndex(g, x, y)]!;
      if (c === Infinity || !seenBy(adv, def, x, y)) continue;
      let unseen = 0;
      for (let dy = -r; dy <= r; dy += 2) for (let dx = -r; dx <= r; dx += 2) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx >= 0 && ny >= 0 && nx < g.w && ny < g.h && adv.explored[tileIndex(g, nx, ny)] !== '1') unseen++;
      }
      if (unseen < 4) continue;
      const share = unseen / ((r + 1) * (r + 1));
      out.push({ x, y, value: VALUE.explore * share * early * (job === 'runner' ? 1.5 : 1), kind: 'explore' });
    }
  }
  return out;
}

/** The best targets by worth over the days they take, best first. */
export function ranked(targets: readonly Target[], reach: Reach, n: number): Target[] {
  return targets
    .map((t) => ({ t, score: t.value / (1 + reach.days(t.x, t.y) * 1.5) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, n)
    .map((x) => x.t);
}

export { daysFor };
