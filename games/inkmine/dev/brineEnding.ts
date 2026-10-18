import { makeDraw } from '../src/art/kit';
import { PROSPECTOR_FRAME, PROSPECTOR_GROUND, drawProspector } from '../src/art/prospector';
import { ASTER_PICTURE_RES, LANDER_FINISH, PROSPECTOR_FINISH, render } from '../src/art/textures';
import { ASTER_CRAFT, drawAsterCraft, drawAsterCraftAir, type CraftState } from '../src/art/asterCraftArt';
import { DRIVE_CRYSTAL, drawCrystalFallPicture, drawDriveCrystal, drawDriveCrystalAir, drawStarChartPicture } from '../src/art/aster/brineEnding';
import { CRYSTAL_RES } from '../src/art/brineTextures';
import { TIDE_PICTURE } from '../src/art/tidesinger/pictures';
import { evenLoadout, prospectorLook } from '../src/logic/gear';

// Dev page section: the end of chapter 3, the craft home on its legs and lifting off, its drive crystal in the Leviathan's cave, and the two card pictures.

type Section = (title: string, note: string) => HTMLDivElement;
type Figure = (row: HTMLElement, label: string, canvas: HTMLCanvasElement) => void;

interface Art {
  readonly w: number;
  readonly h: number;
  readonly ox: number;
  readonly oy: number;
}

/** Mycel's glade behind the craft: hazy green sky, violet peat under the origin. */
const GLADE = 'linear-gradient(#b9c4a6 0%, #dcd3b8 calc(100% - var(--floor)), #7d6488 calc(100% - var(--floor)))';
/** The Leviathan's cave: dark flooded basalt, the floor under the origin. */
const CAVE = 'linear-gradient(#2c2740 0%, #3b3352 calc(100% - var(--floor)), #241f30 calc(100% - var(--floor)))';

function shown(c: HTMLCanvasElement, a: Art, scale: number, bg: string): HTMLCanvasElement {
  c.style.width = `${a.w * scale}px`;
  c.style.background = bg;
  c.style.setProperty('--floor', `${(a.h - a.oy) * scale}px`);
  return c;
}

export function brineEndingSections(section: Section, figure: Figure): void {
  const craft = section('Brine ending: the craft home', 'The Aster craft out of the water: landed on its four claw legs (patched, its glass lit), then lifting off with its legs folded, thrust under it and the sea dripping off it, in each boil frame; then at play size beside the prospector.');
  const ship = (state: CraftState, res: number, f = 0): HTMLCanvasElement => render(ASTER_CRAFT.w, ASTER_CRAFT.h, ASTER_CRAFT.ox, ASTER_CRAFT.oy, res, (ctx) => drawAsterCraft(makeDraw(ctx, 6430 + f, f, 0), state), LANDER_FINISH, (ctx) => drawAsterCraftAir(makeDraw(ctx, 6435 + f, f, 0), state));
  for (const state of ['landed', 'flying'] as const) figure(craft, state, shown(ship(state, 4), ASTER_CRAFT, 3.4, GLADE));
  for (const f of [1, 2]) figure(craft, `flying ${f}`, shown(ship('flying', 3, f), ASTER_CRAFT, 2, GLADE));
  for (const state of ['landed', 'flying'] as const) {
    const res = 2;
    const C = ASTER_CRAFT;
    const P = PROSPECTOR_FRAME;
    const c = document.createElement('canvas');
    c.width = C.w * res;
    c.height = C.h * res;
    const ctx = c.getContext('2d')!;
    ctx.drawImage(ship(state, res), 0, 0);
    const p = render(P, P, P / 2, P / 2, res, (x) => drawProspector(makeDraw(x, 100, 0, PROSPECTOR_GROUND), 'idle', prospectorLook(evenLoadout(3))), PROSPECTOR_FINISH);
    ctx.drawImage(p, (C.ox - 78 - P / 2) * res, (C.oy - P / 2 - PROSPECTOR_GROUND) * res);
    figure(craft, `${state} 1x with the prospector`, shown(c, C, 1, GLADE));
  }

  const crystal = section('Brine ending: the drive crystal', 'The craft\'s drive crystal lying in the silt of the Leviathan\'s cave, glowing; its three boil frames (the glow breathes); then at play size with the prospector.');
  const X = DRIVE_CRYSTAL;
  const gem = (res: number, f = 0): HTMLCanvasElement => render(X.w, X.h, X.ox, X.oy, res, (ctx) => drawDriveCrystal(makeDraw(ctx, 6600 + f, f, 0)), LANDER_FINISH, (ctx) => drawDriveCrystalAir(makeDraw(ctx, 6605 + f, f, 0)));
  figure(crystal, 'the drive crystal', shown(gem(10), X, 9, CAVE));
  for (const f of [0, 1, 2]) figure(crystal, `frame ${f}`, shown(gem(5, f), X, 4, CAVE));
  {
    const res = CRYSTAL_RES;
    const P = PROSPECTOR_FRAME;
    const W = X.w + P;
    const c = document.createElement('canvas');
    c.width = W * res;
    c.height = P * res;
    const ctx = c.getContext('2d')!;
    ctx.drawImage(gem(res), P * res, (P / 2 + PROSPECTOR_GROUND - X.oy) * res);
    const p = render(P, P, P / 2, P / 2, res, (x) => drawProspector(makeDraw(x, 100, 0, PROSPECTOR_GROUND), 'idle', prospectorLook(evenLoadout(3))), PROSPECTOR_FINISH);
    ctx.drawImage(p, 0, 0);
    figure(crystal, '1x with the prospector', shown(c, { w: W, h: P, ox: 0, oy: P / 2 + PROSPECTOR_GROUND }, 2, CAVE));
  }

  const pics = section('Brine ending: card pictures', 'Scratched in the Aster\'s plum ink: the crew\'s drawing of the crystal falling through the cracked keel, down the reef into the sleeper\'s cave; and their star chart, the course from the moons to Talus. At card size, then big.');
  const W = TIDE_PICTURE;
  const list = [['the crystal falling', drawCrystalFallPicture], ['the star chart', drawStarChartPicture]] as const;
  for (const [name, draw] of list) {
    const c = render(W.w, W.h, W.ox, W.oy, ASTER_PICTURE_RES, (ctx) => draw(makeDraw(ctx, 6610, 0, 0)));
    c.style.height = '96px';
    c.style.background = '#efe6cf';
    figure(pics, `${name}, card size`, c);
  }
  for (const [name, draw] of list) {
    const big = render(W.w, W.h, W.ox, W.oy, 5, (ctx) => draw(makeDraw(ctx, 6610, 0, 0)));
    big.style.width = `${W.w * 3.5}px`;
    figure(pics, name, big);
  }
}
