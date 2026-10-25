import type { Rng } from '../../logic/rng';
import { arc, polar, SHADOW } from '../groundKit';
import { closed, type Draw, normals, pt } from '../kit';
import { PAPER_FILL } from '../palette';
import type { Pt } from '../pen';
import { mix } from '../wash';
import { BRACKEN, BRACKEN_BRONZE, BRACKEN_DEEP, BRACKEN_LIT } from './barrensPlaceKit';

/**
 * A bracken frond seen from above, held flat over the ground: its stem
 * (rachis) from `base` towards `ang`, a broad triangle of paired pinnae,
 * the lowest the longest, each lobed into pinnules down its length, lit on
 * the side towards the light, throwing a shadow `lift` px down-right.
 * `bronze` (0..1) turns it towards autumn's rust. `keep` stops pinnae
 * whose tips would pass it (the cover's reach).
 */
export interface FrondOpts {
  readonly bronze: number;
  readonly lift: number;
  readonly keep?: (p: Pt) => boolean;
  /** Draw the pinnae's shadows (off when a lower layer's shadows were laid already). */
  readonly shadow?: boolean;
  /** How broad the blade is (1 is a lone frond's). */
  readonly broad?: number;
}

/** One pinna along `spine`, `w` wide at its root: lobed edges either side. */
function pinnaShape(spine: readonly Pt[], w: number, lobes: number): Pt[] {
  const nrm = normals(spine);
  const half = (i: number): number => {
    const u = i / (spine.length - 1);
    return (w / 2) * (1 - u) ** 0.6 * (0.55 + 0.45 * Math.abs(Math.sin(u * Math.PI * lobes)));
  };
  const top = spine.map((p, i) => pt(p.x + nrm[i]!.x * half(i), p.y + nrm[i]!.y * half(i)));
  const bot = spine.map((p, i) => pt(p.x - nrm[i]!.x * half(i), p.y - nrm[i]!.y * half(i)));
  return [...top, ...[...bot].reverse()];
}

export function frond(d: Draw, base: Pt, ang: number, len: number, rng: Rng, o: FrondOpts): void {
  const { pen } = d;
  const tip = polar(base, ang, len);
  const curl = (rng() - 0.5) * len * 0.18;
  const rachis = arc(base, tip, curl, 24);
  const nrm = normals(rachis);
  const tone = (k: number): string => {
    const green = mix(mix(BRACKEN_DEEP, BRACKEN, 0.6), BRACKEN_LIT, k);
    return mix(green, mix(BRACKEN_BRONZE, '#d2a866', k * 0.6), o.bronze);
  };
  const pinnae: { shape: Pt[]; spine: Pt[]; lit: number }[] = [];
  const pairs = Math.max(5, Math.round(len / 9));
  // The stem is bare for its first part; pinnae from there to the tip.
  for (let k = 0; k < pairs; k++) {
    const u = 0.18 + (k / pairs) * 0.8;
    const i = Math.min(rachis.length - 1, Math.round(u * (rachis.length - 1)));
    const p = rachis[i]!;
    const along = Math.atan2(rachis[Math.min(rachis.length - 1, i + 1)]!.y - rachis[Math.max(0, i - 1)]!.y, rachis[Math.min(rachis.length - 1, i + 1)]!.x - rachis[Math.max(0, i - 1)]!.x);
    const full = (len * 0.42 * (1 - u) ** 0.85 + 3) * (o.broad ?? 1);
    for (const side of [1, -1]) {
      const a = along + side * (1.05 - u * 0.35) + (rng() - 0.5) * 0.15;
      // A pinna that would pass the keep is cut short to fit it.
      let plen = full;
      while (o.keep && !o.keep(polar(p, a, plen)) && plen > 3) plen *= 0.8;
      if (o.keep && !o.keep(polar(p, a, plen))) continue;
      const ptip = polar(p, a, plen);
      const spine = arc(p, ptip, -side * plen * 0.12, 10);
      const shape = pinnaShape(spine, Math.max(2.4, plen * 0.32 * Math.sqrt(o.broad ?? 1)), Math.max(2, Math.round(plen / 4.5)));
      // Which way the pinna faces: towards the light is lit.
      const n = nrm[i]!;
      const lit = Math.max(0, Math.min(1, 0.5 - 0.5 * (n.x * side * SHADOW.x + n.y * side * SHADOW.y) * 1.4 + (rng() - 0.5) * 0.2));
      pinnae.push({ shape, spine, lit });
    }
  }
  if (o.shadow !== false) {
    for (const q of pinnae) pen.fill(q.shape.map((p) => pt(p.x + SHADOW.x * o.lift, p.y + SHADOW.y * o.lift)), d.ink, 0.13);
    pen.stroke(rachis.map((p) => pt(p.x + SHADOW.x * o.lift, p.y + SHADOW.y * o.lift)), 1.6, d.ink, 0.12, false);
  }
  for (const q of pinnae) {
    pen.fill(q.shape, PAPER_FILL, 0.9);
    pen.fill(q.shape, tone(q.lit * 0.75), 0.92);
    pen.hair(q.spine, 0.45, mix(tone(q.lit), PAPER_FILL, 0.35), 0.7);
    pen.hair(closed(q.shape), 0.4, d.ink, 0.6);
  }
  pen.stroke(rachis, 1.5, mix(tone(0.2), '#6b5a2e', 0.4), 0.95, false);
  pen.hair(rachis.map((p) => pt(p.x - SHADOW.x * 0.5, p.y - SHADOW.y * 0.5)), 0.4, PAPER_FILL, 0.5);
}
