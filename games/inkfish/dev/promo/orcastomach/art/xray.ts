import { INK, type Pt } from '../../../../src/art/pen';
import { spline } from '../../kraken/whale';
import type { Placed } from '../../seal/story';
import { porpoiseOutline } from './porpoise';

/**
 * The x-ray window: a pale panel with only ink outlines inside (no flesh, no
 * colour but ink on pale), the outlines of a seal and a porpoise, and the
 * stomach's own outline. A seal's outline is a torpedo with a rounded head,
 * a whiskered snout, two flippers and a tail, in the same units as the porpoise.
 */

const LINE = 'rgba(20,52,70,0.9)';

/** A plump seal in the classic curve: head lifted at one end, hind flippers lifted at the other, so it can't pass for a fish. */
const SEAL_BODY: readonly Pt[] = [
  { x: 160, y: -84 }, { x: 150, y: -108 }, { x: 122, y: -122 }, { x: 92, y: -112 }, { x: 74, y: -78 }, { x: 40, y: -38 }, { x: -20, y: -22 }, { x: -82, y: -30 }, { x: -130, y: -56 },
  { x: -152, y: -40 }, { x: -116, y: 8 }, { x: -50, y: 38 }, { x: 22, y: 44 }, { x: 86, y: 24 }, { x: 118, y: -18 }, { x: 134, y: -60 },
];

function line(ctx: CanvasRenderingContext2D, pts: readonly (readonly [number, number])[]): void {
  pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
}

/** A seal's pale outline in its own units (310 long), placed by `p`: hind flippers up, a fore flipper, spots, eye and whiskers. */
export function sealOutline(ctx: CanvasRenderingContext2D, p: Placed, colour: string, width: number): void {
  const k = p.len / 310;
  ctx.save();
  ctx.translate(p.x, p.y + 0.12 * p.len);
  ctx.scale(p.face, 1);
  ctx.rotate(p.rot);
  ctx.scale(k, k);
  ctx.strokeStyle = colour;
  ctx.lineWidth = width / k;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.beginPath();
  spline([...SEAL_BODY, SEAL_BODY[0]!], 5).forEach((q, i) => (i ? ctx.lineTo(q.x, q.y) : ctx.moveTo(q.x, q.y)));
  ctx.stroke();
  ctx.beginPath();
  line(ctx, [[-132, -56], [-176, -104], [-186, -66], [-150, -42]]);
  line(ctx, [[76, 28], [62, 78], [24, 72], [30, 44]]);
  // Whiskers.
  line(ctx, [[158, -86], [196, -92]]);
  line(ctx, [[156, -80], [192, -70]]);
  ctx.stroke();
  // The eye and three spots, filled, so it reads at phone size.
  ctx.fillStyle = colour;
  for (const [x, y, r] of [[124, -96, 7], [20, 4, 8], [-36, -2, 6], [-10, 22, 6]] as const) {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

export interface Slot {
  readonly kind: 'seal' | 'porpoise';
  readonly x: number;
  readonly y: number;
  readonly rot: number;
}

export interface Window {
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
}

const COLS = 7;
const ROWS = 4;
/** The animals overlap their cells a touch, the way a full stomach would. */
export const OUTLINE_LEN = 122;

/**
 * The 27 places in the window, in four rows: two of porpoises (7 + 6) over two
 * of seals (7 + 7). The count alternates (seals are the even outlines), so all
 * four rows fill together as the counters climb.
 */
export function slotsFor(win: Window, total: number): Slot[] {
  const [dx, dy] = [(win.w - 100) / COLS, (win.h - 40) / ROWS];
  const place = (row: number, col: number, kind: Slot['kind'], i: number): Slot => {
    const wob = Math.sin(i * 12.9898) * 43758.5453;
    const j = wob - Math.floor(wob);
    return {
      kind,
      x: win.x - (dx * (COLS - 1)) / 2 + col * dx + (row % 2 ? 10 : -10) + (j - 0.5) * 8,
      y: win.y - (dy * (ROWS - 1)) / 2 + row * dy + (kind === 'porpoise' ? 20 : 6) + (((j * 7) % 1) - 0.5) * 8,
      rot: (((j * 13) % 1) - 0.5) * 0.3,
    };
  };
  return Array.from({ length: total }, (_, i) => {
    const n = Math.floor(i / 2);
    if (i % 2 === 0) return place(n < 7 ? 2 : 3, n % 7, 'seal', i);
    return place(n < 7 ? 0 : 1, n % 7, 'porpoise', i);
  });
}

/** An ease-out with a little overshoot for each outline popping in. */
const pop = (u: number): number => (u <= 0 ? 0 : u >= 1 ? 1 : 1 + 2.2 * (u - 1) ** 3 + 1.2 * (u - 1) ** 2);

function panel(ctx: CanvasRenderingContext2D, win: Window): void {
  ctx.beginPath();
  ctx.roundRect(win.x - win.w / 2, win.y - win.h / 2, win.w, win.h, 170);
}

/** The pale panel and the first `count` outlines, ink only (a fraction pops the next one in). */
export function drawWindow(ctx: CanvasRenderingContext2D, win: Window, open: number, count: number, t: number): void {
  if (open <= 0.01) return;
  ctx.save();
  ctx.translate(win.x, win.y);
  ctx.scale(0.4 + 0.6 * open, open);
  ctx.translate(-win.x, -win.y);
  panel(ctx, win);
  const g = ctx.createRadialGradient(win.x, win.y, 40, win.x, win.y, win.w * 0.62);
  g.addColorStop(0, 'rgba(240,252,255,0.97)');
  g.addColorStop(0.75, 'rgba(198,232,242,0.96)');
  g.addColorStop(1, 'rgba(146,198,218,0.96)');
  ctx.fillStyle = g;
  ctx.shadowColor = 'rgba(190,240,255,0.8)';
  ctx.shadowBlur = 44;
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = INK;
  ctx.lineWidth = 6;
  ctx.stroke();
  ctx.clip();
  slotsFor(win, 27).forEach((s, i) => {
    const u = pop(count - i);
    if (u <= 0.01) return;
    const at = { x: s.x, y: s.y + 2 * Math.sin(t * 2 + i), len: OUTLINE_LEN * u, rot: s.rot, face: 1 as const, beat: i };
    if (s.kind === 'seal') sealOutline(ctx, at, LINE, 3.6);
    else porpoiseOutline(ctx, at, LINE, 3.6);
  });
  ctx.restore();
}
