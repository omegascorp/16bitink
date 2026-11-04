import { activeStack, alive, canShoot, moves, strikeFrom } from './battle';
import type { Action, BattleState, Stack } from './battleTypes';
import { creature } from './creatures';
import { damageRange, killsBy } from './damage';
import { distance, type Hex } from './hex';
import { occupiedHexes, shotDistance } from './footprint';

const average = (r: { min: number; max: number }): number => (r.min + r.max) / 2;

/** The HP a strike would really take off (it can't take more than the target has). */
function worth(target: Stack, damage: number): number {
  const c = creature(target.creature);
  const total = (target.count - 1) * c.hp + target.topHp;
  return Math.min(total, damage) * (1 + c.level * 0.15);
}

/**
 * The neutral AI, after VCMI's StupidAI: a shooter shoots the target it hurts
 * most; otherwise hit the reachable enemy that gives the best trade (damage
 * dealt minus damage taken back); otherwise walk towards the nearest enemy.
 */
export function chooseAction(state: BattleState): Action {
  const me = activeStack(state);
  if (!me) throw new Error('no active stack');
  if (creature(me.creature).machine) return machineAction(state, me);
  const enemies = state.stacks.filter((s) => s.side !== me.side && alive(s));
  if (canShoot(state, me)) {
    const best = maxBy(enemies, (e) => worth(e, average(damageRange(state, me, e, { ranged: true, distance: shotDistance(me, e), moved: 0 }))));
    if (best) return { type: 'shoot', target: best.id };
  }
  let bestStrike: { action: Action; score: number } | null = null;
  for (const e of enemies) {
    for (const [from, moved] of strikeFrom(state, e)) {
      const dealt = average(damageRange(state, me, e, { ranged: false, distance: 1, moved }));
      const left = { ...e, count: e.count - killsBy(e, dealt) };
      const back = left.count > 0 && e.retaliationsLeft > 0 && !creature(me.creature).noRetaliation
        ? worth(me, average(damageRange(state, left, me, { ranged: false, distance: 1, moved: 0 })))
        : 0;
      const score = worth(e, dealt) - back * 0.8 - moved * 0.01;
      if (!bestStrike || score > bestStrike.score) bestStrike = { action: { type: 'attack', target: e.id, from }, score };
    }
  }
  if (bestStrike) return bestStrike.action;
  // Shooters with no shots left, or nothing in reach: close in.
  const reach = [...moves(state).keys()].filter((h) => h !== me.hex);
  // Steps from a head hex to the nearest hex of any enemy (two-hex enemies count both).
  const enemyHexes = enemies.flatMap(occupiedHexes);
  const nearest = (h: Hex): number => Math.min(...enemyHexes.map((e) => distance(h, e)));
  const go = minBy(reach, nearest);
  if (go !== null && nearest(go) < nearest(me.hex)) return { type: 'move', to: go };
  return { type: 'defend' };
}

/**
 * A war machine's turn (they act by themselves, on either side): the
 * Ballista shoots the enemy it hurts most; the First Aid Tent heals its
 * side's most wounded top creature; with nothing to do, they stand.
 */
export function machineAction(state: BattleState, me: Stack): Action {
  const c = creature(me.creature);
  if (c.machine === 'shooter' && canShoot(state, me)) {
    const enemies = state.stacks.filter((s) => s.side !== me.side && alive(s));
    const best = maxBy(enemies, (e) => worth(e, average(damageRange(state, me, e, { ranged: true, distance: shotDistance(me, e), moved: 0 }))) * (creature(e.creature).machine ? 0.5 : 1));
    if (best) return { type: 'shoot', target: best.id };
  }
  if (c.machine === 'healer') {
    const hurt = state.stacks.filter((s) => s.side === me.side && alive(s) && !creature(s.creature).machine && s.topHp < creature(s.creature).hp);
    const most = maxBy(hurt, (s) => (creature(s.creature).hp - s.topHp) * (1 + creature(s.creature).level * 0.15));
    if (most) return { type: 'heal', target: most.id };
  }
  return { type: 'defend' };
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
