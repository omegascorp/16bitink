import { INK, Pen, pathOf } from '../../../src/art/pen';
import { createRng } from '../../../src/logic/rng';
import { VIDEO } from '../short';
import { type Pt, project, pt, ring } from './geom';
import { cycles, MUSSEL_SPACING, type Rgb } from './story';

/**
 * The tide pool: dark green-blue water on the game's paper, rocks fading
 * into the dark behind, surfgrass swaying, light rippling down from the
 * surface, and the rock ledge the star and the mussels sit on, with
 * barnacles, pink coralline crust and green anemones. The ledge slides by
 * as the star glides to the next mussel; its dressing repeats every
 * MUSSEL_SPACING so the seam can't jump.
 */

const POOL_TOP: Rgb = [24, 62, 70];
const POOL_MID: Rgb = [9, 30, 38];
const POOL_BOTTOM: Rgb = [3, 10, 14];
const ROCK = '#3b3631';
const ROCK_LIGHT = '#6e655a';
const ROCK_DARK = '#15130f';
const CORALLINE = '#c57a8f';
const ANEMONE = '#5fa36b';

const css = (c: Rgb, a: number): string => `rgba(${c.join(',')},${a})`;

/** The water behind everything, baked once: paper, a wash, far rocks in the murk. */
export function makeBackWater(sheet: HTMLCanvasElement): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = VIDEO.width;
  canvas.height = VIDEO.height;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(sheet, 0, 0);
  const g = ctx.createLinearGradient(0, 0, 0, VIDEO.height);
  g.addColorStop(0, css(POOL_TOP, 0.93));
  g.addColorStop(0.5, css(POOL_MID, 0.95));
  g.addColorStop(1, css(POOL_BOTTOM, 0.97));
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, VIDEO.width, VIDEO.height);
  // Far rocks: two dim layers of boulders.
  const pen = new Pen(ctx, 88, 1.4);
  const rng = createRng(512);
  for (const [y, alpha, size] of [[660, 0.35, 1], [760, 0.55, 1.4]] as const) {
    for (let x = -100; x < VIDEO.width + 200; x += 160 * size + rng() * 120) {
      const r = (90 + rng() * 80) * size;
      const blob = ring(x, y + rng() * 40, r, r * (0.55 + rng() * 0.2), 22).map((p, i) => pt(p.x + Math.sin(i * 2.1) * 9, Math.min(p.y, y + 220)));
      pen.fill(blob, '#06141a', alpha);
      pen.stroke([...blob.slice(10, 22)], 2, '#0c262e', alpha * 0.8);
    }
  }
  return canvas;
}

const FRONDS = (() => {
  const rng = createRng(9090);
  return Array.from({ length: 13 }, () => ({ x: rng() * VIDEO.width, h: 320 + rng() * 420, lean: (rng() - 0.5) * 0.5, phase: rng() * Math.PI * 2, w: 9 + rng() * 9, sways: 1 + Math.floor(rng() * 2) }));
})();

/** Surfgrass blades behind the ledge, swaying in whole cycles a loop. */
export function drawFronds(ctx: CanvasRenderingContext2D, t: number, boil: number): void {
  const pen = new Pen(ctx, 140 + boil * 13, 1.2);
  for (const f of FRONDS) {
    const base = pt(f.x, 900);
    const pts: Pt[] = [];
    for (let i = 0; i <= 14; i++) {
      const v = i / 14;
      const sway = 40 * v * v * Math.sin(cycles(f.sways * 3, t) + f.phase + v * 2);
      pts.push(pt(base.x + f.lean * f.h * v + sway, base.y - f.h * v));
    }
    pen.stroke(pts, f.w, '#1f4a35', 0.55, false);
    pen.hair(pts, 1.4, '#3f7a52', 0.4);
  }
}

/** Light rippling down from the surface: soft bright bands that drift (whole cycles a loop). */
export function drawCaustics(ctx: CanvasRenderingContext2D, t: number, strength: number): void {
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  ctx.lineCap = 'round';
  for (let i = 0; i < 9; i++) {
    const y0 = 120 + i * 120;
    ctx.strokeStyle = `rgba(160,220,210,${(0.05 * strength).toFixed(3)})`;
    ctx.lineWidth = 26 + (i % 3) * 10;
    ctx.beginPath();
    for (let x = -40; x <= VIDEO.width + 40; x += 30) {
      const y = y0 + 34 * Math.sin(x / 140 + cycles(2, t) + i) + 18 * Math.sin(x / 57 - cycles(3, t) + i * 2);
      if (x === -40) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  ctx.restore();
}

// ---------------------------------------------------------------- the ledge

/** The ledge's near and far edges (pool z) and its dressing, laid out over one mussel spacing. */
const FAR_Z = -440;
const NEAR_Z = 1000;

interface Dressing {
  readonly kind: 'barnacle' | 'coralline' | 'anemone' | 'crack' | 'mussels' | 'pebble';
  readonly x: number;
  readonly z: number;
  readonly r: number;
  readonly seed: number;
}

const DRESSING: readonly Dressing[] = (() => {
  const rng = createRng(4242);
  const out: Dressing[] = [];
  const add = (kind: Dressing['kind'], n: number, zs: readonly [number, number], rs: readonly [number, number], avoidMiddle: boolean): void => {
    for (let i = 0; i < n; i++) {
      let x = (rng() - 0.5) * MUSSEL_SPACING;
      if (avoidMiddle && Math.abs(x) < 300) x = Math.sign(x || 1) * (300 + rng() * 300);
      out.push({ kind, x, z: zs[0] + rng() * (zs[1] - zs[0]), r: rs[0] + rng() * (rs[1] - rs[0]), seed: Math.floor(rng() * 1e6) });
    }
  };
  add('coralline', 12, [-420, 950], [50, 130], false);
  add('crack', 10, [-380, 950], [80, 200], false);
  add('pebble', 14, [-400, 950], [10, 26], true);
  add('barnacle', 34, [-420, 950], [9, 20], false);
  add('anemone', 2, [380, 700], [36, 52], true);
  add('mussels', 3, [-430, -360], [40, 60], true);
  return out.sort((a, b) => a.z - b.z);
})();

/** The ledge's top surface between the far and the near edge, with a lumpy far edge. */
function ledgeShape(): Pt[] {
  const far: Pt[] = [];
  for (let x = -900; x <= 900; x += 40) far.push(project({ x, y: 18 * Math.sin(x / 70) + 12 * Math.sin(x / 23), z: FAR_Z }));
  const near: Pt[] = [];
  for (let x = 900; x >= -900; x -= 40) near.push(project({ x, y: 0, z: NEAR_Z + 20 * Math.sin(x / 90) }));
  return [...far, ...near];
}

export function drawLedge(ctx: CanvasRenderingContext2D, pan: number, t: number, boil: number): void {
  const pen = new Pen(ctx, 300 + boil * 41, 1.2);
  const top = ledgeShape();
  // The ledge's face below its near edge, down out of the frame.
  const face = [...top.slice(top.length / 2), pt(-900 + 540, 3000), pt(900 + 540, 3000)];
  pen.fill(face, ROCK_DARK, 1);
  pen.fill(top, ROCK, 1);
  pen.clipped(top, () => {
    const a = project({ x: 0, y: 0, z: FAR_Z });
    const b = project({ x: 0, y: 0, z: NEAR_Z });
    const g = ctx.createLinearGradient(0, a.y, 0, b.y);
    g.addColorStop(0, 'rgba(10,20,22,0.7)');
    g.addColorStop(0.4, 'rgba(110,101,90,0.25)');
    g.addColorStop(1, 'rgba(20,18,15,0.6)');
    ctx.fillStyle = g;
    pathOf(ctx, top);
    ctx.fill();
    for (const d of DRESSING) {
      for (const k of [-1, 0, 1, 2]) {
        const x = d.x + k * MUSSEL_SPACING - pan;
        if (x < -760 || x > 760) continue;
        drawDressing(pen, d, x, t);
      }
    }
  });
  pen.stroke(top.slice(0, top.length / 2), 3, INK, 0.8);
  pen.stroke(top.slice(top.length / 2), 3.4, INK, 0.9);
  // Hatching down the face.
  pen.hatch(face, 26, 1.2, 1.6, { color: '#000000', alpha: 0.35 });
}

function drawDressing(pen: Pen, d: Dressing, x: number, t: number): void {
  const c = project({ x, y: 0, z: d.z });
  const rng = createRng(d.seed);
  if (d.kind === 'coralline') {
    const blob = ring(c.x, c.y, d.r, d.r * 0.42, 18).map((p, i) => pt(p.x + Math.sin(i * 1.7 + d.seed) * d.r * 0.15, p.y + Math.cos(i * 2.3) * d.r * 0.06));
    pen.fill(blob, CORALLINE, 0.38);
    pen.stipple(blob, Math.round(d.r * 3), () => 0.6, 1.6, '#f0b6c4');
  } else if (d.kind === 'crack') {
    const pts: Pt[] = [];
    for (let i = 0; i <= 6; i++) pts.push(pt(c.x - d.r / 2 + (d.r * i) / 6, c.y + (rng() - 0.5) * 14));
    pen.hair(pts, 2.2, ROCK_DARK, 0.8);
    pen.hair(pts.map((p) => pt(p.x, p.y + 4)), 1.4, ROCK_LIGHT, 0.4);
  } else if (d.kind === 'pebble') {
    const blob = ring(c.x, c.y, d.r, d.r * 0.6, 12);
    pen.fill(blob, ROCK_LIGHT, 0.7);
    pen.stroke([...blob, blob[0]!], 1.6, INK, 0.7);
  } else if (d.kind === 'barnacle') {
    const r = d.r;
    const cone = [pt(c.x - r, c.y + r * 0.3), pt(c.x - r * 0.5, c.y - r * 0.7), pt(c.x + r * 0.5, c.y - r * 0.7), pt(c.x + r, c.y + r * 0.3)];
    pen.fill(cone, '#d8cfb8', 0.85);
    pen.hair([pt(c.x - r * 0.25, c.y + r * 0.3), pt(c.x - r * 0.12, c.y - r * 0.65)], 1.2, INK, 0.6);
    pen.stroke([...cone, cone[0]!], 1.8, INK, 0.85, false);
    pen.fill(ring(c.x, c.y - r * 0.7, r * 0.4, r * 0.16, 10), INK, 0.85);
  } else if (d.kind === 'anemone') {
    // A green anemone: a squat column and a ring of stubby tentacles that sway.
    const r = d.r;
    pen.fill(ring(c.x, c.y, r * 0.9, r * 0.35, 18), '#2e5a37', 0.95);
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2;
      const sway = 0.25 * Math.sin(cycles(4, t) + i);
      const base = pt(c.x + Math.cos(a) * r * 0.75, c.y - r * 0.25 + Math.sin(a) * r * 0.28);
      const tip = pt(base.x + Math.cos(a + sway) * r * 0.55, base.y - r * 0.45 + Math.sin(a) * r * 0.2);
      pen.stroke([base, tip], 7, ANEMONE, 0.95, false);
      pen.dot(tip.x, tip.y, 3.4, '#cde8b0', 0.9);
    }
    pen.fill(ring(c.x, c.y - r * 0.28, r * 0.5, r * 0.2, 14), '#9fd1a0', 0.8);
    pen.fill(ring(c.x, c.y - r * 0.28, r * 0.15, r * 0.07, 10), INK, 0.8);
  } else {
    // A small clump of mussels at the back.
    for (let i = 0; i < 4; i++) {
      const mx = c.x + (i - 1.5) * d.r * 0.55;
      const shell = ring(mx, c.y - d.r * 0.35, d.r * 0.22, d.r * 0.5, 14).map((p) => pt(p.x + (p.y - c.y) * 0.25 * (i % 2 ? 1 : -1), p.y));
      pen.fill(shell, '#141826', 0.95);
      pen.hair(shell.slice(2, 8), 2, '#5c6688', 0.5);
      pen.stroke([...shell, shell[0]!], 1.8, INK, 0.8);
    }
  }
}
