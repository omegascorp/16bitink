import type { Resource } from '../../logic/resources';

/**
 * The contract for map site drawings. A drawer paints in units where one map
 * tile is 48 across, origin at the bottom centre of the site's tile (for the
 * town, its gate tile: the town spans the three tiles across and the row
 * behind). Up is −y. Sites stand on painted ground, so they bring their own
 * contact shadow but no ground patch bigger than their footprint.
 */
export type SiteArt =
  | 'town'
  | `mine-${Resource}`
  | `pile-${Resource}`
  | 'chest' | 'campfire' | 'mercCamp' | 'watchtower' | 'standingStone' | 'shrine' | 'windmill' | 'stables';

export const SITE_TILE = 48;
/** The baked frame for each site, units: width, height, and where the origin sits from the top-left. */
export const SITE_FRAME: Readonly<Record<'town' | 'mine' | 'small', { w: number; h: number; ox: number; oy: number }>> = {
  town: { w: 168, h: 156, ox: 84, oy: 140 },
  mine: { w: 80, h: 84, ox: 40, oy: 72 },
  small: { w: 64, h: 72, ox: 32, oy: 60 },
};
export const SITE_RES = 2;

export const frameFor = (art: SiteArt): (typeof SITE_FRAME)[keyof typeof SITE_FRAME] =>
  art === 'town' ? SITE_FRAME.town : art.startsWith('mine-') || art === 'windmill' || art === 'watchtower' || art === 'mercCamp' || art === 'stables' ? SITE_FRAME.mine : SITE_FRAME.small;

/** `f` 0..2 is the line-boil frame (pen reseeded, shapes unchanged). */
export type SiteDrawer = (ctx: CanvasRenderingContext2D, seed: number, f: number) => void;
