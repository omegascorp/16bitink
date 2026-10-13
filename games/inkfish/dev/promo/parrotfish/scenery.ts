import { DECOR_SIZE } from '../../../src/art/decorArt';
import { drawShallowDecor } from '../../../src/art/decorShallow';
import { INK } from '../../../src/art/pen';
import { ART_RES } from '../../../src/art/propArt';
import { CLOUD_SIZE, drawCloud } from '../../../src/art/skyArt';
import { createRng } from '../../../src/logic/rng';
import { sandTopAt } from './sand';
import { CORAL, CORAL_DOME, DEEP_Y, FAR, groundAt, PILE_X, SEABED_Y, SHORE, TOWEL, UMBRELLA, WATER_Y } from './stage';
import { LOOP_S } from './story';

/**
 * The island, side-on, in world px (render.ts sets the camera): sky and sun,
 * the sea and its rolling waterline, the sand (with the pile), the coral
 * head with its bite marks, the palms, and the umbrella and towel.
 */

export const SAND = '#ecdcb0';
export const WHITE_SAND = '#fffcf2';
const CORAL_WASH = '#c9a46a';
/** Far enough either way to fill the pulled-back view. */
const LEFT = -700;
const RIGHT = 3100;
const BOTTOM = 4400;
const TOP = -1900;

/** The waterline's height at x: a gentle roll, three times round per loop. */
export function waterlineAt(x: number, t: number): number {
  const roll = (2 * Math.PI * t * 3) / LOOP_S;
  return WATER_Y + 6 * Math.sin(x * 0.022 + roll) + 3 * Math.sin(x * 0.051 - roll * 2);
}

/** The sky's warm wash, the sun and two clouds: drawn once, in world px. */
export function makeSky(): { readonly draw: (ctx: CanvasRenderingContext2D) => void } {
  const clouds = [{ seed: 61, x: 560, y: 290, k: 1.15 }, { seed: 78, x: 1700, y: 180, k: 1.5 }, { seed: 95, x: 2600, y: 330, k: 1.2 }].map((c) => {
    const canvas = document.createElement('canvas');
    canvas.width = CLOUD_SIZE.w * ART_RES;
    canvas.height = CLOUD_SIZE.h * ART_RES;
    drawCloud(canvas.getContext('2d')!, c.seed);
    return { ...c, canvas };
  });
  return {
    draw(ctx) {
      const wash = ctx.createLinearGradient(0, TOP, 0, WATER_Y);
      wash.addColorStop(0, 'rgba(255,196,120,0.14)');
      wash.addColorStop(1, 'rgba(255,226,170,0.12)');
      ctx.fillStyle = wash;
      ctx.fillRect(LEFT, TOP, RIGHT - LEFT, WATER_Y - TOP + 20);
      drawSun(ctx, 125, 330, 48);
      for (const c of clouds) ctx.drawImage(c.canvas, c.x - (CLOUD_SIZE.w * c.k) / 2, c.y - CLOUD_SIZE.h * c.k, CLOUD_SIZE.w * c.k, CLOUD_SIZE.h * c.k);
    },
  };
}

function drawSun(ctx: CanvasRenderingContext2D, x: number, y: number, r: number): void {
  ctx.save();
  ctx.strokeStyle = INK;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = '#f7d36a';
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.lineWidth = 3.5;
  for (let k = 0; k < 12; k++) {
    const a = (k / 12) * Math.PI * 2 + 0.1;
    const [r0, r1] = [r + 14, r + (k % 2 ? 30 : 42)];
    ctx.beginPath();
    ctx.moveTo(x + Math.cos(a) * r0, y + Math.sin(a) * r0);
    ctx.lineTo(x + Math.cos(a) * r1, y + Math.sin(a) * r1);
    ctx.stroke();
  }
  ctx.restore();
}

/** The sea below the waterline: a turquoise wash deepening towards the seabed. */
export function drawWater(ctx: CanvasRenderingContext2D, t: number): void {
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(LEFT, BOTTOM);
  for (let x = LEFT; x <= RIGHT; x += 10) ctx.lineTo(x, waterlineAt(x, t));
  ctx.lineTo(RIGHT, BOTTOM);
  ctx.closePath();
  const wash = ctx.createLinearGradient(0, WATER_Y, 0, DEEP_Y);
  wash.addColorStop(0, 'rgba(70,185,195,0.2)');
  wash.addColorStop((SEABED_Y - WATER_Y) / (DEEP_Y - WATER_Y), 'rgba(30,120,165,0.38)');
  wash.addColorStop(1, 'rgba(20,60,120,0.62)');
  ctx.fillStyle = wash;
  ctx.fill();
  ctx.restore();
}

/** Stipple for the sand: dense near the surface, sparse deeper down. */
const STIPPLE = (() => {
  const rng = createRng(611);
  return Array.from({ length: 4200 }, (_, i) => {
    const x = LEFT + rng() * (RIGHT - LEFT);
    const deep = i % 3 === 0;
    return { x, depth: 16 + (deep ? 600 + rng() * 2600 : rng() * 600), r: 1 + rng() * 1.8, alpha: 0.2 + 0.35 * rng() };
  });
})();

/** The sand, from its inked surface down, with the pile on the seabed. */
export function drawLand(ctx: CanvasRenderingContext2D, t: number): void {
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(LEFT, BOTTOM);
  for (let x = LEFT; x <= RIGHT; x += 6) ctx.lineTo(x, groundAt(x));
  ctx.lineTo(RIGHT, BOTTOM);
  ctx.closePath();
  ctx.fillStyle = SAND;
  ctx.fill();
  ctx.fillStyle = INK;
  for (const s of STIPPLE) {
    ctx.globalAlpha = s.alpha;
    ctx.beginPath();
    ctx.arc(s.x, groundAt(s.x) + s.depth, s.r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  drawPile(ctx, t);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 3;
  ctx.lineJoin = 'round';
  ctx.beginPath();
  for (let x = LEFT; x <= RIGHT; x += 6) (x === LEFT ? ctx.moveTo(x, sandTopAt(x, t)) : ctx.lineTo(x, sandTopAt(x, t)));
  ctx.stroke();
  ctx.restore();
}

const PILE_SPECKS = (() => {
  const rng = createRng(303);
  return Array.from({ length: 70 }, () => ({ across: rng() * 2 - 1, up: rng(), r: 1 + rng() * 1.6 }));
})();

/** The fresh white sand on the seabed. */
function drawPile(ctx: CanvasRenderingContext2D, t: number): void {
  const reach = 900;
  const top = (x: number): number => sandTopAt(x, t);
  if (top(PILE_X) > groundAt(PILE_X) - 1) return;
  ctx.beginPath();
  ctx.moveTo(PILE_X - reach, groundAt(PILE_X - reach));
  for (let x = PILE_X - reach; x <= PILE_X + reach; x += 6) ctx.lineTo(x, top(x));
  for (let x = PILE_X + reach; x >= PILE_X - reach; x -= 6) ctx.lineTo(x, groundAt(x) + 1);
  ctx.closePath();
  ctx.fillStyle = WHITE_SAND;
  ctx.fill();
  ctx.fillStyle = INK;
  const peak = groundAt(PILE_X) - top(PILE_X);
  for (const s of PILE_SPECKS) {
    const x = PILE_X + s.across * 160;
    const h = groundAt(x) - top(x);
    if (h < 6) continue;
    ctx.globalAlpha = 0.35 * Math.min(1, peak / 30);
    ctx.beginPath();
    ctx.arc(x, groundAt(x) - h * s.up * 0.85, s.r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

/** "…mostly made of it": the island's sand above the seabed, washed white from the left, `across` of the way. */
export function drawSweep(ctx: CanvasRenderingContext2D, across: number, alpha: number): void {
  if (across <= 0 || alpha <= 0) return;
  const x0 = SHORE.from - 40;
  const x1 = x0 + (FAR.to + 40 - x0) * across;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.beginPath();
  ctx.moveTo(x0, SEABED_Y);
  for (let x = x0; x <= x1; x += 6) ctx.lineTo(x, groundAt(x) + 2);
  ctx.lineTo(x1, SEABED_Y);
  ctx.closePath();
  ctx.fillStyle = WHITE_SAND;
  ctx.fill();
  ctx.save();
  ctx.clip();
  ctx.strokeStyle = INK;
  ctx.globalAlpha = 0.3 * alpha;
  ctx.lineWidth = 5;
  for (let x = x0 - 600; x < x1; x += 46) {
    ctx.beginPath();
    ctx.moveTo(x, SEABED_Y);
    ctx.lineTo(x + 560, SEABED_Y - 560);
    ctx.stroke();
  }
  ctx.restore();
  // The sweep's leading edge, a pen line.
  ctx.strokeStyle = INK;
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(x1, groundAt(x1));
  ctx.lineTo(x1, SEABED_Y);
  ctx.stroke();
  ctx.restore();
}

/** The waterline in ink, with a few "~" wavelets below it. */
export function drawWaterline(ctx: CanvasRenderingContext2D, t: number): void {
  const roll = (2 * Math.PI * t * 3) / LOOP_S;
  ctx.save();
  ctx.strokeStyle = INK;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.lineWidth = 3.2;
  ctx.beginPath();
  for (let x = LEFT; x <= RIGHT; x += 8) (x === LEFT ? ctx.moveTo(x, waterlineAt(x, t)) : ctx.lineTo(x, waterlineAt(x, t)));
  ctx.stroke();
  ctx.lineWidth = 2;
  ctx.globalAlpha = 0.45;
  for (const [wx, dy] of [[90, 50], [330, 36], [560, 74], [-250, 60], [2500, 50], [2800, 80]] as const) {
    ctx.beginPath();
    for (let k = 0; k <= 6; k++) {
      const px = wx - 30 + k * 10;
      const py = WATER_Y + dy + Math.sin(k * 1.4 + roll) * 4;
      if (k === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();
  }
  ctx.restore();
}

// ---------------------------------------------------------------- the coral

/** The game's brain coral, drawn once. */
export function makeCoral(): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = DECOR_SIZE.braincoral.w * ART_RES;
  canvas.height = DECOR_SIZE.braincoral.h * ART_RES;
  drawShallowDecor(canvas.getContext('2d')!, 'braincoral', 5);
  return canvas;
}

export const BITE_R = 40;

/** The coral head with bites taken out of it (`bites`: where, and how much each shows). */
export function drawCoral(ctx: CanvasRenderingContext2D, coral: HTMLCanvasElement, bites: readonly { readonly x: number; readonly y: number; readonly shown: number }[]): void {
  const w = DECOR_SIZE.braincoral.w * CORAL.scale;
  const h = DECOR_SIZE.braincoral.h * CORAL.scale;
  const open = bites.filter((b) => b.shown > 0.02);
  ctx.save();
  if (open.length) {
    // Everything but the bites.
    ctx.beginPath();
    ctx.rect(CORAL.x - w, CORAL.y - h * 1.5, w * 2, h * 2);
    for (const b of open) {
      ctx.moveTo(b.x + BITE_R * b.shown, b.y);
      ctx.arc(b.x, b.y, BITE_R * b.shown, 0, Math.PI * 2, true);
    }
    ctx.clip('evenodd');
  }
  ctx.drawImage(coral, CORAL.x - w / 2, CORAL.y - h, w, h);
  ctx.restore();
  // The bites' raw edges, inside the dome: a pale rim of scraped coral, inked, with beak scrapes.
  for (const b of open) {
    const r = BITE_R * b.shown;
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(CORAL.x, CORAL.y - 3 * CORAL.scale, CORAL_DOME.rx, CORAL_DOME.ry, 0, Math.PI, Math.PI * 2);
    ctx.closePath();
    ctx.clip();
    ctx.globalAlpha = b.shown;
    ctx.beginPath();
    ctx.arc(b.x, b.y, r + 13, 0, Math.PI * 2);
    ctx.arc(b.x, b.y, r, 0, Math.PI * 2, true);
    ctx.fillStyle = '#f3ead6';
    ctx.fill();
    ctx.strokeStyle = INK;
    ctx.lineCap = 'round';
    ctx.lineWidth = 2;
    for (let k = -3; k <= 3; k++) {
      const a = Math.PI + k * 0.28;
      ctx.beginPath();
      ctx.moveTo(b.x + Math.cos(a) * (r + 3), b.y + Math.sin(a) * (r + 3));
      ctx.lineTo(b.x + Math.cos(a) * (r + 11), b.y + Math.sin(a) * (r + 11));
      ctx.stroke();
    }
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(b.x, b.y, r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
}

/** A chunk of coral, bitten off: a lumpy stone at (x, y), `size` px across. */
export function drawChunk(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, spin: number): void {
  if (size <= 0.5) return;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(spin);
  ctx.beginPath();
  for (let k = 0; k < 7; k++) {
    const a = (k / 7) * Math.PI * 2;
    const r = (size / 2) * (0.75 + 0.25 * Math.sin(k * 2.3));
    if (k === 0) ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r);
    else ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  ctx.closePath();
  ctx.fillStyle = CORAL_WASH;
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2.4;
  ctx.stroke();
  ctx.restore();
}

// ---------------------------------------------------------------- the beach

/** A palm, `pop` 0 .. 1 grown up from the sand (springing past full height). */
export function drawPalm(ctx: CanvasRenderingContext2D, x: number, h: number, lean: number, pop: number): void {
  if (pop <= 0.01) return;
  const y = groundAt(x) + 4;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(pop, pop);
  ctx.strokeStyle = INK;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  const top = { x: Math.sin(lean) * h, y: -Math.cos(lean) * h };
  const bend = { x: lean * h * 0.15, y: -h * 0.55 };
  ctx.lineWidth = 9;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(bend.x, bend.y, top.x, top.y);
  ctx.stroke();
  ctx.strokeStyle = '#a8865a';
  ctx.lineWidth = 5;
  ctx.stroke();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2.4;
  for (let k = 1; k < 9; k++) {
    const u = k / 9;
    const cx = 2 * u * (1 - u) * bend.x + u * u * top.x;
    const cy = 2 * u * (1 - u) * bend.y + u * u * top.y;
    ctx.beginPath();
    ctx.moveTo(cx - 7, cy + 2);
    ctx.lineTo(cx + 7, cy - 2);
    ctx.stroke();
  }
  for (const a of [-2.7, -2.05, -1.4, -0.8, -0.2, 0.4]) {
    const len = h * 0.42 * (0.85 + 0.15 * Math.cos(a * 3));
    const tip = { x: top.x + Math.cos(a) * len, y: top.y + Math.sin(a) * len * 0.5 + len * 0.42 };
    const mid = { x: top.x + Math.cos(a) * len * 0.55, y: top.y + Math.sin(a) * len * 0.55 - len * 0.2 };
    // A leaf: a fat curved blade, filled green and inked.
    ctx.beginPath();
    ctx.moveTo(top.x, top.y);
    ctx.quadraticCurveTo(mid.x, mid.y - len * 0.1, tip.x, tip.y);
    ctx.quadraticCurveTo(mid.x, mid.y + len * 0.12, top.x, top.y + 4);
    ctx.fillStyle = '#7fa864';
    ctx.fill();
    ctx.lineWidth = 2.6;
    ctx.stroke();
  }
  ctx.restore();
}

/** The towel, following the sand, in stripes. */
export function drawTowel(ctx: CanvasRenderingContext2D): void {
  const stripes = ['#e2574c', '#fffaf0', '#3f8fc0', '#fffaf0'];
  const step = 24;
  ctx.save();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2;
  for (let x = TOWEL.x0, k = 0; x < TOWEL.x1; x += step, k++) {
    const x1 = Math.min(TOWEL.x1, x + step);
    ctx.beginPath();
    ctx.moveTo(x, groundAt(x) - 8);
    ctx.lineTo(x1, groundAt(x1) - 8);
    ctx.lineTo(x1, groundAt(x1) + 1);
    ctx.lineTo(x, groundAt(x) + 1);
    ctx.closePath();
    ctx.fillStyle = stripes[k % stripes.length]!;
    ctx.fill();
  }
  ctx.beginPath();
  ctx.moveTo(TOWEL.x0, groundAt(TOWEL.x0) - 8);
  for (let x = TOWEL.x0; x <= TOWEL.x1; x += 8) ctx.lineTo(x, groundAt(x) - 8);
  ctx.stroke();
  ctx.restore();
}

/** The beach umbrella: a pole stuck in the sand, a striped scalloped canopy. */
export function drawUmbrella(ctx: CanvasRenderingContext2D): void {
  const { x, top, width } = UMBRELLA;
  const lean = 0.1;
  const foot = { x, y: groundAt(x) + 6 };
  const head = { x: x - Math.sin(lean) * (foot.y - top), y: top };
  ctx.save();
  ctx.strokeStyle = INK;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.lineWidth = 7;
  ctx.beginPath();
  ctx.moveTo(foot.x, foot.y);
  ctx.lineTo(head.x, head.y);
  ctx.stroke();
  ctx.strokeStyle = '#d8d2c4';
  ctx.lineWidth = 3.5;
  ctx.stroke();
  // The canopy, tilted with the pole: a dome over a scalloped rim, red and white panels.
  ctx.translate(head.x, head.y);
  ctx.rotate(-lean);
  const rx = width / 2;
  const ry = 78;
  const panels = 6;
  for (let k = 0; k < panels; k++) {
    const a0 = Math.PI + (k / panels) * Math.PI;
    const a1 = Math.PI + ((k + 1) / panels) * Math.PI;
    const p0 = { x: Math.cos(a0) * rx, y: 0 };
    const p1 = { x: Math.cos(a1) * rx, y: 0 };
    ctx.beginPath();
    ctx.moveTo(0, -ry);
    ctx.quadraticCurveTo((p0.x + 0) / 2 + p0.x * 0.35, -ry * 0.75, p0.x, p0.y + 8);
    ctx.quadraticCurveTo((p0.x + p1.x) / 2, p0.y + 26, p1.x, p1.y + 8);
    ctx.quadraticCurveTo((p1.x + 0) / 2 + p1.x * 0.35, -ry * 0.75, 0, -ry);
    ctx.closePath();
    ctx.fillStyle = k % 2 ? '#fffaf0' : '#e2574c';
    ctx.fill();
    ctx.lineWidth = 2.6;
    ctx.strokeStyle = INK;
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.arc(0, -ry - 6, 7, 0, Math.PI * 2);
  ctx.fillStyle = INK;
  ctx.fill();
  ctx.restore();
}
