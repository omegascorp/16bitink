import type { BattleState } from '../../logic/battleTypes';
import { creature, type CreatureId } from '../../logic/creatures';

/** Which castle a siege is drawn with: each people's own. The Greek one also stands for Egypt's towns, which have no castle of their own yet. */
export type Castle = 'greek' | 'norse';

/**
 * The castle of the town under siege, from the people who hold it: the defender's companies, the side behind the walls.
 * A Norse garrison, or more Norse companies than any other people's, gets the ring fort; everything else the Greek castle.
 */
export function castleOf(state: Pick<BattleState, 'stacks'>): Castle {
  const held = state.stacks.filter((s) => s.side === 1).map((s) => creature(s.creature as CreatureId).faction);
  const norse = held.filter((f) => f === 'norse').length;
  return norse > 0 && norse >= held.filter((f) => f === 'crown' || f === 'kemet').length ? 'norse' : 'greek';
}
