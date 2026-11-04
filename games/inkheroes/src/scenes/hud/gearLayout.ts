import { BAG_SIZE, SLOTS, type Slot } from '../../logic/items';

/** An icon's size at single scale (they're painted at double), the frame round it, and the space between slots, UI pixels. */
const ICON = 32;
const FRAME = 4;
const GAP = 2;
const BAG_LABEL = 16;
const DETAIL_H = 46;
const SPACE = 12;

type Doll = 'tall' | 'broad';
type Grid = Readonly<Record<Slot, readonly [number, number]>>;

/** The slots round the body. Tall needs the room; broad keeps the armor in the middle on a low screen. */
const DOLLS: Readonly<Record<Doll, { readonly cols: number; readonly rows: number; readonly at: Grid }>> = {
  tall: {
    cols: 3, rows: 5,
    at: { helm: [1, 0], amulet: [2, 0], weapon: [0, 1], cuirass: [1, 1], shield: [2, 1], bracers: [0, 2], belt: [1, 2], ring1: [0, 3], greaves: [1, 3], ring2: [2, 3], boots: [1, 4] },
  },
  broad: {
    cols: 4, rows: 3,
    at: { weapon: [0, 0], helm: [1, 0], amulet: [2, 0], shield: [3, 0], bracers: [0, 1], cuirass: [1, 1], belt: [2, 1], ring1: [3, 1], greaves: [1, 2], boots: [2, 2], ring2: [3, 2] },
  },
};

export interface GearCell {
  readonly x: number;
  readonly y: number;
}

/** Where everything on the gear tab goes, from its top-left. */
export interface GearLayout {
  readonly scale: 1 | 2;
  readonly doll: Doll;
  readonly cell: number;
  readonly w: number;
  readonly h: number;
  readonly slots: readonly (GearCell & { readonly slot: Slot })[];
  readonly bag: readonly GearCell[];
  readonly bagLabel: GearCell;
  /** The picked piece's line and its button. */
  readonly detail: GearCell & { readonly w: number };
}

/** One way of laying the tab out. `under`: the detail sits below the doll and bag; else below the bag alone. */
function arrange(scale: 1 | 2, doll: Doll, bagCols: number, place: 'beside' | 'below', under: boolean): GearLayout {
  const cell = ICON * scale + FRAME;
  const step = cell + GAP;
  const span = (n: number): number => n * step - GAP;
  const d = DOLLS[doll];
  const bagRows = Math.ceil(BAG_SIZE / bagCols);
  const dollW = span(d.cols);
  const dollH = span(d.rows);
  const bagW = span(bagCols);
  const bagH = BAG_LABEL + span(bagRows);
  const beside = place === 'beside';
  const w = beside ? dollW + SPACE + bagW : Math.max(dollW, bagW);
  const dollX = beside ? 0 : Math.floor((w - dollW) / 2);
  const bagX = beside ? dollW + SPACE : Math.floor((w - bagW) / 2);
  const bagY = beside ? 0 : dollH + SPACE;
  const contentH = Math.max(dollH, bagY + bagH);
  const detail = under ? { x: 0, y: contentH + 6, w } : { x: bagX, y: bagY + bagH + 6, w: bagW };
  return {
    scale, doll, cell, w,
    h: Math.max(contentH, detail.y + DETAIL_H),
    slots: SLOTS.map((slot) => ({ slot, x: dollX + d.at[slot][0] * step, y: d.at[slot][1] * step })),
    bag: Array.from({ length: BAG_SIZE }, (_, i) => ({ x: bagX + (i % bagCols) * step, y: bagY + BAG_LABEL + Math.floor(i / bagCols) * step })),
    bagLabel: { x: bagX, y: bagY },
    detail,
  };
}

/** The roomiest layout that fits `room`: double size where it can be, single on the smallest screens. */
export function gearLayout(room: { w: number; h: number }): GearLayout {
  const options = [arrange(2, 'tall', 5, 'beside', false), arrange(2, 'broad', 7, 'beside', true), arrange(2, 'broad', 5, 'below', true)];
  return options.find((l) => l.w <= room.w && l.h <= room.h) ?? arrange(1, 'tall', 5, 'beside', true);
}
