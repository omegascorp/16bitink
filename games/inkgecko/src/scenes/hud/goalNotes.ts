import type { Board } from '../../logic/board';
import { BOSS_NAMES } from '../../logic/boss';
import { clock } from '../ui';

/** Notes under the level's tag on what the bar asks for: the clock left, the gold to find, the boss's hits, the wind. */
export function goalNotes(b: Board): string[] {
  const out: string[] = [];
  const mode = b.level.mode;
  const left = b.timeLeft;
  if (mode?.kind === 'holdout' && left !== null && !b.filled) out.push(`hold out ${clock(Math.ceil(left))}`);
  if (mode?.kind === 'blitz' && left !== null && !b.filled) out.push(`${clock(Math.ceil(left))} left`);
  if (mode?.kind === 'gold') out.push(`gold ${Math.min(b.goldPopped, mode.count)}/${mode.count}`);
  if (b.boss && !b.boss.beaten) out.push(`${BOSS_NAMES[b.boss.kind]}: ${b.boss.hp} to go`);
  // No arrow: on a phone held upright the board is turned, and the streaks show which way it blows.
  if (b.level.wind && b.twists.gust > 0.3) out.push('gusting');
  return out;
}
