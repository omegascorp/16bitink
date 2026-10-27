import { it } from 'vitest';
import { CELLAR } from '../src/level/cellar';
import { World } from '../src/logic/world';
import { COIN, STONE, LAVA, WATER } from '../src/logic/particles';
import type { LevelDef } from '../src/logic/level';
const level: LevelDef = { ...CELLAR, fills: CELLAR.fills.map((f) => f.kind === WATER ? { ...f, count: 230 } : f.kind === LAVA ? { ...f, count: 135 } : f) };
it('trace', () => {
  const w = new World(level);
  for (const id of ['W', 'L', 'C', 'gate']) { w.pull(id); for (let s = 0; s < 700; s++) w.step(); }
  for (let s = 0; s < 600; s++) w.step();
  w.command({ kind: 'goto', x: 650 });
  const log: string[] = [];
  for (let s = 0; s < 1500 && w.nibOrder.kind !== 'stay'; s++) {
    w.step();
    if (s % 50 === 0) {
      const g = w.grains; const near: string[] = [];
      for (let i = 0; i < g.count; i++) if (g.kind[i] && Math.hypot(g.x[i]! - w.nib.x, g.y[i]! - w.nib.y) < 40) near.push(`${['', 'W', 'L', 'C', 'S'][g.kind[i]!]}${(g.x[i]! - w.nib.x).toFixed(0)},${(g.y[i]! - w.nib.y).toFixed(0)}`);
      log.push(`${s} x ${w.nib.x.toFixed(1)} y ${w.nib.y.toFixed(1)} vx ${w.nib.vx.toFixed(2)} g ${w.nib.grounded} wet ${w.nib.wet} chest ${w.chestTaken} | ${near.join(' ')}`);
    }
  }
  console.log(log.slice(-25).join('\n'), '\nfinal', w.nibOrder, w.status);
});
