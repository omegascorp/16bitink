import { bezier, type Draw, oval, pt } from '../kit';
import type { Pt } from '../pen';
import { PAPER_FILL } from '../palette';
import { FAR } from './common';
import { glow } from './estuary';

/**
 * The weather of the Labrador coast in early spring, a bright, bitter day
 * with a strong westerly blowing (left to right, the way the clouds drift):
 * a pale, cold, high sky, the low sun ringed by its halo with a sun dog
 * either side, stratocumulus laid out in long streets by the wind, their
 * lee ends torn into streamers, smooth lenticular lenses standing over the
 * hills, mares' tails high up, and the gusts themselves drawn as fine
 * curling lines, as an illustrator draws wind.
 */
export const COLD_SKY = '#6797c2';
export const SKY_PALE = '#e4edf0';
export const SUN_PALE = '#fbf4d8';
const CLOUD = '#f6f9fa';
const CLOUD_SHADE = '#9fb1c2';
const CLOUD_DEEP = '#7f93a8';

/**
 * The low spring sun: a white disc in a pale glow, ringed by a faint 22°
 * halo, a sun dog bright on the ring either side of it, reddish on its
 * inner edge, with a short pale tail running away from the sun.
 */
export function lowSun(t: Draw, x: number, y: number, halo: number): void {
  const { pen } = t;
  glow(t, x, y, 170, 120, SUN_PALE, 0.55);
  glow(t, x, y, 40, 38, '#fffdf2', 0.95);
  pen.fill(oval(x, y, 11, 11, 24), PAPER_FILL, 1);
  const rim = oval(x, y, 12, 12, 36);
  for (let i = 0; i < 36; i += 6) pen.hair(rim.slice(i, i + 4), 0.6, t.ink, FAR * 0.35);
  // The halo: a thin bright ring with a faint warm inner edge, broken where it fades.
  const ring = oval(x, y, halo, halo, 72);
  for (let i = 0; i < 72; i += 9) {
    const arc = ring.slice(i, i + 7);
    pen.hair(arc, 1.4, PAPER_FILL, 0.55);
    pen.hair(arc.map((p) => pt(x + (p.x - x) * 0.975, y + (p.y - y) * 0.975)), 0.6, '#e7b98f', 0.25);
  }
  for (const side of [-1, 1] as const) {
    const sx = x + side * (halo + 2);
    glow(t, sx, y, 9, 13, '#fffbe8', 0.9);
    // Red on the side towards the sun, blue-white beyond.
    glow(t, sx - side * 3, y, 3, 9, '#e99a7a', 0.45);
    glow(t, sx + side * 3, y, 3, 9, '#a9c8e8', 0.4);
    pen.hair([pt(sx + side * 5, y), pt(sx + side * 26, y + 0.3)], 1.2, PAPER_FILL, 0.5);
  }
}

/**
 * One roll of stratocumulus: a long, flat-bottomed lump of soft white
 * cloud, greyed underneath, its top in a few low billows, its base inked in
 * broken strokes; the lee end (right) torn away by the wind into streamers.
 */
export function rollCloud(t: Draw, x: number, y: number, w: number, h: number): void {
  const { pen } = t;
  const n = Math.max(3, Math.round(w / (h * 1.1)));
  for (let i = 0; i < n; i++) {
    const u = (i + 0.5) / n;
    // Fuller at the windward end, thinning towards the torn lee end.
    const env = Math.sin(Math.PI * Math.min(1, u * 1.25)) ** 0.5 * (1 - 0.35 * u);
    const px = x - w / 2 + w * u + pen.jitter(h * 0.2);
    glow(t, px, y + h * 0.15, w / n * 1.3, h * 0.6 * (0.6 + env), CLOUD_SHADE, 0.3);
    glow(t, px - h * 0.2, y - h * 0.3 * env, w / n * 1.1, h * 0.55 * (0.5 + env), CLOUD, 0.85);
    if (env > 0.5 && pen.rng() < 0.7) pen.hair(oval(px - h * 0.2, y - h * 0.3 * env, h * 0.8 * env + 2, h * 0.5 * env + 1, 18).slice(10, 16), 0.45, t.ink, FAR * 0.28);
  }
  glow(t, x - w * 0.1, y + h * 0.45, w * 0.45, h * 0.2, CLOUD_DEEP, 0.22);
  for (let k = 0; k < 3; k++) {
    const sx = x - w * 0.45 + pen.rng() * w * 0.3;
    const len = w * (0.25 + pen.rng() * 0.3);
    pen.hair([pt(sx, y + h * 0.5), pt(sx + len, y + h * 0.48 + pen.jitter(0.4))], 0.4, t.ink, FAR * 0.25);
  }
  streamers(t, x + w * 0.4, y, w * 0.6, h);
}

/** The torn lee end of a cloud: fine streaks and thin veils drawn out downwind (to the right), drooping a little. */
export function streamers(t: Draw, x: number, y: number, len: number, h: number): void {
  const { pen } = t;
  for (let k = 0; k < 6; k++) {
    const sy = y + pen.jitter(h * 0.4);
    const sx = x - len * 0.15 + pen.jitter(len * 0.1);
    const l = len * (0.4 + pen.rng() * 0.6);
    glow(t, sx + l * 0.45, sy + 1, l * 0.5, 1.6 + h * 0.08, CLOUD, 0.6);
    pen.hair(bezier(pt(sx, sy), pt(sx + l * 0.5, sy - 0.6), pt(sx + l, sy + 1.5 + pen.jitter(1.5)), 8), 0.35, t.ink, FAR * 0.18);
  }
}

/** A street of stratocumulus: rolls laid end to end along the wind from x0 to x1, a gap of blue between each. */
export function cloudStreet(t: Draw, x0: number, x1: number, y: number, h: number, tilt = 0): void {
  const { pen } = t;
  let x = x0;
  while (x < x1) {
    const w = h * (3 + pen.rng() * 8);
    rollCloud(t, x + w / 2, y + tilt * (x - x0) + pen.jitter(h * 0.4), w, h * (0.7 + pen.rng() * 0.5));
    x += w * (1.5 + pen.rng() * 1.3);
  }
}

/**
 * A lenticular cloud standing in the wind over the hills: smooth lenses
 * stacked like plates, each crisp-edged, pale above and greyed beneath, the
 * stack narrowing upwards.
 */
export function lenticular(t: Draw, x: number, y: number, w: number, h: number, stack: number): void {
  const { pen } = t;
  for (let i = 0; i < stack; i++) {
    const cx = x + i * w * 0.04;
    const cy = y - i * h * 0.75;
    const hw = (w / 2) * (1 - i * 0.18);
    const top = bezier(pt(cx - hw, cy), pt(cx - hw * 0.1, cy - h * 1.2), pt(cx + hw, cy + h * 0.05), 16);
    const bot = bezier(pt(cx + hw, cy + h * 0.05), pt(cx + hw * 0.05, cy + h * 0.55), pt(cx - hw, cy), 16);
    const lens: Pt[] = [...top, ...bot.slice(1)];
    pen.fill(lens, PAPER_FILL, 0.75);
    pen.fill(lens, CLOUD, 0.6);
    pen.clipped(lens, () => {
      pen.fill(bot.map((p) => pt(p.x, p.y - h * 0.35)).concat([...bot].reverse()), CLOUD_SHADE, 0.45);
      glow(t, cx - hw * 0.2, cy - h * 0.35, hw * 0.6, h * 0.3, '#ffffff', 0.7);
    });
    pen.hair(top.slice(2, -1), 0.5, t.ink, FAR * 0.4);
    pen.hair(bot.slice(1, -2), 0.4, t.ink, FAR * 0.25);
  }
}

/**
 * A gust drawn as an illustrator draws wind: a long, fine, gently waving
 * line ending in a loose curl. `curl` 1 rolls it over the top, -1 under.
 */
export function gustLine(t: Draw, x: number, y: number, len: number, curl: 1 | -1 = 1, alpha = 1): void {
  const { pen } = t;
  const line: Pt[] = [];
  for (let k = 0; k <= 16; k++) {
    const u = k / 16;
    line.push(pt(x + len * u, y + Math.sin(u * Math.PI * 2 + 0.6) * 1.6));
  }
  const end = line[line.length - 1]!;
  // The curl: round a circle sitting on the line's end, tightening as it goes.
  const r = 3 + len * 0.03;
  const cy = end.y - curl * r;
  for (let k = 1; k <= 12; k++) {
    const a = curl * (Math.PI / 2 - (k / 12) * Math.PI * 1.6);
    const rr = r * (1 - k / 20);
    line.push(pt(end.x + Math.cos(a) * rr, cy + Math.sin(a) * rr));
  }
  pen.hair(line, 0.55, t.ink, FAR * 0.32 * alpha);
  pen.hair(line.slice(2, 12).map((p) => pt(p.x, p.y - 1.2)), 0.9, PAPER_FILL, 0.5 * alpha);
}
