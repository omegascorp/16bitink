import { createRng, type Rng } from '../../logic/rng';
import { CREATURE_ART } from '../creatures';
import { makeDraw, pt, TAU, type Draw } from '../kit';
import type { Pt } from '../pen';
import { SITE_ART } from '../sites';
import { VIGNETTE } from './types';
import { bandBelow, bloomAt, cloud, gradeFill, hazed, LIGHT, mix, onLayer, rgba, SHADOW, skyline, soft, through } from './vistaKit';
import { hill } from './vistaLand';
import { drawRivalCastle } from './vistaSites';
import { pine, tree } from './vistaTrees';
import { bridge } from './vistaWater';

/**
 * The three scenes behind the menu's map cards, each 220 × 110 units:
 * Ashford's old bridge held by an ogre with the little town's blue spires
 * beyond; the bandits' palisade deep in Thornwood with a red hood among
 * the trees; and the rival lord's castle on its hill under a storm, his
 * red and black banner flying.
 */
const { w: W, h: H } = VIGNETTE;

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
  sky(ctx, [[0, '#9db4cf'], [0.55, '#e3e0d0'], [1, '#f4e3bf']], 70);
  bloomAt(ctx, pt(30, 20), 90, '#fbe7bf', 0.5);
  cloud(ctx, rng, 60, 30, 70, 20, { body: '#b9bccb', lit: '#fbf1dc', shade: '#9a9bb6', alpha: 0.9 });
  cloud(ctx, rng, 190, 22, 50, 14, { body: '#c6c5d2', lit: '#fbefd6', shade: '#b2afc0', alpha: 0.8 });
  hazed(ctx, { color: '#e6e0cf', far: 0.4, near: 0.25, y0: 40, y1: 75 }, (c) => {
    const dd = makeDraw(c, seed + 2, 0, 0);
    hill(dd, rng, skyline(rng, -10, W + 10, 62, 10, 2, 4), H, { lit: '#b6c2a6', body: '#9fb093', deep: '#8a9c8a' }, { reach: 8, inkAlpha: 0 });
    hill(dd, rng, through([pt(90, 80), pt(130, 62), pt(165, 56), pt(200, 60), pt(240, 72)], 3), H, { lit: '#c3c98e', body: '#9fb06c', deep: '#7f9566' }, { reach: 10, inkAlpha: 0.2 });
    c.save();
    c.translate(168, 64);
    c.scale(0.24, 0.24);
    SITE_ART.town(c, seed + 3, 0);
    c.restore();
  });
  // Near banks either side, the river between.
  hill(d, rng, through([pt(-10, 78), pt(40, 74), pt(80, 80), pt(140, 82), pt(230, 76)], 3), H, { lit: '#bfc787', body: '#9fb169', deep: '#7c9558' }, { reach: 8, inkAlpha: 0.3 });
  const water = [pt(-10, 86), pt(W + 10, 84), pt(W + 10, H + 5), pt(-10, H + 5)];
  gradeFill(ctx, water, 84, H, [[0, '#cfd6d2'], [0.4, '#a7bccb'], [1, '#7f9cb6']]);
  ctx.save();
  ctx.strokeStyle = rgba('#fdf8ea', 0.6);
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
  const b = { x0: 26, x1: 196, water: 90, end: 14, crown: 30, stone: '#cdbf9f', inkAlpha: 0.85, arches: [{ at: 0.19, span: 0.2, rise: 13 }, { at: 0.5, span: 0.3, rise: 22 }, { at: 0.81, span: 0.2, rise: 13 }] } as const;
  bridge(d, rng, b);
  // The ogre on the bridge's crown, barring the way.
  ctx.save();
  ctx.translate(108, b.water - b.crown + 0.8);
  ctx.scale(0.36, 0.36);
  CREATURE_ART.ogre(ctx, seed + 5, 0);
  ctx.restore();
  reeds(ctx, rng, -4, 30, 104, 14, '#4d6b3a');
  reeds(ctx, rng, 196, W + 4, 103, 12, '#4d6b3a');
}

/** A palisade seen a little from above: a ring of sharpened logs, the far side peeping over the near, lit on their left. */
function palisade(d: Draw, rng: Rng, cx: number, y: number, rx: number, ry: number, h: number): void {
  const ctx = d.pen.ctx;
  const log = (x: number, foot: number, lh: number, lit: number): void => {
    const w = 3.2;
    const top = foot - lh;
    const shape = [pt(x - w / 2, foot), pt(x - w / 2, top), pt(x, top - 3.4), pt(x + w / 2, top), pt(x + w / 2, foot)];
    const g = ctx.createLinearGradient(x - w / 2, 0, x + w / 2, 0);
    g.addColorStop(0, mix('#b08a5c', SHADOW, 0.5 - lit * 0.5));
    g.addColorStop(0.45, mix('#8a6440', SHADOW, 0.45 - lit * 0.45));
    g.addColorStop(1, mix('#4e3826', SHADOW, 0.3));
    ctx.fillStyle = g;
    d.pen.clipped(shape, () => ctx.fillRect(x - 3, top - 4, 6, lh + 5));
    d.pen.stroke([...shape, shape[0]!], 0.4, d.ink, 0.8);
  };
  // The far side of the ring, over the yard.
  for (let a = Math.PI * 0.95; a > 0.05; a -= 0.08) log(cx + Math.cos(a) * rx * 0.96, y - Math.sin(a) * ry, h * (0.85 + rng() * 0.25), 0.2);
  // The yard inside, in the wall's shadow; a fire's smoke rising from it.
  soft(ctx, 3, () => {
    ctx.fillStyle = rgba('#b9b7b0', 0.35);
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
  sky(ctx, [[0, '#8fa6a0'], [0.6, '#d9d6b6'], [1, '#e8d9a8']], 50);
  bloomAt(ctx, pt(70, 30), 80, '#fbe2a8', 0.6);
  // Far pines in green-grey haze, then nearer and darker ranks.
  hazed(ctx, { color: '#cfd3c0', far: 0.55, near: 0.35, y0: 10, y1: 60 }, (c) => {
    const dd = makeDraw(c, seed + 2, 0, 0);
    for (let x = -6; x < W + 6; x += 6 + rng() * 5) pine(dd, rng, pt(x, 58 + rng() * 4), 34 + rng() * 14, '#3f5d52', 0);
  });
  const ground = through([pt(-10, 70), pt(60, 66), pt(120, 68), pt(180, 64), pt(230, 70)], 3);
  gradeFill(ctx, bandBelow(ground, H + 2), 64, H, [[0, '#7c8a52'], [0.5, '#4f6040'], [1, '#2f3d30']]);
  bloomAt(ctx, pt(116, 74), 46, '#c9b56e', 0.45);
  // The path up to the gate.
  const path = [pt(100, H + 4), pt(108, 90), pt(112, 80), pt(115, 75), pt(119, 75), pt(118, 80), pt(120, 90), pt(126, H + 4)];
  d.pen.fill(path, '#a88a5c', 0.8);
  palisade(d, rng, 116, 66, 34, 5, 13);
  // Dark pines framing the clearing on both sides.
  for (const [x, y, s] of [[8, 96, 70], [26, 88, 56], [-4, 104, 84], [192, 92, 62], [208, 100, 74], [178, 86, 48], [222, 106, 86]] as const) pine(d, rng, pt(x, y), s, '#2f4a3c', 0.55);
  tree(d, rng, pt(48, 92), 46, { leaf: '#4f6b43', trunk: '#3d2e22' }, 0.5);
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
    g.addColorStop(0, rgba('#fff2c8', 0.7));
    g.addColorStop(1, rgba('#fff2c8', 0));
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
}

/** Black Banner: the rival lord's castle on its crag under a storm, his red and black banner streaming, a crow or two. */
export function paintBlackBanner(ctx: CanvasRenderingContext2D, seed: number): void {
  const rng = createRng(seed);
  const d = makeDraw(ctx, seed + 1, 0, 0);
  sky(ctx, [[0, '#3f4262'], [0.45, '#6d6a86'], [0.8, '#c4a88c'], [1, '#e2c49a']], 80);
  // Storm clouds: heavy, dark-bellied, a lurid light low behind the hill.
  bloomAt(ctx, pt(40, 70), 70, '#f0cf9a', 0.55);
  cloud(ctx, rng, 60, 34, 120, 34, { body: '#4e4d68', lit: '#8f8aa0', shade: '#2e2d45', alpha: 0.95 });
  cloud(ctx, rng, 170, 26, 110, 30, { body: '#4a4964', lit: '#86819a', shade: '#2a2a40', alpha: 0.95 });
  cloud(ctx, rng, 110, 12, 160, 26, { body: '#3e3d58', lit: '#6f6a86', shade: '#26263a', alpha: 0.9 });
  // Rain sweeping down on the right.
  ctx.save();
  ctx.strokeStyle = rgba('#c9c6d6', 0.25);
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
  hazed(ctx, { color: '#8e8aa2', far: 0.45, near: 0.3, y0: 60, y1: 85 }, (c) => {
    const dd = makeDraw(c, seed + 2, 0, 0);
    hill(dd, rng, skyline(rng, -10, W + 10, 82, 12, 2, 4), H, { lit: '#8f9478', body: '#6f7a62', deep: '#5a6352' }, { reach: 8, inkAlpha: 0 });
  });
  // The crag the castle stands on.
  const crag = through([pt(36, H + 4), pt(64, 98), pt(96, 88), pt(124, 86), pt(150, 90), pt(184, 102), pt(214, H + 4)], 3);
  hill(d, rng, crag, H + 4, { lit: '#8d8c6c', body: '#5f6650', deep: '#3d4436' }, { reach: 12, inkAlpha: 0.6 });
  // Rock breaking through the turf: ledges lit on top, dark below.
  for (const [x, y, w] of [[78, 99, 14], [150, 97, 18], [170, 104, 12], [104, 104, 10]] as const) {
    const ledge = [pt(x - w / 2, y), pt(x - w * 0.2, y - 2.6), pt(x + w * 0.3, y - 2.2), pt(x + w / 2, y + 0.6), pt(x + w * 0.4, y + 3), pt(x - w * 0.4, y + 3)];
    d.pen.fill(ledge, '#7d7a72', 0.95);
    d.pen.fill(ledge.slice(3).concat([pt(x, y + 0.6)]), mix('#7d7a72', SHADOW, 0.5), 0.7);
    d.pen.stroke([...ledge, ledge[0]!], 0.5, d.ink, 0.8);
  }
  ctx.save();
  ctx.translate(120, 91);
  ctx.scale(0.44, 0.44);
  drawRivalCastle(ctx, seed + 3, 0.9, 1.5);
  ctx.restore();
  // Storm light: a cold glaze from above, the castle's windows lit.
  ctx.save();
  ctx.globalCompositeOperation = 'multiply';
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, rgba('#9a98c0', 0.25));
  g.addColorStop(1, rgba('#6b6a8a', 0.35));
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  ctx.restore();
  // Dark ground in front and a dead tree on the left.
  const near = through([pt(-10, 96), pt(30, 92), pt(60, 100), pt(90, H + 4)], 3);
  gradeFill(ctx, [...near, pt(-10, H + 4)], 90, H, [[0, '#4a4a3a'], [1, '#26262a']]);
  deadTree(d, pt(20, 96), 44);
  for (const [x, y, s] of [[86, 40, 3], [96, 46, 2.4], [150, 54, 2]] as const) crow(d, pt(x, y), s);
}

/** A bare, wind-bent tree: trunk and forking branches in ink. */
function deadTree(d: Draw, base: Pt, s: number): void {
  const limb = (from: Pt, a: number, len: number, w: number, depth: number): void => {
    const to = pt(from.x + Math.cos(a) * len, from.y + Math.sin(a) * len);
    d.pen.stroke([from, pt((from.x + to.x) / 2 + 0.6, (from.y + to.y) / 2), to], w, '#1d1b26', 0.95, false);
    if (depth > 0) {
      limb(to, a - 0.45, len * 0.68, w * 0.62, depth - 1);
      limb(to, a + 0.38, len * 0.6, w * 0.6, depth - 1);
    }
  };
  limb(base, -Math.PI / 2 + 0.12, s * 0.42, s * 0.07, 3);
}

/** A crow: a small ink chevron of wings. */
function crow(d: Draw, c: Pt, s: number): void {
  d.pen.stroke([pt(c.x - s, c.y - s * 0.4), pt(c.x - s * 0.4, c.y - s * 0.1), pt(c.x, c.y + s * 0.2), pt(c.x + s * 0.5, c.y - s * 0.2), pt(c.x + s * 1.1, c.y - s * 0.5)], 0.7, '#1d1b26', 0.95, false);
}
