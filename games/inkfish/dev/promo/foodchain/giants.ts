import { drawTextLine } from '../captions';
import { FRAME } from '../descent/frame';
import { drawFigure } from '../descent/hud';
import { createRng } from '../../../src/logic/rng';
import { clamp01, smooth, window01 } from '../short';
import { blueWhale, drawAnimal, plankton } from './cast';
import { cornerPyramid } from './corner';
import { arrowTail, countUp, drawPyramid, drawRuler, drawStepCard, drawWeightTag, inkOn, type PyramidState } from './hud';
import { drawKrillMagnifier, drawSurface } from './inserts';
import { SPECIES } from './species';
import { sectionStart, T } from './timeline';
import { darkOf, type Water } from './water';

/**
 * The giants (section 9) and the payoff (section 10), and the two shots the
 * cold open borrows: the blue whale sweeping through krill, and the orca pod
 * circling it. The whale shark glides through copepods; the blue whale comes
 * in so big the orca shrinks to a speck, lunges, and balloons its throat
 * round a swarm of krill; the pyramid shows both giants feeding at step 2.
 */

const W = FRAME.width;
const H = FRAME.height;

export interface Giants {
  readonly water: Water;
}

interface Speck {
  readonly x: number;
  readonly y: number;
  readonly a: number;
  readonly s: number;
}

const rng = createRng(777);
/** A krill swarm (and the whale shark's copepods): points in a soft blob, unit radius. */
const SWARM: readonly Speck[] = Array.from({ length: 220 }, () => {
  const a = rng() * Math.PI * 2;
  const r = Math.sqrt(rng());
  return { x: Math.cos(a) * r, y: Math.sin(a) * r * 0.6, a: rng() * Math.PI * 2, s: 0.7 + rng() * 0.6 };
});

/** Krill (or copepods) round (cx, cy), `r` px across; those inside `mouth` (once `gulp` > 0) are taken in. */
function drawSwarm(ctx: CanvasRenderingContext2D, kind: 'krill' | 'copepod', cx: number, cy: number, r: number, size: number, t: number, mouth?: { x: number; y: number; radius: number }, gulp = 0): void {
  for (const k of SWARM) {
    let x = cx + k.x * r + Math.sin(t * 0.7 + k.a) * r * 0.03;
    let y = cy + k.y * r + Math.cos(t * 0.9 + k.a) * r * 0.03;
    if (mouth && gulp > 0) {
      // Pulled towards the mouth, and gone once inside.
      const d = Math.hypot(x - mouth.x, y - mouth.y);
      const pull = clamp01(gulp * 1.6 - d / (r * 2.2));
      x += (mouth.x - x) * pull;
      y += (mouth.y - y) * pull;
      if (pull >= 0.98) continue;
    }
    const len = size * k.s;
    if (kind === 'krill') plankton.drawKrill(ctx, x, y, len, Math.PI + 0.3 * Math.sin(k.a), t + k.a, { kick: (t * 2 + k.a) % 1 });
    else plankton.drawCopepod(ctx, x, y, len, Math.PI + 0.3 * Math.sin(k.a), t + k.a, { kick: 0.5 + 0.5 * Math.sin(t * 6 + k.a) });
  }
}

/** The blue whale from the right, lunging into a krill swarm: `from` it enters, `gulpAt` its mouth opens. Used by the cold open and section 9. */
export function drawWhalePass(ctx: CanvasRenderingContext2D, t: number, water: Water, from: number, gulpAt: number, length = 1500, y = H * 0.5): void {
  water.draw(ctx, 0.82, (t - from) * 0.03, 0, t);
  // It glides in from the right until its mouth reaches the swarm (a third of the way in), then barely drifts.
  const endX = W * 0.3 + 0.5 * length;
  const startX = W + 0.6 * length;
  const x = endX + (startX - endX) * (1 - smooth((t - from) / (gulpAt + 0.8 - from))) - 18 * Math.max(0, t - gulpAt);
  const gape = smooth((t - gulpAt) / 0.7) * (1 - smooth((t - gulpAt - 3.2) / 0.8));
  const throat = smooth((t - gulpAt - 0.4) / 1.6);
  const pose = { gape, throat, tail: t * 1.6 };
  const angle = Math.PI;
  blueWhale.drawBlueWhaleBack(ctx, x, y, length, angle, t, pose, true);
  const mouth = blueWhale.blueWhaleMouth(x, y, length, angle, pose, true);
  drawSwarm(ctx, 'krill', x - length * 0.62, y + length * 0.02, length * 0.22, Math.max(5, length * 0.0022 * 6), t, mouth, smooth((t - gulpAt) / 1.8));
  blueWhale.drawBlueWhaleFront(ctx, x, y, length, angle, t, pose, true);
}

/** Orcas circling the blue whale, then (from `dive`) the whale diving with them after it. */
export function drawPod(ctx: CanvasRenderingContext2D, t: number, water: Water, from: number, dive: number, dark: number): void {
  water.draw(ctx, 0.88 + 0.1 * dark, (t - from) * 0.02, 0, t);
  const d = smooth((t - dive) / 2.5);
  const wx = W * 0.5 - 200 * d;
  const wy = H * 0.5 + 340 * d;
  const length = 1250;
  const orcas = 6;
  const orcaLen = length * (7 / 25);
  const draw = (front: boolean): void => {
    for (let i = 0; i < orcas; i++) {
      const a = (t - from) * 0.55 + (i / orcas) * Math.PI * 2;
      const inFront = Math.sin(a) > 0;
      if (inFront !== front) continue;
      const ox = wx + Math.cos(a) * (length * 0.62) * (1 - 0.3 * d);
      const oy = wy + Math.sin(a) * 210 - 60 + 120 * d;
      drawAnimal(ctx, 'orca', { x: ox, y: oy, length: orcaLen * (0.85 + 0.15 * Math.sin(a)), facing: Math.sin(a) > 0 ? -1 : 1, beat: t * 7 + i, tilt: 0.15 * Math.cos(a) }, t + i * 0.3);
    }
  };
  draw(false);
  drawAnimal(ctx, 'blueWhale', { x: wx, y: wy, length, facing: 1, tilt: -0.35 * d, beat: t * 1.3 }, t);
  draw(true);
}

// ---------------------------------------------------------------- 9 · the giants

export function drawGiants(ctx: CanvasRenderingContext2D, t: number, g: Giants): void {
  if (t < T.blueWhale - 0.3) drawWhaleShark(ctx, t, g);
  else drawBlueWhale(ctx, t, g);
}

function drawWhaleShark(ctx: CanvasRenderingContext2D, t: number, g: Giants): void {
  const tone = 0.42;
  const dark = darkOf(tone);
  const from = sectionStart(9);
  g.water.draw(ctx, tone, (t - from) * 0.05, 0, t);
  const length = 1650;
  const x = W * 1.45 - (W * 1.0) * smooth((t - from) / 6) - 25 * (t - from);
  const y = H * 0.56;
  const gape = smooth((t - T.eatsCopepods + 0.6) / 0.8) * 0.9;
  const pose = { x, y, length, facing: -1 as const, beat: t * 2.2, jaw: gape };
  drawSwarm(ctx, 'copepod', x - length * 0.62, y + 10, 280, 14, t);
  drawAnimal(ctx, 'whaleShark', pose, t);
  drawStepCard(ctx, 0, 'whaleShark', smooth((t - T.whaleShark) / 0.4), dark);
  drawWeightTag(ctx, { grams: countUp(SPECIES.orca.grams, SPECIES.whaleShark.grams, t, T.whaleShark, T.whaleShark + 1.4), jump: '', pop: 0, alpha: 1 }, dark);
  drawRuler(ctx, 12, 1, dark);
  drawTextLine(ctx, 'a bus · 12 m · 40 ft', W / 2, 330, 58, 700, window01(t, T.bus - 0.2, T.eatsCopepods, 0.25), inkOn(dark));
  const p: PyramidState = { ...cornerPyramid(1e9), names: 1, arrows: smooth((t - T.stepTwo) / 0.6), alpha: smooth((t - T.giantsSame) / 0.4) };
  drawPyramid(ctx, p, dark);
}

function drawBlueWhale(ctx: CanvasRenderingContext2D, t: number, g: Giants): void {
  const tone = 0.82;
  const dark = darkOf(tone);
  const from = T.blueWhale - 0.3;
  // The orca for scale, shrinking as the camera pulls back for the whale.
  const zoom = 1 + 0.55 * smooth((t - from) / 2.6);
  g.water.draw(ctx, tone, (t - from) * 0.03, Math.log2(zoom), t);
  const orcaLen = 640 / zoom;
  drawAnimal(ctx, 'orca', { x: W * 0.48, y: H * 0.24, length: orcaLen, facing: 1, beat: t * 6 }, t);
  drawTextLine(ctx, 'orca', W * 0.48, H * 0.24 - orcaLen * 0.35 - 10, 44, 700, window01(t, from + 1.6, T.eatsKrill, 0.3), inkOn(dark));
  const whaleLen = (640 * 25) / 7 / zoom;
  drawWhalePassAt(ctx, t, whaleLen, from);
  // HUD: the weight rolls up to the whale's; then the magnifier, the pyramid with its arrows, and the sixteen tonnes.
  drawStepCard(ctx, 0, 'blueWhale', window01(t, T.blueWhale, T.notTop, 0.3), dark);
  drawWeightTag(ctx, { grams: countUp(SPECIES.whaleShark.grams, SPECIES.blueWhale.grams, t, T.blueWhale, T.tonnes + 0.6), jump: '', pop: 0, alpha: 1 - smooth((t - T.sixteen + 0.3) / 0.3) }, dark);
  drawRuler(ctx, 25, 1 - smooth((t - T.sixteen + 0.3) / 0.3), dark);
  drawKrillMagnifier(ctx, W - 330, 340, 180, t, window01(t, T.paperclip9 - 0.1, T.skips, 0.25));
  const arrowed = window01(t, T.skips, T.sixteen - 0.2, 0.3);
  const big = smooth((t - T.notTop) / 0.8);
  const corner = cornerPyramid(1e9);
  // A mid-size pyramid on the right for the arrows, growing to fill the frame on "aren't at the top".
  const mid = { x: W - 420, baseY: 600, base: 560 };
  const p: PyramidState = {
    ...corner,
    x: mid.x + (W / 2 - mid.x) * big,
    baseY: mid.baseY + (980 - mid.baseY) * big,
    base: mid.base + (900 - mid.base) * big,
    names: 1,
    arrows: Math.max(arrowed, big),
    alpha: Math.max(arrowed, big),
  };
  if (big > 0) {
    ctx.save();
    ctx.globalAlpha = big * 0.6;
    ctx.fillStyle = '#081c3a';
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }
  drawPyramid(ctx, p, dark);
  // Who the arrows are: written above them, so the band names stay clear.
  const tail = arrowTail(p);
  const size = Math.max(34, p.base * 0.06);
  ctx.save();
  ctx.font = `700 ${size}px Caveat`;
  const half = ctx.measureText('whale shark · blue whale').width / 2;
  ctx.restore();
  // Beside the arrow's tail, or above the arrow if that would run off the frame.
  const beside = tail.x - half - 14;
  const fits = beside - half > 20;
  const lx = fits ? beside : Math.max(half + 30, tail.x + half);
  const ly = fits ? tail.y + size * 0.35 : tail.y - size * 0.7;
  drawTextLine(ctx, 'whale shark · blue whale', lx, ly, size, 700, Math.max(arrowed, big), { fill: '#ff8a7a', halo: '#2a0805' });
  const day = window01(t, T.sixteen - 0.2, T.notTop, 0.3);
  drawFigure(ctx, `${Math.round(countUp(1, 16, t, T.sixteen, T.sixteen + 1.2))} tonnes of krill`, '35,000 lb · every day', W / 2, 260, day, dark);
}

/** The blue whale entering from the right at `length` px, lunging on "eats krill". */
function drawWhalePassAt(ctx: CanvasRenderingContext2D, t: number, length: number, from: number): void {
  const x = W * 1.25 - W * 0.6 * smooth((t - from) / 3) - 12 * (t - from);
  const y = H * 0.62;
  const gape = smooth((t - T.eatsKrill + 0.3) / 0.7) * (1 - smooth((t - T.skips - 0.5) / 0.8));
  const throat = smooth((t - T.eatsKrill) / 1.8);
  const pose = { gape, throat, tail: t * 1.6 };
  blueWhale.drawBlueWhaleBack(ctx, x, y, length, Math.PI, t, pose, true);
  const mouth = blueWhale.blueWhaleMouth(x, y, length, Math.PI, pose, true);
  drawSwarm(ctx, 'krill', x - length * 0.6, y, length * 0.2, Math.max(5, length * 0.006), t, mouth, smooth((t - T.eatsKrill) / 1.8));
  blueWhale.drawBlueWhaleFront(ctx, x, y, length, Math.PI, t, pose, true);
}

// ---------------------------------------------------------------- 10 · the payoff

export function drawPayoff(ctx: CanvasRenderingContext2D, t: number, g: Giants): void {
  if (t < T.win) {
    const dark = smooth((t - T.notSafe) / 1.5);
    drawPod(ctx, t, g.water, sectionStart(10) - 6, T.chaseDown, dark);
    drawTextLine(ctx, 'Western Australia · 2019', W / 2, 140, 64, 700, window01(t, T.y2019, T.chaseDown, 0.3), inkOn(1));
    return;
  }
  if (t < T.together + 0.9) {
    drawSurface(ctx, t, clamp01((t - T.win) / 2.6));
    return;
  }
  // The pod swimming off side by side.
  g.water.draw(ctx, 0.86, t * 0.05, 0, t);
  const u = t - T.together - 0.9;
  for (let i = 0; i < 6; i++) {
    drawAnimal(ctx, 'orca', { x: -500 + u * 260 + (i % 3) * 330, y: H * 0.36 + Math.floor(i / 3) * 260 + (i % 3) * 40, length: 420, facing: 1, beat: t * 6 + i }, t + i * 0.4);
  }
}
