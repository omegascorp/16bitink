import { backStipple, bezier, bottomAt, C, FISH_TEX, gillSlits, heightAt, PAPER_FILL, topAt, xAt, type Anatomy, type Kit } from '../../../src/art/fish/kit';
import { ANATOMY } from '../../../src/art/fish/registry';
import { ellipse, type Pt } from '../../../src/art/pen';
import { makeSprite, type Sprite } from '../sprites';

/**
 * A young tiger shark, built on the game's shark drawing: the broad, blunt
 * snout, a long upper tail lobe, olive-grey skin over a white belly, and the
 * dark spots and bars young tiger sharks wear (they fade with age), heavy on
 * the back and breaking into spots on the head. Drawn big and alive like
 * ../mako/jaws.ts: cut into thin columns, the tail half bending with a
 * travelling wave, the jaws opening under the snout to show the inside of
 * the mouth and its rows of hooked, saw-edged teeth; and a smug lid for
 * its eye.
 */

const SHARK = ANATOMY.shark;
const SKIN = '#7a775e';
const BACK = '#4b4a39';
const BAR = '#272519';
const FIN = '#5f5c47';

/** One painted bar: a tapering, gently wavering stripe from the back down the flank, fading out towards the belly. */
function bar(k: Kit, t: number, reach: number, w: number, lean: number, alpha: number): void {
  const { pen } = k;
  const ctx = pen.ctx;
  const top = topAt(k.a, t) - 3;
  const n = 8;
  const left: Pt[] = [];
  const right: Pt[] = [];
  const wob = pen.rng() * Math.PI * 2;
  for (let i = 0; i <= n; i++) {
    const f = i / n;
    const y = top + (reach - top) * f;
    const cx = k.x(t) + lean * f + 0.9 * Math.sin(wob + f * 5);
    const half = (w / 2) * (1 - 0.65 * f) * (0.85 + 0.3 * Math.sin(wob * 1.7 + f * 7));
    left.push({ x: cx - half, y });
    right.push({ x: cx + half, y });
  }
  const shape = [...left, ...[...right].reverse()];
  // Laid on twice, a little out of register, the way a wash goes on: strong on the back, gone by the belly.
  for (const [dx, dy, a] of [[0, 0, 1], [0.8, 0.5, 0.45]] as const) {
    const g = ctx.createLinearGradient(0, top, 0, reach);
    g.addColorStop(0, `rgba(39,37,25,${(alpha * a).toFixed(3)})`);
    g.addColorStop(0.55, `rgba(39,37,25,${(alpha * a * 0.7).toFixed(3)})`);
    g.addColorStop(1, 'rgba(39,37,25,0)');
    ctx.save();
    ctx.translate(dx, dy);
    ctx.fillStyle = g;
    ctx.beginPath();
    shape.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
}

function bars(k: Kit): void {
  const { pen } = k;
  pen.clipped(k.body, () => {
    // Bars across the back, closer together towards the tail, some broken into two.
    for (let t = 0.2; t < 0.97; t += 0.036 + pen.rng() * 0.014) {
      const reach = C + k.h(t) * (-0.05 + pen.rng() * 0.3);
      const w = (2 + 2.4 * Math.sin(Math.PI * Math.min(1, t * 1.1))) * (0.75 + pen.rng() * 0.5);
      const lean = -2.5 - pen.rng() * 2.5;
      const alpha = 0.62 + pen.rng() * 0.2;
      if (pen.rng() < 0.3) {
        const mid = topAt(k.a, t) + (reach - topAt(k.a, t)) * (0.45 + pen.rng() * 0.15);
        bar(k, t, mid, w, lean * 0.5, alpha);
        // The lower half, a blotch set a little back.
        const t2 = t + 0.006;
        const y0 = mid + 2;
        pen.fill(ellipse(k.x(t2) + lean * 0.6, (y0 + reach) / 2, w * 0.55, (reach - y0) / 2, 10), '#272519', alpha * 0.45);
      } else bar(k, t, reach, w, lean, alpha);
      if (pen.rng() < 0.45) {
        const st = t + 0.017;
        pen.fill(ellipse(k.x(st), C - k.h(st) * (0.25 + pen.rng() * 0.45), 0.9 + pen.rng() * 0.8, 0.8 + pen.rng() * 0.7, 8), BAR, 0.35);
      }
    }
    // Spots on the head and the snout.
    for (let i = 0; i < 30; i++) {
      const t = 0.03 + pen.rng() * 0.2;
      const y = C - k.h(t) * (0.15 + pen.rng() * 0.8);
      const r = 0.7 + pen.rng() * 1.2;
      pen.fill(ellipse(k.x(t), y, r * 1.2, r, 8), BAR, 0.35 + pen.rng() * 0.2);
    }
  });
}

/** The pectoral fin, swept back and down from under the gills: drawn behind the body, so only the fin shows below the belly. */
function pectoral(k: Kit): void {
  const root = { x: k.x(0.26), y: bottomAt(k.a, 0.26) - 6 };
  const back = { x: k.x(0.37), y: bottomAt(k.a, 0.37) - 6 };
  const tip = { x: k.x(0.47), y: bottomAt(k.a, 0.3) + 25 };
  const lead = bezier(root, { x: root.x - 3, y: (root.y + tip.y) / 2 + 6 }, tip, 10);
  const trail = bezier(tip, { x: (tip.x + back.x) / 2 + 4, y: (tip.y + back.y) / 2 - 2 }, back, 8);
  const shape = [...lead, ...trail];
  k.pen.fill(shape, PAPER_FILL, 1);
  k.pen.fill(shape, FIN, 0.7);
  k.pen.clipped(shape, () => {
    // Darker along the trailing edge and at the tip.
    k.pen.fill([...trail.map((p) => ({ x: p.x + 2, y: p.y - 2 })), ...[...trail].reverse().map((p) => ({ x: p.x - 4, y: p.y - 5 }))], BAR, 0.3);
    k.pen.fill([tip, { x: tip.x + 7, y: tip.y - 8 }, { x: tip.x + 1, y: tip.y - 10 }], BAR, 0.6);
  });
  k.pen.stroke(shape, 1.2, k.ink, 1, false);
}

/** The body's back and belly lines (multiples of hh, y down): a blunt, rounded snout, deepest just behind the head, tapering smoothly to a slim tail stalk over a flatter belly. */
function profile(t: number): { readonly top: number; readonly bottom: number } {
  const up = t < 0.3 ? 0.14 + 0.86 * Math.sin((Math.PI / 2) * (t / 0.3)) ** 0.42 : 0.2 + 0.8 * Math.cos((Math.PI / 2) * ((t - 0.3) / 0.7)) ** 1.35;
  const down = t < 0.33 ? 0.1 + 0.75 * Math.sin((Math.PI / 2) * (t / 0.33)) ** 0.5 : 0.2 + 0.65 * Math.cos((Math.PI / 2) * ((t - 0.33) / 0.67)) ** 1.6;
  return { top: -up, bottom: down };
}

/** The young tiger shark: the game's shark with a broad, blunt snout, its bars and spots, and its own face. */
export const TIGER: Anatomy = {
  ...SHARK,
  peak: 0.33,
  blunt: 0.8,
  profile,
  under: (k: Kit) => {
    SHARK.under?.(k);
    pectoral(k);
  },
  tailSize: 1.45,
  wash: SKIN,
  finWash: FIN,
  finAlpha: 0.62,
  smoothFins: true,
  eye: { t: 0.12, r: 4.4, buried: true },
  extras: (k: Kit) => {
    k.pen.clipped(k.body, () => {
      // Countershading: an olive-grey back over a white belly.
      const line: Pt[] = [];
      for (let t = -0.04; t <= 1.08; t += 0.04) {
        const u = Math.max(0, Math.min(1, t));
        line.push({ x: k.x(t), y: topAt(k.a, u) + (bottomAt(k.a, u) - topAt(k.a, u)) * 0.6 });
      }
      k.pen.fill([...line, ...[...line].reverse().map((p) => ({ x: p.x, y: C - 70 }))], BACK, 0.55);
      k.pen.fill([...line, ...[...line].reverse().map((p) => ({ x: p.x, y: C + 70 }))], PAPER_FILL, 0.45);
      k.pen.fill(k.body, SKIN, 0.18);
      k.pen.hair(line, 0.5, k.ink, 0.3);
      for (let i = 0; i < 240; i++) {
        const t = 0.05 + k.pen.rng() * 0.9;
        k.pen.dot(k.x(t), C - k.h(t) * k.pen.rng(), 0.35, k.ink, 0.3);
      }
    });
    // The tail stalk, where the tail fin meets the body, in the same skin.
    const x1 = k.x(1);
    const hs = k.h(1) * 1.15;
    k.pen.fill([{ x: x1 - 6, y: C - hs }, { x: k.x(0.95), y: C - k.h(0.95) }, { x: k.x(0.95), y: C + k.h(0.95) }, { x: x1 - 6, y: C + hs }], SKIN, 0.55);
    bars(k);
    backStipple(0.9)(k);
    gillSlits(k, 0.21);
  },
  face: (k: Kit) => {
    // The broad mouth under the snout, a row of teeth showing, the long furrow at its corner.
    const x0 = k.x(0.03);
    const x1 = k.x(0.155);
    const y0 = bottomAt(k.a, 0.03) - 1.5;
    const y1 = bottomAt(k.a, 0.15) - 4.5;
    const lip = bezier({ x: x0, y: y0 }, { x: (x0 + x1) / 2, y: (y0 + y1) / 2 + 2.5 }, { x: x1, y: y1 }, 10);
    for (let i = 1; i < lip.length - 1; i++) {
      const p = lip[i]!;
      k.pen.fill([{ x: p.x - 0.9, y: p.y - 0.4 }, { x: p.x + 0.4, y: p.y + 1.8 }, { x: p.x + 0.9, y: p.y - 0.4 }], PAPER_FILL, 1);
    }
    k.pen.stroke(lip, 1.2, k.ink, 1, false);
    k.pen.hair([{ x: x1, y: y1 }, { x: x1 - 6, y: y1 - 3.5 }], 0.7, k.ink, 0.8);
    // A nostril on the blunt snout.
    k.pen.hair([{ x: k.x(0.02), y: C + k.h(0.02) * 0.15 }, { x: k.x(0.045), y: C + k.h(0.045) * 0.3 }], 0.8, k.ink, 0.9);
    const e = EYE;
    k.pen.fill(ellipse(e.x, e.y, EYE_R, EYE_R * 0.92, 14), '#141410', 0.95);
    k.pen.hair(ellipse(e.x, e.y, EYE_R * 1.25, EYE_R * 1.15, 14).concat([{ x: e.x + EYE_R * 1.25, y: e.y }]), 0.5, k.ink, 0.6);
    k.pen.dot(e.x + 1.3, e.y - 1.3, 1, PAPER_FILL, 0.95);
  },
};

const { hl: HL, hh: HH } = TIGER;
/** The eye, fish-texture px (fish facing right). */
export const EYE: Pt = { x: xAt(TIGER, 0.12), y: C - heightAt(TIGER, 0.12) * 0.3 };
const EYE_R = 4.2;

/** Where the mouth opens: the front of the jaw under the snout, and its corner. */
const TIP: Pt = { x: xAt(TIGER, 0.03), y: bottomAt(TIGER, 0.03) - 1.5 };
const HINGE: Pt = { x: xAt(TIGER, 0.165), y: bottomAt(TIGER, 0.15) - 6 };
/** How far each jaw moves at full gape, in half-heights. */
const LOWER = 1.55;
const UPPER = 0.5;
const INK = '#1b1a1f';

export interface TigerPose {
  /** Body centre, px in whatever frame it's drawn in. */
  readonly x: number;
  readonly y: number;
  /** Body length, px. */
  readonly length: number;
  /** Horizontal scale: 1 faces right, -1 left (between, edge-on as it turns). */
  readonly turn: number;
  /** Nose up, radians. */
  readonly tilt: number;
  readonly beat: number;
  readonly effort: number;
  /** 0 shut .. 1 wide. */
  readonly jaw: number;
  /** The smug lid over its eye, 0 open .. 1 half shut. */
  readonly lid: number;
}

export function makeTigerSprite(res: number): Sprite {
  return makeSprite('shark', res, 'light', TIGER);
}

interface Gape { readonly line: number; readonly up: number; readonly down: number }

function gapeAt(open: number, x: number): Gape | null {
  if (open <= 0 || x <= HINGE.x) return null;
  const f = Math.min(1, (x - HINGE.x) / (TIP.x - HINGE.x));
  const ease = Math.sin((Math.PI / 2) * f) ** 0.75;
  const line = HINGE.y + (TIP.y - HINGE.y) * f;
  return { line, up: UPPER * HH * open * ease, down: LOWER * HH * open * ease };
}

function outline(open: number): { readonly upper: Pt[]; readonly lower: Pt[] } {
  const upper: Pt[] = [];
  const lower: Pt[] = [];
  for (let i = 0; i <= 18; i++) {
    const x = HINGE.x + ((TIP.x - HINGE.x) * i) / 18;
    const g = gapeAt(open, x + 1e-6) ?? { line: HINGE.y, up: 0, down: 0 };
    upper.push({ x, y: g.line - g.up });
    lower.push({ x, y: g.line + g.down });
  }
  return { upper, lower };
}

const toSprite = (p: Pt, R: number): Pt => ({ x: (p.x - FISH_TEX / 2) * R, y: (p.y - FISH_TEX / 2) * R });

function trace(ctx: CanvasRenderingContext2D, pts: readonly Pt[], R: number, move = true): void {
  pts.forEach((p, i) => {
    const q = toSprite(p, R);
    if (i === 0 && move) ctx.moveTo(q.x, q.y);
    else ctx.lineTo(q.x, q.y);
  });
}

function mouthPath(ctx: CanvasRenderingContext2D, upper: readonly Pt[], lower: readonly Pt[], R: number): void {
  const top = toSprite(upper[upper.length - 1]!, R);
  const bottom = toSprite(lower[lower.length - 1]!, R);
  ctx.beginPath();
  trace(ctx, upper, R);
  ctx.quadraticCurveTo(top.x - (bottom.y - top.y) * 0.25, (top.y + bottom.y) / 2, bottom.x, bottom.y);
  trace(ctx, [...lower].reverse(), R, false);
  ctx.closePath();
}

/** The inside: dark pink going black in the throat, a tongue, and rows of hooked, saw-edged teeth on both jaws. */
function drawInside(ctx: CanvasRenderingContext2D, upper: readonly Pt[], lower: readonly Pt[], R: number, open: number): void {
  ctx.save();
  mouthPath(ctx, upper, lower, R);
  ctx.fillStyle = '#6a2a30';
  ctx.fill();
  ctx.clip();
  const back = toSprite(HINGE, R);
  const front = toSprite({ x: TIP.x, y: (upper[upper.length - 1]!.y + lower[lower.length - 1]!.y) / 2 }, R);
  const shade = ctx.createLinearGradient(back.x, back.y, front.x, front.y);
  shade.addColorStop(0, 'rgba(12,3,6,1)');
  shade.addColorStop(0.55, 'rgba(50,14,22,0.75)');
  shade.addColorStop(1, 'rgba(170,70,80,0.2)');
  ctx.fillStyle = shade;
  ctx.fill();
  // The tongue, low in the mouth.
  const mid = lower[Math.round(lower.length * 0.55)]!;
  const tongue = toSprite({ x: mid.x - 2, y: mid.y - HH * 0.18 * open }, R);
  ctx.fillStyle = '#b4545e';
  ctx.globalAlpha = 0.75;
  ctx.beginPath();
  ctx.ellipse(tongue.x, tongue.y, HH * 0.5 * R, HH * 0.16 * R * open, 0.15, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
  // Teeth: broad, hooked sideways like a cockscomb, pointing across the gap; a second row behind.
  for (const [row, scale, alpha] of [[1, 0.65, 0.55], [0, 1, 1]] as const) {
    for (const [lip, dir] of [[upper, 1], [lower, -1]] as const) {
      for (let i = 1; i < lip.length - 1; i++) {
        const base = lip[i]!;
        const p = toSprite({ x: base.x - row * 1.5, y: base.y + dir * row * 2.4 }, R);
        const size = (2.1 + (i / lip.length) * 1.9) * R * scale * Math.min(1, open * 2.5);
        const hook = size * 0.5;
        ctx.beginPath();
        ctx.moveTo(p.x - size * 0.5, p.y);
        ctx.lineTo(p.x - size * 0.05, p.y + dir * size * 0.55);
        ctx.quadraticCurveTo(p.x + hook * 0.5, p.y + dir * size * 1.25, p.x + hook, p.y + dir * size * 1.35);
        ctx.quadraticCurveTo(p.x + size * 0.32, p.y + dir * size * 0.6, p.x + size * 0.5, p.y);
        ctx.closePath();
        ctx.globalAlpha = alpha;
        ctx.fillStyle = '#fbf6e8';
        ctx.fill();
        ctx.lineWidth = 0.32 * R;
        ctx.strokeStyle = INK;
        ctx.stroke();
      }
    }
  }
  ctx.restore();
}

function drawLips(ctx: CanvasRenderingContext2D, upper: readonly Pt[], lower: readonly Pt[], R: number): void {
  ctx.save();
  ctx.strokeStyle = INK;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.lineWidth = 1.5 * R;
  for (const lip of [upper, lower]) {
    ctx.beginPath();
    trace(ctx, lip, R);
    ctx.stroke();
  }
  ctx.restore();
}

/** The smug lid: skin drawn down over the top of the eye, a heavy line along its edge, and a cocky brow. */
function drawLid(ctx: CanvasRenderingContext2D, lid: number, R: number): void {
  if (lid <= 0.01) return;
  const e = toSprite(EYE, R);
  const r = EYE_R * 1.3 * R;
  const edge = e.y - r + 2 * r * 0.55 * lid;
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(e.x, e.y, r, r * 0.95, 0, 0, Math.PI * 2);
  ctx.clip();
  ctx.fillStyle = '#6d6a52';
  ctx.beginPath();
  ctx.moveTo(e.x - r * 1.2, e.y - r * 1.2);
  ctx.lineTo(e.x + r * 1.2, e.y - r * 1.2);
  ctx.lineTo(e.x + r * 1.2, edge - r * 0.12);
  ctx.quadraticCurveTo(e.x, edge + r * 0.2, e.x - r * 1.2, edge + r * 0.12);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  ctx.save();
  ctx.strokeStyle = INK;
  ctx.lineCap = 'round';
  ctx.globalAlpha = Math.min(1, lid * 2);
  ctx.lineWidth = 1.5 * R;
  ctx.beginPath();
  ctx.moveTo(e.x - r * 1.05, edge + r * 0.1);
  ctx.quadraticCurveTo(e.x, edge + r * 0.28, e.x + r * 1.05, edge - r * 0.1);
  ctx.stroke();
  // The brow, cocked up at the back.
  ctx.lineWidth = 1.2 * R;
  ctx.beginPath();
  ctx.moveTo(e.x + r * 1.2, e.y - r * 1.25);
  ctx.quadraticCurveTo(e.x, e.y - r * 1.55 - r * 0.5 * lid, e.x - r * 1.4, e.y - r * 1.9 - r * 0.6 * lid);
  ctx.stroke();
  ctx.restore();
}

/** Draws the tiger shark at `pose` (the swimmer's column method, with its own jaw and lid). */
export function drawTiger(ctx: CanvasRenderingContext2D, sprite: Sprite, pose: TigerPose, boil: number): void {
  const canvas = sprite.frames[boil % sprite.frames.length]!;
  const side = canvas.width;
  const half = side / 2;
  const R = sprite.res;
  const scale = pose.length / sprite.bodyPx;
  const head = (FISH_TEX / 2 + HL) * R;
  const span = 2 * HL * R;
  const amp = HH * R * (0.12 + 0.16 * pose.effort);
  const open = Math.max(0, pose.jaw);
  const step = Math.max(4, Math.min(48, Math.ceil(2 / scale)));
  const mouth = open > 0.01 ? outline(open) : null;
  // Edge-on as it turns: never quite flat, so it doesn't vanish.
  const turn = Math.sign(pose.turn || 1) * Math.max(0.08, Math.abs(pose.turn));

  ctx.save();
  ctx.translate(pose.x, pose.y);
  ctx.scale(turn, 1);
  ctx.rotate(-pose.tilt);
  ctx.scale(scale, scale);
  if (mouth) drawInside(ctx, mouth.upper, mouth.lower, R, open);
  for (let sx = 0; sx < side; sx += step) {
    const along = (head - (sx + step / 2)) / span;
    const bend = Math.max(0, (along - 0.3) / 0.7);
    const dy = amp * bend * bend * Math.sin(pose.beat - 2.4 * along);
    const w = step + 0.75 / scale;
    const gape = gapeAt(open, (sx + step / 2) / R);
    if (!gape) {
      ctx.drawImage(canvas, sx, 0, step, side, sx - half, -half + dy, w, side);
      continue;
    }
    const cut = gape.line * R;
    ctx.drawImage(canvas, sx, 0, step, cut, sx - half, -half - gape.up * R + dy, w, cut);
    ctx.drawImage(canvas, sx, cut, step, side - cut, sx - half, cut - half + gape.down * R + dy, w, side - cut);
  }
  if (mouth) drawLips(ctx, mouth.upper, mouth.lower, R);
  drawLid(ctx, pose.lid, R);
  ctx.restore();
}

/** A point on the fish (texture px, facing right) at `pose`: its mouth, its eye. */
export function pointOn(pose: TigerPose, p: Pt): Pt {
  const scale = pose.length / (2 * HL);
  const lx = (p.x - C) * scale;
  const ly = (p.y - C) * scale;
  const c = Math.cos(pose.tilt);
  const s = Math.sin(pose.tilt);
  return { x: pose.x + pose.turn * (lx * c + ly * s), y: pose.y - lx * s + ly * c };
}

/** The middle of the open mouth, between the jaws at full gape, texture px. */
export function mouthMid(open: number): Pt {
  const g = gapeAt(open, (TIP.x + HINGE.x) / 2 + 3) ?? { line: TIP.y, up: 0, down: 0 };
  return { x: (TIP.x + HINGE.x) / 2 + 3, y: g.line + (g.down - g.up) / 2 };
}

/** The whole shark in its drawing, fins and tail included, texture px: what the chart's icons crop. */
export const ICON_CROP = { x: 4, y: 66, w: 216, h: 114 } as const;
