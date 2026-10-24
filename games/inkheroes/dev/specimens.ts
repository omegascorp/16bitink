import { CREATURE_ART } from '../src/art/creatures';
import { CREATURE_RES, FRAME_H, FRAME_W, GROUND_Y } from '../src/art/creatures/types';
import { makeCanvas } from '../src/art/pen';
import { CREATURE_IDS, type CreatureId } from '../src/logic/creatures';

// Dev-only sheet for reviewing InkHeroes' procedural art.
//   /specimens.html                    every creature, big, three boil frames, and a battle-sized pair
//   /specimens.html?only=wolf,ogre     just those
const sheet = document.getElementById('sheet')!;
const params = new URLSearchParams(location.search);
const only = params.get('only')?.split(',') ?? null;
const big = Number(params.get('size') ?? 300);

function row(title: string): HTMLElement {
  sheet.append(Object.assign(document.createElement('h2'), { textContent: title }));
  const r = document.createElement('div');
  r.className = 'row';
  sheet.append(r);
  return r;
}

function creatureCanvas(id: CreatureId, f: number, display: number, flip = false): HTMLCanvasElement {
  const { canvas, ctx } = makeCanvas(FRAME_W * CREATURE_RES, FRAME_H * CREATURE_RES);
  ctx.scale(CREATURE_RES, CREATURE_RES);
  if (flip) {
    ctx.translate(FRAME_W, 0);
    ctx.scale(-1, 1);
  }
  ctx.translate(FRAME_W / 2, GROUND_Y);
  CREATURE_ART[id](ctx, 101, f);
  canvas.style.width = `${display}px`;
  canvas.style.height = `${(display * FRAME_H) / FRAME_W}px`;
  return canvas;
}

function figure(r: HTMLElement, label: string, c: HTMLCanvasElement): void {
  const fig = document.createElement('figure');
  fig.append(c, Object.assign(document.createElement('figcaption'), { textContent: label }));
  r.append(fig);
}

const ids = CREATURE_IDS.filter((id) => !only || only.includes(id));
for (const id of ids) {
  const r = row(id);
  for (let f = 0; f < 3; f++) figure(r, `frame ${f}`, creatureCanvas(id, f, big));
  figure(r, 'battle size', creatureCanvas(id, 0, 96));
  figure(r, 'facing left', creatureCanvas(id, 0, 96, true));
  figure(r, 'map size', creatureCanvas(id, 0, 48));
}

if (!only || only.includes('hero')) {
  const { drawHero } = await import('../src/art/heroArt');
  const { BANNER } = await import('../src/art/palette');
  const r = row('hero');
  const heroCanvas = (f: number, display: number, banner: string, flip = false): HTMLCanvasElement => {
    const { canvas, ctx } = makeCanvas(FRAME_W * CREATURE_RES, FRAME_H * CREATURE_RES);
    ctx.scale(CREATURE_RES, CREATURE_RES);
    if (flip) {
      ctx.translate(FRAME_W, 0);
      ctx.scale(-1, 1);
    }
    ctx.translate(FRAME_W / 2, GROUND_Y);
    drawHero(ctx, 101, f, banner);
    canvas.style.width = `${display}px`;
    canvas.style.height = `${(display * FRAME_H) / FRAME_W}px`;
    return canvas;
  };
  for (let f = 0; f < 3; f++) figure(r, `frame ${f}`, heroCanvas(f, big, BANNER.player));
  figure(r, 'rival', heroCanvas(0, big, BANNER.rival));
  figure(r, 'map size', heroCanvas(0, 64, BANNER.player));
  figure(r, 'facing left', heroCanvas(0, 96, BANNER.player, true));
}

if (only?.includes('map')) {
  const { paintChunk, CHUNK, TILE } = await import('../src/art/terrain');
  const { gridOf } = await import('../src/logic/adventure');
  const { MAPS } = await import('../src/level/maps');
  const def = MAPS.find((m) => m.id === (params.get('map') ?? MAPS[0]!.id))!;
  const g = gridOf(def);
  const scale = Number(params.get('scale') ?? 0.75);
  const r = row(`map: ${def.name}`);
  const { canvas, ctx } = makeCanvas(Math.ceil(g.w * TILE * scale), Math.ceil(g.h * TILE * scale));
  for (let cy = 0; cy * CHUNK < g.h; cy++) {
    for (let cx = 0; cx * CHUNK < g.w; cx++) {
      ctx.save();
      ctx.scale(scale, scale);
      ctx.translate(cx * CHUNK * TILE, cy * CHUNK * TILE);
      ctx.beginPath();
      ctx.rect(0, 0, CHUNK * TILE, CHUNK * TILE);
      ctx.clip();
      paintChunk(ctx, g, cx, cy);
      ctx.restore();
    }
  }
  figure(r, def.id, canvas);
}

if (!only || only.includes('sites')) {
  const { SITE_ART, SITE_ARTS, drawResourceIcon, drawFlag } = await import('../src/art/sites');
  const { frameFor, SITE_RES } = await import('../src/art/sites/types');
  const { RESOURCES } = await import('../src/logic/resources');
  const { BANNER } = await import('../src/art/palette');
  const zoom = Number(params.get('zoom') ?? 2);
  const r = row('sites');
  for (const art of SITE_ARTS) {
    const fr = frameFor(art);
    const { canvas, ctx } = makeCanvas(fr.w * SITE_RES, fr.h * SITE_RES);
    ctx.scale(SITE_RES, SITE_RES);
    // A patch of map ground behind, so sites are judged where they'll stand.
    ctx.fillStyle = '#b9c98f';
    ctx.fillRect(0, 0, fr.w, fr.h);
    ctx.strokeStyle = 'rgba(35,42,79,0.25)';
    ctx.strokeRect(fr.ox - 24, fr.oy - 48, 48, 48);
    ctx.translate(fr.ox, fr.oy);
    SITE_ART[art](ctx, 101, 0);
    canvas.style.width = `${fr.w * zoom}px`;
    figure(r, art, canvas);
  }
  const icons = row('resource icons and flags');
  for (const res of RESOURCES) {
    const { canvas, ctx } = makeCanvas(32 * 4, 32 * 4);
    ctx.scale(4, 4);
    ctx.translate(16, 16);
    drawResourceIcon(ctx, res, 7);
    canvas.style.width = '64px';
    figure(icons, res, canvas);
  }
  for (const [name, color] of Object.entries(BANNER)) {
    const { canvas, ctx } = makeCanvas(32 * 4, 32 * 4);
    ctx.scale(4, 4);
    ctx.translate(12, 28);
    drawFlag(ctx, color, 7, 0);
    canvas.style.width = '64px';
    figure(icons, `flag ${name}`, canvas);
  }
}

// Last: the snap script waits for this.
(window as unknown as { __ready: boolean }).__ready = true;
