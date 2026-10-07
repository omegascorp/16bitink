import { bezier, capsule, closed, cub, type Draw, edge, mottle, oval, pt, shade, skin, TAU, tint, tube } from '../kit';
import type { Pt } from '../pen';
import { PAPER_FILL } from '../palette';
import { limb } from './limb';

/**
 * A young green shore crab (Carcinus maenas), side-on and facing right: a
 * low, square-shouldered carapace mottled bottle-green, five saw teeth on
 * the edge behind each small sunken eye, stout claws held forward with
 * dark fingers, and short, hairy walking legs.
 */
const SHELL = '#7f9a4e';
const DARK = '#3f5a2a';
const FLANK = '#a8a24e';
const LEG = '#8ea35a';
const UNDER = '#d4b75a';

/** Four walking legs a side, short and stout, arched out low in a crouch, stepping in alternate pairs. */
function legs(d: Draw, bottom: number, far: boolean): void {
  [-54, -42, 30, 43].forEach((dx, i) => {
    const ph = -d.f * (TAU / 3) + (i % 2) * Math.PI + (far ? Math.PI / 2 : 0);
    const step = Math.cos(ph) * 3.5;
    const lift = Math.max(0, Math.sin(ph)) * 4;
    const hip = pt(dx * 0.32 + (far ? -3 : 0), bottom - 3 + (far ? -3 : 0));
    const foot = pt(dx + step + (far ? -4 : 0), d.g - lift * 0.4 - (far ? 2 : 0));
    const reach = foot.x - hip.x;
    const dir = Math.sign(reach);
    // The knee arches up level with the shoulder, so the legs splay low and wide.
    const knee = pt(hip.x + reach * 0.5, bottom - 8 - lift);
    const ankle = pt(hip.x + reach * 0.88, bottom + 2 - lift * 0.6);
    const tip = pt(foot.x + dir * 1.6, foot.y);
    limb(d, [hip, knee, ankle, tip], { widths: [5.6, 4.6, 3.2, 0.7], wash: LEG, hairs: far ? 0 : 3, far });
  });
}

/** A cheliped held forward: arm, wrist and a deep, smooth palm with dark, toothed fingers. */
function claw(d: Draw, x: number, y: number, s: number, far: boolean): void {
  const { pen } = d;
  const ink = far ? 0.55 : 1;
  const lw = far ? 0.7 : 1;
  const arm = capsule(pt(x, y), pt(x + 8 * s, y - 2 * s), 5.6 * s, 5 * s);
  const wrist = oval(x + 10 * s, y - 3 * s, 4 * s, 3.6 * s, 12);
  const palm = [
    ...cub(pt(x + 11 * s, y + 1 * s), pt(x + 10 * s, y - 8 * s), pt(x + 17 * s, y - 10 * s), pt(x + 22 * s, y - 8 * s), 10),
    ...cub(pt(x + 22 * s, y - 8 * s), pt(x + 25 * s, y - 5 * s), pt(x + 25 * s, y - 1 * s), pt(x + 22 * s, y + 1.5 * s), 6).slice(1),
    ...cub(pt(x + 22 * s, y + 1.5 * s), pt(x + 18 * s, y + 3.5 * s), pt(x + 13 * s, y + 3.5 * s), pt(x + 11 * s, y + 1 * s), 6).slice(1),
  ];
  const fixed = tube(bezier(pt(x + 21 * s, y - 0.5 * s), pt(x + 26 * s, y), pt(x + 30 * s, y - 3 * s), 8), 4.4 * s, 1 * s);
  const moving = tube(bezier(pt(x + 20 * s, y - 7 * s), pt(x + 27 * s, y - 9 * s), pt(x + 30.5 * s, y - 4 * s), 8), 3.8 * s, 1 * s);
  for (const part of [arm, wrist, palm]) {
    pen.fill(part, PAPER_FILL, 1);
    pen.fill(part, SHELL, far ? 0.85 : 0.7);
    if (far) pen.fill(part, d.ink, 0.14);
  }
  for (const f of [fixed, moving]) {
    pen.fill(f, PAPER_FILL, 1);
    pen.fill(f, DARK, far ? 0.8 : 0.75);
  }
  if (!far) {
    mottle(d, palm, 26, y - 10 * s, y + 3 * s, DARK, 0.6);
    pen.clipped(palm, () => tint(d, oval(x + 17 * s, y + 2 * s, 8 * s, 2.5 * s, 12), UNDER, 0.5));
    // Blunt teeth along the cutting edges.
    for (let k = 0; k < 4; k++) {
      const tx = x + (22 + k * 2) * s;
      pen.hair([pt(tx, y - (2.2 + k * 0.3) * s), pt(tx + 0.9 * s, y - (3.4 + k * 0.4) * s), pt(tx + 1.8 * s, y - (2.6 + k * 0.4) * s)], 0.5, PAPER_FILL, 0.7);
    }
    shade(d, palm, 0.4);
  }
  for (const part of [arm, wrist, fixed, moving, palm]) pen.stroke(closed(part), lw, d.ink, ink, false);
}

export function shoreCrab(d: Draw): void {
  const { pen } = d;
  pen.fill(oval(0, d.g - 1, 42, 3, 24), d.ink, 0.1);
  const top = d.g - 41;
  const bottom = d.g - 17;
  legs(d, bottom, true);
  claw(d, 19, bottom - 4, 1.05, true);
  // Low and square: a broad dome behind, then the front-side edge cut into five forward-pointing
  // teeth rising to the eye, and a steep front between the eyes.
  const teeth: Pt[] = [];
  for (let k = 4; k >= 0; k--) {
    const x0 = 22 - k * 5.4;
    const y0 = top + 3 + k * 0.5;
    teeth.push(pt(x0 - 4.6, y0 + 0.6), pt(x0 + 0.6, y0 - 2));
  }
  const shape = [
    ...cub(pt(-31, bottom), pt(-36, bottom - 5), pt(-36, top + 7), pt(-29, top + 3), 8),
    ...cub(pt(-29, top + 3), pt(-20, top + 1), pt(-10, top + 2.5), pt(-4.2, top + 4.6), 8).slice(1),
    ...teeth,
    pt(24, top + 2),
    pt(27, top + 1),
    pt(30, top + 2.5),
    ...cub(pt(30, top + 2.5), pt(32, top + 7), pt(33, bottom - 5), pt(29, bottom), 8).slice(1),
    ...cub(pt(29, bottom), pt(12, bottom + 2.5), pt(-14, bottom + 2.5), pt(-31, bottom), 10).slice(1),
  ];
  skin(d, shape, SHELL, 0.85);
  pen.clipped(shape, () => {
    // The yellowish flank below the side edge, then blotchy dark-green mottling over the back.
    const margin = cub(pt(-37, top + 8), pt(-12, top + 10), pt(14, top + 9), pt(33, top + 6), 14);
    tint(d, [...margin, pt(40, d.g), pt(-40, d.g)], FLANK, 0.3);
    for (let i = 0; i < 14; i++) {
      const bx = -30 + pen.rng() * 58;
      const by = top + 2 + pen.rng() * 14;
      tint(d, oval(bx, by, 2 + pen.rng() * 2.5, 1.2 + pen.rng() * 1.4, 10), DARK, 0.35);
    }
    pen.hair(margin, 0.7, d.ink, 0.55);
  });
  mottle(d, shape, 110, top, bottom, DARK, 0.55);
  shade(d, shape, 0.42);
  // The gastric and cardiac grooves.
  pen.hair(bezier(pt(-10, top + 5), pt(-4, top + 10), pt(4, top + 5), 8), 0.65, d.ink, 0.55);
  pen.hair(bezier(pt(-18, top + 6), pt(-17, top + 10), pt(-12, top + 12), 6), 0.5, d.ink, 0.45);
  // The mouth plate under the eye, and the hatched underside.
  const mouth = [pt(22, bottom - 8), pt(28, bottom - 9), pt(28.5, bottom - 1), pt(22, bottom)];
  pen.fill(mouth, UNDER, 0.6);
  pen.hair(closed(mouth), 0.55, d.ink, 0.7);
  pen.clipped(shape, () => pen.hatch([pt(-40, bottom - 3), pt(36, bottom - 3), pt(36, bottom + 4), pt(-40, bottom + 4)], 1.8, 0.35, 0.45, { color: d.ink, alpha: 0.4 }));
  edge(d, shape, 1.4);
  // A small eye sunk in its socket under the brow, barely stalked; a stub of antenna.
  const eye = oval(26.5, top + 2.6, 2.3, 2, 10);
  pen.fill(eye, d.ink, 0.92);
  pen.dot(27.2, top + 1.9, 0.6, PAPER_FILL, 0.95);
  pen.hair(bezier(pt(24, top + 0.6), pt(26.5, top - 0.6), pt(29.5, top + 0.8), 5), 0.6, d.ink, 0.8);
  pen.hair(bezier(pt(29.5, top + 4), pt(33, top + 1), pt(35, top - 3), 5), 0.5, d.ink, 0.75);
  legs(d, bottom, false);
  claw(d, 22, bottom - 2, 1.2, false);
}
