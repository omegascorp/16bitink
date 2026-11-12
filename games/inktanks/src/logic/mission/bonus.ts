import type { MatchReport } from '../match/report';
import type { BonusId } from './types';

export interface BonusDef {
  readonly text: string;
  readonly test: (r: MatchReport) => boolean;
}

/** The bonus objective pool (design doc "Missions"). Bonuses count only on a passed mission. */
export const BONUSES: Readonly<Record<BonusId, BonusDef>> = {
  kills3: { text: 'Destroy 3 tanks', test: (r) => r.kills >= 3 },
  kills5: { text: 'Destroy 5 tanks', test: (r) => r.kills >= 5 },
  noKit: { text: 'Pass without a repair kit', test: (r) => !r.usedKit },
  noStorm: { text: 'Take no storm damage', test: (r) => r.stormDamage < 1 },
  lightOnly: { text: 'Finish with Light hulls only', test: (r) => r.hullsUsed.every((h) => h === 'light') },
  intel6: { text: 'Collect 6 intel', test: (r) => r.intelCount >= 6 },
  intel10: { text: 'Collect 10 intel', test: (r) => r.intelCount >= 10 },
  heavyWithRockets: { text: 'Destroy a Heavy with Rockets', test: (r) => r.victims.some((v) => v.hull === 'heavy' && v.by === 'rockets') },
  win: { text: 'Be the last tank standing', test: (r) => r.won },
  fast: { text: 'Pass in under 4 minutes', test: (r) => r.time < 240 },
  swap2: { text: 'Swap in 2 parts', test: (r) => r.picks.length >= 2 },
  truck75: { text: 'Bring the truck in above 75% HP', test: (r) => (r.truckHpShare ?? 0) >= 0.75 },
  top1Alive: { text: 'Finish alive', test: (r) => r.playerAlive },
};
