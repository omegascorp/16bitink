import { closed, cub, oval, pt, type Draw } from '../kit';
import { dab, gleam, glow, mix, paint, SHADOW } from '../paint';
import { PAPER_FILL } from '../palette';
import type { Pt } from '../pen';

/**
 * The bubble jelly (a flyer, hostile, inked in red): a drifting bell of
 * jelly that floats by holding a bubble of gas, as the Portuguese man o' war
 * floats on its gas-filled float and siphonophores hang from a gas bubble at
 * their tops. Here the bubble sits inside the bell's crown, silvery as gas
 * under water looks, so the jelly hangs bell-up without swimming and only
 * pulses to steer. Its rim is frilled with lappets and sense-bulbs; four
 * ruffled mouth arms hang under it, and from the rim trail long stinging
 * threads beaded with batteries of stinging cells (nematocysts, as every
 * real jelly has). When it stings it snaps the bell shut and flares its
 * threads out round it. Burst, its bell is torn open at the crown and the
 * bubble escapes in a string of beads. Purple-rose: its flesh carries the
 * same retinal pigment as Brine's microbes.
 *
 * Two passes, so the bell can be truly see-through and the threads stay fine:
 * `drawJelly` (the mouth arms, finished with the red silhouette) and
 * `drawJellyBell` (the threads, the bubble and the translucent bell over
 * them, laid on after the finish).
 * Origin at the centre of the bell.
 */
export const JELLY_ART = { w: 40, h: 64, ox: 20, oy: 24 } as const;
export type JellyPose = 'drift' | 'pulse' | 'burst';

const BELL = '#e7bfdc';
const BELL_DEEP = '#a35f9c';
const CANAL = '#b0508a';
const ARM = '#e9a9c9';
const THREAD = '#c4567f';
const SILVER = '#d2d6e2';
const SILVER_DEEP = '#6d7290';
const BEAD = '#f3e9ff';

/** How the bell sits in each pose: its half-width at the shoulder, its crown, its rim's height and half-width. */
interface Bell {
  readonly rx: number;
  readonly top: number;
  readonly rim: number;
  readonly mouth: number;
}

const BELLS: Readonly<Record<JellyPose, Bell>> = {
  drift: { rx: 13, top: -11, rim: 5, mouth: 12.6 },
  pulse: { rx: 10, top: -13.5, rim: 6.5, mouth: 7.4 },
  burst: { rx: 13.5, top: -6, rim: 6, mouth: 13.4 },
};

/** The bell's outline: a dome from rim to rim, then the front of the rim dipping a little towards us. */
function bellShape(b: Bell, f: number): Pt[] {
  const sway = [0, 0.4, -0.3][f]!;
  const l = pt(-b.mouth, b.rim);
  const r = pt(b.mouth, b.rim + sway * 0.4);
  return [
    ...cub(l, pt(-b.rx * 1.1, b.rim - (b.rim - b.top) * 0.75), pt(-b.rx * 0.62 + sway, b.top), pt(sway, b.top), 12),
    ...cub(pt(sway, b.top), pt(b.rx * 0.62 + sway, b.top), pt(b.rx * 1.1, b.rim - (b.rim - b.top) * 0.75), r, 12).slice(1),
    ...cub(r, pt(b.mouth * 0.5, b.rim + 2.4), pt(-b.mouth * 0.5, b.rim + 2.4), l, 10).slice(1, -1),
  ];
}

/** The torn bell: slumped and lopsided, a ragged gap in its crown where the bubble burst out. */
function tornShape(b: Bell, f: number): Pt[] {
  const tear: Pt[] = [];
  for (let i = 0; i <= 8; i++) tear.push(pt(-4.5 + i * 1.15, b.top + 1.6 + [0, 2.4, 0.6, 3.4, 1, 2.8, 0.2, 1.8, 0][i]! + Math.sin(i * 2.1 + f) * 0.3));
  return [
    ...cub(pt(-b.mouth, b.rim + 1.4), pt(-b.rx * 1.15, b.rim - 4), pt(-b.rx * 0.8, b.top), pt(-4.5, b.top + 1.6), 10),
    ...tear.slice(1, -1),
    ...cub(pt(4.7, b.top + 1.6), pt(b.rx * 0.7, b.top - 1.5), pt(b.rx * 1.1, b.rim - 3), pt(b.mouth, b.rim - 0.6), 10),
    ...cub(pt(b.mouth, b.rim - 0.6), pt(b.mouth * 0.5, b.rim + 3.4), pt(-b.mouth * 0.5, b.rim + 1.6), pt(-b.mouth, b.rim + 1.4), 10).slice(1, -1),
  ];
}

/** Where the rim's threads hang from, round its front edge. */
function rimPoints(b: Bell, n: number): Pt[] {
  return Array.from({ length: n }, (_, i) => {
    const u = n === 1 ? 0.5 : i / (n - 1);
    const x = -b.mouth * 0.92 + u * b.mouth * 1.84;
    return pt(x, b.rim + 1.8 * Math.sin(u * Math.PI));
  });
}

/**
 * One stinging thread from `from`, `len` long: hanging in a slow wave when
 * drifting, flung out and curling when it stings (`flare` -1..1, its side and
 * how far), drooping slack when the jelly's burst. Beaded with batteries of
 * stinging cells, which light when it fires.
 */
function thread(d: Draw, from: Pt, len: number, flare: number, wave: number, slack: boolean, lit: boolean): void {
  const pts: Pt[] = [];
  const n = 16;
  for (let i = 0; i <= n; i++) {
    const u = i / n;
    const s = len * u;
    const out = flare * Math.sin(u * Math.PI * 0.55) * len * 0.75;
    const curl = flare * u * u * len * 0.18;
    const sag = slack ? Math.sin(u * Math.PI) * 4 : 0;
    pts.push(pt(from.x + out + Math.sin(u * 5 + wave) * 1.6 * u + sag, from.y + s * (1 - Math.abs(flare) * 0.55) + curl * Math.sign(flare) * 0.4 - (slack ? u * u * len * 0.25 : 0)));
  }
  d.pen.stroke(pts, 0.6, d.ink, 0.85, false);
  d.pen.hair(pts, 0.3, mix(THREAD, '#ffd2df', 0.3), 0.9);
  for (let i = 2; i < pts.length; i += 2) {
    const p = pts[i]!;
    if (lit) glow(d.pen.ctx, p, 1.8, '#ff9ab8', 0.55);
    d.pen.dot(p.x, p.y, 0.5, lit ? '#ffe2ea' : d.ink, 0.9);
  }
}

/** A mouth arm: a ruffled ribbon hanging from the bell's middle, frilled along one edge. */
function arm(d: Draw, from: Pt, len: number, lean: number, wave: number): void {
  const spine: Pt[] = [];
  for (let i = 0; i <= 8; i++) {
    const u = i / 8;
    spine.push(pt(from.x + lean * u * len * 0.5 + Math.sin(u * 4 + wave) * 1.2, from.y + u * len));
  }
  const left: Pt[] = [];
  const right: Pt[] = [];
  spine.forEach((p, i) => {
    const w = 2.2 * (1 - (i / 8) * 0.6);
    const ruffle = i % 2 === 0 ? 0.8 : -0.2;
    left.push(pt(p.x - w - ruffle, p.y));
    right.push(pt(p.x + w * 0.5, p.y));
  });
  const shape = [...left, ...right.reverse()];
  paint(d, shape, ARM, { alpha: 1, shadow: 0.45, hatch: 0, line: 0.5 });
  d.pen.hair(spine, 0.35, mix(ARM, CANAL, 0.6), 0.7);
}

/** The finished pass: the mouth arms, the solid flesh that hangs under the bell. */
export function drawJelly(d: Draw, pose: JellyPose): void {
  const b = BELLS[pose];
  const wave = d.f * 2.1;
  const armLen = pose === 'pulse' ? 9 : pose === 'burst' ? 10 : 14;
  for (const [x, lean] of [[-2.4, -0.5], [2.2, 0.4], [-0.8, -0.1], [0.9, 0.2]] as const) arm(d, pt(x, b.rim - 1), armLen + Math.abs(x), lean, wave + x);
}

/** The stinging threads, kept fine: laid on after the finish, so the silhouette doesn't thicken them to ropes. */
function threads(d: Draw, pose: JellyPose): void {
  const b = BELLS[pose];
  const wave = d.f * 2.1;
  rimPoints(b, 8).forEach((p, i) => {
    const side = (i - 3.5) / 3.5;
    if (pose === 'pulse') thread(d, p, 22 + (i % 3) * 3, side * 1.1 + (side === 0 ? 0.2 : 0), wave + i, false, true);
    else thread(d, p, (pose === 'burst' ? 19 : 24) + (i % 3) * 3, side * 0.12, wave + i * 0.9, pose === 'burst', false);
  });
}

/** The gas bubble in its crown: silver, as gas under water is, a window of light on its upper left and the sea's purple caught low on it. */
function bubble(d: Draw, c: Pt, r: number): void {
  const shape = oval(c.x, c.y, r, r * 0.92, 20);
  paint(d, shape, SILVER, { alpha: 1, shadow: 0.8, hatch: 0, line: 0.55, gloss: true });
  d.pen.clipped(shape, () => {
    // Mercury-bright: a dark band across its middle where it mirrors the deep, the sea's purple caught under it.
    dab(d, [pt(c.x - r, c.y + r * 0.05), pt(c.x + r, c.y - r * 0.15), pt(c.x + r, c.y + r * 0.25), pt(c.x - r, c.y + r * 0.4)], SILVER_DEEP, 0.55, r * 0.15);
    dab(d, oval(c.x + r * 0.2, c.y + r * 0.75, r * 0.8, r * 0.3, 12), '#9a7fc0', 0.55, r * 0.12);
    d.pen.hair(Array.from({ length: 9 }, (_, i) => pt(c.x + Math.cos(Math.PI * (0.15 + i * 0.09)) * r * 0.8, c.y + Math.sin(Math.PI * (0.15 + i * 0.09)) * r * 0.8)), 0.45, SILVER_DEEP, 0.6);
  });
  gleam(d, cub(pt(c.x - r * 0.65, c.y - r * 0.05), pt(c.x - r * 0.62, c.y - r * 0.6), pt(c.x - r * 0.25, c.y - r * 0.75), pt(c.x + r * 0.05, c.y - r * 0.72), 6), Math.max(0.6, r * 0.22), 0.95);
  d.pen.dot(c.x + r * 0.35, c.y - r * 0.4, Math.max(0.35, r * 0.12), PAPER_FILL, 0.9);
}

/** The bubble escaping: beads of gas rising from the torn crown, smaller and further apart as they go. */
function beads(d: Draw, from: Pt, f: number): void {
  const rows: readonly [number, number, number][] = [[0.4, -1.5, 2.3], [-1.6, -5, 1.8], [1.4, -8.2, 1.5], [-0.6, -11.4, 1.2], [1.8, -13.6, 0.9], [-1.4, -15.8, 0.8], [0.6, -17.6, 0.6]];
  rows.forEach(([dx, dy, r], i) => {
    const c = pt(from.x + dx + Math.sin(i + f) * 0.4, from.y + dy);
    d.pen.fill(oval(c.x, c.y, r, r, 12), BEAD, 0.75);
    d.pen.stroke(closed(oval(c.x, c.y, r, r, 12)), 0.4, mix(SILVER_DEEP, BELL_DEEP, 0.4), 0.85);
    d.pen.dot(c.x - r * 0.35, c.y - r * 0.35, Math.max(0.3, r * 0.3), PAPER_FILL, 0.95);
  });
}

/** The see-through bell, laid on after the finish: the bubble, the bell's jelly over it, its canals, rim and frill. */
export function drawJellyBell(d: Draw, pose: JellyPose): void {
  const b = BELLS[pose];
  const shape = pose === 'burst' ? tornShape(b, d.f) : bellShape(b, d.f);
  const crown = pt(0, b.top + (b.rim - b.top) * 0.36);
  threads(d, pose);
  if (pose === 'burst') beads(d, pt(0.4, b.top + 1), d.f);
  else bubble(d, crown, pose === 'pulse' ? 4.6 : 5.2);
  const { pen } = d;
  pen.fill(shape, BELL, 0.42);
  pen.clipped(shape, () => {
    // Deeper pigment in the crown and round the rim; the light coming through on its upper left.
    dab(d, oval(0, b.top + 1, b.rx * 0.9, 4, 14), BELL_DEEP, 0.18, 2.5);
    dab(d, oval(0, b.rim + 1, b.mouth * 1.05, 2.6, 14), BELL_DEEP, 0.32, 1.4);
    dab(d, oval(-b.rx * 0.45, b.top + (b.rim - b.top) * 0.35, b.rx * 0.35, 3.2, 12), PAPER_FILL, 0.35, 1.8);
    // The canals, running from the crown out to the rim.
    for (let k = -3; k <= 3; k++) {
      const end = pt((k / 3.4) * b.mouth, b.rim + 1.6 * Math.cos((k / 3.4) * 1.2));
      const c = pt((k / 3.4) * b.rx * 0.9, b.top + (b.rim - b.top) * 0.4);
      pen.hair([pt(k * 0.6, b.top + 2), c, end], 0.35, CANAL, 0.45);
    }
    // The ring of retinal pigment round its crown, four horseshoes as a moon jelly carries.
    if (pose !== 'burst') {
      for (const a of [0.25, 0.75, 1.25, 1.75]) {
        const front = Math.sin(a * Math.PI) > 0;
        const c = pt(Math.cos(a * Math.PI) * b.rx * 0.36, b.top + (b.rim - b.top) * 0.6 + Math.sin(a * Math.PI) * 1.8);
        dab(d, oval(c.x, c.y, 1.5, 0.8, 10), '#c27ab4', front ? 0.32 : 0.18, 0.5);
        pen.hair(closed(oval(c.x, c.y, 1.5, 0.8, 10)), 0.3, '#8a3f86', front ? 0.32 : 0.18);
      }
    }
    // The back of the rim, seen through the bell.
    pen.hair(cub(pt(-b.mouth, b.rim), pt(-b.mouth * 0.5, b.rim - 2.2), pt(b.mouth * 0.5, b.rim - 2.2), pt(b.mouth, b.rim), 10), 0.4, mix(BELL_DEEP, SHADOW, 0.2), 0.45);
    if (pose === 'burst') {
      for (const x of [-7, -2, 4, 8]) pen.hair([pt(x, b.top + 3), pt(x + 1, b.rim - 1)], 0.4, mix(BELL_DEEP, SHADOW, 0.3), 0.55);
    }
  });
  // The frill: lappets scalloped along the front of the rim, a sense-bulb between each pair.
  const rims = rimPoints(b, 11);
  for (let i = 0; i < rims.length - 1; i++) {
    const a = rims[i]!;
    const c = rims[i + 1]!;
    const m = pt((a.x + c.x) / 2, (a.y + c.y) / 2 + 1.3);
    pen.hair([a, m, c], 0.45, mix(BELL_DEEP, SHADOW, 0.15), 0.7);
    pen.dot(a.x, a.y + 0.2, 0.42, mix(BELL_DEEP, '#ffd2df', 0.4), 0.9);
  }
  pen.stroke(closed(shape), 0.8, d.ink, 0.85);
  gleam(d, cub(pt(-b.rx * 0.8, b.rim - 3), pt(-b.rx * 0.85, b.top + 4), pt(-b.rx * 0.45, b.top + 0.6), pt(-1, b.top + 0.4), 10), 0.8, 0.7);
  if (pose === 'pulse') {
    // The jet of water squeezed out under the bell.
    for (const x of [-3, 0, 3]) pen.hair([pt(x, b.rim + 3), pt(x * 1.3, b.rim + 8)], 0.35, PAPER_FILL, 0.5);
  }
}
