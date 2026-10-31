import { ellipse, type Pen, type Pt } from './pen';

/**
 * The ruins of the chapters still being drawn, in pencil: an outline and a
 * little hatching each, by chapter index (1 = the Volcano Shrine … 4 = the
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

/** The dragon's mountain, a wing over its peak and a heap of gold at its door. */
const hoard: Draw = (pen, x, y) => {
  const mount = [{ x: x - 130, y: y + 60 }, { x: x - 40, y: y - 70 }, { x: x + 10, y: y - 40 }, { x: x + 60, y: y - 80 }, { x: x + 130, y: y + 60 }];
  line(pen, mount);
  shade(pen, [mount[2]!, mount[3]!, mount[4]!, { x: x + 10, y: y + 60 }], 1.1);
  line(pen, [{ x: x + 30, y: y - 100 }, { x: x + 60, y: y - 130 }, { x: x + 76, y: y - 104 }, { x: x + 96, y: y - 128 }, { x: x + 104, y: y - 98 }, { x: x + 60, y: y - 92 }], 1.2, 0.7);
  line(pen, [{ x: x - 20, y: y + 60 }, { x: x - 20, y: y + 30 }, { x: x, y: y + 18 }, { x: x + 20, y: y + 30 }, { x: x + 20, y: y + 60 }]);
  for (let k = 0; k < 6; k++) line(pen, ellipse(x - 40 + k * 6, y + 56 - (k % 3) * 4, 5, 3, 10), 0.9, 0.6);
};

const DRAFTS: readonly Draw[] = [volcano, tomb, monastery, hoard];

export function paintDraftRuin(pen: Pen, chapter: number, at: Pt): void {
  DRAFTS[(chapter - 1) % DRAFTS.length]?.(pen, at.x, at.y);
}
