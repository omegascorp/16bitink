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
  /** Webbed feet tucked under the tail. */
  readonly feet: string;
  /** White "mirror" spots in a dark wingtip (gulls). */
  readonly mirrors?: boolean;
  /** Red spot on the lower bill (gulls). */
  readonly gonys?: boolean;
  /** Bare dark skin from the bill to the eye (gannets). */
  readonly mask?: boolean;
}

const LOOKS: Readonly<Record<Exclude<BirdId, 'dragonfly'>, Look>> = {
  gull: {
    body: PAPER_FILL, back: '#9aa3ad', wing: '#a9b1ba', tip: '#2b2a30', beak: '#e2b53a', beakLen: 14, bodyLen: 34, bodyH: 12, wingLen: 46, tail: 'fan',
    feet: '#e0a24a', mirrors: true, gonys: true,
  },
  tern: {
    body: PAPER_FILL, back: '#c3c8cf', wing: '#c9ced5', tip: '#55565c', cap: '#24232a', beak: '#d0452f', beakLen: 15, bodyLen: 30, bodyH: 9, wingLen: 50, tail: 'fork',
    feet: '#c9402c',
  },
  pelican: {
    body: '#ddd5c8', back: '#8a8070', wing: '#9a907f', tip: '#3a352e', beak: '#d9a441', beakLen: 34, bodyLen: 38, bodyH: 15, wingLen: 50, tail: 'fan', pouch: true,
    feet: '#6e6a62',
  },
  gannet: {
    body: PAPER_FILL, back: '#e6e2d6', wing: '#ece8de', tip: '#24232a', cap: '#e8d488', beak: '#8e9aa6', beakLen: 18, bodyLen: 36, bodyH: 11, wingLen: 52, tail: 'point',
    feet: '#4a5058', mask: true,
  },
};

function bez(p0: Pt, c: Pt, p1: Pt, n = 10): Pt[] {
  return Array.from({ length: n + 1 }, (_, i) => {
    const t = i / n;
    const u = 1 - t;
    return { x: u * u * p0.x + 2 * u * t * c.x + t * t * p1.x, y: u * u * p0.y + 2 * u * t * c.y + t * t * p1.y };
  });
}

const lerp = (a: Pt, b: Pt, t: number): Pt => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });

/** Wing angle per frame, radians above "straight back": up, level, down. */
const WING_ANGLE = [1.25, 0.15, -0.95] as const;

/** Where a seabird's head sits (bird px), from its proportions. */
function headOf(look: Look): { hx: number; hy: number; hr: number } {
  const hx = 80 + look.bodyLen / 2 + 5;
  const hr = look.bodyH * 0.72;
  return { hx, hy: 60 - look.bodyH * 0.55, hr };
}

/** The beak tip, in bird px from the middle of the drawing: where a catch is held. */
export function beakTip(kind: BirdId): Pt {
  if (kind === 'dragonfly') return { x: 15, y: -2 };
  const look = LOOKS[kind];
  const { hx, hy, hr } = headOf(look);
  return { x: hx + hr * 0.7 + look.beakLen - 2 - 80, y: hy + 1.5 - 60 };
}

/** A row of little feather scallops between two points, bulging to one side. */
function scallops(pen: Pen, P: (x: number, y: number) => Pt, a: Pt, b: Pt, count: number, bulge: number, alpha: number): void {
  const s = ART_RES;
  const nx = -(b.y - a.y);
  const ny = b.x - a.x;
  const len = Math.hypot(nx, ny) || 1;
  for (let i = 0; i < count; i++) {
    const p0 = lerp(a, b, i / count);
    const p1 = lerp(a, b, (i + 1) / count);
    const mid = lerp(p0, p1, 0.5);
    pen.hair(bez(P(p0.x, p0.y), P(mid.x + (nx / len) * bulge, mid.y + (ny / len) * bulge), P(p1.x, p1.y), 4), 0.45 * s, INK, alpha);
  }
}

function wing(pen: Pen, P: (x: number, y: number) => Pt, look: Look, angle: number, near: boolean): void {
  const s = ART_RES;
  const shoulder = { x: 84, y: 56 };
  const root = { x: 66, y: 60 };
  const len = look.wingLen * (near ? 1 : 0.8);
  const tip = { x: shoulder.x - Math.cos(angle) * len, y: shoulder.y - Math.sin(angle) * len };
  // Leading edge bows forward; the trailing edge comes back in a row of feather points.
  const bow = { x: (shoulder.x + tip.x) / 2 + Math.sin(angle) * 8 + 4, y: (shoulder.y + tip.y) / 2 - Math.cos(angle) * 8 };
  const lead = bez(P(shoulder.x, shoulder.y), P(bow.x, bow.y), P(tip.x, tip.y));
  const trail: Pt[] = [];
  const feathers: Pt[] = [];
  for (let i = 1; i <= 7; i++) {
    const f = i / 7;
    const x = tip.x + (root.x - tip.x) * f;
    const y = tip.y + (root.y - tip.y) * f;
    feathers.push({ x: x + Math.sin(angle) * 3, y: y + Math.cos(angle) * 3 });
    trail.push(P(x + Math.sin(angle) * 3, y + Math.cos(angle) * 3), P(x + (root.x - tip.x) * 0.045, y + (root.y - tip.y) * 0.045));
  }
  const shape = [...lead, ...trail];
  pen.fill(shape, PAPER_FILL, near ? 1 : 0.8);
  pen.fill(shape, look.wing, near ? 0.85 : 0.6);
  pen.clipped(shape, () => {
    if (look.tip) {
      // Dark wingtip: the outer third of the wing.
      pen.fill(ellipse(tip.x * s, tip.y * s, len * 0.38 * s, len * 0.38 * s, 14), look.tip, 0.85);
      if (look.mirrors) for (const f of [0.12, 0.22]) {
        const m = lerp(tip, root, f);
        pen.fill(ellipse((m.x + Math.sin(angle) * 1) * s, (m.y + Math.cos(angle) * 1) * s, 1.6 * s, 1.6 * s, 8), PAPER_FILL, 0.95);
      }
    }
    // Shade along the leading edge.
    const inner = lead.map((p) => ({ x: p.x + Math.sin(angle) * 3 * s, y: p.y + Math.cos(angle) * 3 * s }));
    pen.hair(inner, 0.5 * s, INK, 0.35);
  });
  // Two rows of coverts along the arm, then the long flight feathers fanning to the trailing edge.
  const wrist = lerp(shoulder, tip, 0.45);
  const elbow = lerp(shoulder, root, 0.5);
  for (const k of [0.32, 0.55]) {
    const r0 = lerp(shoulder, root, k * 0.4);
    const r1 = lerp(wrist, feathers[2]!, k);
    scallops(pen, P, r1, r0, 4, near ? 1.8 : 1.2, near ? 0.55 : 0.35);
  }
  for (let i = 0; i < feathers.length - 1; i++) {
    const from = i < 3 ? lerp(wrist, tip, 0.1 * i) : lerp(wrist, elbow, (i - 2) / 5);
    const to = feathers[i]!;
    pen.hair([P(from.x, from.y), P(to.x, to.y)], 0.45 * s, INK, near ? 0.5 : 0.3);
  }
  pen.stroke([...shape, shape[0]!], (near ? 1.2 : 0.9) * s, INK, near ? 1 : 0.7, false);
}

function foldedWing(pen: Pen, P: (x: number, y: number) => Pt, look: Look): void {
  const s = ART_RES;
  const shape = [P(88, 54), ...bez(P(88, 54), P(60, 48), P(28, 58)), P(30, 61), ...bez(P(30, 61), P(62, 62), P(86, 62))];
  pen.fill(shape, PAPER_FILL, 1);
  pen.fill(shape, look.wing, 0.9);
  if (look.tip) pen.fill([P(46, 55), P(28, 58), P(30, 61), P(48, 61)], look.tip, 0.85);
  // Coverts, then the long primaries crossing back over the tail.
  scallops(pen, P, { x: 82, y: 56 }, { x: 60, y: 54 }, 4, 1.5, 0.55);
  for (const dy of [0, 2.2, 4.4]) pen.hair(bez(P(70, 56 + dy * 0.6), P(52, 55 + dy), P(32, 58.5 + dy * 0.4), 6), 0.45 * s, INK, 0.5);
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
  // Feather shafts fanning from the rump.
  const tips = look.tail === 'fork' ? [[-24, 51], [-14, 59], [-26, 69]] : look.tail === 'point' ? [[-15, 60]] : [[-15, 56], [-17, 60], [-15, 64]];
  for (const [tx, ty] of tips) pen.hair([P(back + 2, 60), P(back + tx!, ty!)], 0.45 * s, INK, 0.5);
  pen.stroke([...shape, shape[0]!], 1 * s, INK, 1, false);
}

/** Webbed feet tucked back under the tail in flight. */
function feet(pen: Pen, P: (x: number, y: number) => Pt, look: Look, back: number): void {
  const s = ART_RES;
  for (const dx of [0, 4]) {
    const knee = { x: back + 14 + dx, y: 64 };
    const ankle = { x: back + 4 + dx, y: 67 };
    pen.stroke([P(knee.x, knee.y), P(ankle.x, ankle.y)], 1 * s, INK, 0.9, false);
    const web = [P(ankle.x, ankle.y - 1.5), P(ankle.x - 7, ankle.y - 1), P(ankle.x - 6, ankle.y + 2.5), P(ankle.x, ankle.y + 1.5)];
    pen.fill(web, look.feet, 0.9);
    pen.hair([...web, web[0]!], 0.5 * s, INK, 0.9);
  }
}

/** Points round the head between two angles (0 = straight ahead, down is positive). */
function headArc(hx: number, hy: number, hr: number, from: number, to: number): Pt[] {
  const s = ART_RES;
  return Array.from({ length: 13 }, (_, i) => {
    const a = from + ((to - from) * i) / 12;
    return { x: (hx + Math.cos(a) * hr) * s, y: (hy + Math.sin(a) * hr * 0.92) * s };
  });
}

function drawHead(pen: Pen, P: (x: number, y: number) => Pt, look: Look): void {
  const s = ART_RES;
  const { hx, hy, hr } = headOf(look);
  // A neck blends the head into the body, so it isn't a ball stuck on the front.
  const front = 80 + look.bodyLen / 2;
  const nape = { x: hx - hr * 0.75, y: hy - hr * 0.6 };
  const throat = { x: hx - hr * 0.3, y: hy + hr * 0.88 };
  const neck = [P(front - 8, 60 - look.bodyH * 0.95), P(nape.x, nape.y), P(throat.x, throat.y), P(front - 2, 60 + look.bodyH * 0.45)];
  pen.fill(neck, look.body, 1);
  pen.clipped(neck, () => pen.fill([P(front - 10, 60 - look.bodyH * 1.2), P(nape.x + 2, nape.y - 2), P(hx, hy - 1), P(front - 8, 59)], look.back, 0.35));
  pen.stroke(bez(P(front - 8, 60 - look.bodyH * 0.95), P(front - 2, nape.y - 1), P(nape.x, nape.y), 5), 1.2 * s, INK, 1, false);
  pen.stroke(bez(P(front - 2, 60 + look.bodyH * 0.45), P(throat.x - 3, throat.y + 2), P(throat.x, throat.y), 5), 1.2 * s, INK, 1, false);
  const head = ellipse(hx * s, hy * s, hr * s, hr * 0.92 * s, 16);
  pen.fill(head, look.body, 1);
  if (look.cap) {
    // Terns wear a black cap down the nape; the gannet's is a yellow wash.
    pen.clipped(head, () => pen.fill([P(hx - hr - 2, hy - hr - 2), P(hx + hr + 2, hy - hr - 2), P(hx + hr * 0.6, hy - 1), P(hx - hr - 2, hy + hr * 0.5)], look.cap!, 0.9));
  }
  const beakBase = hx + hr * 0.7;
  const tipX = beakBase + look.beakLen;
  if (look.pouch) {
    const pouch = [P(beakBase, hy + 2), ...bez(P(beakBase + 4, hy + 12), P(beakBase + look.beakLen * 0.5, hy + 14), P(tipX - 2, hy + 2), 8)];
    pen.fill(pouch, look.beak, 0.55);
    pen.clipped(pouch, () => {
      for (let x = beakBase + 6; x < tipX - 4; x += 4) pen.hair([P(x, hy + 3), P(x - 2, hy + 13)], 0.4 * s, INK, 0.4);
    });
    pen.stroke([...pouch, pouch[0]!], 0.9 * s, INK, 1, false);
  }
  // Upper bill curving down to a little hook; lower bill under it, the gape line between.
  const upper = [P(beakBase, hy - 2.6), ...bez(P(beakBase + look.beakLen * 0.5, hy - 2), P(tipX, hy - 0.5), P(tipX - 0.5, hy + 1.8), 6), P(beakBase, hy + 0.6)];
  const lower = [P(beakBase, hy + 0.6), P(tipX - 2, hy + 1.6), P(beakBase, hy + 3.2)];
  pen.fill(lower, look.beak, 1);
  pen.fill(upper, look.beak, 1);
  if (look.gonys) pen.fill(ellipse((tipX - 4.5) * s, (hy + 2) * s, 1.3 * s, 1 * s, 8), '#c73a2c', 0.95);
  pen.stroke([...upper, ...lower.slice(1), upper[0]!], 0.9 * s, INK, 1, false);
  pen.hair([P(beakBase + 2, hy + 0.7), P(tipX - 2, hy + 1.6)], 0.5 * s, INK, 0.8);
  // Nostril slit.
  pen.hair([P(beakBase + 2.5, hy - 1.2), P(beakBase + 5, hy - 0.8)], 0.5 * s, INK, 0.7);
  if (look.mask) pen.stroke([P(beakBase + 1, hy + 0.5), P(hx + hr * 0.2, hy - hr * 0.15), P(hx - hr * 0.1, hy - hr * 0.05)], 1.2 * s, '#24232a', 0.85, false);
  // Outline only the crown, face and chin: the back of the head runs into the neck.
  pen.stroke(headArc(hx, hy, hr, -Math.PI * 0.82, Math.PI * 0.62), 1.2 * s, INK, 1, false);
  // Eye: dark, with a pale ring and a glint.
  const ex = hx + hr * 0.25;
  const ey = hy - hr * 0.15;
  pen.hair(ellipse(ex * s, ey * s, 2.4 * s, 2.4 * s, 10).concat([P(ex + 2.4, ey)]), 0.4 * s, INK, 0.5);
  pen.dot(ex * s, ey * s, 1.6 * s, INK);
  pen.dot((ex + 0.5) * s, (ey - 0.6) * s, 0.5 * s, PAPER_FILL);
}

function drawSeabird(pen: Pen, look: Look, frame: number): void {
  const s = ART_RES;
  const P = (x: number, y: number): Pt => ({ x: x * s, y: y * s });
  const cx = 80;
  const cy = 60;
  const half = look.bodyLen / 2;
  if (frame !== DIVE_FRAME) wing(pen, P, look, WING_ANGLE[frame]! + 0.15, false);
  tail(pen, P, look, cx - half);
  feet(pen, P, look, cx - half);
  // Body: a tapered spindle, darker along the back, feathered and shaded underneath.
  const body = [
    ...bez(P(cx - half - 4, cy), P(cx, cy - look.bodyH * 1.25), P(cx + half, cy - look.bodyH * 0.6)),
    ...bez(P(cx + half, cy + look.bodyH * 0.5), P(cx, cy + look.bodyH * 1.2), P(cx - half - 4, cy + 2)),
  ];
  pen.fill(body, look.body, 1);
  pen.clipped(body, () => {
    pen.fill([P(cx - half - 6, cy - 20), P(cx + half + 4, cy - 20), P(cx + half + 4, cy - 2), P(cx - half - 6, cy - 1)], look.back, 0.55);
    // Feather scallops along the back.
    for (const dy of [-look.bodyH * 0.55, -look.bodyH * 0.2]) {
      scallops(pen, P, { x: cx + half - 4, y: cy + dy }, { x: cx - half + 2, y: cy + dy + 2 }, 5, 1.4, 0.4);
    }
    // Belly contours.
    for (const k of [0.75, 0.5]) {
      pen.hair(bez(P(cx + half - 2, cy + look.bodyH * 0.45 * k), P(cx, cy + look.bodyH * 1.1 * k + 1), P(cx - half, cy + 2), 8), 0.45 * s, INK, 0.4);
    }
  });
  pen.stroke([...body, body[0]!], 1.3 * s, INK, 1, false);
  drawHead(pen, P, look);
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
