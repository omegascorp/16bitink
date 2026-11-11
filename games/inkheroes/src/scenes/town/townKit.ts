import { TOWN_ART, TOWN_PAVING, type TownSprite } from '../../art/pixel/town';
import { KEMET_ART, KEMET_CHIMNEYS, KEMET_FLAGS, KEMET_PAVING, type KemetArt } from '../../art/pixel/townKemet';
import { NORSE_ART, NORSE_CHIMNEYS, NORSE_FLAGS, NORSE_GROUND, NORSE_PAVING, type NorseArt } from '../../art/pixel/townNorse';
import type { BuildingId } from '../../logic/buildings';
import type { TownFaction } from '../../logic/creatures';
import type { FlagSpot } from './townFlags';

/**
 * A people's city: the pieces it is drawn from. Egypt's set has the Greek
 * city's keys (a Levy Camp is the 'guardhouse', the House of Life the
 * 'guild-1'), so the layout, walls and flags code is shared; it adds the
 * Temple of Osiris and palms. A piece Egypt has not drawn stands in as the
 * Greek one.
 */
export type PieceId = KemetArt | NorseArt;

/** A people the town screen can draw: every town's people (a town's `faction`, src/logic/factions.ts `factionOf`). */
export type TownPeople = TownFaction;

/** A people's own building, which stands on a plot of its own (Egypt's Temple of Osiris, the Norse Mead Hall). */
export interface OwnPiece {
  readonly piece: PieceId;
  /** Its building id. */
  readonly building: BuildingId;
}

export interface TownKit {
  readonly faction: TownPeople;
  /** Texture key prefix, so the two sets' textures never meet. */
  readonly tex: string;
  readonly art: Readonly<Partial<Record<PieceId, TownSprite>>>;
  readonly paving: string;
  /** Flag cloths on the sprites (only the Greek city's `FLAGS` are in townFlags.ts). */
  readonly flags: Readonly<Partial<Record<PieceId, readonly FlagSpot[]>>> | null;
  /** Chimney flues (smoke), pixels from the sprite's top-left; the Greek city's are in townSmoke.ts. */
  readonly chimneys: Readonly<Partial<Record<PieceId, { readonly x: number; readonly y: number }>>> | null;
  /** The countryside's ground behind the garden. */
  readonly garden: 'grass' | 'sand' | 'snow';
  /** The garden's own swatch when the map's ground art has none (snow). */
  readonly groundUrl?: string;
  /** The country behind the city (a scenery atlas in art/pixel/scenery.ts). */
  readonly terrain: 'grass' | 'sand' | 'snow';
  /** The people's own building and its plot (none: the Greeks have none). */
  readonly own: OwnPiece | null;
  /** The trees that grow in the garden in place of the Greek ones (palms, pines): their pieces. */
  readonly trees: readonly PieceId[];
  /** How thickly they grow, against the Greek trees. */
  readonly treeDensity: number;
  /** A canal runs down the middle of the city (Egypt). */
  readonly canal: boolean;
}

const CROWN: TownKit = { faction: 'crown', tex: 'pxt', art: TOWN_ART, paving: TOWN_PAVING, flags: null, chimneys: null, garden: 'grass', terrain: 'grass', own: null, trees: [], treeDensity: 1, canal: false };
const KEMET: TownKit = { faction: 'kemet', tex: 'pxk', art: { ...TOWN_ART, ...KEMET_ART }, paving: KEMET_PAVING, flags: KEMET_FLAGS, chimneys: KEMET_CHIMNEYS, garden: 'sand', terrain: 'sand', own: { piece: 'templeOsiris', building: 'templeOsiris' }, trees: ['palm-a', 'palm-b'], treeDensity: 0.4, canal: true };
const NORSE: TownKit = { faction: 'norse', tex: 'pxn', art: { ...TOWN_ART, ...NORSE_ART }, paving: NORSE_PAVING, flags: NORSE_FLAGS, chimneys: NORSE_CHIMNEYS, garden: 'snow', groundUrl: NORSE_GROUND, terrain: 'snow', own: { piece: 'meadHall', building: 'meadHall' }, trees: ['pine-a', 'pine-b'], treeDensity: 0.7, canal: false };

export function townKit(faction: TownPeople = 'crown'): TownKit {
  return faction === 'kemet' ? KEMET : faction === 'norse' ? NORSE : CROWN;
}

/** The sprite for `id` in `kit` (every id a layout asks for is drawn). */
export function spriteOf(kit: TownKit, id: PieceId): TownSprite {
  const s = kit.art[id];
  if (!s) throw new Error(`no town art '${id}' for ${kit.faction}`);
  return s;
}
