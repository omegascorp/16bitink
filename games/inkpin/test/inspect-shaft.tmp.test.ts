import { it } from 'vitest';
import { DEEP_SHAFT } from '../src/level/ch3/deepShaft';
import { LAVA, STEPS_PER_SECOND } from '../src/logic/particles';
import { play } from './solver';

it('checks a smaller vat', () => {
  for (const count of [82, 85, 88, 92, 95]) {
    const level = { ...DEEP_SHAFT, fills: DEEP_SHAFT.fills.map(f => f.kind === LAVA ? { ...f, count } : f) };
    for (const order of [level.solution, ['B', 'G', 'S', 'X', '@440~0.5', 'K', 'L', '@720~0.5', '@1010']]) {
      const r = play(level, order);
      console.log(count, order[5], r.status, +(r.steps / STEPS_PER_SECOND).toFixed(1), r.treasure);
    }
  }
}, 180000);

it('audits the smaller vat', async () => {
  const { audit } = await import('./audit');
  for (const count of [82, 88]) {
    const level = { ...DEEP_SHAFT, fills: DEEP_SHAFT.fills.map(f => f.kind === LAVA ? { ...f, count } : f) };
    const a = audit(level);
    console.log(count, { wins: a.winShare, lessons: a.lessons, top: a.topLessonShare, stuck: a.stuckShare, blocked: a.blockedShare, obvious: a.obvious });
  }
}, 3600000);
