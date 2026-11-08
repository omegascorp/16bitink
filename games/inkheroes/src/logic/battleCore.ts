import type { BattleState, Side, Stack } from './battleTypes';
import { creature } from './creatures';

/** Small shared helpers over a battle's state. */
export const alive = (s: Stack): boolean => s.count > 0;
/** Turned to stone: it won't answer a strike, and loses its next turn. */
export const isStone = (s: Stack): boolean => s.effects.some((e) => e.kind === 'stone');
/** Whether it can be struck, shot or cast on: a war machine stands out of reach. */
export const targetable = (s: Stack): boolean => !creature(s.creature).machine;
/** Standing where a blow can reach: not up on a tower, and no war machine. */
export const onGround = (s: Stack): boolean => s.tower === undefined && targetable(s);
/** The side the player plays: the defender's only when they hold the walls. */
export const playerSide = (s: BattleState): Side => s.siege?.me ?? 0;
export const stackById = (state: BattleState, id: number): Stack => {
  const s = state.stacks.find((x) => x.id === id);
  if (!s) throw new Error(`no stack ${id}`);
  return s;
};
export const activeStack = (state: BattleState): Stack | null => (state.active === null ? null : stackById(state, state.active));

export function update(s: BattleState, id: number, f: (x: Stack) => Stack): BattleState {
  return { ...s, stacks: s.stacks.map((x) => (x.id === id ? f(x) : x)) };
}

/** The side left standing, or null while both still have units (war machines alone don't hold the field). */
export function winnerOf(s: BattleState): Side | null {
  const holds = (side: Side): boolean => s.stacks.some((x) => x.side === side && alive(x) && !creature(x.creature).machine);
  const left = holds(0);
  const right = holds(1);
  if (left && right) return null;
  return left ? 0 : 1;
}
