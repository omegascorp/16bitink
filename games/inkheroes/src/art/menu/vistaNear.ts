import { createRng, type Rng } from '../../logic/rng';
import { makeDraw, pt, TAU } from '../kit';
import { pathOf, type Pt } from '../pen';
import { blob } from '../sites/paintKit';
import { bandBelow, bloomAt, brushwork, gradeFill, LIGHT, mix, modelForm, rgba, SHADOW, softly, through, variegate, yAt } from './vistaKit';
import { pine, tree } from './vistaTrees';

/**
 * The vista's foreground: the grassy rise the Crown's muster stands on,
 * lit warm along its brow and settling cool and deep towards the bottom,
 * brushed with grass, a few stones and wild flowers; and the trees that
 * frame the view at either edge.
 */

/** The rise's brow, left to right: about y 780 in the middle, a touch higher at the edges. */
export const RISE: readonly Pt[] = through([pt(-20, 754), pt(180, 768), pt(420, 782), pt(640, 778), pt(820, 783), pt(1000, 777), pt(1220, 770), pt(1430, 758), pt(1620, 746)], 6);

const GRASS = { lit: '#6e6a30', body: '#34421f', deep: '#1c2412', far: '#12170c' } as const;

/** Blades of grass standing along a line: fine tapered ink-green strokes, leaning a little with the breeze. */
function blades(ctx: CanvasRenderingContext2D, rng: Rng, line: readonly Pt[], x0: number, x1: number, density: number, h: number, color: string, alpha: number): void {
  ctx.save();
  ctx.lineCap = 'round';
  for (let x = x0; x < x1; x += density * (0.4 + rng())) {
    const y = yAt(line, x) + rng() * h * 0.5;
    const n = 2 + Math.floor(rng() * 3);
    for (let i = 0; i < n; i++) {
      const lean = 0.25 + (rng() - 0.3) * 0.7;
      const len = h * (0.4 + rng() * 0.8);
      ctx.strokeStyle = rgba(rng() < 0.3 ? mix(color, LIGHT, 0.5) : color, alpha * (0.6 + rng() * 0.4));
      ctx.lineWidth = 0.5 + rng() * 0.7;
      ctx.beginPath();
      ctx.moveTo(x + i * 1.2, y);
      ctx.quadraticCurveTo(x + i * 1.2 + lean * len * 0.3, y - len * 0.6, x + i * 1.2 + lean * len, y - len);
      ctx.stroke();
    }
  }
  ctx.restore();
}

/** A stone half sunk in the grass: lit on top, deep on its right, a pen line. */
function stone(ctx: CanvasRenderingContext2D, rng: Rng, c: Pt, r: number, seed: number): void {
  const d = makeDraw(ctx, seed, 0, 0);
  const shape = blob(c, r * 1.4, r, rng, 0.25, 16).filter((p) => p.y <= c.y + r * 0.3);
  const under = blob(pt(c.x + r * 0.6, c.y + r * 0.35), r * 1.6, r * 0.45, rng, 0.1, 14);
  softly(ctx, r * 0.3, SHADOW, 0.25, (cc) => pathOf(cc, under));
  d.pen.fill(shape, '#6e6656', 1);
  d.pen.clipped(shape, () => {
    const dark = blob(pt(c.x + r * 0.7, c.y + r * 0.4), r * 1.2, r * 0.9, rng, 0.1, 14);
    softly(ctx, r * 0.2, mix('#4e483e', SHADOW, 0.35), 0.7, (cc) => pathOf(cc, dark));
    bloomAt(ctx, pt(c.x - r * 0.5, c.y - r * 0.5), r * 0.9, '#c8945a', 0.55);
  });
  d.pen.stroke([...shape, shape[0]!], 0.7, d.ink, 0.8);
}

/** Wild flowers: a scatter of tiny bright dots (cream, butter yellow, a little blue) on dark stems. */
function flowers(ctx: CanvasRenderingContext2D, rng: Rng, x0: number, x1: number, y0: number, y1: number, n: number): void {
  const colours = ['#c8a050', '#9a7a3a', '#b89060', '#7a5a34'] as const;
  for (let i = 0; i < n; i++) {
    const x = x0 + rng() * (x1 - x0);
    const y = Math.max(yAt(RISE, x) + 6, y0 + rng() * (y1 - y0));
    const r = 0.7 + rng() * 0.7 + ((y - 780) / 120) * 0.7;
    ctx.strokeStyle = rgba(GRASS.far, 0.5);
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.moveTo(x, y + r * 3);
    ctx.lineTo(x + 0.4, y);
    ctx.stroke();
    ctx.fillStyle = rgba(colours[Math.floor(rng() * colours.length)]!, 0.6);
    ctx.beginPath();
    ctx.arc(x, y, r, 0, TAU);
    ctx.fill();
  }
}

/** The grassy rise across the bottom of the vista, y ≈ 750–900. */
export function foreground(ctx: CanvasRenderingContext2D, seed: number, w: number, h: number): void {
  const rng = createRng(seed);
  const d = makeDraw(ctx, seed + 1, 0, 0);
  const shape = bandBelow(RISE, h + 10);
  gradeFill(ctx, shape, 745, h, [[0, GRASS.lit], [0.18, GRASS.body], [0.6, mix(GRASS.body, GRASS.deep, 0.6)], [1, GRASS.deep]]);
  variegate(ctx, rng, shape, ['#5a5a28', GRASS.deep, '#3e4e22', mix(GRASS.deep, '#1e2e34', 0.4)], { x0: 0, y0: 750, x1: w, y1: h }, 0.2, 5);
  modelForm(ctx, shape, { reach: 30, blur: 18, lit: mix(GRASS.lit, '#e0a050', 0.45), litAlpha: 0.5, shade: GRASS.far, shadeAlpha: 0.4 });
  // Broad wet-in-wet blooms: warmer patches where the light lies, cool pools in the hollows.
  d.pen.clipped(shape, () => {
    for (let i = 0; i < 14; i++) {
      const x = rng() * w;
      const y = 800 + rng() * 90;
      bloomAt(ctx, pt(x, y), 60 + rng() * 90, rng() < 0.4 ? '#5e5a2a' : mix(GRASS.deep, SHADOW, 0.4), 0.2 + rng() * 0.12);
    }
    // The muster's ground: a broad sunlit swell in the middle.
    ctx.save();
    ctx.scale(1, 0.22);
    bloomAt(ctx, pt(w / 2 - 60, 830 / 0.22), 520, '#6a5e2c', 0.3);
    ctx.restore();
  });
  brushwork(ctx, rng, shape, 2600, { x0: 0, y0: 750, x1: w, y1: h }, [GRASS.deep, '#4a5626', '#2e3a1a', GRASS.far, '#6a6430'], { len: 10, width: 1.3, alpha: 0.26, angle: -1.3 });
  // The brow: pigment pooled along the top edge, then a fine pen line broken by blades.
  softly(ctx, 1.4, mix(GRASS.deep, SHADOW, 0.2), 0.45, (cc) => {
    cc.beginPath();
    RISE.forEach((p, i) => (i === 0 ? cc.moveTo(p.x, p.y + 1.5) : cc.lineTo(p.x, p.y + 1.5)));
  }, { stroke: 2.2 });
  // A broken pen line along the brow: drawn in runs, lifted here and there.
  for (let i = 0; i < RISE.length - 4; ) {
    const run = 8 + Math.floor(rng() * 22);
    d.pen.stroke(RISE.slice(i, Math.min(RISE.length, i + run)), 0.9 + rng() * 0.5, d.ink, 0.35 + rng() * 0.25, false);
    i += run + 1 + Math.floor(rng() * 6);
  }
  blades(ctx, rng, RISE, -10, w + 10, 10, 7, GRASS.far, 0.6);
  blades(ctx, rng, RISE.map((p) => pt(p.x, p.y + 40)), -10, w + 10, 14, 12, GRASS.deep, 0.45);
  blades(ctx, rng, RISE.map((p) => pt(p.x, p.y + 95)), -10, w + 10, 9, 18, GRASS.far, 0.55);
  stone(ctx, rng, pt(250, 845), 9, seed + 7);
  stone(ctx, rng, pt(272, 852), 5, seed + 8);
  stone(ctx, rng, pt(1310, 832), 7, seed + 9);
  stone(ctx, rng, pt(1120, 878), 11, seed + 10);
  for (const [x, y] of [[90, 860], [330, 880], [1240, 850], [1460, 875], [620, 890], [980, 885]] as const) flowers(ctx, rng, x - 60, x + 60, y - 25, y + 15, 18);
}

/** A tree's long late-afternoon shadow thrown down and right across the grass, hatched lightly in ink. */
function longShadow(ctx: CanvasRenderingContext2D, rng: Rng, foot: Pt, len: number, depth: number, seed: number): void {
  const d = makeDraw(ctx, seed, 0, 0);
  const shape = blob(pt(foot.x + len * 0.45, foot.y + depth * 0.6), len * 0.55, depth, rng, 0.25, 26, 0.04);
  softly(ctx, depth * 0.5, mix(GRASS.far, SHADOW, 0.4), 0.32, (cc) => pathOf(cc, shape));
  d.pen.hatch(shape, 3.2, 1.0, 0.45, { color: d.ink, alpha: 0.16 });
}

/** The trees framing the view: an oak on the left, a stand of pines and a broadleaf on the right. */
export function framingTrees(ctx: CanvasRenderingContext2D, seed: number, w: number): void {
  const rng = createRng(seed);
  const d = makeDraw(ctx, seed + 3, 0, 0);
  longShadow(ctx, rng, pt(-20, 800), 420, 34, seed + 11);
  longShadow(ctx, rng, pt(w - 150, 800), 160, 18, seed + 12);
  tree(d, rng, pt(-20, 795), 380, { leaf: '#26321a', trunk: '#22160e' }, 0.6);
  tree(d, rng, pt(110, 812), 240, { leaf: '#2c3a1c', trunk: '#26180e' }, 0.6);
  pine(d, rng, pt(w - 40, 785), 380, '#16221a', 0.6);
  pine(d, rng, pt(w + 30, 795), 440, '#121c16', 0.6);
  tree(d, rng, pt(w - 140, 800), 220, { leaf: '#28361a', trunk: '#26180e' }, 0.6);
}
