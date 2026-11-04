import { type Draw } from '../../../src/art/kit';
import { createRng } from '../../../src/logic/rng';
import { ramp, VIDEO } from '../short';
import { BITE_AT, BURST_AT, CUT_HOME, CUT_OTHER, CUT_SAD, CUT_TOP, frozen, MIGRATION_AT, REGROW, SO_AT, wrap } from './story';

/** Effects: the flash, stone chips and dust thrown by the strike, feathers hanging in the freeze, sparkles, a tumbleweed. */

/** A white flash over the whole frame (screen space). */
export function flashOver(ctx: CanvasRenderingContext2D, amount: number): void {
  if (amount <= 0.01) return;
  ctx.save();
  ctx.fillStyle = `rgba(255,248,230,${Math.min(1, amount) * 0.8})`;
  ctx.fillRect(0, 0, VIDEO.width, VIDEO.height);
  ctx.restore();
}

/** Clock time as the thrown things feel it: fast, then almost still on the freeze. */
const flight = (u: number): number => {
  const a = u - BURST_AT;
  const held = Math.max(0, u - (BITE_AT + 0.6));
  return a - 0.93 * held;
};

/** Where the rock broke when the head came out of it. */
const CHIP_FROM = { x: 930, y: 690 };

/** Dust, then chips of stone thrown up by the head. */
export function chips(d: Draw, t: number): void {
  const u = wrap(t);
  if (u < BURST_AT || u >= CUT_OTHER) return;
  const tau = flight(u);
  const { ctx } = d.pen;
  const rng = createRng(77);
  ctx.save();
  for (let i = 0; i < 12; i++) {
    const a = -Math.PI / 2 + (rng() - 0.5) * 2.6;
    const v = 200 + rng() * 300;
    const x = CHIP_FROM.x + Math.cos(a) * v * tau * 0.8;
    const y = CHIP_FROM.y + 60 + Math.sin(a) * v * tau * 0.5;
    const r = 70 + tau * 160 + rng() * 60;
    const g = ctx.createRadialGradient(x, y, 4, x, y, r);
    const alpha = 0.16 * (1 - Math.min(1, tau / 1.2));
    g.addColorStop(0, `rgba(226,212,184,${alpha})`);
    g.addColorStop(1, 'rgba(226,212,184,0)');
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }
  ctx.restore();
  for (let i = 0; i < 20; i++) {
    const a = -Math.PI / 2 + (rng() - 0.5) * 2.6;
    const v = 340 + rng() * 620;
    const x = CHIP_FROM.x + Math.cos(a) * v * tau + (rng() - 0.5) * 150;
    const y = CHIP_FROM.y + Math.sin(a) * v * tau + 720 * tau * tau;
    const r = 5 + rng() * 15;
    const spin = tau * (4 + rng() * 6);
    const pts = Array.from({ length: 5 }, (_, j) => ({ x: x + Math.cos(spin + j * 1.3) * r * (j % 2 ? 0.62 : 1.1), y: y + Math.sin(spin + j * 1.3) * r * (j % 2 ? 0.62 : 1.1) }));
    d.pen.fill(pts, i % 3 === 0 ? '#e5dcc6' : i % 3 === 1 ? '#a89a82' : '#7a6c58', 0.96);
    d.pen.stroke([...pts, pts[0]!], 1.5, d.ink, 0.7, false);
  }
}

/** Loose feathers knocked from the bird, hanging in the air on the freeze. */
export function feathers(d: Draw, t: number, from: { readonly x: number; readonly y: number }): void {
  const u = wrap(t);
  if (u < BITE_AT + 0.02 || u >= CUT_OTHER) return;
  const tau = (flight(u) - (BITE_AT - BURST_AT)) * 1.1;
  const rng = createRng(12);
  for (let i = 0; i < 12; i++) {
    const a = rng() * Math.PI * 2;
    const v = 170 + rng() * 300;
    const ease = 1 - Math.exp(-tau * 3.4);
    const x = from.x + Math.cos(a) * v * ease + Math.sin(tau * 5 + i) * 10;
    const y = from.y + Math.sin(a) * v * ease * 0.8 + 60 * tau;
    const ang = tau * (2 + rng() * 3) + i;
    const c = Math.cos(ang);
    const s = Math.sin(ang);
    const len = 22 + rng() * 14;
    const tip = { x: x + c * len, y: y + s * len };
    d.pen.stroke([{ x: x - c * len, y: y - s * len }, { x: x - s * 6, y: y + c * 6 }, tip], 11, i % 3 ? '#8d7e4c' : '#e2d5ac', 0.92, false);
    d.pen.hair([{ x: x - c * len * 1.2, y: y - s * len * 1.2 }, tip], 1.4, d.ink, 0.6);
  }
}

/** Slow motes of dust while the picture is held. */
export function motes(d: Draw, t: number): void {
  const f = frozen(t);
  if (f < 0.02) return;
  const u = wrap(t);
  const rng = createRng(40);
  for (let i = 0; i < 26; i++) {
    const x = rng() * 1100 + Math.sin(u * 0.6 + i) * 14;
    const y = 200 + rng() * 1000 - u * 6;
    d.pen.dot(x, y, 1.5 + rng() * 3.5, '#f4ead0', 0.5 * f * rng());
  }
}

/** Far off over the ridges, the others still on their long way (screen space). */
export function flock(d: Draw, t: number): void {
  const u = wrap(t);
  const show = ramp(u, MIGRATION_AT - 0.8, MIGRATION_AT - 0.3) * (1 - ramp(u, CUT_TOP - 0.1, CUT_TOP));
  if (show <= 0) return;
  const rng = createRng(19);
  for (let i = 0; i < 9; i++) {
    const x = 960 - (u - 5.4) * 90 + i * 34 - Math.abs(i - 4) * 6 + rng() * 10;
    const y = 150 + Math.abs(i - 4) * 16 + rng() * 10;
    const wing = 5 + 3.4 * Math.sin(u * 13 + i * 1.7);
    d.pen.hair([{ x: x - 11, y: y - wing }, { x, y }, { x: x + 11, y: y - wing }], 3, '#4a3a42', 0.8 * show);
  }
}

/** Little four-point sparkles round the regrowing lure. */
export function sparkles(d: Draw, t: number, at: { readonly x: number; readonly y: number }): void {
  const u = wrap(t);
  if (u < REGROW[0] || u >= CUT_HOME) return;
  const p = (u - REGROW[0]) / (REGROW[1] - REGROW[0]);
  for (let i = 0; i < 7; i++) {
    const life = (p * 1.6 + i * 0.17) % 1;
    const x = at.x + Math.cos(i * 2.4) * (90 + 22 * i);
    const y = at.y + Math.sin(i * 1.9) * 66 - 30 - life * 24;
    const r = 24 * Math.sin(life * Math.PI);
    d.pen.hair([{ x: x - r, y }, { x: x + r, y }], 3.4, '#fff4c8', 0.95);
    d.pen.hair([{ x, y: y - r }, { x, y: y + r }], 3.4, '#fff4c8', 0.95);
  }
}

/** The tumbleweed that rolls through the sad shot, and its rolling. */
export function tumbleweed(d: Draw, t: number): void {
  const u = wrap(t);
  const from = CUT_SAD + 0.2;
  const to = SO_AT + 0.25;
  if (u < from || u > to) return;
  const p = (u - from) / (to - from);
  const x = 1190 - 1320 * p;
  const y = 846 - 20 * Math.abs(Math.sin(p * 11));
  const spin = -x / 30;
  const rng = createRng(5);
  for (let i = 0; i < 26; i++) {
    const a = spin + rng() * Math.PI * 2;
    const r = 34 + rng() * 26;
    const pts = Array.from({ length: 7 }, (_, j) => ({ x: x + Math.cos(a + j * 0.9) * r * (0.3 + (j % 3) * 0.33), y: y + Math.sin(a + j * 0.9) * r * (0.3 + (j % 3) * 0.33) }));
    d.pen.hair(pts, 3, i % 2 ? '#4f3a26' : '#8d6e46', 0.95);
  }
}

