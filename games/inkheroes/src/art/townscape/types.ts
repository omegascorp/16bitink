/**
 * The contract for the town screen's painting, after Heroes III's townscape:
 * one wide view of the Crown's hill-town, the ground painted once and every
 * building painted on its own so it can appear the day it is built.
 *
 * Units are townscape px: the view is TOWN_VIEW across, baked at TOWN_RES
 * texture px a unit. The view is seen much closer than the adventure map:
 * a doorway is about 18 units tall and a person about 22, a two-storey
 * house about 70 to its eaves. Buildings use the map's oblique view
 * (sites/build.ts: P(x, z, h), z going back up and to the right) and its
 * light from the upper left.
 *
 * A building is drawn with its origin at its slot's anchor: the bottom
 * centre of its footprint's front edge, standing on the painted ground. It
 * brings its own contact shadow and footprint (a step, a patch of earth) but
 * no wider ground; it must stay inside its frame.
 */
export const TOWN_VIEW = { w: 2000, h: 470 } as const;
/**
 * The town itself, units from the view's left: the hill, its square and
 * every slot. The countryside either side carries the view out to the
 * edges of wide screens (and is panned to on narrow ones).
 */
export const TOWN_CORE = { x: 410, w: 1180 } as const;
export const TOWN_RES = 2;

/** A drawing's frame, units: width, height, and where the origin sits from its top-left. */
export interface Frame {
  readonly w: number;
  readonly h: number;
  readonly ox: number;
  readonly oy: number;
}

export type Slot =
  | 'walls' | 'seraphSpire' | 'monastery'
  | 'griffinTower' | 'guild' | 'barracks' | 'hall' | 'tiltyard'
  | 'tavern' | 'blacksmith' | 'guardhouse' | 'marketplace' | 'archeryRange' | 'stables';

export interface SlotDef {
  /** The anchor in the view, units from its top-left. */
  readonly x: number;
  readonly y: number;
  readonly frame: Frame;
}

const frame = (w: number, h: number, below = 14): Frame => ({ w, h, ox: w / 2, oy: h - below });

/**
 * Where each building stands, back to front (later slots are painted over
 * earlier ones). Back: the walls and keep on the ridge, the seraph spire on
 * its crag to the left, the monastery on the slope to the right. Middle:
 * the griffin tower, barracks, the hall at the head of the square, the mage
 * guild and the tiltyard. Front: tavern, blacksmith, guardhouse, market,
 * archery range and stables along the near edge; the road comes in between
 * the guardhouse and the market.
 */
export const SLOTS: Readonly<Record<Slot, SlotDef>> = {
  walls: { x: 1010, y: 268, frame: frame(560, 262, 22) },
  seraphSpire: { x: 530, y: 252, frame: frame(180, 250, 16) },
  monastery: { x: 1470, y: 262, frame: frame(230, 200, 16) },
  griffinTower: { x: 710, y: 330, frame: frame(150, 310, 16) },
  guild: { x: 1315, y: 338, frame: frame(150, 300, 14) },
  barracks: { x: 865, y: 352, frame: frame(200, 160) },
  hall: { x: 1060, y: 368, frame: frame(250, 220, 16) },
  tiltyard: { x: 1460, y: 372, frame: frame(210, 140) },
  tavern: { x: 505, y: 452, frame: frame(190, 170, 14) },
  blacksmith: { x: 678, y: 458, frame: frame(170, 150, 12) },
  guardhouse: { x: 850, y: 460, frame: frame(160, 150, 10) },
  marketplace: { x: 1190, y: 462, frame: frame(220, 130, 8) },
  archeryRange: { x: 1360, y: 458, frame: frame(180, 130, 12) },
  stables: { x: 1515, y: 460, frame: frame(150, 140, 10) },
};

export const SLOT_ORDER = Object.keys(SLOTS) as Slot[];

/**
 * Every drawing. Upgrades replace each other in one slot: the hall
 * (village → town → city → capitol), the walls (fort → citadel → castle)
 * and the mage guild (one floor, then two).
 */
export type TownPiece =
  | 'hall-village' | 'hall-town' | 'hall-city' | 'hall-capitol'
  | 'walls-fort' | 'walls-citadel' | 'walls-castle'
  | 'guild-1' | 'guild-2'
  | 'tavern' | 'blacksmith' | 'marketplace' | 'guardhouse' | 'archeryRange' | 'griffinTower'
  | 'barracks' | 'monastery' | 'stables' | 'tiltyard' | 'seraphSpire';

export const PIECE_SLOT: Readonly<Record<TownPiece, Slot>> = {
  'hall-village': 'hall', 'hall-town': 'hall', 'hall-city': 'hall', 'hall-capitol': 'hall',
  'walls-fort': 'walls', 'walls-citadel': 'walls', 'walls-castle': 'walls',
  'guild-1': 'guild', 'guild-2': 'guild',
  tavern: 'tavern', blacksmith: 'blacksmith', marketplace: 'marketplace', guardhouse: 'guardhouse', archeryRange: 'archeryRange',
  griffinTower: 'griffinTower', barracks: 'barracks', monastery: 'monastery', stables: 'stables', tiltyard: 'tiltyard', seraphSpire: 'seraphSpire',
};

export const TOWN_PIECES = Object.keys(PIECE_SLOT) as TownPiece[];

/** Paints one building at the origin (its slot's anchor). */
export type TownDrawer = (ctx: CanvasRenderingContext2D, seed: number) => void;

/** Paints the whole view's ground and sky, origin at the view's top-left. */
export type GroundDrawer = (ctx: CanvasRenderingContext2D, seed: number) => void;
