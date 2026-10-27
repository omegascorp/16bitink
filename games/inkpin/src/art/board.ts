import type { DrainDef, LevelDef, Room, VineDef } from '../logic/level';
import { createRng, type Rng } from '../logic/rng';
import { ART_RES, GOLD, GOLD_DARK, GRASS, INK, MOSS, PAPER, ROCK, ROCK_DARK, TEMPLE, TEMPLE_DARK, WOOD_DARK } from './palette';
import { ellipse, makeCanvas, Pen, type Pt } from './pen';
import { mix, rgba } from './wash';

/**
 * The world around and behind a level. The rock, the sky and the grass are
 * seamless tiles the scene repeats across the whole screen, so wide screens
 * show more garden and rock, never bare paper. The level's own board is
 * transparent except for what's cut into the rock: the rooms, their brick
 * walls and ink outline, and the stone bars.
 */

/** The ground line, in board px. */
export const GROUND_Y = 292;
/** Rock tile size, in board px. */
export const ROCK_TILE = 512;
/** Sky tile: its width, and how far above the ground it reaches. */
export const SKY_TILE_W = 1024;
export const SKY_H = 700;
/** Grass strip tile, centred on the ground line. */
export const GRASS_TILE_W = 256;
export const GRASS_H = 56;

/** Draws `draw` at every offset by the tile size, so anything crossing an edge wraps round. */
function wrapped(w: number, h: number, draw: (dx: number, dy: number) => void): void {
  for (const dx of [-w, 0, w]) for (const dy of h > 0 ? [-h, 0, h] : [0]) draw(dx, dy);
}

export function paintRockTile(): HTMLCanvasElement {
  const T = ROCK_TILE;
  const { canvas, ctx } = makeCanvas(T * ART_RES, T * ART_RES);
  ctx.scale(ART_RES, ART_RES);
  const rng = createRng(11);
  ctx.fillStyle = mix(PAPER, ROCK, 0.82);
  ctx.fillRect(0, 0, T, T);
  // Soft strata: long, faint bands of a darker wash.
  for (let i = 0; i < 7; i++) {
    const y = rng() * T;
    const h = 18 + rng() * 40;
    const a = 0.05 + rng() * 0.07;
    wrapped(T, T, (dx, dy) => {
      const g = ctx.createLinearGradient(0, y + dy - h, 0, y + dy + h);
      g.addColorStop(0, rgba(ROCK_DARK, 0));
      g.addColorStop(0.5, rgba(ROCK_DARK, a));
      g.addColorStop(1, rgba(ROCK_DARK, 0));
      ctx.fillStyle = g;
      ctx.fillRect(dx, y + dy - h, T, h * 2);
    });
  }
  // Watercolour blooms, light and dark, as pools of wash dry on paper.
  for (let i = 0; i < 30; i++) {
    const x = rng() * T;
    const y = rng() * T;
    const r = 30 + rng() * 80;
    const dark = rng() < 0.7;
    const a = dark ? 0.1 + rng() * 0.12 : 0.18;
    const c = dark ? ROCK_DARK : '#fff8e8';
    wrapped(T, T, (dx, dy) => {
      const g = ctx.createRadialGradient(x + dx, y + dy, 0, x + dx, y + dy, r);
      g.addColorStop(0, rgba(c, a));
      g.addColorStop(0.75, rgba(c, a * 0.4));
      g.addColorStop(1, rgba(c, 0));
      ctx.fillStyle = g;
      ctx.fillRect(x + dx - r, y + dy - r, r * 2, r * 2);
    });
  }
  const pen = new Pen(ctx, 23, 0.6);
  // Pebbles: lit from the top left, with a cast shadow.
  for (let i = 0; i < 46; i++) {
    const x = rng() * T;
    const y = rng() * T;
    const rx = 3 + rng() * 10;
    const ry = rx * (0.55 + rng() * 0.3);
    const tint = mix(ROCK, ROCK_DARK, 0.2 + rng() * 0.5);
    const tilt = (rng() - 0.5) * 0.6;
    wrapped(T, T, (dx, dy) => pebble(pen, ctx, x + dx, y + dy, rx, ry, tilt, tint));
  }
  // Fine grit.
  for (let i = 0; i < 1400; i++) {
    const x = rng() * T;
    const y = rng() * T;
    ctx.fillStyle = rgba(INK, 0.18 + rng() * 0.25);
    ctx.beginPath();
    ctx.arc(x, y, 0.35 + rng() * 0.5, 0, Math.PI * 2);
    ctx.fill();
  }
  // A few hairline cracks.
  for (let i = 0; i < 6; i++) {
    const pts: Pt[] = [];
    let x = rng() * T;
    let y = rng() * T;
    for (let k = 0; k < 6; k++) {
      pts.push({ x, y });
      x += 6 + rng() * 10;
      y += (rng() - 0.5) * 12;
    }
    wrapped(T, T, (dx, dy) => pen.hair(pts.map((p) => ({ x: p.x + dx, y: p.y + dy })), 0.8, INK, 0.35));
  }
  return canvas;
}

function pebble(pen: Pen, ctx: CanvasRenderingContext2D, x: number, y: number, rx: number, ry: number, tilt: number, tint: string): void {
  const c = Math.cos(tilt);
  const s = Math.sin(tilt);
  const shape = ellipse(x, y, rx, ry, 14).map((p) => ({ x: x + (p.x - x) * c - (p.y - y) * s, y: y + (p.x - x) * s + (p.y - y) * c }));
  ctx.fillStyle = rgba(ROCK_DARK, 0.3);
  ctx.beginPath();
  ctx.ellipse(x + rx * 0.25, y + ry * 0.45, rx, ry * 0.8, tilt, 0, Math.PI * 2);
  ctx.fill();
  const g = ctx.createRadialGradient(x - rx * 0.4, y - ry * 0.5, 0, x, y, rx * 1.2);
  g.addColorStop(0, mix(tint, '#ffffff', 0.35));
  g.addColorStop(1, mix(tint, ROCK_DARK, 0.35));
  ctx.fillStyle = g;
  ctx.beginPath();
  shape.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
  ctx.closePath();
  ctx.fill();
  pen.stroke([...shape, shape[0]!], 0.9, INK, 0.6, false);
}

/** The sky above the garden: a pale watercolour wash with soft clouds. Drawn at 1 texel per board px: it's all soft. */
export function paintSkyTile(): HTMLCanvasElement {
  const W = SKY_TILE_W;
  const H = SKY_H;
  const { canvas, ctx } = makeCanvas(W, H);
  ctx.fillStyle = PAPER;
  ctx.fillRect(0, 0, W, H);
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, rgba('#8fb9d8', 0.55));
  g.addColorStop(0.7, rgba('#b9d5e6', 0.45));
  g.addColorStop(1, rgba('#e3eef0', 0.4));
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  const rng = createRng(77);
  for (let i = 0; i < 9; i++) {
    const cx = rng() * W;
    const cy = H * 0.3 + rng() * H * 0.55;
    const w = 60 + rng() * 90;
    const seed = Math.floor(rng() * 1e6);
    wrapped(W, 0, (dx) => cloud(ctx, createRng(seed), cx + dx, cy, w));
  }
  return canvas;
}

function cloud(ctx: CanvasRenderingContext2D, rng: Rng, cx: number, cy: number, w: number): void {
  for (let k = 0; k < 6; k++) {
    const x = cx + (rng() - 0.5) * w;
    const y = cy + (rng() - 0.5) * w * 0.25;
    const r = w * (0.25 + rng() * 0.2);
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, 'rgba(255,255,255,0.7)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }
}

/** The grass verge along the ground line, with tufts and the odd flower. Centred on GROUND_Y. */
export function paintGrassTile(): HTMLCanvasElement {
  const W = GRASS_TILE_W;
  const H = GRASS_H;
  const { canvas, ctx } = makeCanvas(W * ART_RES, H * ART_RES);
  ctx.scale(ART_RES, ART_RES);
  const pen = new Pen(ctx, 41, 0.5);
  const mid = H / 2;
  const g = ctx.createLinearGradient(0, mid - 8, 0, mid + 12);
  g.addColorStop(0, rgba(GRASS, 0.95));
  g.addColorStop(1, rgba(mix(GRASS, ROCK_DARK, 0.5), 0.85));
  ctx.fillStyle = g;
  ctx.fillRect(0, mid - 6, W, 16);
  const rng = createRng(31);
  for (let x = 0; x < W; x += 3 + rng() * 4) {
    const lean = (rng() - 0.5) * 7;
    const tall = 7 + rng() * 13;
    const shade = mix(GRASS, INK, 0.2 + rng() * 0.35);
    wrapped(W, 0, (dx) => pen.hair([{ x: x + dx, y: mid + 4 }, { x: x + dx + lean * 0.4, y: mid - tall * 0.5 }, { x: x + dx + lean, y: mid - tall }], 1.1, shade, 0.85));
  }
  // Jungle ferns: arching fronds with paired leaflets.
  for (let i = 0; i < 2; i++) {
    const fx = 40 + i * 120 + rng() * 40;
    for (const dir of [-1, 1]) {
      const stem: Pt[] = [];
      for (let t = 0; t <= 1.0001; t += 0.125) stem.push({ x: fx + dir * t * 22, y: mid + 4 - Math.sin(t * Math.PI * 0.8) * 18 });
      pen.hair(stem, 1, mix(GRASS, INK, 0.5), 0.9);
      for (let k = 1; k < stem.length; k++) {
        const p = stem[k]!;
        const size = 6 * (1 - k / stem.length) + 2;
        for (const side of [-1, 1]) pen.fill([p, { x: p.x + dir * size * 0.4, y: p.y + side * size }, { x: p.x + dir * size, y: p.y + side * size * 0.3 }], mix(GRASS, '#2f4a22', 0.2 + (k % 2) * 0.15), 0.95);
      }
    }
  }
  for (let i = 0; i < 3; i++) {
    const x = 20 + rng() * (W - 40);
    const color = ['#e7b8c8', '#f4e19a', '#ffffff'][i % 3]!;
    pen.hair([{ x, y: mid + 2 }, { x: x + 1, y: mid - 14 }], 1, mix(GRASS, INK, 0.4), 0.9);
    for (let p = 0; p < 5; p++) {
      const a = (p / 5) * Math.PI * 2;
      pen.dot(x + 1 + Math.cos(a) * 2.6, mid - 15 + Math.sin(a) * 2.6, 1.9, color);
    }
    pen.dot(x + 1, mid - 15, 1.3, '#d9a43a');
  }
  ctx.strokeStyle = rgba(INK, 0.7);
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.moveTo(0, mid + 9);
  ctx.lineTo(W, mid + 9);
  ctx.stroke();
  return canvas;
}

/** The level's board: transparent except for the rooms cut into the rock and what's in them. */
export function paintBoard(level: LevelDef): HTMLCanvasElement {
  const { x: vx, y: vy, w, h } = level.view;
  const { canvas, ctx } = makeCanvas(Math.round(w * ART_RES), Math.round(h * ART_RES));
  ctx.scale(ART_RES, ART_RES);
  ctx.translate(-vx, -vy);
  const pen = new Pen(ctx, 7, 0.7);
  paintTempleTop(ctx, pen, level.rooms);
  paintRooms(ctx, pen, level.rooms, vy + h);
  for (const d of level.drains ?? []) paintDrain(ctx, pen, level.rooms, d);
  for (const i of level.bars) {
    const s = level.walls[i];
    if (s) paintBar(ctx, pen, s.ax, s.ay, s.bx, s.by, s.t);
  }
  for (const t of level.torches) paintTorchBracket(ctx, pen, t.x, t.y);
  // Hanging vines for decoration only where there are none to climb, so the two are never confused.
  if (!level.vines?.length) paintVines(pen, level.rooms);
  (level.vines ?? []).forEach((v, i) => paintClimbingVine(ctx, pen, v, i));
  return canvas;
}

/** A drain: a dark hole under an iron grate, wherever its box shows inside the rooms. */
function paintDrain(ctx: CanvasRenderingContext2D, pen: Pen, rooms: readonly Room[], d: DrainDef): void {
  ctx.save();
  ctx.clip(roomPath(rooms));
  const g = ctx.createLinearGradient(0, d.y0, 0, d.y1);
  g.addColorStop(0, '#2a2420');
  g.addColorStop(1, '#0e0c0b');
  ctx.fillStyle = g;
  ctx.fillRect(d.x0, d.y0, d.x1 - d.x0, d.y1 - d.y0);
  // Rusty iron bars across it, and a frame.
  for (let x = d.x0 + 6; x < d.x1 - 2; x += 9) {
    pen.hair([{ x, y: d.y0 }, { x, y: d.y1 }], 2.4, '#4d4a52', 1);
    pen.hair([{ x: x - 0.8, y: d.y0 }, { x: x - 0.8, y: d.y1 }], 0.8, '#8a8690', 0.8);
  }
  pen.hair([{ x: d.x0, y: d.y0 + 3 }, { x: d.x1, y: d.y0 + 3 }], 2.6, '#4d4a52', 1);
  ctx.restore();
}

/**
 * A vine Nib climbs: two thick strands twisted round each other from a knot
 * at the ledge down to the floor, with broad leaves, so it reads as a rope
 * to grab, not as decoration.
 */
function paintClimbingVine(ctx: CanvasRenderingContext2D, pen: Pen, v: VineDef, seed: number): void {
  const rng = createRng(70 + seed);
  const top = v.top - 30;
  const len = v.bottom - top;
  const strand = (phase: number): Pt[] => {
    const pts: Pt[] = [];
    for (let y = 0; y <= len; y += 6) pts.push({ x: v.x + Math.sin(y / 22 + phase) * 4.5, y: top + y });
    return pts;
  };
  const dark = mix(MOSS, INK, 0.45);
  for (const phase of [0, Math.PI]) {
    const pts = strand(phase);
    pen.stroke(pts, 4.6, INK, 0.9, false);
    pen.stroke(pts, 3.2, phase ? dark : mix(MOSS, INK, 0.2), 1, false);
  }
  // Leaves in pairs down its length, bigger towards the bottom.
  for (let y = 14; y < len - 6; y += 20 + rng() * 10) {
    const side = rng() < 0.5 ? -1 : 1;
    const s = 6 + (y / len) * 4;
    const p = { x: v.x + Math.sin(y / 22) * 4.5, y: top + y };
    const leaf = [p, { x: p.x + side * s, y: p.y - s * 0.6 }, { x: p.x + side * s * 1.8, y: p.y + s * 0.2 }, { x: p.x + side * s * 0.8, y: p.y + s * 0.5 }];
    pen.fill(leaf, rng() < 0.5 ? MOSS : mix(MOSS, '#ffffff', 0.22), 1);
    pen.stroke([...leaf, leaf[0]!], 0.8, INK, 0.75, false);
    pen.hair([p, { x: p.x + side * s * 1.4, y: p.y }], 0.6, dark, 0.7);
  }
  // The knot where it's tied off at the top.
  ctx.fillStyle = mix(MOSS, INK, 0.3);
  ctx.beginPath();
  ctx.arc(v.x, top, 5.5, 0, Math.PI * 2);
  ctx.fill();
  pen.circle(v.x, top, 5.5, 1.2, INK);
}

function roomPath(rooms: readonly Room[]): Path2D {
  const path = new Path2D();
  for (const room of rooms) {
    room.forEach(([x, y], i) => (i === 0 ? path.moveTo(x, y) : path.lineTo(x, y)));
    path.closePath();
  }
  return path;
}

function paintRooms(ctx: CanvasRenderingContext2D, pen: Pen, rooms: readonly Room[], bottom: number): void {
  const union = roomPath(rooms);
  // A rim of shade cut into the rock, then the ink outline; the room fill goes
  // over both, so only their outer halves show and shared edges vanish.
  ctx.save();
  ctx.lineJoin = 'round';
  ctx.strokeStyle = rgba(ROCK_DARK, 0.45);
  ctx.lineWidth = 22;
  ctx.stroke(union);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 9;
  ctx.stroke(union);
  ctx.restore();
  ctx.fillStyle = TEMPLE;
  ctx.fill(union);
  ctx.save();
  ctx.clip(union);
  paintTempleStone(ctx, pen, bottom);
  paintFrieze(ctx, pen, rooms);
  // Depth: soft shade along every edge, and the cellar darker towards the top.
  ctx.lineJoin = 'round';
  for (let k = 0; k < 4; k++) {
    ctx.strokeStyle = rgba(ROCK_DARK, 0.09);
    ctx.lineWidth = 40 - k * 9;
    ctx.stroke(union);
  }
  const shade = ctx.createLinearGradient(0, 300, 0, Math.min(bottom, 1240));
  shade.addColorStop(0, rgba('#5b4a3a', 0.1));
  shade.addColorStop(1, rgba('#5b4a3a', 0));
  ctx.fillStyle = shade;
  ctx.fillRect(-40, 300, 840, bottom - 300);
  ctx.restore();
  for (const room of rooms) {
    // Cobwebs in the top corners of the tall rooms.
    const ys = room.map(([, y]) => y);
    const top = Math.min(...ys);
    const xs = room.filter(([, y]) => y === top).map(([x]) => x);
    if (xs.length < 2 || Math.max(...ys) - top < 400) continue;
    cobweb(pen, Math.min(...xs) + 6, top + 6, 1);
    cobweb(pen, Math.max(...xs) - 6, top + 6, -1);
  }
  // A wobbly second pass over the outline, for the hand.
  for (const room of rooms) {
    room.forEach(([x, y], i) => {
      const [nx, ny] = room[(i + 1) % room.length]!;
      pen.hair([{ x, y }, { x: (x + nx) / 2, y: (y + ny) / 2 }, { x: nx, y: ny }], 1.6, INK, 0.45);
    });
  }
}

/**
 * The temple's walls: big dressed stone blocks in courses of different
 * heights, each with its own wash, a lit top edge and a shaded bottom one,
 * a few cracked, and moss creeping over the lower ones.
 */
function paintTempleStone(ctx: CanvasRenderingContext2D, pen: Pen, bottom: number): void {
  const rng = createRng(5);
  let y = 300;
  while (y < bottom + 30) {
    const bh = 34 + Math.floor(rng() * 3) * 8;
    let x = -40 - rng() * 60;
    while (x < 780) {
      const bw = 56 + rng() * 70;
      const t = rng();
      const base = t < 0.15 ? mix(TEMPLE, TEMPLE_DARK, 0.55) : mix(TEMPLE, TEMPLE_DARK, t * 0.3);
      const g = ctx.createLinearGradient(0, y, 0, y + bh);
      g.addColorStop(0, mix(base, '#ffffff', 0.22));
      g.addColorStop(1, mix(base, TEMPLE_DARK, 0.4));
      ctx.fillStyle = g;
      ctx.fillRect(x + 2, y + 2, bw - 4, bh - 4);
      // Lit top edge, shaded bottom and right: a dressed block.
      ctx.fillStyle = rgba('#ffffff', 0.35);
      ctx.fillRect(x + 3, y + 3, bw - 6, 2);
      ctx.fillStyle = rgba('#4a3c2c', 0.22);
      ctx.fillRect(x + 3, y + bh - 5, bw - 6, 3);
      ctx.fillRect(x + bw - 5, y + 3, 3, bh - 6);
      pen.hair([{ x: x + 2, y: y + bh - 1 }, { x: x + bw - 2, y: y + bh - 0.5 }], 1, INK, 0.45);
      pen.hair([{ x: x + bw - 1, y: y + 2 }, { x: x + bw - 1.5, y: y + bh - 2 }], 1, INK, 0.45);
      if (rng() < 0.12) pen.hair([{ x: x + bw * 0.3, y: y + 4 }, { x: x + bw * 0.38, y: y + bh * 0.5 }, { x: x + bw * 0.33, y: y + bh - 4 }], 0.8, INK, 0.45);
      // Pits and wear.
      for (let k = 0; k < 3; k++) pen.dot(x + 6 + rng() * (bw - 12), y + 6 + rng() * (bh - 12), 0.7 + rng() * 0.8, rgba(TEMPLE_DARK, 0.7));
      // Moss, more of it low down where the damp is.
      if (rng() < (y > 900 ? 0.45 : 0.15)) moss(ctx, pen, rng, x + rng() * bw, y + bh - 4, 10 + rng() * 18);
      x += bw;
    }
    y += bh;
  }
}

function moss(ctx: CanvasRenderingContext2D, pen: Pen, rng: Rng, x: number, y: number, w: number): void {
  for (let k = 0; k < 7; k++) {
    const px = x + (rng() - 0.5) * w;
    const py = y - rng() * w * 0.4;
    const r = 2.5 + rng() * 4;
    const g = ctx.createRadialGradient(px, py, 0, px, py, r);
    g.addColorStop(0, rgba(MOSS, 0.75));
    g.addColorStop(1, rgba(MOSS, 0));
    ctx.fillStyle = g;
    ctx.fillRect(px - r, py - r, r * 2, r * 2);
  }
  pen.stipple([{ x: x - w / 2, y: y - w * 0.5 }, { x: x + w / 2, y: y - w * 0.5 }, { x: x + w / 2, y: y + 2 }, { x: x - w / 2, y: y + 2 }], 18, () => 0.7, 0.5, mix(MOSS, INK, 0.5));
}

/**
 * A band of carved glyphs along the top of each tall room: spirals, eyes,
 * steps and suns, made up for this temple (not any real script).
 */
function paintFrieze(ctx: CanvasRenderingContext2D, pen: Pen, rooms: readonly Room[]): void {
  for (const room of rooms) {
    const xs = room.map(([x]) => x);
    const ys = room.map(([, y]) => y);
    const top = Math.min(...ys);
    if (Math.max(...ys) - top < 400) continue;
    const x0 = Math.min(...xs);
    const x1 = Math.max(...xs);
    const y0 = top + 46;
    const h = 30;
    ctx.fillStyle = rgba(TEMPLE_DARK, 0.35);
    ctx.fillRect(x0, y0, x1 - x0, h);
    pen.hair([{ x: x0, y: y0 }, { x: x1, y: y0 }], 1.2, INK, 0.55);
    pen.hair([{ x: x0, y: y0 + h }, { x: x1, y: y0 + h }], 1.2, INK, 0.55);
    let k = 0;
    for (let x = x0 + 22; x < x1 - 14; x += 34, k++) glyph(pen, x, y0 + h / 2, k % 4);
  }
}

function glyph(pen: Pen, x: number, y: number, kind: number): void {
  const c = mix(TEMPLE_DARK, INK, 0.45);
  if (kind === 0) {
    const sp: Pt[] = [];
    for (let a = 0; a < Math.PI * 4; a += 0.35) sp.push({ x: x + Math.cos(a) * a * 0.85, y: y + Math.sin(a) * a * 0.85 });
    pen.hair(sp, 1.3, c, 0.85);
  } else if (kind === 1) {
    pen.hair([...ellipse(x, y, 10, 5, 16), ellipse(x, y, 10, 5, 16)[0]!], 1.3, c, 0.85);
    pen.dot(x, y, 2.4, c, 0.85);
  } else if (kind === 2) {
    pen.hair([{ x: x - 10, y: y + 7 }, { x: x - 10, y: y + 2 }, { x: x - 4, y: y + 2 }, { x: x - 4, y: y - 3 }, { x: x + 2, y: y - 3 }, { x: x + 2, y: y - 8 }, { x: x + 9, y: y - 8 }], 1.3, c, 0.85);
  } else {
    pen.circle(x, y, 4, 1.2, c);
    for (let a = 0; a < 8; a++) pen.hair([{ x: x + Math.cos(a * 0.785) * 6.5, y: y + Math.sin(a * 0.785) * 6.5 }, { x: x + Math.cos(a * 0.785) * 10, y: y + Math.sin(a * 0.785) * 10 }], 1.1, c, 0.85);
  }
}

/** Vines hanging from the ceilings of the tall rooms, with leaves. */
function paintVines(pen: Pen, rooms: readonly Room[]): void {
  const rng = createRng(19);
  for (const room of rooms) {
    const ys = room.map(([, y]) => y);
    const top = Math.min(...ys);
    if (Math.max(...ys) - top < 400) continue;
    const xs = room.filter(([, y]) => y === top).map(([x]) => x);
    const x0 = Math.min(...xs);
    const x1 = Math.max(...xs);
    for (let v = 0; v < 2; v++) {
      const x = x0 + 30 + rng() * (x1 - x0 - 60);
      const len = 70 + rng() * 110;
      const pts: Pt[] = [];
      for (let t = 0; t <= 1.0001; t += 0.1) pts.push({ x: x + Math.sin(t * 5 + v) * 6, y: top + 4 + t * len });
      pen.stroke(pts, 1.8, mix(MOSS, INK, 0.35), 0.95, false);
      for (let i = 1; i < pts.length; i++) {
        const p = pts[i]!;
        const side = i % 2 ? 1 : -1;
        const leaf = [{ x: p.x, y: p.y }, { x: p.x + side * 5, y: p.y - 3 }, { x: p.x + side * 9, y: p.y + 1 }, { x: p.x + side * 4, y: p.y + 3 }];
        pen.fill(leaf, i % 3 ? MOSS : mix(MOSS, '#ffffff', 0.2), 1);
        pen.stroke([...leaf, leaf[0]!], 0.7, INK, 0.7, false);
      }
    }
  }
}

/** An iron torch bracket on the wall; the scene draws the flame on top of it. */
function paintTorchBracket(ctx: CanvasRenderingContext2D, pen: Pen, x: number, y: number): void {
  // Soot on the stone above it.
  const g = ctx.createRadialGradient(x, y - 26, 0, x, y - 26, 22);
  g.addColorStop(0, 'rgba(40,34,30,0.28)');
  g.addColorStop(1, 'rgba(40,34,30,0)');
  ctx.fillStyle = g;
  ctx.fillRect(x - 22, y - 50, 44, 44);
  const stick = [{ x: x - 2.5, y: y - 6 }, { x: x + 2.5, y: y - 6 }, { x: x + 1.6, y: y + 14 }, { x: x - 1.6, y: y + 14 }];
  pen.fill(stick, WOOD_DARK, 1);
  pen.stroke([...stick, stick[0]!], 0.9, INK, 0.9, false);
  pen.fill([{ x: x - 5, y: y - 8 }, { x: x + 5, y: y - 8 }, { x: x + 3.5, y: y - 3 }, { x: x - 3.5, y: y - 3 }], '#4d4a52', 1);
  pen.stroke([{ x: x - 7, y: y + 8 }, { x: x + 7, y: y + 8 }], 2, '#4d4a52', 1, false);
}

/** Straight ink lines through the points, with round joins. */
function straight(ctx: CanvasRenderingContext2D, pts: readonly Pt[], width: number, closed: boolean): void {
  ctx.save();
  ctx.strokeStyle = INK;
  ctx.lineWidth = width;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.beginPath();
  pts.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
  if (closed) ctx.closePath();
  ctx.stroke();
  ctx.restore();
}

/** The top of the temple poking out of the jungle floor above the rooms: two stepped tiers and a broken column. */
function paintTempleTop(ctx: CanvasRenderingContext2D, pen: Pen, rooms: readonly Room[]): void {
  const tall = rooms.filter((r) => {
    const ys = r.map(([, y]) => y);
    return Math.max(...ys) - Math.min(...ys) >= 400;
  });
  if (!tall.length) return;
  const xs = tall.flatMap((r) => r.map(([x]) => x));
  const x0 = Math.min(...xs) - 20;
  const x1 = Math.max(...xs) + 20;
  const tiers = [{ a: x0, b: x1, top: GROUND_Y - 22 }, { a: x0 + 40, b: x1 - 40, top: GROUND_Y - 42 }];
  for (const t of tiers) {
    const shape = [{ x: t.a, y: GROUND_Y + 4 }, { x: t.a, y: t.top }, { x: t.b, y: t.top }, { x: t.b, y: GROUND_Y + 4 }];
    const g = ctx.createLinearGradient(0, t.top, 0, GROUND_Y);
    g.addColorStop(0, mix(TEMPLE, '#ffffff', 0.15));
    g.addColorStop(1, TEMPLE_DARK);
    ctx.fillStyle = g;
    ctx.fillRect(t.a, t.top, t.b - t.a, GROUND_Y + 4 - t.top);
    for (let x = t.a + 30; x < t.b; x += 46) pen.hair([{ x, y: t.top + 2 }, { x: x + 1, y: GROUND_Y }], 1, INK, 0.45);
    straight(ctx, shape, 2, false);
  }
  // A broken column standing on the top tier, and moss along the edges.
  const cx = x0 + 70;
  const ct = GROUND_Y - 42;
  const col = [{ x: cx - 9, y: ct }, { x: cx - 9, y: ct - 40 }, { x: cx - 2, y: ct - 46 }, { x: cx + 3, y: ct - 38 }, { x: cx + 9, y: ct - 44 }, { x: cx + 9, y: ct }];
  const g = ctx.createLinearGradient(cx - 9, 0, cx + 9, 0);
  g.addColorStop(0, mix(TEMPLE, '#ffffff', 0.3));
  g.addColorStop(1, TEMPLE_DARK);
  ctx.fillStyle = g;
  ctx.beginPath();
  col.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
  ctx.closePath();
  ctx.fill();
  for (const fx of [-4, 0, 4]) pen.hair([{ x: cx + fx, y: ct - 2 }, { x: cx + fx, y: ct - 36 }], 0.7, INK, 0.45);
  straight(ctx, col, 1.6, true);
  const rng = createRng(3);
  for (let x = x0; x < x1; x += 18) if (rng() < 0.5) moss(ctx, pen, rng, x, GROUND_Y - 20, 14);
  // A golden glint on the top step: treasure below.
  pen.dot(x1 - 70, GROUND_Y - 46, 2.4, GOLD);
  pen.circle(x1 - 70, GROUND_Y - 46, 2.4, 0.7, GOLD_DARK);
}

function cobweb(pen: Pen, x: number, y: number, dir: number): void {
  const r = 38;
  const spokes = [0.05, 0.4, 0.8, 1.2, 1.52];
  for (const a of spokes) pen.hair([{ x, y }, { x: x + Math.cos(a) * r * dir, y: y + Math.sin(a) * r }], 0.7, INK, 0.35);
  for (const k of [0.35, 0.6, 0.85]) {
    const pts = spokes.map((a) => ({ x: x + Math.cos(a) * r * k * dir, y: y + Math.sin(a) * r * k }));
    for (let i = 0; i < pts.length - 1; i++) {
      const p = pts[i]!;
      const q = pts[i + 1]!;
      // Each thread sags a little towards the corner.
      const sag = { x: (p.x + q.x) / 2 + (x - (p.x + q.x) / 2) * 0.1, y: (p.y + q.y) / 2 + (y - (p.y + q.y) / 2) * 0.1 };
      pen.hair([p, sag, q], 0.6, INK, 0.3);
    }
  }
}

/** A stone bar between two rooms: a rounded slab, lit along one edge, with hatched shade. */
function paintBar(ctx: CanvasRenderingContext2D, pen: Pen, ax: number, ay: number, bx: number, by: number, t: number): void {
  const len = Math.hypot(bx - ax, by - ay);
  const ux = (bx - ax) / len;
  const uy = (by - ay) / len;
  const nx = -uy * t;
  const ny = ux * t;
  // Round caps: half circles behind A and beyond B, joined by the long sides.
  const shape: Pt[] = [];
  for (let i = 0; i <= 8; i++) {
    const th = -Math.PI / 2 + (i / 8) * Math.PI;
    shape.push({ x: ax - ux * t * Math.cos(th) - nx * Math.sin(th), y: ay - uy * t * Math.cos(th) - ny * Math.sin(th) });
  }
  for (let i = 0; i <= 8; i++) {
    const th = -Math.PI / 2 + (i / 8) * Math.PI;
    shape.push({ x: bx + ux * t * Math.cos(th) + nx * Math.sin(th), y: by + uy * t * Math.cos(th) + ny * Math.sin(th) });
  }
  const path = (): void => {
    ctx.beginPath();
    shape.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
    ctx.closePath();
  };
  // A soft shadow on the wall behind it.
  ctx.save();
  ctx.translate(3, 4);
  ctx.fillStyle = rgba('#3d3226', 0.25);
  path();
  ctx.fill();
  ctx.restore();
  const g = ctx.createLinearGradient(ax - nx, ay - ny, ax + nx, ay + ny);
  g.addColorStop(0, mix(ROCK, '#ffffff', 0.3));
  g.addColorStop(1, mix(ROCK, ROCK_DARK, 0.55));
  ctx.fillStyle = g;
  path();
  ctx.fill();
  pen.hatch(shape, 4.5, Math.atan2(uy, ux) + 0.8, 0.7, { color: INK, alpha: 0.22 });
  // Straight outline: the pen's smoothing would overshoot the round caps.
  ctx.save();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2.6;
  ctx.lineJoin = 'round';
  path();
  ctx.stroke();
  ctx.restore();
}
