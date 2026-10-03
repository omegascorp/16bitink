import type { BirdId } from '../logic/birds';
import { ellipse, INK, Pen, type Pt } from './pen';
import { ART_RES } from './propArt';

/**
 * Birds in profile, facing right, in pen and a little wash. Four frames each:
 * wings up, level, down (a flap cycle) and folded back for a plunge dive.
 */
export const BIRD_TEX = { w: 160, h: 120 } as const;
/** A bird of game size R is drawn at scale R / BIRD_RADIUS. */
export const BIRD_RADIUS = 40;
export const BIRD_FRAMES = 4;
export const DIVE_FRAME = 3;

const PAPER_FILL = '#fffaf0';

interface Look {
  readonly body: string;
  readonly back: string;
  readonly wing: string;
  readonly tip?: string;
  readonly cap?: string;
  readonly beak: string;
  readonly beakLen: number;
  readonly bodyLen: number;
  readonly bodyH: number;
  readonly wingLen: number;
  readonly tail: 'fork' | 'fan' | 'point';
  readonly pouch?: boolean;
}

const LOOKS: Readonly<Record<Exclude<BirdId, 'dragonfly'>, Look>> = {
  gull: { body: PAPER_FILL, back: '#9aa3ad', wing: '#a9b1ba', tip: '#2b2a30', beak: '#e2b53a', beakLen: 14, bodyLen: 34, bodyH: 12, wingLen: 46, tail: 'fan' },
  tern: { body: PAPER_FILL, back: '#c3c8cf', wing: '#c9ced5', tip: '#55565c', cap: '#24232a', beak: '#d0452f', beakLen: 15, bodyLen: 30, bodyH: 9, wingLen: 50, tail: 'fork' },
  pelican: { body: '#ddd5c8', back: '#8a8070', wing: '#9a907f', tip: '#3a352e', beak: '#d9a441', beakLen: 34, bodyLen: 38, bodyH: 15, wingLen: 50, tail: 'fan', pouch: true },
  gannet: { body: PAPER_FILL, back: '#e6e2d6', wing: '#ece8de', tip: '#24232a', cap: '#e8d488', beak: '#8e9aa6', beakLen: 18, bodyLen: 36, bodyH: 11, wingLen: 52, tail: 'point' },
};

function bez(p0: Pt, c: Pt, p1: Pt, n = 10): Pt[] {
  return Array.from({ length: n + 1 }, (_, i) => {
    const t = i / n;
    const u = 1 - t;
    return { x: u * u * p0.x + 2 * u * t * c.x + t * t * p1.x, y: u * u * p0.y + 2 * u * t * c.y + t * t * p1.y };
  });
}

/** Wing angle per frame, radians above "straight back": up, level, down. */
const WING_ANGLE = [1.25, 0.15, -0.95] as const;

function wing(pen: Pen, P: (x: number, y: number) => Pt, look: Look, angle: number, near: boolean): void {
  const s = ART_RES;
  const shoulder = { x: 84, y: 56 };
  const root = { x: 66, y: 60 };
  const len = look.wingLen * (near ? 1 : 0.8);
  const tip = { x: shoulder.x - Math.cos(angle) * len, y: shoulder.y - Math.sin(angle) * len };
  // Leading edge bows forward; the trailing edge comes back in a few feather points.
  const lead = bez(P(shoulder.x, shoulder.y), P((shoulder.x + tip.x) / 2 + Math.sin(angle) * 8 + 4, (shoulder.y + tip.y) / 2 - Math.cos(angle) * 8), P(tip.x, tip.y));
  const trail: Pt[] = [];
  for (let i = 1; i <= 5; i++) {
    const f = i / 5;
    const x = tip.x + (root.x - tip.x) * f;
    const y = tip.y + (root.y - tip.y) * f;
    trail.push(P(x + Math.sin(angle) * 3, y + Math.cos(angle) * 3), P(x + (root.x - tip.x) * 0.06, y + (root.y - tip.y) * 0.06));
  }
  const shape = [...lead, ...trail];
  pen.fill(shape, PAPER_FILL, near ? 1 : 0.8);
  pen.fill(shape, look.wing, near ? 0.85 : 0.6);
  if (look.tip) {
    // Dark wingtip: the outer third of the wing.
    pen.clipped(shape, () => pen.fill(ellipse(tip.x * s, tip.y * s, len * 0.38 * s, len * 0.38 * s, 14), look.tip!, 0.85));
  }
  pen.stroke([...shape, shape[0]!], (near ? 1.2 : 0.9) * s, INK, near ? 1 : 0.7, false);
}

function foldedWing(pen: Pen, P: (x: number, y: number) => Pt, look: Look): void {
  const s = ART_RES;
  const shape = [P(88, 54), ...bez(P(88, 54), P(60, 48), P(28, 58)), P(30, 61), ...bez(P(30, 61), P(62, 62), P(86, 62))];
  pen.fill(shape, PAPER_FILL, 1);
  pen.fill(shape, look.wing, 0.9);
  if (look.tip) pen.fill([P(46, 55), P(28, 58), P(30, 61), P(48, 61)], look.tip, 0.85);
  pen.stroke([...shape, shape[0]!], 1.1 * s, INK, 1, false);
}

function tail(pen: Pen, P: (x: number, y: number) => Pt, look: Look, back: number): void {
  const s = ART_RES;
  const shape = look.tail === 'fork'
    ? [P(back + 4, 57), P(back - 26, 50), P(back - 12, 60), P(back - 28, 70), P(back + 4, 63)]
    : look.tail === 'point'
    ? [P(back + 4, 57), P(back - 18, 60), P(back + 4, 64)]
    : [P(back + 4, 56), ...bez(P(back - 10, 54), P(back - 18, 60), P(back - 10, 66), 6), P(back + 4, 64)];
  pen.fill(shape, look.body, 1);
  pen.fill(shape, look.back, 0.4);
  pen.stroke([...shape, shape[0]!], 1 * s, INK, 1, false);
}

function drawSeabird(pen: Pen, look: Look, frame: number): void {
  const s = ART_RES;
  const P = (x: number, y: number): Pt => ({ x: x * s, y: y * s });
  const cx = 80;
  const cy = 60;
  const half = look.bodyLen / 2;
  if (frame !== DIVE_FRAME) wing(pen, P, look, WING_ANGLE[frame]! + 0.15, false);
  tail(pen, P, look, cx - half);
  // Body: a tapered spindle, darker along the back.
  const body = [
    ...bez(P(cx - half - 4, cy), P(cx, cy - look.bodyH * 1.25), P(cx + half, cy - look.bodyH * 0.6)),
    ...bez(P(cx + half, cy + look.bodyH * 0.5), P(cx, cy + look.bodyH * 1.2), P(cx - half - 4, cy + 2)),
  ];
  pen.fill(body, look.body, 1);
  pen.clipped(body, () => pen.fill([P(cx - half - 6, cy - 20), P(cx + half + 4, cy - 20), P(cx + half + 4, cy - 2), P(cx - half - 6, cy - 1)], look.back, 0.55));
  pen.stroke([...body, body[0]!], 1.3 * s, INK, 1, false);
  // Head with cap, eye and beak.
  const hx = cx + half + 5;
  const hy = cy - look.bodyH * 0.55;
  const hr = look.bodyH * 0.72;
  pen.fill(ellipse(hx * s, hy * s, hr * s, hr * 0.92 * s, 16), look.body, 1);
  if (look.cap) pen.clipped(ellipse(hx * s, hy * s, hr * s, hr * 0.92 * s, 16), () => pen.fill([P(hx - hr - 2, hy - hr - 2), P(hx + hr + 2, hy - hr - 2), P(hx + hr + 2, hy - 1), P(hx - hr - 2, hy + 2)], look.cap!, 0.9));
  const beakBase = hx + hr * 0.7;
  const beak = [P(beakBase, hy - 2.5), P(beakBase + look.beakLen, hy + 1), P(beakBase, hy + 3)];
  if (look.pouch) {
    const pouch = [P(beakBase, hy + 2), ...bez(P(beakBase + 4, hy + 12), P(beakBase + look.beakLen * 0.5, hy + 14), P(beakBase + look.beakLen - 2, hy + 2), 8)];
    pen.fill(pouch, look.beak, 0.55);
    pen.stroke([...pouch, pouch[0]!], 0.9 * s, INK, 1, false);
  }
  pen.fill(beak, look.beak, 1);
  pen.stroke([...beak, beak[0]!], 1 * s, INK, 1, false);
  pen.stroke(ellipse(hx * s, hy * s, hr * s, hr * 0.92 * s, 16).concat([P(hx + hr, hy)]), 1.2 * s, INK, 1, false);
  pen.dot((hx + hr * 0.25) * s, (hy - hr * 0.15) * s, 1.6 * s, INK);
  if (frame === DIVE_FRAME) foldedWing(pen, P, look);
  else wing(pen, P, look, WING_ANGLE[frame]!, true);
}

/** Dragonfly: four glassy wings that blur between two positions, a long jointed tail. */
function drawDragonfly(pen: Pen, frame: number): void {
  const s = ART_RES;
  const P = (x: number, y: number): Pt => ({ x: x * s, y: y * s });
  const teal = '#2f8a8a';
  const up = frame % 2 === 0;
  for (const [dx, len] of [[0, 46], [-10, 42]] as const) {
    const tipY = up ? 30 : 74;
    const w = [P(84 + dx, 58), ...bez(P(84 + dx, 58), P(70 + dx, (58 + tipY) / 2 - 6), P(84 + dx - len * 0.3, tipY), 8), ...bez(P(84 + dx - len * 0.3, tipY), P(92 + dx, (58 + tipY) / 2), P(88 + dx, 60), 8)];
    pen.fill(w, '#d9eef0', 0.55);
    pen.hair([...w, w[0]!], 0.7 * s, INK, 0.7);
  }
  // Abdomen: a row of segments trailing back.
  for (let i = 0; i < 9; i++) {
    const x = 74 - i * 5.2;
    pen.fill(ellipse(x * s, 60 * s, 3.2 * s, 2.3 * s, 10), teal, 0.9);
    pen.hair(ellipse(x * s, 60 * s, 3.2 * s, 2.3 * s, 10).concat([P(x + 3.2, 60)]), 0.5 * s, INK, 0.8);
  }
  pen.fill(ellipse(82 * s, 59 * s, 7 * s, 5 * s, 14), teal, 0.95);
  pen.stroke(ellipse(82 * s, 59 * s, 7 * s, 5 * s, 14).concat([P(89, 59)]), 0.9 * s, INK, 1, false);
  pen.fill(ellipse(91 * s, 58 * s, 4.5 * s, 4.5 * s, 12), '#1d5f6a', 1);
  pen.stroke(ellipse(91 * s, 58 * s, 4.5 * s, 4.5 * s, 12).concat([P(95.5, 58)]), 0.8 * s, INK, 1, false);
  pen.dot(92.5 * s, 56.5 * s, 1.2 * s, PAPER_FILL);
}

export function drawBird(ctx: CanvasRenderingContext2D, kind: BirdId, frame: number, seed: number): void {
  const pen = new Pen(ctx, seed, 0.45);
  if (kind === 'dragonfly') drawDragonfly(pen, frame);
  else drawSeabird(pen, LOOKS[kind], frame);
}
