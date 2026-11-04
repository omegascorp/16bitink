import { gainItem } from './items';
import type { MapDef } from '../level/types';
import {
  calendar, checkGoal, DEFEND, guardAt, heroInGarrison, liveObjects, playerArmy, RIVAL, rivalHero, terrainView, townAt, withTown, type Adventure,
} from './adventure';
import { armyMorale, armyOf, isEmptyArmy, splitMonster, type Army } from './army';
import { act, createBattle, machinesLeft, survivors, type BattleSide } from './battle';
import { chooseAction } from './battleAi';
import type { BattleState } from './battleTypes';
import { creature, strengthOf, type MachineId } from './creatures';
import { dailyMp, toBattleHero, type Hero } from './hero';
import { MINE_NAMES, type MapObject } from './objects';
import { canStep, findPath, type PathStep } from './path';
import { addTo } from './resources';
import { bestUnit, build, cantBuild, dwellings, hireable, hireAll, type Town } from './town';

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
  /** A fight with us he started: RIVAL (our hero) or DEFEND + town id (a garrison alone). */
  readonly fight?: string;
}

/** How many times a turn re-plans after a stop (a fight or a visit) while movement lasts. */
const REPLANS = 5;
/** What each kind of target is worth to him. */
const VALUE = { pile: 600, campfire: 700, chest: 900, mine: 1600, ourMine: 2200, monster: 300, ourHero: 5000, ourTown: 4000, home: 200, defend: 6000 } as const;
/** A trip home is worth this much per point of strength he could hire there (up to HIRE_MAX). */
const HIRE_WORTH = 15;
const HIRE_MAX = 9000;
/** Gold his towns keep for his hero when they hire into their own garrison. */
const RESERVE = 3000;
/** He only picks fights he expects to win easily (their strength over his). */
const SAFE = { monster: 0.4, guard: 0.5, town: 0.5, hero: 1 / 1.3 } as const;
/** How close (tiles) our hero must come to his town, stronger than this share of his army, for him to ride home. */
const THREAT = { tiles: 12, share: 0.7 } as const;

/** A rough fighting strength of an army. */
export const armyStrength = (army: Army): number => army.reduce((n, s) => n + (s ? strengthOf(s.creature, s.count) : 0), 0);

const hashId = (s: string): number => [...s].reduce((h, c) => Math.imul(h ^ c.charCodeAt(0), 16777619) >>> 0, 2166136261);

/** A fight the AI plays out on both sides at once; a battle that drags on is held by the defender. */
export function autoBattle(attacker: BattleSide, defender: BattleSide, seed: number): BattleState {
  let st = createBattle(attacker, defender, seed).state;
  for (let i = 0; i < 600 && st.winner === null; i++) st = act(st, chooseAction(st)).state;
  return st.winner === null ? { ...st, winner: 1 } : st;
}

const rivalSide = (h: Hero): BattleSide => ({ hero: toBattleHero(h), army: h.army, armyMorale: armyMorale(h.army), machines: h.machines ?? [] });

/** `adv` with the rival's hero replaced (null: beaten). */
const withRival = (adv: Adventure, hero: Hero | null): Adventure => ({ ...adv, rival: { ...adv.rival!, hero } });

export function rivalTurn(adv: Adventure, def: MapDef): { adv: Adventure; report: RivalReport } {
  if (!adv.rival || adv.status !== 'playing') return { adv, report: { path: [], notes: [] } };
  let next = rivalTowns(adv, def);
  const path: { x: number; y: number }[] = [];
  const notes: string[] = [];
  for (let i = 0; i <= REPLANS; i++) {
    const hero = rivalHero(next);
    if (!hero || hero.mp <= 0) break;
    const route = pickTarget(next, def, hero);
    if (!route) break;
    const r = ride(next, def, route);
    next = r.adv;
    path.push(...r.walked);
    notes.push(...r.notes);
    if (r.fight) return { adv: withNews(next, notes, r.fight), report: { path, notes, fight: r.fight } };
    if (!r.stopped) break;
  }
  return { adv: withNews(checkGoal(next, def), notes), report: { path, notes } };
}

/** The rival's news on the day's card (or a card of its own), and the fight he starts, announced and waiting. */
function withNews(adv: Adventure, notes: readonly string[], fight?: string): Adventure {
  const foe = rivalHero(adv);
  let prompts = adv.prompts;
  if (notes.length) {
    const last = prompts[prompts.length - 1];
    const day = calendar(adv.day);
    prompts = last?.kind === 'message' && last.title === day
      ? [...prompts.slice(0, -1), { ...last, text: `${last.text}\n${notes.join('\n')}` }]
      : [...prompts, { kind: 'message', title: 'The Black Banner', text: notes.join('\n') }];
  }
  if (!fight || !foe) return { ...adv, prompts };
  const at = fight === RIVAL ? adv.hero.name : (adv.towns.find((t) => DEFEND + t.id === fight)?.name ?? 'your town');
  const text = fight === RIVAL ? `${foe.name} rides against ${at}! Stand and fight.` : `${foe.name} storms ${at}! Its garrison must hold the walls alone.`;
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
    next = hireAtHome(next, t);
  }
  return next;
}

/**
 * The rival's hero in one of his towns hires all he can, the strongest
 * first; a town he isn't in hires into its own garrison, keeping RESERVE
 * gold for him.
 */
function hireAtHome(adv: Adventure, town: Town): Adventure {
  const hero = rivalHero(adv);
  const home = !!hero && hero.x === town.x && hero.y === town.y;
  const r = hireAll(town, home ? hero.army : town.garrison, adv.rival!.purse, home ? 0 : RESERVE);
  const t = home ? r.town : { ...r.town, garrison: r.army };
  return withTown({ ...adv, rival: { ...adv.rival!, purse: r.purse, hero: home ? { ...hero, army: r.army } : hero } }, t);
}

/** The strength the purse could hire in `town` today. */
function hireStrength(town: Town, gold: number): number {
  let left = gold;
  let n = 0;
  for (const base of dwellings(town).sort((x, y) => creature(y).level - creature(x).level)) {
    const id = bestUnit(town, base);
    if (!id) continue;
    const k = Math.min(hireable(town, id, { ...EMPTY, gold: left }), Math.floor(left / (creature(id).cost.gold ?? 1)));
    left -= k * (creature(id).cost.gold ?? 0);
    n += strengthOf(id, k);
  }
  return n;
}
const EMPTY = { gold: 0, wood: 0, ore: 0, mercury: 0, sulfur: 0, crystal: 0, gems: 0 } as const;

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
  if (!heroInGarrison(adv) && ours < mine * SAFE.hero) out.push({ x: adv.hero.x, y: adv.hero.y, value: VALUE.ourHero });
  for (const t of adv.towns.filter((x) => x.owner === 'player')) {
    // Our hero near the town would ride back to it: he counts as its defence.
    const heroNear = Math.max(Math.abs(adv.hero.x - t.x), Math.abs(adv.hero.y - t.y)) <= THREAT.tiles;
    const held = armyStrength(t.garrison) + (heroNear ? ours : 0);
    if (held < mine * SAFE.town) out.push({ x: t.x, y: t.y, value: VALUE.ourTown });
  }
  for (const t of adv.towns.filter((x) => x.owner === 'rival')) {
    if (t.x === hero.x && t.y === hero.y) continue;
    const near = Math.max(Math.abs(adv.hero.x - t.x), Math.abs(adv.hero.y - t.y)) <= THREAT.tiles && ours > mine * THREAT.share;
    out.push({ x: t.x, y: t.y, value: VALUE.home + Math.min(HIRE_MAX, hireStrength(t, adv.rival!.purse.gold) * HIRE_WORTH) + (near ? VALUE.defend : 0) });
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
    // Our hero: he attacks, and the player plays the fight.
    if (adv.hero.x === step.x && adv.hero.y === step.y) return { adv: next, walked, notes, stopped: true, fight: RIVAL };
    const gate = townAt(next, step.x, step.y);
    if (gate?.owner === 'player') {
      if (!isEmptyArmy(gate.garrison)) return { adv: next, walked, notes, stopped: true, fight: DEFEND + gate.id };
      next = checkGoal(withTown(withRival(next, { ...spent, x: step.x, y: step.y }), { ...gate, owner: 'rival', garrison: armyOf([]) }), def);
      walked.push(step);
      notes.push(`${hero.name} rode into ${gate.name}, and it flies his banner now.`);
      return { adv: next, walked, notes, stopped: false };
    }
    if (gate) {
      if (gate.owner === 'neutral' && !isEmptyArmy(gate.garrison)) {
        const won = fight(next, hero, gate.garrison, gate.id);
        next = won.adv;
        if (!won.won) return { adv: next, walked, notes: [...notes, ...won.notes], stopped: false };
      }
      const moved = withRival(next, { ...rivalHero(next)!, x: step.x, y: step.y, mp: spent.mp });
      const home = { ...townAt(moved, step.x, step.y)!, owner: 'rival' as const, ...(gate.owner === 'neutral' ? { garrison: armyOf([]) } : {}) };
      next = hireAtHome(withTown(moved, home), home);
      walked.push(step);
      return { adv: next, walked, notes, stopped: false };
    }
    const o = liveObjects(next).find((x) => x.x === step.x && x.y === step.y);
    if (o?.kind === 'monster') {
      const r = fight(withRival(next, spent), spent, splitMonster(o.creature!, o.count ?? 1), o.id);
      return { adv: r.adv, walked, notes: [...notes, ...r.notes], stopped: r.won };
    }
    if (o) {
      const guard = guardAt(next, o.x, o.y);
      if (guard) {
        const r = fight(withRival(next, spent), spent, splitMonster(guard.creature!, guard.count ?? 1), guard.id);
        if (!r.won) return { adv: r.adv, walked, notes: [...notes, ...r.notes], stopped: false };
        next = r.adv;
      }
      const v = visit(withRival(next, { ...rivalHero(next)!, mp: spent.mp }), o);
      return { adv: v.adv, walked, notes: [...notes, ...v.notes], stopped: true };
    }
    next = withRival(next, { ...spent, x: step.x, y: step.y });
    walked.push(step);
    // Into a monster's guard zone: it's fought there.
    const guard = guardAt(next, step.x, step.y);
    if (guard) {
      const r = fight(next, rivalHero(next)!, splitMonster(guard.creature!, guard.count ?? 1), guard.id);
      return { adv: r.adv, walked, notes: [...notes, ...r.notes], stopped: r.won };
    }
  }
  return { adv: next, walked, notes, stopped: false };
}

/** The rival's hero fights `army` (a monster or a neutral garrison) to the end, at once. */
function fight(adv: Adventure, hero: Hero, army: Army, id: string): { adv: Adventure; won: boolean; notes: string[] } {
  const end = autoBattle(rivalSide(hero), { hero: null, army }, (adv.seed ^ (adv.day * 7919) ^ hashId(`rival:${id}`)) >>> 0);
  if (end.winner !== 0) {
    const foes = army.find((s) => s)?.creature;
    return { adv: withRival(adv, null), won: false, notes: [`${hero.name} fell in battle${foes ? ` against the ${creature(foes).plural}` : ''}. His banner is down for good.`] };
  }
  const drop = adv.objects.find((o) => o.id === id)?.drop;
  const fought = { ...hero, army: survivors(end, 0, hero.army), machines: machinesLeft(end, 0) as MachineId[] };
  const after = drop ? gainItem(fought, drop).hero : fought;
  const objects = adv.objects.map((o) => (o.id === id ? { ...o, gone: true } : o));
  return { adv: { ...withRival(adv, after), objects }, won: true, notes: [] };
}

/** What the rival takes at a site: piles and chests into his purse, mines under his banner. */
function visit(adv: Adventure, o: MapObject): { adv: Adventure; notes: string[] } {
  const purse = adv.rival!.purse;
  const gone = (a: Adventure): Adventure => ({ ...a, objects: a.objects.map((x) => (x.id === o.id ? { ...x, gone: true } : x)) });
  const paid = (amount: Parameters<typeof addTo>[1]): Adventure => gone({ ...adv, rival: { ...adv.rival!, purse: addTo(purse, amount) } });
  switch (o.kind) {
    case 'pile':
      return { adv: paid({ [o.resource!]: o.amount ?? 0 }), notes: [] };
    case 'campfire':
      return { adv: paid({ gold: o.gold ?? 500, [o.resource!]: o.amount ?? 5 }), notes: [] };
    case 'chest':
      return { adv: paid({ gold: o.gold ?? 1000 }), notes: [] };
    case 'mine': {
      const ours = o.owner === 'player';
      const objects = adv.objects.map((x) => (x.id === o.id ? { ...x, owner: 'rival' as const } : x));
      return { adv: { ...adv, objects }, notes: ours ? [`${rivalHero(adv)!.name} took your ${MINE_NAMES[o.resource!]}.`] : [] };
    }
    default:
      return { adv, notes: [] };
  }
}
