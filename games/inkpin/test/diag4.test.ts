import { it } from 'vitest';
import { CELLAR } from '../src/level/cellar';
import { World } from '../src/logic/world';
import { capsuleContact } from '../src/logic/geom';
it('lip', () => {
  const w = new World(CELLAR);
  for (const id of ['W', 'L', 'C', 'gate']) { w.pull(id); for (let s = 0; s < 450; s++) w.step(); }
  for (let s = 0; s < 600; s++) w.step();
  w.command({ kind: 'goto', x: 650 });
  for (let s = 0; s < 1500 && w.nib.x < 588; s++) w.step();
  for (let s = 0; s < 200; s++) w.step();
  const n = w.nib; const k = { nx: 0, ny: 0, depth: 0 };
  console.log('nib', n.x, n.y, n.vx, n.vy, (w as any).segs.length, w.status);
  for (const sg of (w as any).segs) if (capsuleContact(sg, n.x + 1, n.y, n.r, k)) console.log('touch', JSON.stringify(sg), JSON.stringify(k));
  console.log('order', w.nibOrder);
});
