import { gainItem, hasAsGood, machineOf, type ItemId } from './items';
import { chestPiece, dropOf } from './loot';
import { soldOn } from '../level/unlocks';
import type { MapDef } from '../level/types';
import {
  calendar, checkGoal, dayOfWeek, DEFEND, fledHome, GATE, groundAt, stormOf, townGuards, guardAt, lordSide, heroInGarrison, incomeOf, liveObjects, lyingItem, ourHeroes, playerArmy, RIVAL, rivalHero, rivalHeroes, rivalSighted, revealAround, terrainView, toldPrompt, townAt, withTown, type Adventure, type Prompt,
} from './adventure';
import { CHAPTER1, CHAPTER3 } from '../narration/lines';
import { armyMorale, armyOf, isEmptyArmy, splitMonster, type Army } from './army';
import { survivors, type BattleSide, type SiegeSetup } from './battle';
import type { BattleState } from './battleTypes';
import { creature, strengthOf } from './creatures';
import { afterFight, dailyMp, toBattleHero, type Hero } from './hero';
import { MINE_NAMES, type MapObject } from './objects';
import { canStep, findPath, type PathStep } from './path';
import { selectHero } from './heroes';
import { isLying, passOver } from './lying';
import { addTo, canAfford, pay } from './resources';
import { fortification } from './siege';
import { armyStrength } from './strength';
import { autoBattle } from './autoBattle';
import { isLord, playLord } from './lord/turn';
import { bestUnit, build, cantBuild, dwellings, has, hireable, hireAll, manTowers, towersOf, weekly, type Town } from './town';

/**
 * The rival lord's turn, played after the night: his towns build and hire,
 * then his hero rides out for what is worth most for the days it takes
 * (piles and mines, weak monsters, a weak town of ours or our hero when
 * he is the stronger), and back home to hire or to defend. A fight with
 * monsters is settled at once; a fight with us stops his turn and is
 * played out by the player.
 */

/** What the player is told and shown of the rival's turn. */
export interface RivalReport {
  /** The tiles his hero walked, in order (the scene shows the ones the player has seen). */
  readonly path: readonly { x: number; y: number }[];
  /** News for the day's card. */
  readonly notes: readonly string[];
  /** A fight with us he started: RIVAL (our hero in the field), GATE + town id (the hero at its gate) or DEFEND + town id (its walls). */
  readonly fight?: string;
}

/** How many times a turn re-plans after a stop (a fight or a visit) while movement lasts. */
const REPLANS = 5;
/** What each kind of target is worth to him. */
const VALUE = { pile: 600, campfire: 700, chest: 900, mine: 1600, ourMine: 2200, monster: 300, ourHero: 5000, ourTown: 4000, allyTown: 6000, home: 200, defend: 6000 } as const;
/** A trip home is worth this much per point of strength he could hire there (up to HIRE_MAX). */
const HIRE_WORTH = 15;
const HIRE_MAX = 9000;
/** ...and only when he could hire at least this share of his army there. */
const HIRE_SHARE = 0.15;
/** Gold his towns keep for his hero when they hire into their own garrison. */
const RESERVE = 3000;
/** He only picks fights he expects to win easily (their strength over his). */
const SAFE = { monster: 0.4, guard: 0.5, town: 0.5, hero: 1 / 1.3 } as const;
/** How close (tiles) our hero must come to his town, stronger than this share of his army, for him to ride home. */
const THREAT = { tiles: 12, share: 0.7 } as const;

/** The night of the part (counting from 1) when he sets out for a town that waits for us: the player has that many days, and the ride, to get there first. */
const RACE = 3;

/** How far round the rival the land shows when scouts find him, tiles. */
const SIGHTED = 3;
/** The share of the days before a part opens that the rival has had at home. */
const HEAD_START = 0.75;

export { armyStrength };

const hashId = (s: string): number => [...s].reduce((h, c) => Math.imul(h ^ c.charCodeAt(0), 16777619) >>> 0, 2166136261);

export { autoBattle };


/** `adv` with the rival's hero replaced (null: beaten). */
const withRival = (adv: Adventure, hero: Hero | null): Adventure => ({ ...adv, rival: { ...adv.rival!, hero } });

export function rivalTurn(adv: Adventure, def: MapDef): { adv: Adventure; report: RivalReport } {
  if (!adv.rival || adv.status !== 'playing') return { adv, report: { path: [], notes: [] } };
  if (isLord(def)) return lordTurn(adv, def);
  let next = rivalTowns(adv, def);
  const path: { x: number; y: number }[] = [];
  const notes: string[] = [];
  for (let i = 0; i <= REPLANS; i++) {
    const hero = rivalHero(next);
    // With no army he waits at home for the next hire.
    if (!hero || hero.mp <= 0 || isEmptyArmy(hero.army)) break;
    const route = pickTarget(next, def, hero);
    if (!route) break;
    const r = ride(next, def, route);
    next = r.adv;
    path.push(...r.walked);
    notes.push(...r.notes);
    if (r.fight) return { adv: withNews(next, def, notes, r.fight), report: { path, notes, fight: r.fight } };
    if (!r.stopped) break;
  }
  const after = sighted(checkGoal(next, def), def);
  const told = [...notes, ...after.notes];
  return { adv: withNews(after.adv, def, told), report: { path, notes: told } };
}

/** A lord's night (src/logic/lord): his whole side played as a player plays, a fight with us left for the player. */
function lordTurn(adv: Adventure, def: MapDef): { adv: Adventure; report: RivalReport } {
  const r = playLord(adv, def, 'stop');
  const told = rivalSighted(raceLost(adv, r.adv), def);
  const after = r.fight ? { adv: told, notes: [] } : sighted(told, def);
  const notes = [...r.notes, ...after.notes];
  return { adv: withNews(after.adv, def, notes, r.fight), report: { path: r.path, notes, ...(r.fight ? { fight: r.fight } : {}) } };
}

/** With no town left he has nowhere to hide: each night the scouts find him, on the map and on the day's card. */
function sighted(adv: Adventure, def: MapDef): { adv: Adventure; notes: string[] } {
  const foe = rivalHero(adv);
  if (!foe || adv.status !== 'playing' || adv.towns.some((t) => t.owner === 'rival')) return { adv, notes: [] };
  const tiles = Math.max(Math.abs(foe.x - adv.hero.x), Math.abs(foe.y - adv.hero.y));
  const where = `${tiles} ${tiles === 1 ? 'tile' : 'tiles'} ${compass(foe.x - adv.hero.x, foe.y - adv.hero.y)} of ${adv.hero.name}`;
  return { adv: revealAround(adv, def, foe.x, foe.y, SIGHTED), notes: [`Scouts saw ${foe.name} ${where}.`] };
}

/** The way a step of (dx, dy) on the map points, in words. */
function compass(dx: number, dy: number): string {
  const ns = Math.abs(dy) * 2 < Math.abs(dx) ? '' : dy < 0 ? 'north' : 'south';
  const ew = Math.abs(dx) * 2 < Math.abs(dy) ? '' : dx < 0 ? 'west' : 'east';
  return ns && ew ? `${ns}-${ew}` : ns || ew;
}

/**
 * The days before a part opens, played by the rival at home: he has been
 * paid, built and hired under the same rules while the player was busy
 * elsewhere, for HEAD_START of those days (he came to Korax after the player
 * set out), so he keeps close behind whenever the player gets there.
 */
export function headStart(adv: Adventure, def: MapDef): Adventure {
  // A lord has a fair start: none played in secret.
  if (isLord(def)) return adv;
  let next = adv;
  for (let day = 2; day <= Math.round(adv.day * (def.rival?.headStart ?? HEAD_START)); day++) {
    const rival = next.rival!;
    const towns = next.towns.map((t) => (t.owner !== 'rival' ? t : dayOfWeek(day) === 1 ? weekly(t) : { ...t, builtToday: false }));
    next = rivalTowns({ ...next, towns, rival: { ...rival, purse: addTo(rival.purse, incomeOf(next, 'rival')) } }, def);
  }
  return next;
}

/** A town that waited for us, taken by the rival first: told by the narrator for Eudora. */
function lostAlly(foe: Hero, town: Town): Prompt {
  if (town.id === CHAPTER1.eudora && foe.id === CHAPTER1.kassander) return toldPrompt('eudora-lost');
  return { kind: 'message', title: `${town.name} has fallen`, text: `${foe.name} reached ${town.name} before you, and it flies his banner now. Take it back from him!` };
}

/** Kaupang taken by Eirik before us (the race lost): told by the narrator, as Eudora was. */
function raceLost(before: Adventure, after: Adventure): Adventure {
  const was = before.towns.find((t) => t.id === CHAPTER3.kaupang);
  const now = after.towns.find((t) => t.id === CHAPTER3.kaupang);
  if (was?.owner !== 'neutral' || now?.owner !== 'rival' || after.rival?.hero?.id === undefined) return after;
  return { ...after, prompts: [...after.prompts, toldPrompt('kaupang-lost')] };
}

/** The towns of the map both sides race for (`race` on the map's town): never handed over, fought for. */
const racedTowns = (def: MapDef): ReadonlySet<string> => new Set((def.towns ?? []).filter((t) => t.race).map((t) => t.id));

/** The rival's news on the day's card (or a card of its own), and the fight he starts, announced and waiting. */
function withNews(adv: Adventure, def: MapDef, notes: readonly string[], fight?: string): Adventure {
  const foe = rivalHero(adv);
  let prompts = adv.prompts;
  if (notes.length) {
    // The night's card, even with a card of his (a town he took) after it.
    const day = calendar(adv.day);
    let at = prompts.length - 1;
    while (at >= 0 && !(prompts[at]!.kind === 'message' && (prompts[at] as { title: string }).title === day)) at--;
    const card = prompts[at];
    prompts = card?.kind === 'message'
      ? prompts.map((p, i) => (i === at ? { ...card, text: [card.text, ...notes].filter(Boolean).join('\n') } : p))
      : [...prompts, { kind: 'message', title: def.name, text: notes.join('\n') }];
  }
  if (!fight || !foe) return { ...adv, prompts };
  const town = adv.towns.find((t) => DEFEND + t.id === fight || GATE + t.id === fight);
  const at = town?.name ?? 'your town';
  const lead = town ? townGuards(adv, town).garrison : undefined;
  const text = fight === RIVAL ? `${foe.name} rides against ${adv.hero.name}! Stand and fight.`
    : fight.startsWith(GATE) ? `${foe.name} storms ${at}! ${adv.hero.name} meets him at the gate, in the open; if the gate falls, the walls are next.`
      : lead ? `${foe.name} storms ${at}! ${lead.name} holds the walls with its garrison.` : `${foe.name} storms ${at}! Its garrison must hold the walls alone.`;
  return { ...adv, prompts: [...prompts, { kind: 'message', title: `${foe.name} attacks`, text }], rivalFight: fight };
}

/** Each rival town builds its next building of the order, and hires into the hero standing in it. */
function rivalTowns(adv: Adventure, def: MapDef): Adventure {
  let next = adv;
  for (const town of adv.towns.filter((t) => t.owner === 'rival')) {
    const order = def.rival?.build ?? [];
    const b = order.find((id) => !cantBuild(town, id, next.rival!.purse, def.off));
    let t = town;
    if (b) {
      const r = build(town, b, next.rival!.purse, def.off);
      t = r.town;
      next = { ...next, rival: { ...next.rival!, purse: r.purse } };
    }
    next = withTown(next, t);
    next = hireAtHome(armAtHome(next, def, t), t, garrisonCap(def, t));
  }
  return next;
}

/**
 * His hero in a town of his with a Blacksmith (Egypt's Workshop) buys the
 * best war machine it sells on this part that is better than his, keeping
 * RESERVE gold to hire with: as the player would. A machine he replaces is
 * left behind (he carries no bag).
 */
function armAtHome(adv: Adventure, def: MapDef, town: Town): Adventure {
  const hero = rivalHero(adv);
  if (!hero || hero.x !== town.x || hero.y !== town.y || !has(town, 'blacksmith')) return adv;
  const purse = adv.rival!.purse;
  const best = soldOn(def.n).filter((m) => !hasAsGood(hero, m) && canAfford(purse, { gold: (creature(m).cost.gold ?? 0) + RESERVE })).at(-1);
  if (!best) return adv;
  return { ...adv, rival: { ...adv.rival!, purse: pay(purse, creature(best).cost), hero: { ...hero, gear: { ...hero.gear, machine: best } } } };
}

/**
 * The rival's hero in one of his towns hires all he can, the strongest
 * first; a town he isn't in hires into its own garrison, keeping RESERVE
 * gold for him, up to `cap` of strength (GARRISON_GROWTH times what the map
 * gave it): the rest waits in the dwellings for him.
 */
function hireAtHome(adv: Adventure, town: Town, cap = Infinity): Adventure {
  const hero = rivalHero(adv);
  const home = !!hero && hero.x === town.x && hero.y === town.y;
  const room = home ? Infinity : Math.max(0, cap - armyStrength(town.garrison));
  const r = hireAll(town, home ? hero.army : town.garrison, adv.rival!.purse, home ? 0 : RESERVE, room);
  const t = home ? r.town : { ...r.town, garrison: r.army };
  return withTown({ ...adv, rival: { ...adv.rival!, purse: r.purse, hero: home ? { ...hero, army: r.army } : hero } }, t);
}

/** A rival town's garrison grows from its recruits to this many times its strength on the map; the rest wait in the dwellings for him. */
const GARRISON_GROWTH = 1.5;

/** The most strength `town`'s own garrison may reach by hiring while he is away (coordinator, Nov 8). */
function garrisonCap(def: MapDef, town: Town): number {
  const spec = [def.town, ...(def.towns ?? [])].find((t) => t.id === town.id);
  return armyStrength(armyOf(spec?.garrison ?? [])) * GARRISON_GROWTH;
}


interface Route {
  readonly steps: readonly PathStep[];
}

/** The best thing to ride for: its worth over the days it takes. */
function pickTarget(adv: Adventure, def: MapDef, hero: Hero): Route | null {
  const view = terrainView(adv, def, 'rival');
  const mine = armyStrength(hero.army);
  let best: { route: Route; score: number } | null = null;
  for (const t of targets(adv, def, hero, mine)) {
    const steps = findPath(view, hero, t.x, t.y, hero.mp, dailyMp(hero));
    if (!steps?.length || steps[0]!.day > 0) continue;
    const days = steps[steps.length - 1]!.day;
    const score = t.value / (1 + days * 1.5);
    if (!best || score > best.score) best = { route: { steps }, score };
  }
  return best?.route ?? null;
}

/** Everything worth riding for now, with what it's worth. */
function targets(adv: Adventure, def: MapDef, hero: Hero, mine: number): { x: number; y: number; value: number }[] {
  const out: { x: number; y: number; value: number }[] = [];
  const guarded = (o: MapObject): boolean => {
    const g = guardAt(adv, o.x, o.y);
    return !!g && strengthOf(g.creature!, g.count ?? 1) > mine * SAFE.guard;
  };
  for (const o of liveObjects(adv)) {
    if (o.kind === 'monster') {
      if (strengthOf(o.creature!, o.count ?? 1) < mine * SAFE.monster) out.push({ x: o.x, y: o.y, value: VALUE.monster });
      continue;
    }
    const value = o.kind === 'pile' ? VALUE.pile : o.kind === 'campfire' ? VALUE.campfire : o.kind === 'chest' ? VALUE.chest
      : o.kind === 'mine' && o.owner !== 'rival' ? (o.owner === 'player' ? VALUE.ourMine : VALUE.mine) : 0;
    if (value && !guarded(o)) out.push({ x: o.x, y: o.y, value });
  }
  const ours = armyStrength(playerArmy(adv));
  // A hero of ours in a town of ours is no lone hero: storming it is both its battles (the town's target below).
  const inTown = (h: Hero): boolean => adv.towns.some((t) => t.owner === 'player' && t.x === h.x && t.y === h.y);
  if (!heroInGarrison(adv) && !inTown(adv.hero) && ours < mine * SAFE.hero) out.push({ x: adv.hero.x, y: adv.hero.y, value: VALUE.ourHero });
  // Our other heroes, out in the field.
  for (const h of adv.others ?? []) {
    const theirs = armyStrength(h.army);
    if (theirs > 0 && theirs < mine * SAFE.hero && !adv.towns.some((t) => t.x === h.x && t.y === h.y)) out.push({ x: h.x, y: h.y, value: VALUE.ourHero });
  }
  const within = (p: { x: number; y: number }, t: { x: number; y: number }): boolean => Math.max(Math.abs(p.x - t.x), Math.abs(p.y - t.y)) <= THREAT.tiles;
  const strengthOfHero = (h: Hero): number => (h.id === adv.hero.id ? ours : armyStrength(h.army));
  for (const t of adv.towns.filter((x) => x.owner === 'player')) {
    // Our heroes near the town would ride back to it, and one at its gate is fought first: all count as its defence (both battles).
    const heroNear = ourHeroes(adv).filter((h) => within(h, t)).reduce((n, h) => n + strengthOfHero(h), 0);
    const held = armyStrength(t.garrison) + armyStrength(towersOf(t)) + heroNear;
    if (held < mine * SAFE.town) out.push({ x: t.x, y: t.y, value: VALUE.ourTown });
  }
  // A town waiting to open its gates to us: from the part's RACE night on he races us for it, if its garrison won't stop him.
  const racing = adv.day - (adv.begun ?? 1) >= RACE;
  const raced = racedTowns(def);
  for (const t of adv.towns.filter((x) => racing && (x.ally || raced.has(x.id)) && x.owner === 'neutral')) {
    if (armyStrength(t.garrison) < mine * SAFE.town) out.push({ x: t.x, y: t.y, value: VALUE.allyTown });
  }
  for (const t of adv.towns.filter((x) => x.owner === 'rival')) {
    if (t.x === hero.x && t.y === hero.y) continue;
    const near = ourHeroes(adv).some((h) => within(h, t) && strengthOfHero(h) > mine * THREAT.share);
    // A trip home to hire is worth it for a real share of his army, not a day's trickle.
    // What he could add to his own army there (a full army has no room for a new kind).
    const hireable = armyStrength(hireAll(t, hero.army, adv.rival!.purse).army) - mine;
    const recruits = hireable >= mine * HIRE_SHARE ? Math.min(HIRE_MAX, hireable * HIRE_WORTH) : 0;
    out.push({ x: t.x, y: t.y, value: VALUE.home + recruits + (near ? VALUE.defend : 0) });
  }
  return out;
}

interface Ride {
  readonly adv: Adventure;
  readonly walked: { x: number; y: number }[];
  readonly notes: string[];
  /** He stopped short of the end (a visit or a fight he won): plan again with what's left. */
  readonly stopped: boolean;
  readonly fight?: string;
}

/** Walks today's part of a route, step by step, as the player's hero would. */
function ride(adv: Adventure, def: MapDef, route: Route): Ride {
  let next = adv;
  const walked: { x: number; y: number }[] = [];
  const notes: string[] = [];
  for (const step of route.steps) {
    const hero = rivalHero(next)!;
    if (step.day > 0 || !canStep(step, hero.mp)) break;
    const spent = { ...hero, mp: Math.max(0, hero.mp - step.cost) };
    const gate = townAt(next, step.x, step.y);
    if (gate?.owner === 'player') {
      // A town of ours: the hero at its gate meets him first, in the open; then its walls, commanded by the hero in its garrison (picked, for the player to play).
      const storm = stormOf(next, gate);
      const { gate: atGate, garrison: inside } = townGuards(next, gate);
      const met = atGate ?? inside;
      if (storm) return { adv: met ? selectHero(next, met.id) : next, walked, notes, stopped: true, fight: storm };
      next = checkGoal(withTown(withRival(next, { ...spent, x: step.x, y: step.y }), { ...gate, owner: 'rival', garrison: armyOf([]) }), def);
      walked.push(step);
      notes.push(`${hero.name} rode into ${gate.name}, and it flies his banner now.`);
      return { adv: next, walked, notes, stopped: false };
    }
    // A hero of ours in the field: he attacks, and the player plays the fight (with that hero picked).
    const met = ourHeroes(next).find((h) => h.x === step.x && h.y === step.y);
    if (met) return { adv: selectHero(next, met.id), walked, notes, stopped: true, fight: RIVAL };
    if (gate) {
      if (gate.owner === 'neutral' && !isEmptyArmy(gate.garrison)) {
        const won = fight(next, def, hero, gate.garrison, gate.id, gate);
        next = won.adv;
        if (!won.won) return { adv: next, walked, notes: [...notes, ...won.notes], stopped: false };
      }
      const moved = withRival(next, { ...rivalHero(next)!, x: step.x, y: step.y, mp: spent.mp });
      const { ally: waited, ...taken } = townAt(moved, step.x, step.y)!;
      const home: Town = { ...taken, owner: 'rival', ...(gate.owner === 'neutral' ? { garrison: armyOf([]) } : {}) };
      next = hireAtHome(withTown(moved, home), home);
      walked.push(step);
      if (waited || racedTowns(def).has(home.id)) {
        // A short note on the day's card, and the loss on a card (told by the narrator for Eudora) of its own.
        notes.push(`${hero.name} reached ${home.name} before you.`);
        next = { ...next, prompts: [...next.prompts, lostAlly(hero, home)] };
      }
      return { adv: next, walked, notes, stopped: false };
    }
    const at = liveObjects(next).find((x) => x.x === step.x && x.y === step.y);
    // Gear lying on the ground is ridden over: taken in passing if he has room, else left (src/logic/lying.ts).
    const lying = at && isLying(at) ? at : undefined;
    const o = lying ? undefined : at;
    if (o?.kind === 'monster') {
      const r = fight(withRival(next, spent), def, spent, splitMonster(o.creature!, o.count ?? 1), o.id);
      return { adv: r.adv, walked, notes: [...notes, ...r.notes], stopped: r.won };
    }
    if (o) {
      const guard = guardAt(next, o.x, o.y);
      if (guard) {
        const r = fight(withRival(next, spent), def, spent, splitMonster(guard.creature!, guard.count ?? 1), guard.id);
        if (!r.won) return { adv: r.adv, walked, notes: [...notes, ...r.notes], stopped: false };
        next = r.adv;
      }
      const v = visit(withRival(next, { ...rivalHero(next)!, mp: spent.mp }), def, o);
      return { adv: v.adv, walked, notes: [...notes, ...v.notes], stopped: true };
    }
    next = withRival(next, { ...spent, x: step.x, y: step.y });
    walked.push(step);
    // Into a monster's guard zone: it's fought there.
    const guard = guardAt(next, step.x, step.y);
    if (guard) {
      const r = fight(next, def, rivalHero(next)!, splitMonster(guard.creature!, guard.count ?? 1), guard.id);
      if (!r.won || !lying) return { adv: r.adv, walked, notes: [...notes, ...r.notes], stopped: r.won };
      next = r.adv;
    }
    if (lying) {
      const p = passOver(rivalHero(next)!, next.objects, lying);
      next = { ...withRival(next, p.hero), objects: [...p.objects] };
      if (guard) return { adv: next, walked, notes, stopped: true };
    }
  }
  return { adv: next, walked, notes, stopped: false };
}

/** The rival storming a town held by its garrison alone: behind walls a siege, the garrison manning its towers, his war machine (a ramp's stretch picked by the AI) against them. */
export function stormSides(adv: Adventure, hero: Hero, town: Town): { attacker: BattleSide; defender: BattleSide; siege?: SiegeSetup } {
  const fort = fortification(town.built);
  const attacker = lordSide(adv, hero);
  if (!fort) return { attacker, defender: { hero: null, army: town.garrison } };
  return { attacker, defender: { hero: null, ...manTowers(town.garrison, fort.places) }, siege: { fort, me: 0 } };
}

/** The rival's hero fights `army` (a monster, or the garrison of `town`, behind its walls) to the end, at once. */
function fight(adv: Adventure, def: MapDef, hero: Hero, army: Army, id: string, town?: Town): { adv: Adventure; won: boolean; notes: string[] } {
  const sides = town ? stormSides(adv, hero, town) : { attacker: lordSide(adv, hero), defender: { hero: null, army } };
  const field = groundAt(def, hero.x, hero.y) === 'snow' ? { snow: true } : {};
  const end = autoBattle(sides.attacker, sides.defender, (adv.seed ^ (adv.day * 7919) ^ hashId(`rival:${id}`)) >>> 0, sides.siege, undefined, field);
  const home = end.fled === 0 ? fledHome(adv, hero) : null;
  if (home) return { adv: home.adv, won: false, notes: [`${hero.name} was beaten back and fled to ${home.town.name} without his army.`] };
  if (end.winner !== 0) {
    const foes = army.find((s) => s)?.creature;
    return { adv: withRival(adv, null), won: false, notes: [`${hero.name} fell in battle${foes ? ` against the ${creature(foes).plural}` : ''}. His banner is down for good.`] };
  }
  // The group's drop, by the same roll as ours (src/logic/loot.ts): with his bag full it lies where the group stood.
  const beaten = adv.objects.find((o) => o.id === id);
  const drop = beaten && dropOf(def, beaten, rivalHeroes(adv));
  const fought = { ...afterFight(hero), army: survivors(end, 0, hero.army) };
  const got = drop ? gainItem(fought, drop) : null;
  const objects = adv.objects.map((o) => (o.id !== id ? o : drop && !got!.kept ? lyingItem(o, drop) : { ...o, gone: true }));
  return { adv: { ...withRival(adv, got?.hero ?? fought), objects }, won: true, notes: [] };
}

/** What the rival takes at a site: piles and chests into his purse (a chest's piece on his hero), mines under his banner, gear left on the ground. */
function visit(adv: Adventure, def: MapDef, o: MapObject): { adv: Adventure; notes: string[] } {
  const purse = adv.rival!.purse;
  const gone = (a: Adventure): Adventure => ({ ...a, objects: a.objects.map((x) => (x.id === o.id ? { ...x, gone: true } : x)) });
  const paid = (amount: Parameters<typeof addTo>[1]): Adventure => gone({ ...adv, rival: { ...adv.rival!, purse: addTo(purse, amount) } });
  switch (o.kind) {
    case 'pile':
      return { adv: paid({ [o.resource!]: o.amount ?? 0 }), notes: [] };
    case 'campfire':
      return { adv: paid({ gold: o.gold ?? 500, [o.resource!]: o.amount ?? 5 }), notes: [] };
    case 'chest': {
      const piece = chestPiece(def, o, rivalHeroes(adv));
      return { adv: piece ? takePiece(adv, o, piece) : paid({ gold: o.gold ?? 1000 }), notes: [] };
    }
    case 'item':
      return { adv: takePiece(adv, o, o.item!), notes: [] };
    case 'mine': {
      const ours = o.owner === 'player';
      const objects = adv.objects.map((x) => (x.id === o.id ? { ...x, owner: 'rival' as const } : x));
      return { adv: { ...adv, objects }, notes: ours ? [`${rivalHero(adv)!.name} took your ${MINE_NAMES[o.resource!]}.`] : [] };
    }
    default:
      return { adv, notes: [] };
  }
}

/** The rival's hero takes piece `id` found at `o`: worn or in his bag; with no room it stays (as gear on the ground). */
function takePiece(adv: Adventure, o: MapObject, id: ItemId): Adventure {
  const hero = rivalHero(adv)!;
  const got = gainItem(hero, id);
  const objects = adv.objects.map((x) => (x.id !== o.id ? x : got.kept ? { ...x, gone: true } : lyingItem(x, id)));
  return { ...withRival(adv, got.hero), objects };
}
