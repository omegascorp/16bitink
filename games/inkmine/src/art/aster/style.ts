import { pt, type Draw } from '../kit';
import { paint } from '../paint';
import type { Pt } from '../pen';

/**
 * The Aster's design language (spec, "The Aster"): everything they make
 * looks grown more than built. Glazed ceramic, bone-white with lilac glaze
 * pooled low, ribbed like a shell and round a centre; joints lashed with
 * dark red cord where ours are riveted; hexagonal glass with a cool teal
 * glow where power runs; an eight-pointed star, their mark, on everything.
 * No rivets, no straight panel seams, none of the guild's cobalt and
 * enamel.
 */
export const ASTER = {
  shell: '#ece3d6',
  glaze: '#c4b2d9',
  cord: '#7a3b2e',
  glass: '#7fd6c4',
  glow: '#8ff0d8',
  /** Their writing's ink: a dark plum, steadier than yours. */
  ink: '#3b2448',
} as const;

/** An eight-pointed star, their mark: long points on the axes, short ones between, painted and inked. */
export function starGlyph(d: Draw, c: Pt, r: number, wash: string, gloss = false): void {
  const pts: Pt[] = [];
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2 - Math.PI / 2;
    const q = i % 2 === 0 ? (i % 4 === 0 ? r : r * 0.7) : r * 0.32;
    pts.push(pt(c.x + Math.cos(a) * q, c.y + Math.sin(a) * q));
  }
  paint(d, pts, wash, { alpha: 1, shadow: 0.45, hatch: 0, line: 0.6, gloss });
}
