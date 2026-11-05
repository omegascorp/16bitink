import { COLS, colOf, hexAt, onField, ROWS, rowOf, type Hex } from '../../logic/hex';

/**
 * The pixel battle's fixed geometry, in native pixels of its locked
 * 960 × 540 world (shown at a whole-number zoom): the one place battle
 * measurements live. No Phaser here, so the layout can be tested on its own.
 */
export const WORLD = { w: 960, h: 540 } as const;

/**
 * Every battle measurement derives from the constants in this block, so a
 * different hex shape or field placement is a change here alone. The
 * proportions are Heroes 3's: a pointy-top hex HEX_W wide and HEX_H tall,
 * rows HEX_PITCH apart (rows tile exactly when the side corners sit at
 * ±(pitch − h/2)).
 */
const HEX_W = 44;
const HEX_H = 52;
const HEX_PITCH = 42;
/** The field's top edge (row 0's top corner); the field is centred across the world (15 × 11 hexes: 682 × 472, x 139–821, y 62–534). */
const FIELD_TOP = 62;
/** Where a unit's feet go relative to its hex centre. */
export const FEET_OFFSET = { x: 0, y: 6 } as const;
/** Where each side's hero stands (feet), in the side margins beside the field, native pixels. */
const HERO_LEFT = { x: 70, y: 300 } as const;
const HERO_RIGHT = { x: 890, y: 300 } as const;

/** The hex's measurements: width, height, half width, corner-to-centre height (tip), side-corner height (side), row pitch. */
export const HEX_PX = { w: HEX_W, h: HEX_H, half: HEX_W / 2, tip: HEX_H / 2, side: HEX_PITCH - HEX_H / 2, pitch: HEX_PITCH } as const;

/** Its corners round the centre, clockwise from the top. */
export const HEX_CORNERS: readonly (readonly [number, number])[] = [
  [0, -HEX_PX.tip], [HEX_PX.half, -HEX_PX.side], [HEX_PX.half, HEX_PX.side],
  [0, HEX_PX.tip], [-HEX_PX.half, HEX_PX.side], [-HEX_PX.half, -HEX_PX.side],
];

/** The field's width (13 columns plus the odd rows' half-hex shift) and height (9 rows). */
export const FIELD_SIZE = { w: COLS * HEX_W + HEX_PX.half, h: (ROWS - 1) * HEX_PITCH + HEX_H } as const;

/** The centre of column 0 in an unshifted row, and of row 0. */
export const FIELD_ORIGIN = { x: Math.floor((WORLD.w - FIELD_SIZE.w) / 2) + HEX_PX.half, y: FIELD_TOP + HEX_PX.tip } as const;

/** The field's edges: the top band above it is backdrop; the side margins hold the heroes. */
export const FIELD_RECT = { x: FIELD_ORIGIN.x - HEX_PX.half, y: FIELD_TOP, w: FIELD_SIZE.w, h: FIELD_SIZE.h } as const;

/** Where each side's hero stands. */
export const HERO_FEET: readonly [{ x: number; y: number }, { x: number; y: number }] = [HERO_LEFT, HERO_RIGHT];

/** A hex's centre in native pixels: where a unit's feet go. Odd rows sit half a hex to the right, as in hex.ts. */
export function hexPx(h: Hex): { x: number; y: number } {
  const r = rowOf(h);
  return { x: FIELD_ORIGIN.x + colOf(h) * HEX_PX.w + (r % 2 === 1 ? HEX_PX.half : 0), y: FIELD_ORIGIN.y + r * HEX_PX.pitch };
}

/** Where a unit (or an obstacle) standing on `h` has its feet. */
export function feetPx(h: Hex): { x: number; y: number } {
  return feetOn([h]);
}

/**
 * Where a stack standing on `hexes` has its feet: one hex's centre, or (a
 * two-hex stack, head and tail) the midpoint of their centres, rounded to
 * the pixel, plus the feet offset.
 */
export function feetOn(hexes: readonly Hex[]): { x: number; y: number } {
  const ps = hexes.map(hexPx);
  const x = ps.reduce((a, p) => a + p.x, 0) / ps.length;
  const y = ps.reduce((a, p) => a + p.y, 0) / ps.length;
  return { x: Math.round(x) + FEET_OFFSET.x, y: Math.round(y) + FEET_OFFSET.y };
}

/** Where a company stands on each tower (TOWERS' order): on its top, far above its hex. */
export const TOWER_FEET: readonly { readonly x: number; readonly y: number }[] = [{ x: 799, y: 112 }, { x: 689, y: 38 }, { x: 689, y: 434 }];
/** How far round those feet a tap counts as a tap on the tower's company. */
const TOWER_REACH = { x: 22, up: 56, down: 8 } as const;

/** The tower whose company stands under a native point, or null. */
export function towerAtPx(x: number, y: number): number | null {
  const i = TOWER_FEET.findIndex((t) => Math.abs(x - t.x) <= TOWER_REACH.x && y >= t.y - TOWER_REACH.up && y <= t.y + TOWER_REACH.down);
  return i < 0 ? null : i;
}

/** Whether (dx, dy) from a hex's centre lies inside it (its edges included). */
export function inHex(dx: number, dy: number): boolean {
  const ax = Math.abs(dx);
  const ay = Math.abs(dy);
  return ax <= HEX_PX.half && ay <= HEX_PX.tip - (ax * (HEX_PX.tip - HEX_PX.side)) / HEX_PX.half;
}

/** The hex under a native point, or null off the field. */
export function hexAtPx(x: number, y: number): Hex | null {
  const guess = Math.round((y - FIELD_ORIGIN.y) / HEX_PX.pitch);
  let best: Hex | null = null;
  let bestD = Infinity;
  for (let r = guess - 1; r <= guess + 1; r++) {
    const shift = r % 2 === 1 ? HEX_PX.half : 0;
    const c = Math.round((x - FIELD_ORIGIN.x - shift) / HEX_PX.w);
    for (let k = c - 1; k <= c + 1; k++) {
      if (!onField(k, r)) continue;
      const h = hexAt(k, r);
      const p = hexPx(h);
      if (!inHex(x - p.x, y - p.y)) continue;
      // On a shared edge, the nearer centre wins.
      const d = Math.hypot(x - p.x, y - p.y);
      if (d < bestD) {
        bestD = d;
        best = h;
      }
    }
  }
  return best;
}

/** How the 960 × 540 world sits on a canvas `w` × `h` device pixels. */
export interface WorldFit {
  /** Device pixels per native pixel: a whole number whenever the world fits at 1× or more. */
  readonly k: number;
  /** The world's top-left corner on the canvas, device pixels (whole; a whole number of native pixels when k is). */
  readonly x: number;
  readonly y: number;
  /** Native pixels of canvas beyond each edge of the world, which the extended background must cover. */
  readonly margin: { readonly left: number; readonly right: number; readonly top: number; readonly bottom: number };
}

/**
 * The largest whole zoom that fits (or, only when even 1× doesn't, the
 * largest fraction), centred across; down the screen centred, or (`bottom`)
 * standing on the canvas's bottom edge so the spare height goes to the sky
 * above. At a whole zoom the offset is snapped to whole native pixels, so
 * the world camera scrolls by whole pixels as it fills the canvas round the
 * world.
 */
export function fitWorld(w: number, h: number, alignY: 'center' | 'bottom' = 'center'): WorldFit {
  const fit = Math.min(w / WORLD.w, h / WORLD.h);
  const k = fit >= 1 ? Math.floor(fit) : fit;
  const snap = (v: number): number => (fit >= 1 ? Math.floor(v / k) * k : Math.floor(v));
  const x = snap((w - WORLD.w * k) / 2);
  const y = snap(alignY === 'bottom' ? h - WORLD.h * k : (h - WORLD.h * k) / 2);
  return {
    k, x, y,
    margin: {
      left: Math.ceil(x / k), right: Math.max(0, Math.ceil((w - x) / k) - WORLD.w),
      top: Math.ceil(y / k), bottom: Math.max(0, Math.ceil((h - y) / k) - WORLD.h),
    },
  };
}
