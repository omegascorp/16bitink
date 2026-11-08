import type { ZoneDef, ZoneKind } from '../level/types';
import { dist, inPolygon, type Pt } from './vec';

/** Whether `p` lies in `zone`. */
export function inZoneShape(p: Pt, z: ZoneDef): boolean {
  if (z.shape === 'circle') return dist(p, z) <= z.r;
  if (z.shape === 'rect') return p.x >= z.x && p.x <= z.x + z.w && p.y >= z.y && p.y <= z.y + z.h;
  return inPolygon(p, z.points);
}

/**
 * Whether `p` lies in ground of `kind`. Land is an island in the water: a
 * point in a land zone is never in the water, wherever the water zones run.
 */
export function inZone(p: Pt, zones: readonly ZoneDef[], kind: ZoneKind): boolean {
  if (kind === 'water' && zones.some((z) => z.kind === 'land' && inZoneShape(p, z))) return false;
  return zones.some((z) => z.kind === kind && inZoneShape(p, z));
}
