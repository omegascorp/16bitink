import { pt, type Draw } from '../kit';
import type { Pt } from '../pen';
import { dab, gleam, LIGHT, limb, lineOf, mix, paint, shapeOf, SHADOW, type Joint } from './crownElitePaint';
import { apply, mapXY, type LegPose, type MountRig, type Stance } from './crownMountRig';

/**
 * The Crown's horses, shared by the Lancer's barded warhorse and the hero's
 * riding horse: a side view facing right with the near (viewer's) legs over
 * the body and the far legs behind it in shade. Proportions follow a real
 * horse: withers 49 units up, body as long as the horse is tall, a head of
 * about 21 and a neck a little longer; forelegs knee at 14, hocks at 17,
 * sloping pasterns and hooves flat on the ground.
 *
 * Everything here is drawn in the standing pose's coordinates; the rig
 * (crownMountRig.ts) says where it goes: the body is painted under its
 * `body` map, the neck bent by `warp`, the head under `head`, and the legs
 * come already placed in the figure.
 */
export interface HorseLook {
  readonly coat: string;
  /** Lower legs, mane and tail. */
  readonly points: string;
  readonly mane: string;
  readonly hoof: string;
  /** Leg thickness (1 for a warhorse, less for a riding horse). */
  readonly build: number;
  /** How it stands at rest (crownMountRig.ts). */
  readonly pose: Stance;
  /** A white blaze down the face. */
  readonly blaze?: boolean;
}

/** Points riders and tack hang off. */
export const HORSE = {
  seat: pt(-5, -51.4),
  withers: pt(2, -53),
  bit: pt(33, -52),
  poll: pt(25.5, -73.5),
  tailHead: pt(-28, -50.6),
} as const;

/** The body and neck as one outline (the head is laid over the neck's end). */
export const TORSO_KEYS: readonly (readonly [number, number])[] = [
  [23.6, -73.4], [17, -70.4], [10.4, -64], [5, -56], [1.6, -52.4], [-4, -49.6], [-13, -49.6], [-21, -52.4],
  [-28.2, -50.6], [-32.8, -45.4], [-34.4, -38.4], [-33.6, -31.6], [-31, -26.6], [-20, -25.4], [-9, -24.4],
  [2, -24.2], [10, -25.6], [16.6, -30], [22.2, -36], [24.6, -43], [24, -51], [24.6, -58], [26, -64], [27.4, -67.6],
];

const HEAD_KEYS: readonly (readonly [number, number])[] = [
  [23.2, -71.8], [25.6, -74.4], [28.8, -73], [31.2, -68.4], [33.6, -61], [35.4, -55.4], [36.2, -52.2],
  [35.4, -49.8], [33.4, -49.6], [31.2, -50.6], [29, -55], [25.6, -59], [23.4, -63.6],
];

/** The crest: where the mane grows, from the poll back to the withers. */
export const CREST = lineOf([[24.2, -73.2], [17.4, -70.4], [10.6, -64], [5.4, -56.4], [2.4, -52.6]]);

function pointIn(poly: readonly Pt[], p: Pt): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i]!;
    const b = poly[j]!;
    if (a.y > p.y !== b.y > p.y && p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x) inside = !inside;
  }
  return inside;
}

/** Runs `draw` clipped to outside `shape`. */
function outside(d: Draw, shape: readonly Pt[], draw: () => void): void {
  const ctx = d.pen.ctx;
  ctx.save();
  ctx.beginPath();
  ctx.rect(-200, -200, 400, 400);
  shape.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
  ctx.closePath();
  ctx.clip('evenodd');
  draw();
  ctx.restore();
}

/** A hoof at the coronet `c`, turned by `tilt` (0 standing flat). */
function hoof(d: Draw, c: Pt, tilt: number, look: HorseLook): void {
  const [cs, sn] = [Math.cos(tilt), Math.sin(tilt)];
  const at = (x: number, y: number): Pt => pt(c.x + x * cs - y * sn, c.y + x * sn + y * cs);
  const shape = [at(-2.2, 0.1), at(-0.4, -0.5), at(1.5, -0.2), at(3.7, 3), at(3.5, 3.3), at(-2.7, 3.3), at(-2.8, 1.4)];
  paint(d, shape, look.hoof, { shadow: 0.55, hatch: 0, line: 0.5, gloss: true });
  d.pen.hair([at(-2.1, 0.7), at(1.8, 0.4)], 0.5, mix(look.points, '#c9b48e', 0.3), 0.7);
  gleam(d, [at(0.6, 0.6), at(2.2, 2.4)], 0.45, 0.6);
}

/**
 * How much fuller than the rig's widths each joint is drawn (top, upper,
 * mid, knee or hock, cannon ×2, fetlock, coronet): a destrier's muscled
 * forearm and gaskin, broad flat knee and hock, clean cannon, big fetlock.
 */
const FORE_W = [1.05, 1.2, 1.08, 1.1, 1, 1, 1.12, 1.08] as const;
const HIND_W = [1.1, 1.14, 1.26, 1.12, 1.04, 1, 1.12, 1.08] as const;

/** The feathering: long hair falling from the back of the fetlock over the heel of the hoof. */
function feathers(d: Draw, j: readonly Joint[], colour: string, far: boolean): void {
  const [fx, fy, fw] = j[6]!;
  const [kx, ky] = j[4]!;
  const dl = Math.hypot(fx - kx, fy - ky) || 1;
  const u = pt((fx - kx) / dl, (fy - ky) / dl);
  const back = pt(-u.y, u.x);
  const P = (s: number, b: number): [number, number] => [fx + u.x * s + back.x * b, fy + u.y * s + back.y * b];
  const shape = shapeOf([P(-3, fw * 0.3), P(-0.6, fw * 0.6), P(2, fw * 0.72), P(4.2, fw * 0.62), P(4.6, fw * 0.2), P(3, 0), P(0.4, fw * 0.1)], 4);
  paint(d, shape, colour, { shadow: far ? 0.5 : 0.6, hatch: 0, line: 0.3, lineAlpha: 0.6 });
  for (const k of [0.2, 0.45, 0.7, 0.95]) {
    const [ax, ay] = P(-2, fw * k * 0.5);
    const [bx, by] = P(4.4 + k * 0.6, fw * (0.1 + k * 0.62));
    d.pen.hair([pt(ax, ay), pt(bx, by)], 0.24, k % 0.5 ? d.ink : mix(colour, '#c9a878', 0.3), 0.5);
  }
}

/** One leg, painted, with its joints drawn in and its hoof; `belly` is how far the body has dropped over it. */
function leg(d: Draw, pose: LegPose, look: HorseLook, far: boolean, body: readonly Pt[] | null, belly: number, fore: boolean): void {
  const grow = fore ? FORE_W : HIND_W;
  const j = pose.joints.map(([x, y, w], i) => [x, y, w * look.build * grow[i]!] as Joint);
  const l = limb(j, 7);
  const coat = far ? mix(look.coat, SHADOW, 0.4) : look.coat;
  const low = far ? mix(look.points, SHADOW, 0.35) : look.points;
  const paintIt = (): void => {
    paint(d, l.shape, coat, { shadow: 0.7, hatch: far ? 0.14 : 0.2, line: 0, lit: pt(0.25, 0.4) });
    // The dark stockings from the knee or hock down, fading up into the coat.
    const knee = j[3]!;
    d.pen.clipped(l.shape, () => {
      dab(d, [pt(knee[0] - 9, knee[1] - 1), pt(knee[0] + 9, knee[1] - 1), pt(knee[0] + 9, 4), pt(knee[0] - 9, 4)], low, 0.85, 1.2);
      // The forearm's (gaskin's) muscle catches the light above the knee (hock).
      const [ux, uy] = j[1]!;
      if (!far) dab(d, shapeOf([[ux - 1, uy - 2], [ux + 2.6, uy], [knee[0] + 1.6, knee[1] - 2], [knee[0] - 0.6, knee[1] - 3]]), LIGHT, 0.2, 1.2);
      // Shadow under the belly on the leg's top.
      if (body) dab(d, [pt(knee[0] - 12, -32 + belly), pt(knee[0] + 12, -32 + belly), pt(knee[0] + 12, -20 + belly), pt(knee[0] - 12, -22 + belly)], SHADOW, far ? 0.25 : 0.32, 2.2);
    });
  };
  if (body) outside(d, body, paintIt);
  else paintIt();
  // The leg's two edges, inked from where they leave the body.
  for (const side of [l.a, l.b]) {
    const from = body ? Math.max(0, side.findIndex((p) => !pointIn(body, p)) - 1) : 0;
    d.pen.stroke(side.slice(from), far ? 0.4 : 0.5, d.ink, 0.85, false);
  }
  // Knee or hock (a flat bony plate, its point lit), the cannon's tendon, the fetlock's round.
  const [kx, ky, kw] = j[3]!;
  const [fx, fy] = j[6]!;
  const [cx1, cy1] = j[4]!;
  d.pen.hair([pt(kx - kw * 0.4, ky - 0.6), pt(kx + kw * 0.45, ky + 0.4)], 0.4, d.ink, 0.55);
  d.pen.hair([pt(kx - kw * 0.35, ky + 1.6), pt(kx + kw * 0.3, ky + 2.2)], 0.3, d.ink, 0.35);
  d.pen.hair([pt(cx1 - 0.9, cy1), pt(fx - 1.3, fy - 1.2)], 0.3, d.ink, 0.45);
  if (!far) {
    gleam(d, [pt(kx + kw * 0.25, ky - 1.4), pt(kx + kw * 0.35, ky + 0.8)], 0.5, 0.5);
    gleam(d, [pt(cx1 + 1, cy1), pt(fx + 1, fy - 2)], 0.45, 0.4);
  }
  const c = j[7]!;
  hoof(d, pt(c[0], c[1]), pose.tilt, look);
  feathers(d, j, low, far);
}

const bellyOver = (rig: MountRig, pose: LegPose): number => {
  const x = pose.joints[3]![0];
  return apply(rig.body, pt(x, -30)).y + 30;
};

/** The far legs, in shade behind the body. */
export function farLegs(d: Draw, look: HorseLook, rig: MountRig): void {
  const { farHind, farFore } = rig.legs;
  leg(d, farHind, look, true, null, 0, false);
  leg(d, farFore, look, true, null, 0, true);
}

/** The near legs, over the body's lower edge (`body` is the torso's outline, in the figure). */
export function nearLegs(d: Draw, look: HorseLook, rig: MountRig, body: readonly Pt[]): void {
  const { nearHind, nearFore } = rig.legs;
  leg(d, nearHind, look, false, body, bellyOver(rig, nearHind), false);
  leg(d, nearFore, look, false, body, bellyOver(rig, nearFore), true);
}

/** The body and neck's outline, the neck bent by `warp`. */
export function torsoShape(warp: (p: Pt) => Pt = (p) => p): Pt[] {
  return shapeOf(mapXY(TORSO_KEYS, warp), 6);
}

/** The torso's outline where the rig has put it, in the figure (to clip the near legs). */
export function torsoInFigure(rig: MountRig): Pt[] {
  return torsoShape(rig.warp).map((p) => apply(rig.body, p));
}

/** Body and neck: coat wash, form shading, and the muscles a horse painter draws in. */
export function torso(d: Draw, look: HorseLook, warp: (p: Pt) => Pt = (p) => p): Pt[] {
  const body = torsoShape(warp);
  const w = (xy: readonly (readonly [number, number])[]): [number, number][] => mapXY(xy, warp);
  paint(d, body, look.coat, { shadow: 0.6, hatch: 0.16, line: 0, lit: pt(0.45, 0.2) });
  const { pen } = d;
  const ink = (xy: readonly (readonly [number, number])[], width = 0.4, a = 0.5): void => pen.hair(lineOf(w(xy)), width, d.ink, a);
  pen.clipped(body, () => {
    // The big masses catch the light: shoulder, barrel, haunch; the hollows between stay deep.
    for (const [x, y, rx, ry, a] of [[13, -46, 6.5, 8.5, 0.3], [-23, -43, 7.5, 7, 0.32], [-6, -43, 9, 4, 0.18], [16, -60, 3.5, 6, 0.18]] as const) {
      dab(d, shapeOf([[x - rx, y], [x, y - ry], [x + rx, y], [x, y + ry]]), LIGHT, a, 2.6);
    }
    // The hollows between the masses, and the belly turning away into shadow.
    dab(d, shapeOf([[-14, -46], [-10, -40], [-13, -30], [-17, -36]]), SHADOW, 0.28, 2.2);
    dab(d, shapeOf([[5, -50], [9, -44], [7, -34], [3, -40]]), SHADOW, 0.2, 2);
    dab(d, shapeOf([[-31, -32], [15, -33], [17, -23], [-31, -23]]), SHADOW, 0.45, 2.6);
    // The gaskin's and forearm's muscle tops where they leave the body.
    dab(d, shapeOf([[-31, -40], [-24, -44], [-22, -33], [-29, -30]]), LIGHT, 0.14, 2);
    gleam(d, lineOf([[-27, -50.4], [-19, -51.4], [-8, -48.4], [0, -50.4]]), 1, 0.4);
    gleam(d, lineOf(w([[7.6, -60], [13.4, -66.4], [19, -70]])), 0.8, 0.35);
    dab(d, shapeOf(w([[20, -66], [25, -66], [27, -60], [22, -58]])), SHADOW, 0.3, 1.6);
  });
  // Shoulder blade, point of shoulder, elbow, the flank's fold, point of hip, hamstring, jugular groove.
  ink([[4, -51], [9.4, -43], [16.6, -35.6]], 0.45, 0.45);
  ink([[21.4, -42.6], [18.8, -38.6], [15, -34.4]], 0.4, 0.4);
  ink([[-17.4, -29.6], [-15.4, -36], [-16.6, -42]], 0.42, 0.45);
  ink([[-21, -46.4], [-19, -47.8], [-17.2, -46.4]], 0.38, 0.45);
  ink([[-31, -40], [-28.4, -34], [-25.4, -29.6]], 0.4, 0.4);
  ink([[22.4, -51], [19.2, -58], [16.4, -64]], 0.35, 0.3);
  pen.stroke(lineOf([[-29.6, -26.8], [-20, -25.4], [-9, -24.4], [2, -24.2], [10, -25.6]]), 0.5, d.ink, 0.85, false);
  return body;
}

/** The head: lean face, round jowl, eye, nostril and ears. */
export function head(d: Draw, look: HorseLook): Pt[] {
  const { pen } = d;
  // Far ear, then near ear.
  for (const [bx, tip, far] of [[24.2, pt(23.4, -80.4), true], [26.6, pt(27.2, -81), false]] as const) {
    const ear = shapeOf([[bx - 1.6, -73], [tip.x - 0.5, tip.y + 1.4], [tip.x, tip.y], [tip.x + 0.9, tip.y + 1.8], [bx + 1.8, -73.4]], 4);
    paint(d, ear, far ? mix(look.coat, SHADOW, 0.35) : look.coat, { shadow: 0.5, hatch: 0, line: 0.55 });
    if (!far) pen.hair([pt(bx - 0.2, -73.6), pt(tip.x - 0.1, tip.y + 2)], 0.6, mix(look.coat, SHADOW, 0.6), 0.7);
  }
  const shape = shapeOf(HEAD_KEYS, 5);
  paint(d, shape, look.coat, { shadow: 0.5, hatch: 0.14, line: 0.6, lit: pt(0.35, 0.15) });
  pen.clipped(shape, () => {
    // Darker muzzle; the blaze; jowl and the face's bony ridge.
    dab(d, shapeOf([[34, -58], [37.6, -54], [36.6, -48.6], [31, -49], [31.4, -54]]), look.points, 0.55, 1.4);
    if (look.blaze) dab(d, shapeOf([[28.2, -71.4], [30, -70], [33.8, -59.4], [35.2, -54.8], [34, -54.4], [31.4, -60.4]]), '#c9bc9e', 0.85, 0.5);
    dab(d, shapeOf([[23.8, -64], [27.8, -62], [29, -57.4], [25.6, -56.6]]), SHADOW, 0.18, 1.6);
    dab(d, shapeOf([[25.6, -70], [28.4, -71], [30.6, -66], [28.8, -64]]), LIGHT, 0.25, 1.2);
  });
  pen.hair(lineOf([[23.8, -65.6], [27.6, -62.6], [28.8, -58], [28.6, -55]]), 0.5, d.ink, 0.6);
  pen.hair(lineOf([[29.2, -68.6], [32, -62], [33.8, -57]]), 0.35, d.ink, 0.3);
  // Eye: dark, with a lid line and a wet glint.
  pen.dot(28.6, -66.6, 0.95, '#1d1716');
  pen.hair(lineOf([[27.2, -67.6], [28.7, -68.1], [30, -67]]), 0.4, d.ink, 0.85);
  pen.dot(28.3, -66.95, 0.3, '#f3e6c6', 0.85);
  // Nostril and mouth.
  pen.hair(lineOf([[35.2, -54.6], [34.2, -53.6], [34.5, -52.2], [35.5, -52.4]]), 0.45, d.ink, 0.85);
  pen.hair(lineOf([[35.8, -50.6], [34, -50.6], [32.2, -51.2]]), 0.4, d.ink, 0.7);
  return shape;
}

/** The mane along the crest (bent with the neck by `warp`), combed into strands; `wind` lifts it. */
export function mane(d: Draw, look: HorseLook, warp: (p: Pt) => Pt = (p) => p, wind = 0, t = 0): void {
  const { pen } = d;
  const crest = CREST.map(warp);
  const top = crest.map((p) => pt(p.x - 0.6, p.y - 1.2));
  const n = crest.length;
  const bot = crest.map((p, i) => {
    const u = i / (n - 1);
    const lift = wind * u * (1.6 + 0.8 * Math.sin(t * Math.PI * 2 + u * 9));
    // A heavy mane: locks falling well down the near side of the neck, their ends uneven.
    const lock = i % 3 === 1 ? 2 : i % 3 === 2 ? 0.8 : 0;
    return pt(p.x - 1.6 - u * 2 - lift, p.y + 5.4 + lock + Math.sin(u * 11) * 0.8 + u * 1.6 - lift * 0.9);
  });
  const shape = [...top, ...[...bot].reverse()];
  paint(d, shape, look.mane, { shadow: 0.6, hatch: 0.16, line: 0.5, lit: pt(0.5, 0.1) });
  for (let i = 1; i < n - 1; i += 1) {
    const a = top[i]!;
    const b = bot[i]!;
    pen.hair([a, pt((a.x + b.x) / 2 - 0.8, (a.y + b.y) / 2), pt(b.x - 0.6, b.y - 0.2)], 0.3, i % 2 ? mix(look.mane, '#c9a878', 0.3) : d.ink, 0.6);
  }
  gleam(d, top.slice(2, -2).map((p) => pt(p.x - 0.4, p.y + 1.2)), 0.5, 0.35);
}

/** The forelock between the ears (head coordinates). */
export function forelock(d: Draw, look: HorseLook): void {
  const lock = shapeOf([[25, -74.6], [27.6, -73.8], [29.8, -69.6], [28.8, -68.8], [26.4, -71.4]], 4);
  paint(d, lock, look.mane, { shadow: 0.3, hatch: 0, line: 0.45 });
}

/** The tail: a full fall of hair from the dock, combed; `lift` raises it (degrees), `swish` swings its end back. */
export function tail(d: Draw, look: HorseLook, swish = 0, lift = 0): void {
  const dock = pt(-27.6, -50);
  const [cs, sn] = [Math.cos((lift * Math.PI) / 180), Math.sin((lift * Math.PI) / 180)];
  const keys: [number, number][] = [[-27.6, -50], [-32.4, -47.4], [-36.4, -39.6], [-38 - swish, -28], [-37.2 - swish * 1.6, -13.6]];
  const raised = keys.map(([x, y], i): [number, number] => {
    // The dock is stiff: the lift bends the hair more the further down it falls.
    const k = Math.min(1, i / 2);
    const [dx, dy] = [x - dock.x, y - dock.y];
    const [rx, ry] = [dock.x + dx * cs - dy * sn, dock.y + dx * sn + dy * cs];
    return [x + (rx - x) * k, y + (ry - y) * k];
  });
  const spine = lineOf(raised, 5);
  const w = (u: number): number => 3 + Math.sin(Math.PI * Math.min(1, u * 1.25)) * 6 - u * 1.6;
  const l = limb(spine.map((p, i) => [p.x, p.y, w(i / (spine.length - 1))] as Joint), 1);
  paint(d, l.shape, look.mane, { shadow: 0.65, hatch: 0.18, line: 0.55 });
  const nr = l.spine.map((p, i, a) => {
    const q = a[Math.min(a.length - 1, i + 1)]!;
    const o = a[Math.max(0, i - 1)]!;
    const [dx, dy] = [q.x - o.x, q.y - o.y];
    const m = Math.hypot(dx, dy) || 1;
    return pt(-dy / m, dx / m);
  });
  for (const k of [-0.36, -0.12, 0.12, 0.36]) {
    const strand = l.spine.map((p, i) => {
      const off = k * w(i / (l.spine.length - 1)) * 0.9;
      return pt(p.x + nr[i]!.x * off, p.y + nr[i]!.y * off);
    });
    d.pen.hair(strand.slice(2), 0.3, mix(look.mane, '#c9a878', 0.4), 0.55);
  }
}
