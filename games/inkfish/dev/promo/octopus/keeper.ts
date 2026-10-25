import { PAPER_FILL } from '../../../src/art/fish/kit';
import { ellipse, INK, Pen, type Pt } from '../../../src/art/pen';
import { BOIL_FRAMES } from '../../../src/art/textures';
import { lerp, ramp, smooth } from '../short';
import type { Sprite } from '../sprites';
import { drawDogfish } from './dogfish';
import { spline } from './geom';
import { ARM_W, type Body, drawArm, drawBody } from './octoArt';
import { cycles, KEEPERS_AT, MOVED_AT, OUT_AT, SO_AT } from './story';
import { bubbleBurst, drawBubbles, drawVignette, drawWash } from './water';

/**
 * "So the keepers moved the octopuses out.": behind the scenes over the
 * tank. A keeper on the walkway hauls a pail up out of the water; in it, a
 * grumpy octopus, arms flopping over the rim and dripping. Below the
 * surface the dogfish swim on, eyes closed in relief, letting out a sigh of
 * bubbles. Warm light: the joke beat.
 */

const FROM = SO_AT - 0.1;
const SURFACE = 1000;
const WALK = 930;
/** Where the pail came up out of the water. */
const SURFACE_X = 540;
const SKIN = '#e2b08a';
const SHIRT = '#2f5f78';
const WADERS = '#3e4d3c';
const PAIL = '#9aa3a6';

/** How far the keeper has carried it off to the right, px. */
const carryAt = (t: number): number => 380 * smooth((t - (OUT_AT - 0.35)) / 0.8);
/** The pail's rim height: rising out of the water. */
const rimAt = (t: number): number => lerp(SURFACE + 60, 640, smooth((t - FROM) / 0.75)) + 10 * Math.sin((t - FROM) * 7) * ramp(t, FROM + 0.6, FROM + 0.9);
/** The swing of the pail as it's lifted and carried. */
const swingAt = (t: number): number => 0.06 * Math.sin((t - FROM) * 6.5) * ramp(t, FROM + 0.5, FROM + 0.8);

interface Pail {
  readonly x: number;
  readonly rim: number;
  readonly w: number;
  readonly h: number;
  readonly tilt: number;
}

const pailAt = (t: number): Pail => ({ x: 540 + carryAt(t), rim: rimAt(t), w: 300, h: 240, tilt: swingAt(t) });

function rot(p: Pt, c: Pt, a: number): Pt {
  const s = Math.sin(a);
  const k = Math.cos(a);
  return { x: c.x + (p.x - c.x) * k - (p.y - c.y) * s, y: c.y + (p.x - c.x) * s + (p.y - c.y) * k };
}

function pailPts(p: Pail): { body: Pt[]; rimBack: Pt[]; rimFront: Pt[]; handleL: Pt; handleR: Pt; pivot: Pt } {
  const pivot = { x: p.x, y: p.rim - 150 };
  const r = (q: Pt): Pt => rot(q, pivot, p.tilt);
  const top = p.w / 2;
  const bot = p.w * 0.36;
  const body = [
    ...Array.from({ length: 13 }, (_, i) => r({ x: p.x + top * Math.cos(Math.PI * (i / 12)), y: p.rim + 22 * Math.sin(Math.PI * (i / 12)) })).reverse(),
    ...Array.from({ length: 13 }, (_, i) => r({ x: p.x + bot * Math.cos(Math.PI * (i / 12)), y: p.rim + p.h + 16 * Math.sin(Math.PI * (i / 12)) })),
  ];
  const rimBack = Array.from({ length: 13 }, (_, i) => r({ x: p.x + top * Math.cos(Math.PI * (i / 12)), y: p.rim - 22 * Math.sin(Math.PI * (i / 12)) }));
  const rimFront = Array.from({ length: 13 }, (_, i) => r({ x: p.x + top * Math.cos(Math.PI * (i / 12)), y: p.rim + 22 * Math.sin(Math.PI * (i / 12)) }));
  return { body, rimBack, rimFront, handleL: r({ x: p.x - top, y: p.rim }), handleR: r({ x: p.x + top, y: p.rim }), pivot };
}

/** The octopus in the pail: grumpy, its head and mantle over the rim. */
export function pailBody(t: number): Body {
  const p = pailAt(t);
  const { pivot } = pailPts(p);
  const c = rot({ x: p.x - 10, y: p.rim + 12 }, pivot, p.tilt);
  return {
    x: c.x,
    y: c.y,
    angle: p.tilt * 1.5 + 0.05 * Math.sin((t - FROM) * 3),
    scale: 0.82,
    lean: -0.1,
    breathe: 1,
    gaze: { x: 0.8, y: -0.3 },
    lid: 0.5,
    brow: 0.95,
    flush: 0.35,
    lineK: 1,
  };
}

/** Arms flopping over the front of the rim and hanging down the outside of the pail, swaying and dripping. */
function floppyArms(p: Pail, t: number): Pt[][] {
  const { rimFront, pivot } = pailPts(p);
  const spots = [3, 5, 8, 10] as const;
  return spots.map((k, i) => {
    const at = rimFront[k]!;
    const side = at.x < p.x ? -1 : 1;
    const sway = 10 * Math.sin((t - FROM) * 4.2 + i * 1.7);
    const R = (dx: number, dy: number): Pt => rot({ x: at.x + side * dx + sway * (dy / 200), y: at.y + dy }, pivot, p.tilt);
    const drop = 150 + 40 * (i % 2);
    return spline([R(-6, -26), R(12, -36), R(30, -8), R(36, 50), R(30 + sway * 0.2, drop * 0.7), R(14, drop), R(-6, drop + 10), R(-10, drop - 14)], 8);
  });
}

function drawWall(ctx: CanvasRenderingContext2D, paper: HTMLCanvasElement, boil: number): void {
  drawWash(ctx, paper, 'rgba(232,206,160,0.55)', 'rgba(196,160,112,0.6)', 0, SURFACE);
  const pen = new Pen(ctx, 41 + (boil % BOIL_FRAMES) * 977, 1.2);
  // Wall tiles and a pipe along the wall.
  for (let y = 120; y < WALK - 40; y += 90) pen.hair([{ x: 0, y }, { x: 1080, y: y + 3 }], 0.9, INK, 0.18);
  for (let row = 0; row * 90 + 120 < WALK - 40; row++) {
    for (let x = (row % 2) * 60; x < 1080; x += 120) pen.hair([{ x, y: 120 + row * 90 }, { x: x + 1, y: 210 + row * 90 }], 0.9, INK, 0.16);
  }
  pen.fill([{ x: 0, y: 300 }, { x: 1080, y: 300 }, { x: 1080, y: 330 }, { x: 0, y: 330 }], '#8d9aa0', 0.7);
  pen.stroke([{ x: 0, y: 300 }, { x: 1080, y: 300 }], 2, INK, 0.9, false);
  pen.stroke([{ x: 0, y: 330 }, { x: 1080, y: 330 }], 2, INK, 0.9, false);
  // A warm lamp's pool of light.
  const g = ctx.createRadialGradient(500, 520, 40, 500, 560, 700);
  g.addColorStop(0, 'rgba(255,236,190,0.35)');
  g.addColorStop(1, 'rgba(255,236,190,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 1080, SURFACE);
}

function drawWaterBelow(ctx: CanvasRenderingContext2D, t: number, boil: number): void {
  const g = ctx.createLinearGradient(0, SURFACE, 0, 1920);
  g.addColorStop(0, 'rgba(70,140,140,0.95)');
  g.addColorStop(0.4, 'rgba(28,84,94,0.97)');
  g.addColorStop(1, 'rgba(8,30,38,1)');
  ctx.fillStyle = g;
  ctx.fillRect(0, SURFACE, 1080, 1920 - SURFACE);
  const pen = new Pen(ctx, 43 + (boil % BOIL_FRAMES) * 977, 1);
  const line: Pt[] = [];
  for (let x = -20; x <= 1100; x += 18) line.push({ x, y: SURFACE + 6 * Math.sin(x / 50 + cycles(5, t)) });
  pen.stroke(line, 3, INK, 1, false);
  pen.stroke(line.map((p) => ({ x: p.x, y: p.y + 10 })), 2, '#d6efe8', 0.5, false);
}

function drawWalkway(ctx: CanvasRenderingContext2D, boil: number): void {
  const pen = new Pen(ctx, 45 + (boil % BOIL_FRAMES) * 977, 1);
  const deck = [{ x: 600, y: WALK }, { x: 1100, y: WALK }, { x: 1100, y: WALK + 34 }, { x: 600, y: WALK + 34 }];
  pen.fill(deck, '#5b6266', 0.95);
  pen.stroke([...deck, deck[0]!], 2.2, INK);
  for (let x = 640; x < 1100; x += 60) pen.hair([{ x, y: WALK + 34 }, { x, y: SURFACE + 2 }], 2, INK, 0.6);
}

/** The keeper: cap, aquarium polo, waders; both hands on the pail's handle, grinning. */
function drawKeeper(ctx: CanvasRenderingContext2D, x: number, hands: Pt, t: number, boil: number): void {
  const pen = new Pen(ctx, 47 + (boil % BOIL_FRAMES) * 977, 1.1);
  const bob = 4 * Math.sin((t - FROM) * 8);
  const hip = { x, y: 760 + bob };
  const neck = { x: x + 6, y: 540 + bob };
  // Shirt: rounded shoulders down to the waist.
  const shirt: Pt[] = [
    { x: neck.x - 24, y: neck.y + 10 },
    ...Array.from({ length: 7 }, (_, i) => { const a = Math.PI * 1.5 - (i / 6) * (Math.PI / 2); return { x: neck.x - 46 + Math.cos(a) * 36, y: neck.y + 52 + Math.sin(a) * 40 }; }),
    { x: x - 70, y: hip.y }, { x: x + 70, y: hip.y },
    ...Array.from({ length: 7 }, (_, i) => { const a = (i / 6) * (Math.PI / 2) - Math.PI / 2 + Math.PI * 0; return { x: neck.x + 46 + Math.cos(a) * 36, y: neck.y + 52 + Math.sin(a) * 40 }; }).reverse(),
    { x: neck.x + 24, y: neck.y + 10 },
  ];
  pen.fill(shirt, PAPER_FILL, 1);
  pen.fill(shirt, SHIRT, 0.9);
  pen.clipped(shirt, () => pen.hatch(shirt, 7, 1.1, 0.8, { alpha: 0.3 }));
  pen.fill(ellipse(x + 30, neck.y + 70, 14, 10, 12), '#e8dcc0', 0.9);
  pen.stroke([...shirt, shirt[0]!], 2.4, INK);
  // Waders: a bib up the chest on braces, two legs, boots.
  const bib = [{ x: x - 52, y: neck.y + 120 }, { x: x + 52, y: neck.y + 120 }, { x: x + 70, y: hip.y }, { x: x + 72, y: WALK - 6 }, { x: x + 6, y: WALK - 6 }, { x: x + 2, y: hip.y + 50 }, { x: x - 2, y: hip.y + 50 }, { x: x - 6, y: WALK - 6 }, { x: x - 72, y: WALK - 6 }, { x: x - 70, y: hip.y }];
  pen.fill(bib, PAPER_FILL, 1);
  pen.fill(bib, WADERS, 0.92);
  pen.clipped(bib, () => pen.hatch(bib, 8, -0.9, 0.8, { alpha: 0.25 }));
  pen.stroke([...bib, bib[0]!], 2.4, INK);
  for (const sx of [-1, 1]) pen.stroke([{ x: x + sx * 40, y: neck.y + 122 }, { x: neck.x + sx * 48, y: neck.y + 22 }], 6, '#2c3a2a', 1, false);
  for (const sx of [-1, 1]) {
    const boot = [{ x: x + sx * 6, y: WALK - 40 }, { x: x + sx * 72, y: WALK - 40 }, { x: x + sx * 78, y: WALK }, { x: x + sx * 4, y: WALK }];
    pen.fill(boot, '#1f2620', 0.95);
    pen.stroke([...boot, boot[0]!], 2, INK);
  }
  // Arms reaching to the handle.
  for (const [sx, dy] of [[-64, 0], [-30, 16]] as const) {
    const shoulder = { x: neck.x + sx, y: neck.y + 40 };
    const elbow = { x: (shoulder.x + hands.x) / 2 + 10, y: Math.max(shoulder.y, hands.y) + 40 + dy };
    pen.stroke([shoulder, elbow], 26, SHIRT, 1, false);
    pen.stroke([elbow, { x: hands.x + 10 + dy * 0.6, y: hands.y + 6 }], 18, SKIN, 1, false);
    pen.stroke([shoulder, elbow, { x: hands.x + 10 + dy * 0.6, y: hands.y + 6 }], 2, INK, 0.9, false);
    pen.dot(hands.x + 10 + dy * 0.6, hands.y + 6, 13, SKIN, 1);
    pen.circle(hands.x + 10 + dy * 0.6, hands.y + 6, 13, 1.6);
  }
  // Head: face, grin, cap.
  const head = { x: neck.x + 4, y: neck.y - 56 };
  pen.fill(ellipse(head.x, head.y, 50, 56, 24), PAPER_FILL, 1);
  pen.fill(ellipse(head.x, head.y, 50, 56, 24), SKIN, 0.85);
  pen.stroke([...ellipse(head.x, head.y, 50, 56, 24), { x: head.x + 50, y: head.y }], 2.2, INK);
  pen.dot(head.x - 22, head.y - 4, 4.5, INK);
  pen.stroke([{ x: head.x - 32, y: head.y - 16 }, { x: head.x - 14, y: head.y - 19 }], 2, INK, 0.9, false);
  pen.stroke([{ x: head.x - 46, y: head.y + 2 }, { x: head.x - 54, y: head.y + 14 }, { x: head.x - 44, y: head.y + 16 }], 1.8, INK, 0.9, false);
  pen.stroke([{ x: head.x - 40, y: head.y + 26 }, { x: head.x - 26, y: head.y + 34 }, { x: head.x - 10, y: head.y + 28 }], 2.2, INK, 1, false);
  pen.fill(ellipse(head.x - 10, head.y + 12, 9, 6, 10), '#d98a72', 0.5);
  const cap = [{ x: head.x - 50, y: head.y - 22 }, { x: head.x - 40, y: head.y - 58 }, { x: head.x + 10, y: head.y - 66 }, { x: head.x + 48, y: head.y - 40 }, { x: head.x + 50, y: head.y - 20 }];
  pen.fill(cap, SHIRT, 0.95);
  pen.stroke([...cap, cap[0]!], 2.2, INK);
  pen.stroke([{ x: head.x - 46, y: head.y - 22 }, { x: head.x - 96, y: head.y - 16 }], 5, INK, 1, false);
}

function drawPail(ctx: CanvasRenderingContext2D, p: Pail, part: 'back' | 'front', boil: number): void {
  const pen = new Pen(ctx, 49 + (boil % BOIL_FRAMES) * 977, 1);
  const k = pailPts(p);
  if (part === 'back') {
    const inside = [...k.rimBack, ...[...k.rimFront].reverse()];
    pen.fill(inside, '#3c4447', 1);
    pen.fill(inside, '#1f6a70', 0.5);
    return;
  }
  pen.fill(k.body, PAPER_FILL, 1);
  pen.fill(k.body, PAIL, 0.9);
  pen.clipped(k.body, () => {
    const g = ctx.createLinearGradient(p.x - p.w / 2, 0, p.x + p.w / 2, 0);
    g.addColorStop(0, 'rgba(255,255,255,0.35)');
    g.addColorStop(0.35, 'rgba(255,255,255,0.05)');
    g.addColorStop(1, 'rgba(20,30,34,0.45)');
    ctx.fillStyle = g;
    ctx.fillRect(p.x - p.w, p.rim - 100, p.w * 2, p.h + 200);
    for (const f of [0.3, 0.62]) pen.hair(Array.from({ length: 13 }, (_, i) => rot({ x: p.x + (p.w / 2 - (p.w * 0.14) * f) * Math.cos(Math.PI * (i / 12)), y: p.rim + p.h * f + 20 * Math.sin(Math.PI * (i / 12)) }, k.pivot, p.tilt)), 1.6, INK, 0.5);
  });
  pen.stroke([...k.body, k.body[0]!], 2.6, INK);
  pen.stroke([...k.rimBack, ...[...k.rimFront].reverse(), k.rimBack[0]!], 3, INK);
  // Water slopping over the rim.
  for (let i = 0; i < 4; i++) {
    const at = k.rimFront[2 + i * 3]!;
    const drip = ((t0(i) + p.rim * 0.002) % 1) * 120;
    pen.fill(ellipse(at.x, at.y + 30 + drip, 4, 7, 8), '#cfe8e6', 0.7);
  }
}
const t0 = (i: number): number => i * 0.37;

function drawHandle(ctx: CanvasRenderingContext2D, p: Pail, hands: Pt, boil: number): void {
  const pen = new Pen(ctx, 51 + (boil % BOIL_FRAMES) * 977, 0.8);
  const k = pailPts(p);
  const arc: Pt[] = [];
  for (let i = 0; i <= 16; i++) {
    const u = i / 16;
    const v = 1 - u;
    const c = { x: hands.x, y: hands.y - 60 };
    arc.push({ x: v * v * k.handleL.x + 2 * v * u * c.x + u * u * k.handleR.x, y: v * v * k.handleL.y + 2 * v * u * c.y + u * u * k.handleR.y });
  }
  pen.stroke(arc, 4, INK, 1, false);
}

/** Rings on the surface where the pail came out, and drops falling from its bottom. */
function drawSplash(ctx: CanvasRenderingContext2D, p: Pail, t: number, boil: number): void {
  const pen = new Pen(ctx, 53 + (boil % BOIL_FRAMES) * 977, 0.8);
  const out = t - FROM;
  for (const delay of [0.1, 0.35]) {
    const u = (out - delay) / 0.9;
    if (u <= 0 || u >= 1) continue;
    const r = 60 + 260 * u;
    pen.stroke(ellipse(SURFACE_X, SURFACE + 8, r, r * 0.16, 40), 3, '#e8f4f0', 0.8 * (1 - u), false);
  }
  const bottom = p.rim + p.h + 10;
  for (let i = 0; i < 7; i++) {
    const phase = (out * 1.6 + i * 0.37) % 1;
    if (out < 0.4) continue;
    const x = p.x + (i - 3) * 22 + 6 * Math.sin(i * 2.1);
    const y = bottom + phase * (SURFACE - bottom);
    if (y > SURFACE) continue;
    pen.fill([{ x, y: y - 9 }, { x: x + 5, y: y + 2 }, { x, y: y + 6 }, { x: x - 5, y: y + 2 }], '#d9eeea', 0.85);
  }
}

export function drawKeeperScene(ctx: CanvasRenderingContext2D, paper: HTMLCanvasElement, dogfish: Sprite, t: number, boil: number): void {
  drawWall(ctx, paper, boil);
  const p = pailAt(t);
  const k = pailPts(p);
  const hands = { x: (k.handleL.x + k.handleR.x) / 2, y: Math.min(k.handleL.y, k.handleR.y) - 125 };
  drawWalkway(ctx, boil);
  const grip = { x: hands.x, y: (k.handleL.y + k.handleR.y) / 4 + (hands.y - 60) / 2 };
  drawKeeper(ctx, 850 + carryAt(t), grip, t, boil);
  drawPail(ctx, p, 'back', boil);
  drawHandle(ctx, p, hands, boil);
  const body = pailBody(t);
  drawBody(ctx, body, 5101 + (boil % BOIL_FRAMES) * 977);
  drawPail(ctx, p, 'front', boil);
  const arms = floppyArms(p, t);
  arms.forEach((a, i) => drawArm(ctx, a, { w0: ARM_W * body.scale, side: i < 2 ? -1 : 1, seed: 5201 + i * 37 + (boil % BOIL_FRAMES) * 977, flush: 0.2 }));
  drawWaterBelow(ctx, t, boil);
  // The splash as the pail breaks the surface: rings spreading on the water, drops falling back from the pail.
  drawSplash(ctx, p, t, boil);
  // Relieved dogfish below: eyes shut, a sigh of bubbles.
  const relief = ramp(t, KEEPERS_AT + 0.2, KEEPERS_AT + 0.6);
  const sharks = [
    { x: 760 - 70 * (t - FROM), y: 1150, length: 330, facing: -1 as const },
    { x: 260 + 60 * (t - FROM), y: 1260, length: 290, facing: 1 as const },
  ];
  sharks.forEach((s, i) => {
    drawDogfish(ctx, dogfish, { ...s, tilt: 0.04 * Math.sin(t * 1.2 + i), beat: t * 2 * Math.PI * 0.9, effort: 0.25 }, boil, { eyes: relief > 0.5 ? 'happy' : null });
    const mouth = { x: s.x + s.facing * s.length * 0.47, y: s.y + 8 };
    drawBubbles(ctx, bubbleBurst(mouth, t - (MOVED_AT + i * 0.25), 6, 601 + i, 30, 9));
  });
  drawVignette(ctx, 0.35, '40,22,8');
}
