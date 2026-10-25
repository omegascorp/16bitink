import { preyPlural } from '../../logic/prey';
import type { World } from '../../logic/world';
import { clock } from '../ui';
import { BOSS_ENTRIES } from '../../logic/chapters/index';

/** Notes under the level's tag on what it asks for: the clock left, the feast so far, the boss's hits to go. */
export function goalNotes(w: World): string[] {
  const out: string[] = [];
  const g = w.level.goal;
  const left = w.timeLeft;
  if (g?.kind === 'rush' && left !== null) out.push(`${clock(Math.ceil(left))} left`);
  if (g?.kind === 'feast') out.push(`${preyPlural(g.food)} ${Math.min(w.feasted, g.count)}/${g.count}`);
  const boss = w.level.boss ? BOSS_ENTRIES[w.level.boss.kind] : undefined;
  if (w.boss && !w.boss.beaten) out.push(`${boss?.text.name ?? 'the boss'}: ${w.boss.hp} to go`);
  // The snake's own meter (breath, warmth), in pips.
  const m = w.snake.meter;
  if (m) {
    const n = Math.round(Math.max(0, Math.min(1, m.value)) * 5);
    out.push(`${m.label} ${'●'.repeat(n)}${'○'.repeat(5 - n)}${m.low ? '!' : ''}`);
  }
  return out;
}
