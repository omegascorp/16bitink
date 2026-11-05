import type { Army } from './army';
import type { Action, BattleEvent, BattleHero, BattleState, Side, Stack, Step } from './battleTypes';
import { creature, type CreatureId, type MachineId } from './creatures';
import { hexAt, reachable, route, type Hex, COLS, ROWS } from './hex';
import { adjacent, around, covers, facesTarget, footprintAt, headOf, isWide, occupiedHexes, shotDistance, tailFn, touching } from './footprint';
import { roll, rollInt } from './rng';
import { heal, hurt, rollDamage, speedOf } from './damage';
import { castSpell } from './battleSpells';
import { activeStack, alive, isStone, onGround, playerSide, stackById, targetable, update, winnerOf } from './battleCore';
import { aimFor, batter, moatFor, MOAT_DAMAGE, nearestFree, PART_HEX, raiseWalls, standing, strikeByHand, strikesLeft, TOWERS, wallsAgainst, type Fortification, type Siege, type SiegePart } from './siege';

export { activeStack, alive, isStone, onGround, playerSide, stackById, targetable, update, winnerOf };

export interface BattleSide {
  readonly hero: BattleHero | null;
  readonly army: Army;
  /** Morale from the army's make-up (see armyMorale). */
  readonly armyMorale?: number;
  /** The hero's war machine, which comes along when they lay siege. */
  readonly machine?: MachineId;
  /** The companies up on a town's towers, place by place (the defender of a siege). */
  readonly towers?: Army;
}

/** A battle at a fortified town: its walls, and the side the player plays. */
export interface SiegeSetup {
  readonly fort: Fortification;
  readonly me: Side;
}

/** Where a besieging hero's war machine stands, on their edge column: a row no formation uses. */
const MACHINE_ROW = 9;
/** The formation row the keep stands in front of, on its way back from the wall. */
const KEEP_ROW = 2;
/** A company on a tower counts from this slot, apart from the army's: towers are their own row in a town. */
export const TOWER_SLOT = 100;

/** Rows each army of 1–7 stacks lines up on: H3's loose formation (VCMI gameConfig.json layouts.default, 11 rows). */
const FORMATION: readonly (readonly number[])[] = [[], [5], [2, 8], [2, 5, 8], [0, 4, 6, 10], [0, 2, 5, 8, 10], [0, 2, 4, 6, 8, 10], [0, 2, 4, 5, 6, 8, 10]];

/** Obstacles a battle gets (2–5 on the old 13 × 9 field, scaled by area), and the columns they keep to; at a siege they stay clear of the moat. */
const OBSTACLES = { min: 3, max: 7, firstCol: 3, lastCol: COLS - 4, siegeLastCol: 6 } as const;

/**
 * A new battle: the attacker lines up in the left column, the defender in the
 * right, with a few obstacles between. A two-hex unit's head stands one column
 * in so its tail sits on the edge column (VCMI's start positions). At a
 * siege the walls stand on the right: the attacker brings their war machine,
 * if they have one, and the defender's companies take their towers.
 */
export function createBattle(attacker: BattleSide, defender: BattleSide, seed: number, siege?: SiegeSetup): Step {
  const stacks: Stack[] = [];
  const walls: Siege | undefined = siege ? raiseWalls(siege.fort, siege.me) : undefined;
  [attacker, defender].forEach((side, s) => {
    const slots = side.army.map((slot, i) => ({ slot, i })).filter((x) => x.slot && x.slot.count > 0);
    const rows = FORMATION[slots.length]!;
    slots.forEach(({ slot, i }, k) => {
      const c = creature(slot!.creature);
      // Behind the walls, the row the keep would hide stands a column forward.
      const forward = walls && s === 1 && rows[k] === KEEP_ROW ? 1 : 0;
      const col = s === 0 ? (c.wide ? 1 : 0) : (c.wide ? COLS - 2 : COLS - 1) - forward;
      stacks.push({
        id: stacks.length, side: s as Side, creature: slot!.creature, count: slot!.count, startCount: slot!.count, topHp: c.hp,
        hex: hexAt(col, rows[k]!), shots: c.shots ?? 0, retaliationsLeft: c.retaliations ?? 1, slot: i,
        acted: false, waited: false, defending: false, moraleUsed: false, effects: [],
      });
    });
    if (!walls) return;
    // Slot -1: it isn't an army slot.
    if (s === 0 && side.machine) stacks.push(machineStack(stacks.length, 0, side.machine, hexAt(0, MACHINE_ROW), -1));
    if (s === 1) {
      (side.towers ?? []).slice(0, TOWERS.length).forEach((slot, i) => {
        if (!slot || slot.count <= 0 || !standing(walls, TOWERS[i]!)) return;
        const c = creature(slot.creature);
        stacks.push({
          id: stacks.length, side: 1, creature: slot.creature, count: slot.count, startCount: slot.count, topHp: c.hp,
          hex: PART_HEX[TOWERS[i]!], shots: c.shots ?? 0, retaliationsLeft: 0, slot: TOWER_SLOT + i, tower: i,
          acted: false, waited: false, defending: false, moraleUsed: false, effects: [],
        });
      });
    }
  });
  const { obstacles, seed: next } = placeObstacles(seed, new Set(stacks.flatMap(occupiedHexes)), !!walls);
  // The army's make-up adds to its hero's morale (a hero-less monster side has none).
  const heroes = [attacker, defender].map((side) => (side.hero ? { ...side.hero, morale: side.hero.morale + (side.armyMorale ?? 0) } : null));
  const state: BattleState = { round: 1, stacks, obstacles, heroes: [heroes[0]!, heroes[1]!], active: null, cast: [false, false], seed: next, winner: null, ...(walls ? { siege: walls } : {}) };
  return advance(state, [{ type: 'round', round: 1 }]);
}

function machineStack(id: number, side: Side, m: MachineId, hex: Hex, slot: number): Stack {
  const c = creature(m);
  return { id, side, creature: m, count: 1, startCount: 1, topHp: c.hp, hex, shots: c.shots ?? 0, retaliationsLeft: 0, slot, acted: false, waited: false, defending: false, moraleUsed: false, effects: [] };
}

/** 3–7 obstacles in the middle columns (three clear columns on each side), never on a unit's hex. */
function placeObstacles(seed: number, taken: ReadonlySet<Hex>, siege: boolean): { obstacles: Hex[]; seed: number } {
  const n = rollInt(seed, OBSTACLES.min, OBSTACLES.max);
  let s = n.seed;
  const out = new Set<Hex>();
  while (out.size < n.value) {
    const c = rollInt(s, OBSTACLES.firstCol, siege ? OBSTACLES.siegeLastCol : OBSTACLES.lastCol);
    const r = rollInt(c.seed, 0, ROWS - 1);
    s = r.seed;
    const h = hexAt(c.value, r.value);
    if (!taken.has(h)) out.add(h);
  }
  return { obstacles: [...out], seed: s };
}


/** Hexes a unit can't enter: obstacles, both hexes of every other living unit, and the walls closed to its side. */
export function blockedFor(state: BattleState, self: number): Set<Hex> {
  const walls = state.siege ? wallsAgainst(state.siege, stackById(state, self).side) : [];
  return new Set([...state.obstacles, ...walls, ...state.stacks.filter((s) => alive(s) && s.id !== self).flatMap(occupiedHexes)]);
}

/**
 * Where the active unit can go this turn, with step counts. Keys are head
 * hexes (`stack.hex`); a two-hex unit also covers each key's tail.
 */
export function moves(state: BattleState): Map<Hex, number> {
  const s = activeStack(state);
  if (!s) return new Map();
  if (s.tower !== undefined) return new Map([[s.hex, 0]]);
  return reachable(s.hex, speedOf(s), blockedFor(state, s.id), !!creature(s.creature).flies, tailFn(s.creature, s.side), moatOf(state, s.side));
}

const moatOf = (state: BattleState, side: Side): Set<Hex> => (state.siege ? moatFor(state.siege, side) : new Set());

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

const isEnemy = (a: Stack, b: Stack): boolean => a.side !== b.side && alive(b) && targetable(b);

/** Whether a stack can shoot now: it has shots and no enemy stands next to either of its hexes. */
export function canShoot(state: BattleState, s: Stack): boolean {
  if (!creature(s.creature).shots || s.shots <= 0) return false;
  // A company up on a tower shoots even with an enemy beside it.
  if (s.tower !== undefined) return true;
  return !state.stacks.some((o) => isEnemy(s, o) && onGround(o) && adjacent(s, o));
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
  return onGround(target) ? contactOptions(state, occupiedHexes(target)) : [];
}

/** Where the active unit can strike the hexes `targetHexes` from. */
function contactOptions(state: BattleState, targetHexes: readonly Hex[]): StrikeOption[] {
  const me = activeStack(state);
  if (!me) return [];
  const wide = isWide(me.creature);
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

/** Where the active unit can strike the gate or a tower by hand from: any attacker can, while it stands. */
export function handOptions(state: BattleState, part: SiegePart): StrikeOption[] {
  const me = activeStack(state);
  const siege = state.siege;
  if (!me || !siege || me.side !== 0 || !standing(siege, part) || creature(me.creature).machine) return [];
  return contactOptions(state, [PART_HEX[part]]);
}

/** The places a tap can strike `target` from: standing beside it, the unit stays where it is; otherwise any side of it. */
export function strikeChoices(state: BattleState, target: Stack): StrikeOption[] {
  const options = strikeOptions(state, target);
  const here = options.filter((o) => o.steps === 0);
  return here.length ? here : options;
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
      // A tower's stores don't run out.
      if (me.tower === undefined) s = update(s, me.id, (x) => ({ ...x, shots: x.shots - 1 }));
      break;
    }
    case 'catapult': {
      const throws = creature(me.creature).stones?.throws ?? 0;
      const thrown = Array.from({ length: throws }).reduce<BattleState>((st) => hurl(st, me, events), s);
      return advance(update(thrown, me.id, (x) => ({ ...x, acted: true })), events);
    }
    case 'bash': {
      if (!handOptions(s, action.part).some((o) => o.from === action.from)) throw new Error('cannot reach that from there');
      if (action.from !== me.hex) s = moveTo(s, me, action.from, events);
      s = bash(s, me.id, action.part, events);
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
  const path = flies ? [to] : route(me.hex, to, blockedFor(s, me.id), tailFn(me.creature, me.side), moatOf(s, me.side));
  events.push({ type: 'move', stack: me.id, path, flies });
  return intoMoat(update(s, me.id, (x) => ({ ...x, hex: to })), me.id, events);
}

/** A unit that ends a move in the moat is hurt there, each time it enters. */
function intoMoat(s: BattleState, id: number, events: BattleEvent[]): BattleState {
  const st = stackById(s, id);
  const moat = moatOf(s, st.side);
  if (!occupiedHexes(st).some((h) => moat.has(h))) return s;
  const { stack, kills } = hurt(st, MOAT_DAMAGE);
  events.push({ type: 'moat', stack: id, damage: MOAT_DAMAGE, kills });
  return update(s, id, () => stack);
}

/** A company strikes `part` by hand; a walker that ended up in the moat may not live to. */
function bash(s: BattleState, id: number, part: SiegePart, events: BattleEvent[]): BattleState {
  if (!alive(stackById(s, id))) return s;
  const siege = strikeByHand(s.siege!, part);
  const left = strikesLeft(siege, part);
  events.push({ type: 'bash', stack: id, part, left });
  return left > 0 ? { ...s, siege } : towerFalls({ ...s, siege }, part, events);
}

/** A stone at the walls: the part it flies at is a weighted draw, then a roll for a miss, a blow or two. */
function hurl(s: BattleState, me: Stack, events: BattleEvent[]): BattleState {
  const siege = s.siege;
  const aims = siege ? aimFor(siege) : [];
  const stones = creature(me.creature).stones;
  if (!siege || !aims.length || !stones) return s;
  const total = aims.reduce((n, a) => n + a.weight, 0);
  const pick = roll(s.seed);
  const hit = roll(pick.seed);
  let left = pick.value * total;
  const part: SiegePart = aims.find((a) => (left -= a.weight) < 0)?.part ?? aims[aims.length - 1]!.part;
  const blows = hit.value < stones.miss ? 0 : hit.value < stones.miss + stones.crit ? 2 : 1;
  const next = batter(siege, part, blows);
  const down = blows > 0 && !standing(next, part);
  events.push({ type: 'siege', stack: me.id, part, blows, down });
  const after = { ...s, siege: next, seed: hit.seed };
  return down ? towerFalls(after, part, events) : after;
}

/** A tower down: the company on it, if any, lands on the ground and fights on from there. */
function towerFalls(s: BattleState, part: SiegePart, events: BattleEvent[]): BattleState {
  const i = (TOWERS as readonly SiegePart[]).indexOf(part);
  const st = s.stacks.find((x) => x.tower === i && alive(x));
  if (!st) return s;
  const taken = blockedFor(s, st.id);
  const wide = isWide(st.creature);
  const to = nearestFree(st.hex, wide ? new Set([...taken, st.hex]) : taken);
  if (to === null) return update(s, st.id, ({ tower: _down, ...x }) => x);
  events.push({ type: 'fall', stack: st.id, to });
  return update(s, st.id, ({ tower: _down, ...x }) => ({ ...x, hex: to }));
}

/** Whom a melee blow from head hex `from` lands on: the target, and for a cleaver every other enemy beside it there. */
export function struckBy(state: BattleState, me: Stack, target: Stack, from: Hex): Stack[] {
  if (!creature(me.creature).cleave) return [target];
  const hexes = footprintAt(from, isWide(me.creature), me.side) ?? [from];
  return [target, ...state.stacks.filter((o) => o.id !== target.id && isEnemy(me, o) && onGround(o) && touching(hexes, occupiedHexes(o)))];
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

/** The testing cheat: every enemy company falls at once and the player's side has won. */
export function conquer(s: BattleState): BattleState {
  const me = playerSide(s);
  return { ...s, stacks: s.stacks.map((st) => (st.side !== me ? { ...st, count: 0 } : st)), active: null, winner: me };
}

/** Experience the winner earns: the HP of every enemy creature killed (H3). */
export function experienceFor(s: BattleState, side: Side): number {
  return s.stacks.filter((x) => x.side !== side).reduce((n, x) => n + (x.startCount - x.count) * creature(x.creature).hp, 0);
}

/** What's left of the companies on a town's towers, place by place: back up there, whether their tower fell or not. */
export function towerSurvivors(s: BattleState, side: Side, towers: Army): Army {
  return towers.map((slot, i) => {
    if (!slot) return null;
    const st = s.stacks.find((x) => x.side === side && x.slot === TOWER_SLOT + i);
    if (!st) return slot;
    return st.count > 0 ? { creature: slot.creature, count: st.count } : null;
  });
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
