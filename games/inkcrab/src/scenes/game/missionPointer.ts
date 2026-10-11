import { centre } from '../../logic/items';
import { isRecruit, LINE, lineOf } from '../../logic/line';
import type { Beach } from '../../logic/sim';

type Point = { readonly x: number; readonly y: number };

/** The nearest of some points to `from`, across. */
function nearest(points: readonly Point[], from: Point): Point | null {
  let best: Point | null = null;
  for (const p of points) if (!best || Math.abs(p.x - from.x) < Math.abs(best.x - from.x)) best = p;
  return best;
}

/**
 * Where the mission's red arrow points when no hint is showing: a
 * follower left behind, else a small crab still to recruit while the line
 * is short, else the nearest find, marked hunter, or (full grown)
 * the giant. Null when there's nothing left to find.
 */
export function missionTarget(beach: Beach): Point | null {
  const m = beach.mission;
  const at = centre(beach.crab.body);
  const critters = [...beach.critters.values()];
  const chain = beach.chain;
  if (chain?.wait === 'behind') {
    const far = lineOf(critters).slice(0, chain.needed).find((k) => Math.abs(centre(k).x - at.x) > LINE.near * beach.tileSize || Math.abs(centre(k).y - at.y) > LINE.nearRows * beach.tileSize);
    if (far) return centre(far);
  }
  if (chain?.wait === 'recruit') {
    const p = nearest(critters.filter((k) => isRecruit(k) && !k.joined).map(centre), at);
    if (p) return p;
  }
  if (m.finds > beach.finds) {
    const p = nearest([...beach.items.values()].filter((i) => i.kind.type === 'find').map(centre), at);
    if (p) return p;
  }
  const marked = critters.filter((k) => k.marked === 'bounty' || (k.marked === 'giant' && beach.progress.grown));
  return nearest(marked.map(centre), at);
}
