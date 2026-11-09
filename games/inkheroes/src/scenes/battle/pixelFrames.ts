import { PixelBuffer, type Rgba } from './pixelRaster';
import type { Pixels } from './pixelScenery';
import { FACE } from './pixelFaces';

/**
 * The battle UI's frames, drawn pixel by pixel at any size (nothing is
 * stretched): a dark outline with its corners cut, a metal rim lit from the
 * top left as the art is, and a fill. Buttons, the turn order's portraits,
 * the status plate and the cards all come from here. No Phaser.
 */

/** The outline round everything. */
export const EDGE: Rgba = [20, 13, 8, 255];

/** A rim's three tones: lit (top, left), body, shaded (bottom, right). */
export interface Rim {
  readonly light: Rgba;
  readonly mid: Rgba;
  readonly dark: Rgba;
}

export const RIMS = {
  bronze: { light: [240, 204, 128, 255], mid: [190, 136, 62, 255], dark: [108, 68, 30, 255] },
  gold: { light: [255, 240, 170, 255], mid: [240, 196, 84, 255], dark: [156, 104, 30, 255] },
  player: { light: [160, 186, 240, 255], mid: [72, 98, 184, 255], dark: [30, 42, 98, 255] },
  enemy: { light: [244, 178, 124, 255], mid: [176, 84, 48, 255], dark: [88, 34, 20, 255] },
  dim: { light: [150, 136, 112, 255], mid: [106, 94, 76, 255], dark: [60, 52, 42, 255] },
  green: { light: [176, 226, 140, 255], mid: [84, 156, 76, 255], dark: [34, 84, 44, 255] },
  purple: { light: [214, 170, 240, 255], mid: [136, 80, 184, 255], dark: [66, 34, 104, 255] },
  // The ranks' own (src/scenes/battle/rankLook.ts): a cool grey (the warm 'dim' is for what isn't there), a sky blue apart from our side's royal blue, an orange apart from the enemy's brick red and the gold of what's picked.
  grey: { light: [214, 216, 220, 255], mid: [146, 150, 158, 255], dark: [78, 82, 90, 255] },
  blue: { light: [168, 226, 252, 255], mid: [56, 156, 220, 255], dark: [20, 76, 128, 255] },
  orange: { light: [255, 204, 120, 255], mid: [238, 128, 24, 255], dark: [132, 58, 8, 255] },
} as const satisfies Record<string, Rim>;
export type RimName = keyof typeof RIMS;

/** Fills: dark warm wood-brown for panels and buttons, lighter when lit (hover). */
export const FILLS = {
  panel: [34, 24, 17, 240],
  button: [62, 42, 26, 255],
  hover: [86, 60, 34, 255],
  pressed: [44, 30, 19, 255],
  plate: [20, 13, 8, 176],
  portrait: [26, 30, 44, 255],
} as const satisfies Record<string, Rgba>;

/** A primary button's fills: warm amber, so the card's main action stands out from the wood of the rest. */
export const PRIMARY_FILLS = {
  button: [136, 84, 26, 255],
  hover: [164, 106, 36, 255],
  pressed: [100, 62, 20, 255],
} as const satisfies Record<string, Rgba>;

/** How a card draws button `i` of its `kind`: the first is the main action unless it says otherwise; a 'crown' is one of several equal choices. */
export function cardButtonLook(kind: 'primary' | 'crown' | 'plain' | undefined, i: number): { rim: RimName; primary: boolean } {
  const k = kind ?? (i === 0 ? 'primary' : 'plain');
  return { rim: k === 'plain' ? 'bronze' : 'gold', primary: k === 'primary' };
}

export interface FrameLook {
  readonly rim: RimName;
  /** Rim width in pixels: 1 for small things, 2 for panels. */
  readonly thick?: 1 | 2;
  /** Inside colour; null leaves it clear (a portrait frame drawn over its face). */
  readonly fill: Rgba | null;
  /** A lighter band across the top half of the fill (a raised button). */
  readonly sheen?: boolean;
  /** Gold studs in the corners (cards). */
  readonly studs?: boolean;
}

function lighter(c: Rgba, by: number): Rgba {
  return [Math.min(255, c[0] + by), Math.min(255, c[1] + by), Math.min(255, c[2] + by), c[3]];
}

/**
 * A w × h frame: outline, rim (lit top-left, shaded bottom-right), then the
 * fill. Corners are cut by a pixel so it reads as rounded.
 */
export function drawFrame(w: number, h: number, look: FrameLook): PixelBuffer {
  const b = new PixelBuffer(w, h);
  const rim = RIMS[look.rim];
  const t = look.thick ?? 1;
  const inset = 1 + t;
  if (look.fill) {
    for (let y = inset; y < h - inset; y++) {
      const top = look.sheen && y < inset + Math.floor((h - inset * 2) / 2);
      for (let x = inset; x < w - inset; x++) b.put(x, y, top ? lighter(look.fill, 10) : look.fill);
    }
    // A one-pixel shine under the rim's top edge.
    if (look.sheen) for (let x = inset; x < w - inset; x++) b.put(x, inset, lighter(look.fill, 26));
  }
  for (let i = 0; i < t; i++) {
    const o = 1 + i;
    const x1 = w - 1 - o;
    const y1 = h - 1 - o;
    const tone = (lit: boolean): Rgba => (i === 0 ? (lit ? rim.light : rim.dark) : rim.mid);
    for (let x = o; x <= x1; x++) {
      b.put(x, o, tone(true));
      b.put(x, y1, tone(false));
    }
    for (let y = o; y <= y1; y++) {
      b.put(o, y, tone(true));
      b.put(x1, y, tone(false));
    }
    // The two corners where light meets shade take the body tone.
    b.put(x1, o, rim.mid);
    b.put(o, y1, rim.mid);
  }
  for (let x = 1; x < w - 1; x++) {
    b.put(x, 0, EDGE);
    b.put(x, h - 1, EDGE);
  }
  for (let y = 1; y < h - 1; y++) {
    b.put(0, y, EDGE);
    b.put(w - 1, y, EDGE);
  }
  if (look.studs && w >= 12 && h >= 12) {
    for (const [sx, sy] of [[inset + 1, inset + 1], [w - inset - 3, inset + 1], [inset + 1, h - inset - 3], [w - inset - 3, h - inset - 3]] as const) {
      b.put(sx, sy, RIMS.gold.light);
      b.put(sx + 1, sy, RIMS.gold.mid);
      b.put(sx, sy + 1, RIMS.gold.mid);
      b.put(sx + 1, sy + 1, RIMS.gold.dark);
    }
  }
  return b;
}

/** The rule under a card's title, `w` wide and 5 tall: a bronze line (lit above, shaded below) with a gold diamond in the middle. */
export function drawRule(w: number): PixelBuffer {
  const b = new PixelBuffer(w, 5);
  const r = RIMS.bronze;
  for (let x = 1; x < w - 1; x++) {
    b.put(x, 1, EDGE);
    b.put(x, 2, x === 1 || x === w - 2 ? r.mid : r.light);
    b.put(x, 3, EDGE);
  }
  const c = Math.floor(w / 2);
  const g = RIMS.gold;
  for (const [dx, dy, col] of [[0, 0, EDGE], [-1, 1, EDGE], [1, 1, EDGE], [-2, 2, EDGE], [2, 2, EDGE], [-1, 3, EDGE], [1, 3, EDGE], [0, 4, EDGE], [0, 1, g.light], [-1, 2, g.light], [0, 2, g.mid], [1, 2, g.dark], [0, 3, g.dark]] as const) {
    b.put(c + dx, dy, col);
  }
  return b;
}

export { FACE };
/** A portrait's frame round its face: the turn order's are this size. */
const FRAME = 4;
export const SLOT = FACE + FRAME;
/** The gap between portraits. */
export const SLOT_GAP = 2;
/** How much a unit that has waited is darkened. */
const WAITED_SHADE = 0.55;

function shade(c: Rgba, by: number): Rgba {
  return [Math.round(c[0] * by), Math.round(c[1] * by), Math.round(c[2] * by), c[3]];
}

/** A socket's leather: its well from top (in shadow) to bottom (catching the light), the line under the bevel, and its rivets. */
const WELL = { top: [30, 21, 15], bottom: [62, 45, 30], edge: [14, 9, 6, 255], lip: [84, 62, 40, 255] } as const;
/** How far the grain strays either way, and how far the corners darken. */
const GRAIN = 4;
const VIGNETTE = 0.3;
/** The bevel is this thick on a slot big enough to carry it. */
const BIG_SOCKET = 60;

/** The same small speckle at (x, y) every time. */
const grainAt = (x: number, y: number): number => (((x * 73) ^ (y * 151) ^ (x * y * 19)) % (GRAIN * 2 + 1)) - GRAIN;

/**
 * A slot for a piece of gear or a unit's face, size × size: a well of dark
 * leather sunk into the panel, lit from above, in a bevel of `rim` with a
 * gold rivet at each corner.
 */
export function drawSocket(size: number, rim: RimName): PixelBuffer {
  const b = new PixelBuffer(size, size);
  const r = RIMS[rim];
  const bevel = size >= BIG_SOCKET ? 2 : 1;
  const last = size - 1;
  const inset = 1 + bevel;
  const mid = last / 2;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const out = Math.min(x, y, last - x, last - y);
      if (out === 0) {
        b.put(x, y, WELL.edge);
        continue;
      }
      if (out <= bevel) {
        // Lit from the top left: the bevel's upper half against the diagonal, shaded below it.
        const upper = x + y < last;
        b.put(x, y, upper ? (out === 1 ? r.light : r.mid) : r.dark);
        continue;
      }
      const t = y / last;
      const away = (Math.max(Math.abs(x - mid), Math.abs(y - mid)) / mid) ** 2;
      // The bevel's shadow falls on the top and left of the well; its far edge catches the light.
      const fall = x - inset < 3 || y - inset < 3 ? 0.72 + 0.09 * Math.min(x - inset, y - inset) : 1;
      if (x === last - inset || y === last - inset) {
        b.put(x, y, WELL.lip);
        continue;
      }
      const tone = (i: number): number => Math.round((WELL.top[i]! + (WELL.bottom[i]! - WELL.top[i]!) * t) * fall * (1 - VIGNETTE * away)) + grainAt(x, y);
      b.put(x, y, [Math.max(0, tone(0)), Math.max(0, tone(1)), Math.max(0, tone(2)), 255]);
    }
  }
  const g = RIMS.gold;
  for (const [cx, cy] of [[1, 1], [last - 2, 1], [1, last - 2], [last - 2, last - 2]] as const) {
    b.put(cx, cy, g.light);
    b.put(cx + 1, cy, g.mid);
    b.put(cx, cy + 1, g.mid);
    b.put(cx + 1, cy + 1, g.dark);
  }
  return b;
}

/**
 * One turn-order portrait from a FACE × FACE crop: the side's colour round
 * the face (gold for the unit about to act), the face looking the way its
 * unit does on the field (the right-hand side's mirrored), darker once it
 * has waited.
 */
export function drawPortrait(face: Pixels, rim: RimName, mirrored: boolean, waited: boolean, slot: number = SLOT): PixelBuffer {
  const b = drawSocket(slot, rim);
  // A narrow frame's cut sits in the middle of the well.
  const left = Math.floor((slot - face.w) / 2);
  const top = Math.floor((slot - face.h) / 2);
  for (let y = 0; y < face.h; y++) {
    for (let x = 0; x < face.w; x++) {
      const i = (y * face.w + x) * 4;
      if (face.data[i + 3]! < 128) continue;
      const c: Rgba = [face.data[i]!, face.data[i + 1]!, face.data[i + 2]!, 255];
      b.put(left + (mirrored ? face.w - 1 - x : x), top + y, waited ? shade(c, WAITED_SHADE) : c);
    }
  }
  return b;
}

/** Where a sprite frame's opaque pixels lie: left, top, right, bottom (exclusive), or null if it is empty. */
export function inkBox(sheet: Pixels, x0: number, w: number, h: number): { l: number; t: number; r: number; b: number } | null {
  let l = w;
  let t = h;
  let r = 0;
  let b = 0;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (sheet.data[(y * sheet.w + x0 + x) * 4 + 3]! < 128) continue;
      l = Math.min(l, x);
      t = Math.min(t, y);
      r = Math.max(r, x + 1);
      b = Math.max(b, y + 1);
    }
  }
  return r > l ? { l, t, r, b } : null;
}

/** How a unit stands in a w × h picture: where its frame's top-left goes, so its figure is centred across with its feet `ground` rows up (lower if it is too tall, keeping its head in). */
export function pictureOffset(box: { l: number; t: number; r: number; b: number }, footY: number, w: number, h: number, ground = 8): { x: number; y: number } {
  const feet = Math.max(h - ground, footY - box.t + 3);
  return { x: Math.floor(w / 2 - (box.l + box.r) / 2), y: feet - footY };
}

/** A w × h picture: `scene` (or a plain dark fill) with the sprite frame at x0 of `sheet` (fw × fh) drawn over it at `at`, 1:1 and clipped. */
export function drawPicture(scene: Pixels | null, sheet: Pixels, x0: number, fw: number, fh: number, at: { x: number; y: number }, w: number, h: number): PixelBuffer {
  const b = new PixelBuffer(w, h);
  if (scene) b.data.set(scene.data.subarray(0, w * h * 4));
  else for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) b.put(x, y, FILLS.portrait);
  for (let y = 0; y < fh; y++) {
    for (let x = 0; x < fw; x++) {
      const i = (y * sheet.w + x0 + x) * 4;
      if (sheet.data[i + 3]! < 128) continue;
      b.put(at.x + x, at.y + y, [sheet.data[i]!, sheet.data[i + 1]!, sheet.data[i + 2]!, 255]);
    }
  }
  return b;
}

/** The spellbook's parts: leather, parchment and its shading. */
const LEATHER: Rim = { light: [150, 56, 40, 255], mid: [100, 32, 24, 255], dark: [56, 16, 12, 255] };
const PARCHMENT = { fill: [228, 204, 158, 255], edge: [210, 182, 134, 255], deep: [184, 152, 106, 255], fold: [126, 92, 58, 255], stack: [196, 170, 124, 255], stackDark: [150, 124, 86, 255] } as const satisfies Record<string, Rgba>;
const BAYER2 = [0, 2, 3, 1] as const;

/** The open book's measurements: its leather border, the page-stack under the pages, the spine between them. */
export const BOOK = { cover: 8, stack: 3, spine: 8 } as const;

/** The book's full size for two pages of pageW × pageH. */
export function bookSize(pageW: number, pageH: number): { w: number; h: number } {
  return { w: BOOK.cover * 2 + pageW * 2 + BOOK.spine, h: BOOK.cover * 2 + pageH + BOOK.stack };
}

/** Where each page's top-left is inside the book. */
export function pageOrigin(pageW: number, page: 0 | 1): { x: number; y: number } {
  return { x: BOOK.cover + page * (pageW + BOOK.spine), y: BOOK.cover };
}

/**
 * An open spellbook: a leather cover (lit from the top left, gold caps on its
 * corners), the page edges stacked under each page, and two parchment pages
 * whose edges darken and which shade down into the spine, by ordered dither.
 */
export function drawBook(pageW: number, pageH: number): PixelBuffer {
  const { w, h } = bookSize(pageW, pageH);
  const b = drawFrame(w, h, { rim: 'bronze', fill: LEATHER.mid });
  // The leather's own rim inside the outline.
  for (let x = 2; x < w - 2; x++) {
    b.put(x, 2, LEATHER.light);
    b.put(x, h - 3, LEATHER.dark);
  }
  for (let y = 2; y < h - 2; y++) {
    b.put(2, y, LEATHER.light);
    b.put(w - 3, y, LEATHER.dark);
  }
  // Gold caps: a triangle into each corner, its outer edge lit.
  const caps = [[1, 1, 1, 1], [w - 2, 1, -1, 1], [1, h - 2, 1, -1], [w - 2, h - 2, -1, -1]] as const;
  for (const [cx, cy, sx, sy] of caps) {
    for (let j = 0; j < 7; j++) for (let i = 0; i + j < 7; i++) b.put(cx + sx * i, cy + sy * j, i + j === 6 ? RIMS.gold.dark : i === 0 || j === 0 ? RIMS.gold.light : RIMS.gold.mid);
  }
  for (const page of [0, 1] as const) {
    const o = pageOrigin(pageW, page);
    // The page edges under the page.
    for (let i = 0; i < BOOK.stack; i++) {
      for (let x = o.x + 1 + i; x < o.x + pageW - 1 - i; x++) b.put(x, o.y + pageH + i, i % 2 ? PARCHMENT.stackDark : PARCHMENT.stack);
    }
    for (let y = 0; y < pageH; y++) {
      for (let x = 0; x < pageW; x++) {
        // Distance to the spine (the right edge of the left page, the left edge of the right one) and to the outer edges.
        const toSpine = page === 0 ? pageW - 1 - x : x;
        const toEdge = Math.min(page === 0 ? x : pageW - 1 - x, y, pageH - 1 - y);
        const d = BAYER2[((y & 1) << 1) | (x & 1)]! / 4;
        let c: Rgba = PARCHMENT.fill;
        if (toSpine === 0) c = PARCHMENT.fold;
        else if (toSpine < 4) c = d < 0.75 ? PARCHMENT.deep : PARCHMENT.edge;
        else if (toSpine < 9) c = d < (9 - toSpine) / 6 ? PARCHMENT.edge : PARCHMENT.fill;
        else if (toEdge < 2) c = PARCHMENT.edge;
        else if (toEdge < 4) c = d < 0.5 ? PARCHMENT.edge : PARCHMENT.fill;
        b.put(o.x + x, o.y + y, c);
      }
    }
  }
  return b;
}

/** A ribbon's colours: the spellbook's school tabs and its mana and close markers. */
export const RIBBONS = {
  common: { light: [140, 160, 236, 255], mid: [60, 82, 176, 255], dark: [28, 38, 98, 255] },
  olympian: RIMS.gold,
  // Sacred Rites: the Nile's turquoise.
  rites: { light: [120, 222, 206, 255], mid: [32, 150, 140, 255], dark: [14, 72, 68, 255] },
  red: { light: [232, 104, 80, 255], mid: [168, 42, 32, 255], dark: [92, 20, 14, 255] },
} as const satisfies Record<string, Rim>;

/**
 * A cloth ribbon w × h with a swallowtail notch at its free end: pointing
 * right (a tab on the book's edge) or down (a marker hanging under it).
 * `dim` for an unchosen tab.
 */
export function drawRibbon(w: number, h: number, rim: Rim, toward: 'right' | 'down', dim = false): PixelBuffer {
  const b = new PixelBuffer(w, h);
  const notch = toward === 'right' ? Math.floor(h / 2) : Math.floor(w / 2);
  const depth = Math.max(3, Math.floor((toward === 'right' ? h : w) / 4));
  const inside = (x: number, y: number): boolean => {
    if (x < 0 || y < 0 || x >= w || y >= h) return false;
    // The notch: a V cut into the free end.
    // The V opens to 60% of the ribbon's half-width at the end, leaving a tail each side.
    if (toward === 'right') return !(x >= w - depth && Math.abs(y - notch + 0.5) < ((x - (w - depth) + 1) / depth) * notch * 0.6);
    return !(y >= h - depth && Math.abs(x - notch + 0.5) < ((y - (h - depth) + 1) / depth) * notch * 0.6);
  };
  const shade = (c: Rgba): Rgba => (dim ? [Math.round(c[0] * 0.7), Math.round(c[1] * 0.7), Math.round(c[2] * 0.7), 255] : c);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (!inside(x, y)) continue;
      const edge = !inside(x - 1, y) || !inside(x + 1, y) || !inside(x, y - 1) || !inside(x, y + 1);
      if (edge) b.put(x, y, EDGE);
      else {
        // A fold down its middle: lit on one side, shaded on the other.
        const across = toward === 'right' ? y / h : x / w;
        b.put(x, y, shade(across < 0.3 ? rim.light : across > 0.75 ? rim.dark : rim.mid));
      }
    }
  }
  return b;
}
