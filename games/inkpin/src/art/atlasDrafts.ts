import { ellipse, type Pen, type Pt } from './pen';

/**
 * The ruins of the chapters still being drawn, in pencil: an outline and a
 * little hatching each, by chapter index (1 = the Volcano Shrine … 9 = the
 * Dragon's Hoard). Each is about 260 × 170 px, its base at `at.y + 60`.
 */

const LEAD = '#8a8578';

type Draw = (pen: Pen, x: number, y: number) => void;

const line = (pen: Pen, pts: readonly Pt[], w = 1.3, a = 0.75): void => pen.hair(pts, w, LEAD, a);
const shade = (pen: Pen, shape: readonly Pt[], angle = 0.8): void => pen.hatch(shape, 5, angle, 0.6, { color: LEAD, alpha: 0.4 });
const ground = (pen: Pen, x: number, y: number, w: number): void => line(pen, [{ x: x - w, y: y + 60 }, { x: x - w * 0.3, y: y + 56 }, { x: x + w * 0.4, y: y + 61 }, { x: x + w, y: y + 58 }], 1.1, 0.6);

/** A smoking volcano with a small shrine at its foot. */
const volcano: Draw = (pen, x, y) => {
  const cone = [{ x: x - 120, y: y + 60 }, { x: x - 34, y: y - 60 }, { x: x - 14, y: y - 52 }, { x: x + 12, y: y - 58 }, { x: x + 34, y: y - 62 }, { x: x + 120, y: y + 60 }];
  line(pen, cone);
  shade(pen, [...cone.slice(3), { x: x + 30, y: y + 60 }], 1.1);
  for (let k = 0; k < 3; k++) line(pen, ellipse(x + 4 + k * 10, y - 80 - k * 22, 14 + k * 4, 10 + k * 3, 14), 1, 0.55);
  line(pen, [{ x: x - 70, y: y + 60 }, { x: x - 70, y: y + 36 }, { x: x - 56, y: y + 26 }, { x: x - 42, y: y + 36 }, { x: x - 42, y: y + 60 }]);
};

/** A pyramid in the dunes, with an obelisk. */
const tomb: Draw = (pen, x, y) => {
  const pyr = [{ x: x - 110, y: y + 58 }, { x: x - 10, y: y - 70 }, { x: x + 90, y: y + 58 }];
  line(pen, [...pyr, pyr[0]!]);
  shade(pen, [pyr[1]!, pyr[2]!, { x: x + 10, y: y + 58 }], 1.2);
  line(pen, [{ x: x + 110, y: y + 58 }, { x: x + 110, y: y - 20 }, { x: x + 116, y: y - 32 }, { x: x + 122, y: y - 20 }, { x: x + 122, y: y + 58 }]);
  line(pen, [{ x: x - 140, y: y + 60 }, { x: x - 90, y: y + 44 }, { x: x - 40, y: y + 60 }], 1.1, 0.6);
};

/** A monastery of stacked roofs on a snowy peak. */
const monastery: Draw = (pen, x, y) => {
  line(pen, [{ x: x - 130, y: y + 60 }, { x: x - 30, y: y - 40 }, { x: x + 10, y: y - 10 }, { x: x + 50, y: y - 50 }, { x: x + 130, y: y + 60 }]);
  line(pen, [{ x: x - 52, y: y - 18 }, { x: x - 30, y: y - 40 }, { x: x - 12, y: y - 22 }], 1, 0.6);
  for (let k = 0; k < 3; k++) {
    const w = 46 - k * 10;
    const by = y + 30 - k * 26;
    line(pen, [{ x: x - w, y: by }, { x: x - w * 0.6, y: by - 12 }, { x: x + w * 0.6, y: by - 12 }, { x: x + w, y: by }]);
    line(pen, [{ x: x - w * 0.6, y: by }, { x: x - w * 0.6, y: by + 14 }], 1, 0.6);
    line(pen, [{ x: x + w * 0.6, y: by }, { x: x + w * 0.6, y: by + 14 }], 1, 0.6);
  }
};

/** The alchemist's crooked tower, topped with a great flask. */
const alchemist: Draw = (pen, x, y) => {
  const tower = [{ x: x - 28, y: y + 60 }, { x: x - 22, y: y - 20 }, { x: x + 24, y: y - 24 }, { x: x + 30, y: y + 60 }];
  line(pen, tower);
  shade(pen, tower, 0.6);
  line(pen, [...ellipse(x + 2, y - 48, 24, 24, 18), ellipse(x + 2, y - 48, 24, 24, 18)[0]!]);
  line(pen, [{ x: x - 6, y: y - 72 }, { x: x - 6, y: y - 92 }, { x: x + 10, y: y - 92 }, { x: x + 10, y: y - 72 }]);
  for (let k = 0; k < 3; k++) line(pen, ellipse(x + 16 + k * 8, y - 104 - k * 14, 4 + k, 4 + k, 10), 1, 0.5);
  ground(pen, x, y, 120);
};

/** A citadel wall with a great gear over its gate. */
const citadel: Draw = (pen, x, y) => {
  const wall = [{ x: x - 120, y: y + 60 }, { x: x - 120, y: y - 10 }, { x: x + 120, y: y - 10 }, { x: x + 120, y: y + 60 }];
  line(pen, wall);
  for (let bx = x - 120; bx < x + 120; bx += 24) line(pen, [{ x: bx, y: y - 10 }, { x: bx, y: y - 22 }, { x: bx + 12, y: y - 22 }, { x: bx + 12, y: y - 10 }], 1, 0.65);
  const teeth: Pt[] = [];
  for (let k = 0; k < 24; k++) {
    const a = (k / 24) * Math.PI * 2;
    const r = k % 2 ? 36 : 44;
    teeth.push({ x: x + Math.cos(a) * r, y: y - 54 + Math.sin(a) * r });
  }
  line(pen, [...teeth, teeth[0]!]);
  line(pen, [...ellipse(x, y - 54, 12, 12, 12), ellipse(x, y - 54, 12, 12, 12)[0]!]);
  line(pen, [{ x: x - 18, y: y + 60 }, { x: x - 18, y: y + 26 }, { x, y: y + 16 }, { x: x + 18, y: y + 26 }, { x: x + 18, y: y + 60 }]);
};

/** A giant tree with huts and a rope bridge in its crown. */
const canopy: Draw = (pen, x, y) => {
  line(pen, [{ x: x - 20, y: y + 60 }, { x: x - 14, y: y - 30 }], 1.6);
  line(pen, [{ x: x + 20, y: y + 60 }, { x: x + 14, y: y - 30 }], 1.6);
  for (const [cx, cy, r] of [[x - 50, y - 60, 46], [x + 40, y - 70, 52], [x - 4, y - 104, 44]] as const) line(pen, [...ellipse(cx, cy, r, r * 0.7, 18), ellipse(cx, cy, r, r * 0.7, 18)[0]!], 1.1, 0.6);
  for (const hx of [x - 60, x + 56]) line(pen, [{ x: hx - 14, y: y - 30 }, { x: hx - 14, y: y - 46 }, { x: hx, y: y - 58 }, { x: hx + 14, y: y - 46 }, { x: hx + 14, y: y - 30 }, { x: hx - 14, y: y - 30 }]);
  line(pen, [{ x: x - 46, y: y - 36 }, { x: x, y: y - 26 }, { x: x + 42, y: y - 36 }], 1, 0.6);
};

/** A rock arch over the sea with a wrecked ship's mast inside. */
const seaCave: Draw = (pen, x, y) => {
  const arch = [{ x: x - 120, y: y + 50 }, { x: x - 100, y: y - 40 }, { x: x - 30, y: y - 74 }, { x: x + 50, y: y - 60 }, { x: x + 110, y: y - 10 }, { x: x + 120, y: y + 50 }];
  line(pen, arch);
  line(pen, [{ x: x - 70, y: y + 50 }, { x: x - 60, y: y - 6 }, { x: x - 10, y: y - 30 }, { x: x + 40, y: y - 16 }, { x: x + 70, y: y + 50 }], 1.1, 0.6);
  shade(pen, [arch[0]!, arch[1]!, arch[2]!, { x: x - 60, y: y - 6 }, { x: x - 70, y: y + 50 }], 0.9);
  line(pen, [{ x: x, y: y + 44 }, { x: x + 4, y: y - 14 }]);
  line(pen, [{ x: x + 4, y: y - 10 }, { x: x + 26, y: y + 6 }, { x: x + 3, y: y + 12 }], 1, 0.6);
  for (let k = 0; k < 4; k++) line(pen, [{ x: x - 130 + k * 70, y: y + 62 }, { x: x - 112 + k * 70, y: y + 56 }, { x: x - 94 + k * 70, y: y + 62 }], 1, 0.5);
};

/** A castle on a cloud. */
const cloudFort: Draw = (pen, x, y) => {
  for (const [cx, cy, r] of [[x - 70, y + 34, 34], [x - 20, y + 22, 42], [x + 40, y + 26, 38], [x + 86, y + 38, 26]] as const) line(pen, ellipse(cx, cy, r, r * 0.6, 16).slice(8, 17), 1.2, 0.6);
  for (const [tx, h] of [[x - 50, 70], [x, 96], [x + 50, 70]] as const) {
    line(pen, [{ x: tx - 14, y: y + 12 }, { x: tx - 14, y: y + 12 - h }, { x: tx + 14, y: y + 12 - h }, { x: tx + 14, y: y + 12 }]);
    line(pen, [{ x: tx - 18, y: y + 12 - h }, { x: tx, y: y - 12 - h }, { x: tx + 18, y: y + 12 - h }]);
  }
  line(pen, [{ x: x - 36, y: y - 20 }, { x: x + 36, y: y - 20 }], 1.1, 0.65);
};

/** The dragon's mountain, a wing over its peak and a heap of gold at its door. */
const hoard: Draw = (pen, x, y) => {
  const mount = [{ x: x - 130, y: y + 60 }, { x: x - 40, y: y - 70 }, { x: x + 10, y: y - 40 }, { x: x + 60, y: y - 80 }, { x: x + 130, y: y + 60 }];
  line(pen, mount);
  shade(pen, [mount[2]!, mount[3]!, mount[4]!, { x: x + 10, y: y + 60 }], 1.1);
  line(pen, [{ x: x + 30, y: y - 100 }, { x: x + 60, y: y - 130 }, { x: x + 76, y: y - 104 }, { x: x + 96, y: y - 128 }, { x: x + 104, y: y - 98 }, { x: x + 60, y: y - 92 }], 1.2, 0.7);
  line(pen, [{ x: x - 20, y: y + 60 }, { x: x - 20, y: y + 30 }, { x: x, y: y + 18 }, { x: x + 20, y: y + 30 }, { x: x + 20, y: y + 60 }]);
  for (let k = 0; k < 6; k++) line(pen, ellipse(x - 40 + k * 6, y + 56 - (k % 3) * 4, 5, 3, 10), 0.9, 0.6);
};

const DRAFTS: readonly Draw[] = [volcano, tomb, monastery, alchemist, citadel, canopy, seaCave, cloudFort, hoard];

export function paintDraftRuin(pen: Pen, chapter: number, at: Pt): void {
  DRAFTS[(chapter - 1) % DRAFTS.length]?.(pen, at.x, at.y);
}
