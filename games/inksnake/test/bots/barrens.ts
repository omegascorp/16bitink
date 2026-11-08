import { Fox } from '../../src/logic/chapters/barrensFox';
import { Chaser } from '../../src/logic/enemies/chaser';
import { dist } from '../../src/logic/vec';
import type { BotHook } from './types';

/** The hognose plays dead when something hunts it by sight, and when the fox is about to leap; it strikes a sniffing fox. */
export const bot: BotHook = (w) => {
  const s = w.snake;
  const ab = w.ability;
  if (ab?.id !== 'playdead') return null;
  const threat = w.enemies.some((e) => e instanceof Chaser && e.mode === 'chase' && dist(e, s.head) < 150)
    || (w.boss instanceof Fox && (w.boss.mode === 'crouch' || w.boss.mode === 'leap'));
  if (threat && (ab.active || ab.charge >= 1)) return { toward: null, face: null, strike: false, ability: true };
  if (w.boss instanceof Fox && w.boss.mode === 'sniff') {
    const f = w.boss;
    const ahead = Math.cos(Math.atan2(f.y - s.head.y, f.x - s.head.x) - s.heading) > 0.8;
    return { toward: { x: f.x, y: f.y }, face: null, strike: dist(f, s.head) < 70 && ahead };
  }
  return null;
};
