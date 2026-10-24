import { createRng } from '../../logic/rng';
import { type Draw, pt } from '../kit';
import type { Pt } from '../pen';
import { glaze } from '../propsKit';
import { rgba } from '../wash';
import type { Cham } from './chameleonParts';

/**
 * The chameleon's skin: its whole silhouette washed near-white, modelled in
 * soft greys only (light to mid tones), so the game can tint it by multiply
 * with the colour the chameleon is showing: the greys become its deeper shades.
 */
const WHITE = '#ffffff';
/** The ground tone of the skin: a shade under white, so pale markings can show lighter than it. */
const BASE = '#ebebeb';
const MID = '#b0b0b0';
const DEEP = '#8a8a8a';
const GRAIN = '#a4a4a4';

/** Shading on the side of a part turned from the light (upper left), shifted `k` towards it. */
function turned(d: Draw, s: readonly Pt[], k: number, color: string, alpha: number): void {
  d.pen.crescent(s, pt(-k * 0.55, -k * 0.84), () => d.pen.fill(s, color, alpha));
}

/** Pigment pooled at a wash's edge as it dried: a soft darker rim just inside the shape. */
function pooledEdge(d: Draw, s: readonly Pt[], w: number, alpha: number): void {
  const { ctx } = d.pen;
  d.pen.clipped(s, () => {
    ctx.save();
    ctx.strokeStyle = rgba(MID, alpha);
    ctx.lineWidth = w;
    ctx.lineJoin = 'round';
    ctx.beginPath();
    s.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
    ctx.closePath();
    ctx.stroke();
    ctx.restore();
  });
}

/** A shape's shadow falling on another part, down and to the right of it. */
function shadowOn(d: Draw, caster: readonly Pt[], onto: readonly Pt[], off: Pt, alpha: number): void {
  d.pen.clipped(onto, () => d.pen.fill(caster.map((p) => pt(p.x + off.x, p.y + off.y)), DEEP, alpha));
}

/** The trunk's flanks: rounding over the crest, the far flank deeper, soft diagonal bands, a pale stripe along each side. */
function flanks(d: Draw, c: Cham): void {
  const { pen } = d;
  const { ctx } = pen;
  const body = c.body.shape;
  pen.clipped(body, () => {
    const g = ctx.createLinearGradient(0, -17, 0, 17);
    g.addColorStop(0, rgba(MID, 0.3));
    g.addColorStop(0.36, rgba(MID, 0.02));
    g.addColorStop(0.5, rgba(MID, 0));
    g.addColorStop(0.7, rgba(MID, 0.16));
    g.addColorStop(1, rgba(DEEP, 0.5));
    ctx.fillStyle = g;
    ctx.fillRect(-31, -18, 64, 36);
    // Bands slanting back from the crest, as a chameleon's pattern, laid wet so their edges blur.
    for (const x of [19, 11, 3, -5, -13, -21]) {
      for (const s of [-1, 1]) glaze(d, x - 1, s * 9, 2.6, 8, s * 0.3, DEEP, s > 0 ? 0.26 : 0.16);
    }
    // The pale lateral stripe, and the crest's lit ridge.
    for (const s of [-1, 1]) pen.hair([pt(26, s * 7.5), pt(10, s * 10.5), pt(-8, s * 11.2), pt(-24, s * 8.6), pt(-31, s * 4.5)], 2.6, WHITE, 0.75);
    pen.hair([pt(30, -1.2), pt(0, -1.8), pt(-29, -1.2)], 2.2, WHITE, 0.6);
    // Pale freckles scattered over the flanks.
    const rng = createRng(7303);
    for (let i = 0; i < 26; i++) {
      const x = -26 + rng() * 50;
      const y = (rng() < 0.5 ? -1 : 1) * (3 + rng() * 10);
      glaze(d, x, y, 1.1 + rng() * 1, 0.9 + rng() * 0.8, 0, WHITE, 0.9);
    }
  });
  // The tail: bands round it, the inside of the coil in shade.
  const { spine, top, bot } = c.body;
  pen.clipped(body, () => {
    for (let i = c.tailFrom + 3; i < spine.length - 3; i += 5) {
      const m = spine[i]!;
      const w = Math.hypot(top[i]!.x - bot[i]!.x, top[i]!.y - bot[i]!.y);
      glaze(d, m.x, m.y, w * 0.6, w * 0.32, Math.atan2(top[i]!.y - bot[i]!.y, top[i]!.x - bot[i]!.x), DEEP, 0.26);
    }
    pen.hair(bot.slice(c.tailFrom + 10), 2.2, DEEP, 0.3);
  });
}

/** The head: the casque lit on its near side and in shade on its far side, the cheeks under the eyes shadowed. */
function head(d: Draw, c: Cham): void {
  const { pen } = d;
  turned(d, c.head, 7, MID, 0.32);
  turned(d, c.head, 2.6, DEEP, 0.22);
  pen.clipped(c.casque, () => {
    const g = pen.ctx.createLinearGradient(0, -8, 0, 8);
    g.addColorStop(0, rgba(WHITE, 0.6));
    g.addColorStop(0.45, rgba(WHITE, 0));
    g.addColorStop(0.6, rgba(MID, 0.2));
    g.addColorStop(1, rgba(DEEP, 0.45));
    pen.ctx.fillStyle = g;
    pen.ctx.fillRect(10, -9, 50, 18);
  });
  pooledEdge(d, c.casque, 1.4, 0.45);
  for (const e of c.eyes) shadowOn(d, e.shape, c.head, pt(1.6, 2.4), 0.35);
  glaze(d, 55, 0, 4, 3, 0, MID, 0.25);
}

/** A turret eye: a scaly cone, lit at the upper left, deep round its far rim. */
function eye(d: Draw, e: Cham['eyes'][number]): void {
  const { ctx } = d.pen;
  d.pen.clipped(e.shape, () => {
    const g = ctx.createRadialGradient(e.c.x - 2, e.c.y - 2.6, 0.5, e.c.x, e.c.y, e.r * 1.05);
    g.addColorStop(0, rgba(WHITE, 1));
    g.addColorStop(0.5, rgba(MID, 0.18));
    g.addColorStop(1, rgba(DEEP, 0.55));
    ctx.fillStyle = g;
    ctx.fillRect(e.c.x - e.r, e.c.y - e.r, e.r * 2, e.r * 2);
  });
  pooledEdge(d, e.shape, 1.2, 0.5);
}

/** The chameleon's skin layer: near-white silhouette, grey value modelling, nothing outside it. */
export function paintChameleonSkin(d: Draw, c: Cham): void {
  const { pen } = d;
  // Legs first, each segment papered and rounded in turn so the nearer covers the farther.
  for (const l of c.legs) {
    for (const lobe of l.foot.lobes) {
      pen.fill(lobe, BASE, 1);
      turned(d, lobe, 1.4, MID, 0.45);
    }
    pen.fill(l.lower, BASE, 1);
    turned(d, l.lower, 2, MID, 0.45);
    pen.fill(l.upper, BASE, 1);
    turned(d, l.upper, 2.6, MID, 0.42);
    shadowOn(d, l.upper, l.lower, pt(1, 1.6), 0.25);
    for (const s of [l.upper, l.lower]) shadowOn(d, c.body.shape, s, pt(2, 3), 0.4);
  }
  // The trunk and tail.
  pen.fill(c.body.shape, BASE, 1);
  turned(d, c.body.shape, 7, MID, 0.32);
  turned(d, c.body.shape, 2.6, DEEP, 0.3);
  flanks(d, c);
  grain(d, c.body.shape, 7301);
  shadowOn(d, c.head, c.body.shape, pt(2, 3), 0.42);
  pooledEdge(d, c.body.shape, 1.8, 0.5);
  // The head and eyes over the neck.
  pen.fill(c.head, BASE, 1);
  head(d, c);
  grain(d, c.head, 7302);
  pooledEdge(d, c.head, 1.6, 0.4);
  for (const e of c.eyes) {
    pen.fill(e.shape, BASE, 1);
    eye(d, e);
  }
}

/** A fine granular grain, as pigment settling in the paper's tooth. */
function grain(d: Draw, s: readonly Pt[], seed: number): void {
  const rng = createRng(seed);
  d.pen.clipped(s, () => {
    for (let i = 0; i < 200; i++) d.pen.dot(-64 + rng() * 126, -22 + rng() * 44, 0.3 + rng() * 0.35, GRAIN, 0.35);
  });
}
