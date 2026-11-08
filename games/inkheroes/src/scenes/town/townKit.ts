import { TOWN_ART, TOWN_PAVING, type TownSprite } from '../../art/pixel/town';
import { KEMET_ART, KEMET_CHIMNEYS, KEMET_FLAGS, KEMET_PAVING, type KemetArt } from '../../art/pixel/townKemet';
import type { TownFaction } from '../../logic/creatures';
import type { FlagSpot } from './townFlags';

/**
 * A people's city: the pieces it is drawn from. Egypt's set has the Greek
 * city's keys (a Levy Camp is the 'guardhouse', the House of Life the
 * 'guild-1'), so the layout, walls and flags code is shared; it adds the
 * Temple of Osiris and palms. A piece Egypt has not drawn stands in as the
 * Greek one.
 */
export type PieceId = KemetArt;

export interface TownKit {
  readonly faction: TownFaction;
  /** Texture key prefix, so the two sets' textures never meet. */
  readonly tex: string;
  readonly art: Readonly<Partial<Record<PieceId, TownSprite>>>;
  readonly paving: string;
  /** Flag cloths on the sprites (only the Greek city's `FLAGS` are in townFlags.ts). */
  readonly flags: Readonly<Partial<Record<PieceId, readonly FlagSpot[]>>> | null;
  /** Chimney flues (smoke), pixels from the sprite's top-left; the Greek city's are in townSmoke.ts. */
  readonly chimneys: Readonly<Partial<Record<PieceId, { readonly x: number; readonly y: number }>>> | null;
  /** The countryside's ground behind the garden. */
  readonly garden: 'grass' | 'sand';
}

const CROWN: TownKit = { faction: 'crown', tex: 'pxt', art: TOWN_ART, paving: TOWN_PAVING, flags: null, chimneys: null, garden: 'grass' };
const KEMET: TownKit = { faction: 'kemet', tex: 'pxk', art: { ...TOWN_ART, ...KEMET_ART }, paving: KEMET_PAVING, flags: KEMET_FLAGS, chimneys: KEMET_CHIMNEYS, garden: 'sand' };

export function townKit(faction: TownFaction = 'crown'): TownKit {
  return faction === 'kemet' ? KEMET : CROWN;
}

/** The sprite for `id` in `kit` (every id a layout asks for is drawn). */
export function spriteOf(kit: TownKit, id: PieceId): TownSprite {
  const s = kit.art[id];
  if (!s) throw new Error(`no town art '${id}' for ${kit.faction}`);
  return s;
}
