import { bezier, cub, type Draw, edge, oval, pt, shade, skin, TAU, tint } from '../kit';
import { PAPER_FILL } from '../palette';
import { limb } from './limb';

/**
 * A Namib fog-basking darkling beetle (Onymacris), side-on and facing
 * right: a round, matte-black dome of fused wing cases, tipped up behind
 * and down at the head, held high on long stilt legs.
 */
const BLACK = '#2e2d31';
const NECK = '#38363a';
const LEG = '#3d3b3f';

/** Three long stilt legs a side: the thigh slopes out, the shin drops nearly straight. */
function legs(d: Draw, far: boolean): void {
  [-13, -3, 8].forEach((hx, i) => {
    const ph = -d.f * (TAU / 3) + (i % 2) * Math.PI + (far ? Math.PI : 0);
    const lift = Math.max(0, Math.sin(ph)) * 3;
    const step = Math.cos(ph) * 3.5;
    const dir = i === 0 ? -1 : 1;
    // The hind legs are longest, so the abdomen tips up.
    const spread = [13, 6, 11][i]! * dir + (far ? -2 : 0);
    const hip = pt(hx, d.g - 21 - (i === 0 ? 2 : 0));
    const knee = pt(hx + spread * 0.75 + step * 0.4, d.g - 13 - lift - (i === 0 ? 2 : 0));
    const ankle = pt(hx + spread + step, d.g - 1.5 - lift);
    const toe = pt(ankle.x + dir * 4, d.g - lift * 0.3 - (far ? 1.5 : 0));
    limb(d, [hip, knee, ankle], { widths: [2.6, 1.8, 1.1], wash: LEG, hairs: far ? 0 : 3, far, line: 0.85 });
    d.pen.stroke([ankle, toe], far ? 0.6 : 0.85, d.ink, far ? 0.5 : 0.95, false);
    if (!far) d.pen.hair([toe, pt(toe.x + dir * 1.6, toe.y + 0.6)], 0.5, d.ink, 0.9);
  });
}

export function darkling(d: Draw): void {
  const { pen } = d;
  const g = d.g;
  pen.fill(oval(-2, g - 1, 32, 3, 24), d.ink, 0.1);
  legs(d, true);
  // The neck shield, short and broad, then a small head bowed towards the sand.
  const neck = [
    ...cub(pt(7, g - 29), pt(12, g - 31), pt(17, g - 29), pt(18, g - 24), 8),
    ...cub(pt(18, g - 24), pt(17, g - 20), pt(10, g - 19), pt(7, g - 21), 8).slice(1),
  ];
  skin(d, neck, NECK, 0.9);
  tint(d, neck, NECK, 0.55);
  pen.hair(bezier(pt(10, g - 29), pt(13, g - 30), pt(16, g - 28), 6), 0.6, PAPER_FILL, 0.3);
  shade(d, neck, 0.4);
  edge(d, neck, 1);
  // The dome: high and round, rear tipped up, the head end lower.
  const dome = [
    ...cub(pt(9, g - 25), pt(6, g - 40), pt(-18, g - 45), pt(-27, g - 32), 16),
    ...cub(pt(-27, g - 32), pt(-30, g - 27), pt(-27, g - 22), pt(-20, g - 21), 6).slice(1),
    ...cub(pt(-20, g - 21), pt(-10, g - 18), pt(3, g - 18), pt(9, g - 21), 8).slice(1),
    ...cub(pt(9, g - 21), pt(10.5, g - 22), pt(10.5, g - 24), pt(9, g - 25), 4).slice(1),
  ];
  skin(d, dome, BLACK, 0.92);
  // On black, the off-register wash leaves only a narrow grey rim of light.
  tint(d, dome, BLACK, 0.55);
  pen.clipped(dome, () => {
    // Matte: a broad, soft sheen rather than a glint, and a fine granular surface.
    tint(d, oval(-8, g - 38, 14, 5, 18), PAPER_FILL, 0.16);
    tint(d, oval(-10, g - 39, 7, 2.5, 14), PAPER_FILL, 0.14);
    pen.stipple(dome, 120, (_, y) => (y < g - 30 ? 0.45 : 0.15), 0.28, '#77757c');
    // The seam where the wing cases meet, and a faint rib each side of it.
    pen.hair(cub(pt(7, g - 36), pt(0, g - 43), pt(-16, g - 44), pt(-26, g - 33), 14), 0.6, PAPER_FILL, 0.35);
    for (const k of [4, 8]) pen.hair(cub(pt(7, g - 34 + k * 0.6), pt(0, g - 41 + k), pt(-16, g - 42 + k), pt(-26, g - 31 + k * 0.4), 14), 0.5, PAPER_FILL, 0.2);
  });
  shade(d, dome, 0.45, true);
  // The rolled edge where the case folds under.
  pen.hair(cub(pt(-24, g - 24), pt(-14, g - 21), pt(0, g - 21), pt(8, g - 23), 10), 0.6, PAPER_FILL, 0.35);
  edge(d, dome, 1.3);
  const head = oval(21, g - 20.5, 4.5, 3.8, 14);
  skin(d, head, NECK, 0.9);
  tint(d, head, NECK, 0.55);
  shade(d, head, 0.35);
  edge(d, head, 0.95);
  pen.dot(21.5, g - 22, 1.3, d.ink, 0.95);
  pen.dot(21.9, g - 22.5, 0.5, PAPER_FILL, 0.7);
  // Mouthparts: a pair of short palps.
  pen.hair(bezier(pt(24.5, g - 18.5), pt(26.5, g - 17), pt(26, g - 15), 4), 0.7, d.ink, 0.9);
  // Short, beaded antennae angled forward and down.
  const sway = [0, 1.2, -0.8][d.f]!;
  for (const far of [true, false]) {
    const o = far ? -1.5 : 0;
    const a = bezier(pt(23, g - 23), pt(28 + o, g - 27 + sway), pt(32 + o, g - 21 + sway), 14);
    pen.stroke(a, far ? 0.55 : 0.75, d.ink, far ? 0.55 : 1, false);
    for (let k = 1; k <= 7; k++) {
      const p = a[k * 2]!;
      pen.dot(p.x, p.y, (far ? 0.45 : 0.65) * (k > 5 ? 1.35 : 1), d.ink, far ? 0.5 : 0.9);
    }
  }
  legs(d, false);
}
