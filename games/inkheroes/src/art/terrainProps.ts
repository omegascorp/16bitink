import type { Rng } from '../logic/rng';
import { INK, PAPER_FILL } from './palette';
import { ellipse, type Pen, type Pt } from './pen';
import { mix } from './wash';

/**
 * The map's tall things, each drawn standing on `base` (the foot of its
 * tile): a broadleaf tree, a pine, a mountain peak, a boulder. Lit from the
 * upper left: washed light side, hatched shadow side, a heavier pen contour
 * below and to the right, and a cast shadow on the ground.
 */

const LIGHT = { x: -0.55, y: -0.84 };

function castShadow(pen: Pen, base: Pt, rx: number, ry: number, alpha = 0.18): void {
  pen.fill(ellipse(base.x + rx * 0.35, base.y + 1, rx, ry, 18), INK, alpha);
}

/** A rounded, lobed outline: a canopy or a bush. */
function lobes(c: Pt, rx: number, ry: number, n: number, rng: Rng): Pt[] {
  const pts: Pt[] = [];
  for (let i = 0; i < n * 6; i++) {
    const a = (i / (n * 6)) * Math.PI * 2;
    const lobe = 1 + 0.12 * Math.max(0, Math.sin((i / 6) * Math.PI * 2 / 1)) + (rng() - 0.5) * 0.06;
    const bump = 0.9 + 0.1 * Math.abs(Math.sin(a * n / 2));
    pts.push({ x: c.x + Math.cos(a) * rx * bump * lobe, y: c.y + Math.sin(a) * ry * bump * lobe });
  }
  return pts;
}

export function drawTree(pen: Pen, rng: Rng, base: Pt, tile: number, shadow: boolean): void {
  const s = tile / 48 * (0.85 + rng() * 0.3);
  const lean = (rng() - 0.5) * 3;
  if (shadow) castShadow(pen, base, 15 * s, 5 * s);
  // Trunk.
  const trunk = [{ x: base.x - 2.6 * s, y: base.y }, { x: base.x - 1.8 * s + lean, y: base.y - 14 * s }, { x: base.x + 1.8 * s + lean, y: base.y - 14 * s }, { x: base.x + 2.8 * s, y: base.y }];
  pen.fill(trunk, '#6e5238', 0.95);
  pen.stroke([...trunk.slice(0, 2)], 0.8, INK, 0.8, false);
  pen.stroke([...trunk.slice(2)], 1.1, INK, 0.9, false);
  // Canopy: a big wash, a darker lower-right mass, light dabs, then contour.
  const c = { x: base.x + lean, y: base.y - 24 * s };
  const crown = lobes(c, 15 * s, 13 * s, 5, rng);
  const green = mix('#6f9150', '#8aa65a', rng());
  pen.fill(crown, PAPER_FILL, 1);
  pen.fill(crown, green, 0.85);
  pen.clipped(crown, () => {
    pen.fill(ellipse(c.x + 6 * s, c.y + 6 * s, 14 * s, 11 * s, 18), '#2f4a2a', 0.45);
    for (let i = 0; i < 6; i++) {
      const a = rng() * Math.PI * 2;
      const r = rng() * 8 * s;
      pen.fill(ellipse(c.x - 4 * s + Math.cos(a) * r, c.y - 4 * s + Math.sin(a) * r, 3.5 * s, 2.6 * s, 10), '#c3d38c', 0.55);
    }
    pen.hatch(crown, 2.2, 0.9, 0.45, { color: INK, alpha: 0.35, onlyBelow: c.y + 2 * s });
  });
  pen.closed(crown, 1.05, INK);
}

export function drawPine(pen: Pen, rng: Rng, base: Pt, tile: number): void {
  const s = tile / 48 * (0.85 + rng() * 0.35);
  castShadow(pen, base, 11 * s, 4 * s);
  pen.fill([{ x: base.x - 1.6 * s, y: base.y }, { x: base.x - 1.2 * s, y: base.y - 8 * s }, { x: base.x + 1.2 * s, y: base.y - 8 * s }, { x: base.x + 1.6 * s, y: base.y }], '#5e4630', 0.95);
  const tiers = 3;
  for (let i = 0; i < tiers; i++) {
    const w = (11 - i * 2.6) * s;
    const yb = base.y - (5 + i * 9) * s;
    const top = { x: base.x + (rng() - 0.5), y: yb - 15 * s };
    const tier = [{ x: base.x - w, y: yb }, { x: base.x - w * 0.45, y: yb - 6 * s }, top, { x: base.x + w * 0.45, y: yb - 6 * s }, { x: base.x + w, y: yb }, { x: base.x, y: yb + 2 * s }];
    pen.fill(tier, PAPER_FILL, 1);
    pen.fill(tier, mix('#3f6a4a', '#557f52', rng()), 0.9);
    pen.clipped(tier, () => pen.fill([top, { x: base.x + w, y: yb }, { x: base.x, y: yb + 2 * s }], '#1f3a2c', 0.4));
    pen.closed(tier, 0.95, INK);
  }
}

export function drawMountain(pen: Pen, rng: Rng, base: Pt, tile: number, leftKin: boolean, rightKin: boolean): void {
  const s = tile / 48;
  const h = (34 + rng() * 18) * s;
  const half = (leftKin || rightKin ? 30 : 26) * s;
  const peak = { x: base.x + (rng() - 0.5) * 8 * s, y: base.y - h };
  const left = { x: base.x - half, y: base.y + 2 };
  const right = { x: base.x + half, y: base.y + 2 };
  const shoulderL = { x: (left.x + peak.x) / 2 - 3 * s, y: (left.y + peak.y) / 2 + 2 * s };
  const shoulderR = { x: (right.x + peak.x) / 2 + 4 * s, y: (right.y + peak.y) / 2 - 1 * s };
  const body = [left, shoulderL, peak, shoulderR, right];
  pen.fill(body, PAPER_FILL, 1);
  pen.fill(body, '#b2a48c', 0.9);
  // The face away from the light, from the peak down: a ridge splits it.
  const ridgeFoot = { x: peak.x + 4 * s, y: base.y + 2 };
  const shadowFace = [peak, shoulderR, right, ridgeFoot];
  pen.fill(shadowFace, '#5d5446', 0.5);
  pen.hatch(shadowFace, 2.1, 1.15, 0.5, { color: INK, alpha: 0.55 });
  // Snow on a tall peak.
  if (h > 44 * s) {
    const cap = [{ x: peak.x - 7 * s, y: peak.y + 9 * s }, peak, { x: peak.x + 6 * s, y: peak.y + 8 * s }, { x: peak.x + 1 * s, y: peak.y + 12 * s }, { x: peak.x - 3 * s, y: peak.y + 8 * s }];
    pen.fill(cap, '#fbf8ef', 0.95);
  }
  // Strata and the ridge line.
  pen.hair([peak, { x: peak.x + 2 * s, y: peak.y + h * 0.4 }, ridgeFoot], 0.9, INK, 0.75);
  for (let i = 0; i < 3; i++) {
    const t = 0.35 + i * 0.2;
    const a = { x: left.x + (peak.x - left.x) * t + 3 * s, y: left.y + (peak.y - left.y) * t };
    pen.hair([a, { x: a.x + 6 * s, y: a.y + 3 * s }], 0.6, INK, 0.5);
  }
  pen.stroke([left, shoulderL, peak], 1.0, INK, 0.9, false);
  pen.stroke([peak, shoulderR, right], 1.5, INK, 1, false);
  void LIGHT;
}

export function drawRock(pen: Pen, rng: Rng, base: Pt, tile: number): void {
  const s = tile / 48 * (0.8 + rng() * 0.3);
  castShadow(pen, base, 13 * s, 4 * s, 0.2);
  const pts: Pt[] = [];
  const n = 9;
  for (let i = 0; i < n; i++) {
    const a = Math.PI + (i / (n - 1)) * Math.PI;
    const r = 1 + (rng() - 0.5) * 0.25;
    pts.push({ x: base.x + Math.cos(a) * 13 * s * r, y: base.y + Math.sin(a) * 15 * s * r });
  }
  pen.fill(pts, PAPER_FILL, 1);
  pen.fill(pts, '#b9b09e', 0.9);
  pen.clipped(pts, () => {
    pen.fill(ellipse(base.x + 7 * s, base.y - 2 * s, 11 * s, 10 * s, 14), '#4f483e', 0.45);
    pen.fill(ellipse(base.x - 5 * s, base.y - 10 * s, 5 * s, 3 * s, 10), '#efe9da', 0.6);
  });
  pen.hair([{ x: base.x - 2 * s, y: base.y - 13 * s }, { x: base.x + 1 * s, y: base.y - 5 * s }, { x: base.x - 1 * s, y: base.y }], 0.6, INK, 0.6);
  pen.closed(pts, 1.1, INK);
}
