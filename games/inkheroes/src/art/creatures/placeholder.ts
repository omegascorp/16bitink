import { makeDraw, edge, oval, pt, shade, skin } from '../kit';
import type { CreatureDrawer } from './types';

/** A stand-in until a creature's real drawing lands: a washed body and head of the right size. */
export function placeholder(color: string, height: number): CreatureDrawer {
  return (ctx, seed, f) => {
    const d = makeDraw(ctx, seed + f, f, 0);
    const body = oval(0, -height * 0.4, height * 0.22, height * 0.38);
    const head = oval(height * 0.06, -height * 0.86, height * 0.14, height * 0.14);
    d.pen.fill(oval(0, 1, height * 0.3, 4), '#232a4f', 0.14);
    for (const s of [body, head]) {
      skin(d, s, color, 0.55);
      shade(d, s, 0.4);
      edge(d, s, 1.6);
    }
    d.pen.dot(height * 0.12, -height * 0.88, 1.6);
    void pt;
  };
}
