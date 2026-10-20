import { drawGeckoLines, drawGeckoSkin, GECKO_FRAME, GECKO_MOUTH, GECKO_RES, GECKO_TAIL, type GeckoPose } from '../src/art/geckoArt';
import { makeDraw, type Draw } from '../src/art/kit';
import { drawCharmMark, drawCharmToken, drawMarble, drawSplash, MARBLE_FRAME, MARBLE_R, MARBLE_RES, SPLASH_FRAME, TOKEN_FRAME } from '../src/art/marbleArt';
import { ART_RES, BOIL } from '../src/art/palette';
import { makeCanvas, type Pt } from '../src/art/pen';
import { BURROW_FRAME, drawBranch, drawBurrow, drawGarden, drawTrack, drawWell, WELL_FRAME } from '../src/art/placesArt';
import { CHARMS } from '../src/logic/charms';
import { COLOUR_WASH, COLOURS, type ColourId } from '../src/logic/colours';

// Dev-only sheet for reviewing InkGecko's procedural art, big.
const sheet = document.getElementById('sheet')!;
const params = new URLSearchParams(location.search);
const only = params.get('only');

function section(id: string, title: string): HTMLElement | null {
  if (only && only !== id) return null;
  sheet.append(Object.assign(document.createElement('h2'), { textContent: title }));
  const r = document.createElement('div');
  r.className = 'row';
  sheet.append(r);
  return r;
}

function figure(row: HTMLElement, label: string, w: number, h: number, display: number, draw: (ctx: CanvasRenderingContext2D) => void): HTMLCanvasElement {
  const { canvas, ctx } = makeCanvas(w, h);
  draw(ctx);
  canvas.style.width = `${display}px`;
  canvas.style.height = `${(display * h) / w}px`;
  const fig = document.createElement('figure');
  fig.append(canvas, Object.assign(document.createElement('figcaption'), { textContent: label }));
  row.append(fig);
  return canvas;
}

/** A centred frame of `units` at `res` texture px per unit. */
const framed = (units: number, res: number, draw: (ctx: CanvasRenderingContext2D) => void) => (ctx: CanvasRenderingContext2D): void => {
  ctx.scale(res, res);
  ctx.translate(units / 2, units / 2);
  draw(ctx);
};
const dr = (ctx: CanvasRenderingContext2D, seed: number, f: number): Draw => makeDraw(ctx, seed, f, 0);

/** A drawing baked to its own canvas, as the game bakes a texture. */
function bake(units: number, res: number, draw: (ctx: CanvasRenderingContext2D) => void): HTMLCanvasElement {
  const { canvas, ctx } = makeCanvas(units * res, units * res);
  framed(units, res, draw)(ctx);
  return canvas;
}

/** The skin tinted as Phaser does (multiply), keeping the skin's own alpha. */
function tinted(skin: HTMLCanvasElement, colour: string): HTMLCanvasElement {
  const { canvas, ctx } = makeCanvas(skin.width, skin.height);
  ctx.drawImage(skin, 0, 0);
  ctx.globalCompositeOperation = 'multiply';
  ctx.fillStyle = colour;
  ctx.fillRect(0, 0, skin.width, skin.height);
  ctx.globalCompositeOperation = 'destination-in';
  ctx.drawImage(skin, 0, 0);
  return canvas;
}

function gecko(pose: GeckoPose, f: number, colour: ColourId | null): HTMLCanvasElement {
  const skin = bake(GECKO_FRAME, GECKO_RES, (ctx) => drawGeckoSkin(dr(ctx, 50 + f, f), pose));
  const lines = bake(GECKO_FRAME, GECKO_RES, (ctx) => drawGeckoLines(dr(ctx, 60 + f, f), pose));
  const { canvas, ctx } = makeCanvas(skin.width, skin.height);
  ctx.drawImage(colour ? tinted(skin, COLOUR_WASH[colour]) : skin, 0, 0);
  ctx.drawImage(lines, 0, 0);
  return canvas;
}

/** A gecko with its loaded marble in its mouth and the next one in its tail, as in game. */
function loadedGecko(ctx: CanvasRenderingContext2D, colour: ColourId, next: ColourId, f: number, pose: GeckoPose = 'idle'): void {
  const g = gecko(pose, f, colour);
  ctx.save();
  ctx.scale(1 / GECKO_RES, 1 / GECKO_RES);
  ctx.drawImage(g, -g.width / 2, -g.height / 2);
  ctx.restore();
  const marble = (c: ColourId, at: Pt, k: number): void => {
    const m = bake(MARBLE_FRAME, MARBLE_RES, (mc) => drawMarble(dr(mc, 7, f), c));
    ctx.save();
    ctx.translate(at.x, at.y);
    ctx.scale(k / MARBLE_RES, k / MARBLE_RES);
    ctx.drawImage(m, -m.width / 2, -m.height / 2);
    ctx.restore();
  };
  marble(next, GECKO_TAIL, 0.6);
  if (pose === 'idle') marble(colour, GECKO_MOUTH, 1);
}

// Marbles, every colour and boil frame, big; then at game size.
const marbles = section('marbles', 'marbles: each colour, boil frames 0–2, and rotated');
if (marbles) for (const c of COLOURS) {
  for (let f = 0; f < BOIL; f++) figure(marbles, `${c} f${f}`, MARBLE_FRAME * MARBLE_RES, MARBLE_FRAME * MARBLE_RES, 120, framed(MARBLE_FRAME, MARBLE_RES, (ctx) => drawMarble(dr(ctx, 10 + f, f), c)));
  figure(marbles, `${c} turned`, MARBLE_FRAME * MARBLE_RES, MARBLE_FRAME * MARBLE_RES, 120, framed(MARBLE_FRAME, MARBLE_RES, (ctx) => {
    ctx.rotate(2.2);
    drawMarble(dr(ctx, 10, 0), c);
  }));
}
const small = section('marbles', 'marbles at game size (~18 css px) in a line');
if (small) for (const scale of [18, 26]) {
  figure(small, `${scale}px`, 9 * MARBLE_FRAME * MARBLE_RES, MARBLE_FRAME * MARBLE_RES, (9 * MARBLE_FRAME * scale) / (MARBLE_R * 2), (ctx) => {
    ctx.scale(MARBLE_RES, MARBLE_RES);
    [...COLOURS, 'red', 'blue', 'teal'].forEach((c, i) => {
      ctx.save();
      ctx.translate(MARBLE_FRAME / 2 + i * MARBLE_FRAME, MARBLE_FRAME / 2);
      ctx.rotate(i * 1.3);
      drawMarble(dr(ctx, 10 + i, i % 3), c as ColourId);
      ctx.restore();
    });
  });
}

const charms = section('charms', 'charm marks on marbles');
if (charms) CHARMS.forEach((charm, k) => {
  for (const c of COLOURS) figure(charms, `${charm} on ${c}`, MARBLE_FRAME * MARBLE_RES, MARBLE_FRAME * MARBLE_RES, 90, framed(MARBLE_FRAME, MARBLE_RES, (ctx) => {
    drawMarble(dr(ctx, 20 + k, 0), c);
    drawCharmMark(dr(ctx, 30 + k, 0), charm);
  }));
});

const tokens = section('charms', 'charm tokens (rail levels), boil frames');
if (tokens) for (const charm of CHARMS) {
  for (let f = 0; f < BOIL; f++) figure(tokens, `${charm} f${f}`, TOKEN_FRAME * 4, TOKEN_FRAME * 4, 120, framed(TOKEN_FRAME, 4, (ctx) => drawCharmToken(dr(ctx, 40 + f, f), charm)));
}

const splashes = section('splashes', 'splashes');
if (splashes) for (const c of COLOURS) {
  for (let f = 0; f < 2; f++) figure(splashes, `${c} f${f}`, SPLASH_FRAME * 3, SPLASH_FRAME * 3, 150, framed(SPLASH_FRAME, 3, (ctx) => drawSplash(dr(ctx, 70 + f, f), c)));
}

const geckos = section('gecko', 'gecko: idle and spit, boil frames, untinted');
if (geckos) for (const pose of ['idle', 'spit'] as const) {
  for (let f = 0; f < BOIL; f++) figure(geckos, `${pose} f${f}`, GECKO_FRAME * GECKO_RES, GECKO_FRAME * GECKO_RES, 300, (ctx) => ctx.drawImage(gecko(pose, f, null), 0, 0));
}
const loaded = section('gecko', 'gecko tinted in each colour, loaded (marble in mouth, next in tail)');
if (loaded) COLOURS.forEach((c, i) => {
  figure(loaded, c, GECKO_FRAME * GECKO_RES, GECKO_FRAME * GECKO_RES, 300, (ctx) => {
    ctx.scale(GECKO_RES, GECKO_RES);
    ctx.translate(GECKO_FRAME / 2, GECKO_FRAME / 2);
    loadedGecko(ctx, c, COLOURS[(i + 2) % COLOURS.length]!, i % 3);
  });
});
const spits = section('gecko', 'gecko tinted, spitting');
if (spits) COLOURS.slice(0, 3).forEach((c, i) => {
  figure(spits, c, GECKO_FRAME * GECKO_RES, GECKO_FRAME * GECKO_RES, 300, (ctx) => {
    ctx.scale(GECKO_RES, GECKO_RES);
    ctx.translate(GECKO_FRAME / 2, GECKO_FRAME / 2);
    loadedGecko(ctx, c, COLOURS[(i + 3) % COLOURS.length]!, i, 'spit');
  });
});

const places = section('places', 'well, burrow, branch');
if (places) {
  for (let f = 0; f < 2; f++) figure(places, `well f${f}`, WELL_FRAME * 3, WELL_FRAME * 3, 280, framed(WELL_FRAME, 3, (ctx) => drawWell(dr(ctx, 80 + f, f))));
  for (let f = 0; f < 2; f++) figure(places, `burrow f${f}`, BURROW_FRAME * 3, BURROW_FRAME * 3, 200, framed(BURROW_FRAME, 3, (ctx) => drawBurrow(dr(ctx, 90 + f, f))));
  figure(places, 'branch', 700 * 2, 90 * 2, 700, (ctx) => {
    ctx.scale(2, 2);
    drawBranch(dr(ctx, 95, 0), 10, 690, 40);
  });
}

/** A spiral path from an outer start into the middle, resampled every 4 units. */
function spiral(w: number, h: number): Pt[] {
  const raw: Pt[] = [];
  for (let t = 0; t <= 1; t += 0.0005) {
    const ang = Math.PI * 0.9 + t * Math.PI * 2.7;
    const r = 310 - 215 * t;
    raw.push({ x: w / 2 + Math.cos(ang) * r * 1.65, y: h / 2 + Math.sin(ang) * r });
  }
  const out: Pt[] = [raw[0]!];
  let acc = 0;
  for (let i = 1; i < raw.length; i++) {
    acc += Math.hypot(raw[i]!.x - raw[i - 1]!.x, raw[i]!.y - raw[i - 1]!.y);
    if (acc >= 4) {
      out.push(raw[i]!);
      acc = 0;
    }
  }
  return out;
}

const board = section('board', 'board: garden, spiral track, burrow, well, gecko (ART_RES)');
if (board) {
  const W = 1280;
  const H = 720;
  const times: string[] = [];
  const canvas = figure(board, '', W * ART_RES, H * ART_RES, W, (ctx) => {
    ctx.scale(ART_RES, ART_RES);
    let t = performance.now();
    drawGarden(dr(ctx, 100, 0), W, H);
    times.push(`garden ${(performance.now() - t).toFixed(0)} ms`);
    const pts = spiral(W, H);
    t = performance.now();
    drawTrack(dr(ctx, 101, 0), pts);
    times.push(`track (${(pts.length * 4).toFixed(0)} units) ${(performance.now() - t).toFixed(0)} ms`);
    const place = (at: Pt, draw: (c: CanvasRenderingContext2D) => void): void => {
      ctx.save();
      ctx.translate(at.x, at.y);
      draw(ctx);
      ctx.restore();
    };
    place(pts[0]!, (c) => drawBurrow(dr(c, 102, 0)));
    place(pts[pts.length - 1]!, (c) => drawWell(dr(c, 103, 0)));
    // A line of marbles along the first stretch.
    for (let i = 0; i < 14; i++) {
      const p = pts[Math.min(pts.length - 1, 20 + i * 8)]!;
      place(p, (c) => {
        c.rotate(i * 0.9);
        drawMarble(dr(c, 110 + i, 0), COLOURS[(i * 5 + (i >> 1)) % 4]!);
      });
    }
    place({ x: W / 2 + 40, y: H / 2 + 30 }, (c) => loadedGecko(c, 'blue', 'yellow', 0));
  });
  canvas.parentElement!.querySelector('figcaption')!.textContent = times.join(' · ');
}

/** A long knot of a path with tight bends that crosses itself, resampled every 4 units. */
function knot(w: number, h: number): Pt[] {
  const raw: Pt[] = [];
  for (let t = 0; t <= 1; t += 0.0002) {
    const a = t * Math.PI * 2;
    raw.push({ x: w / 2 + Math.sin(a * 3 + 0.4) * 470 + Math.sin(a * 11) * 40, y: h / 2 + Math.sin(a * 2) * 250 + Math.cos(a * 13) * 25 });
  }
  const out: Pt[] = [raw[0]!];
  let acc = 0;
  for (let i = 1; i < raw.length; i++) {
    acc += Math.hypot(raw[i]!.x - raw[i - 1]!.x, raw[i]!.y - raw[i - 1]!.y);
    if (acc >= 4) {
      out.push(raw[i]!);
      acc = 0;
    }
  }
  return out;
}

const stress = section('stress', 'stress: a long self-crossing track with tight bends');
if (stress) {
  const W = 1280;
  const H = 720;
  const times: string[] = [];
  const canvas = figure(stress, '', W * ART_RES, H * ART_RES, W, (ctx) => {
    ctx.scale(ART_RES, ART_RES);
    drawGarden(dr(ctx, 100, 0), W, H);
    const pts = knot(W, H);
    const t = performance.now();
    drawTrack(dr(ctx, 101, 0), pts);
    times.push(`track (${pts.length * 4} units) ${(performance.now() - t).toFixed(0)} ms`);
  });
  canvas.parentElement!.querySelector('figcaption')!.textContent = times.join(' · ');
}
