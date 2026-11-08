import { type Pt } from '../../../../src/art/pen';
import { fillShape, inkLine, seeded, unitPx, within } from '../../pelican/art/ink';
import { dab, smoothLoop, softLine } from '../../seal/art/paint';
import { type Feather, type FeatherInk, paintFeather } from './feather';

/**
 * One osprey wing, long and narrow with a bend at the wrist, built as a
 * single piece along its bent axis (shoulder, wrist, tip): one sweep of
 * covert feathers from the leading edge, the secondaries hanging from the
 * arm, the primaries fanning from the hand to the long "fingers" at the tip.
 * From below (`under`): white coverts flecked brown, the dark bar along the
 * greater coverts, the dark wrist patch, grey barred flight feathers with
 * dark tips. From above: dark brown, the coverts edged paler.
 */

export interface WingSet {
  readonly root: Pt;
  /** The arm's direction and the hand's (screen radians, own frame). */
  readonly armA: number;
  readonly handA: number;
  readonly len: number;
  /** Which side leads: +1 the left of the wing's direction (as seen), -1 the right. */
  readonly lead: 1 | -1;
  readonly under: boolean;
}

const UNDER: FeatherInk = { base: '#e6e1da', tip: '#aaa199', bar: '#5a483b', bars: 0.55, shaft: '#f6f2ea', tipBand: 0.8 };
const UNDER_FINGER: FeatherInk = { ...UNDER, base: '#d8d2ca', tip: '#776a5f', tipBand: 1 };
const UPPER: FeatherInk = { base: '#553b29', tip: '#2e1f15', bar: '#1c120c', bars: 0.25, shaft: '#7f6049', tipBand: 0.35 };

interface Frame {
  readonly at: Pt;
  readonly dir: Pt;
  /** Toward the leading edge. */
  readonly n: Pt;
}

const ARM = 0.4;
const COVERTS_TO = 0.74;

function framer(w: WingSet): (u: number) => Frame {
  const dA = { x: Math.cos(w.armA), y: Math.sin(w.armA) };
  const dH = { x: Math.cos(w.handA), y: Math.sin(w.handA) };
  const nOf = (d: Pt): Pt => ({ x: -d.y * w.lead, y: d.x * w.lead });
  const wrist = { x: w.root.x + dA.x * w.len * ARM, y: w.root.y + dA.y * w.len * ARM };
  return (u) => {
    const at = u <= ARM
      ? { x: w.root.x + dA.x * w.len * u, y: w.root.y + dA.y * w.len * u }
      : { x: wrist.x + dH.x * w.len * (u - ARM), y: wrist.y + dH.y * w.len * (u - ARM) };
    // The direction turns smoothly through the wrist.
    const k = Math.max(0, Math.min(1, (u - (ARM - 0.08)) / 0.16));
    const s = k * k * (3 - 2 * k);
    const a = w.armA + (w.handA - w.armA) * s;
    const dir = { x: Math.cos(a), y: Math.sin(a) };
    return { at, dir, n: nOf(dir) };
  };
}

const off = (f: Frame, lead: number, along = 0): Pt => ({ x: f.at.x + f.n.x * lead + f.dir.x * along, y: f.at.y + f.n.y * lead + f.dir.y * along });
const unit = (p: Pt): Pt => {
  const l = Math.hypot(p.x, p.y) || 1;
  return { x: p.x / l, y: p.y / l };
};

/** How far the leading edge stands off the axis, along the wing. */
const leadAt = (c: number, u: number): number => c * (0.5 - 0.32 * (u / COVERTS_TO) ** 1.4);
/** How far back the coverts reach. */
const backAt = (c: number, u: number): number => -c * (0.16 - 0.16 * (u / COVERTS_TO));

function coverts(at: (u: number) => Frame, c: number): Pt[] {
  const n = 72;
  const lead: Pt[] = [];
  const back: Pt[] = [];
  for (let i = 0; i <= n; i++) {
    const u = -0.03 + ((COVERTS_TO + 0.03) * i) / n;
    lead.push(off(at(u), leadAt(c, Math.max(0, u))));
    // The back edge scalloped: the tips of the last row of coverts.
    back.push(off(at(u), backAt(c, Math.max(0, u)) - c * 0.035 * Math.abs(Math.sin(i * 0.9))));
  }
  const tip = at(COVERTS_TO + 0.03);
  return [...lead, off(tip, c * 0.06), ...back.reverse()];
}

function secondaries(at: (u: number) => Frame, c: number, len: number): Feather[] {
  const n = 12;
  return Array.from({ length: n }, (_, i) => {
    const u = 0.01 + (ARM - 0.02) * (i / (n - 1));
    const f = at(u);
    const dir = unit({ x: -f.n.x - f.dir.x * 0.16, y: -f.n.y - f.dir.y * 0.16 });
    return { at: off(f, -0.02 * c), dir, len: c * (0.8 - 0.1 * (i / n)), width: ((len * ARM) / n) * 1.7 };
  });
}

function primaries(at: (u: number) => Frame, c: number, len: number): Feather[] {
  const n = 10;
  return Array.from({ length: n }, (_, i) => {
    const v = i / (n - 1);
    const u = ARM + 0.02 + 0.3 * v;
    const f = at(u);
    const m = v ** 0.85;
    const dir = unit({ x: -f.n.x * (1 - m) + f.dir.x * (m + 0.05), y: -f.n.y * (1 - m) + f.dir.y * (m + 0.05) });
    return { at: off(f, -0.02 * c), dir, len: c * 0.78 + (len * 0.29 - c * 0.78) * v ** 1.2, width: len * (0.048 - 0.008 * v), finger: i >= 6 };
  });
}

/** Rows of small covert feathers (little arcs) along the wing at `lead` off the axis. */
function covertRow(ctx: CanvasRenderingContext2D, at: (u: number) => Frame, lead: (u: number) => number, u0: number, u1: number, size: number, colour: string, alpha: number): void {
  const px = unitPx(ctx);
  ctx.save();
  ctx.strokeStyle = colour;
  ctx.globalAlpha = alpha;
  ctx.lineWidth = 1.1 * px;
  ctx.lineCap = 'round';
  const steps = Math.max(2, Math.round(((u1 - u0) * 1000) / size / 2));
  for (let i = 0; i <= steps; i++) {
    const u = u0 + ((u1 - u0) * i) / steps;
    const f = at(u);
    const p = off(f, lead(u));
    // An arc opening toward the leading edge (the feather's free edge faces back).
    const a = Math.atan2(-f.n.y, -f.n.x);
    ctx.beginPath();
    ctx.arc(p.x + f.n.x * size * 0.3, p.y + f.n.y * size * 0.3, size * 0.55, a - 1.1, a + 1.1);
    ctx.stroke();
  }
  ctx.restore();
}

export function paintWing(ctx: CanvasRenderingContext2D, w: WingSet, boil: number): void {
  const at = framer(w);
  const c = w.len * 0.21;
  for (const f of secondaries(at, c, w.len)) paintFeather(ctx, f, w.under ? UNDER : UPPER, boil, 0.5);
  const prim = primaries(at, c, w.len);
  for (const f of [...prim].reverse()) paintFeather(ctx, f, w.under ? (f.finger ? UNDER_FINGER : UNDER) : UPPER, boil, 0.55);
  const shape = coverts(at, c);
  const wrist = at(ARM);
  const g = ctx.createLinearGradient(off(wrist, 0.5 * c).x, off(wrist, 0.5 * c).y, off(wrist, -0.2 * c).x, off(wrist, -0.2 * c).y);
  if (w.under) {
    g.addColorStop(0, '#fdfbf6');
    g.addColorStop(0.6, '#efebe4');
    g.addColorStop(1, '#cfc8bf');
  } else {
    g.addColorStop(0, '#6c4c35');
    g.addColorStop(0.5, '#4d3424');
    g.addColorStop(1, '#33231a');
  }
  fillShape(ctx, shape, g);
  within(ctx, shape, () => {
    const lead = (k: number) => (u: number): number => leadAt(c, u) * k + backAt(c, u) * (1 - k);
    if (w.under) {
      // Shade toward the body, light along the leading edge, rows of small coverts, brown flecks.
      dab(ctx, at(0.02).at.x, at(0.02).at.y, c * 0.9, '140,140,165', 0.35);
      softLine(ctx, Array.from({ length: 12 }, (_, i) => off(at((COVERTS_TO * i) / 11), leadAt(c, (COVERTS_TO * i) / 11) - c * 0.06)), c * 0.12, '#ffffff', 0.35, 4);
      covertRow(ctx, at, lead(0.62), 0.02, 0.6, c * 0.16, '#9a8f86', 0.4);
      covertRow(ctx, at, lead(0.35), 0.02, 0.62, c * 0.16, '#9a8f86', 0.4);
      // The dark bar along the greater coverts.
      softLine(ctx, Array.from({ length: 12 }, (_, i) => off(at(0.02 + (0.6 * i) / 11), backAt(c, 0.02 + (0.6 * i) / 11) + c * 0.07)), c * 0.08, '#3d2b20', 0.35, 5);
      covertRow(ctx, at, lead(0.12), 0.02, 0.6, c * 0.15, '#2e2018', 0.55);
      const rng = seeded(311);
      for (let i = 0; i < 30; i++) {
        const u = rng() * 0.62;
        const p = off(at(u), backAt(c, u) + rng() * (leadAt(c, u) - backAt(c, u)) * 0.8);
        dab(ctx, p.x, p.y, 2.5 + rng() * 3, '90,64,46', 0.4);
      }
      // The dark wrist patch: the osprey's mark from below, a soft-edged blotch.
      const patch: Pt[] = [];
      for (let i = 0; i <= 10; i++) {
        const u = ARM - 0.05 + 0.17 * (i / 10);
        patch.push(off(at(u), leadAt(c, u) * 0.78 + c * 0.04 * Math.sin((Math.PI * i) / 10)));
      }
      for (let i = 10; i >= 0; i--) {
        const u = ARM - 0.04 + 0.15 * (i / 10);
        patch.push(off(at(u), backAt(c, u) + c * (0.12 - 0.08 * Math.sin((Math.PI * i) / 10))));
      }
      const p = smoothLoop(patch, 3);
      softLine(ctx, [...p, p[0]!], c * 0.08, '#2a1c14', 0.35, 4);
      fillShape(ctx, p, '#2a1c14', 0.88);
      within(ctx, p, () => {
        const mid = off(at(ARM + 0.03), c * 0.12);
        dab(ctx, mid.x, mid.y, c * 0.22, '96,70,52', 0.4);
        covertRow(ctx, at, lead(0.45), ARM - 0.04, ARM + 0.12, c * 0.13, '#6a5040', 0.55);
      });
    } else {
      softLine(ctx, Array.from({ length: 12 }, (_, i) => off(at((COVERTS_TO * i) / 11), leadAt(c, (COVERTS_TO * i) / 11) - c * 0.04)), c * 0.08, '#9a7756', 0.55, 4);
      for (const k of [0.75, 0.5, 0.25]) covertRow(ctx, at, lead(k), 0.02, 0.66, c * 0.17, '#a5815f', 0.45);
      dab(ctx, at(0.05).at.x, at(0.05).at.y, c * 0.8, '20,12,8', 0.35);
    }
  });
  // The leading edge firm, the coverts' back edge faint.
  const edge = Array.from({ length: 25 }, (_, i) => off(at(-0.02 + ((COVERTS_TO + 0.02) * i) / 24), leadAt(c, Math.max(0, -0.02 + ((COVERTS_TO + 0.02) * i) / 24))));
  inkLine(ctx, edge, 1.7, 0.85, boil);
}
