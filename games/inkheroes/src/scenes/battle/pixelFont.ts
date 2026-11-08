import arkPixelUrl from '../../art/pixel/ui/ark-pixel-12.woff2?url';
import { PixelBuffer, type Rgba } from './pixelRaster';

/**
 * The battle UI's text: Ark Pixel 12 (OFL; a real font with Latin, Greek
 * and Cyrillic, so the battle can be translated), drawn at its design size
 * so every stroke lands on a whole pixel, then made exactly binary (no
 * antialiasing), coloured, outlined and shadowed pixel by pixel. The
 * result is a PixelBuffer at UI pixel size, shown NEAREST like the art.
 */

const FAMILY = 'ArkPixel12';
/** The font's design size: one font pixel is one UI pixel. */
const PX = 12;
/** Rows above the baseline (accented capitals included) and below it (descenders). */
const ASCENT = 12;
const DESCENT = 3;
export const LINE_H = ASCENT + DESCENT;

let ready: Promise<void> | null = null;

/** Loads the font once; text drawn before this resolves would fall back to another face. */
export function loadUiFont(): Promise<void> {
  ready ??= (async () => {
    const face = new FontFace(FAMILY, `url(${arkPixelUrl}) format('woff2')`);
    await face.load();
    document.fonts.add(face);
  })();
  return ready;
}

let measurer: CanvasRenderingContext2D | null = null;

function ctx2d(): CanvasRenderingContext2D {
  if (!measurer) {
    measurer = document.createElement('canvas').getContext('2d')!;
    measurer.font = `${PX}px ${FAMILY}`;
  }
  return measurer;
}

/** A line's width in UI pixels (the font's advances are whole pixels). */
export function lineWidth(line: string, bold = false): number {
  return Math.ceil(ctx2d().measureText(line).width) + (bold ? 1 : 0);
}

/** The text in lines no wider than `max` (breaking at spaces; a longer word gets a line of its own). */
export function wrapLines(text: string, max = Infinity, bold = false): string[] {
  const lines: string[] = [];
  for (const para of text.split('\n')) {
    let line = '';
    for (const word of para.split(' ')) {
      const next = line ? `${line} ${word}` : word;
      if (line && lineWidth(next, bold) > max) {
        lines.push(line);
        line = word;
      } else line = next;
    }
    lines.push(line);
  }
  return lines;
}

export interface PixelTextStyle {
  readonly ink: Rgba;
  /** A one-pixel ring round every stroke. */
  readonly outline?: Rgba;
  /** One pixel below the outline (or the ink). */
  readonly shadow?: Rgba;
  /** Each stroke a pixel wider (titles). */
  readonly bold?: boolean;
}

export interface PixelTextBlock {
  readonly lines: readonly string[];
  readonly align?: 'left' | 'center' | 'right';
  /** Extra pixels between lines. */
  readonly gap?: number;
}

/** The block drawn on a clear buffer just big enough for it, outline and shadow included. */
export function renderPixelText(block: PixelTextBlock, style: PixelTextStyle): PixelBuffer {
  const o = style.outline ? 1 : 0;
  const s = style.shadow ? 1 : 0;
  const gap = block.gap ?? 1;
  const widths = block.lines.map((l) => lineWidth(l, style.bold));
  const inner = Math.max(1, ...widths);
  const w = inner + o * 2;
  const h = block.lines.length * LINE_H + (block.lines.length - 1) * gap + o * 2 + s;
  // The ink, drawn at the design size and cut to exactly on or off.
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const g = c.getContext('2d')!;
  g.font = `${PX}px ${FAMILY}`;
  g.textBaseline = 'alphabetic';
  g.fillStyle = '#fff';
  block.lines.forEach((line, i) => {
    const align = block.align ?? 'center';
    const x = o + (align === 'center' ? Math.floor((inner - widths[i]!) / 2) : align === 'right' ? inner - widths[i]! : 0);
    const y = o + i * (LINE_H + gap) + ASCENT;
    g.fillText(line, x, y);
    if (style.bold) g.fillText(line, x + 1, y);
  });
  const px = g.getImageData(0, 0, w, h).data;
  const ink = (x: number, y: number): boolean => x >= 0 && y >= 0 && x < w && y < h && px[(y * w + x) * 4 + 3]! >= 128;
  const ring = (x: number, y: number): boolean => {
    if (ink(x, y)) return false;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if ((dx || dy) && ink(x + dx, y + dy)) return true;
    return false;
  };
  const out = new PixelBuffer(w, h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (ink(x, y)) out.put(x, y, style.ink);
      else if (style.outline && ring(x, y)) out.put(x, y, style.outline);
      else if (style.shadow && (style.outline ? ring(x, y - 1) : ink(x, y - 1))) out.put(x, y, style.shadow);
    }
  }
  return out;
}
