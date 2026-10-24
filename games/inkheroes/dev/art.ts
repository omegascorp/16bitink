import { makeCanvas } from '../src/art/pen';
import { drawTitle, drawVignette, drawVista, MENU_RES, TITLE, VIGNETTE, VIGNETTE_IDS, VISTA } from '../src/art/menu';
import { drawTownGround, TOWN_ART, townPieces } from '../src/art/townscape';
import { PIECE_SLOT, SLOTS, TOWN_PIECES, TOWN_RES, TOWN_VIEW, type TownPiece } from '../src/art/townscape/types';
import { BUILDING_IDS, type BuildingId } from '../src/logic/buildings';

// Dev-only sheet for the town screen's and the menu's paintings.
//   /art.html?town=start            the townscape as map 1 starts (also: all, none, or building ids: fort,tavern)
//   /art.html?pieces=tavern,guild-1 those buildings alone, big, on their frames (pieces=all for every one)
//   /art.html?menu=vista            the menu's vista (also: title, vignettes, all)
//   &zoom=1.5                       display scale (default 1 for town/vista, 2 for pieces)
await document.fonts.load('32px Caveat').catch(() => undefined);
const sheet = document.getElementById('sheet')!;
const params = new URLSearchParams(location.search);
const zoom = params.get('zoom');

function row(title: string): HTMLElement {
  sheet.append(Object.assign(document.createElement('h2'), { textContent: title }));
  const r = document.createElement('div');
  r.className = 'row';
  sheet.append(r);
  return r;
}

function figure(r: HTMLElement, label: string, c: HTMLCanvasElement, width: number): void {
  c.style.width = `${width}px`;
  const fig = document.createElement('figure');
  fig.append(c, Object.assign(document.createElement('figcaption'), { textContent: label }));
  r.append(fig);
}

const START: BuildingId[] = ['villageHall', 'fort', 'tavern', 'guardhouse'];
const town = params.get('town');
if (town) {
  const built: BuildingId[] = town === 'start' ? START : town === 'all' ? [...BUILDING_IDS] : town === 'none' ? [] : (town.split(',') as BuildingId[]);
  const { canvas, ctx } = makeCanvas(TOWN_VIEW.w * TOWN_RES, TOWN_VIEW.h * TOWN_RES);
  ctx.scale(TOWN_RES, TOWN_RES);
  drawTownGround(ctx, 7);
  for (const { piece } of townPieces(built)) {
    const s = SLOTS[PIECE_SLOT[piece]];
    ctx.save();
    ctx.translate(s.x, s.y);
    TOWN_ART[piece](ctx, 500 + TOWN_PIECES.indexOf(piece) * 11);
    ctx.restore();
  }
  figure(row(`town: ${town}`), built.join(', '), canvas, TOWN_VIEW.w * Number(zoom ?? 1));
}

const pieces = params.get('pieces');
if (pieces) {
  const list = pieces === 'all' ? TOWN_PIECES : (pieces.split(',') as TownPiece[]);
  const r = row('pieces');
  for (const piece of list) {
    const fr = SLOTS[PIECE_SLOT[piece]].frame;
    const { canvas, ctx } = makeCanvas(fr.w * TOWN_RES, fr.h * TOWN_RES);
    ctx.scale(TOWN_RES, TOWN_RES);
    ctx.fillStyle = '#b9c98f';
    ctx.fillRect(0, 0, fr.w, fr.h);
    ctx.strokeStyle = 'rgba(35,42,79,0.3)';
    ctx.strokeRect(0.5, 0.5, fr.w - 1, fr.h - 1);
    ctx.beginPath();
    ctx.moveTo(0, fr.oy);
    ctx.lineTo(fr.w, fr.oy);
    ctx.stroke();
    ctx.translate(fr.ox, fr.oy);
    TOWN_ART[piece](ctx, 500 + TOWN_PIECES.indexOf(piece) * 11);
    figure(r, piece, canvas, fr.w * Number(zoom ?? 2));
  }
}

const menu = params.get('menu');
if (menu) {
  const show = (what: string): boolean => menu === 'all' || menu === what;
  const bake = (w: number, h: number, paint: (ctx: CanvasRenderingContext2D) => void): HTMLCanvasElement => {
    const { canvas, ctx } = makeCanvas(w * MENU_RES, h * MENU_RES);
    ctx.scale(MENU_RES, MENU_RES);
    paint(ctx);
    return canvas;
  };
  if (show('vista')) figure(row('vista'), `${VISTA.w} × ${VISTA.h}`, bake(VISTA.w, VISTA.h, (ctx) => drawVista(ctx, 11)), VISTA.w * Number(zoom ?? 0.75));
  if (show('title')) figure(row('title'), 'title', bake(TITLE.w, TITLE.h, (ctx) => drawTitle(ctx, 13)), TITLE.w * Number(zoom ?? 1));
  if (show('vignettes')) {
    const r = row('vignettes');
    VIGNETTE_IDS.forEach((id, i) => figure(r, id, bake(VIGNETTE.w, VIGNETTE.h, (ctx) => drawVignette(ctx, id, 17 + i)), VIGNETTE.w * Number(zoom ?? 2)));
  }
}

// Last: the snap script waits for this.
(window as unknown as { __ready: boolean }).__ready = true;
