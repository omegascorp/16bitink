import type { MapDef } from '../level/types';
import { heroInGarrison, planPath, type Adventure } from './adventure';
import type { PathStep } from './path';
import type { Town } from './town';

/** The ride from the picked hero to `town`'s gate, or why there is none (the town screen's "Ride here"). */
export type RideHere = { readonly path: PathStep[] } | { readonly why: string };

export function rideHere(adv: Adventure, def: MapDef, town: Town): RideHere {
  if (heroInGarrison(adv)) return { why: `${adv.hero.name} is in a garrison: lead the army out first` };
  const path = planPath(adv, def, town.x, town.y);
  if (path) return { path };
  // Guards on the road stop a planned path: say so when the way would be open without them.
  const open = planPath({ ...adv, objects: adv.objects.filter((o) => o.kind !== 'monster') }, def, town.x, town.y);
  return { why: open ? `A guard stands on the way: ${adv.hero.name} must clear it to ride to ${town.name}` : `No way for ${adv.hero.name} to ride to ${town.name}` };
}
