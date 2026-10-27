import { it } from 'vitest';
import { CELLAR } from '../src/level/cellar';
import { World } from '../src/logic/world';
import { COIN, STONE, LAVA, WATER } from '../src/logic/particles';

function map(w: World): string {
  const g = w.grains;
  const rows: string[][] = [];
  for (let y = 900; y < 1240; y += 12) {
    const r: string[] = [];
    for (let x = 20; x < 690; x += 8) r.push(' ');
    rows.push(r);
  }
  for (let i = 0; i < g.count; i++) {
    const k = g.kind[i];
    if (!k) continue;
    const ry = Math.floor((g.y[i]! - 900) / 12), rx = Math.floor((g.x[i]! - 20) / 8);
    const row = rows[ry]; if (!row || rx < 0 || rx >= row.length) continue;
    const ch = k === COIN ? '$' : k === STONE ? '#' : k === LAVA ? '~' : k === WATER ? '.' : '?';
    if (row[rx] === ' ' || ch === '$') row[rx] = ch;
  }
  const n = w.nib; const ny = Math.floor((n.y - 900) / 12), nx = Math.floor((n.x - 20) / 8);
  if (rows[ny]) rows[ny]![nx] = 'N';
  return rows.map((r, i) => String(900 + i * 12).padStart(5) + '|' + r.join('')).join('\n');
}

for (const order of [['W', 'L', 'C', 'gate'], ['L', 'W', 'C', 'gate']]) {
  for (const gap of [150, 250, 400, 700]) {
    it(`${order.join(',')} gap ${gap}`, () => {
      const w = new World(CELLAR);
      for (const id of order) { w.pull(id); for (let s = 0; s < gap; s++) w.step(); }
      for (let s = 0; s < 600; s++) w.step();
      let maxX = 0;
      for (const x of [650, 60, 650, 60, 650]) {
        w.command({ kind: 'goto', x });
        for (let s = 0; s < 900 && !w.finished; s++) { w.step(); maxX = Math.max(maxX, w.nib.x); if (w.nibOrder.kind === 'stay') break; }
      }
      const g = w.grains; const left: string[] = [];
      for (let i = 0; i < g.count; i++) if (g.kind[i] === COIN) left.push(`${g.x[i]!.toFixed(0)},${g.y[i]!.toFixed(0)}`);
      console.log(`${order} gap ${gap}: ${JSON.stringify(w.status)} chest ${w.chestTaken} coins ${w.coinsCollected} left ${left.length} maxX ${maxX.toFixed(0)}\n${left.slice(0, 40).join(' ')}\n${map(w)}`);
    });
  }
}
