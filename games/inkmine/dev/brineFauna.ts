import { BRINE_FAUNA_RES, RED_FINISH } from '../src/art/brineFauna';
import { CRAB_ART, drawCrab, type CrabPose } from '../src/art/creatures/crab';
import { drawJelly, drawJellyBell, JELLY_ART, type JellyPose } from '../src/art/creatures/jelly';
import { drawLamprey, LAMPREY_ART, LAMPREY_STEPS } from '../src/art/creatures/lamprey';
import { drawLeviathan, drawLeviathanAir, LEVIATHAN_ART, type LeviathanPose } from '../src/art/creatures/leviathan';
import { makeDraw } from '../src/art/kit';
import { RED } from '../src/art/palette';
import { drawProspector, PROSPECTOR_FRAME, PROSPECTOR_GROUND } from '../src/art/prospector';
import { LANDER_FINISH, PROSPECTOR_FINISH, render } from '../src/art/textures';
import { evenLoadout, prospectorLook } from '../src/logic/gear';

// Dev page section: Brine's creatures, the shore crab in blue ink and the hostile ones in red: big, then at play size.

type Section = (title: string, note: string) => HTMLDivElement;
type Figure = (row: HTMLElement, label: string, canvas: HTMLCanvasElement) => void;

interface Art {
  readonly w: number;
  readonly h: number;
  readonly ox: number;
  readonly oy: number;
}

/** Brine's backdrops: the lilac sky over an island's sand, the purple sea, a basalt wall, and the deep cave's floor. */
const SHORE = 'linear-gradient(#ece0e6 0%, #ece0e6 calc(100% - var(--floor)), #b3a28f calc(100% - var(--floor)))';
const SEA = 'linear-gradient(#8a77b4, #5d4a86)';
const WALL = 'linear-gradient(90deg, #5d5f6e 0, #5d5f6e var(--wall), transparent var(--wall)), linear-gradient(#7a66a6, #574580)';
const DEEP = 'linear-gradient(#4d3d73 0%, #3a2d5c calc(100% - var(--floor)), #454657 calc(100% - var(--floor)))';

function shown(c: HTMLCanvasElement, a: Art, scale: number, bg: string): HTMLCanvasElement {
  c.style.width = `${a.w * scale}px`;
  c.style.background = bg;
  c.style.setProperty('--floor', `${(a.h - a.oy) * scale}px`);
  c.style.setProperty('--wall', `${a.ox * scale}px`);
  return c;
}

const crab = (pose: CrabPose, res: number, f = 0): HTMLCanvasElement => render(CRAB_ART.w, CRAB_ART.h, CRAB_ART.ox, CRAB_ART.oy, res, (ctx) => drawCrab(makeDraw(ctx, 7000 + f, f, 0), pose), LANDER_FINISH);
const jelly = (pose: JellyPose, res: number, f = 0): HTMLCanvasElement => render(JELLY_ART.w, JELLY_ART.h, JELLY_ART.ox, JELLY_ART.oy, res, (ctx) => drawJelly(makeDraw(ctx, 7100 + f, f, 0, RED), pose), RED_FINISH, (ctx) => drawJellyBell(makeDraw(ctx, 7105 + f, f, 0, RED), pose));
const eel = (reach: number, res: number, f = 0): HTMLCanvasElement => render(LAMPREY_ART.w, LAMPREY_ART.h, LAMPREY_ART.ox, LAMPREY_ART.oy, res, (ctx) => drawLamprey(makeDraw(ctx, 7200 + f, f, 0, RED), reach), RED_FINISH);
const leviathan = (pose: LeviathanPose, res: number, f = 0): HTMLCanvasElement => render(LEVIATHAN_ART.w, LEVIATHAN_ART.h, LEVIATHAN_ART.ox, LEVIATHAN_ART.oy, res, (ctx) => drawLeviathan(makeDraw(ctx, 7300 + f, f, 0, RED), pose), RED_FINISH, (ctx) => drawLeviathanAir(makeDraw(ctx, 7305 + f, f, 0, RED), pose));

/** A creature beside the prospector, on one canvas at play resolution, the prospector standing on the creature's ground line `px` units to its left. */
function withProspector(c: HTMLCanvasElement, a: Art, res: number, groundY = a.oy): HTMLCanvasElement {
  const P = PROSPECTOR_FRAME;
  const out = document.createElement('canvas');
  out.width = (a.w + P) * res;
  out.height = Math.max(a.h, groundY + P / 2) * res;
  const ctx = out.getContext('2d')!;
  const p = render(P, P, P / 2, P / 2, res, (x) => drawProspector(makeDraw(x, 100, 0, PROSPECTOR_GROUND), 'idle', prospectorLook(evenLoadout(3))), PROSPECTOR_FINISH);
  ctx.drawImage(p, 0, (groundY - P / 2 - PROSPECTOR_GROUND) * res);
  ctx.drawImage(c, P * res, 0);
  return out;
}

export function brineFaunaSections(section: Section, figure: Figure): void {
  const R = BRINE_FAUNA_RES;
  const crabs = section('Brine: the shore crab', 'Harmless, in blue: three walk steps (its boil frames are the walk cycle), then tucked like a salt-crusted stone; then at play size, and beside the prospector.');
  for (const f of [0, 1, 2]) figure(crabs, `walk ${f}`, shown(crab('walk', 8, f), CRAB_ART, 6, SHORE));
  figure(crabs, 'tucked', shown(crab('tucked', 8), CRAB_ART, 6, SHORE));
  for (const f of [0, 1, 2]) figure(crabs, `walk ${f} 1x`, shown(crab('walk', R.crab, f), CRAB_ART, 1, SHORE));
  figure(crabs, 'tucked 1x', shown(crab('tucked', R.crab), CRAB_ART, 1, SHORE));
  const crabPair = withProspector(crab('walk', 2), CRAB_ART, 2);
  figure(crabs, 'with the prospector 2x', shown(crabPair, { ...CRAB_ART, w: CRAB_ART.w + PROSPECTOR_FRAME, h: crabPair.height / 2 }, 2, SHORE));

  const jellies = section('Brine: the bubble jelly', 'A flyer, in red: drifting on its gas bubble, pulsing to sting (bell shut, threads flared), burst (the bubble escaping in beads); the bell is see-through; then at play size.');
  const POSES: readonly JellyPose[] = ['drift', 'pulse', 'burst'];
  for (const pose of POSES) figure(jellies, pose, shown(jelly(pose, 8), JELLY_ART, 5, SEA));
  for (const f of [1, 2]) figure(jellies, `drift ${f}`, shown(jelly('drift', 6, f), JELLY_ART, 3, SEA));
  for (const pose of POSES) figure(jellies, `${pose} 1x`, shown(jelly(pose, R.jelly), JELLY_ART, 1, SEA));

  const eels = section('Brine: the rasp eel', 'A lunger from a burrow in a flooded basalt wall (the wall is drawn to its left), in red: reach 0, 1/3, 2/3 and 1, its disc of magnetite-capped teeth gaping at full reach; then at play size.');
  LAMPREY_STEPS.forEach((reach) => figure(eels, `reach ${reach.toFixed(2)}`, shown(eel(reach, 6), LAMPREY_ART, 4.5, WALL)));
  figure(eels, 'reach 1 frame 1', shown(eel(1, 6, 1), LAMPREY_ART, 4.5, WALL));
  const head = render(40, 30, 6, 15, 16, (ctx) => {
    ctx.translate(-112, 0);
    drawLamprey(makeDraw(ctx, 7200, 0, 0, RED), 1);
  }, RED_FINISH);
  figure(eels, 'the disc, close', shown(head, { w: 40, h: 30, ox: 6, oy: 15 }, 10, SEA));
  LAMPREY_STEPS.forEach((reach) => figure(eels, `${reach.toFixed(2)} 1x`, shown(eel(reach, R.lamprey), LAMPREY_ART, 1, WALL)));

  const giants = section('Brine: the Leviathan', 'Brine\'s giant, in red, 10 × 4 tiles: asleep and curled (a string of bubbles from a gill), stirring (eye half open, lights up), awake (stretched out, mouth opening, lights bright). Then at play size with the prospector.');
  const LP: readonly LeviathanPose[] = ['sleep', 'stir', 'awake'];
  for (const pose of LP) figure(giants, pose, shown(leviathan(pose, 4), LEVIATHAN_ART, 3, DEEP));
  for (const pose of LP) {
    const pair = withProspector(leviathan(pose, R.leviathan), LEVIATHAN_ART, R.leviathan);
    figure(giants, `${pose} 1x with the prospector`, shown(pair, { ...LEVIATHAN_ART, w: LEVIATHAN_ART.w + PROSPECTOR_FRAME }, 1, DEEP));
  }
}
