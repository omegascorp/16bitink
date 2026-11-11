import { createRng } from '../../../src/logic/rng';
import { closed, cub, type Draw, oval, pt } from '../../../src/art/kit';
import { glaze } from '../../../src/art/snakes/cornPaint';
import { PAPER_FILL } from '../../../src/art/palette';
import type { Pt } from '../../../src/art/pen';
import type { SpriteArt } from '../../../src/art/types';

/**
 * A white-tailed deer fawn lying limp, facing −x (left), eyes shut: a
 * compact russet body with a deep chest, a round haunch and a tucked flank,
 * rows of white spots along the back either side of a dark spine line, the
 * pale belly and chin; the neck lying forward and the head resting nose
 * down, a long muzzle with a black nose and the white band behind it, big
 * ovate ears (one flopped back); slender legs folded under, the knees and
 * hocks showing, small dark split hooves; the short tail with its white
 * underside. Washes with a firm pen line; just asleep-looking, never hurt.
 * Art units: nose at x ≈ −236, rump at x ≈ +180, ground at y ≈ +94.
 */
export const FAWN = {
  coat: '#b4683c', lit: '#d8945c', deep: '#7a3f22', dorsal: '#5a321e', belly: '#efe2ca', white: '#fbf6ec',
  nose: '#1c1614', hoof: '#3a3330', hoofLit: '#7a7068', ear: '#e9cbb6', line: '#24160e',
} as const;

/** Body and neck as one silhouette (no seam): the neck thinner, its throat dropping in a dewlap curve to the chest; a deep ribcage, the flank tucked up before the haunch. */
const BODY: readonly Pt[] = [
  ...cub(pt(-166, -22), pt(-142, -52), pt(-102, -72), pt(-58, -76), 12),
  ...cub(pt(-58, -76), pt(0, -66), pt(70, -62), pt(128, -72), 14).slice(1),
  ...cub(pt(128, -72), pt(166, -78), pt(186, -42), pt(182, -4), 10).slice(1),
  ...cub(pt(182, -4), pt(180, 36), pt(162, 64), pt(134, 74), 10).slice(1),
  ...cub(pt(134, 74), pt(114, 72), pt(98, 56), pt(80, 54), 8).slice(1),
  ...cub(pt(80, 54), pt(40, 64), pt(-10, 84), pt(-50, 86), 12).slice(1),
  ...cub(pt(-50, 86), pt(-80, 88), pt(-104, 80), pt(-116, 62), 8).slice(1),
  ...cub(pt(-116, 62), pt(-124, 46), pt(-128, 34), pt(-136, 28), 8).slice(1),
  ...cub(pt(-136, 28), pt(-142, 24), pt(-146, 18), pt(-148, 10), 6).slice(1),
];
const HAUNCH: readonly Pt[] = [
  ...cub(pt(96, -54), pt(150, -62), pt(178, -20), pt(170, 22), 12),
  ...cub(pt(170, 22), pt(160, 62), pt(110, 76), pt(80, 54), 12).slice(1),
  ...cub(pt(80, 54), pt(58, 24), pt(60, -30), pt(96, -54), 12).slice(1),
];
/** The shoulder blade, slanting down and forward from the withers to the elbow. */
const SHOULDER: readonly Pt[] = [
  ...cub(pt(-40, -70), pt(-30, -30), pt(-50, 20), pt(-78, 56), 10),
  ...cub(pt(-78, 56), pt(-104, 40), pt(-110, -10), pt(-84, -60), 10).slice(1),
  pt(-40, -70),
];

/** The head in its own frame (facing −x, the crown at the origin), set on the neck nose down. */
const HEAD_AT = { x: -170, y: 0, rot: -0.6 } as const;
const HEAD: readonly Pt[] = [
  ...cub(pt(18, -20), pt(4, -34), pt(-18, -34), pt(-34, -26), 10),
  ...cub(pt(-34, -26), pt(-50, -18), pt(-70, -8), pt(-84, 0), 10).slice(1),
  ...cub(pt(-84, 0), pt(-92, 4), pt(-92, 16), pt(-84, 20), 6).slice(1),
  ...cub(pt(-84, 20), pt(-70, 26), pt(-50, 30), pt(-30, 30), 8).slice(1),
  ...cub(pt(-30, 30), pt(-6, 32), pt(14, 26), pt(22, 10), 8).slice(1),
  ...cub(pt(22, 10), pt(26, -2), pt(24, -12), pt(18, -20), 6).slice(1),
];
const EAR_NEAR: readonly Pt[] = [
  ...cub(pt(4, -26), pt(20, -60), pt(62, -78), pt(92, -66), 14),
  ...cub(pt(92, -66), pt(76, -44), pt(40, -24), pt(14, -16), 14).slice(1),
];
const EAR_FAR: readonly Pt[] = [
  ...cub(pt(-10, -30), pt(-26, -62), pt(-18, -100), pt(4, -112), 12),
  ...cub(pt(4, -112), pt(16, -90), pt(12, -56), pt(4, -30), 12).slice(1),
];
const TAIL: readonly Pt[] = [
  ...cub(pt(166, -60), pt(182, -80), pt(204, -82), pt(212, -68), 10),
  ...cub(pt(212, -68), pt(208, -50), pt(192, -40), pt(176, -36), 10).slice(1),
];

function wash(d: Draw, shape: readonly Pt[], base: string, light: Pt, w = 1.5, outline = true): void {
  const { pen } = d;
  const { ctx } = pen;
  const ys = shape.map((p) => p.y);
  const xs = shape.map((p) => p.x);
  const [y0, y1] = [Math.min(...ys), Math.max(...ys)];
  const [x0, x1] = [Math.min(...xs), Math.max(...xs)];
  pen.fill(shape, PAPER_FILL, 1);
  pen.fill(shape, base, 0.97);
  pen.clipped(shape, () => {
    const g = ctx.createLinearGradient(0, y0, 0, y1);
    g.addColorStop(0, 'rgba(255,236,200,0.2)');
    g.addColorStop(0.45, 'rgba(255,236,200,0)');
    g.addColorStop(1, 'rgba(40,18,8,0.26)');
    ctx.fillStyle = g;
    ctx.fillRect(x0 - 2, y0 - 2, x1 - x0 + 4, y1 - y0 + 4);
    glaze(ctx, light.x, light.y, Math.max(6, (x1 - x0) * 0.35), Math.max(4, (y1 - y0) * 0.22), 0, FAWN.lit, 0.55);
  });
  if (outline) pen.stroke(closed(shape), w, FAWN.line, 0.95, false);
}

/** Short hairs along the coat, running back (+x) and down the flank. */
function coatHairs(d: Draw, shape: readonly Pt[], n: number, seed: number, len: number): void {
  const { pen } = d;
  const rng = createRng(seed);
  const xs = shape.map((p) => p.x);
  const ys = shape.map((p) => p.y);
  pen.clipped(shape, () => {
    for (let i = 0; i < n; i++) {
      const x = Math.min(...xs) + rng() * (Math.max(...xs) - Math.min(...xs));
      const y = Math.min(...ys) + rng() * (Math.max(...ys) - Math.min(...ys));
      const a = 0.25 + (y / 90) * 0.6;
      const dark = rng() < 0.6;
      pen.hair([pt(x, y), pt(x + Math.cos(a) * len, y + Math.sin(a) * len)], 0.35, dark ? FAWN.deep : FAWN.lit, dark ? 0.32 : 0.4);
    }
  });
}

/** The white spots: rows either side of the spine line, smaller and sparser down the flank. */
function spots(d: Draw): void {
  const { pen } = d;
  const rng = createRng(8801);
  const rows: readonly (readonly [number, number, number, number, number])[] = [
    [-60, 150, -58, 19, 5.6], [-50, 160, -42, 21, 5.4], [-30, 150, -24, 25, 4.8], [10, 130, -4, 30, 4],
  ];
  pen.clipped(BODY, () => {
    rows.forEach(([from, to, y, step, size], r) => {
      for (let x = from + (r % 2) * step * 0.5; x <= to; x += step + (rng() - 0.5) * 6) {
        const yy = y + (rng() - 0.5) * 5 + (x > 100 ? (x - 100) * 0.1 : 0);
        const rx = size + rng() * 1.6;
        const s = oval(x, yy, rx, rx * 0.74, 12);
        pen.fill(s, FAWN.white, 0.92 - r * 0.1);
        pen.hair(s.slice(6, 12), 0.3, FAWN.deep, 0.3);
      }
    });
  });
}

/** A slender leg: a tapering limb through its joints, the knee or hock a small bump. */
function limb(d: Draw, pts: readonly Pt[], w0: number, w1: number, tone: string): void {
  const n = pts.length;
  const left: Pt[] = [];
  const right: Pt[] = [];
  pts.forEach((p, i) => {
    const a = pts[Math.max(0, i - 1)]!;
    const b = pts[Math.min(n - 1, i + 1)]!;
    const len = Math.hypot(b.x - a.x, b.y - a.y) || 1;
    const nx = -(b.y - a.y) / len;
    const ny = (b.x - a.x) / len;
    const w = (w0 + (w1 - w0) * (i / (n - 1))) / 2;
    left.push(pt(p.x + nx * w, p.y + ny * w));
    right.push(pt(p.x - nx * w, p.y - ny * w));
  });
  wash(d, [...left, ...right.reverse()], tone, pts[0]!, 1.3);
}

/** A small cloven hoof at `at`, pointing along `dir` (radians): two slim pointed toes side by side, the dewclaws behind. */
function hoof(d: Draw, at: Pt, dir: number): void {
  const { pen } = d;
  const c = Math.cos(dir);
  const s = Math.sin(dir);
  const to = (x: number, y: number): Pt => pt(at.x + x * c - y * s, at.y + x * s + y * c);
  const toe = (dy: number, tone: string): void => {
    const shape = [to(-2, dy - 4.5), to(8, dy - 4.5), to(18, dy + 1.2), to(8, dy + 3), to(-2, dy + 3)];
    pen.fill(shape, tone, 1);
    pen.hair([to(0, dy - 3), to(10, dy - 2.6)], 0.7, FAWN.hoofLit, 0.8);
    pen.stroke(closed(shape), 0.9, FAWN.line, 1, false);
  };
  toe(-1.5, '#2a2422');
  toe(3.5, FAWN.hoof);
  for (const [x, y] of [[-9, -5], [-11, -1]] as const) pen.fill(oval(to(x, y).x, to(x, y).y, 2.4, 1.6, 8), FAWN.hoof, 1);
}

/** A joint's knob (knee, hock, fetlock). */
function knob(d: Draw, at: Pt, r: number, tone: string): void {
  d.pen.fill(oval(at.x, at.y, r, r * 0.86, 12), tone, 1);
  d.pen.hair(oval(at.x, at.y, r, r * 0.86, 12).slice(2, 8), 0.6, FAWN.line, 0.6);
}

function legs(d: Draw, near: boolean): void {
  if (!near) {
    // The far front leg reaching forward under the head, a shade darker: forearm, knee, cannon, fetlock.
    limb(d, [pt(-96, 70), pt(-128, 80), pt(-158, 86)], 20, 12, FAWN.deep);
    knob(d, pt(-160, 86), 7, FAWN.deep);
    limb(d, [pt(-160, 87), pt(-185, 89), pt(-206, 90)], 9, 7.5, FAWN.deep);
    knob(d, pt(-207, 90), 5, FAWN.deep);
    hoof(d, pt(-212, 91), Math.PI);
    return;
  }
  // The near hind leg folded: the gaskin down to the point of the hock, the slim cannon lying forward.
  limb(d, [pt(138, 36), pt(158, 60), pt(172, 76)], 28, 15, FAWN.coat);
  knob(d, pt(174, 79), 9, FAWN.coat);
  limb(d, [pt(170, 84), pt(120, 89), pt(72, 91)], 11, 8, FAWN.coat);
  knob(d, pt(68, 91), 5.5, FAWN.coat);
  hoof(d, pt(62, 92), Math.PI);
  // The near front leg folded under the chest: the muscled forearm to the knee, the cannon tucked back.
  limb(d, [pt(-80, 54), pt(-112, 72), pt(-146, 84)], 26, 13, FAWN.coat);
  knob(d, pt(-148, 86), 9, FAWN.coat);
  limb(d, [pt(-146, 91), pt(-112, 93), pt(-82, 93)], 10, 7.5, FAWN.coat);
  knob(d, pt(-79, 93), 5, FAWN.coat);
  hoof(d, pt(-74, 94), 0);
}

function head(d: Draw): void {
  const { pen } = d;
  const { ctx } = pen;
  ctx.save();
  ctx.translate(HEAD_AT.x, HEAD_AT.y);
  ctx.rotate(HEAD_AT.rot);
  wash(d, EAR_FAR, FAWN.deep, pt(-4, -80), 1.3);
  pen.fill(EAR_FAR.map((p) => pt(-2 + (p.x + 2) * 0.55, -66 + (p.y + 66) * 0.7)), FAWN.ear, 0.5);
  wash(d, HEAD, FAWN.coat, pt(-20, -22), 1.6);
  pen.clipped(HEAD, () => {
    glaze(ctx, -58, -12, 22, 8, 0.35, FAWN.dorsal, 0.55);
    glaze(ctx, -76, 14, 12, 10, 0, FAWN.white, 0.9);
    glaze(ctx, -40, 28, 30, 8, 0, FAWN.belly, 0.85);
    glaze(ctx, -24, -6, 14, 11, 0, FAWN.white, 0.3);
    glaze(ctx, 8, 10, 18, 16, 0, FAWN.deep, 0.35);
  });
  const nose = [...cub(pt(-82, -2), pt(-90, -2), pt(-95, 6), pt(-93, 14), 6), ...cub(pt(-93, 14), pt(-90, 19), pt(-84, 17), pt(-82, 10), 6).slice(1)];
  pen.fill(nose, FAWN.nose, 1);
  pen.dot(-88, 3, 1.4, '#8a8a90', 0.8);
  pen.hair(cub(pt(-84, 20), pt(-76, 24), pt(-66, 25), pt(-58, 24), 6), 0.6, FAWN.line, 0.8);
  // The shut eye: the pale ring, a soft dark lid line with lashes.
  pen.fill(oval(-26, -8, 12, 7.5, 16), FAWN.white, 0.4);
  pen.fill(oval(-26, -9, 8.5, 4, 16), FAWN.deep, 0.45);
  const lid = cub(pt(-35, -10), pt(-30, -5.5), pt(-22, -5.5), pt(-17, -10), 8);
  pen.hair(lid, 1.5, FAWN.line, 0.95);
  for (let i = 2; i < lid.length - 1; i += 2) pen.hair([lid[i]!, pt(lid[i]!.x - 1.5, lid[i]!.y + 3.2)], 0.45, FAWN.line, 0.8);
  coatHairs(d, HEAD, 110, 8802, 4);
  wash(d, EAR_NEAR, FAWN.coat, pt(46, -56), 1.4);
  pen.clipped(EAR_NEAR, () => {
    pen.fill(EAR_NEAR.map((p) => pt(44 + (p.x - 44) * 0.72, -44 + (p.y + 44) * 0.5)), FAWN.ear, 0.75);
    glaze(ctx, 88, -64, 12, 8, 0, FAWN.dorsal, 0.8);
  });
  ctx.restore();
}

function drawFawn(d: Draw): void {
  const { pen } = d;
  const { ctx } = pen;
  legs(d, false);
  wash(d, TAIL, FAWN.coat, pt(190, -72), 1.3);
  pen.clipped(TAIL, () => pen.fill(TAIL.map((p) => pt(p.x + 2, p.y + 8)), FAWN.white, 0.95));
  const fluff = createRng(8803);
  for (let i = 0; i < 26; i++) {
    const a = 0.3 + fluff() * 1.6;
    const x = 176 + fluff() * 32;
    const y = -56 + fluff() * 16;
    pen.hair([pt(x, y), pt(x + Math.cos(a) * 7, y + Math.sin(a) * 7)], 0.8, FAWN.white, 0.9);
  }
  wash(d, BODY, FAWN.coat, pt(10, -54), 1.8);
  pen.clipped(BODY, () => {
    const g = ctx.createLinearGradient(0, 30, 0, 90);
    g.addColorStop(0, 'rgba(239,226,202,0)');
    g.addColorStop(0.55, 'rgba(239,226,202,0.7)');
    g.addColorStop(1, 'rgba(239,226,202,0.95)');
    ctx.fillStyle = g;
    ctx.fillRect(-150, 30, 340, 62);
    glaze(ctx, 176, -30, 12, 26, 0, FAWN.white, 0.75);
    pen.fill([...cub(pt(-150, -40), pt(-80, -84), pt(70, -72), pt(170, -84), 22), ...cub(pt(170, -66), pt(70, -60), pt(-80, -70), pt(-150, -40), 22)], FAWN.dorsal, 0.5);
    // The forms: the neck's pale throat and darker crest, the shoulder blade lit with its shadowed back edge,
    // the round of the ribcage (lit high, shaded low and behind), the hollow of the flank tuck.
    glaze(ctx, -138, 22, 22, 14, 0.5, FAWN.belly, 0.85);
    glaze(ctx, -118, -46, 30, 12, -0.6, FAWN.dorsal, 0.35);
    glaze(ctx, -14, -12, 70, 40, 0, FAWN.lit, 0.35);
    glaze(ctx, -6, 66, 70, 18, 0, FAWN.deep, 0.4);
    glaze(ctx, 58, 20, 22, 46, 0, FAWN.deep, 0.32);
    glaze(ctx, 92, 46, 20, 16, 0, FAWN.deep, 0.45);
    pen.clipped(SHOULDER, () => {
      glaze(ctx, -76, -24, 26, 46, 0.35, FAWN.lit, 0.55);
      glaze(ctx, -46, 0, 14, 50, 0.3, FAWN.deep, 0.35);
    });
  });
  pen.hair(cub(pt(-40, -66), pt(-34, -30), pt(-50, 18), pt(-76, 52), 10), 0.7, FAWN.line, 0.3);
  pen.hair(cub(pt(-104, -50), pt(-120, -20), pt(-126, 8), pt(-130, 24), 8), 0.6, FAWN.deep, 0.45);
  coatHairs(d, BODY, 460, 8804, 5);
  spots(d);
  // The haunch: lit round its top, its edge a thin line.
  pen.clipped(BODY, () => {
    pen.clipped(HAUNCH, () => {
      glaze(ctx, 120, -24, 50, 30, 0, FAWN.lit, 0.45);
      glaze(ctx, 130, 50, 50, 26, 0, FAWN.deep, 0.35);
    });
  });
  pen.hair(HAUNCH.slice(26, 40), 0.9, FAWN.line, 0.55);
    legs(d, true);
  head(d);
}

export const FAWN_ART: SpriteArt<'lie'> = { frame: 500, res: 2, poses: ['lie'], draw: (d) => drawFawn(d) };
