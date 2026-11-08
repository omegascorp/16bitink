import type { Rng } from '../../logic/rng';
import { blob, polar, SHADOW, softBand } from '../groundKit';
import { type Draw, normals, pt, TAU } from '../kit';
import { PAPER_FILL } from '../palette';
import type { Pt } from '../pen';
import { specks, stripShape } from '../places/farmGroundParts';
import { mix, rgba } from '../wash';
import type { Bare } from './barrensPlaceTracks';
import { ASH, ASH_PALE, type Burn, burnDepth, CHAR, CHAR_SHEEN, H, SAND_DEEP, SAND_PALE, W } from './barrensPlaceKit';
import { charredStalk, pineCone, twig } from './barrensPlaceParts';

/**
 * A fire's mark on the Pine Barrens floor: the char where it ran (black,
 * patched with grey ash and half-burnt brown duff), the singed brown fringe
 * beyond its edge, the charred stalks left standing, a burnt cone, and for
 * a controlled burn the disked firebreak of raked sand that stopped it.
 */

/** A point somewhere in the burn, on the board. */
function inBurn(b: Burn, rng: Rng, margin = 0): Pt | null {
  for (let k = 0; k < 12; k++) {
    const p = pt(rng() * W, rng() * H);
    if (burnDepth(b, p.x, p.y) > margin) return p;
  }
  return null;
}

/** A soft round stain fading out from p: a wash dropped wet into wet. */
function softSpot(d: Draw, p: Pt, r: number, colour: string, alpha: number): void {
  const { ctx } = d.pen;
  const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r);
  g.addColorStop(0, rgba(colour, alpha));
  g.addColorStop(0.6, rgba(colour, alpha * 0.6));
  g.addColorStop(1, rgba(colour, 0));
  ctx.save();
  ctx.fillStyle = g;
  ctx.fillRect(p.x - r, p.y - r, r * 2, r * 2);
  ctx.restore();
}

/** The char laid over the ground, and the singed fringe round it. */
export function scorch(d: Draw, b: Burn, rng: Rng): void {
  const { pen } = d;
  const rim = b.shape;
  softBand(d, rim, 46, '#6a4428', 0.26);
  softBand(d, rim, 18, '#3e2a1e', 0.3);
  pen.fill(rim, '#2b2420', 0.55);
  pen.clipped(rim, () => {
    for (let k = 0; k < 150; k++) {
      const p = inBurn(b, rng, -20);
      if (!p) continue;
      const depth = burnDepth(b, p.x, p.y);
      const pick = rng();
      // Deeper char inside, half-burnt brown duff and grey ash in patches, nearer the edge more brown.
      const colour = pick < 0.3 ? CHAR : pick < 0.5 ? CHAR_SHEEN : pick < 0.72 || depth < 22 ? '#5a3e2a' : ASH;
      softSpot(d, p, 16 + rng() * 34, colour, colour === ASH ? 0.16 : 0.2);
    }
    const dark: [number, number, number][] = [];
    const ash: [number, number, number][] = [];
    for (let k = 0; k < 9000; k++) {
      const p = pt(rng() * W, rng() * H);
      if (burnDepth(b, p.x, p.y) < -2) continue;
      (rng() < 0.55 ? dark : ash).push([p.x, p.y, 0.3 + rng() * 0.6]);
    }
    specks(d, '#0e0c0b', 0.5, dark);
    specks(d, ASH_PALE, 0.35, ash);
  });
}

/** Charred stalks, blackened twigs and burnt cones, over the char. */
export function burntLitter(d: Draw, b: Burn, clear: (p: Pt) => boolean, rng: Rng): void {
  const { pen } = d;
  for (let k = 0; k < 220; k++) {
    const p = inBurn(b, rng, 6);
    if (!p || !clear(p)) continue;
    charredStalk(d, p, 3 + rng() * 4, rng);
  }
  for (let k = 0; k < 10; k++) {
    const p = inBurn(b, rng, 10);
    if (!p || !clear(p)) continue;
    twig(d, p, rng() * TAU, 14 + rng() * 16, rng, mix(CHAR, CHAR_SHEEN, rng() * 0.5));
  }
  for (let k = 0; k < 6; k++) {
    const p = inBurn(b, rng, 10);
    if (!p || !clear(p)) continue;
    pineCone(d, p, 9 + rng() * 3, rng, true);
    pen.fill(blob(p, 5, 5, rng, 0.2, 10), CHAR, 0.55);
  }
}

/**
 * The firebreak a controlled burn was held at: a strip of disked sand, pale
 * and free of litter, its furrows running along it (each a lit crest and a
 * shaded trough), sunk a little below the floor either side.
 */
export function firebreak(d: Draw, line: readonly Pt[], half: number, bare: Bare, rng: Rng): void {
  const { pen } = d;
  const strip = stripShape(line, () => half + rng() * 1.5, () => half + rng() * 1.5);
  pen.fill(strip.shape, PAPER_FILL, 0.5);
  pen.fill(strip.shape, SAND_PALE, 0.7);
  const nrm = normals(line);
  pen.clipped(strip.shape, () => {
    for (let off = -half + 4; off < half - 2; off += 5.5) {
      const ridge = line.map((p, i) => pt(p.x + nrm[i]!.x * (off + Math.sin(i * 0.4 + off) * 0.6), p.y + nrm[i]!.y * (off + Math.sin(i * 0.4 + off) * 0.6)));
      pen.hair(ridge.map((p, i) => pt(p.x + nrm[i]!.x * 1.6, p.y + nrm[i]!.y * 1.6)), 1.3, SAND_DEEP, 0.28);
      pen.hair(ridge, 1.6, PAPER_FILL, 0.6);
    }
    const grit: [number, number, number][] = [];
    for (let k = 0; k < line.length * half; k++) {
      const p = polar(line[Math.floor(rng() * line.length)]!, rng() * TAU, Math.sqrt(rng()) * half);
      grit.push([p.x, p.y, 0.3 + rng() * 0.5]);
    }
    specks(d, SAND_DEEP, 0.45, grit);
  });
  pen.crescent(strip.shape, pt(SHADOW.x * 4, SHADOW.y * 4), () => pen.fill(strip.shape, SAND_DEEP, 0.24));
  pen.crescent(strip.shape, pt(-SHADOW.x * 2, -SHADOW.y * 2), () => pen.fill(strip.shape, PAPER_FILL, 0.3));
  pen.hair(strip.left, 0.5, d.ink, 0.35);
  pen.hair([...strip.right].reverse(), 0.5, d.ink, 0.35);
  bare.line(line, half + 2);
}
