import { bezier, capsule, closed, type Draw, edge, mottle, oval, pt, shade, skin, TAU, tint } from '../kit';
import type { Pt } from '../pen';
import { PAPER_FILL } from '../palette';
import { limb } from './limb';

/**
 * A sea slater (Ligia), side-on and facing right: a long, arched back of
 * seven overlapping plates with flared, scalloped edges, a short tail
 * section, big compound eyes, long jointed antennae and forked tail prongs.
 */
const BODY = '#8d887b';
const HEAD = '#7a7569';
const DARK = '#4a463e';
const LEGS = '#a39d8e';

const FRONT = 26;
const WAIST = -16;
const TAIL = -31;
/** Plate boundaries, front to back: seven body plates, then five short tail rings. */
const SEAMS = [FRONT - 2, 19, 13, 7, 1, -5, -10.5, WAIST, -19, -22, -25, -28];

export function slater(d: Draw): void {
  const { pen } = d;
  pen.fill(oval(-2, d.g - 1, 40, 3, 24), d.ink, 0.1);
  const bottom = d.g - 7;
  const top = d.g - 27;
  // The arched back, stepping down where the narrower tail section begins.
  const back = (x: number): number => (x > WAIST ? top + 10 * ((x - 4) / 26) ** 2 : top + 6 + ((WAIST - x) / (WAIST - TAIL)) ** 1.5 * 6);
  const legs = (far: boolean): void => {
    for (let i = 0; i < 7; i++) {
      const x = SEAMS[i + 1]! + 2 + (far ? 2 : 0);
      const ph = -d.f * (TAU / 3) + i * 0.9 + (far ? Math.PI : 0);
      const step = Math.cos(ph) * 2.5;
      const lift = Math.max(0, Math.sin(ph)) * 2;
      const rake = (i - 3) * 1.2;
      const hip = pt(x, bottom - 1);
      const knee = pt(x + rake * 0.5 + step * 0.3, bottom + 2.5 - lift);
      const ankle = pt(x + rake + step * 0.7 - 1.5, d.g - 2.5 - lift);
      const tip = pt(x + rake * 1.3 + step - 3, d.g - lift * 0.6 - (far ? 1 : 0));
      limb(d, [hip, knee, ankle, tip], { widths: [2, 1.6, 1.1, 0.4], wash: LEGS, far, line: 0.8 });
    }
  };
  legs(true);
  // Head, with a big faceted eye.
  const head = oval(FRONT + 3, bottom - 4.5, 4.8, 4.4, 14);
  skin(d, head, HEAD, 0.8);
  shade(d, head, 0.4);
  edge(d, head, 1);
  const eyeShape = oval(FRONT + 4.4, bottom - 6.4, 2.5, 2.2, 12);
  pen.fill(eyeShape, d.ink, 0.88);
  pen.clipped(eyeShape, () => {
    for (let k = 0; k < 8; k++) pen.dot(FRONT + 2.2 + pen.rng() * 4.4, bottom - 8.6 + pen.rng() * 4.4, 0.3, PAPER_FILL, 0.35);
  });
  pen.dot(FRONT + 5.1, bottom - 7.2, 0.6, PAPER_FILL, 0.95);
  // Outline: the back from tail to head, then a scalloped lower edge where each plate flares into a backward point.
  const topEdge: Pt[] = [];
  for (let x = TAIL; x <= FRONT; x += 2) topEdge.push(pt(x, back(x)));
  const nose = bezier(pt(FRONT, back(FRONT)), pt(FRONT + 4, bottom - 8), pt(FRONT, bottom - 1), 6).slice(1);
  const scallops: Pt[] = [];
  for (let i = 0; i < SEAMS.length - 1; i++) {
    const [a, b] = [SEAMS[i]!, SEAMS[i + 1]!];
    const y = i < 7 ? bottom : bottom - 1.5 - (i - 7) * 0.6;
    scallops.push(pt(a, y - 0.5), pt(b - (a - b) * 0.15, y + (i < 7 ? 2 : 1.2)));
  }
  const body = [...topEdge, ...nose, ...scallops, pt(TAIL, bottom - 5)];
  skin(d, body, BODY, 0.75);
  mottle(d, body, 70, top, bottom, DARK, 0.55);
  pen.clipped(body, () => {
    SEAMS.slice(1).forEach((x, i) => {
      const y0 = back(x) - 2;
      // A seam, the pale lip along the rear edge of the plate in front, and a pale patch on the flank.
      pen.stroke(bezier(pt(x - 1.5, y0), pt(x + 1, (y0 + bottom) / 2), pt(x - 0.5, bottom + 3), 8), i < 7 ? 0.8 : 0.6, d.ink, 0.75, false);
      pen.hair(bezier(pt(x + 1, y0 + 1), pt(x + 3, (y0 + bottom) / 2), pt(x + 1.8, bottom), 6), 0.9, PAPER_FILL, 0.5);
      if (i < 6) tint(d, oval(x + 3, bottom - 5, 1.6, 1.1, 8), PAPER_FILL, 0.4);
    });
    // The side flange: a line along the flared edges of the plates.
    pen.hair(bezier(pt(WAIST, bottom - 3), pt(4, bottom - 4.5), pt(FRONT - 1, bottom - 3), 10), 0.55, d.ink, 0.55);
  });
  shade(d, body, 0.45);
  edge(d, body, 1.2);
  // Forked tail prongs on a short base.
  const base = capsule(pt(TAIL + 1, bottom - 4), pt(TAIL - 4, bottom - 5), 2.4, 2);
  pen.fill(base, PAPER_FILL, 1);
  pen.fill(base, BODY, 0.7);
  pen.stroke(closed(base), 0.8, d.ink, 1, false);
  for (const dy of [-2.5, 1.5]) pen.stroke(bezier(pt(TAIL - 4, bottom - 5), pt(TAIL - 9, bottom - 5 + dy), pt(TAIL - 15, bottom - 6 + dy * 1.8), 6), 1.1, d.ink, 0.95, false);
  // The long antennae: three stout basal joints, then a whip of many small segments sweeping back.
  const sway = [0, 2, -1][d.f]!;
  for (const far of [true, false]) {
    const o = far ? -1.5 : 0;
    const j = [pt(FRONT + 6.5, bottom - 6 + o), pt(FRONT + 10.5, bottom - 10 + o), pt(FRONT + 14.5, bottom - 14 + o), pt(FRONT + 18.5, bottom - 17 + o)];
    limb(d, j, { widths: [1.9, 1.6, 1.3, 1], wash: LEGS, far, line: 0.8 });
    const whip = bezier(j[3]!, pt(FRONT + 30, top - 10 + sway + o), pt(FRONT + 34 + (far ? -3 : 0), top + 4 + sway), 16);
    pen.stroke(whip, far ? 0.6 : 0.8, d.ink, far ? 0.55 : 1, false);
    if (!far) for (let k = 1; k < whip.length - 1; k += 1) pen.dot(whip[k]!.x, whip[k]!.y, 0.55, d.ink, 0.6);
  }
  legs(false);
}
