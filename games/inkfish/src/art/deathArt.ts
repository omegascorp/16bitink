import { ellipse, INK, Pen, type Pt } from './pen';
import { ART_RES } from './propArt';

const BONE = '#fffaf0';

/** Texture sizes at in-game scale (textures are ART_RES times larger). */
export const BONES_SIZE = { w: 160, h: 80 } as const;
export const PAN_SIZE = { w: 240, h: 150 } as const;

function closedEllipse(cx: number, cy: number, rx: number, ry: number, steps = 32): Pt[] {
  const pts = ellipse(cx, cy, rx, ry, steps);
  return [...pts, pts[0]!];
}

/** A picked-clean fish skeleton, head to the right: what's left after a bigger fish eats you. */
export function drawBones(ctx: CanvasRenderingContext2D, seed: number): void {
  const pen = new Pen(ctx, seed, 0.45);
  const s = ART_RES;
  const P = (x: number, y: number): Pt => ({ x: x * s, y: y * s });
  const spineY = (x: number): number => 40 + Math.sin(x / 26) * 1.5;

  // Skull: a rounded wedge with an empty eye socket and an open jaw.
  const skull = [P(112, 40), P(116, 25), P(132, 22), P(148, 30), P(154, 39), P(146, 44), P(150, 50), P(134, 56), P(116, 54)];
  pen.fill(skull, BONE, 1);
  pen.stroke([...skull, skull[0]!], 1.3 * s);
  pen.hair([P(146, 44), P(136, 43)], 0.6 * s, INK, 0.8);
  pen.stroke(closedEllipse(134 * s, 33 * s, 5 * s, 5 * s, 14), 0.9 * s, INK, 1, false);
  pen.hair([P(131, 30), P(137, 36)], 0.6 * s, INK, 0.9);
  pen.hair([P(137, 30), P(131, 36)], 0.6 * s, INK, 0.9);
  pen.hair([P(120, 28), P(118, 50)], 0.5 * s, INK, 0.5);

  // Spine with vertebra ticks, and ribs that shrink towards the tail.
  const spine = Array.from({ length: 12 }, (_, i) => P(30 + i * 7.5, spineY(30 + i * 7.5)));
  pen.stroke(spine, 1.5 * s);
  for (let x = 34; x < 112; x += 7.5) pen.hair([P(x, spineY(x) - 2), P(x, spineY(x) + 2)], 0.6 * s, INK, 0.8);
  for (let i = 0; i < 8; i++) {
    const x = 104 - i * 9;
    const len = 16 - i * 1.4;
    const lean = 5 + i * 0.4;
    pen.hair([P(x, spineY(x)), P(x - lean * 0.4, spineY(x) - len * 0.6), P(x - lean, spineY(x) - len)], 0.8 * s, INK, 0.9);
    pen.hair([P(x, spineY(x)), P(x - lean * 0.4, spineY(x) + len * 0.6), P(x - lean, spineY(x) + len)], 0.8 * s, INK, 0.9);
  }

  // Tail fin: just the rays left.
  for (let k = -3; k <= 3; k++) pen.hair([P(31, 40), P(18, 40 + k * 3.2), P(8, 40 + k * 5.5)], 0.55 * s, INK, 0.85);
  pen.hair([P(8, 23), P(14, 40), P(8, 57)], 0.5 * s, INK, 0.45);
}

/** A frying pan in three-quarter view, sizzling: the "cooked" ending. */
export function drawPan(ctx: CanvasRenderingContext2D, seed: number): void {
  const pen = new Pen(ctx, seed, 0.6);
  const s = ART_RES;
  const P = (x: number, y: number): Pt => ({ x: x * s, y: y * s });
  const cx = 92;
  const cy = 92;

  // Long handle out to the right, with a hanging hole.
  const handle = [P(150, 86), P(232, 74), P(236, 82), P(152, 98)];
  pen.fill(handle, '#3a3236', 0.85);
  pen.stroke([...handle, handle[0]!], 1.2 * s);
  pen.stroke(closedEllipse(224 * s, 79 * s, 3 * s, 2.4 * s, 12), 0.8 * s, BONE, 1, false);

  // Body: the outside wall below the rim, crosshatched dark.
  const outer = ellipse(cx * s, cy * s, 74 * s, 30 * s, 40);
  const body: Pt[] = [P(cx - 74, cy), ...Array.from({ length: 21 }, (_, i) => {
    const a = Math.PI - (i / 20) * Math.PI;
    return P(cx + Math.cos(a) * 70, cy + 16 + Math.sin(a) * 26);
  }), P(cx + 74, cy)];
  pen.fill(body, '#2b2629', 0.9);
  pen.clipped(body, () => {
    for (let x = cx - 80; x < cx + 80; x += 4) pen.hair([P(x, cy), P(x + 10, cy + 44)], 0.5 * s, BONE, 0.25);
  });
  pen.stroke(body, 1.4 * s);

  // Inside: the cooking surface with a sheen of oil.
  pen.fill(outer, '#4a4247', 1);
  pen.fill(ellipse(cx * s, (cy + 2) * s, 62 * s, 22 * s, 36), '#6b6066', 1);
  pen.clipped(ellipse(cx * s, (cy + 2) * s, 62 * s, 22 * s, 36), () => {
    for (let x = cx - 70; x < cx + 70; x += 3.2) pen.hair([P(x, cy - 24), P(x - 8, cy + 26)], 0.4 * s, INK, 0.35);
  });
  pen.stroke([...outer, outer[0]!], 1.5 * s);
  pen.hair(closedEllipse(cx * s, (cy + 2) * s, 62 * s, 22 * s, 36), 0.6 * s, INK, 0.7);
  pen.hair([P(cx - 40, cy - 8), P(cx - 18, cy - 14)], 0.8 * s, BONE, 0.7);

  // Sizzle: oil spits and steam curls rising off the pan.
  for (const [x, y] of [[40, 66], [150, 70], [56, 54], [134, 52], [96, 58]] as const) pen.dot(x * s, y * s, 1.3 * s, INK, 0.8);
  for (let k = 0; k < 4; k++) {
    const x0 = 54 + k * 26;
    pen.hair(Array.from({ length: 9 }, (_, i) => P(x0 + Math.sin(i * 0.9 + k) * 5, 52 - i * 5.5)), 0.7 * s, INK, 0.55);
  }
}
