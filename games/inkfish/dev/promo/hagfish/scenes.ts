import type { Pt } from '../../../src/art/pen';
import { createRng } from '../../../src/logic/rng';
import { makePaper } from '../backdrop';
import { lerp } from '../short';
import { VIDEO } from '../short';
import { DOG_EYE, drawBiteJaws, drawDogfish, GILL_XS, onDog } from './art/dogfish';
import { clamp } from './art/geom';
import { drawHagfish, hagPores, type HagLook } from './art/hagfish';
import { burst, type Gel, glassBlob, glassStrand, newGel, paintGel, plume, threadsAlong } from './art/slime';
import {
  biteAt, burstAt, cloudAt, flickAge, gagAt, gillsAt, gillStreamAt, knotAt, LOOP_S, MOUTH_AT, pileAt, PUFFS, shockAt, sparkleAt,
} from './story';

/** The deep water, the bait camera's light, and the three scenes (the bite, the gill close-up, the knot). */

export interface Backdrops {
  readonly deep: HTMLCanvasElement;
  readonly gills: HTMLCanvasElement;
  readonly sunny: HTMLCanvasElement;
}

function water(stops: readonly (readonly [number, string])[]): HTMLCanvasElement {
  const canvas = makePaper();
  const ctx = canvas.getContext('2d')!;
  const g = ctx.createLinearGradient(0, 0, 0, VIDEO.height);
  for (const [u, c] of stops) g.addColorStop(u, c);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, VIDEO.width, VIDEO.height);
  return canvas;
}

export const makeDeep = (): HTMLCanvasElement => water([[0, 'rgba(10,44,62,0.98)'], [0.45, 'rgba(5,24,36,0.99)'], [1, 'rgba(1,6,12,1)']]);
export const makeGills = (): HTMLCanvasElement => water([[0, 'rgba(34,70,62,0.97)'], [0.5, 'rgba(16,36,34,0.98)'], [1, 'rgba(5,14,14,0.99)']]);
export const makeSunny = (): HTMLCanvasElement => water([[0, 'rgba(96,206,190,0.96)'], [0.45, 'rgba(34,134,148,0.97)'], [1, 'rgba(10,58,84,0.98)']]);

const bg = (ctx: CanvasRenderingContext2D, c: HTMLCanvasElement): void => void ctx.drawImage(c, 0, 0);

/** Marine snow drifting up through the light (whole cycles a loop). */
function snow(ctx: CanvasRenderingContext2D, loop: number, bright: number, n = 90): void {
  const rng = createRng(606);
  ctx.save();
  for (let i = 0; i < n; i++) {
    const ph = (rng() + loop * (1 + (i % 3))) % 1;
    const x = (rng() * VIDEO.width + 50 * Math.sin(ph * 6 + i)) % VIDEO.width;
    const y = VIDEO.height * (1 - ph);
    ctx.fillStyle = `rgba(220,240,240,${((0.12 + 0.4 * rng()) * bright).toFixed(2)})`;
    ctx.beginPath();
    ctx.arc(x, y, 1.5 + rng() * 3.2, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

/** The bait camera's lamp at the top right and its cone of light falling across the shark. */
function baitLight(ctx: CanvasRenderingContext2D, loop: number): void {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const flick = 1 + 0.03 * Math.sin(2 * Math.PI * loop * 3);
  const cone = ctx.createRadialGradient(1010, -40, 20, 1010, -40, 1500);
  cone.addColorStop(0, `rgba(210,250,255,${(0.5 * flick).toFixed(3)})`);
  cone.addColorStop(0.4, 'rgba(120,200,220,0.2)');
  cone.addColorStop(1, 'rgba(60,140,170,0)');
  ctx.fillStyle = cone;
  ctx.beginPath();
  ctx.moveTo(1010, -40);
  ctx.lineTo(-300, 1500);
  ctx.lineTo(760, 1900);
  ctx.closePath();
  ctx.fill();
  const pool = ctx.createRadialGradient(MOUTH_AT.x + 40, MOUTH_AT.y, 40, MOUTH_AT.x + 40, MOUTH_AT.y, 700);
  pool.addColorStop(0, 'rgba(120,200,215,0.38)');
  pool.addColorStop(1, 'rgba(60,140,170,0)');
  ctx.fillStyle = pool;
  ctx.fillRect(0, 0, VIDEO.width, VIDEO.height);
  ctx.restore();
  // The camera housing and its lamp, a dark silhouette.
  ctx.save();
  ctx.fillStyle = '#04090d';
  ctx.beginPath();
  ctx.roundRect(880, -60, 260, 130, 26);
  ctx.fill();
  const lamp = ctx.createRadialGradient(960, 56, 4, 960, 56, 70);
  lamp.addColorStop(0, 'rgba(255,255,240,1)');
  lamp.addColorStop(0.3, 'rgba(210,250,255,0.85)');
  lamp.addColorStop(1, 'rgba(120,200,220,0)');
  ctx.fillStyle = lamp;
  ctx.beginPath();
  ctx.arc(960, 56, 70, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

// ---------------------------------------------------------------- the bite

/** Dark rocks along the bottom edge, rim-lit by the lamp, so the lower frame isn't empty water. */
function seabed(ctx: CanvasRenderingContext2D): void {
  ctx.save();
  const sand = ctx.createLinearGradient(0, 1560, 0, 1920);
  sand.addColorStop(0, 'rgba(18,48,58,0)');
  sand.addColorStop(1, 'rgba(14,40,48,0.95)');
  ctx.fillStyle = sand;
  ctx.fillRect(0, 1560, VIDEO.width, 360);
  const rng = createRng(2024);
  for (let i = 0; i < 7; i++) {
    const x = -60 + i * 190 + rng() * 80;
    const w = 150 + rng() * 170;
    const h = 90 + rng() * 150;
    const y = 1920;
    const g = ctx.createLinearGradient(x, y - h, x + w, y);
    g.addColorStop(0, '#1b3a46');
    g.addColorStop(0.5, '#0b1c26');
    g.addColorStop(1, '#040b10');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.bezierCurveTo(x + w * 0.1, y - h * 0.9, x + w * 0.45, y - h * 1.15, x + w * 0.6, y - h * 0.8);
    ctx.bezierCurveTo(x + w * 0.8, y - h * 0.6, x + w * 0.95, y - h * 0.2, x + w, y);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(150,220,230,0.22)';
    ctx.lineWidth = 3;
    ctx.stroke();
  }
  ctx.restore();
}

/** Towards the bait camera's lamp from the action, on screen. */
const LAMP: Pt = { x: 0.36, y: -0.93 };

export function drawBite(ctx: CanvasRenderingContext2D, t: number, boil: number, b: Backdrops): void {
  bg(ctx, b.deep);
  baitLight(ctx, t / LOOP_S);
  seabed(ctx);
  snow(ctx, t / LOOP_S, 1);
  const pose = biteAt(t);
  drawDogfish(ctx, pose.shark, pose.look, boil);
  const look: HagLook = {
    half: pose.half,
    coat: () => 0.6,
    jets: pose.jets,
    mouth: 0.6,
    pinch: pose.held > 0.01 ? { u: 0.5, k: pose.held } : undefined,
    wiggle: 50 * ((2 * Math.PI * t) / LOOP_S),
    belly: -1,
    light: LAMP,
  };
  // The slime: billowing out of the pores round the jaws from the first frame, then the burst. Most of it
  // behind the hagfish (over the shark), a veil and the squeeze at the teeth in front.
  const flow = (PUFFS * t) / LOOP_S;
  const back = newGel();
  const front = newGel();
  const gag = gagAt(t);
  const ooze = pose.held;
  if (ooze > 0.02) {
    const pores = hagPores(pose.spine, look, 0.2, 0.82, 44);
    pores.forEach((p, j) => {
      const near = 1 - clamp(Math.abs(p.u - 0.5) / 0.34);
      const flip = j % 2 === 0 ? 1 : -1;
      const raw = Math.atan2(p.out.y * flip, p.out.x * flip) + 0.35 * Math.sin(j * 2.3);
      // Never up and back over the shark's head: those billow down instead.
      const dir = Math.cos(raw) < 0.2 && Math.sin(raw) < 0 ? Math.atan2(-Math.sin(raw) * 0.6, Math.cos(raw)) : raw;
      plume(j % 3 === 1 ? front : back, p.at, dir, (120 + 190 * near) * ooze, (32 + 50 * near) * ooze, (flow + j * 0.37) % 1, 300 + j * 7, 1.3 * Math.sin(j * 1.7));
    });
    // Squeezed out round the teeth: a mass of gel at the jaws.
    for (let k = 0; k < 6; k++) {
      const a = -2.6 + k * 0.9 + 0.2 * Math.sin(2 * Math.PI * flow + k);
      const d = 34 + 16 * (k % 2);
      (k % 2 ? front : back).lobes.push({ x: pose.hold.x + Math.cos(a) * d * 1.4, y: pose.hold.y + 30 + Math.sin(a) * d, r: (52 + 16 * (k % 3)) * ooze });
    }
    threadsAlong(front, [{ x: pose.hold.x - 90, y: pose.hold.y + 30 }, { x: pose.hold.x, y: pose.hold.y + 10 }, { x: pose.hold.x + 90, y: pose.hold.y + 26 }], 30, 5, 41);
  }
  const grow = burstAt(t);
  const cloud = cloudAt(t);
  if (grow > 0.001 && cloud > 0.004) {
    burst(back, { x: pose.hold.x - 10, y: pose.hold.y + 40 }, 470 * (0.5 + 0.5 * cloud), grow, 31, t * 3);
    burst(front, { x: pose.hold.x + 20, y: pose.hold.y + 60 }, 300 * (0.5 + 0.5 * cloud), grow, 57, t * 3);
  }
  if (gag > 0.02) {
    // Gagging: gel pouring back out of the mouth on the water.
    const mouth = pose.hold;
    for (let k = 0; k < 3; k++) plume(back, { x: mouth.x - 20 * k, y: mouth.y + 10 }, Math.PI * 0.62 + k * 0.25, 220 * gag, 40 * gag, (flow * 1.5 + k / 3) % 1, 520 + k);
  }
  // Keep the shark's eye clear, so its fright reads.
  const eye = onDog(pose.shark, DOG_EYE, pose.look.bend ?? 0);
  clearAround(back, eye, 70);
  clearAround(front, eye, 70);
  paintGel(ctx, back, 0.95, LAMP);
  drawHagfish(ctx, pose.spine, look, boil);
  if (pose.held > 0.5) drawBiteJaws(ctx, pose.shark, pose.look.bend ?? 0, pose.look.gape ?? 0);
  paintGel(ctx, front, 0.85, LAMP);
  // The burst's shock ring.
  const shock = shockAt(t);
  if (shock > 0) {
    ctx.save();
    ctx.strokeStyle = `rgba(240,252,255,${(0.7 * (1 - shock)).toFixed(3)})`;
    ctx.lineWidth = 16 * (1 - shock) + 3;
    ctx.beginPath();
    ctx.arc(pose.hold.x, pose.hold.y, 80 + 760 * shock, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
}

/** Shrinks any billow that would reach within `gap` of `p`. */
function clearAround(gel: Gel, p: Pt, gap: number): void {
  gel.lobes.forEach((l, i) => {
    const d = Math.hypot(l.x - p.x, l.y - p.y);
    if (d < l.r + gap) gel.lobes[i] = { ...l, r: Math.max(0, d - gap) };
  });
}

// ---------------------------------------------------------------- the gill close-up

function bezier(a: Pt, b: Pt, c: Pt, d: Pt, n: number): Pt[] {
  return Array.from({ length: n }, (_, i) => {
    const u = i / (n - 1);
    const [p, q, r, s] = [(1 - u) ** 3, 3 * (1 - u) ** 2 * u, 3 * (1 - u) * u * u, u ** 3];
    return { x: p * a.x + q * b.x + r * c.x + s * d.x, y: p * a.y + q * b.y + r * c.y + s * d.y };
  });
}

export function drawGills(ctx: CanvasRenderingContext2D, t: number, boil: number, b: Backdrops): void {
  bg(ctx, b.gills);
  const g = gillsAt(t);
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const pool = ctx.createRadialGradient(560, 820, 40, 560, 820, 900);
  pool.addColorStop(0, 'rgba(150,190,160,0.3)');
  pool.addColorStop(1, 'rgba(60,110,90,0)');
  ctx.fillStyle = pool;
  ctx.fillRect(0, 0, VIDEO.width, VIDEO.height);
  ctx.restore();
  snow(ctx, t / LOOP_S, 0.6, 50);
  drawDogfish(ctx, g.shark, g.look, boil);
  // Five ribbons of gel, one per slit, drawn up from the slime cloud below and sucked into the slits.
  const flow = gillStreamAt(t);
  const gel = newGel();
  // The streams rise from the slime cloud below the frame.
  const source = { x: 640, y: 2080 };
  GILL_XS.forEach((x, i) => {
    const slit = onDog(g.shark, { x: x - 1.2, y: 1.5 });
    const from = { x: source.x + 260 - 130 * i, y: source.y - 90 - 30 * (i % 2) };
    const path = bezier(from, { x: from.x + 40, y: from.y - 520 }, { x: slit.x + 80 + 30 * i, y: slit.y + 330 }, slit, 28).map((p, q) => {
      const u = q / 27;
      const wob = 16 * Math.sin(t * 5 + i * 1.3 + u * 7) * (1 - u);
      return { x: p.x + wob, y: p.y };
    });
    const reach = Math.max(2, Math.round(path.length * clamp(flow * 1.2)));
    const run = path.slice(0, reach);
    gel.ribbons.push({ pts: run, w: 58 - 4 * i, peak: 0.05 });
    // Lumps of gel riding the stream into the slit, squeezing thinner as they go in.
    for (let q = 0; q < 5; q++) {
      const u = (q / 5 + t * 0.7 + i * 0.21) % 1;
      if (u > reach / path.length) continue;
      const p = path[Math.min(path.length - 1, Math.floor(u * (path.length - 1)))]!;
      gel.lobes.push({ x: p.x + 6 * Math.sin(q + i), y: p.y, r: (40 - 3 * i) * (1 - 0.7 * u) * (0.75 + 0.25 * Math.sin(q * 2.1 + i)) });
    }
    threadsAlong(gel, run, 16, 4, 600 + i);
  });
  paintGel(ctx, gel, flow, { x: 0.3, y: -0.95 });
}

// ---------------------------------------------------------------- the knot

export function drawKnot(ctx: CanvasRenderingContext2D, t: number, boil: number, b: Backdrops): void {
  bg(ctx, b.sunny);
  // Sunbeams and bubbles: a cheerful, bright water.
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (let k = 0; k < 5; k++) {
    const x = 60 + k * 240 + 40 * Math.sin(2 * Math.PI * ((t / LOOP_S) * (1 + (k % 2)) + k * 0.37));
    const g = ctx.createLinearGradient(0, 0, 0, 1500);
    g.addColorStop(0, 'rgba(255,248,190,0.3)');
    g.addColorStop(1, 'rgba(255,248,190,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(x - 30, 0);
    ctx.lineTo(x + 70, 0);
    ctx.lineTo(x + 320, 1500);
    ctx.lineTo(x + 90, 1500);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
  snow(ctx, t / LOOP_S, 1.2, 70);
  const k = knotAt(t);
  // The shark, small and far, swimming away green around the gills.
  const far = { x: lerp(330, -420, clamp((t - 12.5) / 3.9)), y: 520 + 16 * Math.sin(t * 2.2), len: 360, rot: -0.03, face: -1 as const, beat: t * 6 };
  ctx.save();
  ctx.globalAlpha = 0.72;
  drawDogfish(ctx, far, { gape: 0.15, flare: 0.5, bend: 0.1 * Math.sin(t * 4) }, boil);
  ctx.restore();
  drawHagfish(ctx, k.spine, { half: k.half, coat: k.coat, depth: k.depth, mouth: 0.5, wiggle: t * 9, belly: 1 }, boil);
  // Beads and strands of slime hanging off the coated skin: fewer as the knot wipes it away.
  for (let i = 6; i < k.spine.length - 4; i += 9) {
    const c = k.coat(i / (k.spine.length - 1));
    if (c < 0.2) continue;
    const p = k.spine[i]!;
    glassBlob(ctx, p.x + 6, p.y + k.half * 0.9, (12 + 8 * ((i * 7) % 3)) * c, (15 + 9 * ((i * 5) % 3)) * c, 1.3 * c);
    glassStrand(ctx, [{ x: p.x + 6, y: p.y + k.half }, { x: p.x + 2 + 4 * Math.sin(t * 4 + i), y: p.y + k.half + 40 * c }, { x: p.x + 8, y: p.y + k.half + 70 * c }], 5, 0.8 * c);
  }
  // The scraped slime gathers at the knot, then flicks off the tail.
  const pile = pileAt(t);
  if (pile > 0.01) {
    const r = 26 + 54 * k.slide;
    glassBlob(ctx, k.pile.x + 20, k.pile.y + 10, r * pile, r * 0.8 * pile, 1.2);
    glassBlob(ctx, k.pile.x + 80 * pile, k.pile.y + 40, r * 0.55 * pile, r * 0.5 * pile, 1.1);
  }
  const age = flickAge(t);
  if (age > 0 && age < 1.2) {
    const rng = createRng(55);
    for (let i = 0; i < 12; i++) {
      const a = -0.3 - rng() * 2.2;
      const sp = 260 + rng() * 420;
      const x = k.tip.x + Math.cos(a) * sp * age * 0.9;
      const y = k.tip.y + Math.sin(a) * sp * age + 700 * age * age;
      glassBlob(ctx, x, y, (10 + rng() * 22) * (1 - age / 1.2), (8 + rng() * 18) * (1 - age / 1.2), 1.2 * (1 - age / 1.2));
    }
  }
  // Sparkles on the clean skin.
  const sp = sparkleAt(t);
  if (sp > 0.01) {
    const rng = createRng(808);
    for (let i = 0; i < 9; i++) {
      const c = k.spine[Math.floor(rng() * k.spine.length)]!;
      sparkle(ctx, c.x + (rng() - 0.5) * 60, c.y - 30 - rng() * 50, (16 + rng() * 22) * (0.5 + 0.5 * Math.sin(t * 9 + i * 2)), sp);
    }
  }
}

/** A four-point twinkle. */
function sparkle(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, alpha: number): void {
  if (r < 1) return;
  ctx.save();
  ctx.translate(x, y);
  ctx.globalAlpha = alpha;
  ctx.fillStyle = '#fffbe0';
  ctx.beginPath();
  for (let i = 0; i < 8; i++) {
    const a = (i * Math.PI) / 4;
    const rr = i % 2 === 0 ? r : r * 0.26;
    ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
  }
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}
