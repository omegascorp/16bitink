import { drawGeckoLines, drawGeckoSkin, GECKO_FRAME, GECKO_MOUTH, GECKO_RES, GECKO_TAIL, type GeckoPose } from '../src/art/geckoArt';
import { DRAGONFLY_FRAME, drawDragonfly } from '../src/art/dragonflyArt';
import { drawBloom, drawBud, drawFruit, drawGeode, drawStone, FRUIT_FRAME, FRUITS } from '../src/art/propsArt';
import { drawHedgehog, drawRainSplash, drawRainStreak, drawSheen, drawSheenRing, drawTwineCord, drawTwineKnot, HEDGEHOG_FRAME, HEDGEHOG_RES, RAIN_SPLASH_FRAME, RAIN_STREAK_FRAME, TWINE_CORD_FRAME, TWINE_CORD_W } from '../src/art/propsFarm';
import { makeDraw, type Draw } from '../src/art/kit';
import { drawCharmMark, drawCharmToken, drawMarble, drawSplash, MARBLE_FRAME, MARBLE_R, MARBLE_RES, SPLASH_FRAME, TOKEN_FRAME } from '../src/art/marbleArt';
import { ART_RES, BOIL } from '../src/art/palette';
import { makeCanvas, type Pt } from '../src/art/pen';
import { BURROW_FRAME, drawBranch, drawBurrow, drawGarden, drawGround, drawLilyPad, drawPad, drawPadRing, drawPond, drawRaised, drawTrack, drawTunnel, drawWell, PAD_R, WELL_FRAME } from '../src/art/placesArt';
import type { Place } from '../src/level/levels';
import { BLOOMS, bloom, butterfly } from '../src/art/meadowFlora';
import { bench, fencePost, molehill, stile } from '../src/art/meadowThings';
import { drawGardenLantern, GARDEN_LANTERN_FRAME } from '../src/art/nightLantern';
import { brokenColumn } from '../src/art/ruinsParts';
import { createRng } from '../src/logic/rng';
import { CHAPTER_3 } from '../src/level/chapter3';
import { CHAPTER_4 } from '../src/level/chapter4';
import { CHAPTER_5 } from '../src/level/chapter5';
import { CHAPTER_6 } from '../src/level/chapter6';
import { gardenFork, harvestTrug, hoseCoil, scarecrow, upturnedBarrow, waterButt } from '../src/art/allotmentThings';
import { beanRow, cabbage, carrotTop, leek, lettuce, marigold, seedling } from '../src/art/allotmentCrops';
import { KEEP_NOTHING, type PondKeep, pondReach } from '../src/art/pond';
import { CHAPTER_2 } from '../src/level/chapter2';
import { line, spiral as spiralOf } from '../src/level/shapes';
import { buildPath, crossings, type Path } from '../src/logic/path';
import { CHARMS, type CharmId } from '../src/logic/charms';
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

/** The stretch of a path between distances s0 and s1, every ~4 units. */
const stretch = (p: Path, s0: number, s1: number): Pt[] => p.pts.filter((_, i) => p.cum[i]! >= s0 && p.cum[i]! <= s1);

const pond = section('pond', 'pond: ground, a track with a log (straight) and a footbridge (curve) over marbles, lily pads with the gecko (ART_RES)');
if (pond) {
  const W = 1280;
  const H = 720;
  const times: string[] = [];
  const canvas = figure(pond, '', W * ART_RES, H * ART_RES, W, (ctx) => {
    ctx.scale(ART_RES, ART_RES);
    const path = buildPath([...line({ x: 1310, y: 110 }, { x: 760, y: 110 }, 4), ...spiralOf(560, 400, 290, 150, 1.15, -Math.PI / 2 - 0.25, -1, 1.7, 1)]);
    const pads: Pt[] = [{ x: 470, y: 430 }, { x: 690, y: 370 }];
    let t = performance.now();
    drawPond(dr(ctx, 200, 0), W, H, { grooves: [path.pts], pads });
    times.push(`pond ${(performance.now() - t).toFixed(0)} ms`);
    drawTrack(dr(ctx, 201, 0), path.pts);
    pads.forEach((p, i) => drawLilyPad(dr(ctx, 210 + i, 0), p.x, p.y, PAD_R));
    drawPadRing(dr(ctx, 215, 0), pads[1]!.x, pads[1]!.y, PAD_R);
    const place = (at: Pt, draw: (c: CanvasRenderingContext2D) => void): void => {
      ctx.save();
      ctx.translate(at.x, at.y);
      draw(ctx);
      ctx.restore();
    };
    place(path.pts[path.pts.length - 1]!, (c) => drawWell(dr(c, 203, 0)));
    for (let i = 0; i < 60; i++) {
      const p = path.pts[Math.min(path.pts.length - 1, 30 + i * 8)]!;
      place(p, (c) => {
        c.rotate(i * 0.9);
        drawMarble(dr(c, 220 + i, 0), COLOURS[(i * 5 + (i >> 1)) % 4]!);
      });
    }
    place(pads[0]!, (c) => loadedGecko(c, 'teal', 'red', 0));
    // The tunnels, on their own transparent layer above the marbles.
    const layer = makeCanvas(W * ART_RES, H * ART_RES);
    layer.ctx.scale(ART_RES, ART_RES);
    t = performance.now();
    drawTunnel(dr(layer.ctx, 230, 0), stretch(path, 150, 380));
    drawTunnel(dr(layer.ctx, 231, 0), stretch(path, 1000, 1260));
    times.push(`tunnels ${(performance.now() - t).toFixed(0)} ms`);
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(layer.canvas, 0, 0);
    ctx.restore();
  });
  canvas.parentElement!.querySelector('figcaption')!.textContent = times.join(' · ');
}

const pondParts = section('pond-parts', 'pond parts: lily pad seat, hop ring, tunnels close up (log, bridge on a tight curve)');
if (pondParts) {
  figure(pondParts, 'lily pad in its pool, gecko on it', 220 * 3, 220 * 3, 440, framed(220, 3, (ctx) => {
    ctx.translate(-110, -110);
    drawPond(dr(ctx, 200, 0), 1280, 720, KEEP_NOTHING);
    drawLilyPad(dr(ctx, 240, 0), 110, 110, PAD_R);
    ctx.translate(110, 110);
    loadedGecko(ctx, 'yellow', 'purple', 1);
  }));
  figure(pondParts, 'pad on open water + ring', 220 * 3, 220 * 3, 440, framed(220, 3, (ctx) => {
    ctx.translate(-1200 + 40, -650 + 40);
    drawPond(dr(ctx, 200, 0), 1280, 720, KEEP_NOTHING);
    drawLilyPad(dr(ctx, 241, 0), 1200, 650, PAD_R, false);
    drawPadRing(dr(ctx, 242, 0), 1200, 650, PAD_R);
  }));
  const close = (label: string, pts: Pt[]): void => {
    figure(pondParts, label, 360 * 2, 260 * 2, 540, (ctx) => {
      ctx.scale(2, 2);
      ctx.translate(-460, -230);
      drawPond(dr(ctx, 200, 0), 1280, 720, KEEP_NOTHING);
      drawTrack(dr(ctx, 243, 0), pts);
      for (let i = 0; i < pts.length; i += 8) {
        ctx.save();
        ctx.translate(pts[i]!.x, pts[i]!.y);
        drawMarble(dr(ctx, 250 + i, 0), COLOURS[i % 5]!);
        ctx.restore();
      }
      const sub = pts.slice(Math.round(pts.length * 0.3), Math.round(pts.length * 0.7));
      drawTunnel(dr(ctx, 244, 0), sub);
    });
  };
  close('log', Array.from({ length: 90 }, (_, i) => ({ x: 480 + i * 4, y: 300 + i * 0.6 })));
  close('bridge, tight curve', buildPath(spiralOf(640, 360, 105, 105, 0.6, Math.PI * 0.7, 1, 1, 1)).pts.slice());
}

const dragonfly = section('dragonfly', 'dragonfly charm: marks and token');
if (dragonfly) {
  const charm: CharmId = 'dragonfly';
  for (const c of COLOURS) figure(dragonfly, c, MARBLE_FRAME * MARBLE_RES, MARBLE_FRAME * MARBLE_RES, 120, framed(MARBLE_FRAME, MARBLE_RES, (ctx) => {
    drawMarble(dr(ctx, 260, 0), c);
    drawCharmMark(dr(ctx, 261, 0), charm);
  }));
  for (let f = 0; f < BOIL; f++) figure(dragonfly, `token f${f}`, TOKEN_FRAME * 4, TOKEN_FRAME * 4, 150, framed(TOKEN_FRAME, 4, (ctx) => drawCharmToken(dr(ctx, 270 + f, f), charm)));
}
const flyer = section('dragonfly', 'dragonfly in flight: wing frames 0–1, boil frames, big');
if (flyer) for (const wing of [0, 1] as const) {
  for (let f = 0; f < BOIL; f++) figure(flyer, `wing ${wing} f${f}`, DRAGONFLY_FRAME * 5, DRAGONFLY_FRAME * 5, 260, framed(DRAGONFLY_FRAME, 5, (ctx) => drawDragonfly(dr(ctx, 280 + f, f), wing)));
}
const flyerGame = section('dragonfly', 'dragonfly at game size over the pond (ART_RES, both wing frames, turned to its heading)');
if (flyerGame) {
  const sprites = [0, 1].map((wing) => bake(DRAGONFLY_FRAME, 3, (ctx) => drawDragonfly(dr(ctx, 290, 0), wing as 0 | 1)));
  figure(flyerGame, '', 520 * ART_RES, 260 * ART_RES, 1040, (ctx) => {
    ctx.scale(ART_RES, ART_RES);
    ctx.translate(-760, -460);
    drawPond(dr(ctx, 200, 0), 1280, 720, KEEP_NOTHING);
    ([[840, 540, 0.4, 0], [960, 600, 1.2, 1], [1080, 520, -0.6, 0], [1180, 640, 2.6, 1], [880, 660, -2.2, 1]] as const).forEach(([x, y, a, wing]) => {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(a);
      ctx.scale(1 / 3, 1 / 3);
      ctx.drawImage(sprites[wing]!, -sprites[wing]!.width / 2, -sprites[wing]!.height / 2);
      ctx.restore();
    });
    ctx.save();
    ctx.translate(820, 620);
    drawMarble(dr(ctx, 295, 0), 'red');
    ctx.restore();
  });
}

/** Where water comes within `clear` of a groove's centre line on the board: the number of such groove points. */
function wetPoints(keep: PondKeep, W: number, H: number, clear: number): number {
  let n = 0;
  for (const g of keep.grooves) {
    for (const p of g) {
      if (p.x < 0 || p.x > W || p.y < 0 || p.y > H) continue;
      const ring = Array.from({ length: 12 }, (_, k) => ({ x: p.x + Math.cos((k / 12) * Math.PI * 2) * clear, y: p.y + Math.sin((k / 12) * Math.PI * 2) * clear }));
      if ([p, ...ring].some((q) => q.x >= 0 && q.x <= W && q.y >= 0 && q.y <= H && pondReach(q.x, q.y, W, H, keep) >= 1)) n++;
    }
  }
  return n;
}

const pondLevels = section('pond-levels', 'pond levels: each chapter 2 ground giving way round its grooves and pads (ART_RES, shown small)');
if (pondLevels) for (const level of CHAPTER_2) {
  const W = 1280;
  const H = 720;
  const keep: PondKeep = { grooves: level.tracks.map((t) => buildPath(t.points).pts), pads: level.shooter.kind === 'hop' ? level.shooter.pads : [] };
  let ms = 0;
  const canvas = figure(pondLevels, '', W * ART_RES, H * ART_RES, 620, (ctx) => {
    ctx.scale(ART_RES, ART_RES);
    const t = performance.now();
    drawPond(dr(ctx, 600, 0), W, H, keep);
    ms = performance.now() - t;
    keep.grooves.forEach((g, i) => drawTrack(dr(ctx, 640 + i, 0), g));
    keep.pads.forEach((p, i) => drawLilyPad(dr(ctx, 700 + i, 0), p.x, p.y));
  });
  canvas.parentElement!.querySelector('figcaption')!.textContent = `${level.id}: ${ms.toFixed(0)} ms · groove points with water within 46: ${wetPoints(keep, W, H, 46)}`;
}

// ——— Props (chapters 3–5): fruit, buds and blooms, stones, the Geode shot, the Ink Pot and Geode charms ———
/** Texture px per unit each prop is baked at (as recommended for textures.ts). */
const PROP_RES = { fruit: 3, marble: MARBLE_RES, bloom: 3 } as const;
const MF = MARBLE_FRAME;

/** A marble with something drawn over it (a bud), as the game layers them. */
const budded = (c: ColourId, f: number) => (ctx: CanvasRenderingContext2D): void => {
  drawMarble(dr(ctx, 900 + f, f), c);
  drawBud(dr(ctx, 910 + f, f));
};

const propFruit = section('props', 'fruit: apple, pear, plum, boil frames 0–2, big');
if (propFruit) for (const kind of FRUITS) {
  for (let f = 0; f < BOIL; f++) figure(propFruit, `${kind} f${f}`, FRUIT_FRAME * 5, FRUIT_FRAME * 5, 220, framed(FRUIT_FRAME, 5, (ctx) => drawFruit(dr(ctx, 800 + f, f), kind)));
}
const propBuds = section('props', 'buds over each colour (big), then boil frames on red');
if (propBuds) {
  COLOURS.forEach((c, i) => figure(propBuds, c, MF * 5, MF * 5, 170, framed(MF, 5, (ctx) => {
    ctx.rotate(i * 0.7);
    budded(c, 0)(ctx);
  })));
  for (let f = 0; f < BOIL; f++) figure(propBuds, `f${f}`, MF * 5, MF * 5, 170, framed(MF, 5, budded('red', f)));
}
const propBloom = section('props', 'bloom (a bud blossoming), boil frames, big');
if (propBloom) for (let f = 0; f < 2; f++) figure(propBloom, `bloom f${f}`, SPLASH_FRAME * 4, SPLASH_FRAME * 4, 260, framed(SPLASH_FRAME, 4, (ctx) => drawBloom(dr(ctx, 920 + f, f))));
const propStones = section('props', 'stones (whole, cracked) and the Geode shot, boil frames, beside marbles');
if (propStones) {
  for (let f = 0; f < BOIL; f++) figure(propStones, `stone f${f}`, MF * 5, MF * 5, 170, framed(MF, 5, (ctx) => drawStone(dr(ctx, 930 + f, f), false)));
  for (let f = 0; f < BOIL; f++) figure(propStones, `cracked f${f}`, MF * 5, MF * 5, 170, framed(MF, 5, (ctx) => drawStone(dr(ctx, 940 + f, f), true)));
  for (let f = 0; f < BOIL; f++) figure(propStones, `geode f${f}`, MF * 5, MF * 5, 170, framed(MF, 5, (ctx) => drawGeode(dr(ctx, 950 + f, f))));
  for (const c of ['blue', 'purple', 'teal'] as const) figure(propStones, c, MF * 5, MF * 5, 170, framed(MF, 5, (ctx) => drawMarble(dr(ctx, 960, 0), c)));
}
const propMarks = section('props', 'Ink Pot and Geode marks on every colour, and their tokens');
if (propMarks) for (const charm of ['inkpot', 'geode'] as const) {
  for (const c of COLOURS) figure(propMarks, `${charm} on ${c}`, MF * MARBLE_RES, MF * MARBLE_RES, 110, framed(MF, MARBLE_RES, (ctx) => {
    drawMarble(dr(ctx, 970, 0), c);
    drawCharmMark(dr(ctx, 971, 0), charm);
  }));
  for (let f = 0; f < BOIL; f++) figure(propMarks, `${charm} token f${f}`, TOKEN_FRAME * 4, TOKEN_FRAME * 4, 130, framed(TOKEN_FRAME, 4, (ctx) => drawCharmToken(dr(ctx, 975 + f, f), charm)));
}

/** Everything baked at its texture res and drawn at board size on paper, as in game (shown 1 and 2 css px per unit). */
const propGame = section('props', 'at game size: a line of marbles with buds, stones and a geode; fruit; marks; blooms (1× and 2× board px)');
if (propGame) {
  const W = 620;
  const H = 150;
  const sprite = (units: number, res: number, draw: (ctx: CanvasRenderingContext2D) => void): HTMLCanvasElement => bake(units, res, draw);
  const marbleTex = COLOURS.map((c) => sprite(MF, PROP_RES.marble, (ctx) => drawMarble(dr(ctx, 980, 0), c)));
  const budTex = sprite(MF, PROP_RES.marble, (ctx) => drawBud(dr(ctx, 981, 0)));
  const stoneTex = [false, true].map((k) => sprite(MF, PROP_RES.marble, (ctx) => drawStone(dr(ctx, 982, 0), k)));
  const geodeTex = sprite(MF, PROP_RES.marble, (ctx) => drawGeode(dr(ctx, 983, 0)));
  const markTex = (['inkpot', 'geode'] as const).map((ch) => sprite(MF, PROP_RES.marble, (ctx) => drawCharmMark(dr(ctx, 984, 0), ch)));
  const fruitTex = FRUITS.map((k) => sprite(FRUIT_FRAME, PROP_RES.fruit, (ctx) => drawFruit(dr(ctx, 985, 0), k)));
  const bloomTex = sprite(SPLASH_FRAME, PROP_RES.bloom, (ctx) => drawBloom(dr(ctx, 986, 0)));
  for (const scale of [1, 2]) {
    figure(propGame, `${scale}×`, W * ART_RES, H * ART_RES, W * scale, (ctx) => {
      ctx.scale(ART_RES, ART_RES);
      ctx.fillStyle = '#efe6cc';
      ctx.fillRect(0, 0, W, H);
      const put = (tex: HTMLCanvasElement, res: number, x: number, y: number, rot = 0): void => {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(rot);
        ctx.scale(1 / res, 1 / res);
        ctx.drawImage(tex, -tex.width / 2, -tex.height / 2);
        ctx.restore();
      };
      // The line: marbles, every other one budded, stones among them, the geode shot nearby.
      const step = MARBLE_R * 2;
      for (let i = 0; i < 16; i++) {
        const x = 30 + i * step;
        const rot = i * 0.9;
        if (i % 5 === 3) put(stoneTex[i % 2]!, PROP_RES.marble, x, 40, rot);
        else {
          put(marbleTex[i % COLOURS.length]!, PROP_RES.marble, x, 40, rot);
          if (i % 2 === 0) put(budTex, PROP_RES.marble, x, 40, rot);
          if (i === 7) put(markTex[0]!, PROP_RES.marble, x, 40);
          if (i === 11) put(markTex[1]!, PROP_RES.marble, x, 40);
        }
      }
      put(geodeTex, PROP_RES.marble, 560, 40);
      fruitTex.forEach((t, i) => put(t, PROP_RES.fruit, 50 + i * 60, 108, i * 0.6));
      put(bloomTex, PROP_RES.bloom, 260, 105);
      put(bloomTex, PROP_RES.bloom, 340, 105, 1.1);
      put(budTex, PROP_RES.marble, 420, 108);
    });
  }
}

/** Where track `over` first crosses track `under`: the distance along each. */
function firstCrossing(over: Path, under: Path): { sOver: number; sUnder: number } | null {
  for (let i = 0; i + 1 < over.pts.length; i++) {
    const hits = crossings(under, over.pts[i]!, over.pts[i + 1]!);
    if (hits.length > 0) return { sOver: over.cum[i]!, sUnder: hits[0]! };
  }
  return null;
}

/** Draws a marble at each `every`-th point of pts. */
function marblesAlong(ctx: CanvasRenderingContext2D, pts: readonly Pt[], seed: number, every = 8): void {
  for (let i = 0; i < pts.length; i += every) {
    ctx.save();
    ctx.translate(pts[i]!.x, pts[i]!.y);
    ctx.rotate(i * 0.9);
    drawMarble(dr(ctx, seed + i, 0), COLOURS[(i * 5 + (i >> 1)) % 5]!);
    ctx.restore();
  }
}

/**
 * A chapter 3–5 board: the place's ground round a spiral track that passes
 * near the edges and a second track crossing it, one plain tunnel, the
 * crossing (a tunnel on the lower stretch, a raised deck on the upper), two
 * pads with the gecko on one, marbles throughout.
 */
function placeBoard(place: Place, seed: number): void {
  const row = section(place, `${place}: ground, spiral track near the edges, a tunnel, a crossing (tunnel below, raised deck above), two pads (ART_RES)`);
  if (!row) return;
  const W = 1280;
  const H = 720;
  const times: string[] = [];
  const canvas = figure(row, '', W * ART_RES, H * ART_RES, W, (ctx) => {
    ctx.scale(ART_RES, ART_RES);
    const a = buildPath([...line({ x: 1320, y: 70 }, { x: 900, y: 70 }, 4), ...spiralOf(620, 390, 300, 120, 1.25, -Math.PI / 2 - 0.35, -1, 1.82, 1)]);
    const b = buildPath([{ x: -30, y: 280 }, { x: 110, y: 300 }, { x: 220, y: 330 }, { x: 290, y: 350 }]);
    const pads: Pt[] = [{ x: 560, y: 400 }, { x: 760, y: 360 }];
    const keep = { grooves: [a.pts, b.pts], pads };
    let t = performance.now();
    drawGround(dr(ctx, seed, 0), place, W, H, keep);
    times.push(`${place} ${(performance.now() - t).toFixed(0)} ms`);
    drawTrack(dr(ctx, seed + 1, 0), a.pts, place);
    drawTrack(dr(ctx, seed + 2, 0), b.pts, place);
    pads.forEach((p, i) => {
      drawPad(dr(ctx, seed + 3 + i, 0), place, p.x, p.y);
      drawPadRing(dr(ctx, seed + 5 + i, 0), p.x, p.y, PAD_R);
    });
    for (const end of [a.pts[a.pts.length - 1]!, b.pts[b.pts.length - 1]!]) {
      ctx.save();
      ctx.translate(end.x, end.y);
      drawWell(dr(ctx, seed + 7, 0));
      ctx.restore();
    }
    const cross = firstCrossing(a, b);
    const onDeck = cross ? stretch(a, cross.sOver - 90, cross.sOver + 90) : [];
    marblesAlong(ctx, a.pts.filter((p) => !onDeck.includes(p)), seed + 10);
    marblesAlong(ctx, b.pts, seed + 300, 9);
    ctx.save();
    ctx.translate(pads[0]!.x, pads[0]!.y);
    loadedGecko(ctx, 'teal', 'red', 0);
    ctx.restore();
    // Covers: a plain tunnel, then the crossing's tunnel and deck, then marbles on the deck.
    const layer = makeCanvas(W * ART_RES, H * ART_RES);
    layer.ctx.scale(ART_RES, ART_RES);
    t = performance.now();
    drawTunnel(dr(layer.ctx, seed + 20, 0), stretch(a, 1250, 1520), place);
    if (cross) {
      drawTunnel(dr(layer.ctx, seed + 21, 0), stretch(b, cross.sUnder - 70, cross.sUnder + 70), place);
      drawRaised(dr(layer.ctx, seed + 22, 0), onDeck, place);
    }
    times.push(`covers ${(performance.now() - t).toFixed(0)} ms`);
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(layer.canvas, 0, 0);
    ctx.restore();
    marblesAlong(ctx, onDeck, seed + 600);
  });
  canvas.parentElement!.querySelector('figcaption')!.textContent = times.join(' · ');
}
placeBoard('greenhouse', 3000);
placeBoard('orchard', 4000);
placeBoard('rockery', 5000);

const covers = section('covers', 'covers close up: each place\'s tunnel on a straight and a tight curve, and its raised deck over a crossing; pads');
if (covers) {
  const straight = Array.from({ length: 70 }, (_, i) => ({ x: 70 + i * 4, y: 120 + i * 0.5 }));
  const curve = buildPath(spiralOf(180, 130, 95, 95, 0.5, Math.PI * 0.75, 1, 1, 1)).pts.slice();
  for (const place of ['garden', 'greenhouse', 'orchard', 'rockery'] as const) {
    for (const [label, pts] of [['straight', straight], ['curve', curve]] as const) {
      figure(covers, `${place} ${label}`, 360 * 2, 260 * 2, 400, (ctx) => {
        ctx.scale(2, 2);
        ctx.translate(-460, -230);
        drawGround(dr(ctx, 200, 0), place, 1280, 720, KEEP_NOTHING);
        ctx.translate(460, 230);
        drawTrack(dr(ctx, 243, 0), pts);
        marblesAlong(ctx, pts, 250);
        drawTunnel(dr(ctx, 244, 0), pts.slice(Math.round(pts.length * 0.25), Math.round(pts.length * 0.75)), place);
      });
    }
    figure(covers, `${place} crossing`, 360 * 2, 260 * 2, 400, (ctx) => {
      ctx.scale(2, 2);
      ctx.translate(-460, -230);
      drawGround(dr(ctx, 200, 0), place, 1280, 720, KEEP_NOTHING);
      ctx.translate(460, 230);
      const under = Array.from({ length: 80 }, (_, i) => ({ x: 20 + i * 4, y: 150 + Math.sin(i / 20) * 10 }));
      const over = Array.from({ length: 62 }, (_, i) => ({ x: 150 + i * 1.2, y: 10 + i * 3.8 }));
      drawTrack(dr(ctx, 245, 0), under);
      drawTrack(dr(ctx, 246, 0), over);
      marblesAlong(ctx, under, 260, 9);
      drawTunnel(dr(ctx, 247, 0), under.slice(22, 52), place);
      const deck = over.slice(8, 54);
      drawRaised(dr(ctx, 248, 0), deck, place);
      marblesAlong(ctx, deck, 270);
    });
    figure(covers, `${place} pad`, 220 * 3, 220 * 3, 300, framed(220, 3, (ctx) => {
      ctx.translate(-110, -110);
      drawGround(dr(ctx, 200, 0), place, 1280, 720, KEEP_NOTHING);
      drawPad(dr(ctx, 249, 0), place, 110, 110);
      drawPadRing(dr(ctx, 250, 0), 110, 110, PAD_R);
      ctx.translate(110, 110);
      loadedGecko(ctx, 'yellow', 'purple', 1);
    }));
  }
}

/** Each chapter 3–5 level as the game bakes it: ground for its keep, grooves, pads, then covers (tunnels, then raised decks). */
for (const [place, levels] of [['greenhouse', CHAPTER_3], ['orchard', CHAPTER_4], ['rockery', CHAPTER_5]] as const) {
  const row = section(`${place}-levels`, `${place} levels: each ground giving way round its grooves and pads, with its covers (ART_RES, shown small)`);
  if (!row) continue;
  for (const level of levels) {
    const W = 1280;
    const H = 720;
    const paths = level.tracks.map((t) => buildPath(t.points));
    const pads = level.shooter.kind === 'hop' ? level.shooter.pads : [];
    let ms = 0;
    let cms = 0;
    const canvas = figure(row, '', W * ART_RES, H * ART_RES, 620, (ctx) => {
      ctx.scale(ART_RES, ART_RES);
      let t = performance.now();
      drawGround(dr(ctx, 600, 0), place, W, H, { grooves: paths.map((p) => p.pts), pads });
      ms = performance.now() - t;
      paths.forEach((p, i) => drawTrack(dr(ctx, 640 + i, 0), p.pts));
      pads.forEach((p, i) => {
        drawPad(dr(ctx, 700 + i, 0), place, p.x, p.y);
        drawPadRing(dr(ctx, 720 + i, 0), p.x, p.y, PAD_R);
      });
      const sh = level.shooter;
      if (sh.kind === 'rail') drawBranch(dr(ctx, 680, 0), sh.x0 - 50, sh.x1 + 50, sh.y + 4);
      const layer = makeCanvas(W * ART_RES, H * ART_RES);
      layer.ctx.scale(ART_RES, ART_RES);
      const part = (i: number, c: { from: number; to: number }): Pt[] => stretch(paths[i]!, c.from * paths[i]!.length, c.to * paths[i]!.length);
      t = performance.now();
      level.tracks.forEach((tr, i) => (tr.tunnels ?? []).forEach((c, k) => drawTunnel(dr(layer.ctx, 760 + i * 10 + k, 0), part(i, c), place)));
      level.tracks.forEach((tr, i) => (tr.raised ?? []).forEach((c, k) => drawRaised(dr(layer.ctx, 800 + i * 10 + k, 0), part(i, c), place)));
      cms = performance.now() - t;
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.drawImage(layer.canvas, 0, 0);
      ctx.restore();
    });
    canvas.parentElement!.querySelector('figcaption')!.textContent = `${level.id}: ground ${ms.toFixed(0)} ms · covers ${cms.toFixed(0)} ms`;
  }
}

// ——— Farm props (chapters 6–7): twined pairs, the Hedgehog, chameleon sheen, Rain ———
const FARM_RES = { marble: MARBLE_RES, hog: HEDGEHOG_RES, rain: 3 } as const;
/** A marble with overlays drawn over it, at the overlay's own boil frame. */
const overlaid = (c: ColourId, f: number, rot: number, ...over: ((d: Draw) => void)[]) => (ctx: CanvasRenderingContext2D): void => {
  ctx.save();
  ctx.rotate(rot);
  drawMarble(dr(ctx, 1000 + f, f), c);
  ctx.restore();
  over.forEach((o, i) => o(dr(ctx, 1010 + i * 10 + f, f)));
};
const farmTwine = section('farm', 'twine: knot over each colour (+x towards the partner), boil frames, the cord alone, a tied pair');
if (farmTwine) {
  COLOURS.forEach((c, i) => figure(farmTwine, c, MF * 5, MF * 5, 150, framed(MF, 5, overlaid(c, 0, i * 1.1, drawTwineKnot))));
  for (let f = 0; f < BOIL; f++) figure(farmTwine, `knot f${f}`, MF * 5, MF * 5, 150, framed(MF, 5, (ctx) => drawTwineKnot(dr(ctx, 1020 + f, f))));
  figure(farmTwine, 'cord', TWINE_CORD_FRAME * 5, TWINE_CORD_FRAME * 5, 150, framed(TWINE_CORD_FRAME, 5, (ctx) => drawTwineCord(dr(ctx, 1030, 0))));
  figure(farmTwine, 'tied pair', 72 * 5, MF * 5, 360, (ctx) => {
    ctx.scale(5, 5);
    ctx.translate(20, 20);
    overlaid('blue', 0, 0.4)(ctx);
    ctx.translate(32, 0);
    overlaid('yellow', 0, 2)(ctx);
    ctx.translate(-16, 0);
    drawTwineCord(dr(ctx, 1031, 0));
    ctx.translate(-16, 0);
    drawTwineKnot(dr(ctx, 1032, 0));
    ctx.translate(32, 0);
    ctx.rotate(Math.PI);
    drawTwineKnot(dr(ctx, 1033, 0));
  });
}
const farmSheen = section('farm', 'chameleon sheen over each colour, boil frames on teal, the shimmer ring');
if (farmSheen) {
  COLOURS.forEach((c, i) => figure(farmSheen, c, MF * 5, MF * 5, 150, framed(MF, 5, overlaid(c, 0, i * 0.9, drawSheen))));
  for (let f = 0; f < BOIL; f++) figure(farmSheen, `f${f}`, MF * 5, MF * 5, 150, framed(MF, 5, overlaid('teal', f, 0, drawSheen)));
  for (let f = 0; f < 2; f++) figure(farmSheen, `ring f${f}`, MF * 5, MF * 5, 150, framed(MF, 5, overlaid('purple', f, 0, drawSheen, drawSheenRing)));
}
const farmHog = section('farm', 'hedgehog: walk steps 0–1, boil frames, big');
if (farmHog) for (const step of [0, 1] as const) {
  for (let f = 0; f < BOIL; f++) figure(farmHog, `step ${step} f${f}`, HEDGEHOG_FRAME * 4, HEDGEHOG_FRAME * 4, 260, framed(HEDGEHOG_FRAME, 4, (ctx) => drawHedgehog(dr(ctx, 1040 + f, f), step)));
}
const farmRain = section('farm', 'rain: streak and splash, boil frames, big; Hedgehog and Rain marks and tokens');
if (farmRain) {
  for (let f = 0; f < 2; f++) figure(farmRain, `streak f${f}`, RAIN_STREAK_FRAME * 5, RAIN_STREAK_FRAME * 5, 150, framed(RAIN_STREAK_FRAME, 5, (ctx) => drawRainStreak(dr(ctx, 1050 + f, f))));
  for (let f = 0; f < 2; f++) figure(farmRain, `splash f${f}`, RAIN_SPLASH_FRAME * 5, RAIN_SPLASH_FRAME * 5, 150, framed(RAIN_SPLASH_FRAME, 5, (ctx) => drawRainSplash(dr(ctx, 1060 + f, f))));
  for (const charm of ['hedgehog', 'rain'] as const) {
    for (const c of COLOURS) figure(farmRain, `${charm} on ${c}`, MF * MARBLE_RES, MF * MARBLE_RES, 90, framed(MF, MARBLE_RES, (ctx) => {
      drawMarble(dr(ctx, 1070, 0), c);
      drawCharmMark(dr(ctx, 1071, 0), charm);
    }));
    figure(farmRain, `${charm} token`, TOKEN_FRAME * 4, TOKEN_FRAME * 4, 110, framed(TOKEN_FRAME, 4, (ctx) => drawCharmToken(dr(ctx, 1075, 0), charm)));
  }
}

/** Every farm sprite baked at its texture res and laid out at board size on paper, as the view would (1× and 2× board px). */
const farmGame = section('farm', 'at game size: a line with a tied pair (straight and on a bend), chameleon marbles (one ringed), the hedgehog eating up the line, rain over a band, marks and tokens');
if (farmGame) {
  const W = 620;
  const H = 190;
  const marbleTex = COLOURS.map((c) => bake(MF, FARM_RES.marble, (ctx) => drawMarble(dr(ctx, 1080, 0), c)));
  const knotTex = bake(MF, FARM_RES.marble, (ctx) => drawTwineKnot(dr(ctx, 1081, 0)));
  const cordTex = bake(TWINE_CORD_FRAME, FARM_RES.marble, (ctx) => drawTwineCord(dr(ctx, 1082, 0)));
  const sheenTex = bake(MF, FARM_RES.marble, (ctx) => drawSheen(dr(ctx, 1083, 0)));
  const ringTex = bake(MF, FARM_RES.marble, (ctx) => drawSheenRing(dr(ctx, 1084, 0)));
  const hogTex = [0, 1].map((s) => bake(HEDGEHOG_FRAME, FARM_RES.hog, (ctx) => drawHedgehog(dr(ctx, 1085, 0), s as 0 | 1)));
  const streakTex = bake(RAIN_STREAK_FRAME, FARM_RES.rain, (ctx) => drawRainStreak(dr(ctx, 1086, 0)));
  const splashTex = bake(RAIN_SPLASH_FRAME, FARM_RES.rain, (ctx) => drawRainSplash(dr(ctx, 1087, 0)));
  const markTex = (['hedgehog', 'rain'] as const).map((ch) => bake(MF, FARM_RES.marble, (ctx) => drawCharmMark(dr(ctx, 1088, 0), ch)));
  const tokenTex = (['hedgehog', 'rain'] as const).map((ch) => bake(TOKEN_FRAME, 3, (ctx) => drawCharmToken(dr(ctx, 1089, 0), ch)));
  for (const scale of [1, 2]) {
    figure(farmGame, `${scale}×`, W * ART_RES, H * ART_RES, W * scale, (ctx) => {
      ctx.scale(ART_RES, ART_RES);
      ctx.fillStyle = '#efe6cc';
      ctx.fillRect(0, 0, W, H);
      const put = (tex: HTMLCanvasElement, res: number, x: number, y: number, rot = 0, sx = 1, alpha = 1): void => {
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.translate(x, y);
        ctx.rotate(rot);
        ctx.scale(sx / res, 1 / res);
        ctx.drawImage(tex, -tex.width / 2, -tex.height / 2);
        ctx.restore();
      };
      /** A tied pair: cord between the centres, then each knot turned towards the other. */
      const tie = (a: Pt, b: Pt): void => {
        const ang = Math.atan2(b.y - a.y, b.x - a.x);
        put(cordTex, FARM_RES.marble, (a.x + b.x) / 2, (a.y + b.y) / 2, ang, Math.hypot(b.x - a.x, b.y - a.y) / TWINE_CORD_W);
        put(knotTex, FARM_RES.marble, a.x, a.y, ang);
        put(knotTex, FARM_RES.marble, b.x, b.y, ang + Math.PI);
      };
      const step = MARBLE_R * 2;
      // The straight line: a tied pair at 2–3, chameleons at 5 and 7 (7 ringed), a hedgehog at the front.
      const line: Pt[] = Array.from({ length: 13 }, (_, i) => ({ x: 120 + i * step, y: 34 }));
      line.forEach((p, i) => put(marbleTex[(i * 5 + (i >> 1)) % COLOURS.length]!, FARM_RES.marble, p.x, p.y, i * 0.9));
      tie(line[2]!, line[3]!);
      for (const i of [5, 7]) put(sheenTex, FARM_RES.marble, line[i]!.x, line[i]!.y);
      put(ringTex, FARM_RES.marble, line[7]!.x, line[7]!.y, 0.3);
      put(markTex[0]!, FARM_RES.marble, line[10]!.x, line[10]!.y);
      put(markTex[1]!, FARM_RES.marble, line[12]!.x, line[12]!.y);
      put(hogTex[0]!, FARM_RES.hog, 70, 34);
      put(hogTex[1]!, FARM_RES.hog, 70, 100, -0.5);
      // A bend: marbles round an arc, a tied pair on it.
      const arc: Pt[] = Array.from({ length: 7 }, (_, i) => ({ x: 170 + Math.cos(Math.PI * 0.9 - i * 0.42) * 80, y: 175 - Math.sin(Math.PI * 0.9 - i * 0.42) * 80 }));
      arc.forEach((p, i) => put(marbleTex[(i + 2) % COLOURS.length]!, FARM_RES.marble, p.x, p.y, i * 1.3));
      tie(arc[2]!, arc[3]!);
      put(sheenTex, FARM_RES.marble, arc[5]!.x, arc[5]!.y);
      // Rain over a band: a line of marbles, streaks falling through, splashes on some.
      const band: Pt[] = Array.from({ length: 6 }, (_, i) => ({ x: 330 + i * step, y: 150 }));
      band.forEach((p, i) => put(marbleTex[(i + 4) % COLOURS.length]!, FARM_RES.marble, p.x, p.y, i));
      ctx.fillStyle = 'rgba(80,120,170,0.06)';
      ctx.fillRect(380, 70, 104, 120);
      for (const [x, y] of [[392, 92], [418, 118], [446, 84], [470, 110], [404, 136], [458, 140], [432, 100]] as const) put(streakTex, FARM_RES.rain, x, y);
      put(splashTex, FARM_RES.rain, band[2]!.x, band[2]!.y);
      put(splashTex, FARM_RES.rain, band[4]!.x, band[4]!.y, 1.2);
      put(splashTex, FARM_RES.rain, 470, 175, 2, 1, 0.6);
      put(tokenTex[0]!, 3, 560, 90);
      put(tokenTex[1]!, 3, 560, 150);
    });
  }
}

// ——— The Wild Meadow (chapter 7): a full board, two chapter layouts painted as meadow, covers close up ———
placeBoard('meadow', 7000);
const meadowLevels = section('meadow', 'meadow ground under chapter 4–5 layouts (hop and rail), with grooves, pads and covers (ART_RES, shown small)');
if (meadowLevels) {
  for (const level of [CHAPTER_4[1]!, CHAPTER_5[2]!, CHAPTER_5[4]!, CHAPTER_4[4]!]) {
    const W = 1280;
    const H = 720;
    const paths = level.tracks.map((t) => buildPath(t.points));
    const pads = level.shooter.kind === 'hop' ? level.shooter.pads : [];
    let ms = 0;
    const canvas = figure(meadowLevels, '', W * ART_RES, H * ART_RES, 640, (ctx) => {
      ctx.scale(ART_RES, ART_RES);
      const t = performance.now();
      drawGround(dr(ctx, 600, 0), 'meadow', W, H, { grooves: paths.map((p) => p.pts), pads });
      ms = performance.now() - t;
      paths.forEach((p, i) => drawTrack(dr(ctx, 640 + i, 0), p.pts));
      pads.forEach((p, i) => {
        drawPad(dr(ctx, 700 + i, 0), 'meadow', p.x, p.y);
        drawPadRing(dr(ctx, 720 + i, 0), p.x, p.y, PAD_R);
      });
      const sh = level.shooter;
      if (sh.kind === 'rail') drawBranch(dr(ctx, 680, 0), sh.x0 - 50, sh.x1 + 50, sh.y + 4);
      paths.forEach((p, i) => marblesAlong(ctx, p.pts.slice(0, Math.round(p.pts.length * 0.6)), 900 + i * 50, 9));
      const part = (i: number, c: { from: number; to: number }): Pt[] => stretch(paths[i]!, c.from * paths[i]!.length, c.to * paths[i]!.length);
      level.tracks.forEach((tr, i) => (tr.tunnels ?? []).forEach((c, k) => drawTunnel(dr(ctx, 760 + i * 10 + k, 0), part(i, c), 'meadow')));
      level.tracks.forEach((tr, i) => (tr.raised ?? []).forEach((c, k) => drawRaised(dr(ctx, 800 + i * 10 + k, 0), part(i, c), 'meadow')));
    });
    canvas.parentElement!.querySelector('figcaption')!.textContent = `${level.id} as meadow: ground ${ms.toFixed(0)} ms`;
  }
}
const meadowCovers = section('meadow', 'meadow close up: grass bank on a straight and a curve, boardwalk over a crossing, millstone pad');
if (meadowCovers) {
  const straight = Array.from({ length: 70 }, (_, i) => ({ x: 70 + i * 4, y: 120 + i * 0.5 }));
  const curve = buildPath(spiralOf(180, 130, 95, 95, 0.5, Math.PI * 0.75, 1, 1, 1)).pts.slice();
  for (const [label, pts] of [['straight', straight], ['curve', curve]] as const) {
    figure(meadowCovers, `bank ${label}`, 360 * 2, 260 * 2, 420, (ctx) => {
      ctx.scale(2, 2);
      ctx.translate(-20, -20);
      drawGround(dr(ctx, 200, 0), 'meadow', 1280, 720, { grooves: [pts.map((p) => ({ x: p.x + 20, y: p.y + 20 }))], pads: [] });
      ctx.translate(20, 20);
      drawTrack(dr(ctx, 243, 0), pts);
      marblesAlong(ctx, pts, 250);
      drawTunnel(dr(ctx, 244, 0), pts.slice(Math.round(pts.length * 0.25), Math.round(pts.length * 0.75)), 'meadow');
    });
  }
  figure(meadowCovers, 'boardwalk crossing', 360 * 2, 260 * 2, 420, (ctx) => {
    ctx.scale(2, 2);
    const under = Array.from({ length: 80 }, (_, i) => ({ x: 20 + i * 4, y: 150 + Math.sin(i / 20) * 10 }));
    const over = Array.from({ length: 62 }, (_, i) => ({ x: 150 + i * 1.2, y: 10 + i * 3.8 }));
    ctx.translate(-20, -20);
    drawGround(dr(ctx, 200, 0), 'meadow', 1280, 720, { grooves: [under, over].map((g) => g.map((p) => ({ x: p.x + 20, y: p.y + 20 }))), pads: [] });
    ctx.translate(20, 20);
    drawTrack(dr(ctx, 245, 0), under);
    drawTrack(dr(ctx, 246, 0), over);
    marblesAlong(ctx, under, 260, 9);
    drawTunnel(dr(ctx, 247, 0), under.slice(22, 52), 'meadow');
    const deck = over.slice(8, 54);
    drawRaised(dr(ctx, 248, 0), deck, 'meadow');
    marblesAlong(ctx, deck, 270);
  });
  for (const withGecko of [false, true]) {
    figure(meadowCovers, withGecko ? 'millstone + gecko' : 'millstone', 220 * 3, 220 * 3, 300, framed(220, 3, (ctx) => {
      ctx.translate(-110, -110);
      drawGround(dr(ctx, 200, 0), 'meadow', 1280, 720, KEEP_NOTHING);
      drawPad(dr(ctx, 249, 0), 'meadow', 110, 110);
      drawPadRing(dr(ctx, 250, 0), 110, 110, PAD_R);
      ctx.translate(110, 110);
      if (withGecko) loadedGecko(ctx, 'yellow', 'purple', 1);
    }));
  }
}

// ——— The Allotment (chapter 6): a full board, the chapter's levels, covers close up ———
placeBoard('allotment', 6000);
const allotmentLevels = section('allotment', 'allotment levels: each ground giving way round its grooves and pads, with its covers (ART_RES, shown small)');
if (allotmentLevels) {
  for (const level of CHAPTER_6) {
    const W = 1280;
    const H = 720;
    const paths = level.tracks.map((t) => buildPath(t.points));
    const pads = level.shooter.kind === 'hop' ? level.shooter.pads : [];
    let ms = 0;
    const canvas = figure(allotmentLevels, '', W * ART_RES, H * ART_RES, 620, (ctx) => {
      ctx.scale(ART_RES, ART_RES);
      const t = performance.now();
      drawGround(dr(ctx, 600, 0), 'allotment', W, H, { grooves: paths.map((p) => p.pts), pads });
      ms = performance.now() - t;
      paths.forEach((p, i) => drawTrack(dr(ctx, 640 + i, 0), p.pts));
      pads.forEach((p, i) => {
        drawPad(dr(ctx, 700 + i, 0), 'allotment', p.x, p.y);
        drawPadRing(dr(ctx, 720 + i, 0), p.x, p.y, PAD_R);
      });
      const sh = level.shooter;
      if (sh.kind === 'rail') drawBranch(dr(ctx, 680, 0), sh.x0 - 50, sh.x1 + 50, sh.y + 4);
      const part = (i: number, c: { from: number; to: number }): Pt[] => stretch(paths[i]!, c.from * paths[i]!.length, c.to * paths[i]!.length);
      level.tracks.forEach((tr, i) => (tr.tunnels ?? []).forEach((c, k) => drawTunnel(dr(ctx, 760 + i * 10 + k, 0), part(i, c), 'allotment')));
      level.tracks.forEach((tr, i) => (tr.raised ?? []).forEach((c, k) => drawRaised(dr(ctx, 800 + i * 10 + k, 0), part(i, c), 'allotment')));
    });
    canvas.parentElement!.querySelector('figcaption')!.textContent = `${level.id}: ground ${ms.toFixed(0)} ms`;
  }
}
const allotmentCovers = section('allotment', 'allotment close up: fleece cloche on a straight and a tight curve, scaffold-board deck over a crossing, bucket pad');
if (allotmentCovers) {
  const straight = Array.from({ length: 70 }, (_, i) => ({ x: 70 + i * 4, y: 120 + i * 0.5 }));
  const curve = buildPath(spiralOf(180, 130, 95, 95, 0.5, Math.PI * 0.75, 1, 1, 1)).pts.slice();
  /** The ground under a close-up whose grooves are drawn at (x, y) in a window at (460, 230) of the board. */
  const ground = (ctx: CanvasRenderingContext2D, grooves: readonly (readonly Pt[])[]): void => {
    ctx.translate(-460, -230);
    drawGround(dr(ctx, 200, 0), 'allotment', 1280, 720, { grooves: grooves.map((g) => g.map((p) => ({ x: p.x + 460, y: p.y + 230 }))), pads: [] });
    ctx.translate(460, 230);
  };
  for (const [label, pts] of [['straight', straight], ['curve', curve]] as const) {
    figure(allotmentCovers, `cloche ${label}`, 360 * 2, 260 * 2, 420, (ctx) => {
      ctx.scale(2, 2);
      ground(ctx, [pts]);
      drawTrack(dr(ctx, 243, 0), pts);
      marblesAlong(ctx, pts, 250);
      drawTunnel(dr(ctx, 244, 0), pts.slice(Math.round(pts.length * 0.25), Math.round(pts.length * 0.75)), 'allotment');
    });
  }
  figure(allotmentCovers, 'scaffold crossing', 360 * 2, 260 * 2, 420, (ctx) => {
    ctx.scale(2, 2);
    const under = Array.from({ length: 80 }, (_, i) => ({ x: 20 + i * 4, y: 150 + Math.sin(i / 20) * 10 }));
    const over = Array.from({ length: 62 }, (_, i) => ({ x: 150 + i * 1.2, y: 10 + i * 3.8 }));
    ground(ctx, [under, over]);
    drawTrack(dr(ctx, 245, 0), under);
    drawTrack(dr(ctx, 246, 0), over);
    marblesAlong(ctx, under, 260, 9);
    drawTunnel(dr(ctx, 247, 0), under.slice(22, 52), 'allotment');
    const deck = over.slice(8, 54);
    drawRaised(dr(ctx, 248, 0), deck, 'allotment');
    marblesAlong(ctx, deck, 270);
  });
  for (const withGecko of [false, true]) {
    figure(allotmentCovers, withGecko ? 'bucket + gecko' : 'bucket', 220 * 3, 220 * 3, 300, framed(220, 3, (ctx) => {
      ctx.translate(-110, -110);
      drawGround(dr(ctx, 200, 0), 'allotment', 1280, 720, { grooves: [], pads: [{ x: 110, y: 110 }] });
      drawPad(dr(ctx, 249, 0), 'allotment', 110, 110);
      drawPadRing(dr(ctx, 250, 0), 110, 110, PAD_R);
      ctx.translate(110, 110);
      if (withGecko) loadedGecko(ctx, 'yellow', 'purple', 1);
    }));
  }
}

// ——— The Old Barn (chapter 8): full boards with grooves through the walls, layouts painted as barn, covers close up ———
placeBoard('barn', 8000);
const barnBoards = section('barn', 'barn ground under chapter 3–5 layouts (grooves entering through the walls, hop and rail), with grooves, pads and covers (ART_RES, shown small)');
if (barnBoards) {
  for (const level of [CHAPTER_5[2]!, CHAPTER_4[1]!, CHAPTER_3[3]!, CHAPTER_5[4]!]) {
    const W = 1280;
    const H = 720;
    const paths = level.tracks.map((t) => buildPath(t.points));
    const pads = level.shooter.kind === 'hop' ? level.shooter.pads : [];
    let ms = 0;
    const canvas = figure(barnBoards, '', W * ART_RES, H * ART_RES, 640, (ctx) => {
      ctx.scale(ART_RES, ART_RES);
      const t = performance.now();
      drawGround(dr(ctx, 600, 0), 'barn', W, H, { grooves: paths.map((p) => p.pts), pads });
      ms = performance.now() - t;
      paths.forEach((p, i) => drawTrack(dr(ctx, 640 + i, 0), p.pts));
      pads.forEach((p, i) => {
        drawPad(dr(ctx, 700 + i, 0), 'barn', p.x, p.y);
        drawPadRing(dr(ctx, 720 + i, 0), p.x, p.y, PAD_R);
      });
      const sh = level.shooter;
      if (sh.kind === 'rail') drawBranch(dr(ctx, 680, 0), sh.x0 - 50, sh.x1 + 50, sh.y + 4);
      paths.forEach((p, i) => marblesAlong(ctx, p.pts.slice(0, Math.round(p.pts.length * 0.6)), 900 + i * 50, 9));
      const part = (i: number, c: { from: number; to: number }): Pt[] => stretch(paths[i]!, c.from * paths[i]!.length, c.to * paths[i]!.length);
      level.tracks.forEach((tr, i) => (tr.tunnels ?? []).forEach((c, k) => drawTunnel(dr(ctx, 760 + i * 10 + k, 0), part(i, c), 'barn')));
      level.tracks.forEach((tr, i) => (tr.raised ?? []).forEach((c, k) => drawRaised(dr(ctx, 800 + i * 10 + k, 0), part(i, c), 'barn')));
    });
    canvas.parentElement!.querySelector('figcaption')!.textContent = `${level.id} as barn: ground ${ms.toFixed(0)} ms`;
  }
}
const barnCovers = section('barn', 'barn close up: bale row on a straight and a tight curve, beam bridge over a crossing, bale pad, a wall corner with a groove through it');
if (barnCovers) {
  const straight = Array.from({ length: 70 }, (_, i) => ({ x: 70 + i * 4, y: 120 + i * 0.5 }));
  const curve = buildPath(spiralOf(180, 130, 95, 95, 0.5, Math.PI * 0.75, 1, 1, 1)).pts.slice();
  /** The ground under a close-up whose grooves are drawn at (x, y) in a window at (ox, oy) of the board. */
  const ground = (ctx: CanvasRenderingContext2D, grooves: readonly (readonly Pt[])[], ox = 460, oy = 230): void => {
    ctx.translate(-ox, -oy);
    drawGround(dr(ctx, 200, 0), 'barn', 1280, 720, { grooves: grooves.map((g) => g.map((p) => ({ x: p.x + ox, y: p.y + oy }))), pads: [] });
    ctx.translate(ox, oy);
  };
  for (const [label, pts] of [['straight', straight], ['curve', curve]] as const) {
    figure(barnCovers, `bales ${label}`, 360 * 2, 260 * 2, 420, (ctx) => {
      ctx.scale(2, 2);
      ground(ctx, [pts]);
      drawTrack(dr(ctx, 243, 0), pts);
      marblesAlong(ctx, pts, 250);
      drawTunnel(dr(ctx, 244, 0), pts.slice(Math.round(pts.length * 0.25), Math.round(pts.length * 0.75)), 'barn');
    });
  }
  figure(barnCovers, 'beam bridge crossing', 360 * 2, 260 * 2, 420, (ctx) => {
    ctx.scale(2, 2);
    const under = Array.from({ length: 80 }, (_, i) => ({ x: 20 + i * 4, y: 150 + Math.sin(i / 20) * 10 }));
    const over = Array.from({ length: 62 }, (_, i) => ({ x: 150 + i * 1.2, y: 10 + i * 3.8 }));
    ground(ctx, [under, over]);
    drawTrack(dr(ctx, 245, 0), under);
    drawTrack(dr(ctx, 246, 0), over);
    marblesAlong(ctx, under, 260, 9);
    drawTunnel(dr(ctx, 247, 0), under.slice(22, 52), 'barn');
    const deck = over.slice(8, 54);
    drawRaised(dr(ctx, 248, 0), deck, 'barn');
    marblesAlong(ctx, deck, 270);
  });
  figure(barnCovers, 'top-left corner: grooves through the walls', 360 * 2, 260 * 2, 420, (ctx) => {
    ctx.scale(2, 2);
    const side = buildPath([{ x: -30, y: 150 }, { x: 80, y: 160 }, { x: 200, y: 190 }, { x: 330, y: 230 }]).pts.slice();
    const top = buildPath([{ x: 250, y: -30 }, { x: 240, y: 60 }, { x: 200, y: 120 }]).pts.slice();
    ground(ctx, [side, top], 0, 0);
    drawTrack(dr(ctx, 245, 0), side);
    drawTrack(dr(ctx, 246, 0), top);
    marblesAlong(ctx, side, 260, 9);
  });
  for (const withGecko of [false, true]) {
    figure(barnCovers, withGecko ? 'bale + gecko' : 'bale', 220 * 3, 220 * 3, 300, framed(220, 3, (ctx) => {
      ctx.translate(-110, -110);
      drawGround(dr(ctx, 200, 0), 'barn', 1280, 720, { grooves: [], pads: [{ x: 110, y: 110 }] });
      drawPad(dr(ctx, 249, 0), 'barn', 110, 110);
      drawPadRing(dr(ctx, 250, 0), 110, 110, PAD_R);
      ctx.translate(110, 110);
      if (withGecko) loadedGecko(ctx, 'yellow', 'purple', 1);
    }));
  }
}
const allotmentProps = section('allotment', 'allotment props and crops close up (2×): barrow, water butt, hose, fork, scarecrow; cabbage, leek, lettuce, carrot, marigold, seedlings, beans on canes');
if (allotmentProps) {
  figure(allotmentProps, 'props', 640 * 2, 260 * 2, 960, (ctx) => {
    ctx.scale(2, 2);
    ctx.fillStyle = '#ecdfbd';
    ctx.fillRect(0, 0, 640, 260);
    const rng = (() => { let a = 7; return () => ((a = (a * 16807) % 2147483647) / 2147483647); })();
    upturnedBarrow(dr(ctx, 300, 0), { x: 95, y: 120 }, 110, -0.5, rng);
    waterButt(dr(ctx, 301, 0), { x: 230, y: 90 }, 30, rng);
    hoseCoil(dr(ctx, 302, 0), { x: 230, y: 195 }, 24, rng);
    gardenFork(dr(ctx, 303, 0), { x: 330, y: 70 }, -2.3, rng);
    scarecrow(dr(ctx, 304, 0), { x: 480, y: 90 }, 0.1, rng);
    harvestTrug(dr(ctx, 305, 0), { x: 380, y: 200 }, 60, 0.3, rng, (d, c, r) => cabbage(d, c, r, rng));
  });
  figure(allotmentProps, 'crops', 640 * 2, 200 * 2, 960, (ctx) => {
    ctx.scale(2, 2);
    ctx.fillStyle = '#8a6e56';
    ctx.fillRect(0, 0, 640, 200);
    const rng = (() => { let a = 11; return () => ((a = (a * 16807) % 2147483647) / 2147483647); })();
    const d = dr(ctx, 310, 0);
    cabbage(d, { x: 40, y: 50 }, 14, rng);
    leek(d, { x: 100, y: 50 }, 16, Math.PI / 2, rng);
    lettuce(d, { x: 160, y: 50 }, 11, rng);
    lettuce(d, { x: 200, y: 50 }, 11, rng);
    carrotTop(d, { x: 250, y: 50 }, 8, rng);
    marigold(d, { x: 300, y: 50 }, 7, rng);
    for (let i = 0; i < 6; i++) seedling(d, { x: 340 + i * 12, y: 50 }, 4.5, rng);
    beanRow(d, { x: 40, y: 140 }, { x: 600, y: 140 }, 22, rng);
  });
}
const meadowThings = section('meadow', 'meadow things close up: each wildflower, butterflies, a molehill, a fence post, the bench, the stile');
if (meadowThings) {
  figure(meadowThings, 'flowers, butterflies, molehill, post', 360 * 3, 200 * 3, 540, (ctx) => {
    ctx.scale(3, 3);
    ctx.translate(-300, -300);
    drawGround(dr(ctx, 200, 0), 'meadow', 1280, 720, KEEP_NOTHING);
    ctx.translate(300, 300);
    const d = dr(ctx, 300, 0);
    const rng = createRng(31);
    BLOOMS.forEach((kind, i) => bloom(d, kind, { x: 30 + i * 46, y: 40 }, 8, rng));
    [0, 1, 2, 3].forEach((i) => butterfly(d, { x: 40 + i * 60, y: 110 }, -1.2 + i * 0.7, 26, createRng(40 + i * 7)));
    molehill(d, { x: 280, y: 110 }, 16, rng);
    fencePost(d, { x: 320, y: 60 }, 8, rng);
    molehill(d, { x: 300, y: 165 }, 12, rng);
  });
  figure(meadowThings, 'bench and stile', 360 * 2, 200 * 2, 540, (ctx) => {
    ctx.scale(2, 2);
    ctx.translate(-300, -300);
    drawGround(dr(ctx, 200, 0), 'meadow', 1280, 720, KEEP_NOTHING);
    ctx.translate(300, 300);
    const d = dr(ctx, 301, 0);
    bench(d, { x: 90, y: 90 }, { x: 0.24, y: 0.97 }, 74, createRng(5));
    stile(d, { x: 250, y: 100 }, { x: 0.98, y: 0.2 }, 170, createRng(6));
  });
}

// ——— The Ruins (chapter 9): full boards with pillars clear of the grooves, covers, deck, pad and a column close up ———
/** Up to `radii.length` pillar spots clear of the grooves and pads, found the same way every time. */
function pillarsFor(paths: readonly Path[], pads: readonly Pt[], radii: readonly number[]): { x: number; y: number; r: number }[] {
  const rng = createRng(77);
  const out: { x: number; y: number; r: number }[] = [];
  for (const r of radii) {
    for (let t = 0; t < 400; t++) {
      const p = { x: 140 + rng() * 1000, y: 110 + rng() * 500 };
      const nearGroove = paths.some((path) => path.pts.some((q) => Math.hypot(q.x - p.x, q.y - p.y) < r + 20 + 24));
      if (nearGroove || pads.some((q) => Math.hypot(q.x - p.x, q.y - p.y) < r + PAD_R + 30) || out.some((q) => Math.hypot(q.x - p.x, q.y - p.y) < q.r + r + 60)) continue;
      out.push({ ...p, r });
      break;
    }
  }
  return out;
}
const ruinsBoards = section('ruins', 'ruins ground under chapter 3–5 layouts with 3–4 pillars (r 26–40) clear of the grooves, grooves, pads and covers (ART_RES, shown small)');
if (ruinsBoards) {
  for (const level of [CHAPTER_5[2]!, CHAPTER_4[1]!, CHAPTER_3[3]!, CHAPTER_5[4]!]) {
    const W = 1280;
    const H = 720;
    const paths = level.tracks.map((t) => buildPath(t.points));
    const pads = level.shooter.kind === 'hop' ? level.shooter.pads : level.shooter.kind === 'pivot' ? [{ x: level.shooter.x, y: level.shooter.y }] : [];
    const pillars = pillarsFor(paths, pads, [40, 30, 34, 26]);
    let ms = 0;
    const canvas = figure(ruinsBoards, '', W * ART_RES, H * ART_RES, 640, (ctx) => {
      ctx.scale(ART_RES, ART_RES);
      const t = performance.now();
      drawGround(dr(ctx, 600, 0), 'ruins', W, H, { grooves: paths.map((p) => p.pts), pads: level.shooter.kind === 'hop' ? level.shooter.pads : pads, pillars });
      ms = performance.now() - t;
      paths.forEach((p, i) => drawTrack(dr(ctx, 640 + i, 0), p.pts));
      if (level.shooter.kind === 'hop') level.shooter.pads.forEach((p, i) => {
        drawPad(dr(ctx, 700 + i, 0), 'ruins', p.x, p.y);
        drawPadRing(dr(ctx, 720 + i, 0), p.x, p.y, PAD_R);
      });
      const sh = level.shooter;
      if (sh.kind === 'rail') drawBranch(dr(ctx, 680, 0), sh.x0 - 50, sh.x1 + 50, sh.y + 4);
      paths.forEach((p, i) => marblesAlong(ctx, p.pts.slice(0, Math.round(p.pts.length * 0.6)), 900 + i * 50, 9));
      const part = (i: number, c: { from: number; to: number }): Pt[] => stretch(paths[i]!, c.from * paths[i]!.length, c.to * paths[i]!.length);
      level.tracks.forEach((tr, i) => (tr.tunnels ?? []).forEach((c, k) => drawTunnel(dr(ctx, 760 + i * 10 + k, 0), part(i, c), 'ruins')));
      level.tracks.forEach((tr, i) => (tr.raised ?? []).forEach((c, k) => drawRaised(dr(ctx, 800 + i * 10 + k, 0), part(i, c), 'ruins')));
    });
    canvas.parentElement!.querySelector('figcaption')!.textContent = `${level.id} as ruins, ${pillars.length} pillars: ground ${ms.toFixed(0)} ms`;
  }
}
const ruinsCovers = section('ruins', 'ruins close up: fallen lintels on a straight and a tight curve, balustrade bridge over a crossing, column-drum pad, broken columns r 40 / 26 / 14 (dotted ring = the radius shots bounce off)');
if (ruinsCovers) {
  const straight = Array.from({ length: 70 }, (_, i) => ({ x: 70 + i * 4, y: 120 + i * 0.5 }));
  const curve = buildPath(spiralOf(180, 130, 95, 95, 0.5, Math.PI * 0.75, 1, 1, 1)).pts.slice();
  const ground = (ctx: CanvasRenderingContext2D, grooves: readonly (readonly Pt[])[], pillars: { x: number; y: number; r: number }[] = [], ox = 460, oy = 230): void => {
    ctx.translate(-ox, -oy);
    drawGround(dr(ctx, 200, 0), 'ruins', 1280, 720, { grooves: grooves.map((g) => g.map((p) => ({ x: p.x + ox, y: p.y + oy }))), pads: [], pillars: pillars.map((p) => ({ ...p, x: p.x + ox, y: p.y + oy })) });
    ctx.translate(ox, oy);
  };
  for (const [label, pts] of [['straight', straight], ['curve', curve]] as const) {
    figure(ruinsCovers, `lintels ${label}`, 360 * 2, 260 * 2, 420, (ctx) => {
      ctx.scale(2, 2);
      ground(ctx, [pts]);
      drawTrack(dr(ctx, 243, 0), pts);
      marblesAlong(ctx, pts, 250);
      drawTunnel(dr(ctx, 244, 0), pts.slice(Math.round(pts.length * 0.25), Math.round(pts.length * 0.75)), 'ruins');
    });
  }
  figure(ruinsCovers, 'balustrade bridge crossing', 360 * 2, 260 * 2, 420, (ctx) => {
    ctx.scale(2, 2);
    const under = Array.from({ length: 80 }, (_, i) => ({ x: 20 + i * 4, y: 150 + Math.sin(i / 20) * 10 }));
    const over = Array.from({ length: 62 }, (_, i) => ({ x: 150 + i * 1.2, y: 10 + i * 3.8 }));
    ground(ctx, [under, over]);
    drawTrack(dr(ctx, 245, 0), under);
    drawTrack(dr(ctx, 246, 0), over);
    marblesAlong(ctx, under, 260, 9);
    drawTunnel(dr(ctx, 247, 0), under.slice(22, 52), 'ruins');
    const deck = over.slice(8, 54);
    drawRaised(dr(ctx, 248, 0), deck, 'ruins');
    marblesAlong(ctx, deck, 270);
  });
  figure(ruinsCovers, 'columns r 40, 26, 14 beside a groove', 360 * 2, 260 * 2, 420, (ctx) => {
    ctx.scale(2, 2);
    const pts = Array.from({ length: 90 }, (_, i) => ({ x: i * 4, y: 220 + Math.sin(i / 15) * 6 }));
    const cols = [{ x: 90, y: 90, r: 40 }, { x: 230, y: 80, r: 26 }, { x: 300, y: 160, r: 14 }];
    ground(ctx, [pts], cols);
    drawTrack(dr(ctx, 245, 0), pts);
    marblesAlong(ctx, pts, 260, 9);
    for (const c of cols) {
      ctx.save();
      ctx.setLineDash([2, 3]);
      ctx.strokeStyle = 'rgba(200,40,40,0.8)';
      ctx.lineWidth = 0.6;
      ctx.beginPath();
      ctx.arc(c.x, c.y, c.r, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
  });
  figure(ruinsCovers, 'column r 34, big', 160 * 4, 160 * 4, 420, (ctx) => {
    ctx.scale(4, 4);
    ctx.translate(-560, -300);
    drawGround(dr(ctx, 200, 0), 'ruins', 1280, 720, KEEP_NOTHING);
    brokenColumn(dr(ctx, 201, 0), { x: 610, y: 340 }, 34, createRng(5), true);
  });
  for (const withGecko of [false, true]) {
    figure(ruinsCovers, withGecko ? 'drum + gecko' : 'drum', 220 * 3, 220 * 3, 300, framed(220, 3, (ctx) => {
      ctx.translate(-110, -110);
      drawGround(dr(ctx, 200, 0), 'ruins', 1280, 720, { grooves: [], pads: [{ x: 110, y: 110 }] });
      drawPad(dr(ctx, 249, 0), 'ruins', 110, 110);
      drawPadRing(dr(ctx, 250, 0), 110, 110, PAD_R);
      ctx.translate(110, 110);
      if (withGecko) loadedGecko(ctx, 'yellow', 'purple', 1);
    }));
  }
}

// ——— The Night Garden (chapter 10): full boards (plain and under a stand-in darkness), covers, deck, pad, lantern close up ———
/** A stand-in for the game's darkness: the board dimmed but for pools of light round `lights` (x, y, radius). */
function darkness(ctx: CanvasRenderingContext2D, W: number, H: number, lights: readonly (readonly [number, number, number])[]): void {
  const layer = makeCanvas(W * ART_RES, H * ART_RES);
  const c = layer.ctx;
  c.scale(ART_RES, ART_RES);
  c.fillStyle = 'rgba(6,9,20,0.86)';
  c.fillRect(0, 0, W, H);
  c.globalCompositeOperation = 'destination-out';
  for (const [x, y, r] of lights) {
    const g = c.createRadialGradient(x, y, r * 0.35, x, y, r);
    g.addColorStop(0, 'rgba(0,0,0,1)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    c.fillStyle = g;
    c.fillRect(x - r, y - r, r * 2, r * 2);
  }
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.drawImage(layer.canvas, 0, 0);
  ctx.restore();
}
placeBoard('night', 10000);
const nightBoards = section('night', 'night ground under chapter 3–5 layouts, with grooves, pads, covers and lanterns by the wells; the second of each pair under a stand-in darkness (ART_RES, shown small)');
if (nightBoards) {
  for (const level of [CHAPTER_5[2]!, CHAPTER_4[1]!, CHAPTER_3[3]!, CHAPTER_5[4]!]) {
    const W = 1280;
    const H = 720;
    const paths = level.tracks.map((t) => buildPath(t.points));
    const pads = level.shooter.kind === 'hop' ? level.shooter.pads : [];
    for (const dark of [false, true]) {
      let ms = 0;
      const canvas = figure(nightBoards, '', W * ART_RES, H * ART_RES, 640, (ctx) => {
        ctx.scale(ART_RES, ART_RES);
        const t = performance.now();
        drawGround(dr(ctx, 600, 0), 'night', W, H, { grooves: paths.map((p) => p.pts), pads });
        paths.forEach((p, i) => drawTrack(dr(ctx, 640 + i, 0), p.pts, 'night'));
        pads.forEach((p, i) => {
          drawPad(dr(ctx, 700 + i, 0), 'night', p.x, p.y);
          drawPadRing(dr(ctx, 720 + i, 0), p.x, p.y, PAD_R);
        });
        ms = performance.now() - t;
        const sh = level.shooter;
        if (sh.kind === 'rail') drawBranch(dr(ctx, 680, 0), sh.x0 - 50, sh.x1 + 50, sh.y + 4);
        paths.forEach((p, i) => marblesAlong(ctx, p.pts.slice(0, Math.round(p.pts.length * 0.6)), 900 + i * 50, 9));
        const part = (i: number, c: { from: number; to: number }): Pt[] => stretch(paths[i]!, c.from * paths[i]!.length, c.to * paths[i]!.length);
        level.tracks.forEach((tr, i) => (tr.tunnels ?? []).forEach((c, k) => drawTunnel(dr(ctx, 760 + i * 10 + k, 0), part(i, c), 'night')));
        level.tracks.forEach((tr, i) => (tr.raised ?? []).forEach((c, k) => drawRaised(dr(ctx, 800 + i * 10 + k, 0), part(i, c), 'night')));
        const lights: [number, number, number][] = [];
        paths.forEach((p) => {
          const end = p.pts[p.pts.length - 1]!;
          ctx.save();
          ctx.translate(end.x, end.y);
          drawWell(dr(ctx, 77, 0));
          ctx.translate(-62, -40);
          drawGardenLantern(dr(ctx, 78, 0), true);
          ctx.restore();
          lights.push([end.x, end.y, 150], [p.pts[0]!.x, p.pts[0]!.y, 110]);
        });
        const g = sh.kind === 'hop' ? sh.pads[0]! : sh.kind === 'pivot' ? { x: sh.x, y: sh.y } : { x: (sh.x0 + sh.x1) / 2, y: sh.y };
        ctx.save();
        ctx.translate(g.x, g.y);
        loadedGecko(ctx, 'teal', 'red', 0);
        ctx.restore();
        lights.push([g.x, g.y, 230]);
        if (dark) darkness(ctx, W, H, lights);
      });
      canvas.parentElement!.querySelector('figcaption')!.textContent = `${level.id} as night${dark ? ' (dark)' : ''}: ground + grooves + pads ${ms.toFixed(0)} ms`;
    }
  }
}
const nightCovers = section('night', 'night close up: yew hedge arch on a straight and a tight curve, moon bridge over a crossing, moonlit stepping stone, lanterns');
if (nightCovers) {
  const straight = Array.from({ length: 70 }, (_, i) => ({ x: 70 + i * 4, y: 120 + i * 0.5 }));
  const curve = buildPath(spiralOf(180, 130, 95, 95, 0.5, Math.PI * 0.75, 1, 1, 1)).pts.slice();
  const ground = (ctx: CanvasRenderingContext2D, grooves: readonly (readonly Pt[])[], ox = 460, oy = 230): void => {
    ctx.translate(-ox, -oy);
    drawGround(dr(ctx, 200, 0), 'night', 1280, 720, { grooves: grooves.map((g) => g.map((p) => ({ x: p.x + ox, y: p.y + oy }))), pads: [] });
    ctx.translate(ox, oy);
  };
  for (const [label, pts] of [['straight', straight], ['curve', curve]] as const) {
    figure(nightCovers, `yew arch ${label}`, 360 * 2, 260 * 2, 420, (ctx) => {
      ctx.scale(2, 2);
      ground(ctx, [pts]);
      drawTrack(dr(ctx, 243, 0), pts, 'night');
      marblesAlong(ctx, pts, 250);
      drawTunnel(dr(ctx, 244, 0), pts.slice(Math.round(pts.length * 0.25), Math.round(pts.length * 0.75)), 'night');
    });
  }
  figure(nightCovers, 'moon bridge crossing', 360 * 2, 260 * 2, 420, (ctx) => {
    ctx.scale(2, 2);
    const under = Array.from({ length: 80 }, (_, i) => ({ x: 20 + i * 4, y: 150 + Math.sin(i / 20) * 10 }));
    const over = Array.from({ length: 62 }, (_, i) => ({ x: 150 + i * 1.2, y: 10 + i * 3.8 }));
    ground(ctx, [under, over]);
    drawTrack(dr(ctx, 245, 0), under, 'night');
    drawTrack(dr(ctx, 246, 0), over, 'night');
    marblesAlong(ctx, under, 260, 9);
    drawTunnel(dr(ctx, 247, 0), under.slice(22, 52), 'night');
    const deck = over.slice(8, 54);
    drawRaised(dr(ctx, 248, 0), deck, 'night');
    marblesAlong(ctx, deck, 270);
  });
  for (const withGecko of [false, true]) {
    figure(nightCovers, withGecko ? 'stepping stone + gecko' : 'stepping stone', 220 * 3, 220 * 3, 300, framed(220, 3, (ctx) => {
      ctx.translate(-110, -110);
      drawGround(dr(ctx, 200, 0), 'night', 1280, 720, { grooves: [], pads: [{ x: 110, y: 110 }] });
      drawPad(dr(ctx, 249, 0), 'night', 110, 110);
      drawPadRing(dr(ctx, 250, 0), 110, 110, PAD_R);
      ctx.translate(110, 110);
      if (withGecko) loadedGecko(ctx, 'yellow', 'purple', 1);
    }));
  }
  for (const lit of [true, false]) {
    for (let f = 0; f < 2; f++) figure(nightCovers, `garden lantern ${lit ? 'lit' : 'unlit'} f${f}`, GARDEN_LANTERN_FRAME * 3, GARDEN_LANTERN_FRAME * 3, 200, framed(GARDEN_LANTERN_FRAME, 3, (ctx) => {
      ctx.fillStyle = '#3b5361';
      ctx.fillRect(-GARDEN_LANTERN_FRAME / 2, -GARDEN_LANTERN_FRAME / 2, GARDEN_LANTERN_FRAME, GARDEN_LANTERN_FRAME);
      drawGardenLantern(dr(ctx, 90 + f, f), lit);
    }));
  }
  figure(nightCovers, 'lantern charm on marbles and token, game size', 6 * 40 * 3 + 60 * 3, 48 * 3, (6 * 40 + 60) * 1.2, (ctx) => {
    ctx.scale(3, 3);
    COLOURS.forEach((c, i) => {
      ctx.save();
      ctx.translate(20 + i * 40, 24);
      drawMarble(dr(ctx, 20 + i, 0), c);
      drawCharmMark(dr(ctx, 30 + i, 0), 'lantern');
      ctx.restore();
    });
    ctx.save();
    ctx.translate(6 * 40 + 30, 24);
    drawCharmToken(dr(ctx, 40, 0), 'lantern');
    ctx.restore();
  });
}
