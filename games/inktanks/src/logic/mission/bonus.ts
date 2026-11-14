import type { BonusDef } from '../level/types';
import type { MatchReport } from '../match/report';

const fmt = (s: number): string => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, '0')}`;

/** A bonus objective's line, for the briefing, HUD and results. */
export function bonusText(b: BonusDef): string {
  switch (b.kind) {
    case 'kills':
      return `Destroy ${b.n} tanks`;
    case 'noKit':
      return 'Pass without a repair kit';
    case 'time':
      return `Pass in under ${fmt(b.under)}`;
    case 'noAlarm':
      return 'Never set off the alarm';
    case 'truckHp':
      return `Keep the truck above ${Math.round(b.min * 100)}% HP`;
    case 'heavyWithRockets':
      return 'Destroy a Heavy with Rockets';
    case 'swaps':
      return `Swap in ${b.n} parts`;
    case 'intel':
      return `Collect ${b.n} blueprints`;
  }
}

/** Whether a finished level met the bonus. Bonuses count only on a passed level. */
export function bonusMet(b: BonusDef, r: MatchReport): boolean {
  switch (b.kind) {
    case 'kills':
      return r.kills >= b.n;
    case 'noKit':
      return !r.usedKit;
    case 'time':
      return r.time < b.under;
    case 'noAlarm':
      return !r.alarm;
    case 'truckHp':
      return (r.truckHpShare ?? 0) >= b.min;
    case 'heavyWithRockets':
      return r.victims.some((v) => v.hull === 'heavy' && v.by === 'rockets');
    case 'swaps':
      return r.picks.length >= b.n;
    case 'intel':
      return r.intelCount >= b.n;
  }
}
