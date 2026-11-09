import { act, activeStack, createBattle, type BattleSide, type SiegeSetup } from './battle';
import { chooseAction } from './battleAi';
import type { BattleState } from './battleTypes';

/**
 * A fight the AI plays out on both sides at once; a battle that drags on is
 * held by the defender. Each side's hero casts (battleCasts.ts) unless its
 * `casts` is off (the balance bot's, which plays as a person who doesn't).
 */
export function autoBattle(attacker: BattleSide, defender: BattleSide, seed: number, siege?: SiegeSetup, casts: readonly [boolean, boolean] = [true, true]): BattleState {
  let st = createBattle(attacker, defender, seed, siege).state;
  for (let i = 0; i < 600 && st.winner === null; i++) st = act(st, chooseAction(st, casts[activeStack(st)?.side ?? 0])).state;
  return st.winner === null ? { ...st, winner: 1 } : st;
}
