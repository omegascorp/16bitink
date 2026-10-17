import { drawBrineRidges, drawBrineSky } from '../src/art/brineSky';
import { makeDraw } from '../src/art/kit';
import { drawOreGlyph, drawOrePiece } from '../src/art/oreArt';
import type { GroundStyle } from '../src/art/palette';
import { RIDGE_W } from '../src/art/ridgeArt';
import { SKY_W } from '../src/art/skyArt';
import { PIECE_FRAME, render, ridgeRoom, SKY_SKIRT } from '../src/art/textures';
import { ORES, type OreKind } from '../src/logic/ore';

// Dev page section: Brine's ores (in the rock and loose) and its sky over the purple sea.

type Section = (title: string, note: string) => HTMLDivElement;
type Figure = (row: HTMLElement, label: string, canvas: HTMLCanvasElement) => void;

/** A tile's size in world px, as the ground draws ore. */
const T = 32;
/** Brine's rock as a stand-in for its ground washes: sediment, basalt. */
const SEDIMENT = '#9c968a';
const BASALT = '#5f6468';
/** A stand-in ground style for the near islands' colour (Brine's ground comes from the server). */
const BRINE_STYLE: GroundStyle = { soil: SEDIMENT, stone: BASALT, deep: '#474a52', bedrock: '#2d2e35', grain: '#3c3d44', shade: '#33343c', tunnel: '#d8d4cc', sky: '#ecd8d4' };

function glyph(ore: OreKind, res: number, seed: number): HTMLCanvasElement {
  return render(T, T, T / 2, T / 2, res, (ctx) => drawOreGlyph(ctx, ore, T, seed));
}

function piece(ore: OreKind, res: number, seed: number): HTMLCanvasElement {
  return render(PIECE_FRAME, PIECE_FRAME, PIECE_FRAME / 2, PIECE_FRAME / 2, res, (ctx) => drawOrePiece(ctx, ore, PIECE_FRAME, seed, BASALT));
}

function shown(c: HTMLCanvasElement, px: number, bg: string): HTMLCanvasElement {
  c.style.width = `${px}px`;
  c.style.background = bg;
  return c;
}

/** A strip of tiles of one ore at play size, each with its own seed, as a vein shows in the ground. */
function vein(ore: OreKind, bg: string): HTMLCanvasElement {
  const n = 5;
  const c = render(T * n, T, 0, T / 2, 2, (ctx) => {
    for (let i = 0; i < n; i++) {
      ctx.save();
      ctx.translate(T * (i + 0.5), 0);
      drawOreGlyph(ctx, ore, T, 7000 + i * 131);
      ctx.restore();
    }
  });
  return shown(c, T * n, bg);
}

/** The sky and the ridge strip laid together as GameScene places them, cropped to `cw` px from `x`; each layer is tiled, so a crop over the seam shows whether it meets. */
function scene(skyH: number, cw: number, sx: number, rx: number): HTMLCanvasElement {
  const sky = render(SKY_W, skyH + SKY_SKIRT, 0, 0, 1, (ctx) => drawBrineSky(makeDraw(ctx, 900, 0, 0), SKY_W, skyH + SKY_SKIRT, skyH));
  const ridge = skyH * 0.5;
  const room = ridgeRoom(skyH);
  const strip = render(RIDGE_W, room + ridge + SKY_SKIRT, 0, 0, 1, (ctx) => {
    ctx.translate(0, room);
    drawBrineRidges(makeDraw(ctx, 910, 0, 0), RIDGE_W, ridge + SKY_SKIRT, ridge, BRINE_STYLE);
  });
  const ch = skyH + 140;
  const out = document.createElement('canvas');
  out.width = cw;
  out.height = ch;
  const ctx = out.getContext('2d')!;
  for (const k of [-1, 0, 1]) ctx.drawImage(sky, k * SKY_W - sx, 0);
  const top = skyH * 0.5 + T * 0.5 - room;
  for (const k of [-1, 0, 1]) ctx.drawImage(strip, k * RIDGE_W - rx, top);
  // The island's surface as the lander stands on it (the left half), and open sea two tiles lower on the right, so the layers are judged where play puts them.
  ctx.fillStyle = BASALT;
  ctx.fillRect(0, skyH, cw * 0.5, ch - skyH);
  ctx.fillRect(cw * 0.5, skyH + T * 2, cw * 0.5, ch - skyH - T * 2);
  return out;
}

export function brineSections(section: Section, figure: Figure): void {
  const brine = [ORES.nodule, ORES.halite, ORES.magnetite, ORES.pearl];
  const ores = section('Brine: ores', 'Manganese nodule, halite, magnetite, brine pearl: in the rock (sediment, then basalt) and as a loose piece, big; then a vein of each at play size, and Graphite and Mycel ores beside them to compare.');
  for (const ore of brine) {
    figure(ores, `${ore.name}, sediment`, shown(glyph(ore, 8, 4100 + ore.id), 192, SEDIMENT));
    figure(ores, `${ore.name}, basalt`, shown(glyph(ore, 8, 4200 + ore.id), 192, BASALT));
    figure(ores, `${ore.name}, loose`, shown(piece(ore, 8, 500 + ore.id), 160, '#e9e1cf'));
  }
  for (const ore of [ORES.copper, ORES.malachite, ORES.pyrite]) figure(ores, `${ore.name} (to compare)`, shown(glyph(ore, 8, 4300 + ore.id), 192, SEDIMENT));
  const play = section('Brine: ores at play size', 'A vein of each in basalt and in sediment, and the loose pieces at their HUD size.');
  for (const ore of brine) {
    figure(play, `${ore.name}, basalt`, vein(ore, BASALT));
    figure(play, `${ore.name}, sediment`, vein(ore, SEDIMENT));
    figure(play, `${ore.name} piece`, shown(piece(ore, 3, 500 + ore.id), PIECE_FRAME, '#e9e1cf'));
  }
  const skyRow = section('Brine: sky and sea horizon', 'The lilac sky, the star, Sepia low on the left; the purple sea with three ranges of salt-crusted basalt islands, layered as GameScene places them over the island\'s surface (grey). Then the two seams: each layer tiled, its seam in the middle of the crop.');
  const wide = Math.min(1500, window.innerWidth - 60);
  for (const [label, sx, rx] of [['left of the sky (Sepia)', 0, 0], ['the star', 1150, 1700]] as const) {
    const c = scene(360, 1400, sx, rx);
    c.style.width = `${wide}px`;
    figure(skyRow, label, c);
  }
  for (const [label, sx, rx] of [['sky seam', SKY_W - 700, 600], ['ridge seam', 1000, RIDGE_W - 700]] as const) {
    const c = scene(360, 1400, sx, rx);
    c.style.width = `${wide}px`;
    figure(skyRow, label, c);
  }
  const small = scene(240, 1400, 300, 2200);
  small.style.width = `${wide}px`;
  figure(skyRow, 'a lower sky (240)', small);
}
