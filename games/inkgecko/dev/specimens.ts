import { drawGeckoLines, drawGeckoSkin, GECKO_FRAME, GECKO_MOUTH, GECKO_RES, GECKO_TAIL, type GeckoPose } from '../src/art/geckoArt';
import { DRAGONFLY_FRAME, drawDragonfly } from '../src/art/dragonflyArt';
import { makeDraw, type Draw } from '../src/art/kit';
import { drawCharmMark, drawCharmToken, drawMarble, drawSplash, MARBLE_FRAME, MARBLE_R, MARBLE_RES, SPLASH_FRAME, TOKEN_FRAME } from '../src/art/marbleArt';
import { ART_RES, BOIL } from '../src/art/palette';
import { makeCanvas, type Pt } from '../src/art/pen';
import { BURROW_FRAME, drawBranch, drawBurrow, drawGarden, drawLilyPad, drawPadRing, drawPond, drawTrack, drawTunnel, drawWell, PAD_R, WELL_FRAME } from '../src/art/placesArt';
import { KEEP_NOTHING, type PondKeep, pondReach } from '../src/art/pond';
import { CHAPTER_2 } from '../src/level/chapter2';
import { line, spiral as spiralOf } from '../src/level/shapes';
import { buildPath, type Path } from '../src/logic/path';
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
