import { capsule, closed, type Draw, oval, pt, shade, skin, TAU, tint } from '../kit';
import type { Pt } from '../pen';
import { PAPER_FILL } from '../palette';
import { limb } from './limb';

/**
 * A sea spider (a pycnogonid, such as Nymphon or Pycnogonum) picking its
 * way over cold pebbles, side-on and facing right: hardly any body at all,
 * a thin trunk of a few segments, each with a short side-arm carrying a
 * leg, a fat tubular proboscis out in front, a little turret with the
 * eyes on top of the head, and a stub of abdomen behind. Four pairs of
 * very long, many-jointed legs arch high over it, knobbed at every joint
 * and ending in small hooked claws. Pale peach to ochre, the joints darker.
 */
const BODY = '#e8b58e';
const OCHRE = '#c98c56';
const DARK = '#8a5634';
const LEG = '#e6b98f';
const BAND = '#b77845';

/** Hips along the trunk, front to back, and where each leg's foot comes down. */
const LEGS: readonly (readonly [number, number])[] = [[6, 36], [1.5, 15], [-3, -15], [-7.5, -34]];

/**
 * Four long legs a side, eight-jointed: a short hip, then a long thigh up to
 * a high knee, two long shin segments down, and a small foot with a hooked
 * claw; stepping slowly in alternate pairs.
 */
function legs(d: Draw, by: number, far: boolean): void {
  LEGS.forEach(([hx, fx], i) => {
    const ph = -d.f * (TAU / 3) + (i % 2) * Math.PI + (far ? Math.PI / 2 : 0);
    const step = Math.cos(ph) * 3;
    const lift = Math.max(0, Math.sin(ph)) * 4;
    const sink = far ? 2 : 0;
    const dir = Math.sign(fx);
    const hip = pt(hx + (far ? -2 : 0), by + 1.6 - sink);
    const foot = pt(fx + step + (far ? -3 : 0), d.g - lift * 0.4 - sink);
    const reach = foot.x - hip.x;
    const joints = [
      hip,
      pt(hip.x + dir * 2.4, hip.y + 0.6),
      pt(hip.x + reach * 0.36, by - 13 - lift - Math.abs(fx) * 0.05),
      pt(hip.x + reach * 0.68, by - 7 - lift * 0.8),
      pt(hip.x + reach * 0.9, d.g - 4.5 - lift * 0.6),
      pt(foot.x + dir * 1.6, foot.y - 1.2),
    ];
    limb(d, joints, { widths: [3, 2.6, 2.3, 1.9, 1.3, 0.5], wash: LEG, band: BAND, far, line: 0.85 });
    // The little hooked claw at the tip, gripping the stone.
    const tip = joints[5]!;
    d.pen.stroke([tip, pt(tip.x + dir * 0.6, foot.y + 0.4), pt(tip.x - dir * 0.4, foot.y + 0.8)], far ? 0.6 : 0.8, d.ink, far ? 0.5 : 0.9, false);
  });
}

/** The thin trunk: proboscis, head with its eye turret, three segments with their side-arms, the abdomen stub. */
function trunk(d: Draw, by: number): void {
  const { pen } = d;
  const parts: Pt[][] = [
    capsule(pt(-10, by - 0.4), pt(-16, by - 4), 2.8, 1.4),
    ...[-7.5, -3, 1.5].map((x) => oval(x, by, 3.2, 2.5, 12)),
    oval(6, by - 0.3, 3.8, 2.9, 14),
    capsule(pt(8, by + 0.2), pt(17.5, by + 2), 4.4, 2.8),
  ];
  // The eye turret on top of the head.
  const turret = [pt(4.4, by - 2), pt(4.8, by - 5.2), pt(6, by - 6), pt(7.2, by - 5.2), pt(7.6, by - 2)];
  for (const part of [...parts, turret]) {
    skin(d, part, BODY, 0.9);
    pen.clipped(part, () => tint(d, part.map((p) => pt(p.x, p.y + 1.4)), OCHRE, 0.55));
  }
  // Side-arms where the legs join, a darker knob at each.
  for (const [hx] of LEGS) {
    const arm = oval(hx, by + 1.4, 1.7, 1.3, 10);
    skin(d, arm, OCHRE, 0.7);
    pen.stroke(closed(arm), 0.6, d.ink, 0.7, false);
  }
  const proboscis = parts[parts.length - 1]!;
  shade(d, proboscis, 0.35);
  // Rings round the proboscis and the segment joins, the mouth at its tip.
  for (const x of [11, 14]) pen.hair([pt(x, by - 0.9 + (x - 8) * 0.18), pt(x - 0.3, by + 2.2 + (x - 8) * 0.18)], 0.45, DARK, 0.6);
  for (const part of [...parts, turret]) pen.stroke(closed(part), 0.85, d.ink, 0.95, false);
  pen.dot(17.2, by + 1.8, 0.6, d.ink, 0.9);
  // Two of the four eyes, dark beads on the turret.
  pen.dot(6.6, by - 4.6, 0.75, d.ink, 1);
  pen.dot(5.4, by - 4.4, 0.5, d.ink, 0.7);
  pen.dot(6.9, by - 4.9, 0.25, PAPER_FILL, 0.9);
}

export function seaSpider(d: Draw): void {
  const { pen } = d;
  pen.fill(oval(0, d.g - 1, 38, 2.4, 24), d.ink, 0.09);
  const by = d.g - 12 + [0, -0.5, 0.3][d.f]!;
  legs(d, by, true);
  // The near legs, then the trunk over their roots so the little body still shows among them.
  legs(d, by, false);
  trunk(d, by);
}
