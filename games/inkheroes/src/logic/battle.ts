import type { Army } from './army';
import type { Action, BattleEvent, BattleHero, BattleState, Side, Stack, Step } from './battleTypes';
import { creature, type CreatureId } from './creatures';
import { hexAt, reachable, route, type Hex, COLS, ROWS } from './hex';
import { adjacent, around, covers, facesTarget, footprintAt, headOf, isWide, occupiedHexes, shotDistance, tailFn, touching } from './footprint';
import { roll, rollInt } from './rng';
import { heal, hurt, rollDamage, speedOf } from './damage';
import { castSpell } from './battleSpells';
import { activeStack, alive, isStone, stackById, update, winnerOf } from './battleCore';

export { activeStack, alive, isStone, stackById, update, winnerOf };

export interface BattleSide {
  readonly hero: BattleHero | null;
  readonly army: Army;
  /** Morale from the army's make-up (see armyMorale). */
  readonly armyMorale?: number;
  /** The hero's war machines (one of each at most). */
  readonly machines?: readonly CreatureId[];
}

/** The rows war machines stand on, at the back of their side: rows no formation uses. */
const MACHINE_ROWS: readonly number[] = [3, 7];

/** Rows each army of 1–7 stacks lines up on: H3's loose formation (VCMI gameConfig.json layouts.default, 11 rows). */
const FORMATION: readonly (readonly number[])[] = [[], [5], [2, 8], [2, 5, 8], [0, 4, 6, 10], [0, 2, 5, 8, 10], [0, 2, 4, 6, 8, 10], [0, 2, 4, 5, 6, 8, 10]];

/** Obstacles a battle gets (2–5 on the old 13 × 9 field, scaled by area), and the columns they keep to. */
const OBSTACLES = { min: 3, max: 7, firstCol: 3, lastCol: COLS - 4 } as const;

/**
 * A new battle: the attacker lines up in the left column, the defender in the
 * right, with a few obstacles between. A two-hex unit's head stands one column
 * in so its tail sits on the edge column (VCMI's start positions).
 */
export function createBattle(attacker: BattleSide, defender: BattleSide, seed: number): Step {
  const stacks: Stack[] = [];
  [attacker, defender].forEach((side, s) => {
    const slots = side.army.map((slot, i) => ({ slot, i })).filter((x) => x.slot && x.slot.count > 0);
    const rows = FORMATION[slots.length]!;
    slots.forEach(({ slot, i }, k) => {
      const c = creature(slot!.creature);
      const col = s === 0 ? (c.wide ? 1 : 0) : c.wide ? COLS - 2 : COLS - 1;
      stacks.push({
        id: stacks.length, side: s as Side, creature: slot!.creature, count: slot!.count, startCount: slot!.count, topHp: c.hp,
        hex: hexAt(col, rows[k]!), shots: c.shots ?? 0, retaliationsLeft: c.retaliations ?? 1, slot: i,
        acted: false, waited: false, defending: false, moraleUsed: false, effects: [],
      });
    });
    // War machines stand on the side's edge column, out of the formation; slot -1, -2 (they aren't army slots).
    (side.machines ?? []).slice(0, MACHINE_ROWS.length).forEach((m, k) => {
      const c = creature(m);
      stacks.push({
        id: stacks.length, side: s as Side, creature: m, count: 1, startCount: 1, topHp: c.hp,
        hex: hexAt(s === 0 ? 0 : COLS - 1, MACHINE_ROWS[k]!), shots: c.shots ?? 0, retaliationsLeft: 0, slot: -1 - k,
        acted: false, waited: false, defending: false, moraleUsed: false, effects: [],
      });
    });
  });
  const { obstacles, seed: next } = placeObstacles(seed, new Set(stacks.flatMap(occupiedHexes)));
  // The army's make-up adds to its hero's morale (a hero-less monster side has none).
  const heroes = [attacker, defender].map((side) => (side.hero ? { ...side.hero, morale: side.hero.morale + (side.armyMorale ?? 0) } : null));
  const state: BattleState = { round: 1, stacks, obstacles, heroes: [heroes[0]!, heroes[1]!], active: null, cast: [false, false], seed: next, winner: null };
  return advance(state, [{ type: 'round', round: 1 }]);
}

/** 3–7 obstacles in the middle columns (three clear columns on each side), never on a unit's hex. */
function placeObstacles(seed: number, taken: ReadonlySet<Hex>): { obstacles: Hex[]; seed: number } {
  const n = rollInt(seed, OBSTACLES.min, OBSTACLES.max);
  let s = n.seed;
  const out = new Set<Hex>();
  while (out.size < n.value) {
    const c = rollInt(s, OBSTACLES.firstCol, OBSTACLES.lastCol);
    const r = rollInt(c.seed, 0, ROWS - 1);
    s = r.seed;
    const h = hexAt(c.value, r.value);
    if (!taken.has(h)) out.add(h);
  }
  return { obstacles: [...out], seed: s };
}


/** Hexes a unit can't enter: obstacles and both hexes of every other living unit. */
export function blockedFor(state: BattleState, self: number): Set<Hex> {
  return new Set([...state.obstacles, ...state.stacks.filter((s) => alive(s) && s.id !== self).flatMap(occupiedHexes)]);
}

/**
 * Where the active unit can go this turn, with step counts. Keys are head
 * hexes (`stack.hex`); a two-hex unit also covers each key's tail.
 */
export function moves(state: BattleState): Map<Hex, number> {
  const s = activeStack(state);
  if (!s) return new Map();
  return reachable(s.hex, speedOf(s), blockedFor(state, s.id), !!creature(s.creature).flies, tailFn(s.creature, s.side));
}

/** The living stack covering `h` (either hex of a two-hex unit), if any. */
export function stackAt(state: BattleState, h: Hex): Stack | undefined {
  return state.stacks.find((s) => alive(s) && covers(s, h));
}

/**
 * Every hex the active unit could cover after a move: each reachable head and
 * its tail (VCMI's battleGetOccupiableHexes), without its current spot. For
 * lighting the reach; turn a tapped hex into a move with moveHeadFor.
 */
export function occupiableHexes(state: BattleState): Set<Hex> {
  const s = activeStack(state);
  const out = new Set<Hex>();
  if (!s) return out;
  for (const h of moves(state).keys()) {
    if (h === s.hex) continue;
    for (const x of footprintAt(h, isWide(s.creature), s.side) ?? []) out.add(x);
  }
  return out;
}

/**
 * The head hex to move to when the player taps `h` (VCMI's toWhichHexMove):
 * `h` itself if the unit can stand there, else (two-hex units) the head that
 * puts the tail on `h`; null if neither, or if it's where the unit stands.
 */
export function moveHeadFor(state: BattleState, h: Hex): Hex | null {
  const s = activeStack(state);
  if (!s) return null;
  const reach = moves(state);
  if (reach.has(h)) return h === s.hex ? null : h;
  if (!isWide(s.creature)) return null;
  const head = headOf(h, s.side);
  return head !== null && head !== s.hex && reach.has(head) ? head : null;
}

const isEnemy = (a: Stack, b: Stack): boolean => a.side !== b.side && alive(b);

/** Whether a stack can shoot now: it has shots and no enemy stands next to either of its hexes. */
export function canShoot(state: BattleState, s: Stack): boolean {
  if (!creature(s.creature).shots || s.shots <= 0) return false;
  // A ballista shoots even with an enemy beside it.
  if (creature(s.creature).machine) return true;
  return !state.stacks.some((o) => isEnemy(s, o) && adjacent(s, o));
}

/** One place the active unit can strike a target from. */
export interface StrikeOption {
  /** The head hex the unit stands on to strike (Action `attack.from`). */
  readonly from: Hex;
  /** Steps walked to get there (0 = where it stands). */
  readonly steps: number;
  /** The hexes it covers there, head first. */
  readonly hexes: readonly Hex[];
  /** Its hex that touches the target (the head when both do). */
  readonly contact: Hex;
  /** The target's hex it strikes (the head when both touch `contact`). */
  readonly struck: Hex;
  /** It turns round to strike (target behind it) and turns back after; animation only. */
  readonly reversed: boolean;
}

/**
 * Where the active unit can strike `target` from: every reachable head whose
 * hexes touch any of the target's (VCMI's getAttackableHexes): a one-hex unit
 * from any hex round the target; a two-hex unit with its head there, or with
 * its tail there (head one hex forward).
 */
export function strikeOptions(state: BattleState, target: Stack): StrikeOption[] {
  const me = activeStack(state);
  if (!me) return [];
  const wide = isWide(me.creature);
  const targetHexes = occupiedHexes(target);
  const reach = moves(state);
  const heads = new Set<Hex>();
  for (const h of around(targetHexes)) {
    heads.add(h);
    const head = wide ? headOf(h, me.side) : null;
    if (head !== null) heads.add(head);
  }
  const out: StrikeOption[] = [];
  for (const from of heads) {
    const steps = reach.get(from);
    const hexes = footprintAt(from, wide, me.side);
    if (steps === undefined || !hexes || hexes.some((h) => targetHexes.includes(h))) continue;
    const contact = hexes.find((h) => touching([h], targetHexes));
    if (contact === undefined) continue;
    const struck = targetHexes.find((t) => touching([contact], [t]))!;
    out.push({ from, steps, hexes, contact, struck, reversed: !facesTarget(me.side, hexes, targetHexes) });
  }
  return out;
}

/** The head hexes the active unit can strike `target` from, with steps walked to get there. */
export function strikeFrom(state: BattleState, target: Stack): Map<Hex, number> {
  return new Map(strikeOptions(state, target).map((o) => [o.from, o.steps]));
}

/** Applies the active unit's (or its hero's) action. Illegal actions throw. */
export function act(state: BattleState, action: Action): Step {
  if (state.winner !== null) throw new Error('battle is over');
  const me = activeStack(state);
  if (!me) throw new Error('no active stack');
  if (action.type === 'cast') return castSpell(state, me.side, action.spell, action.target);
  const events: BattleEvent[] = [];
  let s = state;
  switch (action.type) {
    case 'move': {
      const steps = moves(s).get(action.to);
      if (steps === undefined || action.to === me.hex) throw new Error('cannot move there');
      s = moveTo(s, me, action.to, events);
      break;
    }
    case 'attack': {
      const target = stackById(s, action.target);
      if (!isEnemy(me, target)) throw new Error('not an enemy');
      const steps = strikeFrom(s, target).get(action.from);
      if (steps === undefined) throw new Error('cannot strike from there');
      if (action.from !== me.hex) s = moveTo(s, me, action.from, events);
      s = melee(s, me.id, target.id, action.from, steps, events);
      s = swoopHome(s, me, events);
      break;
    }
    case 'shoot': {
      const target = stackById(s, action.target);
      if (!isEnemy(me, target) || !canShoot(s, me)) throw new Error('cannot shoot');
      s = strike(s, me.id, target.id, { ranged: true, distance: shotDistance(me, target), moved: 0 }, false, events);
      s = update(s, me.id, (x) => ({ ...x, shots: x.shots - 1 }));
      break;
    }
    case 'wait': {
      if (me.waited) throw new Error('already waited');
      events.push({ type: 'wait', stack: me.id });
      return advance(update(s, me.id, (x) => ({ ...x, waited: true })), events);
    }
    case 'defend': {
      events.push({ type: 'defend', stack: me.id });
      return advance(update(s, me.id, (x) => ({ ...x, defending: true, acted: true })), events);
    }
    case 'heal': {
      const target = stackById(s, action.target);
      const most = creature(me.creature).heals ?? 0;
      if (!most || target.side !== me.side || !alive(target) || creature(target.creature).machine) throw new Error('cannot heal that');
      const r = rollInt(s.seed, Math.ceil(most / 2), most);
      const amount = Math.min(r.value, creature(target.creature).hp - target.topHp);
      events.push({ type: 'heal', stack: me.id, target: target.id, amount });
      s = update({ ...s, seed: r.seed }, target.id, (x) => ({ ...x, topHp: x.topHp + amount }));
      return advance(update(s, me.id, (x) => ({ ...x, acted: true })), events);
    }
  }
  return afterAction(s, me.id, events);
}

function moveTo(s: BattleState, me: Stack, to: Hex, events: BattleEvent[]): BattleState {
  const flies = !!creature(me.creature).flies;
  const path = flies ? [to] : route(me.hex, to, blockedFor(s, me.id), tailFn(me.creature, me.side));
  events.push({ type: 'move', stack: me.id, path, flies });
  return update(s, me.id, (x) => ({ ...x, hex: to }));
}

/** Whom a melee blow from head hex `from` lands on: the target, and for a cleaver every other enemy beside it there. */
export function struckBy(state: BattleState, me: Stack, target: Stack, from: Hex): Stack[] {
  if (!creature(me.creature).cleave) return [target];
  const hexes = footprintAt(from, isWide(me.creature), me.side) ?? [from];
  return [target, ...state.stacks.filter((o) => o.id !== target.id && isEnemy(me, o) && touching(hexes, occupiedHexes(o)))];
}

/** Whether `def` would answer a melee strike from `att`. */
export function answers(att: Stack, def: Stack): boolean {
  return def.retaliationsLeft > 0 && !isStone(def) && !creature(att.creature).noRetaliation;
}

/** A melee strike: every blow lands first, then each stack struck that still can answers once. */
function melee(s: BattleState, a: number, d: number, from: Hex, moved: number, events: BattleEvent[]): BattleState {
  const struck = struckBy(s, stackById(s, a), stackById(s, d), from).map((x) => x.id);
  const ctx = { ranged: false, distance: 1, moved };
  const hit = struck.reduce((st, id) => strike(st, a, id, ctx, false, events), s);
  return struck.reduce((st, id) => answer(st, a, id, events), hit);
}

function answer(s: BattleState, a: number, d: number, events: BattleEvent[]): BattleState {
  const att = stackById(s, a);
  const def = stackById(s, d);
  if (!alive(att) || !alive(def) || !answers(att, def)) return s;
  const next = strike(s, d, a, { ranged: false, distance: 1, moved: 0 }, true, events);
  return update(next, d, (x) => ({ ...x, retaliationsLeft: x.retaliationsLeft - 1 }));
}

/** After a strike, a swooper flies back to where `start` shows it began, if it lived, isn't stone and the hex is free. */
function swoopHome(s: BattleState, start: Stack, events: BattleEvent[]): BattleState {
  const bird = stackById(s, start.id);
  if (!creature(bird.creature).swoop || !alive(bird) || isStone(bird) || bird.hex === start.hex) return s;
  return blockedFor(s, bird.id).has(start.hex) ? s : moveTo(s, bird, start.hex, events);
}

function strike(s: BattleState, a: number, d: number, ctx: { ranged: boolean; distance: number; moved: number }, retaliation: boolean, events: BattleEvent[]): BattleState {
  const att = stackById(s, a);
  const def = stackById(s, d);
  const r = rollDamage(s, att, def, ctx, s.seed);
  const { stack, kills } = hurt(def, r.damage);
  events.push({ type: 'strike', stack: a, target: d, damage: r.damage, kills, lucky: r.lucky, retaliation, ranged: ctx.ranged });
  const next = { ...update(s, d, () => stack), seed: r.seed };
  return ctx.ranged ? next : petrify(next, att, d, events);
}

/** A petrifying strike that landed may turn its living target to stone (a roll only when it could). */
function petrify(s: BattleState, att: Stack, d: number, events: BattleEvent[]): BattleState {
  const chance = creature(att.creature).petrify;
  if (!chance || !alive(stackById(s, d))) return s;
  const r = roll(s.seed);
  const next = { ...s, seed: r.seed };
  if (r.value >= chance) return next;
  events.push({ type: 'stone', stack: d, lost: false });
  return update(next, d, (x) => ({ ...x, effects: [...x.effects.filter((e) => e.kind !== 'stone'), { kind: 'stone', rounds: 1 }] }));
}

/** After a move or strike: a good-morale extra turn, or the turn passes. */
function afterAction(s: BattleState, id: number, events: BattleEvent[]): Step {
  const me = stackById(s, id);
  const ended = winnerOf(s);
  if (ended === null && alive(me) && !me.moraleUsed && !isStone(me)) {
    const m = moraleFor(s, me);
    const r = roll(s.seed);
    s = { ...s, seed: r.seed };
    if (m > 0 && r.value < m / 24) {
      events.push({ type: 'morale', stack: id, good: true });
      return { state: update(s, id, (x) => ({ ...x, moraleUsed: true })), events };
    }
  }
  return advance(update(s, id, (x) => ({ ...x, acted: true })), events);
}

/** A stack's morale: its side's hero and army make-up; undead have none. */
export function moraleFor(s: BattleState, st: Stack): number {
  if (creature(st.creature).undead) return 0;
  return Math.max(-3, Math.min(3, s.heroes[st.side]?.morale ?? 0));
}

/** Picks whose turn is next: fresh units fastest first, then those who waited, slowest first; a new round when all have acted. */
export function advance(s: BattleState, events: BattleEvent[]): Step {
  const won = winnerOf(s);
  if (won !== null) {
    events.push({ type: 'end', winner: won });
    return { state: { ...s, active: null, winner: won }, events };
  }
  for (;;) {
    const next = pickNext(s);
    if (next === null) {
      s = newRound(s);
      events.push({ type: 'round', round: s.round });
      continue;
    }
    // A unit's Defend lasts until its own next turn.
    s = update(s, next.id, (x) => ({ ...x, defending: false }));
    if (isStone(next)) {
      events.push({ type: 'stone', stack: next.id, lost: true });
      s = update(s, next.id, (x) => ({ ...x, acted: true, effects: x.effects.filter((e) => e.kind !== 'stone') }));
      continue;
    }
    s = regrow(s, next, events);
    const m = moraleFor(s, next);
    if (m < 0 && !next.waited) {
      const r = roll(s.seed);
      s = { ...s, seed: r.seed };
      if (r.value < (-m * 2) / 24) {
        events.push({ type: 'morale', stack: next.id, good: false });
        s = update(s, next.id, (x) => ({ ...x, acted: true }));
        continue;
      }
    }
    events.push({ type: 'turn', stack: next.id });
    return { state: { ...s, active: next.id }, events };
  }
}

/** A regrowing stack's top creature heals as its turn starts (once a round: not again after a wait). */
function regrow(s: BattleState, st: Stack, events: BattleEvent[]): BattleState {
  const amount = Math.min(creature(st.creature).regen ?? 0, creature(st.creature).hp - st.topHp);
  if (amount <= 0 || st.waited) return s;
  events.push({ type: 'heal', stack: st.id, target: st.id, amount });
  return update(s, st.id, (x) => heal(x, amount));
}

function pickNext(s: BattleState): Stack | null {
  const live = s.stacks.filter((x) => alive(x) && !x.acted);
  const first: Side = s.round % 2 === 1 ? 0 : 1;
  const tie = (a: Stack, b: Stack): number => (a.side === b.side ? a.slot - b.slot : a.side === first ? -1 : 1);
  const fresh = live.filter((x) => !x.waited).sort((a, b) => speedOf(b) - speedOf(a) || tie(a, b));
  if (fresh.length) return fresh[0]!;
  const waiting = live.sort((a, b) => speedOf(a) - speedOf(b) || tie(a, b));
  return waiting[0] ?? null;
}

function newRound(s: BattleState): BattleState {
  return {
    ...s,
    round: s.round + 1,
    cast: [false, false],
    stacks: s.stacks.map((x) => ({
      ...x,
      acted: false,
      waited: false,
      moraleUsed: false,
      retaliationsLeft: creature(x.creature).retaliations ?? 1,
      // Stone doesn't wear off with the round: it lasts until the stack's lost turn (see advance).
      effects: x.effects.map((e) => (e.kind === 'stone' ? e : { ...e, rounds: e.rounds - 1 })).filter((e) => e.rounds > 0),
    })),
  };
}

/** Experience the winner earns: the HP of every enemy creature killed (H3). */
export function experienceFor(s: BattleState, side: Side): number {
  return s.stacks.filter((x) => x.side !== side).reduce((n, x) => n + (x.startCount - x.count) * creature(x.creature).hp, 0);
}

/** The war machines a side still has standing, to put back with its hero. */
export function machinesLeft(s: BattleState, side: Side): CreatureId[] {
  return s.stacks.filter((x) => x.side === side && x.slot < 0 && alive(x)).map((x) => x.creature);
}

/** What's left of a side's army, slot by slot, to put back on the map. */
export function survivors(s: BattleState, side: Side, army: Army): Army {
  return army.map((slot, i) => {
    if (!slot) return null;
    const st = s.stacks.find((x) => x.side === side && x.slot === i);
    if (!st) return slot;
    return st.count > 0 ? { creature: slot.creature, count: st.count } : null;
  });
}
