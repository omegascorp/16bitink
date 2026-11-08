import { createRng, type Rng } from '../../logic/rng';
import { CREATURE_ART } from '../creatures';
import { makeDraw, pt, TAU, type Draw } from '../kit';
import type { Pt } from '../pen';
import { SITE_ART } from '../sites';
import { VIGNETTE } from './types';
import { bandBelow, bloomAt, dusk, gradeFill, hazed, LIGHT, massCloud, mix, onLayer, rgba, SHADOW, skyline, soft, through, type MassTone } from './vistaKit';
import { hill } from './vistaLand';
import { drawRivalCastle } from './vistaSites';
import { pine, tree } from './vistaTrees';
import { bridge } from './vistaWater';

/**
 * The three scenes behind the menu's map cards, each 220 × 110 units:
 * Ashford's old bridge at sundown, held by an ogre, the little town's
 * spires dark beyond; the bandits' palisade deep in Thornwood with a red hood among
 * the trees; and the rival lord's castle on its hill under a storm, his
 * red and black banner flying.
 */
const { w: W, h: H } = VIGNETTE;

const DUSK_CLOUD: MassTone = { body: '#6a5060', deep: '#3a2c40', lit: '#ffd890', glow: '#e09050', alpha: 1 };
const STORM_CLOUD: MassTone = { body: '#3a3550', deep: '#1c1a2c', lit: '#e8b468', glow: '#a86448', alpha: 1 };
const NIGHT_CLOUD: MassTone = { body: '#22202e', deep: '#121018', lit: '#9a7a6a', glow: '#5a3a3a', alpha: 1 };
/** The darkest ink, for silhouettes against the storm. */
const INK_DARK = '#1a120c';

function sky(ctx: CanvasRenderingContext2D, stops: readonly (readonly [number, string])[], y1: number): void {
  const g = ctx.createLinearGradient(0, 0, 0, y1);
  for (const [t, c] of stops) g.addColorStop(t, c);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
}

/** Reeds and grass along a bank: fine strokes, a few seed heads. */
function reeds(ctx: CanvasRenderingContext2D, rng: Rng, x0: number, x1: number, y: number, h: number, color: string): void {
  ctx.save();
  ctx.lineCap = 'round';
  for (let x = x0; x < x1; x += 1.2 + rng() * 2) {
    const len = h * (0.4 + rng() * 0.8);
    const lean = (rng() - 0.35) * 0.5;
    ctx.strokeStyle = rgba(rng() < 0.25 ? mix(color, LIGHT, 0.5) : color, 0.85);
    ctx.lineWidth = 0.5 + rng() * 0.4;
    ctx.beginPath();
    ctx.moveTo(x, y + rng() * 2);
    ctx.quadraticCurveTo(x + lean * len * 0.3, y - len * 0.6, x + lean * len, y - len);
    ctx.stroke();
    if (rng() < 0.08) {
      ctx.fillStyle = rgba('#6b4a2e', 0.9);
      ctx.beginPath();
      ctx.ellipse(x + lean * len, y - len, 0.7, 1.8, lean, 0, TAU);
      ctx.fill();
    }
  }
  ctx.restore();
}

/** Ashford: the old stone bridge over the river, the ogre planted on its crown, the town's blue spires on the hill beyond. */
export function paintAshford(ctx: CanvasRenderingContext2D, seed: number): void {
  const rng = createRng(seed);
  const d = makeDraw(ctx, seed + 1, 0, 0);
  sky(ctx, [[0, '#141c34'], [0.35, '#3a3a5a'], [0.7, '#a0684a'], [1, '#e2a860']], 72);
  const sun = pt(24, 66);
  bloomAt(ctx, sun, 90, '#f6c070', 0.55);
  bloomAt(ctx, sun, 26, '#fff0c0', 0.7);
  massCloud(ctx, rng, 70, 34, 130, 40, DUSK_CLOUD, sun, 160);
  massCloud(ctx, rng, 180, 26, 120, 44, STORM_CLOUD, sun, 220);
  massCloud(ctx, rng, 110, 6, 240, 24, STORM_CLOUD, sun, 200);
  hazed(ctx, { color: '#5d6276', far: 0.45, near: 0.3, y0: 40, y1: 75 }, (c) => {
    const dd = makeDraw(c, seed + 2, 0, 0);
    hill(dd, rng, skyline(rng, -10, W + 10, 62, 10, 2, 4), H, { lit: '#5e6448', body: '#3e4636', deep: '#2e3430' }, { reach: 8, inkAlpha: 0 });
    hill(dd, rng, through([pt(90, 80), pt(130, 62), pt(165, 56), pt(200, 60), pt(240, 72)], 3), H, { lit: '#727438', body: '#46562a', deep: '#283420' }, { reach: 10, inkAlpha: 0.2 });
    dusk(c, 168, 64, 0.24, 0.55, (cc) => SITE_ART.town(cc, seed + 3, 0));
  });
  // Near banks either side, the river between.
  hill(d, rng, through([pt(-10, 78), pt(40, 74), pt(80, 80), pt(140, 82), pt(230, 76)], 3), H, { lit: '#6a6a34', body: '#3a4824', deep: '#1e2614' }, { reach: 8, inkAlpha: 0.3 });
  const water = [pt(-10, 86), pt(W + 10, 84), pt(W + 10, H + 5), pt(-10, H + 5)];
  gradeFill(ctx, water, 84, H, [[0, '#c8905a'], [0.35, '#4a4450'], [1, '#18203a']]);
  ctx.save();
  ctx.strokeStyle = rgba('#f2c878', 0.6);
  ctx.lineWidth = 0.7;
  for (let i = 0; i < 26; i++) {
    const y = 90 + rng() * 18;
    const x = rng() * W;
    ctx.beginPath();
    ctx.moveTo(x - 4 - rng() * 8, y);
    ctx.lineTo(x + 4 + rng() * 8, y);
    ctx.stroke();
  }
  ctx.restore();
  d.pen.stroke([pt(-10, 86), pt(W / 2, 85), pt(W + 10, 84)], 0.7, d.ink, 0.45, false);
  const b = { x0: 26, x1: 196, water: 90, end: 14, crown: 30, stone: '#7e7462', inkAlpha: 0.85, arches: [{ at: 0.19, span: 0.2, rise: 13 }, { at: 0.5, span: 0.3, rise: 22 }, { at: 0.81, span: 0.2, rise: 13 }] } as const;
  bridge(d, rng, b);
  // The ogre on the bridge's crown, barring the way.
  ctx.save();
  ctx.translate(108, b.water - b.crown + 0.8);
  ctx.scale(0.36, 0.36);
  CREATURE_ART.ogre(ctx, seed + 5, 0);
  ctx.restore();
  reeds(ctx, rng, -4, 30, 104, 14, '#1e2814');
  reeds(ctx, rng, 196, W + 4, 103, 12, '#1e2814');
  dimEdges(ctx);
}

/** The light failing at the edges: corners sunk into umber, the scene's heart left lit. */
function dimEdges(ctx: CanvasRenderingContext2D): void {
  ctx.save();
  ctx.globalCompositeOperation = 'multiply';
  const g = ctx.createRadialGradient(W * 0.48, H * 0.48, H * 0.25, W * 0.5, H * 0.5, W * 0.62);
  g.addColorStop(0, 'rgba(255,255,255,0)');
  g.addColorStop(1, rgba('#3a2418', 0.75));
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  ctx.restore();
}

/** A palisade seen a little from above: a ring of sharpened logs, the far side peeping over the near, lit on their left. */
function palisade(d: Draw, rng: Rng, cx: number, y: number, rx: number, ry: number, h: number): void {
  const ctx = d.pen.ctx;
  const log = (x: number, foot: number, lh: number, lit: number): void => {
    const w = 3.2;
    const top = foot - lh;
    const shape = [pt(x - w / 2, foot), pt(x - w / 2, top), pt(x, top - 3.4), pt(x + w / 2, top), pt(x + w / 2, foot)];
    const g = ctx.createLinearGradient(x - w / 2, 0, x + w / 2, 0);
    g.addColorStop(0, mix('#9a7046', SHADOW, 0.55 - lit * 0.45));
    g.addColorStop(0.45, mix('#6a4a2c', SHADOW, 0.5 - lit * 0.4));
    g.addColorStop(1, mix('#3a2818', SHADOW, 0.35));
    ctx.fillStyle = g;
    d.pen.clipped(shape, () => ctx.fillRect(x - 3, top - 4, 6, lh + 5));
    d.pen.stroke([...shape, shape[0]!], 0.4, d.ink, 0.8);
  };
  // The far side of the ring, over the yard.
  for (let a = Math.PI * 0.95; a > 0.05; a -= 0.08) log(cx + Math.cos(a) * rx * 0.96, y - Math.sin(a) * ry, h * (0.85 + rng() * 0.25), 0.2);
  // The yard inside, in the wall's shadow; a fire's smoke rising from it.
  soft(ctx, 3, () => {
    ctx.fillStyle = rgba('#6e6a6a', 0.35);
    for (let i = 0; i < 5; i++) {
      ctx.beginPath();
      ctx.ellipse(cx + 8 + i * 3, y - h - 6 - i * 7, 4 + i, 3 + i * 0.6, 0, 0, TAU);
      ctx.fill();
    }
  });
  // The ground shadow along the wall's foot.
  soft(ctx, 2, () => {
    ctx.fillStyle = rgba(SHADOW, 0.35);
    ctx.beginPath();
    ctx.ellipse(cx + 4, y + ry * 0.7 + 2, rx * 1.05, ry * 0.9, 0, 0, Math.PI);
    ctx.fill();
  });
  for (let a = Math.PI * 0.97; a > 0.03; a -= 0.075) {
    const x = cx + Math.cos(a) * rx;
    if (Math.abs(x - cx) < 6.5) continue;
    log(x, y + Math.sin(a) * ry, h * (0.9 + rng() * 0.25), Math.max(0, Math.min(1, 0.6 - Math.cos(a) * 0.6)));
  }
  // The gate: dark planks between two taller posts, a platform over it.
  const gx = cx;
  const gy = y + ry;
  const gateShape = [pt(gx - 6, gy), pt(gx - 6, gy - h * 0.8), pt(gx + 6, gy - h * 0.8), pt(gx + 6, gy)];
  d.pen.fill(gateShape, '#3d2c20', 0.95);
  for (let x = gx - 4; x < gx + 6; x += 2.4) d.pen.hair([pt(x, gy), pt(x, gy - h * 0.8)], 0.35, '#7a5a3c', 0.7);
  d.pen.stroke([...gateShape, gateShape[0]!], 0.5, d.ink, 0.9);
  for (const s of [-1, 1]) d.pen.stroke([pt(gx + s * 7, gy + 1), pt(gx + s * 7, gy - h * 1.7)], 1.6, '#5a3d26', 1, false);
  const deck = [pt(gx - 10, gy - h * 1.5), pt(gx + 10, gy - h * 1.5), pt(gx + 9, gy - h * 1.35), pt(gx - 9, gy - h * 1.35)];
  d.pen.fill(deck, '#8a6440', 1);
  d.pen.stroke([...deck, deck[0]!], 0.5, d.ink, 0.9);
  const roof = [pt(gx - 11, gy - h * 1.95), pt(gx, gy - h * 2.35), pt(gx + 11, gy - h * 1.95)];
  d.pen.fill(roof, '#6e5238', 1);
  d.pen.fill([roof[1]!, roof[2]!, pt(gx, gy - h * 1.95)], mix('#6e5238', SHADOW, 0.4), 0.8);
  d.pen.stroke(roof, 0.6, d.ink, 0.9, false);
  for (const s of [-1, 1]) d.pen.hair([pt(gx + s * 9, gy - h * 1.95), pt(gx + s * 9, gy - h * 1.45)], 0.6, '#4b3a2b', 1);
  // A lantern's glow on the platform.
  bloomAt(ctx, pt(gx + 4, gy - h * 1.6), 7, '#ffd27a', 0.7);
}

/** Thornwood: dark pines crowding a clearing, the bandits' timber fort in it, a red hood watching from the trees. */
export function paintThornwood(ctx: CanvasRenderingContext2D, seed: number): void {
  const rng = createRng(seed);
  const d = makeDraw(ctx, seed + 1, 0, 0);
  sky(ctx, [[0, '#1c2236'], [0.5, '#6a4e48'], [1, '#d09050']], 50);
  bloomAt(ctx, pt(70, 34), 80, '#f0b866', 0.55);
  // Far pines in blue-grey dusk, then nearer and darker ranks.
  hazed(ctx, { color: '#4e5468', far: 0.55, near: 0.35, y0: 10, y1: 60 }, (c) => {
    const dd = makeDraw(c, seed + 2, 0, 0);
    for (let x = -6; x < W + 6; x += 6 + rng() * 5) pine(dd, rng, pt(x, 58 + rng() * 4), 34 + rng() * 14, '#1e2c26', 0);
  });
  const ground = through([pt(-10, 70), pt(60, 66), pt(120, 68), pt(180, 64), pt(230, 70)], 3);
  gradeFill(ctx, bandBelow(ground, H + 2), 64, H, [[0, '#4e5226'], [0.5, '#262e18'], [1, '#12160c']]);
  bloomAt(ctx, pt(116, 74), 46, '#a07a3a', 0.45);
  // The path up to the gate.
  const path = [pt(100, H + 4), pt(108, 90), pt(112, 80), pt(115, 75), pt(119, 75), pt(118, 80), pt(120, 90), pt(126, H + 4)];
  d.pen.fill(path, '#6a5232', 0.85);
  palisade(d, rng, 116, 66, 34, 5, 13);
  // Dark pines framing the clearing on both sides.
  for (const [x, y, s] of [[8, 96, 70], [26, 88, 56], [-4, 104, 84], [192, 92, 62], [208, 100, 74], [178, 86, 48], [222, 106, 86]] as const) pine(d, rng, pt(x, y), s, '#142018', 0.55);
  tree(d, rng, pt(48, 92), 46, { leaf: '#26341c', trunk: '#22160e' }, 0.5);
  // The watcher: a bandit at the wood's edge, his hood dyed red.
  onLayer(ctx, (c) => {
    c.translate(66, 104);
    c.scale(0.5, 0.5);
    CREATURE_ART.bandit(c, seed + 5, 0);
  }, (c) => {
    c.translate(66, 104);
    c.scale(0.5, 0.5);
    c.globalCompositeOperation = 'color';
    c.fillStyle = rgba('#b02a22', 0.9);
    c.beginPath();
    c.ellipse(-1.6, -55.5, 7.2, 7.4, 0, 0, TAU);
    c.fill();
    c.beginPath();
    c.ellipse(-6, -43, 5.6, 5.5, 0.4, 0, TAU);
    c.fill();
  });
  // Shafts of late light through the trees, and the gloom under them.
  ctx.save();
  ctx.globalCompositeOperation = 'soft-light';
  for (const x of [70, 96]) {
    const g = ctx.createLinearGradient(x, 0, x + 30, H);
    g.addColorStop(0, rgba('#f6c878', 0.6));
    g.addColorStop(1, rgba('#f6c878', 0));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x + 14, 0);
    ctx.lineTo(x + 48, H);
    ctx.lineTo(x + 26, H);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
  dimEdges(ctx);
}

/** Black Banner: the rival lord's castle on its crag under a storm, his red and black banner streaming, a crow or two. */
export function paintBlackBanner(ctx: CanvasRenderingContext2D, seed: number): void {
  const rng = createRng(seed);
  const d = makeDraw(ctx, seed + 1, 0, 0);
  sky(ctx, [[0, '#10121e'], [0.45, '#2e2e44'], [0.8, '#7a5448'], [1, '#c08050']], 80);
  // Storm clouds: heavy, dark-bellied, a lurid light low behind the hill.
  const glare = pt(40, 74);
  bloomAt(ctx, glare, 70, '#e8a060', 0.5);
  massCloud(ctx, rng, 60, 40, 130, 40, STORM_CLOUD, glare, 140);
  massCloud(ctx, rng, 170, 30, 120, 36, STORM_CLOUD, glare, 200);
  massCloud(ctx, rng, 110, 12, 240, 30, NIGHT_CLOUD, glare, 200);
  // Rain sweeping down on the right.
  ctx.save();
  ctx.strokeStyle = rgba('#8a8aa0', 0.3);
  ctx.lineWidth = 0.5;
  for (let i = 0; i < 60; i++) {
    const x = 120 + rng() * 120;
    const y = 30 + rng() * 50;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x - 3, y + 8);
    ctx.stroke();
  }
  ctx.restore();
  // A fork of lightning far off.
  const bolt: Pt[] = [pt(196, 30), pt(192, 40), pt(197, 46), pt(190, 58), pt(194, 63)];
  soft(ctx, 2, () => d.pen.stroke(bolt, 2.4, '#f6efd8', 0.5, false));
  d.pen.stroke(bolt, 0.7, '#fffaf0', 0.95, false);
  hazed(ctx, { color: '#4a4a5e', far: 0.45, near: 0.3, y0: 60, y1: 85 }, (c) => {
    const dd = makeDraw(c, seed + 2, 0, 0);
    hill(dd, rng, skyline(rng, -10, W + 10, 82, 12, 2, 4), H, { lit: '#4e5040', body: '#363c30', deep: '#262a24' }, { reach: 8, inkAlpha: 0 });
  });
  // The crag the castle stands on.
  const crag = through([pt(36, H + 4), pt(64, 98), pt(96, 88), pt(124, 86), pt(150, 90), pt(184, 102), pt(214, H + 4)], 3);
  hill(d, rng, crag, H + 4, { lit: '#5e5c44', body: '#363a2c', deep: '#1e2218' }, { reach: 12, inkAlpha: 0.6 });
  // Rock breaking through the turf: ledges lit on top, dark below.
  for (const [x, y, w] of [[78, 99, 14], [150, 97, 18], [170, 104, 12], [104, 104, 10]] as const) {
    const ledge = [pt(x - w / 2, y), pt(x - w * 0.2, y - 2.6), pt(x + w * 0.3, y - 2.2), pt(x + w / 2, y + 0.6), pt(x + w * 0.4, y + 3), pt(x - w * 0.4, y + 3)];
    d.pen.fill(ledge, '#5e584e', 0.95);
    d.pen.fill(ledge.slice(3).concat([pt(x, y + 0.6)]), mix('#5e584e', SHADOW, 0.5), 0.7);
    d.pen.stroke([...ledge, ledge[0]!], 0.5, d.ink, 0.8);
  }
  dusk(ctx, 120, 91, 0.44, 0.6, (c) => drawRivalCastle(c, seed + 3, 0.9, 1.5));
  // Storm light: a cold glaze from above, the castle's windows lit.
  ctx.save();
  ctx.globalCompositeOperation = 'multiply';
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, rgba('#6a6890', 0.3));
  g.addColorStop(1, rgba('#4a3e4e', 0.45));
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  ctx.restore();
  // Dark ground in front and a dead tree on the left.
  const near = through([pt(-10, 96), pt(30, 92), pt(60, 100), pt(90, H + 4)], 3);
  gradeFill(ctx, [...near, pt(-10, H + 4)], 90, H, [[0, '#2a2a20'], [1, '#100e0e']]);
  deadTree(d, pt(20, 96), 44);
  for (const [x, y, s] of [[86, 40, 3], [96, 46, 2.4], [150, 54, 2]] as const) crow(d, pt(x, y), s);
  dimEdges(ctx);
}

/** A bare, wind-bent tree: trunk and forking branches in ink. */
function deadTree(d: Draw, base: Pt, s: number): void {
  const limb = (from: Pt, a: number, len: number, w: number, depth: number): void => {
    const to = pt(from.x + Math.cos(a) * len, from.y + Math.sin(a) * len);
    d.pen.stroke([from, pt((from.x + to.x) / 2 + 0.6, (from.y + to.y) / 2), to], w, INK_DARK, 0.95, false);
    if (depth > 0) {
      limb(to, a - 0.45, len * 0.68, w * 0.62, depth - 1);
      limb(to, a + 0.38, len * 0.6, w * 0.6, depth - 1);
    }
  };
  limb(base, -Math.PI / 2 + 0.12, s * 0.42, s * 0.07, 3);
}

/** A crow: a small ink chevron of wings. */
function crow(d: Draw, c: Pt, s: number): void {
  d.pen.stroke([pt(c.x - s, c.y - s * 0.4), pt(c.x - s * 0.4, c.y - s * 0.1), pt(c.x, c.y + s * 0.2), pt(c.x + s * 0.5, c.y - s * 0.2), pt(c.x + s * 1.1, c.y - s * 0.5)], 0.7, INK_DARK, 0.95, false);
}
