import { makeDraw } from '../src/art/kit';
import { BLUE } from '../src/art/palette';
import { drawProspector, PROSPECTOR_FRAME, PROSPECTOR_GROUND } from '../src/art/prospector';
import { drawTidesinger, drawTidesingerAir, TIDE_POSES, TIDESINGER } from '../src/art/tidesinger/body';
import { ASTER_PICTURE_RES, LANDER_FINISH, PROSPECTOR_FINISH, render } from '../src/art/textures';
import { ASTER_CRAFT, drawAsterCraft, drawAsterCraftAir } from '../src/art/asterCraftArt';
import { drawCopperSandPicture, drawCraftSinkingPicture, drawTubeDrillPicture, TIDE_PICTURE } from '../src/art/tidesinger/pictures';
import { AIR_BELL, drawAirBell, drawAirBellAir, drawReefHome, drawReefHomeAir, REEF_HOME } from '../src/art/tidesinger/reef';
import { TIDESINGER_FINISH } from '../src/art/brineTextures';
import { evenLoadout, prospectorLook } from '../src/logic/gear';

// Dev page section: Brine's people, the Tidesingers, their reef and the air bell, the Aster craft, and the card pictures.

type Section = (title: string, note: string) => HTMLDivElement;
type Figure = (row: HTMLElement, label: string, canvas: HTMLCanvasElement) => void;

interface Art {
  readonly w: number;
  readonly h: number;
  readonly ox: number;
  readonly oy: number;
}

/** Brine's sea behind a figure: purple water, lighter towards the surface. */
const SEA = 'linear-gradient(#8a77b4, #5d4a86)';

function shown(c: HTMLCanvasElement, a: Art, scale: number, bg: string): HTMLCanvasElement {
  c.style.width = `${a.w * scale}px`;
  c.style.background = bg;
  return c;
}

export function brineFolkSections(section: Section, figure: Figure): void {
  const T = TIDESINGER;
  const folk = section('Brine: the Tidesingers', 'Brine\'s ocean people, in blue ink (harmless): gliding, singing, pointing with a lobe; then the boil frames; then at play size beside the prospector.');
  const tide = (pose: (typeof TIDE_POSES)[number], res: number, f = 0): HTMLCanvasElement =>
    render(T.w, T.h, T.ox, T.oy, res, (ctx) => drawTidesinger(makeDraw(ctx, 6000 + f, f, 0, BLUE), pose), TIDESINGER_FINISH, (ctx) => drawTidesingerAir(makeDraw(ctx, 6005 + f, f, 0, BLUE), pose));
  for (const pose of TIDE_POSES) figure(folk, pose, shown(tide(pose, 6), T, 5, SEA));
  for (const f of [1, 2]) figure(folk, `glide ${f}`, shown(tide('glide', 3, f), T, 2.5, SEA));
  for (const pose of TIDE_POSES) {
    const c = document.createElement('canvas');
    const res = 2;
    const P = PROSPECTOR_FRAME;
    c.width = (T.w + P) * res;
    c.height = T.h * res;
    const ctx = c.getContext('2d')!;
    ctx.drawImage(tide(pose, res), 0, 0);
    const p = render(P, P, P / 2, P / 2, res, (x) => drawProspector(makeDraw(x, 100, 0, PROSPECTOR_GROUND), 'idle', prospectorLook(evenLoadout(3))), PROSPECTOR_FINISH);
    ctx.drawImage(p, T.w * res, (T.oy - P / 2) * res);
    figure(folk, `${pose} 2x with the prospector`, shown(c, { ...T, w: T.w + P }, 2, SEA));
  }

  const reef = section('Brine: the Tidesingers\' reef', 'The mouth of their home in the sea cave, and the air bell under the reef, empty and with the three Aster crew in it; then each at play size.');
  const home = (res: number, f = 0): HTMLCanvasElement => render(REEF_HOME.w, REEF_HOME.h, REEF_HOME.ox, REEF_HOME.oy, res, (ctx) => drawReefHome(makeDraw(ctx, 6100 + f, f, 0)), LANDER_FINISH, (ctx) => drawReefHomeAir(makeDraw(ctx, 6105 + f, f, 0)));
  const bell = (crew: 0 | 3, res: number, f = 0): HTMLCanvasElement => render(AIR_BELL.w, AIR_BELL.h, AIR_BELL.ox, AIR_BELL.oy, res, (ctx) => drawAirBell(makeDraw(ctx, 6200 + f, f, 0), crew), LANDER_FINISH, (ctx) => drawAirBellAir(makeDraw(ctx, 6205 + f, f, 0)));
  figure(reef, 'the reef home', shown(home(4), REEF_HOME, 3.5, SEA));
  figure(reef, 'the air bell, crew', shown(bell(3, 5), AIR_BELL, 4, SEA));
  figure(reef, 'the air bell, empty', shown(bell(0, 3), AIR_BELL, 2, SEA));
  figure(reef, 'reef home 1x', shown(home(2), REEF_HOME, 1, SEA));
  figure(reef, 'air bell 1x', shown(bell(3, 2), AIR_BELL, 1, SEA));

  const craft = section('Brine: the Aster craft', 'The crew\'s craft from their lander\'s petals: sunk on the reef, raised on the Tidesingers\' bladders and patched with magnetite iron, mended with its glass glowing; then at play size.');
  const ship = (state: 'sunk' | 'raised' | 'mended', res: number, f = 0): HTMLCanvasElement => render(ASTER_CRAFT.w, ASTER_CRAFT.h, ASTER_CRAFT.ox, ASTER_CRAFT.oy, res, (ctx) => drawAsterCraft(makeDraw(ctx, 6400 + f, f, 0), state), LANDER_FINISH, (ctx) => drawAsterCraftAir(makeDraw(ctx, 6405 + f, f, 0), state));
  for (const state of ['sunk', 'raised', 'mended'] as const) figure(craft, state, shown(ship(state, 4), ASTER_CRAFT, 3.4, SEA));
  for (const state of ['sunk', 'raised', 'mended'] as const) figure(craft, `${state} 1x`, shown(ship(state, 2), ASTER_CRAFT, 1, SEA));

  const pics = section('Brine: card pictures', 'The craft sinking, scratched in plum inside its shell by the Aster; then two drawn in wet sand by a Tidesinger: copper in the rock they can\'t break, and how they bore stone with a tube spun on sand. At card size, then big.');
  const W = TIDE_PICTURE;
  for (const [name, draw] of [['the craft sinking', drawCraftSinkingPicture], ['copper in the rock', drawCopperSandPicture], ['the tube drill', drawTubeDrillPicture]] as const) {
    const c = render(W.w, W.h, W.ox, W.oy, ASTER_PICTURE_RES, (ctx) => draw(makeDraw(ctx, 6500, 0, 0)));
    c.style.height = '96px';
    c.style.background = '#efe6cf';
    figure(pics, `${name}, card size`, c);
  }
  for (const [name, draw] of [['the craft sinking', drawCraftSinkingPicture], ['copper in the rock', drawCopperSandPicture], ['the tube drill', drawTubeDrillPicture]] as const) {
    const big = render(W.w, W.h, W.ox, W.oy, 5, (ctx) => draw(makeDraw(ctx, 6500, 0, 0)));
    big.style.width = `${W.w * 3.5}px`;
    figure(pics, name, big);
  }
}
