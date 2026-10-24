import type { Army } from './army';
import type { Action, BattleEvent, BattleHero, BattleState, Side, Stack, Step } from './battleTypes';
import { creature } from './creatures';
import { distance, hexAt, neighbours, reachable, route, type Hex, COLS } from './hex';
import { roll, rollInt } from './rng';
import { hurt, rollDamage, speedOf } from './damage';
import { castSpell } from './battleSpells';
import { activeStack, alive, stackById, update, winnerOf } from './battleCore';

export { activeStack, alive, stackById, update, winnerOf };

export interface BattleSide {
  readonly hero: BattleHero | null;
  readonly army: Army;
  /** Morale from the army's make-up (see armyMorale). */
  readonly armyMorale?: number;
}

/** Rows each formation of 1–7 stacks lines up on (9 rows). */
const FORMATION: readonly (readonly number[])[] = [[], [4], [2, 6], [2, 4, 6], [1, 3, 5, 7], [0, 2, 4, 6, 8], [0, 1, 3, 5, 7, 8], [0, 1, 3, 4, 5, 7, 8]];

/** A new battle: the attacker lines up in the left column, the defender in the right, with a few obstacles between. */
export function createBattle(attacker: BattleSide, defender: BattleSide, seed: number): Step {
  const stacks: Stack[] = [];
  [attacker, defender].forEach((side, s) => {
    const slots = side.army.map((slot, i) => ({ slot, i })).filter((x) => x.slot && x.slot.count > 0);
    const rows = FORMATION[slots.length]!;
    slots.forEach(({ slot, i }, k) => {
      const c = creature(slot!.creature);
      stacks.push({
        id: stacks.length, side: s as Side, creature: slot!.creature, count: slot!.count, startCount: slot!.count, topHp: c.hp,
        hex: hexAt(s === 0 ? 0 : COLS - 1, rows[k]!), shots: c.shots ?? 0, retaliationsLeft: c.retaliations ?? 1, slot: i,
        acted: false, waited: false, defending: false, moraleUsed: false, effects: [],
      });
    });
  });
  const { obstacles, seed: next } = placeObstacles(seed);
  // The army's make-up adds to its hero's morale (a hero-less monster side has none).
  const heroes = [attacker, defender].map((side) => (side.hero ? { ...side.hero, morale: side.hero.morale + (side.armyMorale ?? 0) } : null));
  const state: BattleState = { round: 1, stacks, obstacles, heroes: [heroes[0]!, heroes[1]!], active: null, cast: [false, false], seed: next, winner: null };
  return advance(state, [{ type: 'round', round: 1 }]);
}

function placeObstacles(seed: number): { obstacles: Hex[]; seed: number } {
  const n = rollInt(seed, 2, 5);
  let s = n.seed;
  const out = new Set<Hex>();
  while (out.size < n.value) {
    const c = rollInt(s, 3, COLS - 4);
    const r = rollInt(c.seed, 0, 8);
    s = r.seed;
    out.add(hexAt(c.value, r.value));
  }
  return { obstacles: [...out], seed: s };
}


/** Hexes a unit can't enter: obstacles and every other living unit. */
export function blockedFor(state: BattleState, self: number): Set<Hex> {
  return new Set([...state.obstacles, ...state.stacks.filter((s) => alive(s) && s.id !== self).map((s) => s.hex)]);
}

/** Where the active unit can go this turn, with step counts. */
export function moves(state: BattleState): Map<Hex, number> {
  const s = activeStack(state);
  if (!s) return new Map();
  return reachable(s.hex, speedOf(s), blockedFor(state, s.id), !!creature(s.creature).flies);
}

const isEnemy = (a: Stack, b: Stack): boolean => a.side !== b.side && alive(b);

/** Whether a stack can shoot now: it has shots and no enemy stands next to it. */
export function canShoot(state: BattleState, s: Stack): boolean {
  if (!creature(s.creature).shots || s.shots <= 0) return false;
  const near = new Set(neighbours(s.hex));
  return !state.stacks.some((o) => isEnemy(s, o) && near.has(o.hex));
}

/** The hexes next to `target` the active unit can strike it from, with steps walked to get there. */
export function strikeFrom(state: BattleState, target: Stack): Map<Hex, number> {
  const reach = moves(state);
  const out = new Map<Hex, number>();
  for (const h of neighbours(target.hex)) {
    const steps = reach.get(h);
    if (steps !== undefined) out.set(h, steps);
  }
  return out;
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
      s = melee(s, me.id, target.id, steps, events);
      break;
    }
    case 'shoot': {
      const target = stackById(s, action.target);
      if (!isEnemy(me, target) || !canShoot(s, me)) throw new Error('cannot shoot');
      s = strike(s, me.id, target.id, { ranged: true, distance: distance(me.hex, target.hex), moved: 0 }, false, events);
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
  }
  return afterAction(s, me.id, events);
}

function moveTo(s: BattleState, me: Stack, to: Hex, events: BattleEvent[]): BattleState {
  const flies = !!creature(me.creature).flies;
  const path = flies ? [to] : route(me.hex, to, blockedFor(s, me.id));
  events.push({ type: 'move', stack: me.id, path, flies });
  return update(s, me.id, (x) => ({ ...x, hex: to }));
}

function melee(s: BattleState, a: number, d: number, moved: number, events: BattleEvent[]): BattleState {
  let next = strike(s, a, d, { ranged: false, distance: 1, moved }, false, events);
  const att = stackById(next, a);
  const def = stackById(next, d);
  if (alive(def) && alive(att) && def.retaliationsLeft > 0 && !creature(att.creature).noRetaliation) {
    next = strike(next, d, a, { ranged: false, distance: 1, moved: 0 }, true, events);
    next = update(next, d, (x) => ({ ...x, retaliationsLeft: x.retaliationsLeft - 1 }));
  }
  return next;
}

function strike(s: BattleState, a: number, d: number, ctx: { ranged: boolean; distance: number; moved: number }, retaliation: boolean, events: BattleEvent[]): BattleState {
  const att = stackById(s, a);
  const def = stackById(s, d);
  const r = rollDamage(s, att, def, ctx, s.seed);
  const { stack, kills } = hurt(def, r.damage);
  events.push({ type: 'strike', stack: a, target: d, damage: r.damage, kills, lucky: r.lucky, retaliation, ranged: ctx.ranged });
  return { ...update(s, d, () => stack), seed: r.seed };
}

/** After a move or strike: a good-morale extra turn, or the turn passes. */
function afterAction(s: BattleState, id: number, events: BattleEvent[]): Step {
  const me = stackById(s, id);
  const ended = winnerOf(s);
  if (ended === null && alive(me) && !me.moraleUsed) {
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
      effects: x.effects.map((e) => ({ ...e, rounds: e.rounds - 1 })).filter((e) => e.rounds > 0),
    })),
  };
}

/** Experience the winner earns: the HP of every enemy creature killed (H3). */
export function experienceFor(s: BattleState, side: Side): number {
  return s.stacks.filter((x) => x.side !== side).reduce((n, x) => n + (x.startCount - x.count) * creature(x.creature).hp, 0);
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
