import { drawAsterPulse, drawPulseShot, drawPulseTool, SHOT_ART } from '../src/art/aster/weapon';
import { drawGrazer, GRAZER_ART } from '../src/art/creatures/grazer';
import { drawMotherMycel, MOTHER_ART } from '../src/art/creatures/mother';
import { drawPuffball, drawSporeGlob, GLOB_ART, PUFFBALL_ART, type PuffPose } from '../src/art/creatures/puffball';
import { drawTendril, TENDRIL_ART } from '../src/art/creatures/tendril';
import { makeDraw, type Draw } from '../src/art/kit';
import { finishSprite } from '../src/art/paint';
import { BLUE, INK, RED } from '../src/art/palette';
import { drawProspector, PROSPECTOR_FRAME, PROSPECTOR_GROUND } from '../src/art/prospector';
import { PROSPECTOR_FINISH, PROSPECTOR_RES, render, TECH_RES } from '../src/art/textures';
import { evenLoadout, prospectorLook } from '../src/logic/gear';

// Dev page section: Mycel's creatures and the Aster's pulse, hostile ones baked in red ink.

type Section = (title: string, note: string) => HTMLDivElement;
type Figure = (row: HTMLElement, label: string, canvas: HTMLCanvasElement) => void;

interface Art {
  readonly w: number;
  readonly h: number;
  readonly ox: number;
  readonly oy: number;
}

/** A cave's colours behind a creature: Mycel's pale dug back wall, its violet peat for a floor or a ceiling. */
const CAVE_FLOOR = 'linear-gradient(#e4dae1 0%, #e4dae1 calc(100% - var(--floor)), #9f8aab calc(100% - var(--floor)))';
const CAVE_ROOF = 'linear-gradient(#9f8aab 0, #9f8aab var(--roof), #e4dae1 var(--roof))';

/** Bakes a drawing with the sprite finish, its silhouette in `ink` (red for anything hostile). */
function bake(a: Art, res: number, ink: string, seed: number, f: number, draw: (d: Draw) => void): HTMLCanvasElement {
  const canvas = render(a.w, a.h, a.ox, a.oy, res, (ctx) => draw(makeDraw(ctx, seed + f, f, 0, ink)));
  finishSprite(canvas, { unit: res, ink, line: 0.6, rim: 0.6 });
  return canvas;
}

/** Shows a canvas at `scale` px a unit (1 = play size at 1x), on a cave background. */
function shown(c: HTMLCanvasElement, a: Art, scale: number, bg: string, floor = 0): HTMLCanvasElement {
  c.style.width = `${a.w * scale}px`;
  c.style.background = bg;
  c.style.setProperty('--floor', `${(a.h - a.oy) * scale}px`);
  c.style.setProperty('--roof', `${a.oy * scale}px`);
  if (floor) c.style.setProperty('--floor', `${floor}px`);
  return c;
}

export function creatureSections(section: Section, figure: Figure): void {
  const puffs = section('Mycel: the puffball', 'A spitter on cave floors, in red. Idle, swelling, spitting, burst; then its glob; then at play size (a tile is 32 px).');
  const POSES: readonly PuffPose[] = ['idle', 'swell', 'spit', 'burst'];
  for (const pose of POSES) figure(puffs, pose, shown(bake(PUFFBALL_ART, 5, RED, 900, 0, (d) => drawPuffball(d, pose)), PUFFBALL_ART, 4, CAVE_FLOOR));
  figure(puffs, 'glob', shown(bake(GLOB_ART, 5, RED, 910, 0, drawSporeGlob), GLOB_ART, 4, '#e4dae1'));
  for (const pose of POSES) figure(puffs, `${pose} 1x`, shown(bake(PUFFBALL_ART, 2, RED, 900, 1, (d) => drawPuffball(d, pose)), PUFFBALL_ART, 1, CAVE_FLOOR));
  figure(puffs, 'glob 1x', shown(bake(GLOB_ART, 2, RED, 910, 0, drawSporeGlob), GLOB_ART, 1, '#e4dae1'));

  const whips = section('Mycel: the snap tendril', 'Hanging from a cave ceiling, in red: reach 0, 0.33, 0.66 and 1, open then grabbing; then at play size.');
  for (const grab of [false, true]) {
    for (const reach of [0, 0.33, 0.66, 1]) figure(whips, `${reach}${grab ? ' grab' : ''}`, shown(bake(TENDRIL_ART, 4, RED, 920, 0, (d) => drawTendril(d, reach, grab)), TENDRIL_ART, 2.4, CAVE_ROOF));
  }
  for (const reach of [0, 0.33, 0.66, 1]) figure(whips, `${reach} 1x`, shown(bake(TENDRIL_ART, 2, RED, 920, 1, (d) => drawTendril(d, reach, false)), TENDRIL_ART, 1, CAVE_ROOF));

  const grazers = section('Mycel: the grazer', 'Harmless, in blue: three walk steps, then curled under its plates; then at play size.');
  for (const f of [0, 1, 2]) figure(grazers, `walk ${f}`, shown(bake(GRAZER_ART, 5, BLUE, 930, f, (d) => drawGrazer(d, 'walk')), GRAZER_ART, 4, CAVE_FLOOR));
  figure(grazers, 'curled', shown(bake(GRAZER_ART, 5, BLUE, 930, 0, (d) => drawGrazer(d, 'curled')), GRAZER_ART, 4, CAVE_FLOOR));
  for (const f of [0, 1, 2]) figure(grazers, `walk ${f} 1x`, shown(bake(GRAZER_ART, 2, BLUE, 930, f, (d) => drawGrazer(d, 'walk')), GRAZER_ART, 1, CAVE_FLOOR));
  figure(grazers, 'curled 1x', shown(bake(GRAZER_ART, 2, BLUE, 930, 0, (d) => drawGrazer(d, 'curled')), GRAZER_ART, 1, CAVE_FLOOR));

  const mothers = section('Mycel: the Mother Mycel', 'Its giant, in red: at rest, swelling, full. Then at play size.');
  for (const beat of [0, 1, 2] as const) figure(mothers, `beat ${beat}`, shown(bake(MOTHER_ART, 3, RED, 940, beat, (d) => drawMotherMycel(d, beat)), MOTHER_ART, 1.6, CAVE_FLOOR));
  figure(mothers, 'full 1x', shown(bake(MOTHER_ART, 2, RED, 940, 2, (d) => drawMotherMycel(d, 2)), MOTHER_ART, 1, CAVE_FLOOR));

  const pulse = section('The pulse', 'The Aster\'s bracer as it lies on Mycel, our printed one for the tool slot, its shot; then the prospector armed and not (Mk 2, Mk 0, Mk 5).');
  const TOOL = { w: 40, h: 40, ox: 20, oy: 20 };
  figure(pulse, 'Aster bracer', shown(bake(TOOL, TECH_RES, INK, 950, 0, drawAsterPulse), TOOL, 3, '#efe6cf'));
  figure(pulse, 'our pulse', shown(bake(TOOL, TECH_RES, INK, 951, 0, drawPulseTool), TOOL, 3, '#efe6cf'));
  figure(pulse, 'shot', shown(bake(SHOT_ART, 5, INK, 952, 0, drawPulseShot), SHOT_ART, 4, '#e4dae1'));
  figure(pulse, 'shot 1x', shown(bake(SHOT_ART, 2, INK, 952, 0, drawPulseShot), SHOT_ART, 1, '#e4dae1'));
  const P = PROSPECTOR_FRAME;
  for (const mk of [2, 0, 5]) {
    for (const armed of [false, true]) {
      for (const pose of ['idle', 'climb'] as const) {
        if (pose === 'climb' && mk !== 2) continue;
        const c = render(P, P, P / 2, P / 2, PROSPECTOR_RES, (ctx) => drawProspector(makeDraw(ctx, 100, 0, PROSPECTOR_GROUND), pose, prospectorLook(evenLoadout(mk), armed)), PROSPECTOR_FINISH);
        c.style.width = `${P * 4}px`;
        figure(pulse, `Mk ${mk} ${pose}${armed ? ' armed' : ''}`, c);
      }
    }
  }
}
