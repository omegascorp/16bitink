import { createRng, type Rng } from '../../logic/rng';
import { makeDraw, pt } from '../kit';
import type { Pt } from '../pen';
import { SITE_ART } from '../sites';
import { VISTA, type MenuDrawer } from './types';
import { bloomAt, hazed, LIGHT, dusk, massCloud, mix, paperGrain, rgba, skyline, soft, softly, through, wisp, type CloudTone, type MassTone } from './vistaKit';
import { fields, hill, mountains, type Peak } from './vistaLand';
import { woodland } from './vistaTrees';
import { foreground, framingTrees } from './vistaNear';
import { bridge, river, road } from './vistaWater';
import { drawHamlet, rivalKeep } from './vistaSites';

/**
 * The campaign menu's vista: the border march at the end of the day, a
 * storm gathering. The sun is going down behind the far range on the
 * left, and the sky is a deep ultramarine vault over a burning amber
 * horizon, towering cloud masses lit gold along the edges turned to it.
 * Below, dark green-umber country falls away into blue-grey haze: the
 * Crown's walled town on its knoll at the left, the road winding down to
 * the old stone bridge, the river catching the last light, Thornwood's
 * black pines to the right and, far off, the rival's keep under his red
 * banner. The foreground rise (brow y ≈ 780 in the middle), where the
 * muster stands, lies in deep shadow, framed by dark trees at the edges.
 */
const { w: W, h: H } = VISTA;

/** The low sun, behind the far range at the left. */
const SUN = pt(150, 430);
/** Blue-grey evening haze: what distance fades into. */
const HAZE = '#5d6276';
/** The warmer haze low in the valleys towards the sun. */
const GOLD_HAZE = '#9a6a3a';
/** The vanishing point the field boundaries run back to. */
const VP = pt(820, 430);

const STORM: MassTone = { body: '#3a3550', deep: '#1c1a2c', lit: '#f2c46e', glow: '#b8704a', alpha: 1 };
const FAR_STORM: MassTone = { body: '#5c5068', deep: '#3a3048', lit: '#f6d58c', glow: '#d08a58', alpha: 1 };
const LOW_CLOUD: MassTone = { body: '#8a6660', deep: '#5a4250', lit: '#ffe0a0', glow: '#e8a060', alpha: 1 };
const WISP: CloudTone = { body: '#4e4660', lit: '#d9a46a', shade: '#2e2a40', alpha: 0.7 };

function sky(ctx: CanvasRenderingContext2D, rng: Rng): void {
  const g = ctx.createLinearGradient(0, 0, 0, 500);
  g.addColorStop(0, '#0f1528');
  g.addColorStop(0.22, '#1c2848');
  g.addColorStop(0.48, '#3a3c5c');
  g.addColorStop(0.68, '#7a5a5c');
  g.addColorStop(0.84, '#c4844c');
  g.addColorStop(1, '#e8b268');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  // The sun's furnace low on the left, its glow spreading along the horizon.
  ctx.save();
  ctx.translate(SUN.x, SUN.y);
  ctx.scale(1.9, 1);
  bloomAt(ctx, pt(0, 0), 520, '#f0a858', 0.5);
  ctx.restore();
  bloomAt(ctx, SUN, 260, '#ffd88a', 0.55);
  bloomAt(ctx, SUN, 90, '#fff2c8', 0.8);
  // Granulating washes: the sky never lies flat.
  for (let i = 0; i < 14; i++) bloomAt(ctx, pt(rng() * W, rng() * 260), 120 + rng() * 180, rng() < 0.6 ? '#0c1022' : '#3c3a5e', 0.2);
  // Wind-torn streaks high up, catching a little warmth.
  wisp(ctx, 760, 128, 560, 14, WISP, -0.03);
  wisp(ctx, 980, 210, 420, 12, WISP, 0.02);
  wisp(ctx, 560, 236, 300, 10, WISP, -0.01);
}

/** Shafts of light fanning up from the sun through the gaps in the cloud. */
function rays(ctx: CanvasRenderingContext2D): void {
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  for (const [a, spread, alpha] of [[-0.62, 0.05, 0.16], [-0.42, 0.035, 0.12], [-0.25, 0.06, 0.14], [-0.1, 0.03, 0.1]] as const) {
    const len = 1300;
    const g = ctx.createRadialGradient(SUN.x, SUN.y, 0, SUN.x, SUN.y, len);
    g.addColorStop(0, rgba('#ffd890', alpha));
    g.addColorStop(0.5, rgba('#e8a868', alpha * 0.4));
    g.addColorStop(1, rgba('#e8a868', 0));
    soft(ctx, 16, () => {
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(SUN.x, SUN.y);
      ctx.lineTo(SUN.x + Math.cos(a - spread) * len, SUN.y + Math.sin(a - spread) * len);
      ctx.lineTo(SUN.x + Math.cos(a + spread) * len, SUN.y + Math.sin(a + spread) * len);
      ctx.closePath();
      ctx.fill();
    });
  }
  ctx.restore();
}

/** The storm's cloud masses: banks low on the burning horizon, towers either side, the dark vault over the top. */
function clouds(ctx: CanvasRenderingContext2D, rng: Rng): void {
  // Low banks along the horizon, glowing nearest the sun.
  massCloud(ctx, rng, 470, 452, 360, 70, LOW_CLOUD, SUN, 700);
  massCloud(ctx, rng, 1040, 440, 420, 80, LOW_CLOUD, SUN, 1200);
  massCloud(ctx, rng, 1420, 430, 360, 90, FAR_STORM, SUN, 1500);
  // The towers: a great mass over the sun on the left, another bearing in from the right.
  massCloud(ctx, rng, 1330, 330, 720, 250, FAR_STORM, SUN, 1500);
  massCloud(ctx, rng, 330, 300, 640, 230, FAR_STORM, SUN, 600);
  massCloud(ctx, rng, 1480, 210, 560, 220, STORM, SUN, 1600);
  massCloud(ctx, rng, 120, 210, 520, 200, STORM, SUN, 520);
  // The dark vault: heavy cloud across the top, the title riding beneath it.
  massCloud(ctx, rng, 800, 70, 1700, 130, STORM, SUN, 900);
}

/** The far range, faint behind, and the nearer range in front of it, dark against the sunset. */
const BACK_PEAKS: readonly Peak[] = [
  { x: 170, top: 382, half: 190 }, { x: 640, top: 362, half: 210 }, { x: 930, top: 380, half: 170 }, { x: 1300, top: 350, half: 220 }, { x: 1560, top: 380, half: 160 },
];
const PEAKS: readonly Peak[] = [
  { x: 40, top: 410, half: 130 }, { x: 330, top: 386, half: 175 }, { x: 560, top: 418, half: 110 }, { x: 790, top: 392, half: 150 },
  { x: 1040, top: 414, half: 120 }, { x: 1220, top: 376, half: 165 }, { x: 1470, top: 404, half: 140 },
];

function farHills(ctx: CanvasRenderingContext2D, rng: Rng, seed: number): void {
  const d = makeDraw(ctx, seed, 0, 0);
  mountains(ctx, rng, BACK_PEAKS, 476, { body: '#5a5670', lit: '#b88a6a', shade: '#3e3e58', snow: '#c8a284' });
  mountains(ctx, rng, PEAKS, 488, { body: '#3e4058', lit: '#8e6a58', shade: '#2a2c42', snow: '#a88870' });
  const ridge = skyline(rng, -20, W + 20, 490, 30, 4);
  hill(d, rng, ridge, H, { lit: '#5e6448', body: '#3e4636', deep: '#2e3430' }, { reach: 18, inkAlpha: 0 });
  woodland(d, rng, skyline(rng, 1180, W + 20, 504, 10, 2), { s: 22, rows: 2, gap: 9, tone: { leaf: '#2e3a2c', trunk: '#241c18' }, pines: 0.7, pineLeaf: '#24302a', inkAlpha: 0 });
  rivalKeep(ctx, seed + 5, pt(1465, 490), 0.5);
}

/** Rolling farmland in the middle distance, the town's knoll on the left and Thornwood's eaves on the right. */
function midHills(ctx: CanvasRenderingContext2D, rng: Rng, seed: number): void {
  const d = makeDraw(ctx, seed, 0, 0);
  const crest = skyline(rng, -20, W + 20, 540, 28, 5);
  hill(d, rng, crest, H, { lit: '#6c7238', body: '#46522a', deep: '#2c3622' }, {
    reach: 26, inkAlpha: 0.12, texture: 500,
    fields: (shape) => fields(d, rng, shape, crest, { x0: 560, x1: 1250, from: 4, rows: 4, depth: 9, alpha: 0.45, hedge: '#1e2616', vp: VP }),
  });
  woodland(d, rng, skyline(rng, 1170, W + 30, 560, 14, 2), { s: 34, rows: 3, gap: 12, tone: { leaf: '#28361e', trunk: '#20160e' }, pines: 0.85, pineLeaf: '#1c2a20', inkAlpha: 0.15 });
  woodland(d, rng, through([pt(640, 552), pt(700, 549), pt(760, 553)]), { s: 26, rows: 1, gap: 12, tone: { leaf: '#34442a', trunk: '#20160e' }, inkAlpha: 0.1 });
  // The town's knoll: a broad green shoulder at the left, higher and nearer, the walled town on its crown against the sunset.
  const knoll = through([pt(-30, 560), pt(60, 520), pt(170, 500), pt(280, 498), pt(380, 512), pt(500, 548), pt(640, 600)], 6);
  hill(d, rng, knoll, H, { lit: '#7a7a3a', body: '#46562a', deep: '#283420' }, {
    reach: 30, inkAlpha: 0.25, texture: 300,
    fields: (shape) => fields(d, rng, shape, knoll, { x0: 0, x1: 640, from: 40, rows: 4, depth: 12, alpha: 0.45, hedge: '#1e2616', vp: VP }),
  });
  cloudShadows(ctx, rng, [[980, 566, 240, 16], [420, 600, 220, 22]]);
  woodland(d, rng, through([pt(330, 520), pt(380, 524), pt(420, 532)]), { s: 30, rows: 1, gap: 13, tone: { leaf: '#34462a', trunk: '#20160e' }, inkAlpha: 0.2 });
  dusk(ctx, 215, 518, 1.05, 0.6, (c) => SITE_ART.town(c, seed + 11, 0));
}

const RIVER: readonly Pt[] = [pt(1062, 552), pt(1040, 576), pt(1072, 604), pt(1040, 634), pt(1012, 664), pt(1022, 694), pt(1040, 716), pt(1100, 742), pt(1210, 760), pt(1360, 772), pt(1520, 790), pt(1680, 800)];
const ROAD = { lit: '#6e5636', edge: '#2e2214' } as const;

/** Cloud shadows drifting over the land: cool dark glazes that break up the light. */
function cloudShadows(ctx: CanvasRenderingContext2D, rng: Rng, spots: readonly (readonly [number, number, number, number])[]): void {
  for (const [x, y, rx, ry] of spots) {
    ctx.save();
    ctx.globalCompositeOperation = 'source-atop';
    const tilt = (rng() - 0.5) * 0.08;
    softly(ctx, ry * 0.8, '#141a26', 0.3 + rng() * 0.08, (c) => {
      c.beginPath();
      c.ellipse(x, y, rx, ry, tilt, 0, Math.PI * 2);
    });
    ctx.restore();
  }
}

/** The valley floor: meadows, a hamlet and a windmill, the river winding towards us under the old bridge, the road from the town over it. */
function valley(ctx: CanvasRenderingContext2D, rng: Rng, seed: number): void {
  const d = makeDraw(ctx, seed, 0, 0);
  const floor = through([pt(-20, 640), pt(140, 616), pt(330, 602), pt(520, 606), pt(700, 590), pt(880, 594), pt(1080, 600), pt(1290, 584), pt(1460, 596), pt(1620, 592)], 6);
  hill(d, rng, floor, H, { lit: '#727438', body: '#3e4e26', deep: '#222c1a' }, {
    reach: 24, inkAlpha: 0.18, texture: 900,
    fields: (shape) => fields(d, rng, shape, floor, { x0: -20, x1: W + 20, from: 4, rows: 5, depth: 14, alpha: 0.4, hedge: '#161e10', vp: VP }),
  });
  cloudShadows(ctx, rng, [[300, 704, 300, 36], [1380, 694, 300, 30], [820, 616, 220, 14]]);
  woodland(d, rng, through([pt(1150, 620), pt(1240, 610), pt(1330, 616)]), { s: 40, rows: 2, gap: 14, tone: { leaf: '#2c3c20', trunk: '#20160e' }, pines: 0.4, pineLeaf: '#1c2a20', inkAlpha: 0.3 });
  river(d, rng, RIVER, 5, 70, { far: '#f0c070', near: '#1c2840', bank: '#241a12' }, 0.35);
  // The north road: down from the town's gate, along the valley, over the bridge and on east; a lane down to the muster.
  road(d, rng, [pt(250, 530), pt(300, 566), pt(420, 600), pt(560, 620), pt(700, 640), pt(820, 670), pt(946, 702)], 5, 13, ROAD, 0.3);
  road(d, rng, [pt(1104, 702), pt(1210, 692), pt(1340, 666), pt(1480, 642), pt(1630, 626)], 13, 8, ROAD, 0.3);
  road(d, rng, [pt(760, 658), pt(780, 700), pt(806, 750), pt(820, 800)], 9, 30, ROAD, 0.35);
  bridge(d, rng, { x0: 944, x1: 1106, water: 716, end: 13, crown: 34, stone: '#857a66', inkAlpha: 0.6, arches: [{ at: 0.18, span: 0.2, rise: 12 }, { at: 0.5, span: 0.32, rise: 24 }, { at: 0.82, span: 0.2, rise: 12 }] });
  dusk(ctx, 330, 668, 0.85, 0.45, (c) => SITE_ART.windmill(c, seed + 21, 0));
  dusk(ctx, 640, 644, 0.75, 0.45, (c) => drawHamlet(c, seed + 23));
  // Copses and lone trees about the meadows and along the river.
  woodland(d, rng, through([pt(120, 654), pt(200, 644)]), { s: 44, rows: 1, gap: 18, tone: { leaf: '#2e3e20', trunk: '#20160e' }, inkAlpha: 0.3 });
  woodland(d, rng, through([pt(540, 706), pt(610, 698)]), { s: 50, rows: 2, gap: 16, tone: { leaf: '#2e3e20', trunk: '#20160e' }, inkAlpha: 0.35 });
  woodland(d, rng, through([pt(1140, 742), pt(1240, 756)]), { s: 54, rows: 2, gap: 17, tone: { leaf: '#2a3a1e', trunk: '#20160e' }, inkAlpha: 0.4 });
  woodland(d, rng, through([pt(1420, 704), pt(1500, 694)]), { s: 62, rows: 1, gap: 30, tone: { leaf: '#283a1e', trunk: '#20160e' }, pines: 0.5, pineLeaf: '#18241a', inkAlpha: 0.4 });
}

/** The low light raking in from the left over a layer: a warm glaze on what faces the sun, falling off across the land. */
function evening(c: CanvasRenderingContext2D, y0: number, y1: number, strength: number): void {
  c.save();
  c.globalCompositeOperation = 'source-atop';
  const g = c.createRadialGradient(SUN.x, SUN.y, 0, SUN.x, SUN.y, 1500);
  g.addColorStop(0, rgba(GOLD_HAZE, 0.4 * strength));
  g.addColorStop(0.35, rgba(GOLD_HAZE, 0.14 * strength));
  g.addColorStop(1, rgba(GOLD_HAZE, 0));
  c.fillStyle = g;
  c.fillRect(-100, y0, W + 200, y1 - y0);
  c.restore();
}

/** The finish: a smouldering glaze over the land, the edges and corners sunk into umber dark, and the paper's tooth. */
function finish(ctx: CanvasRenderingContext2D): void {
  ctx.save();
  ctx.globalCompositeOperation = 'soft-light';
  const gold = ctx.createLinearGradient(0, 380, 0, H);
  gold.addColorStop(0, 'rgba(232,160,80,0)');
  gold.addColorStop(0.25, 'rgba(232,160,80,0.3)');
  gold.addColorStop(1, 'rgba(120,70,40,0.3)');
  ctx.fillStyle = gold;
  ctx.fillRect(0, 380, W, H - 380);
  bloomAt(ctx, SUN, 900, LIGHT, 0.35);
  ctx.globalCompositeOperation = 'multiply';
  // The frame of shadow: corners and edges deepen, the bottom sinks into near-black umber.
  const vig = ctx.createRadialGradient(W * 0.48, H * 0.5, H * 0.35, W * 0.48, H * 0.5, W * 0.72);
  vig.addColorStop(0, 'rgba(255,255,255,0)');
  vig.addColorStop(0.6, rgba(mix('#3a2a24', '#ffffff', 0.45), 0.5));
  vig.addColorStop(1, rgba('#2a1a14', 0.85));
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, W, H);
  const foot = ctx.createLinearGradient(0, 760, 0, H);
  foot.addColorStop(0, 'rgba(255,255,255,0)');
  foot.addColorStop(1, rgba('#2a1a12', 0.7));
  ctx.fillStyle = foot;
  ctx.fillRect(0, 760, W, H - 760);
  const crown = ctx.createLinearGradient(0, 0, 0, 160);
  crown.addColorStop(0, rgba('#1a1420', 0.55));
  crown.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = crown;
  ctx.fillRect(0, 0, W, 160);
  ctx.restore();
  paperGrain(ctx, 0.25);
}

export const drawVista: MenuDrawer = (ctx, seed) => {
  const rng = createRng(seed);
  ctx.save();
  sky(ctx, rng);
  rays(ctx);
  clouds(ctx, rng);
  hazed(ctx, { color: HAZE, far: 0.55, near: 0.4, y0: 340, y1: 520 }, (c) => {
    farHills(c, createRng(seed + 1), seed + 1);
    evening(c, 300, 600, 1);
  });
  hazed(ctx, { color: HAZE, far: 0.42, near: 0.2, y0: 480, y1: 640 }, (c) => {
    midHills(c, createRng(seed + 2), seed + 2);
    evening(c, 400, 700, 0.8);
  });
  hazed(ctx, { color: HAZE, far: 0.24, near: 0, y0: 590, y1: 760 }, (c) => {
    valley(c, createRng(seed + 3), seed + 3);
    evening(c, 560, 820, 0.6);
  });
  foreground(ctx, seed + 4, W, H);
  framingTrees(ctx, seed + 5, W);
  finish(ctx);
  ctx.restore();
};
