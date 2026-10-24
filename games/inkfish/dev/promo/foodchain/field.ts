import { createRng } from '../../../src/logic/rng';
import { FRAME } from '../descent/frame';
import { drawAnimal } from './cast';
import type { Climb, Pt } from './climb';
import { scaleOf, toScreen, type Camera, type ChainView } from './view';

/**
 * Food fields: while a link is the hero, a cloud of the step below it (the
 * copepods the anchovies sieve, the anchovies the mackerel balls up, the
 * mackerel the tuna slices through) hangs round its path, and each one
 * vanishes the moment a mouth of the hero or its school passes over it.
 * When each is eaten is worked out once, up front, so every frame agrees.
 */

const W = FRAME.width;
const H = FRAME.height;

interface Morsel {
  readonly home: Pt;
  readonly phase: number;
  readonly size: number;
  /** When a mouth gets it (Infinity if never). */
  readonly eaten: number;
}

interface Field {
  readonly link: number;
  readonly from: number;
  readonly to: number;
  /** A bait ball circles its centre; a cloud just drifts. */
  readonly ball: boolean;
  readonly centre: Pt;
  readonly morsels: readonly Morsel[];
}

export interface Fields {
  draw(ctx: CanvasRenderingContext2D, t: number, cam: Camera): void;
}

/** Field sizes per hero link of the climb: how many, and whether they ball up. */
const SPECS: readonly { readonly link: number; readonly count: number; readonly ball: boolean }[] = [
  { link: 2, count: 150, ball: false },
  { link: 3, count: 70, ball: true },
  { link: 4, count: 26, ball: false },
];

const where = (f: Pick<Field, 'ball' | 'centre'>, m: Pick<Morsel, 'home' | 'phase'>, t: number, length: number): Pt => {
  if (!f.ball) return { x: m.home.x + 0.04 * length * Math.sin(t * 0.8 + m.phase), y: m.home.y + 0.03 * length * Math.cos(t * 0.7 + m.phase) };
  // The ball turns about its centre, slower further out.
  const dx = m.home.x - f.centre.x;
  const dy = m.home.y - f.centre.y;
  const a = t * 0.9 / (0.6 + Math.hypot(dx, dy) / length);
  return { x: f.centre.x + dx * Math.cos(a) - dy * Math.sin(a) * 1.6, y: f.centre.y + dx * Math.sin(a) / 1.6 + dy * Math.cos(a) };
};

export function createFields(climb: Climb, view: ChainView): Fields {
  const rng = createRng(919);
  const fields: Field[] = SPECS.map(({ link, count, ball }) => {
    const hero = climb.links[link]!;
    const from = hero.zoomFrom;
    const to = Math.min(hero.eaten, from + 24);
    // Spread along the hero's path from its gulp onwards.
    const start = climb.body(link, hero.gulp);
    const end = climb.body(link, to);
    const centre = { x: (start.x + end.x) / 2, y: (start.y + end.y) / 2 };
    const half = { x: Math.abs(end.x - start.x) / 2 + hero.length * 1.2, y: hero.length * (ball ? 0.55 : 0.9) };
    const proto = { ball, centre };
    const morsels: Morsel[] = Array.from({ length: count }, () => {
      const a = rng() * Math.PI * 2;
      const r = Math.sqrt(rng());
      const home = ball
        ? { x: centre.x + Math.cos(a) * r * hero.length * 0.7, y: centre.y + Math.sin(a) * r * hero.length * 0.45 }
        : { x: centre.x + (rng() * 2 - 1) * half.x, y: centre.y + (rng() * 2 - 1) * half.y };
      const m = { home, phase: rng() * 10, size: 0.7 + rng() * 0.6 };
      // The first time a mouth comes within reach.
      let eaten = Infinity;
      const reach = hero.length * 0.09;
      for (let t = hero.gulp; t < to && eaten === Infinity; t += 0.08) {
        const p = where(proto, m, t, hero.length);
        if (view.mouths(link, t).some((q) => Math.hypot(q.x - p.x, q.y - p.y) < reach)) eaten = t;
      }
      return { ...m, eaten };
    });
    return { link, from, to: to + 2, ball, centre, morsels };
  });

  return {
    draw(ctx, t, cam) {
      const k = scaleOf(cam);
      for (const f of fields) {
        if (t < f.from || t > f.to) continue;
        const hero = climb.links[f.link]!;
        const prey = climb.links[f.link - 1]!;
        const len = prey.length * k;
        if (len < 1.5) continue;
        for (const m of f.morsels) {
          if (t >= m.eaten) continue;
          const p = toScreen(cam, where(f, m, t, hero.length));
          const l = len * m.size;
          if (p.x < -l || p.x > W + l || p.y < -l || p.y > H + l) continue;
          // In a ball they swim round it; in a cloud they face away from the hero.
          const facing: 1 | -1 = f.ball ? (Math.sin(t * 0.9 + m.phase) > 0 ? 1 : -1) : hero.dir;
          drawAnimal(ctx, prey.kind, { x: p.x, y: p.y, length: l, facing, beat: t * 10 + m.phase, effort: 0.5 }, t + m.phase, { kick: 0.5 + 0.5 * Math.sin(t * 6 + m.phase) });
        }
      }
    },
  };
}
