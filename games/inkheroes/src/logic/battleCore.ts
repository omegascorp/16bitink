import type { BattleState, Side, Stack } from './battleTypes';

/** Small shared helpers over a battle's state. */
export const alive = (s: Stack): boolean => s.count > 0;
export const stackById = (state: BattleState, id: number): Stack => {
  const s = state.stacks.find((x) => x.id === id);
  if (!s) throw new Error(`no stack ${id}`);
  return s;
};
export const activeStack = (state: BattleState): Stack | null => (state.active === null ? null : stackById(state, state.active));

export function update(s: BattleState, id: number, f: (x: Stack) => Stack): BattleState {
  return { ...s, stacks: s.stacks.map((x) => (x.id === id ? f(x) : x)) };
}

/** The side left standing, or null while both still have units. */
export function winnerOf(s: BattleState): Side | null {
  const left = s.stacks.some((x) => x.side === 0 && alive(x));
  const right = s.stacks.some((x) => x.side === 1 && alive(x));
  if (left && right) return null;
  return left ? 0 : 1;
}
