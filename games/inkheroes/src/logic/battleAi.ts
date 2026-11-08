import { activeStack, alive, answers, canShoot, handOptions, isStone, moves, strikeFrom, struckBy, targetable } from './battle';
import type { Action, BattleState, Side, Stack } from './battleTypes';
import { creature, strengthOf } from './creatures';
import { damageRange, killsBy } from './damage';
import { distance, HEX_COUNT, neighbours, type Hex } from './hex';
import { occupiedHexes, shotDistance } from './footprint';
import { aimFor, insideWalls, moatFor, PART_HEX, standing, TOWERS, wallsAgainst, type SiegePart } from './siege';

/** A lord who can leave the field does once his army is cut down this far and the enemy's is this much stronger. */
const FLEE = { kept: 0.6, odds: 2 } as const;

/** The fighting strength a side has on the field (war machines don't count). */
function fieldStrength(state: BattleState, side: Side, at: 'now' | 'start'): number {
  return state.stacks
    .filter((x) => x.side === side && !creature(x.creature).machine)
    .reduce((n, x) => n + strengthOf(x.creature, at === 'now' ? x.count : x.startCount), 0);
}

/** Whether side `side`'s hero should leave the field: able to, already hurt, and outmatched. */
export function losing(state: BattleState, side: Side): boolean {
  if (!state.heroes[side]?.canFlee) return false;
  const mine = fieldStrength(state, side, 'now');
  return mine < fieldStrength(state, side, 'start') * FLEE.kept && fieldStrength(state, side === 0 ? 1 : 0, 'now') > mine * FLEE.odds;
}

const average = (r: { min: number; max: number }): number => (r.min + r.max) / 2;

/** The HP a strike would really take off (it can't take more than the target has). */
function worth(target: Stack, damage: number): number {
  const c = creature(target.creature);
  const total = (target.count - 1) * c.hp + target.topHp;
  return Math.min(total, damage) * (1 + c.level * 0.15);
}

/** The trade one blow on `e` makes: damage dealt, less what's answered, plus what a chance of stone would spare. */
function tradeOn(state: BattleState, me: Stack, e: Stack, moved: number): number {
  const dealt = average(damageRange(state, me, e, { ranged: false, distance: 1, moved }));
  const left = { ...e, count: e.count - killsBy(e, dealt) };
  const threat = left.count > 0 ? worth(me, average(damageRange(state, left, me, { ranged: false, distance: 1, moved: 0 }))) : 0;
  const back = answers(me, e) ? threat : 0;
  const stone = isStone(e) ? 0 : (creature(me.creature).petrify ?? 0) * threat;
  return worth(e, dealt) - back * 0.8 + stone;
}

/**
 * The neutral AI, after VCMI's StupidAI: a shooter shoots the target it hurts
 * most; otherwise hit the reachable enemy that gives the best trade (damage
 * dealt minus damage taken back, over every stack a cleaver would hit from
 * that hex); otherwise walk towards the nearest enemy.
 */
export function chooseAction(state: BattleState): Action {
  const me = activeStack(state);
  if (!me) throw new Error('no active stack');
  if (creature(me.creature).machine) return machineAction(state, me);
  if (losing(state, me.side)) return { type: 'flee' };
  const enemies = foesOf(state, me);
  if (canShoot(state, me)) {
    const best = maxBy(enemies, (e) => worth(e, average(damageRange(state, me, e, { ranged: true, distance: shotDistance(me, e), moved: 0 }))));
    if (best) return { type: 'shoot', target: best.id };
  }
  let bestStrike: { action: Action; score: number } | null = null;
  for (const e of enemies) {
    for (const [from, moved] of strikeFrom(state, e)) {
      if (leavesWalls(state, me, from)) continue;
      const score = struckBy(state, me, e, from).reduce((n, x) => n + tradeOn(state, me, x, moved), 0) - moved * 0.01;
      if (!bestStrike || score > bestStrike.score) bestStrike = { action: { type: 'attack', target: e.id, from }, score };
    }
  }
  if (bestStrike) return bestStrike.action;
  // A garrison on foot holds its walls and lets the enemy come.
  if (state.siege && me.side === 1 && !creature(me.creature).flies) return { type: 'defend' };
  const stone = atTheStone(state, me);
  if (stone) return stone;
  // Shooters with no shots left, or nothing in reach: close in.
  const reach = [...moves(state).keys()].filter((h) => h !== me.hex);
  const nearest = stepsToFoe(state, me, enemies);
  const go = minBy(reach, nearest);
  if (go !== null && nearest(go) < nearest(me.hex)) return { type: 'move', to: go };
  return { type: 'defend' };
}

/** A garrison on foot fights from behind its walls: it doesn't open its gate to march out at a foe still outside them. */
const leavesWalls = (state: BattleState, me: Stack, from: Hex): boolean => !!state.siege && me.side === 1 && !creature(me.creature).flies && !insideWalls(from);

/** What a side with no war machine must break by hand: the gate while it shuts a walker out, then any tower still holding a company. */
function stoneInTheWay(state: BattleState, me: Stack): SiegePart | null {
  const siege = state.siege;
  if (!siege || me.side !== 0 || state.stacks.some((s) => s.side === 0 && creature(s.creature).machine)) return null;
  const onFoot = foesOf(state, me).filter((s) => s.tower === undefined);
  if (!onFoot.length) return minBy(TOWERS.filter((t, i) => standing(siege, t) && state.stacks.some((s) => s.tower === i && alive(s))), (t) => distance(me.hex, PART_HEX[t]));
  const shutOut = !creature(me.creature).flies && standing(siege, 'gate') && !stepsFrom(onFoot.flatMap(occupiedHexes), new Set(wallsAgainst(siege, 0))).has(me.hex);
  return shutOut ? 'gate' : null;
}

/** With no war machine, a company breaks what stands in the way by hand, walking up to it first. */
function atTheStone(state: BattleState, me: Stack): Action | null {
  const part = stoneInTheWay(state, me);
  if (!part) return null;
  const strike = minBy(handOptions(state, part), (o) => o.steps);
  if (strike) return { type: 'bash', part, from: strike.from };
  const nearer = (h: Hex): number => distance(h, PART_HEX[part]);
  const go = minBy([...moves(state).keys()], nearer);
  return go !== null && nearer(go) < nearer(me.hex) ? { type: 'move', to: go } : null;
}

/** The foes a stack can aim at (all of them but a war machine). */
const foesOf = (state: BattleState, me: Stack): Stack[] => state.stacks.filter((s) => s.side !== me.side && alive(s) && targetable(s));

/**
 * How far a head hex is from the nearest foe (two-hex foes count both). On
 * open ground and for flyers, the straight distance; a walker at a siege
 * counts its steps round the walls, and while they are closed waits for a
 * breach on the near bank, out of the moat.
 */
function stepsToFoe(state: BattleState, me: Stack, enemies: readonly Stack[]): (h: Hex) => number {
  const hexes = enemies.flatMap(occupiedHexes);
  const straight = (h: Hex): number => Math.min(...hexes.map((e) => distance(h, e)));
  if (!state.siege || creature(me.creature).flies) return straight;
  const steps = stepsFrom(hexes, new Set(wallsAgainst(state.siege, me.side)));
  if (steps.has(me.hex)) return (h) => steps.get(h) ?? Infinity;
  const moat = moatFor(state.siege, me.side);
  return (h) => (moat.has(h) ? Infinity : straight(h));
}

/** Steps to every hex from the nearest of `from`, round `closed`. */
function stepsFrom(from: readonly Hex[], closed: ReadonlySet<Hex>): Map<Hex, number> {
  const out = new Map<Hex, number>(from.map((h) => [h, 0]));
  let ring = [...from];
  for (let step = 1; ring.length && step < HEX_COUNT; step++) {
    const next = ring.flatMap(neighbours).filter((h) => !out.has(h) && !closed.has(h));
    for (const h of next) out.set(h, step);
    ring = next;
  }
  return out;
}

/** A war machine's turn: it hurls at the walls while any stand, then has nothing to do. */
export function machineAction(state: BattleState, me: Stack): Action {
  return creature(me.creature).machine === 'catapult' && state.siege && aimFor(state.siege).length ? { type: 'catapult' } : { type: 'defend' };
}

function maxBy<T>(xs: readonly T[], f: (x: T) => number): T | null {
  let best: T | null = null;
  let bv = -Infinity;
  for (const x of xs) {
    const v = f(x);
    if (v > bv) {
      bv = v;
      best = x;
    }
  }
  return best;
}

function minBy<T>(xs: readonly T[], f: (x: T) => number): T | null {
  return maxBy(xs, (x) => -f(x));
}
