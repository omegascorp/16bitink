import { createRng } from '../logic/rng';
import { outline } from './groundKit';
import { closed, type Draw, oval, pt } from './kit';
import { FLAME, glow, GLOW, GLOW_DEEP, MOONSTONE, MOONSTONE_DEEP, NIGHT_SKY } from './nightKit';
import { PAPER_FILL } from './palette';
import type { Pt } from './pen';
import { mix, rgba } from './wash';

/**
 * A little garden lantern in the night garden, seen from above and a touch
 * in front: an iron lamp with a hipped roof and a ring to hang it by, on a
 * short post set in a stone block, its panes glowing warm round a flame (or
 * dark and catching the moon when unlit). About 44 units tall, centred in a
 * GARDEN_LANTERN_FRAME square with room for its glow.
 */
export const GARDEN_LANTERN_FRAME = 84;
const IRON = '#2c2f3b';
const IRON_LIT = '#6b7286';
const PANE_DARK = '#27324c';

const rect = (x0: number, y0: number, x1: number, y1: number): Pt[] => [pt(x0, y0), pt(x1, y0), pt(x1, y1), pt(x0, y1)];

/** The lantern centred at 0,0 (its light box), lit or not. */
export function drawGardenLantern(d: Draw, lit: boolean): void {
  const { pen } = d;
  const { ctx } = pen;
  const rng = createRng(1907);
  if (lit) {
    glow(ctx, pt(0, -1), 40, 0.5);
    ctx.save();
    ctx.translate(0, 17);
    ctx.scale(1, 0.42);
    glow(ctx, pt(0, 0), 30, 0.55);
    ctx.restore();
  }
  // Its moon-shadow on the ground, falling down and right.
  pen.fill(oval(7, 19.5, 15, 4.6, 24), NIGHT_SKY, 0.35);
  // The stone block it stands in: its lit top, then its front face.
  const top = outline(rect(-11, 12.5, 11, 16.5), 4);
  const face = outline(rect(-11, 16.5, 11, 21), 4);
  pen.fill(face, PAPER_FILL, 1);
  pen.fill(face, MOONSTONE_DEEP, 0.85);
  pen.fill(top, PAPER_FILL, 1);
  pen.fill(top, lit ? mix(MOONSTONE, GLOW, 0.45) : MOONSTONE, 0.9);
  pen.stipple(face.concat(top), 26, () => 0.6, 0.4, MOONSTONE_DEEP);
  pen.hatch(face, 1.8, 1.1, 0.4, { color: d.ink, alpha: 0.45 });
  pen.stroke(closed(top), 0.8, d.ink, 0.9, false);
  pen.stroke(closed(face), 0.9, d.ink, 0.9, false);
  // The post.
  const post = outline(rect(-2.4, 4.5, 2.4, 13.5), 3);
  pen.fill(post, IRON, 1);
  pen.fill(outline(rect(-2.4, 4.5, -0.6, 13.5), 3), IRON_LIT, 0.6);
  pen.stroke(closed(post), 0.7, d.ink, 0.9, false);
  // The light box: two panes on the face towards us, an iron frame.
  const box = outline(rect(-9, -8, 9, 6), 3);
  pen.fill(box, IRON, 1);
  const panes = [rect(-7.4, -6.6, -0.9, 4.6), rect(0.9, -6.6, 7.4, 4.6)];
  for (const [i, p] of panes.entries()) {
    const pane = outline(p, 2);
    if (lit) {
      const g = ctx.createRadialGradient(0, 0, 0.5, 0, 0, 10);
      g.addColorStop(0, rgba(FLAME, 1));
      g.addColorStop(0.45, rgba(GLOW, 1));
      g.addColorStop(1, rgba(GLOW_DEEP, 1));
      pen.clipped(pane, () => {
        ctx.fillStyle = g;
        ctx.fillRect(-9, -8, 18, 14);
      });
    } else {
      pen.fill(pane, PANE_DARK, 1);
      pen.hair([pt(p[0]!.x + 1.2, p[2]!.y - 2), pt(p[1]!.x - 1.6, p[0]!.y + 2.5)], 0.6, '#9fb0cf', i === 0 ? 0.7 : 0.4);
    }
  }
  if (lit) {
    // The flame between the panes, seen through the glass.
    const flame = [pt(0, -5), pt(1.8, -1.2), pt(1.4, 1.6), pt(0, 2.6), pt(-1.4, 1.6), pt(-1.8, -1.2)];
    pen.fill(flame, FLAME, 1);
    pen.fill(oval(0, 0.6, 0.9, 1.4, 8), '#ffffff', 1);
  }
  pen.fill(outline(rect(-9, -8, -7.4, 6), 3), IRON_LIT, 0.55);
  pen.stroke(closed(box), 1, d.ink, 0.95, false);
  // The hipped roof: its eaves overhang the box; the face towards the moon pale, the far one dark and hatched.
  const eaveL = pt(-14, -7.5);
  const eaveR = pt(14, -7.5);
  const peakL = pt(-3, -18.5);
  const peakR = pt(3, -18.5);
  const roof = [eaveL, eaveR, peakR, peakL];
  const left = [eaveL, pt(0, -7.5), pt(0, -18.5), peakL];
  const right = [pt(0, -7.5), eaveR, peakR, pt(0, -18.5)];
  pen.fill(roof.map((p) => pt(p.x + 4, p.y + 4)), NIGHT_SKY, 0.25);
  pen.fill(roof, PAPER_FILL, 1);
  pen.fill(roof, IRON, 0.92);
  pen.fill(left, IRON_LIT, 0.65);
  pen.fill([pt(-12.5, -8.8), pt(-1, -8.8), pt(-1, -10.5), pt(-11, -10.5)], '#a9b3c8', 0.35);
  pen.hatch(right, 1.6, 0.95, 0.4, { color: '#0d0f18', alpha: 0.6 });
  if (lit) pen.stroke([pt(-13, -7.2), pt(13, -7.2)], 1.6, GLOW, 0.7, false);
  pen.hair([pt(0, -8), pt(0, -18.2)], 0.6, d.ink, 0.8);
  for (let k = 0; k < 4; k++) {
    const x = -11 + k * 3 + rng() * 0.5;
    pen.hair([pt(x, -8.4), pt(x * 0.3 - 0.6, -17.6)], 0.35, PAPER_FILL, 0.3);
  }
  pen.stroke(outline(roof, 3), 1.1, d.ink, 0.95, false);
  // The finial and the ring it hangs by.
  pen.fill(oval(0, -20.5, 2.4, 2.1, 12), IRON, 1);
  pen.dot(-0.8, -21.2, 0.7, IRON_LIT, 0.9);
  pen.hair(closed(oval(0, -20.5, 2.4, 2.1, 12)), 0.6, d.ink, 0.9);
  pen.hair(closed(oval(0, -24.4, 2, 1.7, 12)), 0.8, d.ink, 0.9);
}
