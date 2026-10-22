import { createRng } from '../logic/rng';
import { bezier, closed, type Draw, normals, oval, pt, TAU, tube } from './kit';
import { MARBLE_R } from './marbleArt';
import { PAPER_FILL } from './palette';
import type { Pt } from './pen';
import { castShadow, ellipseAt, glaze } from './propsKit';
import { mix, rgba } from './wash';

export { drawHedgehog, HEDGEHOG_FRAME, HEDGEHOG_RES, type HedgehogStep } from './hedgehogArt';

/**
 * Props for chapters 6–7, centred at the origin, light from the upper left:
 * the garden twine that ties a pair of marbles, the chameleon marble's
 * iridescent sheen and the ring that shimmers before it turns, and the
 * Rain charm's falling streak and splash. The twine knot and the sheen are
 * overlays in MARBLE_FRAME, transparent but for what they add to a marble.
 */

/** Natural jute: a warm straw wash, its shadowed side, its fibres. */
const JUTE = { wash: '#c9a467', deep: '#7c5a2c', fibre: '#9a7440', light: '#f3e2b8', w: 2.7 } as const;

/**
 * A length of two-ply twine along `spine`: paper and a straw wash, the shaded
 * underside, a twist mark at every spine point (so close points read as
 * twine turning away round a curve), a lit edge and a few stray fibres.
 * `frayed` splays the end into loose fibres.
 */
function twine(d: Draw, spine: readonly Pt[], w: number = JUTE.w, frayed = false, seed = 0): void {
  const { pen } = d;
  const rng = createRng(7100 + seed);
  const shape = tube(spine, w, w);
  const n = normals(spine);
  const side = (i: number, k: number): Pt => pt(spine[i]!.x + n[i]!.x * k * w * 0.5, spine[i]!.y + n[i]!.y * k * w * 0.5);
  pen.fill(shape, PAPER_FILL, 1);
  pen.fill(shape, JUTE.wash, 0.92);
  pen.clipped(shape, () => {
    // The underside away from the light, then the twist of the two plies.
    const down = n.map((v) => (v.x * 0.55 + v.y * 0.84 > 0 ? -1 : 1));
    pen.fill(tube(spine.map((p, i) => pt(p.x + n[i]!.x * down[i]! * w * 0.32, p.y + n[i]!.y * down[i]! * w * 0.32)), w * 0.55, w * 0.55), JUTE.deep, 0.4);
    for (let i = 0; i + 1 < spine.length; i++) {
      pen.hair([side(i, -1.1), side(i + 1, 1.1)], 0.42, JUTE.deep, 0.85);
      pen.hair([side(i, -0.6), side(i + 1, 0.9)], 0.3, JUTE.light, 0.55);
    }
  });
  pen.hair(spine.map((_, i) => side(i, 1)), 0.4, d.ink, 0.75);
  pen.hair(spine.map((_, i) => side(i, -1)), 0.5, d.ink, 0.85);
  // Stray fibres catching the light.
  for (let i = 1; i + 1 < spine.length; i += 3) {
    if (rng() < 0.45) continue;
    const k = rng() < 0.5 ? 1 : -1;
    const root = side(i, k * 0.9);
    const a = Math.atan2(n[i]!.y * k, n[i]!.x * k) + (rng() - 0.5) * 1.4;
    pen.hair([root, pt(root.x + Math.cos(a) * (0.9 + rng()), root.y + Math.sin(a) * (0.9 + rng()))], 0.22, JUTE.fibre, 0.8);
  }
  if (frayed) {
    const end = spine[spine.length - 1]!;
    const prev = spine[spine.length - 2]!;
    const a = Math.atan2(end.y - prev.y, end.x - prev.x);
    for (let k = -2; k <= 2; k++) {
      const b = a + k * 0.32 + (rng() - 0.5) * 0.2;
      const l = 1.6 + rng() * 1.2;
      pen.hair([pt(end.x + Math.cos(a + Math.PI / 2) * k * 0.35, end.y + Math.sin(a + Math.PI / 2) * k * 0.35), pt(end.x + Math.cos(b) * l, end.y + Math.sin(b) * l)], 0.3, k % 2 ? JUTE.deep : JUTE.fibre, 0.85);
    }
  }
}

/** Points from a to b, `n` steps, bunched towards both ends as a line wrapped round a ball foreshortens. */
function wrapped(x: number, n: number, reach: number): Pt[] {
  return Array.from({ length: n + 1 }, (_, i) => pt(x, Math.sin(-Math.PI / 2 + (i / n) * Math.PI) * reach));
}

/**
 * Garden twine tied round a marble of radius MARBLE_R: two turns wrapped
 * over it top to bottom (foreshortening at the rim) and a knot at its centre
 * with two frayed tails flicking towards −x. The cord to the partner
 * marble leaves the knot along +x: turn the overlay so +x points at it.
 * MARBLE_FRAME, transparent elsewhere.
 */
export function drawTwineKnot(d: Draw): void {
  const { pen } = d;
  const R = MARBLE_R;
  const disc = oval(0, 0, R + 1.1, R + 1.1, 48);
  const turns = [wrapped(-1.7, 14, R + 0.9), wrapped(1.6, 14, R + 0.9)];
  // Their shadows on the marble, then the turns, the knot over them.
  pen.clipped(oval(0, 0, R, R, 48), () => turns.forEach((t) => castShadow(d, tube(t, JUTE.w, JUTE.w), pt(0.9, 1.2), 0.28)));
  pen.clipped(disc, () => turns.forEach((t, i) => {
    twine(d, t, JUTE.w, false, i);
    // Turning away round the ball at the rim, into its shadow.
    pen.clipped(tube(t, JUTE.w + 0.6, JUTE.w + 0.6), () => {
      const rim = pen.ctx.createRadialGradient(-2, -3, R * 0.55, 0, 0, R + 1.2);
      rim.addColorStop(0, rgba(JUTE.deep, 0));
      rim.addColorStop(1, rgba(JUTE.deep, 0.6));
      pen.ctx.fillStyle = rim;
      pen.ctx.fillRect(-R - 2, -R - 2, R * 2 + 4, R * 2 + 4);
    });
  }));
  const tails = [bezier(pt(-1.6, 1.2), pt(-4.6, 4.8), pt(-8.6, 6.4), 7), bezier(pt(-1.6, -1.4), pt(-5.2, -3.4), pt(-9, -2.6), 7)];
  for (const t of tails) castShadow(d, tube(t, 2.2, 2.2), pt(0.8, 1.1), 0.25);
  tails.forEach((t, i) => twine(d, t, 2.3, true, 3 + i));
  // The knot: a lump of crossed turns, one wrapped over the others.
  castShadow(d, oval(0.3, 0.3, 4.6, 4.2, 18), pt(1, 1.4), 0.32);
  twine(d, bezier(pt(-3.2, -3.4), pt(0.8, -0.6), pt(3.4, 3.2), 6), 2.7, false, 5);
  twine(d, bezier(pt(-3.4, 3.2), pt(0.4, 0.8), pt(3.2, -3.4), 6), 2.7, false, 6);
  twine(d, bezier(pt(-1.6, -4.2), pt(2.6, 0), pt(-1.4, 4.2), 7), 2.9, false, 7);
  pen.dot(-0.2, -2.2, 0.7, JUTE.light, 0.85);
}

/** The cord's length and the height of its square frame (units): it runs −W/2..W/2 along x, centred. */
export const TWINE_CORD_W = 32;
export const TWINE_CORD_FRAME = 32;

/**
 * A straight length of the same twine along +x, from −TWINE_CORD_W/2 to
 * +TWINE_CORD_W/2 at y 0, centred in a TWINE_CORD_FRAME square, for the view
 * to stretch between two tied marbles' centres (under their knots).
 */
export function drawTwineCord(d: Draw): void {
  const half = TWINE_CORD_W / 2;
  const spine = Array.from({ length: 17 }, (_, i) => pt(-half + (i / 16) * TWINE_CORD_W, 0));
  castShadow(d, tube(spine, JUTE.w, JUTE.w), pt(0.8, 1.3), 0.25);
  twine(d, spine, JUTE.w, false, 9);
}

/** Pastel hues of the chameleon's iridescence. */
const HUES = ['#ff8fbf', '#ffc65c', '#8fe08a', '#6cc9f0', '#a98cf5', '#ff8fbf'] as const;

/** A point `p` measured over the ball's surface from its centre, as seen from above (so cells shrink towards the rim). */
function onBall(p: Pt, R: number): Pt {
  const s = Math.hypot(p.x, p.y);
  if (s < 1e-6) return p;
  const k = (R * Math.sin(Math.min(s / R, Math.PI / 2))) / s;
  return pt(p.x * k, p.y * k);
}

/** The hue across the ball at p, by angle, so neighbouring scales shade into each other. */
function hueAt(p: Pt): string {
  const t = (((Math.atan2(p.y, p.x) + 0.6) / TAU) % 1 + 1) % 1;
  const i = Math.floor(t * (HUES.length - 1));
  return mix(HUES[i]!, HUES[i + 1]!, t * (HUES.length - 1) - i);
}

/** A soft stroke of colour along an arc of radius r: wide and faint, then narrow and brighter. */
function arcGlow(ctx: CanvasRenderingContext2D, r: number, a0: number, a1: number, width: number, alpha: number): void {
  const g = ctx.createConicGradient(a0, 0, 0);
  const span = (a1 - a0) / TAU;
  HUES.forEach((h, i) => g.addColorStop((i / (HUES.length - 1)) * span, h));
  g.addColorStop(Math.min(1, span + 0.01), HUES[5]);
  ctx.save();
  ctx.lineCap = 'round';
  ctx.strokeStyle = g;
  for (const [k, a] of [[1, 0.35], [0.6, 0.6], [0.28, 0.9]] as const) {
    ctx.globalAlpha = alpha * a;
    ctx.lineWidth = width * k;
    ctx.beginPath();
    ctx.arc(0, 0, r, a0, a1);
    ctx.stroke();
  }
  ctx.restore();
}

/**
 * The chameleon marble's sheen, over a marble of radius MARBLE_R: a fine net
 * of granular scales in pale iridescent lines, shrinking over the ball to
 * its rim, and a soft rainbow glint round its upper-left rim and a fainter
 * one at the lower right. Light enough that the marble's own colour and
 * pattern read through. Keep it unrotated so its glint stays with the light.
 */
export function drawSheen(d: Draw): void {
  const { pen } = d;
  const { ctx } = pen;
  const R = MARBLE_R;
  const disc = oval(0, 0, R - 0.4, R - 0.4, 48);
  const cell = 3.5;
  pen.clipped(disc, () => {
    // A breath of iridescence over the whole ball, strongest at the rim.
    const film = ctx.createConicGradient(-0.6, 0, 0);
    HUES.forEach((h, i) => film.addColorStop(i / (HUES.length - 1), rgba(h, 1)));
    const fade = ctx.createRadialGradient(0, 0, R * 0.45, 0, 0, R);
    ctx.save();
    ctx.globalAlpha = 0.16;
    ctx.fillStyle = film;
    ctx.fillRect(-R, -R, R * 2, R * 2);
    ctx.restore();
    fade.addColorStop(0, rgba(PAPER_FILL, 0.12));
    fade.addColorStop(1, rgba(PAPER_FILL, 0));
    ctx.fillStyle = fade;
    ctx.fillRect(-R, -R, R * 2, R * 2);
    // The scales: a hex net laid over the ball's surface.
    const reach = (R * Math.PI) / 2;
    for (let row = -9; row <= 9; row++) {
      for (let col = -9; col <= 9; col++) {
        const c = pt((col + (row % 2 ? 0.5 : 0)) * cell, row * cell * 0.87);
        const s = Math.hypot(c.x, c.y);
        if (s > reach - cell * 0.4) continue;
        const ring = Array.from({ length: 6 }, (_, k) => {
          const a = (k / 6) * TAU + Math.PI / 6;
          return onBall(pt(c.x + Math.cos(a) * cell * 0.52, c.y + Math.sin(a) * cell * 0.52), R);
        });
        const at = onBall(c, R);
        const lit = Math.max(0, -(at.x * 0.55 + at.y * 0.84) / R);
        pen.hair(closed(ring), 0.32, mix(hueAt(at), PAPER_FILL, 0.45), 0.42 + 0.3 * lit);
        // A bead of light on each scale's upper-left shoulder.
        const bead = onBall(pt(c.x - cell * 0.16, c.y - cell * 0.2), R);
        pen.dot(bead.x, bead.y, 0.32 * (1 - (s / reach) * 0.6), PAPER_FILL, 0.35 + 0.4 * lit);
      }
    }
  });
  // The rainbow glints, upper left and (fainter) lower right.
  arcGlow(ctx, R - 2.6, Math.PI * 0.98, Math.PI * 1.6, 4.4, 0.85);
  arcGlow(ctx, R - 2.2, Math.PI * 0.08, Math.PI * 0.42, 3, 0.5);
}

/**
 * A thin shimmering ring just outside a marble, of rainbow dashes ringed in
 * ink with three small sparkles, for the view to fade in as a chameleon
 * marble's change nears (and turn slowly, if it likes). MARBLE_FRAME.
 */
export function drawSheenRing(d: Draw): void {
  const { pen } = d;
  const r = MARBLE_R + 2.4;
  const dashes = 20;
  for (let i = 0; i < dashes; i++) {
    const a0 = (i / dashes) * TAU + 0.1;
    const a1 = a0 + (TAU / dashes) * 0.7;
    const arc = Array.from({ length: 6 }, (_, k) => {
      const a = a0 + ((a1 - a0) * k) / 5;
      return pt(Math.cos(a) * r, Math.sin(a) * r);
    });
    const mid = arc[3]!;
    pen.hair(arc, 1.5, d.ink, 0.5);
    pen.hair(arc, 0.95, hueAt(mid), 1);
  }
  const sparkle = (a: number, s: number): void => {
    const c = pt(Math.cos(a) * r, Math.sin(a) * r);
    const star = Array.from({ length: 8 }, (_, k) => {
      const rr = k % 2 ? s * 0.28 : s;
      const b = (k / 8) * TAU;
      return pt(c.x + Math.cos(b) * rr, c.y + Math.sin(b) * rr);
    });
    pen.fill(star, PAPER_FILL, 1);
    pen.hair(closed(star), 0.4, d.ink, 0.8);
  };
  sparkle(Math.PI * 1.25, 2.6);
  sparkle(Math.PI * 0.2, 1.9);
  sparkle(Math.PI * 0.72, 1.6);
}

/** Rain: clear water, its blue shadow, its lit rim. */
const WATER = { wash: '#a7cdea', deep: '#3f6f9f', light: '#f4fbff' } as const;

/** Texture px per unit for the rain streak and splash. */
export const RAIN_RES = 3;
/** The rain streak's square frame (units); the streak is about 10 × 34 within it. */
export const RAIN_STREAK_FRAME = 40;
/** The streak's slant: it falls down and to the left, this many radians off vertical. */
export const RAIN_SLANT = 0.2;

/**
 * A falling raindrop and the streak of its fall, slanting down to the left
 * (RAIN_SLANT off vertical), the bead at the bottom (+y, about y 14). A wash
 * that fades out up the tail, a bead of water with its shadowed side, glint
 * and pen contour. Centred in RAIN_STREAK_FRAME.
 */
export function drawRainStreak(d: Draw): void {
  const { pen } = d;
  const { ctx } = pen;
  const dir = pt(-Math.sin(RAIN_SLANT), Math.cos(RAIN_SLANT));
  const head = pt(dir.x * 13, dir.y * 13);
  const top = pt(-dir.x * 19, -dir.y * 19);
  const spine = Array.from({ length: 13 }, (_, i) => pt(top.x + (head.x - top.x) * (i / 12), top.y + (head.y - top.y) * (i / 12)));
  const tail = tube(spine, 0.2, 3.6);
  const g = ctx.createLinearGradient(top.x, top.y, head.x, head.y);
  g.addColorStop(0, rgba(WATER.wash, 0));
  g.addColorStop(0.7, rgba(WATER.wash, 0.55));
  g.addColorStop(1, rgba(WATER.wash, 0.9));
  pen.clipped(tail, () => {
    ctx.fillStyle = g;
    ctx.fillRect(-20, -20, 40, 40);
  });
  const edge = ctx.createLinearGradient(top.x, top.y, head.x, head.y);
  edge.addColorStop(0, rgba(WATER.deep, 0));
  edge.addColorStop(1, rgba(WATER.deep, 0.7));
  ctx.save();
  ctx.strokeStyle = edge;
  ctx.lineWidth = 0.5;
  ctx.beginPath();
  ctx.moveTo(top.x + 0.4, top.y);
  ctx.lineTo(head.x + 1.6, head.y - 1);
  ctx.stroke();
  ctx.restore();
  pen.hair([pt(top.x + dir.x * 14 - 0.6, top.y + dir.y * 14), pt(head.x - 1.2, head.y - 2)], 0.5, WATER.light, 0.85);
  // The bead: a teardrop, point up the streak.
  const bead = Array.from({ length: 24 }, (_, i) => {
    const t = (i / 24) * TAU;
    const r = 2.6 * (1 - 0.5 * Math.max(0, -Math.cos(t)));
    const along = -Math.cos(t) * 2.6 - (Math.cos(t) < 0 ? Math.cos(t) * 2.2 : 0);
    return pt(head.x - dir.x * along * 1 + dir.y * Math.sin(t) * r, head.y - dir.y * along * 1 - dir.x * Math.sin(t) * r);
  });
  pen.fill(bead, PAPER_FILL, 0.85);
  pen.fill(bead, WATER.wash, 0.85);
  pen.crescent(bead, pt(-0.7, -0.9), () => pen.fill(bead, WATER.deep, 0.5));
  pen.dot(head.x - 0.8, head.y - 0.6, 0.65, WATER.light, 1);
  pen.hair(closed(bead), 0.55, d.ink, 0.9);
}

/** The splash's square frame (units); rings and droplets reach about 18 from its centre. */
export const RAIN_SPLASH_FRAME = 40;

/**
 * A raindrop landing, seen from above: a wet stain, a ripple ring and a fainter
 * one beyond, a crown of spray thrown out and droplets flung clear, each with
 * a glint. Fixed shape, so only the line boils. Centred in RAIN_SPLASH_FRAME.
 */
export function drawRainSplash(d: Draw): void {
  const { pen } = d;
  const rng = createRng(7300);
  glaze(d, 0, 0, 11, 10, 0, WATER.wash, 0.35);
  const ring = (r: number, w: number, alpha: number, gaps: number): void => {
    for (let k = 0; k < gaps; k++) {
      const a0 = (k / gaps) * TAU + rng() * 0.4;
      const a1 = a0 + (TAU / gaps) * (0.65 + rng() * 0.25);
      const arc = Array.from({ length: 10 }, (_, i) => pt(Math.cos(a0 + ((a1 - a0) * i) / 9) * r, Math.sin(a0 + ((a1 - a0) * i) / 9) * r * 0.94));
      pen.hair(arc.map((p) => pt(p.x + 0.4, p.y + 0.6)), w * 1.2, WATER.deep, alpha * 0.5);
      pen.hair(arc, w, WATER.light, alpha);
      pen.hair(arc.map((p) => pt(p.x * 1.06, p.y * 1.06)), 0.55, d.ink, alpha * 0.85);
    }
  };
  ring(14.5, 0.9, 0.55, 5);
  ring(8.6, 1.5, 0.95, 3);
  // The crown: short spurts of spray thrown outwards.
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * TAU + rng() * 0.3;
    const r0 = 3.4 + rng();
    const r1 = 6.4 + rng() * 1.6;
    const spurt = [pt(Math.cos(a) * r0, Math.sin(a) * r0), pt(Math.cos(a) * r1, Math.sin(a) * r1)];
    pen.hair(spurt, 1.3, WATER.deep, 0.35);
    pen.hair(spurt, 0.8, WATER.light, 0.95);
  }
  const drop = (x: number, y: number, s: number): void => {
    const b = ellipseAt(x, y, s, s * 0.9, 0, 12);
    pen.fill(b, WATER.wash, 0.9);
    pen.crescent(b, pt(-0.4, -0.5), () => pen.fill(b, WATER.deep, 0.5));
    pen.dot(x - s * 0.35, y - s * 0.35, Math.max(0.3, s * 0.3), WATER.light, 1);
    pen.hair(closed(b), 0.4, d.ink, 0.85);
  };
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * TAU + 0.5 + rng() * 0.5;
    const r = 11 + rng() * 7;
    drop(Math.cos(a) * r, Math.sin(a) * r, 0.8 + rng() * 0.9);
  }
  drop(0.3, 0.2, 1.7);
}
