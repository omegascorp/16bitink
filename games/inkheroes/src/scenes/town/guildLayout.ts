/** The guild room's parts, UI pixels. The room is painted at 768 x 340 and shown 1:1, never scaled, so a smaller window shows less of it. */
export const ROOM = { w: 768, h: 340 } as const;
const PAD = 8;
const GAP = 6;
const HEAD = 28;
const TILE_W = 90;
/** A shop's tile: its name and price take a line each. */
const WARE_W = 124;
const NAME_H = 30;
const FLOOR_H = 15;
const DETAIL_H = 52;
const STAND_W = 160;
const STAND_ROW_H = 80;
const STAND_ROW_H_SMALL = 52;
/** A spell's frame round its icon. */
const FRAME = 4;

export type GuildIcon = 64 | 32;

export interface GuildCell {
  readonly x: number;
  readonly y: number;
}

/** Where everything in the room goes, from the window's top-left. */
export interface GuildLayout {
  readonly w: number;
  readonly h: number;
  readonly icon: GuildIcon;
  readonly tile: { readonly w: number; readonly h: number };
  readonly tiles: readonly GuildCell[];
  /** A floor's label over its row, when there's room to name them. */
  readonly floors: readonly (GuildCell & { readonly text: string })[];
  readonly detail: GuildCell & { readonly w: number; readonly h: number };
  /** The book's stand: beside the spells (`side`), or a row under them. */
  readonly stand: GuildCell & { readonly w: number; readonly h: number; readonly side: boolean };
}

const FLOOR_NAMES = ['First floor', 'Second floor'] as const;
/** The first floor teaches three spells, the second the rest. */
const FIRST_FLOOR = 3;

interface Shape {
  readonly side: boolean;
  readonly icon: GuildIcon;
  /** Each floor on its own row under its name; else every spell in one row. */
  readonly floors: boolean;
  readonly tileW?: number;
}

function arrange(room: { w: number; h: number }, count: number, shape: Shape): GuildLayout {
  const { side, icon, floors, tileW = TILE_W } = shape;
  const w = Math.min(ROOM.w, room.w);
  const tile = { w: tileW, h: icon + FRAME + 4 + NAME_H };
  const left = side ? w - STAND_W - GAP - PAD : w - PAD;
  const region = left - PAD;
  const fit = Math.max(1, Math.floor((region + GAP) / (tile.w + GAP)));
  const rows = floors
    ? [count ? Array.from({ length: Math.min(count, FIRST_FLOOR) }, (_, i) => i) : [], Array.from({ length: Math.max(0, count - FIRST_FLOOR) }, (_, i) => i + FIRST_FLOOR)].filter((r) => r.length)
    : Array.from({ length: Math.ceil(count / fit) }, (_, r) => Array.from({ length: Math.min(fit, count - r * fit) }, (_, i) => r * fit + i));
  const tooWide = rows.some((r) => r.length * (tile.w + GAP) - GAP > region);
  const label = floors ? FLOOR_H : 0;
  const standH = icon === 64 ? STAND_ROW_H : STAND_ROW_H_SMALL;
  const needed = HEAD + rows.length * (label + tile.h + GAP) + DETAIL_H + (side ? 0 : GAP + standH) + PAD;
  // With height to spare the window opens up to the whole painted room, the spells standing in the middle of it.
  const spare = Math.max(0, Math.min(ROOM.h, room.h) - needed);
  let y = HEAD + Math.floor(spare / 2);
  const tiles: GuildCell[] = [];
  const names: (GuildCell & { text: string })[] = [];
  rows.forEach((row, r) => {
    if (floors) names.push({ x: PAD, y, text: FLOOR_NAMES[r]! });
    y += label;
    const rowW = row.length * (tile.w + GAP) - GAP;
    const x0 = PAD + Math.floor((region - rowW) / 2);
    row.forEach((_, i) => tiles.push({ x: x0 + i * (tile.w + GAP), y }));
    y += tile.h + GAP;
  });
  y += spare - Math.floor(spare / 2);
  const detail = { x: PAD, y, w: region, h: DETAIL_H };
  y += DETAIL_H + GAP;
  const stand = side
    ? { x: w - STAND_W - PAD, y: HEAD, w: STAND_W, h: y - GAP - HEAD, side }
    : { x: PAD, y, w: w - PAD * 2, h: standH, side };
  const h = (side ? y - GAP : y + standH) + PAD;
  // A row too wide for its region can't be used, whatever the height says.
  return { w, h: tooWide ? Number.POSITIVE_INFINITY : h, icon, tile, tiles, floors: names, detail, stand };
}

/** The roomiest layout of `count` spells that fits `room`: big icons by floor, then all in a row, then small ones. */
export function guildLayout(room: { w: number; h: number }, count: number): GuildLayout {
  const shapes: readonly Shape[] = [
    { side: true, icon: 64, floors: true },
    { side: false, icon: 64, floors: true },
    { side: true, icon: 64, floors: false },
    { side: false, icon: 64, floors: false },
    { side: true, icon: 32, floors: false },
    { side: false, icon: 32, floors: false },
  ];
  return roomiest(room, count, shapes);
}

/** The roomiest layout of a shop's `count` wares that fits `room`, in the same parts as the guild's. */
export function wareLayout(room: { w: number; h: number }, count: number): GuildLayout {
  const shapes: readonly Shape[] = [
    { side: true, icon: 64, floors: false, tileW: WARE_W },
    { side: false, icon: 64, floors: false, tileW: WARE_W },
    { side: true, icon: 32, floors: false, tileW: WARE_W },
    { side: false, icon: 32, floors: false, tileW: WARE_W },
  ];
  // A stand beside wares stacked in a column leaves their words too little room.
  const inRow = (l: GuildLayout): boolean => !l.stand.side || l.tiles.every((t) => t.y === l.tiles[0]!.y);
  return roomiest(room, count, shapes, inRow);
}

function roomiest(room: { w: number; h: number }, count: number, shapes: readonly Shape[], ok: (l: GuildLayout) => boolean = () => true): GuildLayout {
  const options = shapes.map((s) => arrange(room, count, s)).filter(ok);
  return options.find((o) => o.h <= room.h) ?? options[options.length - 1]!;
}
