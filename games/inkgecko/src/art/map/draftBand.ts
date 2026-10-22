import { createRng } from '../../logic/rng';
import { MAP, type MapRegion } from '../../scenes/map/layout';
import { pt } from '../kit';
import type { Pt } from '../pen';
import { type Feature, type Geo, seedOf } from './common';
import { boulder, bush, cluster, crown, flower, glasshouse, grid, lantern, roof, rounds, rows, ruinWall, type Sketch, star, tufts, wigwam } from './draftKit';

/**
 * A chapter not built yet, drawn as a page still being pencilled: a few
 * of the place's key features sketched out either side of the groove, some
 * finished, some only begun. Which features depends on the chapter's name.
 */
interface Kit {
  /** One or two big landmarks, then middling things, then small ones. */
  readonly big: readonly Sketch[];
  readonly mid: readonly Sketch[];
  readonly small: readonly Sketch[];
}

const KITS: Readonly<Record<string, Kit>> = {
  greenhouse: { big: [glasshouse, grid(rows, 1, 3, 70, 34)], mid: [grid(rounds('pot'), 4, 2, 24, 9), rounds('lid'), cluster(bush, 3, 14)], small: [rounds('pot'), bush] },
  orchard: { big: [grid(crown, 3, 2, 120, 50), grid(crown, 2, 2, 120, 50)], mid: [crown, cluster(rounds('pot'), 5, 5)], small: [cluster(rounds('pot'), 4, 5), tufts] },
  rockery: { big: [cluster(boulder, 4, 34)], mid: [boulder, cluster(bush, 3, 14)], small: [boulder, bush] },
  allotment: { big: [grid(rows, 2, 3, 80, 36), roof], mid: [rows, wigwam, cluster(bush, 4, 10)], small: [wigwam, rounds('lid')] },
  meadow: { big: [cluster(flower(8), 6, 12)], mid: [tufts, cluster(flower(5), 4, 9), rounds('lid')], small: [flower(8), tufts] },
  barn: { big: [roof], mid: [cluster(rounds('spiral'), 3, 20), rounds('spokes')], small: [rounds('spiral'), tufts] },
  ruins: { big: [ruinWall, cluster(boulder, 3, 26)], mid: [rounds('spokes'), ruinWall], small: [boulder, rounds('pot')] },
  night: { big: [cluster(flower(5), 5, 13), crown], mid: [lantern, cluster(star, 4, 6)], small: [lantern, flower(5)] },
  other: { big: [crown], mid: [bush, tufts], small: [tufts, bush] },
};

function kitFor(name: string): Kit {
  const n = name.toLowerCase();
  const key = Object.keys(KITS).find((k) => n.includes(k));
  if (key) return KITS[key]!;
  if (n.includes('glass')) return KITS.greenhouse!;
  if (n.includes('rock')) return KITS.rockery!;
  return KITS.other!;
}

interface Spot {
  readonly c: Pt;
  readonly r: number;
}

/** The sketches for a draft chapter's band, placed clear of the groove, the sign and each other. */
export function draftPlan(geo: Geo, region: MapRegion): Feature[] {
  const salt = 9000 + region.index * 101;
  const rng = createRng(seedOf(salt, 1));
  const kit = kitFor(region.chapter.name);
  const placed: Spot[] = [{ c: region.sign, r: 190 }, { c: region.gate, r: 120 }];
  const out: Feature[] = [];
  const place = (items: readonly Sketch[], n: number, size: number, busy: number): void => {
    for (let i = 0, tries = 0; i < n && tries < 80; tries++) {
      const s = size * (0.8 + rng() * 0.4);
      const c = pt(s * 1.3 + rng() * (MAP.width - s * 2.6), region.top + s + 20 + rng() * (region.bottom - region.top - s * 2 - 40));
      if (geo.busy(c.x, c.y) < busy || geo.dist(c.x, c.y, 400) < s + 60) continue;
      if (placed.some((p) => Math.hypot(p.c.x - c.x, p.c.y - c.y) < (p.r + s) * 0.9)) continue;
      placed.push({ c, r: s });
      const item = items[i % items.length]!;
      const done = rng() < 0.45 ? 1 : 0.55 + rng() * 0.45;
      const seed = seedOf(salt, 10, out.length);
      out.push({ y: c.y, r: s * 1.6 + 40, seed, draw: (d) => item(d, c, s, createRng(seed), done) });
      i++;
    }
  };
  place(kit.big, 3, 110, 0.65);
  place(kit.mid, 8, 58, 0.45);
  place(kit.small, 16, 24, 0.3);
  return out;
}
