import { INK, PAPER, type Pt } from '../../../src/art/pen';
import { contour, path, shade, wash } from '../sharkskin/ink';
import { bake, drawProp, type Prop, SKIN } from '../sharkskin/kit';
import type { Camera, Thumb } from './story';
import { toScreen } from './story';

/**
 * A human thumb for scale, painted like the sharkskin short's hands: a skin
 * wash with a little grain, the shadow side cross-hatched, a tapering
 * outline, the nail and the knuckle's creases. Seen from the back, nail up,
 * its tip at the origin pointing left (world px). An adult thumb is about
 * 2 cm wide; the slug (3 cm) is drawn about 690 world px long, so the thumb
 * is about 460 world px wide.
 */

const SKIN_SHADE = '#c98e6c';
const SKIN_GRAIN = '#a8735a';
const NAIL = '#f1dacd';
const NAIL_BED = '#e2a99e';
const R_TIP = 215;
const R_BASE = 240;
const LENGTH = 1500;

const box = (x0: number, y0: number, x1: number, y1: number): Pt[] => [{ x: x0, y: y0 }, { x: x1, y: y0 }, { x: x1, y: y1 }, { x: x0, y: y1 }];

/** Its half-width along it, from the tip: a little fuller over the first knuckle. */
const halfAt = (x: number): number => R_TIP + ((R_BASE - R_TIP) * Math.min(1, x / LENGTH)) + 14 * Math.exp(-(((x - 640) / 220) ** 2));

/** The outline: along the top from the base to the tip, round the tip, back along the underside. */
const OUTLINE: readonly Pt[] = (() => {
  const xs = Array.from({ length: 41 }, (_, i) => LENGTH - ((LENGTH - R_TIP) * i) / 40);
  const top = xs.map((x) => ({ x, y: -halfAt(x) }));
  const cap = Array.from({ length: 23 }, (_, i) => {
    const a = -Math.PI / 2 - (Math.PI * (i + 1)) / 24;
    return { x: R_TIP + Math.cos(a) * R_TIP * 1.02, y: Math.sin(a) * halfAt(R_TIP) };
  });
  const bottom = [...xs].reverse().map((x) => ({ x, y: halfAt(x) }));
  return [...top, ...cap, ...bottom];
})();

export function makeThumb(): Prop {
  return bake(LENGTH + 60, 2 * R_BASE + 100, 20, R_BASE + 50, 29, (pen) => {
    const shape = OUTLINE;
    const under = box(-20, R_TIP * 0.3, LENGTH + 20, R_BASE + 40);
    wash(pen, shape, SKIN, SKIN_GRAIN, { region: under, colour: SKIN_SHADE, alpha: 0.5 });
    shade(pen, shape, under, 8, 0.8, 0.42, box(-20, R_TIP * 0.68, LENGTH + 20, R_BASE + 40));
    // Light from above: a soft paler stripe along the top.
    pen.clipped(shape, () => pen.fill(box(-20, -R_BASE, LENGTH + 20, -R_TIP * 0.45), '#fbe6d2', 0.5));
    // The knuckle's creases, bowed towards the tip, and fainter ones further back.
    for (const [x, a] of [[610, 0.6], [650, 0.5], [700, 0.35], [1200, 0.28], [1240, 0.22]] as const) {
      const h = halfAt(x) * 0.62;
      pen.stroke(path({ x: x + 26, y: -h }, [{ x: x - 24, y: 0 }, { x: x + 26, y: h }]), 3, INK, a, false);
    }
    // The nail: pale pink on its bed, a half moon at its root, a thin free edge at the tip.
    const nail = path({ x: 300, y: -124 }, [{ x: 110, y: -146 }, { x: 34, y: -104 }], [{ x: 10, y: 0 }, { x: 34, y: 104 }], [{ x: 110, y: 146 }, { x: 300, y: 124 }], [{ x: 324, y: 0 }, { x: 300, y: -124 }]);
    pen.fill(nail, NAIL, 1);
    pen.clipped(nail, () => {
      pen.fill(box(44, -160, 300, 160), NAIL_BED, 0.22);
      pen.fill(path({ x: 304, y: -92 }, [{ x: 246, y: 0 }, { x: 304, y: 92 }]), PAPER, 0.55);
      pen.fill(box(0, -160, 30, 160), '#fbf3ea', 0.9);
      pen.hatch(nail, 10, 0.15, 1, { color: '#b77a6c', alpha: 0.14 });
    });
    pen.stroke([...nail, nail[0]!], 3, INK, 0.85);
    // The skin folds along its sides and over its root.
    pen.stroke(path({ x: 312, y: -138 }, [{ x: 160, y: -168 }, { x: 60, y: -138 }]), 2.4, INK, 0.45, false);
    pen.stroke(path({ x: 312, y: 138 }, [{ x: 160, y: 168 }, { x: 60, y: 138 }]), 2.4, INK, 0.45, false);
    pen.stroke(path({ x: 330, y: -128 }, [{ x: 354, y: 0 }, { x: 330, y: 128 }]), 2.6, INK, 0.55, false);
    pen.hair([{ x: 80, y: -96 }, { x: 150, y: -116 }, { x: 250, y: -106 }], 3, '#ffffff', 0.7);
    contour(pen, shape, 4, 6.5, 0.45);
  });
}

/** Stamps the thumb with its tip at the thumb's place, pointing its way. */
export function drawThumb(ctx: CanvasRenderingContext2D, prop: Prop, th: Thumb, cam: Camera, boil: number): void {
  const at = toScreen(cam, th);
  // The drawing points left (angle π): turn it by the difference.
  drawProp(ctx, prop, boil, at.x, at.y, { scale: cam.zoom, rot: th.angle - Math.PI });
}
