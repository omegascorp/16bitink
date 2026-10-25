import { makeCanvas, Pen, type Pt } from '../../../src/art/pen';
import { BOIL_FRAMES } from '../../../src/art/textures';
import { createRng } from '../../../src/logic/rng';
import { curveAt, type Key, VIDEO } from '../short';
import { cycles, LOOP_S } from './story';
import type { SharkPose } from './tag';

/**
 * The thing that ate her, only ever a silhouette: a vast dark head rising
 * out of the black below, seen side on, its jaws gaping upwards round the
 * shark. No teeth, no eye, no fins: nothing to tell what it is. Its snout,
 * chin and lips catch a little light from above; inside, a dull red mouth
 * falls away to black at the corner. Everything is a function of the gulp
 * clock g (story.ts): below 0 it rises and opens, 0 is frame 1, 1 shut.
 */

export interface Maw {
  /** The corner of the mouth, where the jaws hinge. */
  readonly hinge: Pt;
  /** The direction the snout points (radians, screen), and half the gape's angle. */
  readonly axis: number;
  readonly half: number;
}

const k = (t: number, at: number, rate?: number): Key => (rate === undefined ? { t, at } : { t, at, rate });

/** How far the head still has to rise along its axis (px): from out of frame below, to frame 1, then sinking back after the gulp. */
const RISE: readonly Key[] = [k(-1.35, 1500, 0), k(-0.95, 950), k(-0.25, 70), k(0, 30, -70), k(1, 0, 0), k(1.7, 420)];
const HALF: readonly Key[] = [k(-1.35, 0.04, 0), k(-0.7, 0.1), k(-0.25, 0.4), k(0, 0.42, -0.05), k(0.3, 0.38), k(1, 0, 0), k(1.7, 0, 0)];
/** The upper jaw (snout) a little longer than the lower. */
const UPPER_LEN = 900;
const LOWER_LEN = 830;
/** Frame 1's corner of the mouth, and the way the snout points: up and to the right, the head coming up from the lower left. */
const HINGE = { x: 315, y: 1340 } as const;
const AXIS = -Math.PI / 2 + 0.32;

export function mawAt(g: number, t: number): Maw {
  const axis = AXIS + 0.012 * Math.sin(cycles(3, t));
  const rise = curveAt(RISE, g).at;
  return {
    hinge: { x: HINGE.x - Math.cos(axis) * rise + 5 * Math.sin(cycles(2, t)), y: HINGE.y - Math.sin(axis) * rise },
    axis,
    half: Math.max(0, curveAt(HALF, g).at),
  };
}

const dir = (a: number): Pt => ({ x: Math.cos(a), y: Math.sin(a) });
const add = (p: Pt, d: Pt, s: number): Pt => ({ x: p.x + d.x * s, y: p.y + d.y * s });

/**
 * The head is drawn in its own frame: the corner of the mouth at the origin,
 * the snout along +x, the top of the head towards -y. Each jaw swings open
 * about the corner by `half`; points behind the corner swing less and less,
 * so the skin stretches smoothly into the unmoving body.
 */
const swingOf = (x: number): number => {
  const u = Math.max(0, Math.min(1, (x + 260) / 420));
  return u * u * (3 - 2 * u);
};

/** A point of the head's frame on screen: `side` -1 on the upper jaw, 1 on the lower. */
function place(m: Maw, side: -1 | 1, p: Pt): Pt {
  const phi = side * m.half * swingOf(p.x);
  const x = p.x * Math.cos(phi) - p.y * Math.sin(phi);
  const y = p.x * Math.sin(phi) + p.y * Math.cos(phi);
  const c = Math.cos(m.axis);
  const n = Math.sin(m.axis);
  return { x: m.hinge.x + x * c - y * n, y: m.hinge.y + x * n + y * c };
}

/** A jaw's inner edge (the lip), corner to tip: rounded out near the corner, hooking back in at the tip. `inset` moves it out into the jaw. */
function lip(m: Maw, side: -1 | 1, inset = 0): Pt[] {
  const len = side < 0 ? UPPER_LEN : LOWER_LEN;
  const open = 0.3 + 0.7 * Math.min(1, m.half / 0.35);
  return Array.from({ length: 21 }, (_, i) => {
    const s = i / 20;
    const bow = (52 * Math.sin(Math.PI * Math.min(1, s * 1.12)) - 34 * s ** 4) * open;
    return place(m, side, { x: s * len, y: side * (bow + inset) });
  });
}

export function tipsOf(m: Maw): { readonly upper: Pt; readonly lower: Pt } {
  return { upper: lip(m, -1)[20]!, lower: lip(m, 1)[20]! };
}

/** The snout's rounded end and the top of the head running back (upper jaw's frame, from the lip's tip). */
const SNOUT: readonly Pt[] = [
  { x: 38, y: -16 }, { x: 62, y: -72 }, { x: 54, y: -146 }, { x: 10, y: -214 }, { x: -80, y: -275 }, { x: -260, y: -360 },
  { x: -520, y: -440 }, { x: -820, y: -490 }, { x: -1150, y: -510 }, { x: -1500, y: -505 }, { x: -1800, y: -490 },
];
/** The chin's rounded end and the throat running back (lower jaw's frame, from the lip's tip). */
const CHIN: readonly Pt[] = [
  { x: 26, y: 18 }, { x: 34, y: 62 }, { x: 10, y: 108 }, { x: -60, y: 152 }, { x: -240, y: 232 }, { x: -480, y: 300 },
  { x: -780, y: 372 }, { x: -1100, y: 420 }, { x: -1450, y: 450 }, { x: -1800, y: 470 },
];

// ---------------------------------------------------------------- the shark in the gulp

const SHARK_LEN = 660;
/** How far into the mouth the shark is, px back from the line between the jaw tips towards the corner. */
const DEPTH: readonly Key[] = [k(-1.35, -60, 0), k(-0.4, -10), k(0, 105, 60), k(0.5, 180), k(1, 450, 500)];

export interface GulpShark {
  readonly pose: SharkPose;
  readonly worried: number;
}

export function sharkAt(g: number, t: number): GulpShark {
  const m = mawAt(g, t);
  const fight = 0.05 * Math.sin(cycles(19, t)) * Math.max(0, Math.min(1, 1 - g));
  const a = dir(m.axis);
  const reach = ((UPPER_LEN + LOWER_LEN) / 2) * Math.cos(m.half) - curveAt(DEPTH, g).at;
  const held = { x: m.hinge.x + a.x * reach, y: m.hinge.y + a.y * reach };
  // Across the gape, nose to the upper left, back to the open water.
  const across = m.axis - Math.PI / 2 + 2 * Math.PI;
  // Swimming free high in the frame until the head comes up under it.
  const free = { x: 585 - 30 * (g + 1.35), y: 560 };
  const attach = Math.max(0, Math.min(1, (g + 0.95) / 0.65)) ** 2 * (3 - 2 * Math.max(0, Math.min(1, (g + 0.95) / 0.65)));
  const pose: SharkPose = {
    x: free.x + (held.x - free.x) * attach,
    y: free.y + (held.y - free.y) * attach + 8 * Math.sin(cycles(3, t)),
    length: SHARK_LEN,
    angle: Math.PI - 0.04 + (across - (Math.PI - 0.04)) * attach + fight,
    flip: true,
  };
  return { pose, worried: Math.max(0, Math.min(1, (g + 0.9) / 0.4)) };
}

// ---------------------------------------------------------------- drawing

/** A dark brushed skin, baked once a boil frame: soft mottling, hatching and specks, to be clipped to the head. */
const SKIN_W = 1500;
const SKIN_H = 1700;
function makeSkins(): HTMLCanvasElement[] {
  return Array.from({ length: BOIL_FRAMES }, (_, f) => {
    const { canvas, ctx } = makeCanvas(SKIN_W, SKIN_H);
    const rng = createRng(4401 + f * 97);
    for (let i = 0; i < 90; i++) {
      const x = rng() * SKIN_W;
      const y = rng() * SKIN_H;
      const r = 50 + rng() * 180;
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, rng() < 0.45 ? 'rgba(44,64,96,0.2)' : 'rgba(0,0,0,0.28)');
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.fillRect(x - r, y - r, r * 2, r * 2);
    }
    const pen = new Pen(ctx, 9131 + f * 977, 1.4);
    const box = [{ x: 0, y: 0 }, { x: SKIN_W, y: 0 }, { x: SKIN_W, y: SKIN_H }, { x: 0, y: SKIN_H }];
    pen.hatch(box, 15, 1.15, 1.2, { color: '#000000', alpha: 0.16 });
    pen.hatch(box, 27, 0.45, 1.0, { color: '#02040a', alpha: 0.1 });
    for (let i = 0; i < 200; i++) pen.dot(rng() * SKIN_W, rng() * SKIN_H, 1 + rng() * 1.6, '#5a7090', 0.12);
    return canvas;
  });
}

let skins: HTMLCanvasElement[] | null = null;

function trace(ctx: CanvasRenderingContext2D, pts: readonly Pt[], move = true): void {
  pts.forEach((p, i) => (i === 0 && move ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
}

/** The head's silhouette: the snout and the top of the head back down to the left, the chin and throat down to the right. */
function headPath(ctx: CanvasRenderingContext2D, m: Maw): void {
  const up = lip(m, -1);
  const low = lip(m, 1);
  const top = SNOUT.map((p) => place(m, -1, { x: UPPER_LEN + p.x, y: p.y }));
  const under = CHIN.map((p) => place(m, 1, { x: LOWER_LEN + p.x, y: p.y }));
  ctx.beginPath();
  trace(ctx, up);
  smooth(ctx, [up[20]!, ...top]);
  const backTop = top[top.length - 1]!;
  const backLow = under[under.length - 1]!;
  const away = { x: -Math.cos(m.axis) * 1400, y: -Math.sin(m.axis) * 1400 };
  ctx.lineTo(backTop.x + away.x, backTop.y + away.y);
  ctx.lineTo(backLow.x + away.x, backLow.y + away.y);
  ctx.lineTo(backLow.x, backLow.y);
  smooth(ctx, [...under].reverse().concat([low[20]!]));
  trace(ctx, [...low].reverse(), false);
  ctx.closePath();
}

/** Continues the path through points with soft curves (midpoint quadratics). */
function smooth(ctx: CanvasRenderingContext2D, pts: readonly Pt[]): void {
  for (let i = 1; i < pts.length - 1; i++) {
    const p = pts[i]!;
    const q = pts[i + 1]!;
    ctx.quadraticCurveTo(p.x, p.y, (p.x + q.x) / 2, (p.y + q.y) / 2);
  }
  const last = pts[pts.length - 1]!;
  ctx.lineTo(last.x, last.y);
}

/**
 * The gape. Closed: between the lips, its front edge dipping back towards
 * the corner (the far side of the mouth). Extended: on past the tips out of
 * frame, what the shark shows through (the head is in front of it elsewhere).
 */
function gapePath(ctx: CanvasRenderingContext2D, m: Maw, extend: boolean): void {
  const up = lip(m, -1, -3);
  const low = lip(m, 1, -3);
  const tu = up[20]!;
  const tl = low[20]!;
  ctx.beginPath();
  trace(ctx, up);
  if (extend) {
    ctx.lineTo(tu.x + Math.cos(m.axis - 0.9) * 3000, tu.y + Math.sin(m.axis - 0.9) * 3000);
    ctx.lineTo(tl.x + Math.cos(m.axis + 0.9) * 3000, tl.y + Math.sin(m.axis + 0.9) * 3000);
  } else {
    const back = { x: (tu.x + tl.x) / 2 - Math.cos(m.axis) * 0.22 * Math.hypot(tu.x - tl.x, tu.y - tl.y), y: (tu.y + tl.y) / 2 - Math.sin(m.axis) * 0.22 * Math.hypot(tu.x - tl.x, tu.y - tl.y) };
    ctx.quadraticCurveTo(back.x, back.y, tl.x, tl.y);
  }
  trace(ctx, [...low].reverse(), false);
  ctx.closePath();
}

/** The head: dark, lit faintly from above along its back and chin, fading into the black below. */
function drawHead(ctx: CanvasRenderingContext2D, m: Maw, boil: number): void {
  skins ??= makeSkins();
  const { upper, lower } = tipsOf(m);
  const top = Math.min(upper.y, lower.y);
  ctx.save();
  headPath(ctx, m);
  const g = ctx.createLinearGradient(0, top, 0, top + 1250);
  g.addColorStop(0, '#0b1426');
  g.addColorStop(0.3, '#060b17');
  g.addColorStop(0.7, '#040812');
  g.addColorStop(1, 'rgba(2,5,13,0.85)');
  ctx.fillStyle = g;
  ctx.fill();
  ctx.clip();
  ctx.globalAlpha = 0.9;
  ctx.drawImage(skins[boil % skins.length]!, m.hinge.x - SKIN_W / 2, top - 160);
  ctx.globalAlpha = 1;
  // Volume: soft light on the dome of the snout and the chin, and a faint sheen along the edge.
  for (const [side, at, r, alpha] of [[-1, { x: UPPER_LEN - 90, y: -170 }, 340, 0.17], [1, { x: LOWER_LEN - 80, y: 90 }, 230, 0.12]] as const) {
    const c = place(m, side, at);
    const lit = ctx.createRadialGradient(c.x, c.y, 0, c.x, c.y, r);
    lit.addColorStop(0, `rgba(120,155,200,${alpha})`);
    lit.addColorStop(1, 'rgba(120,155,200,0)');
    ctx.fillStyle = lit;
    ctx.fillRect(c.x - r, c.y - r, r * 2, r * 2);
  }
  headPath(ctx, m);
  const sheen = ctx.createLinearGradient(0, top - 80, 0, top + 520);
  sheen.addColorStop(0, 'rgba(110,145,190,0.08)');
  sheen.addColorStop(1, 'rgba(110,145,190,0)');
  ctx.strokeStyle = sheen;
  ctx.lineWidth = 46;
  ctx.stroke();
  // Long creases along the jaws, as on old thick skin.
  const pen = new Pen(ctx, 5501 + (boil % BOIL_FRAMES) * 131, 1.8);
  for (const side of [-1, 1] as const) {
    for (const [inset, alpha] of [[60, 0.4]] as const) {
      const crease = lip(m, side, inset).slice(6, 17);
      pen.hair(crease.map((p) => ({ x: p.x, y: p.y - 3 })), 2.6, '#6d8cb4', alpha * 0.35);
      pen.hair(crease, 3.2, '#000000', alpha);
    }
  }
  ctx.restore();
  // A cold rim light along its back, snout and chin, dying away down into the dark: soft inside the edge, crisp on it.
  ctx.save();
  headPath(ctx, m);
  ctx.strokeStyle = 'rgba(27,26,31,0.9)';
  ctx.lineWidth = 2.5;
  ctx.stroke();
  const fade = (alpha: number): CanvasGradient => {
    const g = ctx.createLinearGradient(0, top - 80, 0, top + 950);
    g.addColorStop(0, `rgba(165,200,240,${alpha})`);
    g.addColorStop(0.55, `rgba(165,200,240,${alpha * 0.45})`);
    g.addColorStop(1, 'rgba(165,200,240,0)');
    return g;
  };
  ctx.clip();
  ctx.strokeStyle = fade(0.16);
  ctx.lineWidth = 46;
  ctx.stroke();
  ctx.strokeStyle = fade(0.3);
  ctx.lineWidth = 16;
  ctx.stroke();
  ctx.strokeStyle = fade(0.8);
  ctx.lineWidth = 5;
  ctx.stroke();
  ctx.restore();
}

/** Inside the mouth: dull red near the lips, black at the corner, ridges running back. */
function drawInside(ctx: CanvasRenderingContext2D, m: Maw, boil: number): void {
  if (m.half < 0.01) return;
  const { upper, lower } = tipsOf(m);
  const mid = { x: (upper.x + lower.x) / 2, y: (upper.y + lower.y) / 2 };
  const reach = Math.hypot(mid.x - m.hinge.x, mid.y - m.hinge.y);
  ctx.save();
  gapePath(ctx, m, false);
  ctx.clip();
  const g = ctx.createRadialGradient(m.hinge.x, m.hinge.y, 0, m.hinge.x, m.hinge.y, reach * 1.1);
  g.addColorStop(0, '#000000');
  g.addColorStop(0.35, '#080204');
  g.addColorStop(0.7, '#2c0c12');
  g.addColorStop(0.92, '#55202a');
  g.addColorStop(1, '#6e2c34');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, VIDEO.width, VIDEO.height + 600);
  const pen = new Pen(ctx, 3301 + (boil % BOIL_FRAMES) * 211, 1.4);
  for (let i = 1; i < 9; i++) {
    const a = m.axis - m.half + (2 * m.half * i) / 9;
    const from = add(m.hinge, dir(a), reach * 0.25);
    const to = add(m.hinge, dir(a), reach * 1.05);
    pen.hair([from, add(m.hinge, dir(a + 0.03), reach * 0.6), to], 3.2, '#a04a56', 0.12);
    pen.hair([add(from, dir(a + Math.PI / 2), 6), add(to, dir(a + Math.PI / 2), 7)], 2.4, '#000000', 0.22);
  }
  ctx.restore();
}

/** A soft wet sheen along a lip, strongest in its middle. */
function sheenAlong(ctx: CanvasRenderingContext2D, pts: readonly Pt[], width: number, alpha: number): void {
  ctx.save();
  ctx.lineCap = 'round';
  for (let i = 2; i < pts.length - 2; i++) {
    const a = pts[i]!;
    const b = pts[i + 1]!;
    const w = Math.sin((Math.PI * (i - 2)) / (pts.length - 4));
    ctx.strokeStyle = `rgba(190,214,242,${(alpha * w).toFixed(3)})`;
    ctx.lineWidth = width * (0.5 + 0.5 * w);
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
  }
  ctx.restore();
}

/** The lips: inked, with a wet sheen along them. */
function drawLips(ctx: CanvasRenderingContext2D, m: Maw): void {
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  for (const side of [-1, 1] as const) {
    ctx.strokeStyle = '#05080f';
    ctx.lineWidth = 9;
    ctx.beginPath();
    trace(ctx, lip(m, side));
    ctx.stroke();
    sheenAlong(ctx, lip(m, side, 11), 5, m.half < 0.02 ? 0.3 : 0.6);
  }
  ctx.restore();
}

/**
 * The gulp: the head and the inside of its mouth, the shark (seen only
 * through the gape, darkening towards the corner of the mouth), then the
 * lips over it. `drawPrey` draws the shark.
 */
export function drawGulp(ctx: CanvasRenderingContext2D, g: number, t: number, boil: number, drawPrey: (s: GulpShark) => void): void {
  const m = mawAt(g, t);
  const s = sharkAt(g, t);
  const visible = m.hinge.y - UPPER_LEN < VIDEO.height + 100;
  if (visible) {
    drawHead(ctx, m, boil);
    drawInside(ctx, m, boil);
    drawSuction(ctx, m, g, t);
  }
  if (g < 1.02) {
    ctx.save();
    if (visible) {
      gapePath(ctx, m, true);
      ctx.clip();
    }
    drawPrey(s);
    if (visible && m.half > 0.01) {
      // Darker the deeper in: from the line between the tips to the corner.
      const { upper, lower } = tipsOf(m);
      const mid = { x: (upper.x + lower.x) / 2, y: (upper.y + lower.y) / 2 };
      const shade = ctx.createLinearGradient(mid.x, mid.y + 40, m.hinge.x, m.hinge.y);
      shade.addColorStop(0, 'rgba(8,2,4,0)');
      shade.addColorStop(0.3, 'rgba(8,2,4,0.4)');
      shade.addColorStop(0.7, 'rgba(8,2,4,0.95)');
      shade.addColorStop(1, 'rgba(8,2,4,1)');
      ctx.fillStyle = shade;
      gapePath(ctx, m, false);
      ctx.fill();
    }
    ctx.restore();
  }
  if (visible) drawLips(ctx, m);
}

// ---------------------------------------------------------------- water rushing in, bubbles out

const STREAKS = (() => {
  const rng = createRng(77);
  return Array.from({ length: 26 }, () => ({ a: (rng() - 0.5) * 2.2, seed: rng(), r: 0.7 + rng() * 0.7 }));
})();

/** Streaks of water pulled into the gaping mouth while it opens and gulps. */
function drawSuction(ctx: CanvasRenderingContext2D, m: Maw, g: number, t: number): void {
  const pull = Math.min(1, Math.max(0, (g + 0.5) / 0.3)) * Math.max(0, Math.min(1, (1 - g) / 0.15));
  if (pull <= 0.01) return;
  const { upper, lower } = tipsOf(m);
  const mouth = { x: (upper.x + lower.x) / 2, y: (upper.y + lower.y) / 2 + 80 };
  ctx.save();
  ctx.strokeStyle = '#cfe0f5';
  ctx.lineCap = 'round';
  for (const s of STREAKS) {
    // 31 trips a loop, so they're where they were at the seam.
    const p = (s.seed + (31 * t) / LOOP_S) % 1;
    const a = m.axis + s.a;
    const dist = (1 - p) * 520 * s.r + 140;
    const x = mouth.x + Math.cos(a) * dist * 1.1;
    const y = mouth.y + Math.sin(a) * dist * 0.8;
    const len = 50 + 70 * p;
    const toward = { x: mouth.x - x, y: mouth.y - y };
    const n = Math.hypot(toward.x, toward.y) || 1;
    ctx.globalAlpha = pull * 0.32 * Math.sin(Math.PI * p);
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + (toward.x / n) * len, y + (toward.y / n) * len);
    ctx.stroke();
  }
  ctx.restore();
}

const BUBBLES = (() => {
  const rng = createRng(1903);
  return Array.from({ length: 18 }, () => ({ delay: rng() * 0.35, dx: (rng() - 0.5) * 500, r: 6 + rng() * 14, wobble: rng() * 6 }));
})();

/** Bubbles bursting up from the shut mouth. `since` seconds after the jaws shut. */
export function drawBurst(ctx: CanvasRenderingContext2D, at: Pt, since: number): void {
  if (since < 0 || since > 1.6) return;
  ctx.save();
  ctx.strokeStyle = '#d6e6fa';
  for (const b of BUBBLES) {
    const u = since - b.delay;
    if (u < 0) continue;
    ctx.globalAlpha = 0.75 * Math.max(0, 1 - u / 1.2);
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(at.x + b.dx * Math.min(1, u * 1.6) + 14 * Math.sin(u * 7 + b.wobble), at.y - 30 - u * 520, b.r * (1 + 0.4 * u), 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
}
