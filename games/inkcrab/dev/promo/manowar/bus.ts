import { edges } from '../../../src/art/backdrop/common';
import { type Draw, cub, edge, glint, oval, pt, shade, skin, tint } from '../../../src/art/kit';
import type { Pt } from '../../../src/art/pen';
import { PAPER_FILL, RED } from '../../../src/art/palette';

/**
 * A single-decker bus parked side-on, drawn with the game's pen kit like the
 * boats and buildings behind its beaches: a yellow body with a red stripe, a
 * row of windows, the door and windscreen at the front (right), two wheels.
 * Screen px: from its back (x0) to its front bumper (x1), standing on `bottom`.
 */
const PAINT = '#efc24b';
const GLASS = '#a9cbe0';
const TYRE = '#2b2c35';
const HUB = '#c9ccd2';

export function drawBus(d: Draw, x0: number, x1: number, bottom: number): void {
  const { pen } = d;
  const len = x1 - x0;
  const h = len * 0.27;
  const top = bottom - h;
  const sill = bottom - 18;
  // The body: square at the back, its front nose sloping back to the roof.
  const body: Pt[] = edges([
    pt(x0, sill), pt(x0, top + 16), ...cub(pt(x0, top + 16), pt(x0, top + 4), pt(x0 + 6, top), pt(x0 + 20, top), 6).slice(1),
    pt(x1 - 70, top), ...cub(pt(x1 - 70, top), pt(x1 - 30, top), pt(x1 - 12, top + 20), pt(x1 - 6, top + 70), 8).slice(1),
    pt(x1, sill - 6), pt(x1, sill),
  ], 6);
  pen.fill(oval((x0 + x1) / 2, bottom + 2, len * 0.52, 10, 28), d.ink, 0.16);
  // The wheel arches, dark behind the wheels.
  const wheels = [x0 + len * 0.17, x1 - len * 0.2];
  skin(d, body, PAINT, 0.88);
  pen.clipped(body, () => {
    pen.fill([pt(x0, sill - 34), pt(x1, sill - 34), pt(x1, sill - 22), pt(x0, sill - 22)], RED, 0.75);
    pen.fill([pt(x0, sill - 12), pt(x1, sill - 12), pt(x1, sill + 2), pt(x0, sill + 2)], '#b88f2e', 0.45);
    shade(d, body, 0.28);
  });
  for (const x of wheels) pen.fill(oval(x, sill, 44, 40, 24).filter((p) => p.y <= sill + 1), '#3a3530', 0.85);
  edge(d, body, 2.2, 0.95);
  // Side windows, the door, the windscreen.
  const winTop = top + 22;
  const winBot = top + h * 0.48;
  const panes: Pt[][] = [];
  for (let k = 0; k < 6; k++) {
    const a = x0 + 26 + k * ((len - 210) / 6);
    const b = a + (len - 210) / 6 - 12;
    panes.push(edges([pt(a, winTop), pt(b, winTop), pt(b, winBot), pt(a, winBot)], 5));
  }
  const doorA = x1 - 168;
  const door = edges([pt(doorA, winTop), pt(doorA + 52, winTop), pt(doorA + 52, sill - 4), pt(doorA, sill - 4)], 5);
  const screen = edges([pt(x1 - 106, winTop), pt(x1 - 64, winTop - 2), ...cub(pt(x1 - 64, winTop - 2), pt(x1 - 30, winTop), pt(x1 - 18, winTop + 24), pt(x1 - 12, winBot + 4), 6).slice(1), pt(x1 - 106, winBot + 4)], 5);
  for (const pane of [...panes, screen]) {
    skin(d, pane, GLASS, 0.75);
    const [a, , c] = [pane[0]!, pane[1]!, pane[Math.floor(pane.length / 2)]!];
    glint(d, [pt(a.x + 10, c.y - 6), pt(a.x + 34, a.y + 8)], 2.4, 0.7);
    edge(d, pane, 1.4, 0.9);
  }
  skin(d, door, GLASS, 0.6);
  pen.hair([pt(doorA + 26, winTop + 2), pt(doorA + 26, sill - 6)], 1.2, d.ink, 0.7);
  pen.fill([pt(doorA + 2, winBot + 30), pt(doorA + 50, winBot + 30), pt(doorA + 50, sill - 6), pt(doorA + 2, sill - 6)], PAINT, 0.55);
  edge(d, door, 1.6, 0.95);
  // Lights, a mirror, the wheels.
  pen.fill(oval(x1 - 8, sill - 22, 6, 8, 12), PAPER_FILL, 0.95);
  pen.hair([...oval(x1 - 8, sill - 22, 6, 8, 12), pt(x1 - 2, sill - 22)], 1, d.ink, 0.8);
  pen.fill(oval(x0 + 5, sill - 24, 4, 9, 12), RED, 0.8);
  pen.stroke([pt(x1 - 40, top + 12), pt(x1 - 22, top + 6), pt(x1 - 18, top + 30)], 3, d.ink, 0.85, false);
  for (const x of wheels) {
    const tyre = oval(x, bottom - 26, 30, 30, 24);
    pen.fill(tyre, TYRE, 0.95);
    const hub = oval(x, bottom - 26, 13, 13, 16);
    skin(d, hub, HUB, 0.8);
    tint(d, oval(x - 4, bottom - 30, 4, 3, 8), PAPER_FILL, 0.7);
    edge(d, hub, 1.1);
    edge(d, tyre, 1.6);
  }
}
