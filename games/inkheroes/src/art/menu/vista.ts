import { createRng, type Rng } from '../../logic/rng';
import { makeDraw, pt } from '../kit';
import type { Pt } from '../pen';
import { SITE_ART } from '../sites';
import { VISTA, type MenuDrawer } from './types';
import { bloomAt, cloud, hazed, LIGHT, mix, paperGrain, skyline, softly, through, wisp, type CloudTone } from './vistaKit';
import { fields, hill, mountains, type Peak } from './vistaLand';
import { woodland } from './vistaTrees';
import { foreground, framingTrees } from './vistaNear';
import { bridge, river, road } from './vistaWater';
import { drawHamlet, rivalKeep } from './vistaSites';

/**
 * The campaign menu's vista: the border march in late-afternoon light.
 * A calm sky with banks of cloud warm on their tops, far blue mountains,
 * rolling hills of fields and hedgerows, the Crown's walled hill-town on
 * the left, the north road winding down to the old stone bridge over the
 * river, Thornwood's dark pines to the right and, far off, a rival's keep
 * under a red banner. The grassy rise across the bottom (brow y ≈ 780 in
 * the middle) is where the muster stands. Distance is told by haze: far
 * things paler, bluer and unlined, near things warmer and inked.
 */
const { w: W, h: H } = VISTA;

const HAZE = '#e6e0cf';
/** The vanishing point the field boundaries run back to. */
const VP = pt(820, 430);
const CLOUD: CloudTone = { body: '#aeb0c6', lit: '#fdeccf', shade: '#9a9bb6', alpha: 0.95 };
const FAR_CLOUD: CloudTone = { body: '#c6c5d2', lit: '#fbefd6', shade: '#b2afc0', alpha: 0.8 };

function sky(ctx: CanvasRenderingContext2D, rng: Rng): void {
  const g = ctx.createLinearGradient(0, 0, 0, 520);
  g.addColorStop(0, '#8eaacb');
  g.addColorStop(0.35, '#b4c6d6');
  g.addColorStop(0.7, '#e3e2d6');
  g.addColorStop(1, '#f3e4c4');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  // The low sun beyond the upper left: a warm glow over the sky.
  bloomAt(ctx, pt(140, 210), 900, '#fbe7bf', 0.55);
  bloomAt(ctx, pt(140, 210), 300, '#fff4dc', 0.5);
  // Granulating washes: the sky never lies flat.
  for (let i = 0; i < 12; i++) bloomAt(ctx, pt(rng() * W, rng() * 300), 120 + rng() * 160, rng() < 0.5 ? '#9db6d2' : '#f2e6cc', 0.14);
  // High wisps over the middle (the title sits there), heavier cloud banks to either side.
  wisp(ctx, 780, 92, 520, 16, FAR_CLOUD, -0.02);
  wisp(ctx, 600, 168, 300, 11, FAR_CLOUD, 0.01);
  wisp(ctx, 1040, 214, 380, 13, FAR_CLOUD, -0.015);
  wisp(ctx, 360, 60, 260, 12, FAR_CLOUD, 0.02);
  cloud(ctx, rng, 820, 352, 300, 52, FAR_CLOUD);
  cloud(ctx, rng, 560, 372, 220, 40, FAR_CLOUD);
  cloud(ctx, rng, 1100, 360, 260, 48, FAR_CLOUD);
  cloud(ctx, rng, 210, 318, 440, 140, CLOUD);
  cloud(ctx, rng, 1360, 286, 420, 130, CLOUD);
  cloud(ctx, rng, 1530, 140, 220, 62, CLOUD);
  cloud(ctx, rng, 70, 130, 200, 58, CLOUD);
}

/** The far range, faint behind, and the nearer range in front of it. */
const BACK_PEAKS: readonly Peak[] = [
  { x: 170, top: 352, half: 190 }, { x: 640, top: 346, half: 210 }, { x: 930, top: 368, half: 170 }, { x: 1300, top: 338, half: 220 }, { x: 1560, top: 370, half: 160 },
];
const PEAKS: readonly Peak[] = [
  { x: 40, top: 392, half: 130 }, { x: 330, top: 362, half: 175 }, { x: 560, top: 408, half: 110 }, { x: 790, top: 380, half: 150 },
  { x: 1040, top: 404, half: 120 }, { x: 1220, top: 366, half: 165 }, { x: 1470, top: 396, half: 140 },
];

function farHills(ctx: CanvasRenderingContext2D, rng: Rng, seed: number): void {
  const d = makeDraw(ctx, seed, 0, 0);
  mountains(ctx, rng, BACK_PEAKS, 470, { body: '#b7bdd2', lit: '#e9dccd', shade: '#9ea4c2', snow: '#fbf3e4' });
  mountains(ctx, rng, PEAKS, 484, { body: '#97a3c2', lit: '#dccbbb', shade: '#717ca4', snow: '#f8eedd' });
  const ridge = skyline(rng, -20, W + 20, 486, 34, 4);
  hill(d, rng, ridge, H, { lit: '#bcc7a8', body: '#a1b096', deep: '#8c9c8e' }, { reach: 18, inkAlpha: 0 });
  woodland(d, rng, skyline(rng, 1180, W + 20, 500, 10, 2), { s: 22, rows: 2, gap: 9, tone: { leaf: '#7c8f78', trunk: '#5f5a55' }, pines: 0.7, pineLeaf: '#6d8070', inkAlpha: 0 });
  rivalKeep(ctx, seed + 5, pt(1465, 486), 0.5);
}

/** Rolling farmland in the middle distance, with the town's hill on the left and Thornwood's eaves on the right. */
function midHills(ctx: CanvasRenderingContext2D, rng: Rng, seed: number): void {
  const d = makeDraw(ctx, seed, 0, 0);
  const crest = skyline(rng, -20, W + 20, 536, 30, 5);
  hill(d, rng, crest, H, { lit: '#c3c98e', body: '#a3b377', deep: '#7f9566' }, {
    reach: 26, inkAlpha: 0.12, texture: 500,
    fields: (shape) => fields(d, rng, shape, crest, { x0: 560, x1: 1250, from: 4, rows: 4, depth: 9, alpha: 0.5, hedge: '#6d8160', vp: VP }),
  });
  woodland(d, rng, skyline(rng, 1170, W + 30, 556, 14, 2), { s: 34, rows: 3, gap: 12, tone: { leaf: '#56704f', trunk: '#4a3a2e' }, pines: 0.85, pineLeaf: '#3f5a4a', inkAlpha: 0.15 });
  woodland(d, rng, through([pt(640, 548), pt(700, 545), pt(760, 549)]), { s: 26, rows: 1, gap: 12, tone: { leaf: '#70895a', trunk: '#4a3a2e' }, inkAlpha: 0.1 });
  // The town's hill: a broad green knoll, higher and nearer, the walled town on its crown.
  const knoll = through([pt(170, 600), pt(270, 520), pt(380, 486), pt(480, 478), pt(580, 492), pt(690, 545), pt(790, 600)], 6);
  hill(d, rng, knoll, H, { lit: '#c6cc8a', body: '#9fb06c', deep: '#76905c' }, {
    reach: 30, inkAlpha: 0.25, texture: 300,
    fields: (shape) => fields(d, rng, shape, knoll, { x0: 180, x1: 780, from: 44, rows: 4, depth: 12, alpha: 0.5, hedge: '#5f7550', vp: VP }),
  });
  cloudShadows(ctx, rng, [[980, 560, 240, 16], [140, 590, 200, 22]]);
  woodland(d, rng, through([pt(250, 560), pt(300, 548), pt(340, 552)]), { s: 30, rows: 1, gap: 13, tone: { leaf: '#6e8956', trunk: '#4a3a2e' }, inkAlpha: 0.2 });
  hazed(ctx, { color: HAZE, far: 0.3, near: 0.15, y0: 380, y1: 520 }, (c) => {
    c.translate(486, 512);
    c.scale(1.1, 1.1);
    SITE_ART.town(c, seed + 11, 0);
  });
}

const RIVER: readonly Pt[] = [pt(1062, 548), pt(1040, 572), pt(1072, 600), pt(1040, 632), pt(1012, 664), pt(1022, 694), pt(1040, 716), pt(1100, 742), pt(1210, 760), pt(1360, 772), pt(1520, 790), pt(1680, 800)];
const ROAD = { lit: '#e2d0a4', edge: '#9c8257' } as const;

/** Soft cloud shadows drifting over the land: cool glazes that dapple the light. */
function cloudShadows(ctx: CanvasRenderingContext2D, rng: Rng, spots: readonly (readonly [number, number, number, number])[]): void {
  for (const [x, y, rx, ry] of spots) {
    ctx.save();
    ctx.globalCompositeOperation = 'source-atop';
    const tilt = (rng() - 0.5) * 0.08;
    softly(ctx, ry * 0.8, '#4f5f7a', 0.16 + rng() * 0.06, (c) => {
      c.beginPath();
      c.ellipse(x, y, rx, ry, tilt, 0, Math.PI * 2);
    });
    ctx.restore();
  }
}

/** The valley floor: meadows, a hamlet and a windmill, the river winding towards us under the old bridge, the road from the town over it. */
function valley(ctx: CanvasRenderingContext2D, rng: Rng, seed: number): void {
  const d = makeDraw(ctx, seed, 0, 0);
  const floor = through([pt(-20, 636), pt(140, 612), pt(330, 598), pt(520, 604), pt(700, 586), pt(880, 590), pt(1080, 596), pt(1290, 580), pt(1460, 592), pt(1620, 588)], 6);
  hill(d, rng, floor, H, { lit: '#c4c683', body: '#9fb169', deep: '#7c9558' }, {
    reach: 24, inkAlpha: 0.18, texture: 900,
    fields: (shape) => fields(d, rng, shape, floor, { x0: -20, x1: W + 20, from: 4, rows: 5, depth: 14, alpha: 0.45, hedge: '#566d45', vp: VP }),
  });
  cloudShadows(ctx, rng, [[260, 700, 260, 34], [1380, 690, 300, 30], [820, 610, 220, 14]]);
  woodland(d, rng, through([pt(1150, 616), pt(1240, 606), pt(1330, 612)]), { s: 40, rows: 2, gap: 14, tone: { leaf: '#5f7d4b', trunk: '#4a3a2e' }, pines: 0.4, pineLeaf: '#405c48', inkAlpha: 0.3 });
  river(d, rng, RIVER, 5, 70, { far: '#e4e1d2', near: '#94aec0', bank: '#a8946a' }, 0.35);
  // The north road: down from the town's gate, along the valley, over the bridge and on east; a lane down to the muster.
  road(d, rng, [pt(486, 520), pt(500, 552), pt(560, 590), pt(680, 630), pt(820, 668), pt(946, 700)], 5, 13, ROAD, 0.3);
  road(d, rng, [pt(1104, 700), pt(1210, 690), pt(1340, 664), pt(1480, 640), pt(1630, 624)], 13, 8, ROAD, 0.3);
  road(d, rng, [pt(760, 656), pt(780, 700), pt(806, 750), pt(820, 800)], 9, 30, ROAD, 0.35);
  bridge(d, rng, { x0: 944, x1: 1106, water: 714, end: 13, crown: 34, stone: '#cdbf9f', inkAlpha: 0.6, arches: [{ at: 0.18, span: 0.2, rise: 12 }, { at: 0.5, span: 0.32, rise: 24 }, { at: 0.82, span: 0.2, rise: 12 }] });
  ctx.save();
  ctx.translate(330, 664);
  ctx.scale(0.85, 0.85);
  SITE_ART.windmill(ctx, seed + 21, 0);
  ctx.restore();
  ctx.save();
  ctx.translate(640, 640);
  ctx.scale(0.75, 0.75);
  drawHamlet(ctx, seed + 23);
  ctx.restore();
  // Copses and lone trees about the meadows and along the river.
  woodland(d, rng, through([pt(120, 650), pt(200, 640)]), { s: 44, rows: 1, gap: 18, tone: { leaf: '#6c8a4f', trunk: '#4a3a2e' }, inkAlpha: 0.3 });
  woodland(d, rng, through([pt(540, 702), pt(610, 694)]), { s: 50, rows: 2, gap: 16, tone: { leaf: '#6f8d50', trunk: '#4a3a2e' }, inkAlpha: 0.35 });
  woodland(d, rng, through([pt(1140, 738), pt(1240, 752)]), { s: 54, rows: 2, gap: 17, tone: { leaf: '#66844c', trunk: '#4a3a2e' }, inkAlpha: 0.4 });
  woodland(d, rng, through([pt(1420, 700), pt(1500, 690)]), { s: 62, rows: 1, gap: 30, tone: { leaf: '#5f7d4b', trunk: '#4a3a2e' }, pines: 0.5, pineLeaf: '#405c48', inkAlpha: 0.4 });
}

/** The finish: the late sun's golden glaze over the land, a warm glow from the light's side, cool deepening in the lower corners, and the paper's tooth. */
function finish(ctx: CanvasRenderingContext2D): void {
  ctx.save();
  ctx.globalCompositeOperation = 'soft-light';
  const gold = ctx.createLinearGradient(0, 300, 0, H);
  gold.addColorStop(0, 'rgba(242,196,120,0)');
  gold.addColorStop(0.3, 'rgba(242,196,120,0.45)');
  gold.addColorStop(1, 'rgba(232,180,100,0.35)');
  ctx.fillStyle = gold;
  ctx.fillRect(0, 300, W, H - 300);
  bloomAt(ctx, pt(160, 200), 1100, LIGHT, 0.5);
  ctx.globalCompositeOperation = 'multiply';
  bloomAt(ctx, pt(W + 100, H + 100), 700, mix('#7d86b0', '#ffffff', 0.4), 0.35);
  bloomAt(ctx, pt(-100, H + 100), 600, mix('#7d86b0', '#ffffff', 0.4), 0.3);
  ctx.restore();
  paperGrain(ctx, 0.35);
}

export const drawVista: MenuDrawer = (ctx, seed) => {
  const rng = createRng(seed);
  ctx.save();
  sky(ctx, rng);
  hazed(ctx, { color: HAZE, far: 0.6, near: 0.4, y0: 330, y1: 520 }, (c) => farHills(c, createRng(seed + 1), seed + 1));
  hazed(ctx, { color: HAZE, far: 0.4, near: 0.22, y0: 470, y1: 620 }, (c) => midHills(c, createRng(seed + 2), seed + 2));
  hazed(ctx, { color: HAZE, far: 0.22, near: 0, y0: 590, y1: 760 }, (c) => valley(c, createRng(seed + 3), seed + 3));
  foreground(ctx, seed + 4, W, H);
  framingTrees(ctx, seed + 5, W);
  finish(ctx);
  ctx.restore();
};
