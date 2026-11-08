import { INK, type Pt } from '../../../../src/art/pen';
import type { KitEntry } from '../../foodchain/kit';
import { spline } from '../../kraken/whale';
import { inkEdge, unit } from '../../polarshark/art/bearFur';
import { type Box, type Brush, dab, fadeRoot, px, smoothLoop, softLine, taper } from '../../seal/art/paint';
import { blink, cheekTooth, drawEye, type EyeLook, fang, fringe, fur, gum, inside, makeHead, rimShade, wash, whiskers } from './catRig';
import type { DrawHead } from './contract';

/**
 * An adult male lion's head and shoulders (see contract.ts), painted: a full mane, golden round the face and
 * darkening to brown at the back and down the chest, laid in long layered locks whose tips break the outline; a
 * tawny face with a long straight bridge, a broad nose with a dark tip, a heavy muzzle with a pale whisker pad and
 * chin, amber eyes, small round ears half lost in the mane. Open, the cat's dentition: long canines, small
 * incisors, the carnassial blades.
 * Own units (catRig.ts): head 100 long, the bite point at 0,0.
 */

// ---------------------------------------------------------------- shape

/** The face, in front of the mane: from the nose up the bridge, round the mane's front edge, to the mouth. */
const BROW: readonly Pt[] = spline([
  { x: -40, y: -55 }, { x: -30, y: -49.5 }, { x: -18, y: -41.5 }, { x: -6, y: -35 }, { x: 4, y: -30.5 }, { x: 11, y: -27 },
], 5);
const NOSE_FRONT: readonly Pt[] = spline([
  { x: 11, y: -27 }, { x: 15, y: -22 }, { x: 15.6, y: -16.5 }, { x: 14, y: -13.2 }, { x: 15.4, y: -8.4 }, { x: 14.4, y: -3.4 }, { x: 11.2, y: -0.4 }, { x: 8, y: 0 },
], 4);
const ROOF: readonly Pt[] = spline([{ x: 8, y: 0 }, { x: 0, y: 0.3 }, { x: -12, y: 0.4 }, { x: -24, y: 0.5 }, { x: -36, y: 1.1 }, { x: -46, y: 2.2 }], 5);
/** The cheek's back edge where the mane begins, from the mouth's corner up behind the eye to the brow. */
const CHEEK_BACK: readonly Pt[] = spline([
  { x: -46, y: 2.2 }, { x: -52, y: 8 }, { x: -60, y: 10 }, { x: -66, y: -2 }, { x: -67, y: -18 }, { x: -62, y: -34 }, { x: -52, y: -48 }, { x: -40, y: -55 },
], 5);
const FACE: readonly Pt[] = [...BROW, ...NOSE_FRONT.slice(1), ...ROOF.slice(1), ...CHEEK_BACK.slice(1, -1)];

/** The mane: over the crown, down the back of the neck to the shoulder, round under the chin and down the chest. */
const MANE_TOP: readonly Pt[] = spline([
  { x: -192, y: -34 }, { x: -170, y: -56 }, { x: -146, y: -76 }, { x: -118, y: -92 }, { x: -92, y: -98 }, { x: -70, y: -94 },
  { x: -54, y: -80 }, { x: -44, y: -64 }, { x: -37, y: -53 },
], 5);
const MANE_FRONT: readonly Pt[] = spline([
  { x: -46, y: 2.2 }, { x: -50, y: 8 }, { x: -54, y: 16 }, { x: -56, y: 30 }, { x: -60, y: 52 }, { x: -70, y: 80 }, { x: -84, y: 108 }, { x: -100, y: 132 },
], 5);
const MANE: readonly Pt[] = [...MANE_TOP, ...[...CHEEK_BACK].reverse(), ...MANE_FRONT.slice(1), { x: -150, y: 136 }, { x: -196, y: 120 }, { x: -198, y: 40 }];

/** A band just over the mane's top, where locks may root so the top edge is hair, not a filled shape. */
const HALO: readonly Pt[] = [...MANE_TOP.map((p) => ({ x: p.x, y: p.y - 9 })), ...[...MANE_TOP].reverse()];

const EAR: readonly Pt[] = smoothLoop([
  { x: -62, y: -66 }, { x: -63, y: -74 }, { x: -67.5, y: -80 }, { x: -74, y: -80.5 }, { x: -79, y: -75 }, { x: -81, y: -67 },
], 5);
const NOSE: readonly Pt[] = smoothLoop([
  { x: 4, y: -29.5 }, { x: 11, y: -27.4 }, { x: 15, y: -22 }, { x: 15.7, y: -16.4 }, { x: 13.8, y: -13.4 }, { x: 10.4, y: -15.6 }, { x: 6.4, y: -21.6 }, { x: 3.4, y: -26.6 },
], 4);
const NOSE_TIP: readonly Pt[] = smoothLoop([
  { x: 11.6, y: -25.8 }, { x: 15, y: -22 }, { x: 15.7, y: -16.4 }, { x: 13.8, y: -13.4 }, { x: 11.6, y: -15.4 }, { x: 11, y: -20 },
], 4);
const MUZZLE_PALE: readonly Pt[] = smoothLoop([
  { x: 15.2, y: -11.5 }, { x: 15.4, y: -7.5 }, { x: 14.4, y: -3 }, { x: 11.2, y: -0.4 }, { x: -4, y: 0.6 }, { x: -14, y: -0.4 }, { x: -20, y: -4 },
  { x: -18, y: -10 }, { x: -10, y: -15.5 }, { x: 0, y: -18 }, { x: 9, y: -17 },
], 4);

const FLOOR: readonly Pt[] = spline([{ x: 10.4, y: 0.2 }, { x: 0, y: 0.4 }, { x: -12, y: 0.5 }, { x: -24, y: 0.6 }, { x: -36, y: 1.2 }, { x: -46, y: 2.4 }], 5);
const JAW_UNDER: readonly Pt[] = spline([
  { x: -68, y: 17 }, { x: -52, y: 19.5 }, { x: -34, y: 19.2 }, { x: -18, y: 17.6 }, { x: -6, y: 15.6 }, { x: 3, y: 12.6 }, { x: 8.6, y: 7 }, { x: 10.4, y: 0.2 },
], 5);
const JAW: readonly Pt[] = [...FLOOR, { x: -54, y: -1.5 }, { x: -63, y: -3 }, { x: -71, y: 3 }, ...JAW_UNDER.slice(0, -1)];
const HINGE: Pt = { x: -58, y: -2 };

const EYE: EyeLook = {
  at: { x: -24, y: -37 }, w: 12.5, h: 3.9, tilt: 0.16, irisIn: '#f2bc52', irisOut: '#a8641c', pupil: 0.6, lid: '#c08a50', ring: '242,230,204',
};

// ---------------------------------------------------------------- colour

const TAWNY = '#c69257';
const TAWNY_LIT = '#f0cf98';
const TAWNY_DARK = '#6e4622';
const PALE = '#efe4cc';
const BLACK = '#1d130b';
const flowFace = (p: Pt): Pt => unit(-1, (p.y + 24) * 0.022);

// ---------------------------------------------------------------- the mane

/** Where the mane's hair runs at p: out from the face, falling back and down more the further it hangs. */
function maneFlow(p: Pt): Pt {
  const dx = p.x + 22;
  const dy = p.y + 14;
  const r = unit(dx, dy);
  const fall = 0.35 + Math.hypot(dx, dy) / 110;
  return unit(r.x * 0.75 - 0.3, r.y * 0.55 + fall);
}

interface LockLook { readonly colour: string; readonly alpha: number; readonly width: number; readonly len: number }

/** A spindle with an S-curve along `line`: narrow at the root, full in the middle, tapering to a fine tip. */
function spindle(ctx: CanvasRenderingContext2D, line: readonly Pt[], width: number, colour: string, alpha: number): void {
  const left: Pt[] = [];
  const right: Pt[] = [];
  line.forEach((p, i) => {
    const a = line[Math.max(0, i - 1)]!;
    const b = line[Math.min(line.length - 1, i + 1)]!;
    const d = unit(b.x - a.x, b.y - a.y);
    const u = i / (line.length - 1);
    const w = (width / 2) * Math.pow(Math.sin(Math.PI * Math.min(1, u * 1.25 + 0.08)), 0.7);
    left.push({ x: p.x - d.y * w, y: p.y + d.x * w });
    right.push({ x: p.x + d.y * w, y: p.y - d.x * w });
  });
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = colour;
  ctx.beginPath();
  [...left, ...right.reverse()].forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

/**
 * A lock of mane: a long S-curved spindle from its root, following the flow as it goes (or, given `out`, starting
 * out that way and bending into the flow); returns its path.
 */
function lock(k: Brush, root: Pt, look: LockLook, out?: Pt): Pt[] {
  const { pen, ctx } = k;
  const pts: Pt[] = [root];
  const wave = (pen.rng() - 0.5) * 0.9;
  const steps = 8;
  for (let i = 1; i <= steps; i++) {
    const p = pts[i - 1]!;
    const f = maneFlow(p);
    const w = out ? 0.55 - 0.35 * (i / steps) : 0;
    const d = out ? unit(out.x * w + f.x * (1 - w), out.y * w + f.y * (1 - w)) : f;
    const sway = wave * Math.sin((i / steps) * Math.PI * 1.6);
    pts.push({ x: p.x + (d.x - d.y * sway) * (look.len / steps), y: p.y + (d.y + d.x * sway) * (look.len / steps) });
  }
  const line = spline(pts, 3);
  spindle(ctx, line, look.width, look.colour, look.alpha);
  return line;
}

/** The mane's tone at p: golden near the face and on top, brown behind and below. */
function maneTone(p: Pt): number {
  const nearFace = Math.max(0, 1 - Math.hypot(p.x + 46, (p.y + 20) * 0.9) / 80);
  const top = Math.max(0, Math.min(1, (-p.y - 30) / 60));
  return Math.min(1, nearFace * 0.85 + top * 0.35);
}

const MANE_DARK = ['#24130a', '#3a200e', '#4e2c14'] as const;
const MANE_MID = ['#6a3e1a', '#80501f', '#9a6428'] as const;
const MANE_LIT = ['#b98236', '#d0a052', '#e4bf7c'] as const;

function pick<T>(list: readonly T[], r: number): T {
  return list[Math.min(list.length - 1, Math.floor(r * list.length))]!;
}

function maneRoots(k: Brush, count: number, keep: (p: Pt) => boolean = () => true): Pt[] {
  const b = { x0: -198, x1: -36, y0: -108, y1: 136 };
  const out: Pt[] = [];
  for (let tries = 0; out.length < count && tries < count * 20; tries++) {
    const p = { x: b.x0 + k.pen.rng() * (b.x1 - b.x0), y: b.y0 + k.pen.rng() * (b.y1 - b.y0) };
    if ((inside(MANE, p) || inside(HALO, p)) && !inside(FACE, p) && keep(p)) out.push(p);
  }
  return out;
}

/** Locks in three layers, back to front: wide and dark, then mid tones, then finer lit ones; the outline is theirs. */
function maneLayers(k: Brush, scale: number, keep?: (p: Pt) => boolean): void {
  const { pen } = k;
  for (const p of maneRoots(k, Math.round(320 * scale), keep)) {
    lock(k, p, { colour: pick(MANE_DARK, pen.rng()), alpha: 0.8, width: 2.6 + pen.rng() * 2, len: 30 + pen.rng() * 26 });
  }
  for (const p of maneRoots(k, Math.round(420 * scale), keep)) {
    const lit = pen.rng() < maneTone(p) * 0.8;
    lock(k, p, { colour: lit ? pick(MANE_LIT, pen.rng()) : pick(MANE_MID, pen.rng()), alpha: 0.75, width: 1.8 + pen.rng() * 1.6, len: 24 + pen.rng() * 20 });
  }
  const edge: Pt[][] = [];
  for (const p of maneRoots(k, Math.round(480 * scale), keep)) {
    const tone = maneTone(p);
    const lit = pen.rng() < tone;
    const line = lock(k, p, { colour: lit ? pick(MANE_LIT, pen.rng()) : pick(pen.rng() < 0.5 ? MANE_MID : MANE_DARK, pen.rng()), alpha: lit ? 0.85 : 0.7, width: 1.1 + pen.rng() * 1.3, len: 16 + pen.rng() * 18 });
    if (lit) pen.hair(line.slice(2, -3).map((q) => ({ x: q.x - 0.4, y: q.y - 0.5 })), px(k, 0.8), '#f6dca8', 0.5);
    pen.hair(line.slice(1).map((q) => ({ x: q.x + 0.9, y: q.y + 1 })), px(k, 0.8), '#1c0e06', 0.3);
    if (!inside(MANE, line[line.length - 1]!)) edge.push(line);
  }
  for (const line of edge) {
    if (pen.rng() < 0.3) continue;
    pen.hair(line.slice(Math.floor(line.length / 3)), px(k, 1.1), INK, 0.6);
  }
}

/** Locks breaking out across the mane's outline, rooted inside it, pointing out and along the fall; inked. */
function maneEdge(k: Brush, line: readonly Pt[], side: 1 | -1, every: number): void {
  const { pen } = k;
  for (let i = 1; i < line.length - 1; i += Math.max(1, Math.round(every * (0.6 + pen.rng() * 0.8)))) {
    const a = line[i - 1]!;
    const b = line[i + 1]!;
    const t = unit(b.x - a.x, b.y - a.y);
    const n = { x: t.y * side, y: -t.x * side };
    const p = line[i]!;
    const root = { x: p.x - n.x * (5 + pen.rng() * 6), y: p.y - n.y * (5 + pen.rng() * 6) };
    const tone = maneTone(root);
    const lit = pen.rng() < tone * 0.8;
    const look = { colour: lit ? pick(MANE_LIT, pen.rng()) : pick(pen.rng() < 0.5 ? MANE_MID : MANE_DARK, pen.rng()), alpha: 0.95, width: 1.4 + pen.rng() * 1.6, len: 10 + pen.rng() * 12 };
    const path = lock(k, root, look, n);
    if (pen.rng() < 0.75) pen.hair(path.slice(Math.floor(path.length * 0.35)), px(k, 1.2), INK, 0.7);
  }
}

function paintMane(k: Brush): void {
  const { pen, ctx } = k;
  wash(k, MANE, '#4e2e16', -90, 136, [[0, 'rgba(220,170,90,0.4)'], [0.35, 'rgba(160,110,50,0.15)'], [0.75, 'rgba(20,10,2,0.3)'], [1, 'rgba(14,6,2,0.55)']]);
  pen.clipped(MANE, () => {
    dab(ctx, -66, -24, 44, '196,140,66', 0.5);
    dab(ctx, -74, -62, 26, '220,170,96', 0.35);
    dab(ctx, -160, 10, 70, '20,10,4', 0.55);
    dab(ctx, -110, 110, 56, '16,8,2', 0.55);
  });
  maneLayers(k, 1);
  maneEdge(k, MANE_TOP.slice(0, -6).map((p) => ({ x: p.x, y: p.y - 6 })), 1, 1);
  maneEdge(k, MANE_FRONT.slice(2), 1, 1);
  fur(k, MANE, {
    n: 1200, flow: maneFlow, len: [8, 16], bend: 0.6,
    tint: (p, r) => (r < 0.3 + 0.4 * maneTone(p) ? ['#f2d29a', 0.25] : ['#1c0e06', 0.25]),
  });
}

/** Locks rooted along the face's edge, lapping out over the mane, so the face sits in it rather than on it. */
function paintRuff(k: Brush): void {
  const { pen } = k;
  const line = CHEEK_BACK.slice(3);
  for (let i = 0; i < 150; i++) {
    const j = 1 + Math.floor(pen.rng() * (line.length - 2));
    const at = line[j]!;
    const t = unit(line[j + 1]!.x - line[j - 1]!.x, line[j + 1]!.y - line[j - 1]!.y);
    const n = { x: t.y, y: -t.x };
    const n2 = n.x > 0 ? { x: -n.x, y: -n.y } : n;
    const root = { x: at.x - n2.x * (2 + pen.rng() * 4), y: at.y - n2.y * (2 + pen.rng() * 4) };
    const r = pen.rng();
    const colour = r < 0.35 ? '#c8945a' : r < 0.7 ? pick(MANE_LIT, pen.rng()) : pick(MANE_MID, pen.rng());
    lock(k, root, { colour, alpha: 0.9, width: 1.2 + pen.rng() * 1.4, len: 9 + pen.rng() * 12 }, n2);
  }
  // The beard under the chin and down the throat, in front of the rest.
  for (let i = 0; i < 60; i++) {
    const root = { x: -58 - pen.rng() * 14, y: 8 + pen.rng() * 50 };
    if (!inside(MANE, root)) continue;
    const lit = pen.rng() < 0.45;
    lock(k, root, { colour: lit ? pick(MANE_LIT, pen.rng()) : pick(MANE_MID, pen.rng()), alpha: 0.85, width: 1.8 + pen.rng() * 1.8, len: 14 + pen.rng() * 14 });
  }
}

function paintEar(k: Brush): void {
  const { pen, ctx } = k;
  wash(k, EAR, '#a87a44', -84, -64, [[0, 'rgba(255,220,160,0.3)'], [0.6, 'rgba(0,0,0,0)'], [1, 'rgba(60,30,8,0.4)']]);
  rimShade(k, EAR, '#1c120a', 4, 0.95);
  pen.clipped(EAR, () => {
    dab(ctx, -70, -72, 5.5, '240,226,196', 0.9);
    for (let i = 0; i < 18; i++) {
      const x = -76 + pen.rng() * 12;
      pen.hair([{ x, y: -64 }, { x: x - 0.4, y: -69 }, { x: x - 1.6 + pen.rng() * 1.5, y: -73 - pen.rng() * 5 }], px(k, 0.8), i % 3 ? '#fbf3df' : '#6a4a2a', 0.7);
    }
  });
  pen.stroke(EAR.filter((p) => p.y < -67), px(k, 1.8), INK, 0.95, false);
}

// ---------------------------------------------------------------- the face

function paintFace(k: Brush): void {
  const { pen, ctx } = k;
  wash(k, FACE, TAWNY, -56, 12, [[0, 'rgba(255,230,170,0.5)'], [0.4, 'rgba(255,220,150,0.08)'], [0.8, 'rgba(90,50,15,0.15)'], [1, 'rgba(60,30,8,0.35)']]);
  pen.clipped(FACE, () => {
    // The long bridge lit, the brow, shade under it and down the side of the muzzle, the cheek swelling, shade behind it.
    softLine(ctx, [{ x: 8, y: -29 }, { x: -6, y: -36 }, { x: -22, y: -45 }, { x: -36, y: -53 }], 6, '#ffe6b4', 0.55);
    dab(ctx, -36, -46, 12, '255,232,180', 0.35);
    softLine(ctx, [{ x: -38, y: -40 }, { x: -28, y: -43 }, { x: -14, y: -38 }], 6, '#5a3410', 0.25);
    softLine(ctx, [{ x: -6, y: -26 }, { x: -18, y: -27 }, { x: -30, y: -22 }], 8, '#6a3e14', 0.22);
    dab(ctx, -44, -16, 16, '255,228,170', 0.3);
    softLine(ctx, [{ x: -60, y: -32 }, { x: -64, y: -14 }, { x: -58, y: 4 }], 10, '#4a2808', 0.35);
    softLine(ctx, [{ x: -50, y: -6 }, { x: -38, y: 0 }, { x: -26, y: -2 }], 8, '#5a3410', 0.2);
    // The pale whisker pad and the pale fur round the eye.
    pen.fill(MUZZLE_PALE, '#eadcc0', 0.85);
    pen.clipped(MUZZLE_PALE, () => {
      softLine(ctx, [...MUZZLE_PALE, MUZZLE_PALE[0]!], 7, TAWNY, 0.5);
      softLine(ctx, [{ x: 12, y: -1 }, { x: -6, y: -0.5 }, { x: -24, y: -2 }], 5, '#9a8a70', 0.35);
      dab(ctx, 6, -13, 8, '255,255,255', 0.5);
    });
    dab(ctx, -26, -32, 7, '248,240,222', 0.6);
    dab(ctx, -24, -44, 5, '248,238,214', 0.45);
    fur(k, FACE, {
      n: 1500, flow: flowFace, len: [2.4, 5],
      tint: (p, r) => {
        if (inside(MUZZLE_PALE, p)) return r < 0.6 ? ['#ffffff', 0.4] : ['#8f8068', 0.22];
        const lit = Math.max(0, Math.min(1, (-p.y + 10) / 60));
        return r < 0.3 + 0.45 * lit ? [TAWNY_LIT, 0.4] : [TAWNY_DARK, 0.26];
      },
    });
    // The whisker pad's dark dotted rows.
    for (let row = 0; row < 4; row++) {
      for (let i = 0; i < 6; i++) pen.dot(11.5 - i * 2.8 - row * 0.6, -12 + row * 2.4 + i * 0.35, px(k, 1.3) + 0.25, '#3a2618', 0.55);
    }
  });
  // The cheek's short fur breaking into the mane.
  fringe(k, CHEEK_BACK.slice(4, -2), {
    side: -1, flow: (p) => unit(-1, 0.3 + p.y * 0.01), len: () => [3, 6], every: 0.8, width: 1.3,
    colour: (_, r) => (r < 0.5 ? [TAWNY, 0.9] : r < 0.8 ? [TAWNY_LIT, 0.7] : [TAWNY_DARK, 0.6]),
  });
  // The nose: broad, pinkish brown, the tip and nostril dark, a sheen on top.
  wash(k, NOSE, '#a86a58', -29.5, -13.4, [[0, 'rgba(230,170,150,0.6)'], [0.5, 'rgba(180,110,95,0.1)'], [1, 'rgba(50,20,15,0.5)']]);
  pen.fill(NOSE_TIP, '#2a1810', 0.9);
  rimShade(k, NOSE, '#2a140e', 2, 0.6);
  pen.hair(spline([{ x: 15.4, y: -18 }, { x: 13.4, y: -17.2 }, { x: 11.8, y: -15.2 }], 3), px(k, 2.4), '#0e0806', 0.95);
  dab(ctx, 10, -25, 2.2, '255,235,225', 0.65);
  pen.stroke([...NOSE, NOSE[0]!], px(k, 1.3), INK, 0.9, false);
  // The philtrum, the black lips, the line of the pad and the brow; the dark line from the eye down the muzzle.
  pen.hair(spline([{ x: 13.8, y: -13.4 }, { x: 15.2, y: -8.4 }, { x: 14.2, y: -3.4 }, { x: 11, y: -0.3 }], 4), px(k, 1.3), INK, 0.85);
  taper(ctx, ROOF.filter((p) => p.x > -32), 2.3, 0.6, BLACK, 0.95);
  pen.hair(spline([{ x: 8, y: -19 }, { x: -4, y: -20.5 }, { x: -18, y: -17.5 }, { x: -27, y: -10 }, { x: -30, y: -2 }], 5), px(k, 0.9), '#4a3020', 0.35);
  pen.hair(spline([{ x: -32, y: -41.5 }, { x: -24, y: -44 }, { x: -16, y: -41 }], 4), px(k, 1.1), INK, 0.55);
  taper(ctx, spline([{ x: -18.5, y: -35 }, { x: -13, y: -31 }, { x: -7, y: -29 }], 4), 1.3, 0.2, BLACK, 0.65);
  dab(ctx, -24, -36, 8, '90,55,20', 0.2);
  inkEdge(k, BROW, () => 2, () => 0.03, 0.92);
  inkEdge(k, NOSE_FRONT, () => 1.9, () => 0, 0.95);
}

function paintBody(k: Brush): void {
  paintMane(k);
  paintEar(k);
  // Locks over the ear's root.
  maneLayers(k, 0.25, (p) => p.x > -92 && p.x < -54 && p.y > -75 && p.y < -50);
  paintFace(k);
  paintRuff(k);
  fadeRoot(k.ctx, -198, -160);
}

// ---------------------------------------------------------------- the lower jaw

function paintJaw(k: Brush): void {
  const { pen, ctx } = k;
  wash(k, JAW, PALE, -2, 20, [[0, 'rgba(255,255,255,0.4)'], [0.6, 'rgba(160,140,110,0.1)'], [1, 'rgba(90,70,50,0.5)']]);
  pen.clipped(JAW, () => {
    const side = spline([{ x: -72, y: -2 }, { x: -50, y: 4 }, { x: -30, y: 4.5 }, { x: -14, y: 3 }], 5);
    softLine(ctx, side, 16, TAWNY, 1);
    softLine(ctx, side.slice(0, 12), 10, '#7a4a18', 0.35);
    softLine(ctx, JAW_UNDER, 6, '#6c5a44', 0.45);
    dab(ctx, 2, 8, 8, '255,255,255', 0.5);
    fur(k, JAW, {
      n: 420, flow: () => unit(-1, 0.12), len: [2, 4.5],
      tint: (p, r) => (p.y < 6 && p.x < -14 ? (r < 0.5 ? [TAWNY_LIT, 0.35] : [TAWNY_DARK, 0.22]) : r < 0.55 ? ['#ffffff', 0.4] : ['#8a7a62', 0.22]),
    });
  });
  taper(ctx, FLOOR, 1.9, 0.9, BLACK, 0.95);
  pen.hair(FLOOR.map((p) => ({ x: p.x, y: p.y + 1.6 })), px(k, 0.7), '#5a4636', 0.35);
  // A pale beard under the chin.
  fringe(k, JAW_UNDER.slice(0, -6), {
    side: 1, flow: () => unit(-0.8, 0.6), len: () => [3, 6.5], every: 0.8, width: 1.3,
    colour: (_, r) => (r < 0.6 ? ['#efe5cf', 0.85] : ['#9b8c72', 0.5]),
  });
  inkEdge(k, JAW_UNDER, () => 1.9, () => 0.2, 0.92);
}

// ---------------------------------------------------------------- teeth

const DOWN: Pt = { x: 0, y: 1 };
const UP: Pt = { x: 0, y: -1 };

function paintUpper(k: Brush): void {
  gum(k, ROOF.slice(0, -3).map((p) => ({ x: p.x, y: p.y + 1.2 })), DOWN, 5);
  for (const x of [8.4, 6.6, 4.8]) fang(k, { x, y: 2.2 }, unit(0.12, 1), 3.2, 2.1, 0.05);
  fang(k, { x: -5, y: 2 }, unit(0.05, 1), 13.5, 6.4, 0.1, 0.45);
  cheekTooth(k, { x: -15.5, y: 2 }, { x: -21.5, y: 2 }, DOWN, [[0.45, 4.8], [0.85, 2]]);
  cheekTooth(k, { x: -23.5, y: 2 }, { x: -39, y: 2.4 }, DOWN, [[0.18, 3.4], [0.4, 8], [0.68, 4.6], [0.9, 2.2]]);
  fang(k, { x: -1.4, y: 2 }, unit(0.06, 1), 16.5, 7.6, 0.1);
}

function paintLower(k: Brush): void {
  gum(k, FLOOR.slice(0, -3).map((p) => ({ x: p.x, y: p.y - 1.2 })), UP, 5);
  for (const x of [9.2, 7.5, 5.8]) fang(k, { x, y: -1.6 }, unit(0.15, -1), 2.8, 1.9, -0.05);
  fang(k, { x: 1.2, y: -1.6 }, unit(0.1, -1), 11, 6, -0.12, 0.45);
  cheekTooth(k, { x: -15, y: -1.6 }, { x: -20.5, y: -1.6 }, UP, [[0.5, 4]]);
  cheekTooth(k, { x: -22, y: -1.6 }, { x: -28.5, y: -1.6 }, UP, [[0.4, 5], [0.8, 2.4]]);
  cheekTooth(k, { x: -30, y: -1.5 }, { x: -41, y: -1 }, UP, [[0.27, 6.4], [0.52, 3], [0.76, 6.2]]);
  fang(k, { x: 4, y: -1.6 }, unit(0.1, -1), 14, 7, -0.12);
}

// ---------------------------------------------------------------- live

const WHISKER_ROOTS: readonly Pt[] = [
  { x: 11, y: -10.5 }, { x: 8.4, y: -9 }, { x: 5.6, y: -10.4 }, { x: 3, y: -8 }, { x: 10, y: -7 }, { x: 6, y: -5.6 }, { x: 0.4, y: -9.4 }, { x: -1.6, y: -6 },
];
const WHISKER_AIMS: readonly Pt[] = [
  { x: 32, y: -2 }, { x: 34, y: 6 }, { x: 28, y: 13 }, { x: 24, y: -7 }, { x: 30, y: 16 }, { x: -24, y: 10 }, { x: 20, y: 20 }, { x: -20, y: 3 },
];

function live(ctx: CanvasRenderingContext2D, t: number, lw: number): void {
  drawEye(ctx, EYE, blink(t, 5.3, 0.4), lw);
  whiskers(ctx, WHISKER_ROOTS, WHISKER_AIMS, '#fbf7ee', lw, Math.sin(t * 1.1) * 0.8);
}

// ---------------------------------------------------------------- export

const TEETH_BOX: Box = { x0: -60, x1: 18, y0: -22, y1: 26 };
const head = makeHead({
  seed: 7303,
  box: { x0: -214, x1: 22, y0: -112, y1: 160 },
  jawBox: { x0: -78, x1: 18, y0: -10, y1: 30 },
  teethBox: TEETH_BOX,
  hinge: HINGE,
  jawMax: 0.86,
  roof: ROOF,
  floor: FLOOR,
  mouth: { deep: '#2a0a0e', near: '#7e2f3a', tongue: '#d27e88', tongueLit: '#f2b7bd', tongueReach: 0.93, tongueThick: 7.5 },
  paintBody,
  paintJaw,
  paintUpper,
  paintLower,
  live,
});

export const drawLion: DrawHead = head.draw;

export async function prepare(): Promise<void> {
  await head.prepare();
}

export const KIT: KitEntry = {
  name: 'lion',
  draw: (ctx, w, h, t) => drawLion(ctx, { x: w * 0.72, y: h * 0.55, size: Math.min(w, h) * 0.55, jaw: 0.5 + 0.5 * Math.sin(t * 2), t }),
};
