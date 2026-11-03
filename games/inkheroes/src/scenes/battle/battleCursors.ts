import arrowUrl from '../../art/pixel/cursors/arrow.png?url';
import arrowBrokenUrl from '../../art/pixel/cursors/arrow-broken.png?url';
import bootUrl from '../../art/pixel/cursors/boot.png?url';
import infoUrl from '../../art/pixel/cursors/info.png?url';
import swordEUrl from '../../art/pixel/cursors/sword-e.png?url';
import swordNeUrl from '../../art/pixel/cursors/sword-ne.png?url';
import wandUrl from '../../art/pixel/cursors/wand.png?url';

/**
 * The battle's mouse cursors, as in Heroes 3: a boot where the unit can
 * walk, a sword pointing the way the blow comes in (from the hex the unit
 * would strike from), an arrow for a full-damage shot and a broken arrow for
 * a far one, a question mark over a unit (click for its stats) and a wand
 * over a spell's target. Pixel art: each comes from one of five sprites, flipped or
 * turned a quarter for the other sword directions (pixel-exact), and is
 * shown at its own size on 1× screens and doubled, unsmoothed, on 2×.
 */

/** Which way a sword points, by compass (n = up the screen). */
export type SwordDir = 'e' | 'ne' | 'n' | 'nw' | 'w' | 'sw' | 's' | 'se';
export type CursorKind = 'move' | 'shoot' | 'shootFar' | 'info' | 'cast' | `sword-${SwordDir}`;

const DIRS: readonly SwordDir[] = ['e', 'ne', 'n', 'nw', 'w', 'sw', 's', 'se'];
const VEC: Readonly<Record<SwordDir, readonly [number, number]>> = {
  e: [1, 0], ne: [1, -1], n: [0, -1], nw: [-1, -1], w: [-1, 0], sw: [-1, 1], s: [0, 1], se: [1, 1],
};

/** The sword direction for a blow travelling (dx, dy) on screen (y down), to the nearest eighth. */
export function swordDir(dx: number, dy: number): SwordDir {
  const eighth = Math.round(Math.atan2(-dy, dx) / (Math.PI / 4));
  return DIRS[(eighth + 8) % 8]!;
}

type Transform = { readonly flipX?: boolean; readonly flipY?: boolean; readonly turn?: 1 | -1 };

/** How each cursor is made from its sprite, and which way its hotspot (the tip) points. */
const RECIPES: Readonly<Record<CursorKind, { readonly src: string; readonly t: Transform; readonly tip: readonly [number, number] | null }>> = {
  move: { src: bootUrl, t: {}, tip: null },
  info: { src: infoUrl, t: {}, tip: null },
  cast: { src: wandUrl, t: {}, tip: VEC.ne },
  shoot: { src: arrowUrl, t: {}, tip: VEC.ne },
  shootFar: { src: arrowBrokenUrl, t: {}, tip: VEC.ne },
  'sword-e': { src: swordEUrl, t: {}, tip: VEC.e },
  'sword-w': { src: swordEUrl, t: { flipX: true }, tip: VEC.w },
  'sword-n': { src: swordEUrl, t: { turn: -1 }, tip: VEC.n },
  'sword-s': { src: swordEUrl, t: { turn: 1 }, tip: VEC.s },
  'sword-ne': { src: swordNeUrl, t: {}, tip: VEC.ne },
  'sword-nw': { src: swordNeUrl, t: { flipX: true }, tip: VEC.nw },
  'sword-se': { src: swordNeUrl, t: { flipY: true }, tip: VEC.se },
  'sword-sw': { src: swordNeUrl, t: { flipX: true, flipY: true }, tip: VEC.sw },
};

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`cursor image failed to load: ${url}`));
    img.src = url;
  });
}

/** The sprite flipped / turned (quarter turns only, so no pixel is resampled) on a canvas. */
function transformed(img: HTMLImageElement, t: Transform): HTMLCanvasElement {
  const turn = t.turn ?? 0;
  const c = document.createElement('canvas');
  c.width = turn ? img.height : img.width;
  c.height = turn ? img.width : img.height;
  const ctx = c.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;
  ctx.translate(c.width / 2, c.height / 2);
  if (turn) ctx.rotate((turn * Math.PI) / 2);
  ctx.scale(t.flipX ? -1 : 1, t.flipY ? -1 : 1);
  ctx.drawImage(img, -img.width / 2, -img.height / 2);
  return c;
}

/** The opaque pixel furthest along `dir` (the blade's or arrow's tip), or the middle. */
function hotspot(c: HTMLCanvasElement, dir: readonly [number, number] | null): { x: number; y: number } {
  if (!dir) return { x: Math.floor(c.width / 2), y: Math.floor(c.height / 2) };
  const px = c.getContext('2d')!.getImageData(0, 0, c.width, c.height).data;
  let best = { x: 0, y: 0 };
  let score = -Infinity;
  for (let y = 0; y < c.height; y++) {
    for (let x = 0; x < c.width; x++) {
      if (px[(y * c.width + x) * 4 + 3]! < 128) continue;
      const s = x * dir[0] + y * dir[1];
      if (s > score) {
        score = s;
        best = { x, y };
      }
    }
  }
  return best;
}

function doubled(c: HTMLCanvasElement): HTMLCanvasElement {
  const d = document.createElement('canvas');
  d.width = c.width * 2;
  d.height = c.height * 2;
  const ctx = d.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(c, 0, 0, d.width, d.height);
  return d;
}

/** CSS cursor values for every kind: crisp 1×/2× via image-set, with a plain 1× fallback. */
async function buildCursors(): Promise<Map<CursorKind, { set: string; plain: string }>> {
  const urls = [...new Set(Object.values(RECIPES).map((r) => r.src))];
  const images = new Map(await Promise.all(urls.map(async (u) => [u, await loadImage(u)] as const)));
  const out = new Map<CursorKind, { set: string; plain: string }>();
  for (const [kind, r] of Object.entries(RECIPES) as [CursorKind, (typeof RECIPES)[CursorKind]][]) {
    const one = transformed(images.get(r.src)!, r.t);
    const { x, y } = hotspot(one, r.tip);
    const a = one.toDataURL();
    const b = doubled(one).toDataURL();
    out.set(kind, {
      set: `image-set(url("${a}") 1x, url("${b}") 2x) ${x} ${y}, auto`,
      plain: `url("${a}") ${x} ${y}, auto`,
    });
  }
  return out;
}

/** Sets the canvas's cursor; `null` is the ordinary pointer. Cursors appear once their images load. */
export class BattleCursors {
  private cursors: Map<CursorKind, { set: string; plain: string }> | null = null;
  private current: CursorKind | null = null;

  constructor(private readonly canvas: HTMLCanvasElement) {
    buildCursors()
      .then((c) => {
        this.cursors = c;
        this.apply();
      })
      .catch((e: unknown) => {
        // Without the images the battle still plays with the ordinary pointer.
        console.warn(e instanceof Error ? e.message : e);
      });
  }

  set(kind: CursorKind | null): void {
    if (kind === this.current) return;
    this.current = kind;
    this.apply();
  }

  /** Back to the ordinary pointer (leaving the battle). */
  reset(): void {
    this.current = null;
    this.canvas.style.cursor = '';
  }

  private apply(): void {
    const c = this.current && this.cursors?.get(this.current);
    if (!c) {
      this.canvas.style.cursor = '';
      return;
    }
    this.canvas.style.cursor = c.set;
    // A browser that can't read image-set in a cursor leaves the old value: use the plain 1× one.
    if (!this.canvas.style.cursor.includes('image-set')) this.canvas.style.cursor = c.plain;
  }
}
