import { createRng } from '../../logic/rng';
import { closed, type Draw, pt, shade, TAU } from '../kit';
import { PAPER_FILL } from '../palette';
import type { Pt } from '../pen';
import { glaze, roundShade } from '../propsKit';
import { mix } from '../wash';

/**
 * The Great Snail's shell, seen from above: a logarithmic spiral of four and
 * a bit whorls, each band a rounded tube in warm amber with broken chestnut
 * bands, pale flame-streaks and fine growth lines, its mouth at the front
 * (+x) where the body comes out. Local units, light from the upper left.
 */
export const SHELL = { cx: -10, cy: -3, R: 44, g: 1.8, turns: 4.5 } as const;

export const SHELL_COL = {
  amber: '#c98c45',
  pale: '#f0d9a4',
  band: '#5e321a',
  deep: '#3b2214',
  lip: '#f1e6cc',
  mouth: '#24161a',
} as const;

/** Radius of the spiral at turning φ (0 at the mouth, negative towards the apex). */
const rad = (phi: number): number => SHELL.R * SHELL.g ** (phi / TAU);

/** A point on the band of whorl φ: t = 0 at the suture with the older whorl, 1 at the newer one. */
const at = (phi: number, t: number): Pt => {
  const r = rad(phi + TAU * t);
  return pt(SHELL.cx + Math.cos(phi) * r, SHELL.cy + Math.sin(phi) * r);
};

/** The apex, and the last band's φ (its outer edge is the shell's rim). */
const APEX = -TAU * SHELL.turns;
const LAST = -TAU;

/** φ samples from a to b, about 1.4 px apart along the band's outer edge. */
function steps(a: number, b: number): number[] {
  const out = [a];
  let p = a;
  while (p < b) {
    p = Math.min(b, p + Math.min(0.22, 1.4 / rad(p + TAU)));
    out.push(p);
  }
  return out;
}

/** The part of the band between φ a..b and t0..t1, as a closed shape. */
function strip(a: number, b: number, t0: number, t1: number): Pt[] {
  const ph = steps(a, b);
  return [...ph.map((p) => at(p, t0)), ...[...ph].reverse().map((p) => at(p, t1))];
}

/** The shell's silhouette: the last whorl's rim, closed across the mouth. */
export function shellOutline(): Pt[] {
  return steps(-TAU, 0).map((p) => at(p, 0));
}

/** The mouth: a lens-shaped opening below the end of the last whorl, from its lip down onto the whorl before. */
export function shellMouth(): Pt[] {
  const x0 = SHELL.cx + rad(-TAU) - 1;
  const x1 = SHELL.cx + rad(0) + 0.5;
  const y = SHELL.cy;
  const n = 14;
  const top = Array.from({ length: n + 1 }, (_, i) => pt(x0 + ((x1 - x0) * i) / n, y - Math.sin((Math.PI * i) / n) * 1.2));
  const bot = Array.from({ length: n - 1 }, (_, i) => {
    const u = 1 - (i + 1) / n;
    return pt(x0 + (x1 - x0) * u, y + Math.sin(Math.PI * u) ** 0.8 * 6.5);
  });
  return [...top, ...bot];
}

/** The lip at the end of the last whorl: a thick pale rim along the mouth's upper edge. */
export function paintLip(d: Draw): void {
  const { pen } = d;
  const x0 = SHELL.cx + rad(-TAU) - 0.5;
  const x1 = SHELL.cx + rad(0) + 0.6;
  const y = SHELL.cy;
  const lip = Array.from({ length: 9 }, (_, i) => pt(x0 + ((x1 - x0) * i) / 8, y - 1.4 - Math.sin((Math.PI * i) / 8) * 1.4));
  pen.hair(lip, 2.2, mix(SHELL_COL.lip, SHELL_COL.amber, 0.25), 0.9);
  pen.hair(lip.map((p) => pt(p.x, p.y + 1.1)), 0.7, d.ink, 0.85);
}

/** A brush dab along a band: swelling from nothing to t0..t1 and back, over φ a..b. */
function dab(a: number, b: number, t0: number, t1: number): Pt[] {
  const ph = steps(a, b);
  const mid = (t0 + t1) / 2;
  const half = (p: number): number => ((t1 - t0) / 2) * (0.55 + 0.45 * Math.sin((Math.PI * (p - a)) / (b - a || 1)) ** 0.35);
  return [...ph.map((p) => at(p, mid - half(p))), ...[...ph].reverse().map((p) => at(p, mid + half(p)))];
}

/** Colour along the whorls: tube shading at the sutures, chestnut bands broken into flames, pale streaks. */
function bands(d: Draw): void {
  const { pen } = d;
  const rng = createRng(4127);
  // Each whorl a rounded tube: darker into both sutures, a pale crown along its middle.
  for (const [t0, t1, c, a] of [[0.78, 1, SHELL_COL.deep, 0.24], [0.9, 1, SHELL_COL.deep, 0.32], [0, 0.16, SHELL_COL.deep, 0.26], [0.36, 0.6, SHELL_COL.pale, 0.2]] as const) {
    pen.fill(strip(APEX, LAST, t0, t1), c, a);
  }
  // Wet-in-wet blotches of warmer and duller colour.
  for (let i = 0; i < 26; i++) {
    const p = APEX + 1.5 + rng() * (LAST - APEX - 1.5);
    const q = at(p, 0.5);
    const r = rad(p + TAU) * 0.18;
    glaze(d, q.x, q.y, r * (1 + rng()), r * 0.7, rng() * 3, rng() < 0.5 ? '#a0581f' : '#d9b070', 0.3);
  }
  for (const [t0, t1, alpha] of [[0.12, 0.32, 0.62], [0.56, 0.8, 0.55]] as const) {
    let p = APEX + 0.6;
    while (p < LAST) {
      const r = rad(p + TAU);
      const q = Math.min(LAST, p + (9 + rng() * 20) / r);
      const w = (rng() - 0.5) * 0.06;
      pen.fill(dab(p, q, t0 + w, t1 + w), SHELL_COL.band, alpha * (0.6 + rng() * 0.4));
      if (rng() < 0.5) pen.fill(dab(p, q, t0 + w + 0.04, t1 + w - 0.04), SHELL_COL.deep, 0.25);
      p = q + (0.8 + rng() * 2.4) / r;
    }
  }
  // Pale flame streaks along the growth lines, crossing the bands.
  for (let p = APEX + 0.8; p < LAST; ) {
    const r = rad(p + TAU);
    pen.hair([at(p, 0.06), at(p + 0.6 / r, 0.45), at(p + 1.4 / r, 0.94)], 0.5 + r * 0.025, SHELL_COL.pale, 0.3);
    p += (5 + rng() * 8) / r;
  }
}

/** Fine growth lines across every whorl, a few heavier ones where growth paused. */
function growth(d: Draw): void {
  const { pen } = d;
  const rng = createRng(4128);
  for (let p = APEX + 0.9; p < LAST; ) {
    const r = rad(p + TAU);
    const heavy = rng() < 0.07;
    const t0 = heavy ? 0.03 : rng() * 0.4;
    const t1 = heavy ? 0.97 : t0 + 0.3 + rng() * 0.5;
    pen.hair([at(p, t0), at(p + 0.5 / r, (t0 + t1) / 2), at(p + 1.1 / r, Math.min(0.97, t1))], heavy ? 0.5 : 0.3, heavy ? d.ink : SHELL_COL.deep, heavy ? 0.45 : 0.3);
    p += (1.3 + rng() * 1.4) / r;
  }
}

/** The sutures: the spiral groove between whorls, inked finer towards the apex. */
function sutures(d: Draw): void {
  const { pen } = d;
  const ph = steps(APEX + 0.35, LAST);
  const line = ph.map((p) => at(p, 1));
  const n = line.length;
  for (const [from, to, w] of [[0, 0.35, 0.5], [0.3, 0.7, 0.75], [0.65, 1, 1]] as const) {
    pen.stroke(line.slice(Math.floor(n * from), Math.ceil(n * to)), w, d.ink, 0.9, false);
  }
  const tip = at(APEX + 0.35, 1);
  pen.dot(tip.x, tip.y, 1.3, mix(SHELL_COL.amber, SHELL_COL.deep, 0.5), 0.9);
}

/** Wet-looking gloss: a soft window high on each whorl at the upper left, glints along the last two. */
function shine(d: Draw): void {
  const { pen } = d;
  const dirL = -TAU * 0.375;
  for (let k = 0; k < 4; k++) {
    const base = LAST - TAU * k + dirL;
    const r = rad(base + TAU * 0.5);
    const w = Math.max(0.5, r * 0.05);
    pen.hair([at(base - 0.5, 0.48), at(base - 0.1, 0.52), at(base + 0.35, 0.5)], w, PAPER_FILL, 0.75);
    if (k < 2) pen.dot(at(base - 0.05, 0.6).x, at(base - 0.05, 0.6).y, w * 0.8, PAPER_FILL, 0.95);
  }
}

/** Withdrawn: the mouth shut with a dark, dry, glossy door under the lip. */
export function paintSealed(d: Draw): void {
  const { pen } = d;
  const m = shellMouth();
  pen.fill(m, SHELL_COL.mouth, 1);
  pen.clipped(m, () => {
    glaze(d, SHELL.cx + 31, SHELL.cy + 2, 9, 3.5, 0, '#6b4a3a', 0.7);
    pen.hatch(m, 1.4, 0.9, 0.35, { color: '#000000', alpha: 0.45 });
    pen.hair([pt(SHELL.cx + 23, SHELL.cy + 2.2), pt(SHELL.cx + 30, SHELL.cy + 3.4), pt(SHELL.cx + 36, SHELL.cy + 2.6)], 0.9, PAPER_FILL, 0.5);
  });
  pen.stroke(closed(m), 1.3, d.ink, 1);
  paintLip(d);
}

/** The whole shell, rim inked; `sealed` (withdrawn) draws it heavier, with the mouth shut. */
export function paintShell(d: Draw, sealed: boolean): void {
  const { pen } = d;
  const outline = shellOutline();
  const xs = outline.map((p) => p.x);
  const ys = outline.map((p) => p.y);
  const bx = (Math.min(...xs) + Math.max(...xs)) / 2;
  const by = (Math.min(...ys) + Math.max(...ys)) / 2;
  const br = (Math.max(...xs) - Math.min(...xs)) / 2;
  pen.fill(outline, PAPER_FILL, 1);
  pen.fill(outline, SHELL_COL.amber, 0.9);
  pen.clipped(outline, () => {
    bands(d);
    growth(d);
    roundShade(d, outline, bx, by, br, SHELL_COL.deep, sealed ? 0.7 : 0.6);
    glaze(d, bx - br * 0.35, by - br * 0.4, br * 0.4, br * 0.26, -0.6, PAPER_FILL, 0.3);
  });
  sutures(d);
  shade(d, outline, sealed ? 0.4 : 0.3, sealed);
  shine(d);
  pen.stroke(closed(outline), sealed ? 1.7 : 1.4, d.ink, 1);
}
