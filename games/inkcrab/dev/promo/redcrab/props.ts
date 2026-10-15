import { closed, cub, type Draw, edge, oval, pt, shade, skin, tint } from '../../../src/art/kit';
import type { Pt } from '../../../src/art/pen';
import { PAPER_FILL, RED } from '../../../src/art/palette';
import { CAPTION_FONT } from '../captions';

/**
 * The island's scenery in the game's pen kit (paper, an off-register wash,
 * shadow-side hatching, a pen contour), facing the viewer, each standing on
 * its ground line d.g: a rainforest tree, a house, a stretch of picket fence,
 * a clump of garden flowers, the rangers' road-closed barrier, a ranger, and
 * a car seen from behind. Baked once (sprites.ts) and drawn many times.
 */
const LEAF = ['#4f7a3a', '#3f6a3a', '#6b8f45'] as const;
const BARK = '#7a6248';
const WALL = '#e7d3a8';
const ROOF = '#a8553b';
const WOOD = '#8a6a4a';
const GLASS = '#a9c6d6';
const KHAKI = '#b9a26a';
const OLIVE = '#5f6b3a';
const SKIN = '#d9a27c';
const CAR = '#4f7fb0';

/** A polygon with extra points along each side: the pen smooths what it strokes, so a bare triangle would come out round. */
export function dense(corners: readonly Pt[], per = 8): Pt[] {
  return corners.flatMap((a, i) => {
    const b = corners[(i + 1) % corners.length]!;
    return Array.from({ length: per }, (_, k) => pt(a.x + ((b.x - a.x) * k) / per, a.y + ((b.y - a.y) * k) / per));
  });
}

const rect = (x0: number, y0: number, x1: number, y1: number): Pt[] => dense([pt(x0, y0), pt(x1, y0), pt(x1, y1), pt(x0, y1)]);

/** A rainforest tree: a pale trunk on buttress roots and a heaped crown of leaf masses. */
export function tree(d: Draw, variant: number): void {
  const { pen } = d;
  const h = 250 + 40 * variant;
  const crownY = d.g - h;
  pen.fill(oval(0, d.g - 1, 70, 6, 24), d.ink, 0.12);
  const trunk = [
    ...cub(pt(-40, d.g), pt(-18, d.g - 18), pt(-14, d.g - 60), pt(-12, crownY + 30), 10),
    ...cub(pt(12, crownY + 30), pt(14, d.g - 60), pt(18, d.g - 18), pt(42, d.g), 10),
  ];
  skin(d, trunk, BARK, 0.55);
  shade(d, trunk, 0.4);
  // Bark lines up the trunk.
  for (const x of [-6, 3]) pen.hair(cub(pt(x, d.g - 12), pt(x + 2, d.g - 80), pt(x - 1, crownY + 90), pt(x, crownY + 40), 10), 0.6, d.ink, 0.45);
  edge(d, trunk, 1.4);
  const blobs: readonly [number, number, number][] = [[-70, 40, 62], [70, 36, 60], [-30, -10, 72], [36, -14, 70], [0, 40, 66], [0, -46, 58]];
  blobs.forEach(([x, y, r], i) => {
    const blob = oval(x, crownY + y, r, r * 0.78, 24).map((p, k) => pt(p.x + Math.sin(k * 2.3 + i) * 4, p.y + Math.cos(k * 1.7 + i) * 3));
    skin(d, blob, LEAF[(i + variant) % LEAF.length]!, 0.7);
    shade(d, blob, 0.35);
    // A few leaf ticks.
    for (let k = 0; k < 7; k++) {
      const a = pen.rng() * Math.PI * 2;
      const rr = r * 0.6 * pen.rng();
      const c = pt(x + Math.cos(a) * rr, crownY + y + Math.sin(a) * rr * 0.7);
      pen.hair([c, pt(c.x + 6, c.y - 4)], 0.6, d.ink, 0.5);
    }
    edge(d, blob, 1.2);
  });
}

/** A one-storey house with a red roof, a door at the top of a step, and a window. */
export function house(d: Draw): void {
  const { pen } = d;
  pen.fill(oval(0, d.g - 1, 170, 7, 28), d.ink, 0.12);
  const wall = rect(-150, d.g - 170, 150, d.g);
  skin(d, wall, WALL, 0.65);
  shade(d, wall, 0.3);
  // Weatherboards.
  for (let y = d.g - 160; y < d.g; y += 16) pen.hair([pt(-148, y), pt(148, y)], 0.5, d.ink, 0.3);
  edge(d, wall, 1.4);
  const roof = dense([pt(-175, d.g - 166), pt(0, d.g - 290), pt(175, d.g - 166)]);
  skin(d, roof, ROOF, 0.75);
  shade(d, roof, 0.4);
  edge(d, roof, 1.5);
  const door = rect(-30, d.g - 120, 30, d.g - 14);
  skin(d, door, WOOD, 0.7);
  edge(d, door, 1.2);
  pen.dot(18, d.g - 66, 3, d.ink, 0.9);
  const step = rect(-50, d.g - 14, 50, d.g);
  skin(d, step, '#cfc6b4', 0.7);
  edge(d, step, 1.2);
  const win = rect(60, d.g - 130, 128, d.g - 72);
  skin(d, win, GLASS, 0.7);
  pen.stroke([pt(94, d.g - 130), pt(94, d.g - 72)], 1.2, d.ink, 0.9, false);
  pen.stroke([pt(60, d.g - 101), pt(128, d.g - 101)], 1.2, d.ink, 0.9, false);
  edge(d, win, 1.3);
  const win2 = rect(-128, d.g - 130, -60, d.g - 72);
  skin(d, win2, GLASS, 0.7);
  edge(d, win2, 1.3);
}

/** A stretch of white picket fence, 150 wide. */
export function fence(d: Draw): void {
  const { pen } = d;
  for (const y of [d.g - 22, d.g - 50]) {
    const rail = rect(-78, y - 4, 78, y + 4);
    skin(d, rail, PAPER_FILL, 0.9);
    edge(d, rail, 0.9);
  }
  for (let x = -70; x <= 70; x += 20) {
    const picket = [pt(x - 6, d.g), pt(x - 6, d.g - 62), pt(x, d.g - 72), pt(x + 6, d.g - 62), pt(x + 6, d.g)];
    skin(d, picket, '#f6efe0', 0.95);
    pen.fill(closed(picket).slice(0, 3).concat([pt(x - 6, d.g)]), d.ink, 0.06);
    edge(d, picket, 1);
  }
}

/** A clump of garden flowers: leaves and bright heads. */
export function flowers(d: Draw, variant: number): void {
  const { pen } = d;
  const heads = ['#e2577a', '#f2c443', '#a46ad1', '#ef8a3c'];
  for (let i = 0; i < 5; i++) {
    const x = -24 + i * 12 + pen.jitter(3);
    const top = d.g - 26 - 14 * ((i * 7 + variant) % 3);
    pen.stroke([pt(x, d.g), pt(x + 2, top)], 1.1, '#3f6a3a', 0.9, false);
    const leaf = oval(x - 5, d.g - 10, 7, 3, 10);
    skin(d, leaf, LEAF[0], 0.8);
    edge(d, leaf, 0.6);
    const head = oval(x + 2, top, 7, 6, 12);
    skin(d, head, heads[(i + variant) % heads.length]!, 0.85);
    pen.dot(x + 2, top, 2, '#f6e27a', 0.95);
    edge(d, head, 0.8);
  }
}

/** The rangers' barrier: a striped boom across the road on two posts, and the sign over it. */
export function roadblock(d: Draw): void {
  const { pen, ink } = d;
  for (const x of [-120, 120]) {
    const post = rect(x - 6, d.g - 230, x + 6, d.g);
    skin(d, post, '#cfc6b4', 0.8);
    edge(d, post, 1.1);
  }
  const boom = rect(-140, d.g - 52, 140, d.g - 32);
  skin(d, boom, PAPER_FILL, 1);
  pen.clipped(boom, () => {
    for (let x = -150; x < 150; x += 40) tint(d, [pt(x, d.g - 32), pt(x + 20, d.g - 52), pt(x + 40, d.g - 52), pt(x + 20, d.g - 32)], RED, 0.85);
  });
  edge(d, boom, 1.2);
  const board = rect(-150, d.g - 320, 150, d.g - 200);
  skin(d, board, '#f4e04f', 0.8);
  edge(d, board, 2.2);
  pen.stroke(closed(rect(-140, d.g - 310, 140, d.g - 210)), 1.1, ink, 0.8, false);
  const { ctx } = pen;
  ctx.save();
  ctx.fillStyle = ink;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.font = `700 54px ${CAPTION_FONT}`;
  ctx.fillText('ROAD CLOSED', 0, d.g - 258);
  ctx.font = `700 40px ${CAPTION_FONT}`;
  ctx.fillStyle = RED;
  ctx.fillText('red crabs crossing', 0, d.g - 220);
  ctx.restore();
}

/** A park ranger, facing us: broad-brimmed hat, khaki shirt, olive trousers, one arm raised to stop the traffic. */
export function ranger(d: Draw): void {
  const { pen } = d;
  pen.fill(oval(0, d.g - 1, 34, 4, 20), d.ink, 0.12);
  for (const x of [-11, 11]) {
    const leg = rect(x - 8, d.g - 80, x + 8, d.g);
    skin(d, leg, OLIVE, 0.75);
    edge(d, leg, 1.1);
    const boot = oval(x + 2, d.g - 4, 11, 5, 12);
    skin(d, boot, '#4a3a2a', 0.85);
    edge(d, boot, 1);
  }
  const body = dense([pt(-24, d.g - 78), pt(-26, d.g - 150), pt(26, d.g - 150), pt(24, d.g - 78)]);
  skin(d, body, KHAKI, 0.75);
  shade(d, body, 0.35);
  edge(d, body, 1.3);
  const armL = [pt(-25, d.g - 146), pt(-38, d.g - 110), pt(-34, d.g - 84), pt(-26, d.g - 86), pt(-28, d.g - 112), pt(-18, d.g - 140)];
  skin(d, armL, KHAKI, 0.8);
  edge(d, armL, 1.1);
  const armR = [pt(22, d.g - 146), pt(46, d.g - 176), pt(52, d.g - 196), pt(60, d.g - 192), pt(54, d.g - 170), pt(28, d.g - 134)];
  skin(d, armR, KHAKI, 0.8);
  edge(d, armR, 1.1);
  const hand = oval(57, d.g - 198, 7, 8, 12);
  skin(d, hand, SKIN, 0.8);
  edge(d, hand, 0.9);
  const head = oval(0, d.g - 166, 15, 17, 18);
  skin(d, head, SKIN, 0.75);
  edge(d, head, 1.2);
  for (const x of [-5, 5]) pen.dot(x, d.g - 166, 1.6, d.ink, 0.9);
  const brim = oval(0, d.g - 180, 34, 7, 20);
  skin(d, brim, '#8a7650', 0.85);
  edge(d, brim, 1.2);
  const crown = dense([pt(-16, d.g - 181), pt(-13, d.g - 200), pt(13, d.g - 200), pt(16, d.g - 181)]);
  skin(d, crown, '#8a7650', 0.85);
  edge(d, crown, 1.2);
}

/** A small car from behind: body, rear window, red tail lights and dark tyres. */
export function car(d: Draw): void {
  const { pen } = d;
  pen.fill(oval(0, d.g - 1, 86, 7, 24), d.ink, 0.18);
  for (const x of [-60, 60]) {
    const tyre = rect(x - 14, d.g - 26, x + 14, d.g);
    skin(d, tyre, '#2c2c34', 0.85);
    edge(d, tyre, 1);
  }
  const body = dense([pt(-82, d.g - 20), pt(-84, d.g - 66), pt(-60, d.g - 74), pt(60, d.g - 74), pt(84, d.g - 66), pt(82, d.g - 20)]);
  skin(d, body, CAR, 0.75);
  shade(d, body, 0.4);
  edge(d, body, 1.4);
  const cabin = dense([pt(-58, d.g - 74), pt(-46, d.g - 118), pt(46, d.g - 118), pt(58, d.g - 74)]);
  skin(d, cabin, CAR, 0.7);
  edge(d, cabin, 1.3);
  const glass = dense([pt(-48, d.g - 78), pt(-39, d.g - 112), pt(39, d.g - 112), pt(48, d.g - 78)]);
  skin(d, glass, GLASS, 0.75);
  edge(d, glass, 1);
  for (const x of [-68, 68]) {
    const lamp = rect(x - 10, d.g - 60, x + 10, d.g - 46);
    skin(d, lamp, RED, 0.9);
    edge(d, lamp, 0.9);
  }
  const plate = rect(-22, d.g - 46, 22, d.g - 32);
  skin(d, plate, PAPER_FILL, 1);
  edge(d, plate, 0.9);
}
