import { it } from 'vitest';
import { CELLAR } from '../src/level/cellar';
import { World } from '../src/logic/world';
import { COIN, STONE, LAVA, WATER } from '../src/logic/particles';
import type { LevelDef } from '../src/logic/level';

for (const [W0, L0] of [[300, 180], [250, 150], [230, 135]] as const) {
const level: LevelDef = { ...CELLAR, fills: CELLAR.fills.map((f) => f.kind === WATER ? { ...f, count: W0 } : f.kind === LAVA ? { ...f, count: L0 } : f) };

it(`sweep ${W0} ${L0}`, () => {
  const out: string[] = [];
  for (const order of [['W', 'L', 'C', 'gate'], ['L', 'W', 'C', 'gate']]) for (const gap of [200, 300, 450, 700]) {
    const w = new World(level);
    for (const id of order) { w.pull(id); for (let s = 0; s < gap; s++) w.step(); }
    for (let s = 0; s < 600; s++) w.step();
    let maxX = 0;
    for (const x of [650, 60, 650, 60, 650]) {
      w.command({ kind: 'goto', x });
      for (let s = 0; s < 900 && !w.finished; s++) { w.step(); maxX = Math.max(maxX, w.nib.x); if (w.nibOrder.kind === 'stay') break; }
    }
    const g = w.grains; let shelfStone = 0, shelfCoin = 0, deep = 0, other = 0, top = 1300;
    for (let i = 0; i < g.count; i++) {
      const k = g.kind[i], x = g.x[i]!, y = g.y[i]!;
      if (k === STONE || k === LAVA) { if (x > 594 && y < 1140) shelfStone++; if (x > 240 && x < 580) top = Math.min(top, y); }
      if (k === COIN) { if (x > 594 && y < 1140) shelfCoin++; else if (y > w.nib.y + 40) deep++; else other++; }
    }
    out.push(`${order.join('')} gap ${gap}: ${w.status.state}${'cause' in w.status ? ' ' + w.status.cause : ''} chest ${w.chestTaken} got ${w.coinsCollected} | shelf stone ${shelfStone} coins ${shelfCoin} | deep ${deep} other ${other} | maxX ${maxX.toFixed(0)} stoneTop ${top.toFixed(0)} nibY ${w.nib.y.toFixed(0)}`);
  }
  console.log(`water ${W0} lava ${L0}\n` + out.join('\n'));
});
}
