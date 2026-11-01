import { INK, makeCanvas, Pen, type Pt } from '../../../src/art/pen';
import { createRng } from '../../../src/logic/rng';
import { drawTextLine } from '../captions';
import { drawHumpback } from '../foodchain/art/humpback';
import { drawOrca } from '../foodchain/art/orca';
import { dab, softLine } from '../seal/art/paint';
import { drawBubble } from '../seal/scene';
import { ramp, VIDEO } from '../short';
import { drawWeddell } from './art/weddell';
import {
  circlingFins, crestAmp, crestX, floePivotY, FLOE_HALF, FLOE_SEAL_LEN, FLOE_TOP, FLOE_X, floeTilt, hookSeal, hookWhale, onWhale, saveSeal, saveWhale, SEAL_LEN, SPLASH_T,
  type SealState, waterAt, waveOrcas, waveSeal, W, WF, WHALE_LEN, type WhaleState, approachFins, CHEST_LOCAL,
} from './motion';
import { COLD_TEXT, drawFin, drawFloe, drawSea, drawSeaFront, drawSky, drawSplashAt, penFor, RED_TEXT } from './scene';
import { TEXT } from './script';
import {
  CHEST_AT, countAt, counterAt, CRASHED_AT, HOOK_BACK, KNOWS_AT, LOOP_S, lidAt, markAt, placeAt, plusAt, said, WHY_FROM, yearAt, decay,
} from './story';

/** The six scenes, each drawn on its own transparent layer. */

const clampRoll = (r: number): number => (Math.abs(r) < 0.05 ? (r < 0 ? -0.05 : 0.05) : r);

// ---------------------------------------------------------------- the seal on a scene

function sealOn(ctx: CanvasRenderingContext2D, s: SealState, len: number, boil: number): void {
  drawWeddell(ctx, { x: s.x, y: s.y, len, rot: s.rot, face: 1, beat: s.beat }, { mood: s.mood === 'nervous' ? 'nervous' : 'plain', gape: 0, sweat: s.sweat, smile: s.smile }, boil);
}

// ---------------------------------------------------------------- water running off the chest

/** Streaks of water running down the chest to the sea, drops and rings where they land. */
function drawPour(ctx: CanvasRenderingContext2D, w: WhaleState, amount: number, t: number, boil: number): void {
  if (amount <= 0.02) return;
  const pen = penFor(ctx, 70, boil);
  const rng = createRng(2024);
  const N = 18;
  for (let i = 0; i < N; i++) {
    const lx = 40 + (i / (N - 1)) * 1020 + (rng() - 0.5) * 40;
    const top = onWhale(w, { x: lx, y: 235 - 30 * (lx > 900 ? (lx - 900) / 200 : 0) });
    const bottom = W + 4;
    if (bottom - top.y < 80) continue;
    const speed = 5 + Math.floor(rng() * 3);
    const f = (((t * speed) / (LOOP_S / 8) + rng() * 4) % 1 + 1) % 1;
    const y0 = top.y + (bottom - top.y) * f;
    const y1 = Math.min(bottom, y0 + 70 + rng() * 80);
    const sway = 6 * Math.sin(i * 1.7);
    pen.hair([{ x: top.x + sway, y: y0 }, { x: top.x + sway * 1.3, y: (y0 + y1) / 2 }, { x: top.x + sway * 1.6, y: y1 }], (2.4 + rng() * 2.2) * amount, '#dff0fb', 0.5 * amount);
    if (y1 >= bottom - 1 && f > 0.7) {
      ctx.save();
      ctx.globalAlpha = 0.5 * amount;
      ctx.strokeStyle = '#eaf5fb';
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.ellipse(top.x + sway * 1.6, bottom, 14 + 22 * (f - 0.7) * 3, 4 + 5 * (f - 0.7) * 3, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
  }
  // Drops dripping off the head and the far edge of the chest.
  for (let i = 0; i < 12; i++) {
    const ph = (((t / (LOOP_S / 6)) * (1 + (i % 3) * 0.5) + rng() * 3) % 1 + 1) % 1;
    const p = onWhale(w, { x: 900 + rng() * 330, y: 150 + rng() * 80 });
    drawBubble(ctx, p.x + (rng() - 0.5) * 40, p.y + ph * (W - p.y), 4 + rng() * 6, 0.85 * amount);
  }
}

/** Rings spreading on the surface round the seal as the whale rises under it. */
function drawRipples(ctx: CanvasRenderingContext2D, x: number, y: number, age: number, size: number): void {
  for (let i = 0; i < 3; i++) {
    const u = (((age - i * 0.28) % 1.2) + 1.2) % 1.2 / 1.2;
    ctx.save();
    ctx.globalAlpha = 0.6 * (1 - u);
    ctx.strokeStyle = '#d9ecf7';
    ctx.lineWidth = 4 * (1 - u) + 1;
    ctx.beginPath();
    ctx.ellipse(x, y, size * (0.5 + u * 1.7), size * 0.09 * (0.6 + u * 1.7), 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
}

// ---------------------------------------------------------------- the whale scenes (frame 1 and the rescue)

let whaleLayer: ReturnType<typeof makeCanvas> | null = null;

/** A soft dark shadow where the seal's belly presses on the chest. */
function contactShadow(ctx: CanvasRenderingContext2D, s: SealState): void {
  const c = Math.cos(s.rot);
  const n = Math.sin(s.rot);
  const [x, y] = [s.x - n * -60 + c * 0, s.y + c * 70];
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(s.rot);
  const g = ctx.createRadialGradient(0, 0, 10, 0, 0, SEAL_LEN * 0.5);
  g.addColorStop(0, 'rgba(18,30,48,0.7)');
  g.addColorStop(0.6, 'rgba(18,30,48,0.35)');
  g.addColorStop(1, 'rgba(18,30,48,0)');
  ctx.scale(1, 0.18);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(0, 0, SEAL_LEN * 0.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawWhaleScene(ctx: CanvasRenderingContext2D, t: number, boil: number, w: WhaleState, seal: SealState, hooked: boolean): void {
  const water = waterAt;
  void water;
  const calm = (x: number): number => W + 6 * Math.sin(x / 80 - (2 * Math.PI * 3 * t) / LOOP_S) + 3.5 * Math.sin(x / 33 + (2 * Math.PI * 2 * t) / LOOP_S);
  drawSky(ctx, W, boil, 0, 0.42);
  drawSea(ctx, calm, W, boil, 0.4);
  whaleLayer ??= makeCanvas(VIDEO.width, VIDEO.height);
  const wc = whaleLayer.ctx;
  wc.clearRect(0, 0, VIDEO.width, VIDEO.height);
  wc.save();
  wc.translate(w.cx, w.cy);
  wc.rotate(w.tilt);
  wc.scale(1, clampRoll(w.roll));
  const pose = {
    gape: 0, throat: 0.55, tail: (2 * Math.PI * 3 * t) / LOOP_S,
    fin: 0.45 * w.spread, farFin: -0.05 + 0.15 * w.spread, finScale: 0.92,
  };
  drawHumpback(wc, 0, 0, WHALE_LEN, 0, t, pose);
  wc.restore();
  // The pleated chest catching the light: pale, almost white, on the whale only.
  const glow = onWhale(w, { x: 700, y: 330 });
  const gg = wc.createRadialGradient(glow.x, glow.y, 40, glow.x, glow.y, 620);
  gg.addColorStop(0, 'rgba(255,252,244,0.9)');
  gg.addColorStop(0.5, 'rgba(240,244,250,0.5)');
  gg.addColorStop(1, 'rgba(226,236,246,0)');
  wc.save();
  wc.globalCompositeOperation = 'source-atop';
  wc.fillStyle = gg;
  wc.fillRect(0, 0, VIDEO.width, VIDEO.height);
  wc.restore();
  ctx.drawImage(whaleLayer.canvas, 0, 0);
  if (seal.smile > 0.05 || hooked) contactShadow(ctx, seal);
  sealOn(ctx, seal, SEAL_LEN, boil);
  drawSeaFront(ctx, calm, W, boil, 0.62);
  drawPour(ctx, w, w.pour, t, boil);
  if (!hooked) {
    const age = t - (CHEST_AT - 1.6);
    if (age > 0 && t < CHEST_AT + 1.2) drawRipples(ctx, seal.x, calm(seal.x) + 4, age, 150);
    const burst = t - (CHEST_AT - 0.02);
    if (burst >= 0 && burst < 0.6) drawRipples(ctx, seal.x, calm(seal.x) + 4, burst * 2.2, 260);
  }
  circlingFins(t).forEach((f, i) => drawFin(ctx, f, W, boil, i));
  const vg = ctx.createRadialGradient(540, 720, 380, 540, 800, 1250);
  vg.addColorStop(0, 'rgba(2,6,14,0)');
  vg.addColorStop(1, 'rgba(2,6,14,0.55)');
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, VIDEO.width, VIDEO.height);
}

export function drawHook(ctx: CanvasRenderingContext2D, t: number, boil: number): void {
  drawWhaleScene(ctx, t, boil, hookWhale(t), hookSeal(t), true);
}

export function drawSave(ctx: CanvasRenderingContext2D, t: number, boil: number): void {
  drawWhaleScene(ctx, t, boil, saveWhale(t), saveSeal(t), false);
}

// ---------------------------------------------------------------- the floe and the wave

function drawFloeAndSeal(ctx: CanvasRenderingContext2D, t: number, boil: number): void {
  drawFloe(ctx, FLOE_X, floePivotY(t), FLOE_HALF, FLOE_TOP, floeTilt(t), boil);
  sealOn(ctx, waveSeal(t), FLOE_SEAL_LEN, boil);
}

export function drawFloeScene(ctx: CanvasRenderingContext2D, t: number, boil: number): void {
  const water = (x: number): number => waterAt(x, t);
  drawSky(ctx, WF, boil);
  drawSea(ctx, water, WF, boil);
  drawFloeAndSeal(ctx, t, boil);
  drawSeaFront(ctx, water, WF, boil, 0.9);
  approachFins(t).forEach((f, i) => drawFin(ctx, f, WF, boil, 10 + i));
  drawTextLine(ctx, 'Antarctica', VIDEO.width / 2, TEXT.place.y, TEXT.place.size, 700, placeAt(t), COLD_TEXT);
  drawTextLine(ctx, '2009', VIDEO.width / 2, TEXT.year.y, TEXT.year.size, 700, yearAt(t), COLD_TEXT);
}

export function drawWaveScene(ctx: CanvasRenderingContext2D, t: number, boil: number): void {
  const water = (x: number): number => waterAt(x, t);
  drawSky(ctx, WF, boil);
  drawSea(ctx, water, WF, boil);
  drawFloeAndSeal(ctx, t, boil);
  waveOrcas(t).forEach((o, i) => drawOrca(ctx, o.x, o.y, o.len, 0, t, { jaw: 0, tail: t * 9 + i * 1.3 }));
  drawSeaFront(ctx, water, WF, boil, 0.8);
  // The crest's foam.
  const c = crestX(t);
  const amp = crestAmp(t) / 78;
  if (amp > 0.05) {
    const pen = penFor(ctx, 80, boil);
    const line: Pt[] = [];
    for (let x = c - 190; x <= c + 190; x += 20) line.push({ x, y: water(x) - 2 });
    pen.stroke(line, 7 * amp, '#f2f8fc', 0.85);
    const rng = createRng(909);
    for (let i = 0; i < 16; i++) {
      const x = c + (rng() - 0.5) * 340;
      drawBubble(ctx, x, water(x) - 10 - rng() * 40 * amp, 3 + rng() * 6, 0.85 * amp);
    }
  }
  const seal = waveSeal(t);
  drawSplashAt(ctx, seal.x, water(seal.x) - 4, t - SPLASH_T, 120);
}

// ---------------------------------------------------------------- the montage

let silhouetteLayer: ReturnType<typeof makeCanvas> | null = null;

/** Draws `animal` as a flat dark silhouette in `colour`. */
function silhouette(ctx: CanvasRenderingContext2D, box: { x: number; y: number; w: number; h: number }, colour: string, animal: (c: CanvasRenderingContext2D) => void): void {
  silhouetteLayer ??= makeCanvas(VIDEO.width, VIDEO.height);
  const s = silhouetteLayer.ctx;
  const x0 = Math.max(0, Math.floor(box.x));
  const y0 = Math.max(0, Math.floor(box.y));
  const w = Math.min(VIDEO.width, Math.ceil(box.x + box.w)) - x0;
  const h = Math.min(VIDEO.height, Math.ceil(box.y + box.h)) - y0;
  if (w <= 0 || h <= 0) return;
  s.save();
  s.setTransform(1, 0, 0, 1, 0, 0);
  s.globalCompositeOperation = 'source-over';
  s.clearRect(x0, y0, w, h);
  animal(s);
  s.globalCompositeOperation = 'source-in';
  s.fillStyle = colour;
  s.fillRect(x0, y0, w, h);
  s.restore();
  ctx.drawImage(silhouetteLayer.canvas, x0, y0, w, h, x0, y0, w, h);
}

const ROWS = [740, 880, 1020, 1150] as const;
const PAIRS = 11;
const PAIR_GAP = 0.24;
const PAIR_S = 1.9;
export const PAIR_FROM = CRASHED_AT - 0.45;

/** Where pair i's humpback is (x of its middle; the orca runs ahead of it), or null when not on screen. */
export function pairAt(i: number, t: number): { x: number; y: number; dir: 1 | -1; ox: number } | null {
  const p = (t - (PAIR_FROM + i * PAIR_GAP)) / PAIR_S;
  if (p < 0 || p > 1) return null;
  const dir = i % 2 ? -1 : 1;
  const x = dir === 1 ? -260 + 1600 * p : VIDEO.width + 260 - 1600 * p;
  return { x, y: ROWS[i % ROWS.length]! + (i % 3) * 10, dir, ox: x + dir * 420 };
}

export function drawMontage(ctx: CanvasRenderingContext2D, t: number, boil: number): void {
  const g = ctx.createLinearGradient(0, 0, 0, VIDEO.height);
  g.addColorStop(0, '#5d8398');
  g.addColorStop(0.5, '#2c5d78');
  g.addColorStop(1, '#0d2638');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, VIDEO.width, VIDEO.height);
  // Soft light from above.
  const rg = ctx.createRadialGradient(540, 120, 40, 540, 120, 1100);
  rg.addColorStop(0, 'rgba(210,235,248,0.4)');
  rg.addColorStop(1, 'rgba(210,235,248,0)');
  ctx.fillStyle = rg;
  ctx.fillRect(0, 0, VIDEO.width, VIDEO.height);
  const pen = penFor(ctx, 90, boil);
  for (let i = 0; i < PAIRS; i++) {
    const p = pairAt(i, t);
    if (!p) continue;
    const flip = p.dir === -1;
    // Speed lines behind the charging humpback.
    for (let k = 0; k < 3; k++) {
      pen.hair([{ x: p.x - p.dir * (250 + k * 30), y: p.y - 24 + k * 26 }, { x: p.x - p.dir * (420 + k * 60), y: p.y - 24 + k * 26 }], 3, '#e3f1f9', 0.35);
    }
    silhouette(ctx, { x: p.ox - 250, y: p.y - 150, w: 500, h: 300 }, '#050a10', (c) => {
      drawOrca(c, p.ox, p.y, 330, 0, t, { jaw: 0, tail: t * 12 + i }, false);
    });
    silhouette(ctx, { x: p.x - 300, y: p.y - 130, w: 600, h: 260 }, '#172f4b', (c) => {
      c.save();
      c.translate(p.x, p.y);
      c.scale(flip ? -1 : 1, 1);
      drawHumpback(c, 0, 0, 520, 0, t, { gape: 0.15, throat: 0.2, tail: t * 8 + i, fin: 0.1 }, false);
      c.restore();
    });
  }
  const a = counterAt(t);
  const n = countAt(t);
  const label = `${n}${plusAt(t) > 0.5 ? '+' : ''}`;
  const pop = 1 + 0.12 * decay(t, said('a HUNDRED'), 0.3);
  ctx.save();
  ctx.translate(VIDEO.width / 2, TEXT.count.y);
  ctx.scale(pop, pop);
  drawTextLine(ctx, label, 0, 0, TEXT.count.size, 700, a, { fill: '#fff4cf', halo: '#102a40' });
  ctx.restore();
  drawTextLine(ctx, 'humpbacks vs orcas', VIDEO.width / 2, TEXT.countLabel.y, TEXT.countLabel.size, 700, a, { fill: '#e8f3fa', halo: '#102a40' });
}

// ---------------------------------------------------------------- the eye

const EYE_RX = 215;
const EYE_RY = 128;

/** An arc of skin fold round the eye, as soft painted strokes: a dark groove with a pale ridge above it. */
function fold(ctx: CanvasRenderingContext2D, rx: number, ry: number, a0: number, a1: number, wob: number, groove: number, ridge: number): void {
  const pts: Pt[] = [];
  for (let k = 0; k <= 28; k++) {
    const a = a0 + (a1 - a0) * (k / 28);
    pts.push({ x: Math.cos(a) * rx + wob * Math.sin(k * 0.7), y: Math.sin(a) * ry + wob * 0.6 * Math.cos(k * 0.5) });
  }
  softLine(ctx, pts.map((p) => ({ x: p.x, y: p.y + groove * 0.5 })), groove, '#0c141c', 0.55);
  softLine(ctx, pts.map((p) => ({ x: p.x, y: p.y - groove * 0.55 })), groove * 0.55, '#9db1c1', 0.3);
}

export function drawEyeScene(ctx: CanvasRenderingContext2D, t: number, boil: number): void {
  const zoom = 1.28 + 0.12 * ramp(t, WHY_FROM, HOOK_BACK);
  const pen = penFor(ctx, 120, boil);
  const sk = ctx.createLinearGradient(0, 0, 0, VIDEO.height);
  sk.addColorStop(0, '#2a3744');
  sk.addColorStop(0.5, '#52667a');
  sk.addColorStop(1, '#788b9c');
  ctx.fillStyle = sk;
  ctx.fillRect(0, 0, VIDEO.width, VIDEO.height);
  ctx.save();
  ctx.translate(540, 980);
  ctx.scale(zoom, zoom);
  const rng = createRng(333);
  // Mottled skin: pale scarring and dark patches.
  for (let i = 0; i < 70; i++) {
    const x = (rng() - 0.5) * 1300;
    const y = (rng() - 0.5) * 1300;
    dab(ctx, x, y, 30 + rng() * 90, rng() < 0.5 ? '170,190,205' : '10,18,28', 0.1 + rng() * 0.12);
  }
  // Thick folds: round the eye and sweeping out to the brow.
  for (let r = 0; r < 11; r++) {
    const k = 1 + r * 0.26;
    fold(ctx, EYE_RX * (1.25 + 0.3 * r), EYE_RY * (1.45 + 0.4 * r), Math.PI * (0.98 + 0.03 * Math.sin(r)), Math.PI * (2.02 - 0.04 * Math.cos(r * 2)), 10 + 3 * k, 18 + 2 * k, 1);
  }
  for (let r = 0; r < 5; r++) fold(ctx, EYE_RX * (1.2 + 0.32 * r), EYE_RY * (1.5 + 0.45 * r), Math.PI * 0.02, Math.PI * (0.9 - 0.04 * r), 10, 15, 1);
  // Knobbly tubercles on the brow, each with its hair.
  for (let i = 0; i < 16; i++) {
    const a = Math.PI * (1.12 + rng() * 0.76);
    const rr = 1.5 + rng() * 1.1;
    const x = Math.cos(a) * EYE_RX * rr;
    const y = Math.sin(a) * EYE_RY * rr * 1.5;
    const r = 12 + rng() * 12;
    dab(ctx, x + 3, y + 5, r * 1.5, '6,12,20', 0.55);
    const bg = ctx.createRadialGradient(x - r * 0.3, y - r * 0.4, 1, x, y, r);
    bg.addColorStop(0, '#8aa0b2');
    bg.addColorStop(1, '#2c3c4b');
    ctx.fillStyle = bg;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
    pen.hair([{ x, y: y - r * 0.3 }, { x: x + 6, y: y - r - 16 }], 1.5, '#ece2c8', 0.8);
  }
  // The socket: sunk into shadow.
  const sg = ctx.createRadialGradient(0, 4, EYE_RY * 0.9, 0, 4, EYE_RX * 1.9);
  sg.addColorStop(0, 'rgba(4,8,14,0.85)');
  sg.addColorStop(0.45, 'rgba(6,12,20,0.4)');
  sg.addColorStop(1, 'rgba(6,12,20,0)');
  ctx.fillStyle = sg;
  ctx.fillRect(-700, -600, 1400, 1200);
  // The eye: a dark brown wet ball in a rounded opening.
  const open = (): void => {
    ctx.beginPath();
    ctx.ellipse(0, 0, EYE_RX, EYE_RY, 0, 0, Math.PI * 2);
  };
  ctx.save();
  open();
  ctx.clip();
  const ig = ctx.createRadialGradient(-30, -6, 8, 0, 4, EYE_RX);
  ig.addColorStop(0, '#8a5c34');
  ig.addColorStop(0.22, '#573519');
  ig.addColorStop(0.6, '#24130a');
  ig.addColorStop(1, '#0a0605');
  ctx.fillStyle = ig;
  ctx.fillRect(-EYE_RX, -EYE_RY, EYE_RX * 2, EYE_RY * 2);
  // A dark pupil, and a sliver of tan sclera at each corner.
  ctx.fillStyle = 'rgba(6,3,2,0.75)';
  ctx.beginPath();
  ctx.ellipse(-8, 2, 62, 40, 0, 0, Math.PI * 2);
  ctx.fill();
  for (const sx of [-1, 1]) {
    const cg = ctx.createRadialGradient(sx * EYE_RX, 4, 4, sx * EYE_RX, 4, 70);
    cg.addColorStop(0, 'rgba(190,170,130,0.7)');
    cg.addColorStop(1, 'rgba(190,170,130,0)');
    ctx.fillStyle = cg;
    ctx.fillRect(sx * EYE_RX - 80, -80, 160, 170);
  }
  // Wet light: soft catchlight, a small crisp one, sky along the lower lid.
  dab(ctx, -92, -52, 66, '255,255,255', 0.7);
  ctx.fillStyle = 'rgba(255,255,255,0.95)';
  ctx.beginPath();
  ctx.ellipse(-92, -54, 22, 13, -0.4, 0, Math.PI * 2);
  ctx.fill();
  dab(ctx, 82, 52, 34, '200,225,245', 0.5);
  const lg = ctx.createLinearGradient(0, 40, 0, EYE_RY);
  lg.addColorStop(0, 'rgba(150,190,220,0)');
  lg.addColorStop(1, 'rgba(160,200,230,0.4)');
  ctx.fillStyle = lg;
  ctx.fillRect(-EYE_RX, 40, EYE_RX * 2, EYE_RY);
  // The upper lid's shadow across the ball, and the blink.
  const ug = ctx.createLinearGradient(0, -EYE_RY, 0, -10);
  ug.addColorStop(0, 'rgba(2,4,8,0.8)');
  ug.addColorStop(1, 'rgba(2,4,8,0)');
  ctx.fillStyle = ug;
  ctx.fillRect(-EYE_RX, -EYE_RY, EYE_RX * 2, EYE_RY);
  const lid = lidAt(t);
  if (lid > 0.01) {
    const lg2 = ctx.createLinearGradient(0, -EYE_RY, 0, EYE_RY);
    lg2.addColorStop(0, '#2e3d4c');
    lg2.addColorStop(1, '#5a6e80');
    ctx.fillStyle = lg2;
    ctx.fillRect(-EYE_RX, -EYE_RY, EYE_RX * 2, EYE_RY * 2 * lid * 0.95);
    softLine(ctx, [{ x: -EYE_RX, y: -EYE_RY + EYE_RY * 2 * lid * 0.95 }, { x: EYE_RX, y: -EYE_RY + EYE_RY * 2 * lid * 0.95 }], 8, '#0a1018', 0.6);
  }
  ctx.restore();
  // Thin ink round the opening, the heavy upper lid fold overhanging it, the pale wet lower rim.
  open();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 4.5;
  ctx.stroke();
  const arc: Pt[] = [];
  for (let k = 0; k <= 24; k++) {
    const a = Math.PI * (1.04 + 0.92 * (k / 24));
    arc.push({ x: Math.cos(a) * (EYE_RX + 16), y: Math.sin(a) * (EYE_RY + 22) - 6 });
  }
  softLine(ctx, arc.map((p) => ({ x: p.x, y: p.y - 14 })), 34, '#0a121a', 0.55);
  softLine(ctx, arc, 14, '#aebfcd', 0.4);
  pen.stroke(arc, 3.2, INK, 0.9, false);
  const low: Pt[] = [];
  for (let k = 0; k <= 20; k++) {
    const a = Math.PI * (0.1 + 0.8 * (k / 20));
    low.push({ x: Math.cos(a) * (EYE_RX + 6), y: Math.sin(a) * (EYE_RY + 8) });
  }
  softLine(ctx, low, 9, '#cfdde8', 0.45);
  ctx.restore();
  const m = markAt(t);
  const bob = 10 * Math.sin(t * 3);
  drawTextLine(ctx, '?', VIDEO.width / 2, TEXT.mark.y + bob, TEXT.mark.size, 700, m, { fill: '#f1e9d2', halo: '#16222f' });
  void RED_TEXT;
  void KNOWS_AT;
}
