import { bezier, closed, type Draw, pt } from '../kit';
import { PAPER_FILL } from '../palette';
import type { Pt } from '../pen';
import { mix } from '../wash';
import { beadEye, glaze } from '../critters/preyKit';
import type { Gecko } from './rainforestCrittersGeckoKit';

/**
 * The water monitor's head from above: a long narrow snout with the
 * nostrils near its tip, heavy brows over small dark eyes, the dark band
 * edged pale running back from each eye, the long forked tongue, and the
 * gape of a bite (the head tipped up, the lower jaw and pink mouth
 * showing in front of it, rows of small curved teeth).
 */
export const M = {
  base: '#5d6040',
  deep: '#1f2118',
  dark: '#30321f',
  olive: '#7b7c4c',
  ocellus: '#d9c66c',
  pale: '#cfc89a',
  claw: '#2a2620',
  tongue: '#b5607e',
  tongueDeep: '#6e2c46',
  mouth: '#d68a8a',
  mouthDeep: '#7a3a40',
  tooth: '#f4eedc',
  iris: '#b49a4a',
} as const;

/** The forked tongue flicking out from the snout tip: long, thin, the two tines spread at the end. */
export function tongue(d: Draw, z: Gecko, len: number, wag: number): void {
  const { pen } = d;
  const root = z.at(0.4, 0);
  const { f, n } = z.frame(0.5);
  const at = (k: number, side: number): Pt => pt(root.x + f.x * len * k + n.x * (wag * Math.sin(k * 3) * 1.6 + side), root.y + f.y * len * k + n.y * (wag * Math.sin(k * 3) * 1.6 + side));
  const stem = Array.from({ length: 7 }, (_, i) => at((i / 6) * 0.72, 0));
  pen.hair(stem, 1.1, d.ink, 0.85);
  pen.hair(stem, 0.75, M.tongue, 1);
  for (const side of [-1, 1]) {
    const tine = [at(0.72, 0), at(0.86, side * 0.9), at(1, side * 2.1)];
    pen.hair(tine, 0.8, d.ink, 0.85);
    pen.hair(tine, 0.5, M.tongueDeep, 1);
  }
  pen.hair(stem.slice(1, 4), 0.25, mix(M.tongue, PAPER_FILL, 0.5), 0.6);
}

/** The open mouth of a bite, in front of the tipped-up head: the lower jaw's rim, the pink mouth, small teeth. */
export function gape(d: Draw, z: Gecko, reach: number): void {
  const { pen } = d;
  const back = z.at(10.5, 0);
  const tip = z.at(-reach, 0);
  const { n } = z.frame(4);
  const side = (s: number, k: number): Pt => { const p = z.at(s, k); return pt(p.x, p.y); };
  const outer = [...bezier(side(10.5, -1.05), pt(tip.x + n.x * -5, tip.y + n.y * -5), tip, 8), ...bezier(tip, pt(tip.x + n.x * 5, tip.y + n.y * 5), side(10.5, 1.05), 8).slice(1)];
  const inTip = pt(tip.x + (back.x - tip.x) * 0.08, tip.y + (back.y - tip.y) * 0.08);
  const inner = [...bezier(side(9.5, -0.78), pt(inTip.x + n.x * -3.6, inTip.y + n.y * -3.6), inTip, 8), ...bezier(inTip, pt(inTip.x + n.x * 3.6, inTip.y + n.y * 3.6), side(9.5, 0.78), 8).slice(1)];
  pen.fill(outer.map((p) => pt(p.x + 0.8, p.y + 1.2)), d.ink, 0.22);
  pen.fill(outer, M.pale, 1);
  pen.clipped(outer, () => pen.crescent(outer, pt(-0.6, -0.9), () => pen.fill(outer, M.olive, 0.6)));
  pen.stroke(closed(outer), 0.5, d.ink, 0.95);
  pen.fill(inner, M.mouthDeep, 1);
  pen.clipped(inner, () => {
    const c = z.at(1 - reach * 0.4, 0);
    glaze(d, c.x, c.y, 6, 3.4, Math.atan2(n.x, -n.y), M.mouth, 0.95);
    pen.hair([z.at(4, 0), z.at(-reach * 0.7, 0)], 0.6, M.tongue, 0.9);
  });
  // Small curved teeth along both rims.
  for (const rim of [inner.slice(1, 8), inner.slice(9, 16)]) {
    for (const p of rim.filter((_, i) => i % 2 === 0)) {
      const c = z.at(2, 0);
      const l = Math.hypot(c.x - p.x, c.y - p.y) || 1;
      const q = pt(p.x + ((c.x - p.x) / l) * 1.1, p.y + ((c.y - p.y) / l) * 1.1);
      pen.hair([p, q], 0.55, M.tooth, 1);
      pen.hair([p, q], 0.18, d.ink, 0.5);
    }
  }
  pen.stroke(closed(inner), 0.32, d.ink, 0.9, false);
}

/** The head's markings over the body's wash: a darker crown, the eye bands, brows, nostrils, the lip line and the eyes. */
export function headMarks(d: Draw, z: Gecko, biting: boolean): void {
  const { pen } = d;
  const crown = z.at(10.35, 0);
  glaze(d, crown.x, crown.y, 6, 4, 0, M.dark, 0.5);
  const snout = z.at(3.45, -0.2);
  glaze(d, snout.x, snout.y, 3.4, 1.6, 0, mix(M.olive, PAPER_FILL, 0.3), 0.4);
  for (const v of [-1, 1]) {
    // The dark band behind the eye, edged pale above.
    const band = [z.at(11.5, v * 0.72), z.at(14.95, v * 0.84), z.at(18.97, v * 0.86)];
    pen.hair(band, 1.3, M.deep, 0.7);
    pen.hair(band.map((p, i) => z.at([11.5, 14.95, 18.98][i]!, v * 0.55)), 0.5, M.pale, 0.55);
    // Nostrils near the snout tip, slits angled back.
    const nos = z.at(1.84, v * 0.55);
    pen.hair([nos, z.at(2.76, v * 0.62)], 0.45, M.deep, 0.95);
    // The lip line, curving up at the back of the jaw.
    pen.hair([z.at(0.92, v * 0.9), z.at(5.75, v * 0.98), z.at(11.5, v * 0.98), z.at(14.26, v * 0.86)], 0.3, d.ink, 0.6);
    // A heavy brow over the eye, the eye set at the side.
    const e = z.at(10.35, v * 0.78);
    pen.hair([z.at(8.51, v * 0.62), z.at(10.35, v * 0.56), z.at(12.19, v * 0.64)], 0.55, M.deep, 0.75);
    pen.dot(e.x, e.y, 1.2, M.iris, 1);
    beadEye(d, e, 0.85);
    if (biting) pen.hair([z.at(8.97, v * 0.95), z.at(11.73, v * 0.95)], 0.35, d.ink, 0.8);
  }
  // Fine head scales, larger plates on the crown.
  for (let s = 3.5; s < 16; s += 1.8) {
    for (const v of [-0.5, 0, 0.5]) {
      const c = z.at(s + (v === 0 ? 0.8 : 0), v);
      pen.hair([pt(c.x + 0.5, c.y - 0.5), pt(c.x - 0.4, c.y), pt(c.x + 0.5, c.y + 0.5)], 0.14, M.deep, 0.4);
    }
  }
}
