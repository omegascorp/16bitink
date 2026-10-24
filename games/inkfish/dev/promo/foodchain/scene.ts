import { drawTextLine } from '../captions';
import { FRAME } from '../descent/frame';
import { drawCallout } from '../descent/hud';
import { clamp01, smooth, window01 } from '../short';
import { drawAnimal, plankton } from './cast';
import type { Climb } from './climb';
import type { Fields } from './field';
import { countUp, drawRuler, drawStepCard, drawWeightTag, inkOn } from './hud';
import { drawCoast, drawPiano, drawStopwatch } from './inserts';
import { SPECIES, STEPS, type Kind } from './species';
import { T } from './timeline';
import { pulledBack, type Camera, type ChainView } from './view';
import { darkOf, type Water } from './water';

/**
 * The climb, sections 1–5 and 7: the chain through its camera over water
 * that deepens with each step, the HUD (step card, weight tag, ruler), the
 * rings on what the narrator names, and the orca section's cut-ins (the
 * half-hour stopwatch, Port and Starboard chasing a great white, the
 * coast the great whites left, and the pull-back on the orca alone).
 */

const W = FRAME.width;
const H = FRAME.height;

export interface ClimbScene {
  readonly climb: Climb;
  readonly view: ChainView;
  readonly water: Water;
  readonly fields: Fields;
}

/** How deep the water looks behind each step (0 sunlit plankton .. 1 open ocean). */
const TONE: Partial<Record<Kind, number>> = { diatom: 0.02, copepod: 0.1, anchovy: 0.38, mackerel: 0.5, tuna: 0.68, orca: 0.86 };

/** The tone between two heroes, following the zoom. */
function toneAt(climb: Climb, t: number): number {
  const h = climb.heroAt(t);
  const l = climb.links[h]!;
  const now = TONE[l.kind] ?? 0.5;
  if (h === 0 || t >= l.zoomTo) return now;
  const before = TONE[climb.links[h - 1]!.kind] ?? 0.5;
  return before + (now - before) * smooth((t - l.zoomFrom) / (l.zoomTo - l.zoomFrom));
}

/** The weight the tag shows: it counts up through each zoom, then the jump pops. */
function tagAt(climb: Climb, t: number): { grams: number; jump: string; pop: number } {
  const h = climb.heroAt(t);
  const l = climb.links[h]!;
  const grams = SPECIES[l.kind].grams;
  if (h === 0) return { grams, jump: '', pop: 0 };
  const from = l.zoomFrom + 0.3;
  const to = l.zoomFrom + 2.2;
  const prev = SPECIES[climb.links[h - 1]!.kind].grams;
  const pop = t < to ? 0 : t > to + 4.5 ? Math.max(0, 1 - (t - to - 4.5) / 0.4) : clamp01((t - to) / 0.6);
  return { grams: countUp(prev, grams, t, from, to), jump: STEPS[h]!.jump, pop };
}

/** The orca section's camera: the climb's, then pulled back on "Nothing" until the orca is small and alone. */
function cameraAt(climb: Climb, t: number): Camera {
  const cam = climb.camera(t);
  return pulledBack(cam, 1 + 2.2 * smooth((t - T.nothing) / 2.6));
}

/** Whether the orca section's cut-in (Port and Starboard, the coast) is on instead of the climb. */
export const inPortStarboard = (t: number): boolean => t > T.southAfrica - 0.3 && t < T.whatEats - 0.2;

/** Returns how dark the water is (for whatever's drawn over it). */
export function drawClimbScene(ctx: CanvasRenderingContext2D, t: number, sc: ClimbScene): number {
  const { climb, view, water } = sc;
  if (inPortStarboard(t)) return drawPortStarboard(ctx, t, sc);
  const cam = cameraAt(climb, t);
  const tone = toneAt(climb, t);
  const dark = darkOf(tone);
  water.draw(ctx, tone, cam.centre.x / cam.width, Math.log2(cam.width), t);
  // The anchovies swim with their mouths open from "mouth wide open" until the tuna is mentioned.
  const anchovyJaw = window01(t, T.mouthOpen, T.bluefinMeal + 1, 0.3) * 0.75;
  sc.fields.draw(ctx, t, cam);
  view.draw(ctx, t, cam, { jaw: (i) => (climb.links[i]!.kind === 'anchovy' ? anchovyJaw : undefined) });
  drawCallouts(ctx, t, sc, cam, dark);
  // The HUD.
  const h = climb.heroAt(t);
  const l = climb.links[h]!;
  const cardSwap = h === 0 ? 1 : smooth((t - l.zoomFrom - 0.5) / 0.3);
  const shownStep = cardSwap < 0.5 && h > 0 ? h - 1 : h;
  const cardAlpha = smooth((t - T.diatom - 0.4) / 0.4) * (h === 0 ? 1 : Math.abs(cardSwap - 0.5) * 2);
  const ui = 1 - smooth((t - T.nothing) / 0.8) * 0.85;
  drawStepCard(ctx, shownStep + 1, climb.links[shownStep]!.kind, cardAlpha * ui, dark);
  const tag = tagAt(climb, t);
  drawWeightTag(ctx, { ...tag, alpha: smooth((t - T.diatom - 0.8) / 0.4) * ui }, dark);
  const heroLen = cam.width / (l.frame * (1 + 2.2 * smooth((t - T.nothing) / 2.6)));
  drawRuler(ctx, heroLen, smooth((t - T.diatom - 1) / 0.5) * ui, dark);
  return dark;
}

// ---------------------------------------------------------------- rings, labels and cut-ins on the climb

function drawCallouts(ctx: CanvasRenderingContext2D, t: number, sc: ClimbScene, cam: Camera, dark: number): void {
  const { view } = sc;
  // 1 · "a shell of GLASS": ring the diatom.
  const diatom = view.lookOf(0, t, cam);
  const glass = window01(t, T.glass, T.breath - 0.2, 0.25);
  drawCallout(ctx, diatom.x, diatom.y, diatom.length * 0.55, 'glass shell', undefined, glass, smooth((t - T.glass) / 0.5), dark);
  // 2 · "just ONE eye".
  const cop = view.lookOf(1, t, cam);
  if (t > T.oneEye - 0.5 && t < T.eatsDiatom) {
    const eye = plankton.copepodEye(cop.x, cop.y, cop.length, cop.facing === 1 ? -(cop.tilt ?? 0) : Math.PI + (cop.tilt ?? 0));
    drawCallout(ctx, eye.x, eye.y, Math.max(30, eye.radius * 2.6), '1 eye', 'Cyclops', window01(t, T.oneEye, T.eatsDiatom - 0.2, 0.25), smooth((t - T.oneEye) / 0.5), dark);
  }
  // 3 · "mouth wide open… like a net".
  const anc = view.lookOf(2, t, cam);
  const net = window01(t, T.net - 0.4, T.bluefinMeal, 0.25);
  if (net > 0) {
    const mx = anc.x + anc.facing * anc.length * 0.44;
    drawCallout(ctx, mx, anc.y, anc.length * 0.12, 'a net with fins', undefined, net, smooth((t - T.net + 0.4) / 0.5), dark);
  }
  // 5 · the grand piano beside the tuna, then its warm muscles glowing.
  const tuna = view.lookOf(4, t, cam);
  const scale = W / cam.width;
  const piano = window01(t, T.piano - 0.2, T.warm - 0.2, 0.3);
  drawPiano(ctx, tuna.x + tuna.facing * tuna.length * 0.95, tuna.y + tuna.length * 0.2, 2.7 * scale * 0.62, piano, dark);
  const warm = window01(t, T.warm, T.hundredth, 0.4);
  if (warm > 0) {
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    ctx.globalAlpha = warm * (0.75 + 0.15 * Math.sin(t * 4));
    const g = ctx.createRadialGradient(tuna.x, tuna.y, 0, tuna.x, tuna.y, tuna.length * 0.42);
    g.addColorStop(0, 'rgba(255,150,40,0.9)');
    g.addColorStop(1, 'rgba(255,90,20,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(tuna.x, tuna.y, tuna.length * 0.42, tuna.length * 0.16, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    drawTextLine(ctx, 'WARM', tuna.x, tuna.y - tuna.length * 0.22, 76, 700, warm, { fill: '#f7a13a', halo: '#3a1a05' });
  }
  // 7 · the half-hour chase, and "isn't a fish".
  const chase = window01(t, T.halfHour - 0.3, T.catchOne + 1.2, 0.3);
  drawStopwatch(ctx, 30 * smooth((t - T.halfHour) / (T.catchOne - T.halfHour)), chase, dark);
  const orca = view.lookOf(5, t, cam);
  const fish = window01(t, T.notAFish, T.allow + 0.8, 0.25);
  if (fish > 0) {
    drawTextLine(ctx, 'FISH?', orca.x, orca.y - orca.length * 0.32, 120, 700, fish, { fill: '#e94b3c', halo: '#2a0805' });
    drawTextLine(ctx, '(mammal)', orca.x, orca.y - orca.length * 0.32 + 60, 50, 700, fish * smooth((t - T.notAFish - 0.8) / 0.4), inkOn(dark));
  }
}

// ---------------------------------------------------------------- Port and Starboard

/** Two orcas with bent fins chase a worried great white across the frame; then the map of the coast it left. */
function drawPortStarboard(ctx: CanvasRenderingContext2D, t: number, sc: ClimbScene): number {
  const tone = 0.8;
  const dark = darkOf(tone);
  sc.water.draw(ctx, tone, t * 0.08, 0, t);
  const from = T.southAfrica - 0.3;
  const u = (t - from) / (T.left - from);
  const sharkX = -300 + (W + 700) * u;
  const y = H * 0.55;
  const orcaLen = 640;
  drawAnimal(ctx, 'greatWhite', { x: sharkX, y: y - 40, length: orcaLen * (4.5 / 7), facing: 1, beat: t * 9, effort: 1 }, t, { worried: smooth((t - T.portStarboard) / 0.6) });
  drawAnimal(ctx, 'orca', { x: sharkX - 620, y: y - 150, length: orcaLen, facing: 1, beat: t * 6 }, t, { floppy: true });
  drawAnimal(ctx, 'orca', { x: sharkX - 900, y: y + 130, length: orcaLen * 0.95, facing: 1, beat: t * 6 + 1 }, t + 0.3, { floppy: true });
  const names = window01(t, T.portStarboard, T.left, 0.3);
  drawTextLine(ctx, 'Port', sharkX - 620, y - 330, 64, 700, names, inkOn(dark));
  drawTextLine(ctx, 'Starboard', sharkX - 900, y + 330, 64, 700, names, inkOn(dark));
  const jaws = window01(t, T.sharkFromJaws, T.left, 0.25);
  drawTextLine(ctx, 'the shark from Jaws', sharkX, y - 200, 64, 700, jaws, { fill: '#e94b3c', halo: '#2a0805' });
  // The coast, once they've gone.
  const map = window01(t, T.left - 0.4, T.whatEats - 0.2, 0.3);
  drawCoast(ctx, smooth((t - T.left) / 2.2), map);
  return dark;
}
