import type { Look } from '../../logic/gear';
import { cub, edge, tint, type Draw } from '../kit';
import { dab, glow, mix, paint, SHADOW, soft } from '../paint';
import { PAPER_FILL } from '../palette';
import type { Pt } from '../pen';
import { oval, part, pt, rivets, roundRect, sheen, WASH } from './parts';

/**
 * The helmet, in three looks, with the prospector inside:
 * 0, a glass fishbowl on a bolted collar, a clip-on lamp, a stub antenna;
 * 1, the fishbowl in a protective cage, twin lamps on the cage's top bar,
 *    a radio with a whip antenna and an ear-piece;
 * 2, a hard shell with a wide tinted visor, a lamp strip over it and a
 *    sensor fin.
 * The prospector is no human: a broad, smooth head in cool mint, darker
 * markings over the crown (the ones the printer gets wrong), big dark eyes
 * set forward, no nose, and lilac frills sweeping back from behind the
 * jaw. `gaze` is where the eyes look (the drill's direction).
 */
export const HEAD = pt(1, -11);
const R = 8.6;

/** The head inside the glass. */
function head(d: Draw, gaze: Pt): void {
  const c = pt(HEAD.x + 0.8 + gaze.x * 0.35, HEAD.y + 1.6 + gaze.y * 0.3);
  // Frills behind the jaw first: three feathered fronds sweeping back and up.
  for (const [ang, len, w] of [[-2.35, 6.4, 1.9], [-2.85, 7, 2], [2.8, 6, 1.8]] as const) {
    const root = pt(c.x - 2.6, c.y + 0.8);
    const tip = pt(root.x + Math.cos(ang) * len, root.y + Math.sin(ang) * len);
    const mid = pt((root.x + tip.x) / 2, (root.y + tip.y) / 2);
    const nx = -Math.sin(ang) * w;
    const ny = Math.cos(ang) * w;
    const frond = [root, pt(mid.x + nx, mid.y + ny), tip, pt(mid.x - nx * 0.6, mid.y - ny * 0.6)];
    paint(d, frond, WASH.frill, { alpha: 0.9, shadow: 0.4, hatch: 0, line: 0.35 });
    // Barbs along the frond.
    for (let k = 1; k <= 3; k++) {
      const p = pt(root.x + (tip.x - root.x) * (k / 4), root.y + (tip.y - root.y) * (k / 4));
      d.pen.hair([p, pt(p.x + nx * 0.8 + Math.cos(ang) * 0.6, p.y + ny * 0.8 + Math.sin(ang) * 0.6)], 0.22, mix(WASH.frill, SHADOW, 0.5), 0.8);
    }
  }
  // The skull: broad at the crown, narrowing to a small chin under the face.
  const skull = [
    ...cub(pt(c.x - 5.6, c.y + 1.2), pt(c.x - 6.6, c.y - 4.6), pt(c.x - 1.2, c.y - 6.6), pt(c.x + 3.2, c.y - 5.6), 8),
    ...cub(pt(c.x + 3.6, c.y - 5.4), pt(c.x + 7, c.y - 4), pt(c.x + 7.2, c.y + 1), pt(c.x + 5.2, c.y + 3.6), 8),
    ...cub(pt(c.x + 4.8, c.y + 3.9), pt(c.x + 3, c.y + 5.6), pt(c.x - 1.6, c.y + 5.6), pt(c.x - 4.4, c.y + 3.6), 8),
  ];
  paint(d, skull, WASH.skin, { alpha: 0.95, shadow: 0.55, hatch: 0.1, line: 0.55 });
  // Markings: dappled spots over the crown and down the back of the head.
  d.pen.clipped(skull, () => {
    for (const [mx, my, r] of [[-3.6, -3.4, 1.1], [-1.4, -4.8, 0.9], [0.9, -5.3, 0.75], [-4.8, -1.2, 0.85], [-2.6, -1.9, 0.55], [3, -4.9, 0.5]] as const) {
      dab(d, oval(c.x + mx, c.y + my, r * 1.2, r, 10), WASH.markings, 0.75, 0.15);
    }
  });
  // A cheek of colour under the eye, washed in.
  dab(d, oval(c.x + 3.6, c.y + 1.8, 1.6, 1, 10), WASH.frill, 0.35, 0.5);
}

/** Big dark eyes, set forward and looking where `gaze` points; `dim` behind a tinted visor. */
function face(d: Draw, gaze: Pt, dim: boolean): void {
  const c = pt(HEAD.x + 2.4 + gaze.x * 0.9, HEAD.y + 0.8 + gaze.y * 0.8);
  // The near eye big, the far one smaller and foreshortened, both tilted like almonds.
  for (const [dx, rx, ry] of [[-0.6, 1.45, 1.75], [2.9, 1.05, 1.5]] as const) {
    const eye = oval(c.x + dx, c.y, rx, ry, 14);
    paint(d, eye, '#1c2140', { alpha: dim ? 0.6 : 1, shadow: 0, hatch: 0, line: 0.3, gloss: true });
    if (!dim) {
      // A glint and a faint lower catch-light, so they're wet and alive.
      d.pen.dot(c.x + dx - rx * 0.3 + gaze.x * 0.2, c.y - ry * 0.4, Math.max(0.32, rx * 0.32), PAPER_FILL, 0.95);
      d.pen.dot(c.x + dx + rx * 0.35, c.y + ry * 0.45, rx * 0.15, '#9fd6e8', 0.8);
    }
  }
  // A small, soft mouth.
  d.pen.stroke([pt(c.x + 0.2, c.y + 3), pt(c.x + 1.2, c.y + 3.35), pt(c.x + 2.2, c.y + 3)], 0.35, d.ink, dim ? 0.4 : 0.75, false);
}

function collar(d: Draw, look: Look): void {
  const ring = [pt(-6.4, -2.9), pt(6.8, -3.4), pt(7.1, -0.5), pt(-6.5, 0)];
  part(d, ring, look === 2 ? WASH.armour : WASH.metal, { shadow: 0.5, line: 0.6, gloss: true });
  sheen(d, [pt(-5.4, -2.4), pt(-1, -2.7)], 0.45);
  if (look < 2) rivets(d, [pt(-4.2, -1.4), pt(0, -1.6), pt(4.2, -1.8)], 0.42);
}

/** The glass bowl with the prospector inside, painted as glass: depth behind, reflections in front. */
function bubble(d: Draw, gaze: Pt): void {
  const { ctx } = d.pen;
  const glass = oval(HEAD.x, HEAD.y, R, R * 0.96, 36);
  // Inside the bowl: cool, darker up under the rim where the light doesn't reach.
  paint(d, glass, '#a9c4da', { alpha: 0.75, shadow: 0.45, hatch: 0, line: 0 });
  head(d, gaze);
  face(d, gaze, false);
  d.pen.clipped(glass, () => {
    // The glass over the face: a faint cool tint, darker towards its edge as glass thickens.
    const g = ctx.createRadialGradient(HEAD.x - 1.6, HEAD.y - 1.6, R * 0.4, HEAD.x, HEAD.y, R * 1.02);
    g.addColorStop(0, 'rgba(190, 215, 235, 0.05)');
    g.addColorStop(0.75, 'rgba(150, 180, 210, 0.18)');
    g.addColorStop(1, 'rgba(40, 55, 100, 0.5)');
    ctx.fillStyle = g;
    ctx.fillRect(HEAD.x - R, HEAD.y - R, R * 2, R * 2);
    // The window of sky reflected across the top left: one broad curved pane of light.
    const pane = [
      ...cub(pt(HEAD.x - 6.8, HEAD.y - 1.4), pt(HEAD.x - 7, HEAD.y - 6), pt(HEAD.x - 3, HEAD.y - 8.2), pt(HEAD.x + 1.8, HEAD.y - 7.8), 8),
      ...cub(pt(HEAD.x + 1.6, HEAD.y - 6.6), pt(HEAD.x - 2.4, HEAD.y - 6.8), pt(HEAD.x - 5.4, HEAD.y - 4.6), pt(HEAD.x - 5.6, HEAD.y - 1), 8),
    ];
    dab(d, pane, PAPER_FILL, 0.62, 0.25);
    // A warm bounce off the ground along the bottom right.
    const bounce = cub(pt(HEAD.x + 2, HEAD.y + 7.4), pt(HEAD.x + 5.6, HEAD.y + 6.4), pt(HEAD.x + 7.6, HEAD.y + 3.6), pt(HEAD.x + 7.8, HEAD.y + 0.6), 10);
    haze(d, bounce, '#f1d9ad', 1.1, 0.55);
  });
  edge(d, glass, 0.75, 0.95);
  d.pen.dot(HEAD.x + 4.8, HEAD.y - 5.2, 0.7, PAPER_FILL, 0.95);
}

/** A soft painted stroke: a reflection inside glass. */
function haze(d: Draw, pts: readonly Pt[], color: string, w: number, alpha: number): void {
  soft(d.pen.ctx, w * 0.4, () => d.pen.stroke(pts, w, color, alpha, false));
}

function lamp(d: Draw, at: Pt, s = 1): void {
  const body = roundRect(at.x - 1.9 * s, at.y - 1.5 * s, at.x + 1.6 * s, at.y + 1.5 * s, 0.6);
  part(d, body, WASH.darkMetal, { shadow: 0.5, line: 0.5, gloss: true });
  sheen(d, [pt(at.x - 1.4 * s, at.y - 0.9 * s), pt(at.x + 0.9 * s, at.y - 1 * s)], 0.35);
  glow(d.pen.ctx, pt(at.x + 2.2 * s, at.y), 3.2 * s, WASH.lamp, 0.55);
  const lens = oval(at.x + 2 * s, at.y, 0.95 * s, 1.35 * s, 12);
  paint(d, lens, WASH.lamp, { alpha: 1, shadow: 0.15, hatch: 0, line: 0.4, gloss: true });
}

function antenna(d: Draw, from: Pt, to: Pt, w: number): void {
  d.pen.stroke([from, to], w, d.ink, 0.95, false);
  d.pen.stroke([pt(from.x + 0.2, from.y - 0.1), pt(to.x + 0.2, to.y - 0.1)], w * 0.35, '#c9d1dc', 0.7, false);
}

export function helmet(d: Draw, look: Look, gaze: Pt): void {
  collar(d, look);
  if (look === 0) {
    // Stub antenna at the back, the fishbowl, a lamp clipped on the front.
    antenna(d, pt(HEAD.x - 5.5, HEAD.y - 6), pt(HEAD.x - 7.5, HEAD.y - 10), 0.8);
    d.pen.dot(HEAD.x - 7.6, HEAD.y - 10.4, 0.85, d.ink);
    bubble(d, gaze);
    lamp(d, pt(HEAD.x + 4.2, HEAD.y - 8.6));
    return;
  }
  if (look === 1) {
    // Whip antenna and a comm unit over the ear.
    antenna(d, pt(HEAD.x - 6.5, HEAD.y - 3), pt(HEAD.x - 10.2, HEAD.y - 17), 0.6);
    d.pen.dot(HEAD.x - 10.3, HEAD.y - 17.4, 0.75, d.ink);
    bubble(d, gaze);
    // The cage: two bars over the glass.
    for (const k of [-0.35, 0.3]) {
      const bar: Pt[] = [];
      for (let i = 0; i <= 12; i++) {
        const a = Math.PI + (i / 12) * Math.PI;
        bar.push(pt(HEAD.x + Math.cos(a) * R * 1.03 + k * 3 * Math.sin(a), HEAD.y + Math.sin(a) * R * 1.03));
      }
      d.pen.stroke(bar, 1.3, d.ink, 0.95, false);
      d.pen.stroke(bar.map((p) => pt(p.x - 0.2, p.y - 0.25)), 0.45, '#c9d1dc', 0.8, false);
    }
    const ear = oval(HEAD.x - 4.6, HEAD.y + 2.2, 2.2, 2.6, 14);
    part(d, ear, WASH.darkMetal, { shadow: 0.5, line: 0.5, gloss: true });
    sheen(d, [pt(HEAD.x - 5.8, HEAD.y + 1), pt(HEAD.x - 4.6, HEAD.y + 0.2)], 0.4);
    lamp(d, pt(HEAD.x - 1, HEAD.y - 10.2), 0.85);
    lamp(d, pt(HEAD.x + 4.4, HEAD.y - 8.4), 0.85);
    return;
  }
  // Deep-space: a hard shell with a tinted visor.
  const fin = [pt(HEAD.x - 4, HEAD.y - 7.6), pt(HEAD.x - 9, HEAD.y - 12.5), pt(HEAD.x - 7.6, HEAD.y - 6.4)];
  part(d, fin, WASH.undersuit, { shadow: 0.4, line: 0.5 });
  const shell = oval(HEAD.x, HEAD.y, R * 1.02, R, 36);
  part(d, shell, WASH.armour, { shadow: 0.6, line: 0.6, gloss: true });
  // A cobalt stripe over the crown, the guild's colour on its best gear.
  const stripe = [pt(HEAD.x - 1.6, HEAD.y - R - 1), pt(HEAD.x + 1.6, HEAD.y - R - 1), pt(HEAD.x - 2.6, HEAD.y + 1), pt(HEAD.x - 6.4, HEAD.y + 2.4), pt(HEAD.x - 5.6, HEAD.y - 3)];
  d.pen.clipped(shell, () => {
    d.pen.fill(stripe, WASH.undersuit, 0.9);
    d.pen.stroke([...stripe, stripe[0]!], 0.35, d.ink, 0.7);
  });
  sheen(d, [pt(HEAD.x - 6.4, HEAD.y - 1), pt(HEAD.x - 5.2, HEAD.y - 5), pt(HEAD.x - 2, HEAD.y - 7.4)], 0.8);
  const visor = [pt(HEAD.x - 1.6, HEAD.y - 4.8), pt(HEAD.x + 7.4, HEAD.y - 4.2), pt(HEAD.x + 8.6, HEAD.y + 0.6), pt(HEAD.x + 6.4, HEAD.y + 4.6), pt(HEAD.x - 0.6, HEAD.y + 4.2), pt(HEAD.x - 2.4, HEAD.y)];
  paint(d, visor, '#55658a', { alpha: 0.7, shadow: 0.3, hatch: 0, line: 0 });
  d.pen.clipped(visor, () => {
    head(d, pt(gaze.x * 0.6 + 1.2, gaze.y * 0.6));
    face(d, pt(gaze.x * 0.6, gaze.y * 0.6), false);
    // The tint over the face, with the horizon's warm glow caught along its lower half.
    const { ctx } = d.pen;
    const g = ctx.createLinearGradient(0, HEAD.y - 5, 0, HEAD.y + 5);
    g.addColorStop(0, 'rgba(24, 30, 62, 0.7)');
    g.addColorStop(0.55, 'rgba(36, 44, 84, 0.45)');
    g.addColorStop(0.8, 'rgba(232, 196, 150, 0.35)');
    g.addColorStop(1, 'rgba(40, 48, 90, 0.5)');
    ctx.fillStyle = g;
    ctx.fillRect(HEAD.x - 3, HEAD.y - 5, 12, 10);
  });
  edge(d, visor, 0.7);
  sheen(d, [pt(HEAD.x + 0.4, HEAD.y - 3.4), pt(HEAD.x + 4.6, HEAD.y - 3.2)], 0.8);
  sheen(d, [pt(HEAD.x + 6.6, HEAD.y - 2.2), pt(HEAD.x + 7.4, HEAD.y + 0.6)], 0.5);
  // Lamp strip over the visor.
  const strip = [pt(HEAD.x - 0.6, HEAD.y - 6.4), pt(HEAD.x + 6.6, HEAD.y - 5.8), pt(HEAD.x + 6.4, HEAD.y - 5), pt(HEAD.x - 0.8, HEAD.y - 5.6)];
  glow(d.pen.ctx, pt(HEAD.x + 3, HEAD.y - 5.8), 4.5, WASH.lamp, 0.4);
  paint(d, strip, WASH.lamp, { alpha: 1, shadow: 0, hatch: 0, line: 0.4 });
  tint(d, strip, '#ffffff', 0.3);
}
