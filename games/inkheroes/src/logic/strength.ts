import type { Army } from './army';
import { strengthOf } from './creatures';

/** A rough fighting strength of an army. */
export const armyStrength = (army: Army): number => army.reduce((n, s) => n + (s ? strengthOf(s.creature, s.count) : 0), 0);
