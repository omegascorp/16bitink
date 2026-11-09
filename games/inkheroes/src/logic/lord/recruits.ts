import type { HeroDef } from '../../level/types';
import { lineOf, type CreatureId } from '../creatures';
import type { Army } from '../army';
import { strengthOf } from '../creatures';
import { specialtyOf } from '../roster';

/**
 * Whom a lord hires from what his Tavern offers (the player's pool and
 * price: the roster's two, src/logic/heroes.ts weekOffer), by his needs. A
 * runner takes a Knight with Logistics, or the gold hero; the main army's
 * hero takes a line specialist of the line his strongest companies are.
 */

export type HireJob = 'main' | 'runner';

/** The line most of `army`'s strength is in (null: none). */
export function strongestLine(army: Army): CreatureId | null {
  const by = new Map<CreatureId, number>();
  for (const s of army) if (s) by.set(lineOf(s.creature), (by.get(lineOf(s.creature)) ?? 0) + strengthOf(s.creature, s.count));
  return [...by].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
}

/** How well `h` fits the job (higher is better). */
export function hireScore(h: HeroDef, job: HireJob, line: CreatureId | null): number {
  const spec = specialtyOf(h);
  if (job === 'runner') {
    const runs = h.heroClass === 'knight' && !!h.skills.logistics;
    return (spec?.kind === 'gold' ? 2 : 0) + (runs ? 2 : 0) + (h.heroClass === 'knight' ? 1 : 0);
  }
  if (spec?.kind === 'line') return spec.line === line ? 4 : 2;
  return h.heroClass === 'knight' ? 1 : 0;
}
