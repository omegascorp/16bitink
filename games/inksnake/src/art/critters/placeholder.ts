import { edge, eyeDot, oval, pt, shade, skin, type Draw } from '../kit';
import type { SpriteArt } from '../types';

/**
 * A stand-in critter until the real one is painted: an oval body facing
 * +x, a head and an eye, washed `colour`. Wings spread for flying poses.
 */
export function placeholder<P extends string>(frame: number, len: number, wide: number, colour: string, poses: readonly P[], flying: readonly P[] = []): SpriteArt<P> {
  return {
    frame, res: 2, poses,
    draw: (d: Draw, pose: P) => {
      if (flying.includes(pose)) {
        const wing = [pt(-len * 0.1, 0), pt(-len * 0.25, -wide * 2.2), pt(len * 0.15, -wide * 1.9), pt(len * 0.15, wide * 1.9), pt(-len * 0.25, wide * 2.2)];
        skin(d, wing, colour, 0.5);
        edge(d, wing, 1.2);
      }
      const body = oval(0, 0, len / 2, wide / 2, 22);
      skin(d, body, colour, 0.55);
      shade(d, body, 0.4);
      edge(d, body, 1.3);
      const head = oval(len * 0.45, 0, wide * 0.38, wide * 0.34, 16);
      skin(d, head, colour, 0.6);
      edge(d, head, 1.2);
      eyeDot(d, len * 0.5, -wide * 0.18, Math.max(0.8, wide * 0.07));
      eyeDot(d, len * 0.5, wide * 0.18, Math.max(0.8, wide * 0.07));
    },
  };
}
