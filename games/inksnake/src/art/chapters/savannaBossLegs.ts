import type { Rng } from '../../logic/rng';
import { capsule, closed, type Draw, pt } from '../kit';
import type { Pt } from '../pen';
import { ellipseAt, glaze } from '../critters/birdKit';
import { greyPlumage, SEC } from './savannaBossPaint';

/**
 * The Secretary Bird's long legs from above: the black-feathered thigh
 * (its "trousers") at the hip, the long bare pink-orange shank, scaled
 * across, and the short-toed foot with its blunt black claws. A lifted
 * foot is nearer the eye, so drawn a little bigger and far from its
 * shadow; a stamped one splays its toes over a burst of impact marks.
 */
const S = SEC;

export interface SecLeg {
  /** Where the thigh meets the body (on the flank) and where the foot is. */
  readonly hip: Pt;
  readonly foot: Pt;
  /** 0 on the ground, 1 raised high (bigger, its shadow far off). */
  readonly lift: number;
  /** Which way the toes point. */
  readonly ang: number;
  /** Toes curled (raised) or splayed hard (stamped). */
  readonly grip?: 'curl' | 'splay';
}

/** The shadow a leg throws on the ground: its foot's, offset by how high it's held. */
export function legShadow(l: SecLeg): Pt[] {
  const k = 4 + l.lift * 22;
  return ellipseAt(l.foot.x + k * 0.55, l.foot.y + k * 0.84, 5, 3, l.ang, 12);
}

function foot(d: Draw, l: SecLeg): void {
  const { pen } = d;
  const s = 1 + l.lift * 0.3;
  const spread = l.grip === 'splay' ? 0.75 : l.grip === 'curl' ? 0.35 : 0.55;
  const lens = l.grip === 'curl' ? [3.2, 3.8, 3.2] : [4.4, 5.4, 4.4];
  lens.forEach((len, i) => {
    const a = l.ang + (i - 1) * spread;
    const tip = pt(l.foot.x + Math.cos(a) * len * s, l.foot.y + Math.sin(a) * len * s);
    const toe = capsule(l.foot, tip, 1.9 * s, 1.3 * s);
    pen.fill(toe, S.leg, 1);
    pen.stroke(closed(toe), 0.4, d.ink, 0.9, false);
    for (let k = 1; k < 4; k++) {
      const m = pt(l.foot.x + Math.cos(a) * len * s * k / 4, l.foot.y + Math.sin(a) * len * s * k / 4);
      pen.hair([pt(m.x - Math.sin(a) * 0.8 * s, m.y + Math.cos(a) * 0.8 * s), pt(m.x + Math.sin(a) * 0.8 * s, m.y - Math.cos(a) * 0.8 * s)], 0.25, S.legDeep, 0.7);
    }
    pen.stroke([tip, pt(tip.x + Math.cos(a) * 1.6 * s, tip.y + Math.sin(a) * 1.6 * s)], 1.1 * s, S.claw, 1, false);
  });
  // The short hind toe.
  const back = pt(l.foot.x - Math.cos(l.ang) * 2.4 * s, l.foot.y - Math.sin(l.ang) * 2.4 * s);
  pen.stroke([l.foot, back], 1.3 * s, S.leg, 1, false);
  pen.dot(back.x, back.y, 0.6 * s, S.claw, 1);
}

/** The shank from the knee to the foot, and the black trousers from the hip down to the knee. */
export function paintLeg(d: Draw, rng: Rng, l: SecLeg): void {
  const { pen } = d;
  const s = 1 + l.lift * 0.3;
  const dx = l.foot.x - l.hip.x;
  const dy = l.foot.y - l.hip.y;
  const knee = pt(l.hip.x + dx * 0.45, l.hip.y + dy * 0.45);
  const shank = capsule(knee, l.foot, 2.4 * s, 2 * s);
  pen.fill(shank, S.leg, 1);
  pen.clipped(shank, () => {
    pen.fill(shank.map((p) => pt(p.x + 0.5, p.y + 0.8)), S.legDeep, 0.45);
    const len = Math.hypot(dx, dy);
    for (let t = 0.1; t < 1; t += 2 / Math.max(8, len)) {
      const m = pt(knee.x + (l.foot.x - knee.x) * t, knee.y + (l.foot.y - knee.y) * t);
      const n = pt(-dy / len, dx / len);
      pen.hair([pt(m.x + n.x * 1.3 * s, m.y + n.y * 1.3 * s), pt(m.x - n.x * 1.3 * s, m.y - n.y * 1.3 * s)], 0.22, S.legDeep, 0.6);
    }
  });
  pen.stroke(closed(shank), 0.55, d.ink, 0.95, false);
  foot(d, l);
  // The trousers: black feathered thighs, ragged at their lower edge.
  const ang = Math.atan2(dy, dx);
  const end = pt(l.hip.x + dx * 0.56, l.hip.y + dy * 0.56);
  const thigh = capsule(l.hip, end, 8 * s, 4 * s);
  greyPlumage(d, thigh, rng, { n: 22, size: 3, dir: () => ang, dark: () => true, base: S.black, line: 0.6, ruffle: 0.4 });
  pen.clipped(thigh, () => glaze(d, l.hip.x - 0.6, l.hip.y - 1, 2.6, 1.8, 0, S.sheen, 0.4));
}

/** Impact marks where a foot hits the ground: radiating ticks and a dust puff. */
export function impact(d: Draw, at: Pt, r: number): void {
  const { pen } = d;
  glaze(d, at.x + 1, at.y + 1, r * 1.3, r, 0, '#cdb88c', 0.5);
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2 + 0.2;
    const p0 = pt(at.x + Math.cos(a) * r * 0.8, at.y + Math.sin(a) * r * 0.8);
    const p1 = pt(at.x + Math.cos(a) * r * 1.35, at.y + Math.sin(a) * r * 1.35);
    pen.hair([p0, p1], 0.7, d.ink, 0.7);
  }
}
