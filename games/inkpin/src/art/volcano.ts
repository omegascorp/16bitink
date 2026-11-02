import type { Room } from '../logic/level';
import { createRng, type Rng } from '../logic/rng';
import { BASALT, BASALT_DARK, BASALT_LIGHT, EMBER, EMBER_LIGHT, GOLD, GOLD_DARK, INK } from './palette';
import { ellipse, type Pen, type Pt } from './pen';
import { mix, rgba } from './wash';

/**
 * The Volcano Shrine's stone, for the board: black-violet basalt blocks in
 * rough courses, ember-red light leaking through their cracks, carved fire
 * glyphs, a frieze of flames along the top of each tall room, braziers in
 * place of the jungle's torch brackets, and the shrine's roofline poking out
 * of the ash above. The jungle's moss, vines and cobwebs have no place here.
 */

/** The rooms at least this tall get a frieze and sit under the shrine's roof. */
const TALL = 400;

/** The shrine's walls: dark basalt blocks, lit on top, with glowing cracks and the odd carving. */
export function paintBasaltStone(ctx: CanvasRenderingContext2D, pen: Pen, bottom: number, right: number): void {
  const rng = createRng(5);
  let y = 300;
  while (y < bottom + 30) {
    const bh = 30 + Math.floor(rng() * 4) * 8;
    let x = -40 - rng() * 60;
    while (x < right + 60) {
      const bw = 50 + rng() * 80;
      basaltBlock(ctx, pen, rng, x, y, bw, bh);
      x += bw;
    }
    y += bh;
  }
}

function basaltBlock(ctx: CanvasRenderingContext2D, pen: Pen, rng: Rng, x: number, y: number, bw: number, bh: number): void {
  const t = rng();
  const base = t < 0.18 ? mix(BASALT, BASALT_DARK, 0.45) : t > 0.85 ? mix(BASALT, BASALT_LIGHT, 0.35) : mix(BASALT, BASALT_DARK, t * 0.2);
  // A slightly rough-hewn block: its corners chipped, never a ruled box.
  const chip = (): number => 1.5 + rng() * 3;
  const shape: Pt[] = [
    { x: x + 2 + chip(), y: y + 2 }, { x: x + bw - 2 - chip(), y: y + 2 }, { x: x + bw - 2, y: y + 2 + chip() },
    { x: x + bw - 2, y: y + bh - 2 - chip() }, { x: x + bw - 2 - chip(), y: y + bh - 2 }, { x: x + 2 + chip(), y: y + bh - 2 },
    { x: x + 2, y: y + bh - 2 - chip() }, { x: x + 2, y: y + 2 + chip() },
  ];
  const g = ctx.createLinearGradient(x, y, x + bw * 0.4, y + bh);
  g.addColorStop(0, mix(base, BASALT_LIGHT, 0.45));
  g.addColorStop(0.5, base);
  g.addColorStop(1, mix(base, BASALT_DARK, 0.55));
  ctx.fillStyle = g;
  fillPath(ctx, shape);
  // Watercolour mottling: a couple of soft blooms of a cooler and a warmer wash.
  for (let k = 0; k < 2; k++) {
    const px = x + rng() * bw;
    const py = y + rng() * bh;
    const r = 8 + rng() * 16;
    const c = k ? '#6a4a58' : '#3c4660';
    const bloom = ctx.createRadialGradient(px, py, 0, px, py, r);
    bloom.addColorStop(0, rgba(c, 0.28));
    bloom.addColorStop(1, rgba(c, 0));
    ctx.save();
    ctx.clip(pathOf(shape));
    ctx.fillStyle = bloom;
    ctx.fillRect(px - r, py - r, r * 2, r * 2);
    ctx.restore();
  }
  // The lit top edge and the shaded foot, as on dressed stone.
  pen.hair([{ x: x + 4, y: y + 3.2 }, { x: x + bw - 5, y: y + 3 }], 1.6, mix(BASALT_LIGHT, '#ffffff', 0.25), 0.5);
  ctx.fillStyle = rgba('#120e18', 0.3);
  ctx.fillRect(x + 4, y + bh - 5, bw - 8, 3);
  pen.hair([{ x: x + 2, y: y + bh - 1 }, { x: x + bw - 2, y: y + bh - 0.5 }], 1.1, BASALT_DARK, 0.9);
  pen.hair([{ x: x + bw - 1, y: y + 2 }, { x: x + bw - 1.5, y: y + bh - 2 }], 1.1, BASALT_DARK, 0.9);
  // Vesicles: the little gas pits of cooled lava.
  for (let k = 0; k < 4; k++) pen.dot(x + 6 + rng() * (bw - 12), y + 6 + rng() * (bh - 12), 0.6 + rng() * 0.9, rgba(BASALT_DARK, 0.8));
  const roll = rng();
  if (roll < 0.06) emberCrack(ctx, pen, rng, x, y, bw, bh);
  else if (roll < 0.13) fireGlyph(ctx, pen, x + bw / 2, y + bh / 2, Math.min(bh * 0.32, 11), Math.floor(rng() * 3));
  else if (roll < 0.25) pen.hair([{ x: x + bw * 0.3, y: y + 4 }, { x: x + bw * 0.4, y: y + bh * 0.5 }, { x: x + bw * 0.34, y: y + bh - 4 }], 0.8, BASALT_DARK, 0.9);
}

/** A crack with the fire showing through it: a soft red bloom, a hot core line and an ink edge. */
function emberCrack(ctx: CanvasRenderingContext2D, pen: Pen, rng: Rng, x: number, y: number, bw: number, bh: number): void {
  const pts: Pt[] = [];
  let px = x + bw * (0.2 + rng() * 0.3);
  for (let py = y + 3; py <= y + bh - 3; py += 5 + rng() * 4) {
    pts.push({ x: px, y: py });
    px += (rng() - 0.4) * 9;
  }
  if (pts.length < 2) return;
  const mid = pts[Math.floor(pts.length / 2)]!;
  const glow = ctx.createRadialGradient(mid.x, mid.y, 0, mid.x, mid.y, bh * 0.7);
  glow.addColorStop(0, rgba(EMBER, 0.4));
  glow.addColorStop(1, rgba(EMBER, 0));
  ctx.fillStyle = glow;
  ctx.fillRect(mid.x - bh, mid.y - bh, bh * 2, bh * 2);
  pen.hair(pts, 2.6, EMBER, 0.85);
  pen.hair(pts, 1, EMBER_LIGHT, 0.95);
  pen.hair(pts.map((p) => ({ x: p.x - 1.6, y: p.y })), 0.7, BASALT_DARK, 0.9);
}

/**
 * A carved fire glyph, cut into the stone: its shape lit along the lower
 * edge of the cut and shaded along the upper (the light comes from above).
 * Made up for this shrine: a flame, a flame in a ring, a stepped mountain
 * with a flame on top.
 */
function fireGlyph(ctx: CanvasRenderingContext2D, pen: Pen, x: number, y: number, s: number, kind: number): void {
  const cut = (pts: readonly Pt[], w: number): void => {
    pen.hair(pts.map((p) => ({ x: p.x, y: p.y + 0.9 })), w, mix(BASALT_LIGHT, '#ffffff', 0.15), 0.55);
    pen.hair(pts, w, '#17121d', 0.85);
  };
  if (kind === 1) cut([...ellipse(x, y, s * 1.15, s * 1.15, 18), ellipse(x, y, s * 1.15, s * 1.15, 18)[0]!], 1.1);
  if (kind === 2) {
    cut([{ x: x - s * 1.3, y: y + s }, { x: x - s * 0.6, y: y + s * 0.1 }, { x: x - s * 0.2, y: y + s * 0.4 }, { x: x + s * 0.4, y: y - s * 0.3 }, { x: x + s * 1.3, y: y + s }], 1.2);
    flame(cut, x + s * 0.2, y - s * 0.4, s * 0.6);
    return;
  }
  flame(cut, x, y + s * 0.5, kind === 1 ? s * 0.75 : s);
  // A trace of old red paint left in the cut.
  ctx.fillStyle = rgba('#a33a28', 0.22);
  ctx.beginPath();
  ctx.ellipse(x, y, s * 0.6, s * 0.9, 0, 0, Math.PI * 2);
  ctx.fill();
}

/** A three-tongued flame, as a carving draws one: its base at (x, y), `s` tall-ish. */
function flame(cut: (pts: readonly Pt[], w: number) => void, x: number, y: number, s: number): void {
  cut([{ x: x - s * 0.6, y }, { x: x - s * 0.75, y: y - s * 0.6 }, { x: x - s * 0.3, y: y - s * 1.1 }, { x: x - s * 0.15, y: y - s * 0.55 }, { x, y: y - s * 1.6 }, { x: x + s * 0.2, y: y - s * 0.55 }, { x: x + s * 0.4, y: y - s * 1.05 }, { x: x + s * 0.75, y: y - s * 0.55 }, { x: x + s * 0.6, y }, { x: x - s * 0.6, y }], 1.2);
}

/** A carved frieze of flames along the top of each tall room, between two ruled bands. */
export function paintFlameFrieze(ctx: CanvasRenderingContext2D, pen: Pen, rooms: readonly Room[]): void {
  for (const room of rooms) {
    const xs = room.map(([x]) => x);
    const ys = room.map(([, y]) => y);
    const top = Math.min(...ys);
    if (Math.max(...ys) - top < TALL) continue;
    const x0 = Math.min(...xs);
    const x1 = Math.max(...xs);
    const y0 = top + 46;
    const h = 30;
    ctx.fillStyle = rgba(BASALT_DARK, 0.55);
    ctx.fillRect(x0, y0, x1 - x0, h);
    // Old red-ochre paint, worn off in places.
    const rng = createRng(Math.round(x0 * 7 + top));
    for (let x = x0; x < x1; x += 20) {
      ctx.fillStyle = rgba('#9c3626', 0.12 + rng() * 0.14);
      ctx.fillRect(x, y0 + 3, 20, h - 6);
    }
    pen.hair([{ x: x0, y: y0 }, { x: x1, y: y0 }], 1.4, EMBER_LIGHT, 0.35);
    pen.hair([{ x: x0, y: y0 + 1.5 }, { x: x1, y: y0 + 1.5 }], 1.2, INK, 0.7);
    pen.hair([{ x: x0, y: y0 + h }, { x: x1, y: y0 + h }], 1.2, INK, 0.7);
    const cut = (pts: readonly Pt[], w: number): void => {
      pen.hair(pts.map((p) => ({ x: p.x, y: p.y + 0.9 })), w, mix(EMBER_LIGHT, '#ffffff', 0.2), 0.35);
      pen.hair(pts, w, '#17121d', 0.9);
    };
    let k = 0;
    for (let x = x0 + 20; x < x1 - 12; x += 30, k++) {
      if (k % 3 === 2) {
        // A sun-eye between the flames: the Fire Idol watching.
        cut([...ellipse(x, y0 + h / 2, 8, 4.5, 16), ellipse(x, y0 + h / 2, 8, 4.5, 16)[0]!], 1.1);
        pen.dot(x, y0 + h / 2, 2, EMBER, 0.85);
      } else flame(cut, x, y0 + h - 6, 11);
    }
  }
}

/**
 * The shrine's roofline poking out of the ash above the rooms: a basalt
 * plinth, a colonnaded hall glowing from inside, and a long roof with
 * upturned, horned eaves and a fire bowl smoking on its ridge.
 */
export function paintShrineTop(ctx: CanvasRenderingContext2D, pen: Pen, rooms: readonly Room[], groundY: number): void {
  const tall = rooms.filter((r) => {
    const ys = r.map(([, y]) => y);
    return Math.max(...ys) - Math.min(...ys) >= TALL;
  });
  if (!tall.length) return;
  const xs = tall.flatMap((r) => r.map(([x]) => x));
  const x0 = Math.min(...xs) - 20;
  const x1 = Math.max(...xs) + 20;
  // The plinth: one course of big blocks along the ground, and a step.
  const plinthTop = groundY - 10;
  stoneBox(ctx, x0, plinthTop, x1, groundY + 4);
  for (let x = x0 + 34; x < x1; x += 52) pen.hair([{ x, y: plinthTop + 2 }, { x: x + 1, y: groundY }], 1, BASALT_DARK, 0.9);
  straight(ctx, [{ x: x0, y: groundY + 4 }, { x: x0, y: plinthTop }, { x: x1, y: plinthTop }, { x: x1, y: groundY + 4 }], 2);
  // The hall: a dark wall behind a row of pillars, with a glow from inside between them.
  const wa = x0 + 40;
  const wb = x1 - 40;
  const wallTop = plinthTop - 26;
  const inner = ctx.createLinearGradient(0, wallTop, 0, plinthTop);
  inner.addColorStop(0, '#1a1018');
  inner.addColorStop(1, mix(EMBER, '#2a1418', 0.55));
  ctx.fillStyle = inner;
  ctx.fillRect(wa, wallTop, wb - wa, plinthTop - wallTop);
  const bays = Math.max(3, Math.round((wb - wa) / 70));
  for (let k = 0; k <= bays; k++) pillar(ctx, pen, wa + ((wb - wa) * k) / bays, wallTop, plinthTop);
  // A lintel over the pillars, with a band of flame carvings.
  stoneBox(ctx, wa - 6, wallTop - 6, wb + 6, wallTop);
  straight(ctx, [{ x: wa - 6, y: wallTop }, { x: wa - 6, y: wallTop - 6 }, { x: wb + 6, y: wallTop - 6 }, { x: wb + 6, y: wallTop }], 1.3, true);
  // The roof, low enough to show under the top of a level's view, with the fire bowl on its ridge.
  const eave = wallTop - 6;
  roof(ctx, pen, wa - 40, wb + 40, eave, 18);
  fireBowl(ctx, pen, (wa + wb) / 2, eave - 18);
  // A gold glint on the plinth: treasure below.
  pen.dot(x1 - 30, plinthTop - 3, 2.2, GOLD);
  pen.circle(x1 - 30, plinthTop - 3, 2.2, 0.7, GOLD_DARK);
}

/** A basalt block, lit on top, its faces washed dark towards the foot. */
function stoneBox(ctx: CanvasRenderingContext2D, x0: number, y0: number, x1: number, y1: number): void {
  const g = ctx.createLinearGradient(0, y0, 0, y1);
  g.addColorStop(0, mix(BASALT, BASALT_LIGHT, 0.55));
  g.addColorStop(0.3, BASALT);
  g.addColorStop(1, BASALT_DARK);
  ctx.fillStyle = g;
  ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
}

/** A squat basalt pillar with a flared capital and base. */
function pillar(ctx: CanvasRenderingContext2D, pen: Pen, x: number, top: number, foot: number): void {
  const shaft = [{ x: x - 6, y: foot - 4 }, { x: x - 5, y: top + 5 }, { x: x + 5, y: top + 5 }, { x: x + 6, y: foot - 4 }];
  const g = ctx.createLinearGradient(x - 6, 0, x + 6, 0);
  g.addColorStop(0, BASALT_LIGHT);
  g.addColorStop(0.5, BASALT);
  g.addColorStop(1, BASALT_DARK);
  ctx.fillStyle = g;
  ctx.fill(pathOf(shaft));
  ctx.fillRect(x - 9, top, 18, 5);
  ctx.fillRect(x - 9, foot - 4, 18, 4);
  pen.hair([{ x: x - 1.5, y: top + 7 }, { x: x - 1.5, y: foot - 6 }], 0.7, BASALT_DARK, 0.9);
  straight(ctx, shaft, 1.1, false);
  straight(ctx, [{ x: x - 9, y: top + 5 }, { x: x - 9, y: top }, { x: x + 9, y: top }, { x: x + 9, y: top + 5 }], 1, true);
}

/**
 * A roof from a to b, its eave at y and `h` high: a sweep up from the
 * eaves to a flat ridge, the ends turned up into horns, tiled in ribs,
 * with ash lying along the ridge.
 */
function roof(ctx: CanvasRenderingContext2D, pen: Pen, a: number, b: number, eave: number, h: number): void {
  const ridge = eave - h;
  const inset = Math.min(70, (b - a) * 0.18);
  const shape: Pt[] = [
    { x: a - 12, y: eave - 13 }, { x: a - 4, y: eave - 4 }, { x: a + 6, y: eave }, { x: a + inset * 0.5, y: eave - h * 0.35 }, { x: a + inset, y: ridge },
    { x: b - inset, y: ridge }, { x: b - inset * 0.5, y: eave - h * 0.35 }, { x: b - 6, y: eave }, { x: b + 4, y: eave - 4 }, { x: b + 12, y: eave - 13 },
    { x: b + 4, y: eave - 9 }, { x: b - 8, y: eave - 7 }, { x: a + 8, y: eave - 7 }, { x: a - 4, y: eave - 9 },
  ];
  // Drawn back to front: the shape's last points run along under the eave line, so it closes at the horns.
  const body: Pt[] = [shape[0]!, shape[1]!, shape[2]!, shape[3]!, shape[4]!, shape[5]!, shape[6]!, shape[7]!, shape[8]!, shape[9]!, shape[10]!, { x: b - 6, y: eave + 2 }, { x: a + 6, y: eave + 2 }, shape[13]!];
  const g = ctx.createLinearGradient(0, ridge, 0, eave);
  g.addColorStop(0, mix(BASALT, BASALT_LIGHT, 0.6));
  g.addColorStop(1, mix(BASALT, BASALT_DARK, 0.4));
  ctx.fillStyle = g;
  ctx.fill(pathOf(body));
  // Tiles: ribs running down the slope, fanning out at the ends.
  pen.clipped(body, () => {
    for (let x = a + 4; x < b - 4; x += 9) {
      const lean = x < a + inset ? (x - (a + inset)) * 0.25 : x > b - inset ? (x - (b - inset)) * 0.25 : 0;
      pen.hair([{ x: x - lean, y: ridge }, { x, y: eave + 2 }], 0.8, BASALT_DARK, 0.85);
    }
    ctx.fillStyle = rgba(BASALT_DARK, 0.5);
    ctx.fillRect(a - 12, eave - 3, b - a + 24, 6);
  });
  pen.hair([{ x: a + inset, y: ridge + 1.5 }, { x: b - inset, y: ridge + 1.5 }], 3, '#c9c0b8', 0.7);
  pen.stroke([...body, body[0]!], 1.5, INK, 0.95, false);
  // The horns: little gilded finials at the eaves' tips.
  pen.dot(a - 12, eave - 14, 2, GOLD);
  pen.dot(b + 12, eave - 14, 2, GOLD);
}

/** The fire bowl on a ridge, with a lick of flame, a warm glow and a curl of smoke. */
function fireBowl(ctx: CanvasRenderingContext2D, pen: Pen, cx: number, ridge: number): void {
  const glow = ctx.createRadialGradient(cx, ridge - 16, 0, cx, ridge - 16, 40);
  glow.addColorStop(0, rgba(EMBER_LIGHT, 0.6));
  glow.addColorStop(1, rgba(EMBER, 0));
  ctx.fillStyle = glow;
  ctx.fillRect(cx - 40, ridge - 56, 80, 80);
  pen.fill([{ x: cx - 10, y: ridge - 9 }, { x: cx - 6, y: ridge - 22 }, { x: cx - 1, y: ridge - 15 }, { x: cx + 2, y: ridge - 30 }, { x: cx + 6, y: ridge - 16 }, { x: cx + 10, y: ridge - 9 }], '#ec7a2c', 0.95);
  pen.fill([{ x: cx - 5, y: ridge - 9 }, { x: cx + 1, y: ridge - 21 }, { x: cx + 5, y: ridge - 9 }], '#ffd25a', 1);
  const bowl = [{ x: cx - 14, y: ridge - 10 }, { x: cx + 14, y: ridge - 10 }, { x: cx + 8, y: ridge - 1 }, { x: cx - 8, y: ridge - 1 }];
  pen.fill(bowl, '#7a5233', 1);
  pen.fill([{ x: cx - 12, y: ridge - 10 }, { x: cx + 12, y: ridge - 10 }, { x: cx + 11, y: ridge - 7.5 }, { x: cx - 11, y: ridge - 7.5 }], GOLD, 0.85);
  pen.stroke([...bowl, bowl[0]!], 1.1, INK, 0.9, false);
  for (let k = 0; k < 5; k++) {
    const sy = ridge - 38 - k * 14;
    const sx = cx + 4 + k * 6 + Math.sin(k * 1.3) * 5;
    const r = 8 + k * 2.6;
    const puff = ctx.createRadialGradient(sx, sy, 0, sx, sy, r);
    puff.addColorStop(0, rgba('#5d5662', 0.4 - k * 0.05));
    puff.addColorStop(1, rgba('#5d5662', 0));
    ctx.fillStyle = puff;
    ctx.fillRect(sx - r, sy - r, r * 2, r * 2);
  }
}

/**
 * A bronze brazier on a wall bracket; the scene draws the flame on top of
 * it, its base at (x, y - 6), so the bowl's rim sits just under that.
 */
export function paintBrazier(ctx: CanvasRenderingContext2D, pen: Pen, x: number, y: number): void {
  // Soot and heat on the stone above it.
  const g = ctx.createRadialGradient(x, y - 26, 0, x, y - 26, 24);
  g.addColorStop(0, 'rgba(18,12,16,0.45)');
  g.addColorStop(1, 'rgba(18,12,16,0)');
  ctx.fillStyle = g;
  ctx.fillRect(x - 24, y - 52, 48, 48);
  // The bracket: an iron arm from the wall, and a three-legged cradle.
  pen.stroke([{ x, y: y + 16 }, { x, y: y + 2 }], 2.2, '#3a3440', 1, false);
  pen.stroke([{ x: x - 6, y: y + 12 }, { x, y: y + 2 }, { x: x + 6, y: y + 12 }], 1.4, '#3a3440', 1, false);
  pen.fill([{ x: x - 4, y: y + 15 }, { x: x + 4, y: y + 15 }, { x: x + 3, y: y + 18 }, { x: x - 3, y: y + 18 }], '#3a3440', 1);
  // The bowl: bronze, wide-lipped, with coals glowing in its rim.
  const bowl = [{ x: x - 10, y: y - 6 }, { x: x + 10, y: y - 6 }, { x: x + 7, y: y + 1 }, { x: x + 3, y: y + 3 }, { x: x - 3, y: y + 3 }, { x: x - 7, y: y + 1 }];
  const bg = ctx.createLinearGradient(x - 10, 0, x + 10, 0);
  bg.addColorStop(0, '#c08a4a');
  bg.addColorStop(0.45, '#8a5a2e');
  bg.addColorStop(1, '#4e321d');
  ctx.fillStyle = bg;
  fillPath(ctx, bowl);
  pen.hair([{ x: x - 9, y: y - 3 }, { x: x + 9, y: y - 3 }], 0.8, '#3d2616', 0.8);
  pen.stroke([...bowl, bowl[0]!], 1, INK, 0.9, false);
  pen.fill(ellipse(x, y - 6, 9.5, 2.2, 14), '#3a1a12', 1);
  for (const cx of [-5, -1.5, 2.5, 6]) pen.dot(x + cx, y - 6.4, 1.5, cx % 2 ? EMBER : EMBER_LIGHT, 0.95);
}

function straight(ctx: CanvasRenderingContext2D, pts: readonly Pt[], width: number, closed = false): void {
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

function pathOf(pts: readonly Pt[]): Path2D {
  const p = new Path2D();
  pts.forEach((q, i) => (i === 0 ? p.moveTo(q.x, q.y) : p.lineTo(q.x, q.y)));
  p.closePath();
  return p;
}

function fillPath(ctx: CanvasRenderingContext2D, pts: readonly Pt[]): void {
  ctx.fill(pathOf(pts));
}
