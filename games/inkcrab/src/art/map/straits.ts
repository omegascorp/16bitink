import type { Draw } from '../kit';
import { brig, dolphins, flyingFish, fluke, manta, octopus, orcas, serpent, turtle, whale } from './creatures';
import { letter } from './context';
import { INK } from '../palette';

/** Where the strait creatures swim: the open water between islands, north of the sea route. */
export const STRAIT_LIFE_Y = 320;

/** What swims (or sails) in each strait, west to east, centred on (x, y). */
const LIFE: readonly ((d: Draw, x: number, y: number) => void)[] = [
  (d, x, y) => {
    turtle(d, x - 30, y + 10, 1.6, -0.4);
    flyingFish(d, x - 10, y - 70, 1);
  },
  (d, x, y) => whale(d, x + 60, y + 30, 1.2),
  (d, x, y) => brig(d, x, y + 30, 1.15, 1),
  (d, x, y) => {
    manta(d, x - 16, y - 10, 1.2);
    turtle(d, x + 44, y + 70, 1.1, 2.4);
  },
  (d, x, y) => {
    serpent(d, x + 20, y + 30, 1.3);
    letter(d.pen.ctx, 'here be serpents', x, y + 66, { size: 16, color: INK, alpha: 0.7 });
  },
  (d, x, y) => orcas(d, x, y + 20, 1.3),
  (d, x, y) => {
    dolphins(d, x - 20, y - 10, 1.2);
    brig(d, x + 20, y + 100, 0.7, -1);
  },
  (d, x, y) => fluke(d, x, y + 30, 1.5),
  (d, x, y) => octopus(d, x, y + 10, 1.3),
];

export function straitLife(d: Draw, i: number, x: number, y: number): void {
  LIFE[i % LIFE.length]!(d, x, y);
}
