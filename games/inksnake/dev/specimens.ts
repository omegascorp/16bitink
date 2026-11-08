import { CRITTER_ART, type CritterKind } from '../src/art/critters/index';
import { makeDraw } from '../src/art/kit';
import { BOIL } from '../src/art/palette';
import { makeCanvas } from '../src/art/pen';
import { placeArt } from '../src/art/places/index';
import { snakeArt } from '../src/art/snakes/index';
import { SNAKE_W, stripLength, type SpriteArt } from '../src/art/types';
import { CHAPTER_1 } from '../src/level/chapter1';
/// <reference types="vite/client" />
import type { LevelDef } from '../src/level/types';
import { BOARD, type Place } from '../src/level/types';
import { SNAKES } from '../src/logic/species';
import { RIVAL_ART } from '../src/art/chapters/index';

/**
 * Dev-only sheet for reviewing InkSnake's procedural art, big.
 * ?only=snake|critters|boards, &kind=<critter or snake id>, &level=<level id>, &chapter=<n> (boards), &scale=<display px per board px>.
 */
const sheet = document.getElementById('sheet')!;
const params = new URLSearchParams(location.search);
const only = params.get('only');
const kind = params.get('kind');
const scale = Number(params.get('scale') ?? 3);

function section(id: string, title: string): HTMLElement | null {
  if (only && only !== id) return null;
  sheet.append(Object.assign(document.createElement('h2'), { textContent: title }));
  const r = document.createElement('div');
  r.className = 'row';
  sheet.append(r);
  return r;
}

function show(row: HTMLElement, label: string, canvas: HTMLCanvasElement, w: number, h: number): void {
  canvas.style.width = `${w}px`;
  canvas.style.height = `${h}px`;
  const fig = document.createElement('figure');
  fig.append(canvas, Object.assign(document.createElement('figcaption'), { textContent: label }));
  row.append(fig);
}

/** A sprite pose baked as the game bakes it: a square frame at its res, origin at the centre. */
function bakeSprite(art: SpriteArt, pose: string, f: number, seed: number): HTMLCanvasElement {
  const { canvas, ctx } = makeCanvas(art.frame * art.res, art.frame * art.res);
  ctx.scale(art.res, art.res);
  ctx.translate(art.frame / 2, art.frame / 2);
  art.draw(makeDraw(ctx, seed + f, f, 0), pose);
  return canvas;
}

function critters(): void {
  for (const k of Object.keys(CRITTER_ART) as CritterKind[]) {
    if (kind && kind !== k) continue;
    const row = section('critters', k);
    if (!row) return;
    const art = CRITTER_ART[k] as SpriteArt;
    art.poses.forEach((pose, i) => {
      for (let f = 0; f < (kind ? BOIL : 1); f++) show(row, `${pose} ${f}`, bakeSprite(art, pose, f, 100 + i * 10), art.frame * scale, art.frame * scale);
    });
  }
}

/** The body strip baked, then laid along a winding curve the way the game's mesh lays it. */
function snakes(): void {
  for (const id of [...(SNAKES as readonly string[]), ...Object.keys(RIVAL_ART)]) {
    if (kind ? kind !== id : id !== 'corn') continue;
    const row = section('snake', id);
    if (!row) return;
    const art = snakeArt(id);
    const res = 3;
    const len = stripLength(art.period);
    const strip = makeCanvas(len * res, SNAKE_W * res);
    strip.ctx.scale(res, res);
    art.drawStrip(makeDraw(strip.ctx, 11, 0, 0), len);
    show(row, `strip (period ${art.period}, ${len} long)`, strip.canvas, len * scale, SNAKE_W * scale);
    if (art.drawBelly) {
      const belly = makeCanvas(len * res, SNAKE_W * res);
      belly.ctx.scale(res, res);
      art.drawBelly(makeDraw(belly.ctx, 13, 0, 0), len);
      show(row, 'belly', belly.canvas, len * scale, SNAKE_W * scale);
    }
    art.head.poses.forEach((pose, i) => show(row, `head ${pose}`, bakeSprite(art.head, pose, 0, 300 + i), art.head.frame * scale, art.head.frame * scale));
    show(row, 'tongue', bakeSprite(art.tongue, 'flick', 0, 400), art.tongue.frame * scale, art.tongue.frame * scale);
    show(row, 'laid along a curve, with the head', curved(art, strip.canvas, res), 900, 420);
  }
}

/** Draws the strip in thin slices along a sine curve (period wrapping as the game wraps it), tapering to the tail, then the head. */
function curved(art: ReturnType<typeof snakeArt>, strip: HTMLCanvasElement, res: number): HTMLCanvasElement {
  const W = 900;
  const H = 420;
  const { canvas, ctx } = makeCanvas(W * 2, H * 2);
  ctx.scale(2, 2);
  ctx.fillStyle = '#e9e2cc';
  ctx.fillRect(0, 0, W, H);
  const width = 22;
  const k = width / SNAKE_W;
  const at = (s: number): { x: number; y: number; a: number } => {
    const x = 760 - s * 0.82;
    const y = H / 2 + Math.sin(s / 70) * 110;
    const dx = -0.82;
    const dy = (Math.cos(s / 70) * 110) / 70;
    return { x, y, a: Math.atan2(dy, dx) + Math.PI };
  };
  const total = 760;
  const step = 2;
  for (let s = total; s >= 0; s -= step) {
    const p = at(s);
    const taper = s > total * 0.72 ? Math.max(0.12, 1 - (s - total * 0.72) / (total * 0.28)) : 1;
    const u = (s / k) % art.period;
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.a);
    ctx.scale(-1, 1);
    ctx.drawImage(strip, u * res, 0, (step / k + 0.6) * res, SNAKE_W * res, 0, (-width * taper) / 2, step + 0.4, width * taper);
    ctx.restore();
  }
  const head = bakeSprite(art.head, 'shut', 0, 300);
  const p0 = at(0);
  ctx.save();
  ctx.translate(p0.x, p0.y);
  ctx.rotate(p0.a);
  const hs = art.head.frame * k;
  ctx.drawImage(head, -hs / 2, -hs / 2, hs, hs);
  ctx.restore();
  return canvas;
}

/** Every chapter file there is (built or still being built), by its number: chapter2.ts → 2. */
const CHAPTER_FILES: Readonly<Record<number, readonly LevelDef[]>> = Object.fromEntries(
  Object.entries(import.meta.glob<Record<string, readonly LevelDef[]>>('../src/level/chapter*.ts', { eager: true }))
    .map(([f, m]) => [Number(f.replace(/^.*chapter(\d+)\.ts$/, '$1')), Object.values(m).find(Array.isArray) ?? []]),
);

/** Each level's board as the game paints it: ground, solid things, nests, then the cover on top. */
function boards(): void {
  const want = params.get('level');
  const row = section('boards', 'boards');
  if (!row) return;
  const n = Number(params.get('chapter') ?? 1);
  const chapter = n <= 1 ? CHAPTER_1 : CHAPTER_FILES[n] ?? [];
  const all = [CHAPTER_1, ...Object.values(CHAPTER_FILES)].flat();
  for (const level of want ? all : chapter) {
    if (want && want !== level.id) continue;
    // The place from the level's id ('barrens-3'): paid chapters aren't installed on this page.
    const art = placeArt((level.id.split('-')[0] ?? 'farm') as Place);
    const res = want ? 1.5 : 0.6;
    const { canvas, ctx } = makeCanvas(BOARD.w * res, BOARD.h * res);
    ctx.scale(res, res);
    art.ground(makeDraw(ctx, 600, 0, 0), level);
    (level.nests ?? []).forEach((n, i) => art.nest(makeDraw(ctx, 640 + i, 0, 0), n));
    (level.solids ?? []).forEach((s, i) => art.solid(makeDraw(ctx, 700 + i, 0, 0), s));
    // Zones are part of the ground's painting; outline them faintly here so a place's painter can be checked against them.
    ctx.save();
    ctx.strokeStyle = 'rgba(179,50,43,0.5)';
    ctx.setLineDash([6, 6]);
    for (const z of level.zones ?? []) {
      ctx.beginPath();
      if (z.shape === 'circle') ctx.arc(z.x, z.y, z.r, 0, Math.PI * 2);
      else if (z.shape === 'rect') ctx.rect(z.x, z.y, z.w, z.h);
      else z.points.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
      ctx.closePath();
      if (params.get('zones') === '1') ctx.stroke();
    }
    ctx.restore();
    (level.cover ?? []).forEach((c, i) => art.cover(makeDraw(ctx, 800 + i, 0, 0), c));
    show(row, `${level.id} · ${level.name}`, canvas, BOARD.w * (want ? 1 : 0.5), BOARD.h * (want ? 1 : 0.5));
  }
}

snakes();
critters();
boards();
