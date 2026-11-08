import type { Rng } from '../../logic/rng';
import type { LevelDef } from '../../level/types';
import { blob, polar, SHADOW } from '../groundKit';
import { closed, type Draw, pt, TAU } from '../kit';
import { PAPER_FILL } from '../palette';
import type { Pt } from '../pen';
import { dots, GRASS, GRASS_LIT, type Mark, markShadows, PEAT_DARK, SPOIL, SPOIL_DEEP, strokeMarks } from './heathPlaceKit';

/**
 * A badger's sett from above: the entrance, a dark D-shaped hole wider
 * than it's tall going down under the heather, its lip lit, and the great
 * fan of dug-out sandy soil heaped down-slope from it, raked into furrows
 * by the claws, clods on it and a little old bedding (dry grass) dragged
 * out. The setts are the Badger's level's spots.
 */

/** Where a level's setts are: its spots, on a badger's level. */
export function settsOf(level: LevelDef): readonly Pt[] {
  return level.boss?.kind === 'badger' ? (level.spots ?? []) : [];
}

export function sett(d: Draw, c: Pt, rng: Rng): void {
  const { pen } = d;
  // The spoil heap, fanned out down-right from the hole.
  const fan = pt(c.x + SHADOW.x * 16, c.y + SHADOW.y * 12);
  const heap = blob(fan, 34, 24, rng, 0.22, 26, Math.atan2(SHADOW.y, SHADOW.x) + (rng() - 0.5) * 0.4);
  pen.fill(heap.map((p) => pt(p.x + 2, p.y + 3)), d.ink, 0.12);
  pen.fill(heap, PAPER_FILL, 0.35);
  pen.fill(heap, SPOIL, 0.62);
  pen.clipped(heap, () => {
    pen.fill(blob(pt(fan.x - 6, fan.y - 6), 18, 12, rng, 0.3, 16), '#e2c79c', 0.4);
    pen.crescent(heap, pt(-5, -7), () => pen.fill(heap, SPOIL_DEEP, 0.35));
    // Claw furrows raking out from the hole.
    for (let i = 0; i < 11; i++) {
      const a = Math.atan2(SHADOW.y, SHADOW.x) + (rng() - 0.5) * 1.5;
      const a0 = polar(c, a, 12 + rng() * 4);
      const a1 = polar(c, a + (rng() - 0.5) * 0.2, 30 + rng() * 22);
      pen.hair([a0, pt((a0.x + a1.x) / 2 + (rng() - 0.5) * 2, (a0.y + a1.y) / 2), a1], 0.5, SPOIL_DEEP, 0.55);
    }
    dots(d, Array.from({ length: 160 }, () => {
      const p = polar(fan, rng() * TAU, Math.sqrt(rng()) * 30);
      return [p.x, p.y, 0.3 + rng() * 0.5] as const;
    }), SPOIL_DEEP, 0.5);
  });
  pen.hair(closed(heap).slice(0, 20), 0.5, d.ink, 0.35);
  for (let i = 0; i < 7; i++) {
    const p = polar(fan, rng() * TAU, rng() * 26);
    const clod = blob(p, 1.6 + rng() * 2.2, 1.2 + rng() * 1.6, rng, 0.3, 9);
    pen.fill(clod.map((q) => pt(q.x + 0.8, q.y + 1.1)), d.ink, 0.25);
    pen.fill(clod, rng() < 0.5 ? SPOIL_DEEP : SPOIL, 0.95);
    pen.hair(closed(clod), 0.3, d.ink, 0.5);
  }
  // Old bedding dragged out.
  const hay: Mark[] = [];
  for (let i = 0; i < 26; i++) {
    const p = polar(fan, rng() * TAU, 8 + rng() * 22);
    hay.push([p.x, p.y, rng() * TAU, 4 + rng() * 6, (rng() - 0.5) * 2]);
  }
  markShadows(d, hay, 0.18, 0.7, 0.8);
  strokeMarks(d, hay.slice(0, 14), GRASS, 0.7, 0.55);
  strokeMarks(d, hay.slice(14), GRASS_LIT, 0.8, 0.5);
  // The hole: wider than tall, the dark going down under its far lip.
  const hole = blob(c, 15, 10.5, rng, 0.1, 22, (rng() - 0.5) * 0.3);
  const lip = blob(pt(c.x - 1, c.y - 1.5), 19, 14, rng, 0.12, 22);
  pen.fill(lip, PEAT_DARK, 0.35);
  pen.fill(hole, PEAT_DARK, 0.95);
  pen.clipped(hole, () => {
    pen.fill(blob(pt(c.x - 2.5, c.y - 3), 11, 6, rng, 0.2, 16), '#0d0a08', 0.9);
    pen.fill(hole.map((p) => pt(p.x - SHADOW.x * 6, p.y - SHADOW.y * 6)), '#120e0b', 0.6);
    pen.hatch(hole, 1.8, 0.9, 0.4, { color: '#000', alpha: 0.4 });
  });
  pen.crescent(hole, pt(-SHADOW.x * 3, -SHADOW.y * 3), () => pen.fill(hole, SPOIL_DEEP, 0.6));
  pen.stroke(closed(hole), 1.2, d.ink, 0.85);
}
