import { INK, PAPER } from '../../../src/art/pen';
import { BLACKTIP } from '../goliath/cast';
import { drawEyesInDark } from '../kayak/people';
import { clamp01, lerp, smooth, window01 } from '../short';
import { makeSprite, type Sprite } from '../sprites';
import { drawSwimmer } from '../swimmer';
import { drawCroc } from './art/croc';
import { boilOf, glow } from './art/ink';
import { drawDiver, drawWalker } from './art/people';
import { drawClipping, drawSeal } from './art/props';
import { drawAnimal } from './cast';
import { drawStamp, drawStampCard } from './hud';
import { H, STAMP_CARD, W } from './layout';
import { type Sea, vignette, wash } from './sea';
import { drawPop, PAPER_ON_INK, RED, YELLOW, YELLOW_ON_INK } from './text';
import { CAPE_COD, CLIPPING, CROC_EYES, DIVERS, FLORIDA, ICE_WALK, SEAL, T } from './timeline';

/**
 * The cut-aways, each filling the frame: Florida 2014 (the grouper takes a
 * hooked blacktip in one gulp), the grouper following a diver, a seal at the
 * surface and a great white rising (cut before contact), the crocodile's eyes
 * at the waterline, a walker on the ice overtaking a Greenland shark, Cape
 * Cod 2021 (Michael Packard in the dark), the 1891 clipping, and the stamp
 * card held up big.
 */

export interface SceneKit {
  readonly sea: Sea;
  readonly blacktip: Sprite;
}

export function createSceneKit(sea: Sea): SceneKit {
  return { sea, blacktip: makeSprite('shark', 5, 'light', BLACKTIP) };
}

const GOLD = { fill: YELLOW, halo: '#140d02' } as const;

// ---------------------------------------------------------------- Florida, 2014

export function drawFlorida(ctx: CanvasRenderingContext2D, k: SceneKit, t: number): void {
  k.sea.draw(ctx, 'florida', t);
  const bite = T.grouperBite;
  const hookX = 1180;
  const hookY = 430 + 14 * Math.sin(t * 7);
  const eaten = t >= bite;
  // The line from the surface, taut; it springs back up empty after the bite.
  const lineEnd = eaten ? { x: hookX + 40, y: hookY - 260 * smooth((t - bite) / 0.4) } : { x: hookX - 150, y: hookY };
  ctx.save();
  ctx.strokeStyle = 'rgba(235,240,230,0.85)';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(hookX + 60, 0);
  ctx.lineTo(lineEnd.x, lineEnd.y);
  ctx.stroke();
  ctx.restore();
  // The grouper rises out of the murk under it.
  const rise = smooth((t - (bite - 2.4)) / 2.4);
  const snout = { x: lerp(820, hookX - 120, rise), y: lerp(1250, hookY + 30, rise) };
  const gape = t < bite ? smooth((t - (bite - 1.2)) / 0.9) : 1 - smooth((t - bite) / 0.15);
  ctx.save();
  ctx.filter = `brightness(${0.55 + 0.45 * rise})`;
  drawAnimal(ctx, 'grouper', snout, 640, 1, t, { gape, angle: lerp(0.9, 0.15, rise) });
  ctx.restore();
  // The shark on the hook, in front; sucked into the open mouth tail first just before the bite.
  if (!eaten) {
    const suck = smooth((t - (bite - 0.35)) / 0.35);
    const sx = lerp(hookX - 300, snout.x - 20, suck);
    const sy = lerp(hookY, snout.y, suck);
    drawSwimmer(ctx, k.blacktip, { j: 0, shape: 'shark', age: 0, x: sx, y: sy, length: 300 * (1 - 0.8 * suck), facing: 1, tilt: 0.12 * Math.sin(t * 6), beat: t * 14, effort: 1 }, boilOf(t));
  }
  if (eaten && t < bite + 0.6) {
    ctx.save();
    ctx.strokeStyle = PAPER;
    ctx.lineWidth = 6;
    ctx.lineCap = 'round';
    const u = (t - bite) / 0.6;
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * Math.PI * 2;
      const r0 = 120 + 160 * u;
      ctx.globalAlpha = 1 - u;
      ctx.beginPath();
      ctx.moveTo(snout.x + Math.cos(a) * r0, snout.y + Math.sin(a) * r0);
      ctx.lineTo(snout.x + Math.cos(a) * (r0 + 50), snout.y + Math.sin(a) * (r0 + 50));
      ctx.stroke();
    }
    ctx.restore();
  }
  vignette(ctx, 0.55);
  drawPop(ctx, 'Florida, 2014', 420, 170, 76, t, T.y2014, FLORIDA.to, PAPER_ON_INK, -0.03);
  drawPop(ctx, 'a 4 ft blacktip shark', hookX - 300, hookY - 120, 54, t, T.blacktip, bite, GOLD, -0.03, 560);
  drawPop(ctx, 'ONE BITE!', 540, 820, 110, t, bite, FLORIDA.to, GOLD, -0.06);
}

// ---------------------------------------------------------------- following divers

export function drawDivers(ctx: CanvasRenderingContext2D, k: SceneKit, t: number): void {
  k.sea.draw(ctx, 'florida', t, t * 30);
  const u = (t - DIVERS.from) / (DIVERS.to - DIVERS.from);
  const diverX = lerp(1150, 520, u);
  drawDiver(ctx, diverX, 560 + 20 * Math.sin(t * 1.3), 440, -1, t);
  // The grouper drifts behind, a little closer every second.
  drawAnimal(ctx, 'grouper', { x: diverX + lerp(560, 330, u), y: 600 + 14 * Math.sin(t) }, 700, -1, t, { gape: 0.1 + 0.08 * Math.sin(t * 1.5) });
  vignette(ctx, 0.5);
  drawPop(ctx, 'big ones follow divers…', W / 2, 200, 70, t, T.divers, T.grouperNoRecord - 0.2, PAPER_ON_INK, -0.02);
  drawPop(ctx, 'attacks on people on record: 0', W / 2, 200, 70, t, T.grouperNoRecord, DIVERS.to, GOLD, -0.02, 1300);
}

// ---------------------------------------------------------------- the seal

export function drawSealScene(ctx: CanvasRenderingContext2D, k: SceneKit, t: number): void {
  k.sea.draw(ctx, 'cold', t);
  const surface = 190;
  // The surface from below: a bright wavy ceiling.
  ctx.save();
  const g = ctx.createLinearGradient(0, 0, 0, surface + 40);
  g.addColorStop(0, '#d9eef5');
  g.addColorStop(1, 'rgba(160,210,230,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, surface + 40);
  ctx.restore();
  const cut = T.bites - 0.35;
  if (t < cut) {
    drawSeal(ctx, 960 + 30 * Math.sin(t), surface + 30, 230, 0.05 * Math.sin(t * 2), t);
    const u = smooth((t - SEAL.from) / (cut - SEAL.from));
    drawAnimal(ctx, 'white', { x: lerp(640, 900, u), y: lerp(1150, 330, u) }, 760, 1, t, { gape: smooth((u - 0.5) / 0.4), angle: 1.15 });
    vignette(ctx, 0.5);
    drawPop(ctx, 'a seal', 960, surface + 140, 54, t, T.seal, cut, PAPER_ON_INK, -0.03);
    return;
  }
  // Cut away before contact: the surface bursts white (seen from below), spray and foam, and the words.
  const u = clamp01((t - cut) / 1.6);
  const cx = 960;
  ctx.save();
  // A churned cloud of bubbles under the burst.
  for (let i = 0; i < 70; i++) {
    const r0 = Math.abs(Math.sin(i * 12.9898) * 43758.5453) % 1;
    const r1 = Math.abs(Math.sin(i * 78.233) * 12345.678) % 1;
    const a = Math.PI * (0.05 + 0.9 * r0);
    const d = (60 + 420 * r1) * (0.4 + 0.6 * smooth(u * 1.4));
    const x = cx + Math.cos(a) * d * 1.3;
    const y = surface + 10 + Math.sin(a) * d * 0.7 - 120 * u * r1;
    const r = (10 + 34 * (1 - r1)) * (1 - 0.5 * u);
    ctx.globalAlpha = (1 - u) * (0.5 + 0.5 * r0);
    ctx.fillStyle = '#f4fbfd';
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(30,50,70,0.5)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x, y, r, Math.PI * 1.1, Math.PI * 1.7);
    ctx.stroke();
  }
  // Streaks of light shooting out from the burst.
  ctx.globalAlpha = 0.7 * (1 - u);
  ctx.strokeStyle = '#ffffff';
  ctx.lineCap = 'round';
  for (let i = 0; i < 14; i++) {
    const a = Math.PI * (0.08 + (0.84 * i) / 13);
    const r0 = 80 + 200 * u;
    ctx.lineWidth = 8 * (1 - u) + 2;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(a) * r0, surface + Math.sin(a) * r0 * 0.6);
    ctx.lineTo(cx + Math.cos(a) * (r0 + 160), surface + Math.sin(a) * (r0 + 160) * 0.6);
    ctx.stroke();
  }
  ctx.restore();
  wash(ctx, 'screen', '#ffffff', 0.6 * (1 - smooth((t - cut) / 0.4)));
  vignette(ctx, 0.5);
  drawPop(ctx, 'BITES', 520, 620, 120, t, T.bites, SEAL.to, GOLD, -0.08);
  drawPop(ctx, 'TEARS', 960, 700, 120, t, T.tears, SEAL.to, GOLD, 0.05);
  drawPop(ctx, 'SHAKES', 1420, 620, 120, t, T.shakes, SEAL.to, GOLD, -0.05);
}

// ---------------------------------------------------------------- the croc's eyes

export function drawCrocEyes(ctx: CanvasRenderingContext2D, k: SceneKit, t: number): void {
  const waterline = 560;
  // Dusk over an estuary, a mangrove bank, the brown water.
  const sky = ctx.createLinearGradient(0, 0, 0, waterline);
  sky.addColorStop(0, '#2c2440');
  sky.addColorStop(0.7, '#a2574a');
  sky.addColorStop(1, '#e0a066');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, waterline);
  ctx.save();
  ctx.fillStyle = '#17150f';
  ctx.beginPath();
  ctx.moveTo(0, waterline);
  for (let x = 0; x <= W; x += 40) ctx.lineTo(x, waterline - 90 - 40 * Math.abs(Math.sin(x * 0.011)) - 25 * Math.abs(Math.sin(x * 0.037)));
  ctx.lineTo(W, waterline);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, waterline, W, H - waterline);
  ctx.clip();
  k.sea.draw(ctx, 'estuary', t);
  ctx.restore();
  const u = smooth((t - CROC_EYES.from) / (CROC_EYES.to - CROC_EYES.from));
  const len = lerp(2600, 3400, u);
  const snout = { x: lerp(820, 560, u), y: waterline + len * 0.045 };
  // Under the water: dim and murky; above it, the eyes and nostrils.
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, waterline + 4, W, H);
  ctx.clip();
  ctx.globalAlpha = 0.35;
  ctx.filter = 'brightness(0.5)';
  drawCroc(ctx, snout.x, snout.y, len, -1, t, { tail: t * 1.2, blink: 0 });
  ctx.restore();
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, W, waterline + 4);
  ctx.clip();
  drawCroc(ctx, snout.x, snout.y, len, -1, t, { tail: t * 1.2, blink: window01(t, T.hasEaten + 0.9, T.hasEaten + 1.15, 0.08) });
  ctx.restore();
  // Ripples round the head.
  ctx.save();
  ctx.strokeStyle = 'rgba(255,225,180,0.6)';
  ctx.lineWidth = 3;
  for (let i = 0; i < 3; i++) {
    const r = ((t * 60 + i * 120) % 360) + 60;
    ctx.globalAlpha = 1 - r / 420;
    ctx.beginPath();
    ctx.ellipse(snout.x + len * 0.12, waterline + 6, r * 1.6, r * 0.12, 0, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
  vignette(ctx, 0.6);
  drawPop(ctx, 'the one that HAS eaten people', W / 2 + 200, 220, 72, t, T.hasEaten, CROC_EYES.to, GOLD, -0.02, 1100);
}

// ---------------------------------------------------------------- slower than you walk

export function drawIceWalk(ctx: CanvasRenderingContext2D, k: SceneKit, t: number): void {
  const ice = 360;
  k.sea.draw(ctx, 'arctic', t);
  // Pale Arctic sky and the ice sheet.
  const sky = ctx.createLinearGradient(0, 0, 0, ice);
  sky.addColorStop(0, '#b9cbd6');
  sky.addColorStop(1, '#eef3f2');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, ice - 40);
  ctx.save();
  ctx.fillStyle = '#e4eff2';
  ctx.strokeStyle = INK;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(0, ice - 40);
  ctx.lineTo(W, ice - 40);
  ctx.lineTo(W, ice + 30);
  for (let x = W; x >= 0; x -= 50) ctx.lineTo(x, ice + 30 + 14 * Math.sin(x * 0.02));
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();
  const s = t - ICE_WALK.from;
  // Walking pace (3 mph) against the shark's cruise (0.76 mph): four times faster.
  const walker = 260 + 230 * s;
  const shark = 520 + 58 * s;
  drawWalker(ctx, walker, ice - 40, 250, t * 7, t);
  drawAnimal(ctx, 'greenland', { x: shark + 700, y: 720 }, 700, 1, t, { gape: 0.05 });
  drawPop(ctx, 'you · 3 mph', walker, ice - 250, 50, t, ICE_WALK.from + 0.3, ICE_WALK.to, { fill: INK, halo: PAPER }, -0.02);
  drawPop(ctx, 'Greenland shark · 0.76 mph', shark + 350, 960, 50, t, ICE_WALK.from + 0.6, ICE_WALK.to, PAPER_ON_INK, -0.02, 700);
  vignette(ctx, 0.35);
}

// ---------------------------------------------------------------- Cape Cod, 2021

export function drawCapeCod(ctx: CanvasRenderingContext2D, k: SceneKit, t: number): void {
  const dark = window01(t, T.everything, T.cameUp + 0.6, 0.7);
  const out = t >= T.spat9 - 0.05;
  if (!out) {
    k.sea.draw(ctx, 'capecod', t, t * 10);
    // The sandy bottom.
    ctx.save();
    ctx.fillStyle = '#6f7552';
    ctx.beginPath();
    ctx.moveTo(0, H);
    for (let x = 0; x <= W; x += 60) ctx.lineTo(x, 930 + 20 * Math.sin(x * 0.006));
    ctx.lineTo(W, H);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    // The vast shadow: a humpback's open mouth rising from below.
    const rise = smooth((t - T.bump + 0.6) / 1.6);
    if (rise > 0) {
      ctx.save();
      ctx.filter = `brightness(${0.25 + 0.2 * (1 - rise)})`;
      drawAnimal(ctx, 'humpback', { x: lerp(1300, 1060, rise), y: lerp(1500, 520, rise) }, 3600, -1, t, { gape: 0.9, angle: 1.25, balloon: 0.2 });
      ctx.restore();
    }
    const bump = T.bump;
    const jolt = t > bump && t < bump + 0.4 ? 30 * Math.exp(-(t - bump) * 9) * Math.sin(t * 70) : 0;
    drawDiver(ctx, 980 + jolt, 640 + 10 * Math.sin(t * 1.4), 320, -1, t);
    wash(ctx, 'source-over', '#000000', dark);
    vignette(ctx, 0.5);
    drawPop(ctx, 'Cape Cod, 2021', 420, 170, 76, t, T.y2021, T.bump, PAPER_ON_INK, -0.03);
    drawPop(ctx, 'lobster diver Michael Packard', W / 2 + 120, 300, 58, t, T.packard, T.everything, GOLD, -0.02, 900);
    drawPop(ctx, 'bump…', 1180, 560, 64, t, T.bump, T.everything, PAPER_ON_INK, 0.06);
    // In the dark: his eyes, a heartbeat of light, "30 seconds".
    if (dark > 0.9) {
      const phase = (((t - T.dark) % 0.85) + 0.85) % 0.85;
      const beat = Math.exp(-phase * 6);
      glow(ctx, W / 2, H / 2, 420, 'rgba(120,20,30,A)', 0.25 * beat);
      drawEyesInDark(ctx, { x: W / 2, y: H / 2 }, 90, Math.sin(t * 1.3) * 0.6, Math.abs(Math.sin(t * 2.1)) > 0.97, boilOf(t));
      drawPop(ctx, '30 seconds', W / 2, 290, 96, t, T.thirty, T.cameUp, GOLD, -0.02);
      drawPop(ctx, 'this is it…', W / 2, 820, 64, t, T.thisIsIt, T.cameUp + 0.3, PAPER_ON_INK, 0.02);
    }
    if (t > T.cameUp) wash(ctx, 'screen', '#9fd0c0', 0.5 * smooth((t - T.cameUp) / 1));
    return;
  }
  // Spat out at the surface: light floods back, the whale's head above the water, the diver tumbling out.
  const u = t - T.spat9;
  const surface = 640;
  const sky = ctx.createLinearGradient(0, 0, 0, surface);
  sky.addColorStop(0, '#9fb4bf');
  sky.addColorStop(1, '#e8eeec');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, surface);
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, surface, W, H - surface);
  ctx.clip();
  k.sea.draw(ctx, 'capecod', t);
  ctx.restore();
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, W, surface + 60);
  ctx.clip();
  drawAnimal(ctx, 'humpback', { x: 1180, y: surface - 220 + 40 * smooth(u / 0.5) }, 2400, -1, t, { gape: 0.6 * (1 - smooth(u / 0.9)), angle: 1.2 });
  ctx.restore();
  const fly = clamp01(u / 0.9);
  drawDiver(ctx, lerp(1020, 600, fly), surface - 300 * Math.sin(Math.PI * fly) + 20, 260, -1, t, { spin: u * 6 });
  // Spray.
  ctx.save();
  ctx.fillStyle = 'rgba(250,252,252,0.85)';
  for (let i = 0; i < 18; i++) {
    const a = Math.PI + (i / 17) * Math.PI;
    const r = 80 + 340 * smooth(u / 0.7);
    ctx.globalAlpha = 1 - clamp01(u / 1.2);
    ctx.beginPath();
    ctx.arc(1060 + Math.cos(a) * r, surface - Math.abs(Math.sin(a)) * r * 0.45, 26, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
  wash(ctx, 'screen', '#ffffff', 0.7 * (1 - smooth(u / 0.35)));
  drawPop(ctx, 'SPAT OUT!', 520, 220, 110, t, T.spat9, CAPE_COD.to, { fill: YELLOW, halo: '#140d02' }, -0.06);
}

// ---------------------------------------------------------------- 1891

export function drawClippingScene(ctx: CanvasRenderingContext2D, k: SceneKit, t: number): void {
  k.sea.draw(ctx, 'paper', t);
  wash(ctx, 'multiply', '#c9a874', 0.55);
  const slide = smooth((t - CLIPPING.from) / 0.5);
  // A slow push in on the clipping while the story's told.
  const push = 1 + 0.12 * smooth((t - CLIPPING.from) / (CLIPPING.to - CLIPPING.from));
  ctx.save();
  ctx.translate(W / 2, 520);
  ctx.scale(push, push);
  ctx.translate(-W / 2, -520);
  drawClipping(ctx, W / 2, lerp(H + 500, 520, slide), 1080, t, 1);
  ctx.restore();
  vignette(ctx, 0.55, '40,24,8');
  drawPop(ctx, '1891', 300, 200, 110, t, T.y1891, CLIPPING.to, { fill: INK, halo: PAPER }, -0.08);
  drawPop(ctx, 'a sailor, James Bartley', 1500, 170, 60, t, T.bartley, T.fake - 0.2, GOLD, 0.04, 700);
  drawPop(ctx, 'found ALIVE inside?!', 1500, 250, 64, t, T.foundAlive, T.fake - 0.2, GOLD, 0.04, 700);
  const u = (t - T.fake) / 0.16;
  if (u > 0) drawStamp(ctx, 'HOAX', RED, W / 2 + 40, 560, 300, -0.22, u >= 1 ? 1 : 1 + 0.9 * (1 - u) * (1 - u));
  drawPop(ctx, "his ship wasn't even a whaler", W / 2, 1000, 62, t, T.whaler, CLIPPING.to, YELLOW_ON_INK, -0.02, 1300);
}

// ---------------------------------------------------------------- the stamp card, big

/** The stamp card held up big in the middle: `mystery` darkens the last mouth with a "?", `neverHas` writes under it. */
export function drawBoard(ctx: CanvasRenderingContext2D, k: SceneKit, t: number, opts: { readonly mystery?: number; readonly neverHas?: number; readonly line?: readonly [number, number, string] }): void {
  k.sea.draw(ctx, 'night', t);
  vignette(ctx, 0.6);
  const scale = 2.5;
  const w = STAMP_CARD.width * scale;
  const h = STAMP_CARD.height * scale;
  drawStampCard(ctx, t, 1, { x: W / 2 - w / 2 - STAMP_CARD.x, y: 470 - h / 2 - STAMP_CARD.y, scale, mystery: opts.mystery, neverHas: 0 });
  if ((opts.neverHas ?? 0) > 0) drawPop(ctx, '…but never has', W / 2 + 420, 470 + h / 2 + 80, 78, t, T.noRecord, Infinity, GOLD, -0.05, 700);
  if (opts.line) drawPop(ctx, opts.line[2], W / 2, 120, 64, t, opts.line[0], opts.line[1], PAPER_ON_INK, -0.01, 1500);
}
