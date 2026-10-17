import { makeDraw } from '../src/art/kit';
import { drawTech, TECH_FRAME } from '../src/art/techArt';
import { TECH_RES, render } from '../src/art/textures';
import { drawTidesingerGear } from '../src/art/tidesinger/gear';
import { drawWreck, WRECK_FRAME } from '../src/art/wreckArt';
import { PIECES } from '../src/logic/gear';
import type { Tech } from '../src/logic/tech';

// Dev page section: Brine's new gear art: the Tidesingers' broken tools (Mk 3), the rebreather, the Aster tank.

type Section = (title: string, note: string) => HTMLDivElement;
type Figure = (row: HTMLElement, label: string, canvas: HTMLCanvasElement) => void;

/** Brine's seabed behind a wreck: purple water over grey-violet silt. */
const SEABED = 'linear-gradient(#7d6a96 0%, #9a8aa8 70%, #a39aa3 70%)';
const SLOT = '#efe6cf';
const TECH_FINISH = { line: 0.7, rim: 0.6 };

function wreck(piece: (typeof PIECES)[number], res: number, px: number, f = 0): HTMLCanvasElement {
  const F = WRECK_FRAME;
  const c = render(F, F, F / 2, F / 2, res, (ctx) => drawWreck(makeDraw(ctx, 460 + f, f, 0), piece, 3));
  c.style.width = `${px}px`;
  c.style.background = SEABED;
  return c;
}

function tech(t: Tech, v: Parameters<typeof drawTech>[2], px: number): HTMLCanvasElement {
  const F = TECH_FRAME;
  const c = render(F, F, F / 2, F / 2, TECH_RES, (ctx) => drawTech(makeDraw(ctx, 600, 0, 0), t, v), TECH_FINISH);
  c.style.width = `${px}px`;
  c.style.background = SLOT;
  return c;
}

export function brineGearSections(section: Section, figure: Figure): void {
  const studied = section('Brine: the Tidesingers\' tools (Mk 3)', 'As they were before they broke, big: stone, shell, nacre, sponge glass, woven fibre and wax; no metal anywhere. Their mark is a spiral.');
  const F = WRECK_FRAME;
  for (const piece of PIECES) {
    const c = render(F, F, F / 2, F / 2, 8, (ctx) => drawTidesingerGear(makeDraw(ctx, 470, 0, 0), piece), TECH_FINISH);
    c.style.width = `${F * 6}px`;
    c.style.background = SLOT;
    figure(studied, piece, c);
  }

  const wrecks = section('Brine: broken tools on the seabed', 'Mk 3 broken parts as the world draws them: tipped, half sunk in silt, cracked, slimed purple, weed round them. Big, then each boil frame of one, then at play size (a tile is 32 px).');
  for (const piece of PIECES) figure(wrecks, piece, wreck(piece, 6, F * 6));
  for (const f of [0, 1, 2]) figure(wrecks, `cell, frame ${f}`, wreck('cell', 4, F * 3, f));
  for (const piece of PIECES) figure(wrecks, `${piece} 1x`, wreck(piece, 3, 32 * 1.3));

  const tools = section('Brine: the rebreather', 'The tool slot, big and at the slot\'s size, beside the receiver and the pulse for scale.');
  figure(tools, 'rebreather', tech({ kind: 'tool', id: 'rebreather' }, 'mended', TECH_FRAME * 6));
  for (const id of ['rebreather', 'receiver', 'pulse'] as const) figure(tools, `${id}, slot`, tech({ kind: 'tool', id }, 'mended', TECH_FRAME * 3));

  const tank = section('Brine: the Aster tank', 'The Starship tab\'s slot: not fitted yet (the empty cradle, the jar pencilled in), then fitted; big, then at the slot\'s size beside the ship\'s own tank.');
  for (const v of ['broken', 'mended'] as const) figure(tank, v === 'broken' ? 'not fitted' : 'fitted', tech({ kind: 'starship', id: 'asterTank' }, v, TECH_FRAME * 6));
  for (const v of ['broken', 'mended'] as const) figure(tank, `${v === 'broken' ? 'not fitted' : 'fitted'}, slot`, tech({ kind: 'starship', id: 'asterTank' }, v, TECH_FRAME * 3));
  figure(tank, 'ship tank, slot', tech({ kind: 'starship', id: 'tank' }, 'mended', TECH_FRAME * 3));
}
