import type { Rng } from '../../logic/rng';
import { arc, castShadow, polar, SHADOW } from '../groundKit';
import { closed, type Draw, oval, pt, TAU, tube } from '../kit';
import { PAPER_FILL } from '../palette';
import type { Pt } from '../pen';
import { mix } from '../wash';
import { BARK, BARK_DARK, dots, LEAF, LEAF_DEEP, NEST_GREEN, POD, SHADE, STRAW_DEEP, THORN } from './savannaPlaceKit';

/**
 * What lies under an umbrella thorn (Acacia tortilis): its tiny fallen
 * leaflets, yellowing; its seed pods, which coil like springs as they dry;
 * snapped twigs with their paired white thorns; and green grass strips the
 * weavers dropped while building. Kept off the level's things by `clear`.
 */

/** A dry pod, coiled: a flat brown strip wound one and a half times round, lit along its upper rim, a seed bulging here and there. */
function pod(d: Draw, c: Pt, s: number, rng: Rng): void {
  const { pen } = d;
  const turns = 1.2 + rng() * 0.6;
  const a0 = rng() * TAU;
  const spine = Array.from({ length: 30 }, (_, i) => {
    const t = i / 29;
    return polar(c, a0 + t * turns * TAU, s * (0.35 + 0.65 * t));
  });
  const shape = tube(spine, 1.2, 2.1);
  castShadow(d, shape, 1.4, 0.25, SHADE);
  pen.fill(shape, PAPER_FILL, 1);
  pen.fill(shape, POD, 0.85);
  pen.hair(spine.map((p) => pt(p.x - 0.4, p.y - 0.5)), 0.4, '#d6b88a', 0.55);
  for (let i = 4; i < spine.length; i += 6) dots(d, mix(POD, BARK_DARK, 0.4), 0.6, [[spine[i]!.x, spine[i]!.y, 0.8]]);
  pen.hair(closed(shape), 0.35, d.ink, 0.55);
}

/** A snapped twig: grey-brown, a kink or two, pairs of straight white thorns at its nodes. */
function twig(d: Draw, p: Pt, a: number, l: number, rng: Rng): void {
  const { pen } = d;
  const line = arc(p, polar(p, a, l), (rng() - 0.5) * l * 0.25, 8);
  const shape = tube(line, 1.4, 0.7);
  castShadow(d, shape, 1.2, 0.25, SHADE);
  pen.fill(shape, BARK, 0.9);
  pen.hair(closed(shape), 0.3, BARK_DARK, 0.7);
  for (let i = 2; i < line.length - 1; i += 2) {
    const q = line[i]!;
    for (const side of [-1, 1]) {
      const tip = polar(q, a + side * (1.1 + rng() * 0.3), 2.6 + rng() * 1.4);
      pen.hair([pt(q.x + SHADOW.x, q.y + SHADOW.y), pt(tip.x + SHADOW.x, tip.y + SHADOW.y)], 0.45, SHADE, 0.25);
      pen.hair([q, tip], 0.5, THORN, 0.95);
    }
  }
}

/** A strip of green grass a weaver tore off and dropped: a thin curling ribbon. */
function strip(d: Draw, p: Pt, rng: Rng): void {
  const a = rng() * TAU;
  const line = arc(p, polar(p, a, 8 + rng() * 9), (rng() - 0.5) * 7, 8);
  d.pen.hair(line.map((q) => pt(q.x + 0.8, q.y + 1.2)), 0.8, SHADE, 0.2);
  d.pen.hair(line, 0.8, rng() < 0.6 ? NEST_GREEN : STRAW_DEEP, 0.9);
}

export function acaciaLitter(d: Draw, c: Pt, r: number, clear: (p: Pt, room?: number) => boolean, rng: Rng): void {
  const under = (reach: number): Pt => polar(pt(c.x + 14, c.y + 18), rng() * TAU, r + 4 + Math.sqrt(rng()) * reach);
  const leaflets: [number, number, number][] = [];
  const yellow: [number, number, number][] = [];
  for (let k = 0; k < 260; k++) {
    const p = under(70);
    if (!clear(p, 2)) continue;
    (rng() < 0.55 ? leaflets : yellow).push([p.x, p.y, 0.5 + rng() * 0.5]);
  }
  dots(d, mix(LEAF, '#a08f50', 0.4), 0.7, leaflets);
  dots(d, '#c9a95c', 0.7, yellow);
  for (let k = 0; k < 18; k++) {
    const p = under(60);
    if (clear(p, 4)) dots(d, LEAF_DEEP, 0.35, [[p.x, p.y, 0.6]]);
  }
  for (let k = 0, made = 0; k < 20 && made < 4; k++) {
    const p = under(55);
    if (!clear(p, 8)) continue;
    pod(d, p, 3 + rng() * 1.6, rng);
    made++;
  }
  for (let k = 0, made = 0; k < 20 && made < 3; k++) {
    const p = under(50);
    if (!clear(p, 10)) continue;
    twig(d, p, rng() * TAU, 9 + rng() * 8, rng);
    made++;
  }
  for (let k = 0, made = 0; k < 20 && made < 3; k++) {
    const p = under(65);
    if (!clear(p, 4)) continue;
    strip(d, p, rng);
    made++;
  }
  // A fallen leaflet or two drawn bigger, to say what the specks are.
  for (let k = 0; k < 3; k++) {
    const p = under(40);
    if (!clear(p, 3)) continue;
    const a = rng() * TAU;
    d.pen.fill(oval(p.x, p.y, 1.6, 0.8, 8).map((q) => polar(p, Math.atan2(q.y - p.y, q.x - p.x) + a, Math.hypot(q.x - p.x, q.y - p.y))), '#b09a58', 0.85);
  }
}
