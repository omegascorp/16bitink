import { ellipse, INK, PAPER, type Pen, type Pt } from '../../../src/art/pen';
import { band, contour, path, shade, shifted, tube, tubeSide, wash } from './ink';
import { bake, type Prop, SKIN } from './kit';

/**
 * The people, drawn like the game's fish: washes, cross-hatched shadow
 * sides, tapering outlines. The hand that strokes the shark (light from the
 * upper left), and the sushi chef: his head and shoulders in three-quarter
 * view, looking down at his work, his fist round the wasabi root, and his
 * reaching arm (drawn live, as it follows the root round).
 */

const SKIN_SHADE = '#c98e6c';
const SKIN_GRAIN = '#a8735a';
const NAIL = '#f4dccf';
const SLEEVE = '#5d7fa3';
const SLEEVE_DARK = '#2f4a6a';
const COAT = '#f6f4ee';
const COAT_SHADE = '#b9c3cc';
const COAT_GRAIN = '#8f9ba6';

/** A box, as an outline (for the region a glaze or hatching covers). */
const box = (x0: number, y0: number, x1: number, y1: number): Pt[] => [{ x: x0, y: y0 }, { x: x1, y: y0 }, { x: x1, y: y1 }, { x: x0, y: y1 }];

/** A point part-way along a polyline (by index). */
const at = (pts: readonly Pt[], f: number): Pt => pts[Math.round(f * (pts.length - 1))]!;

/** A finger (or thumb) along `spine`: washed, shaded underneath, outlined heavier below, a nail near its tip. */
function finger(pen: Pen, spine: readonly Pt[], r0: number, r1: number, opts: { nail?: boolean; knuckle?: boolean; dark?: boolean } = {}): void {
  const shape = tube(spine, r0, r1);
  wash(pen, shape, SKIN, SKIN_GRAIN, { region: band(spine, tubeSide(spine, r0 + 3, r1 + 3, 1)), colour: SKIN_SHADE, alpha: opts.dark ? 0.7 : 0.45 });
  shade(pen, shape, band(shifted(spine, 0, r0 * 0.25), tubeSide(spine, r0 + 3, r1 + 3, 1)), 3.4, 0.9, 0.5, opts.dark ? shape : undefined);
  contour(pen, shape, 3, 1.7, 0.62);
  if (opts.knuckle) {
    const base = spine[0]!;
    pen.stroke(path({ x: base.x - 4, y: base.y - r0 + 2 }, [{ x: base.x + 4, y: base.y - r0 - 4 }, { x: base.x + 13, y: base.y - r0 + 3 }]), 1.8);
    const mid = at(spine, 0.5);
    for (const d of [-3, 2]) pen.hair([{ x: mid.x + d, y: mid.y - r0 * 0.9 }, { x: mid.x + d + 2, y: mid.y - r0 * 0.2 }], 1.1, INK, 0.5);
  }
  if (opts.nail) {
    const p = at(spine, 0.82);
    const q = spine[spine.length - 1]!;
    const a = Math.atan2(q.y - p.y, q.x - p.x);
    const nail = ellipse(0, 0, 8.5, 5.5, 14).map((v) => ({ x: p.x + v.x * Math.cos(a) - (v.y - 2.5) * Math.sin(a), y: p.y + v.x * Math.sin(a) + (v.y - 2.5) * Math.cos(a) }));
    pen.fill(nail, NAIL, 1);
    pen.hair([...nail, nail[0]!], 1.2, INK, 0.75);
    pen.stroke([nail[11]!, nail[12]!, nail[13]!], 1.6, PAPER, 0.9, false);
  }
}

// ---------------------------------------------------------------- the stroking hand

/** Spines of the four fingers, little finger on top (the back of a right hand, fingers to the right). */
const FINGERS: readonly (readonly Pt[])[] = [66, 86, 94, 84].map((len, i) => {
  const base = { x: 22, y: -44 + i * 18 };
  return path(base, [{ x: 22 + len * 0.55, y: base.y - 3 + i }, { x: 22 + len, y: base.y + 8 + i * 2 }]);
});

function drawSleeve(pen: Pen, cuff: Pt, elbow: Pt): void {
  const spine = path(cuff, [{ x: (cuff.x + elbow.x) / 2 + 26, y: (cuff.y + elbow.y) / 2 }, elbow]);
  const shape = tube(spine, 45, 56);
  const shadowSide = band(shifted(spine, 6, 0), tubeSide(spine, 50, 62, 1));
  wash(pen, shape, SLEEVE, SLEEVE_DARK, { region: shadowSide, colour: SLEEVE_DARK, alpha: 0.25 });
  shade(pen, shape, shadowSide, 5, 0.85, 0.5, band(shifted(spine, 26, 0), tubeSide(spine, 50, 62, 1)));
  // Folds: soft V creases across the sleeve, each with a shadow under it.
  for (const f of [0.1, 0.17, 0.26, 0.38, 0.52]) {
    const l = at(tubeSide(spine, 45, 56, -1), f);
    const c = at(spine, f + 0.02);
    const r = at(tubeSide(spine, 45, 56, 1), f - 0.01);
    const fold = path(l, [{ x: (l.x + c.x) / 2, y: (l.y + c.y) / 2 + 10 }, c], [{ x: (c.x + r.x) / 2, y: (c.y + r.y) / 2 + 4 }, { x: r.x - 8, y: r.y - 6 }]);
    shade(pen, shape, band(fold, shifted(fold, 4, 16)), 3, -0.4, 0.45);
    pen.stroke(fold.slice(0, 9), 2, INK, 0.75, false);
    pen.stroke(fold.slice(8), 1.6, INK, 0.6, false);
  }
  // The turned-back cuff.
  const cuffLine = [at(tubeSide(spine, 45, 56, -1), 0.05), at(spine, 0.06), at(tubeSide(spine, 45, 56, 1), 0.05)];
  pen.stroke(path(cuffLine[0]!, [cuffLine[1]!, cuffLine[2]!]), 2.6);
  contour(pen, shape, 4.2, 2.4, 0.5);
}

/**
 * A right hand laid flat on the skin, seen from the back, fingers together
 * and pointing right, its forearm running up out of the frame in a blue
 * sleeve. Anchor: the middle of the palm, where it touches.
 */
export function makeHand(): Prop {
  return bake(700, 1260, 530, 1180, 13, (pen) => {
    const wrist = { x: -58, y: -18 };
    const elbow = { x: -470, y: -1170 };
    const cuff = { x: -117, y: -183 };
    // The forearm (under the sleeve's cuff and the back of the hand): lit on its upper side, hatched on the lower, a bump of wrist bone.
    const arm = path({ x: wrist.x + 18, y: wrist.y + 8 }, [{ x: -82, y: -96 }, { x: cuff.x - 6, y: cuff.y - 30 }]);
    const forearm = tube(arm, 31, 37);
    const under = band(shifted(arm, 8, 0), tubeSide(arm, 36, 42, 1));
    wash(pen, forearm, SKIN, SKIN_GRAIN, { region: under, colour: SKIN_SHADE, alpha: 0.3 });
    shade(pen, forearm, under, 4, 0.7, 0.5, band(shifted(arm, 22, 0), tubeSide(arm, 36, 42, 1)));
    pen.stroke(path({ x: -86, y: -40 }, [{ x: -80, y: -48 }, { x: -72, y: -44 }]), 1.6, INK, 0.7);
    contour(pen, forearm, 3.6, 2, 0.5);
    drawSleeve(pen, cuff, elbow);
    // The thumb, tucked under, mostly in shadow.
    finger(pen, path({ x: -34, y: 12 }, [{ x: 2, y: 36 }, { x: 40, y: 34 }]), 13, 10.5, { nail: true, dark: true });
    // The back of the hand.
    const back = path({ x: -66, y: -50 }, [{ x: -24, y: -70 }, { x: 26, y: -52 }], [{ x: 38, y: -16 }, { x: 34, y: 22 }], [{ x: -10, y: 36 }, { x: -62, y: 14 }], [{ x: -76, y: -16 }, { x: -66, y: -50 }]);
    wash(pen, back, SKIN, SKIN_GRAIN, { region: box(-90, 2, 50, 50), colour: SKIN_SHADE, alpha: 0.55 });
    shade(pen, back, box(-90, 4, 50, 50), 3.6, 0.8, 0.5, box(-90, 18, 50, 50));
    // Tendons fanning to the knuckles, and a vein.
    FINGERS.forEach((f, i) => pen.hair(path({ x: -50, y: -30 + i * 9 }, [{ x: -14, y: -40 + i * 15 }, { x: f[0]!.x - 4, y: f[0]!.y - 2 }]), 1.1, INK, 0.3));
    pen.hair(path({ x: -62, y: -6 }, [{ x: -30, y: -12 }, { x: -8, y: 4 }]), 1.3, '#7c6aa0', 0.35);
    pen.stroke(back.slice(0, 18), 2);
    pen.stroke(back.slice(24), 3.8);
    FINGERS.forEach((spine, i) => finger(pen, spine, i === 0 ? 9.5 : 10.5, i === 0 ? 7.8 : 8.6, { nail: true, knuckle: true }));
  });
}

// ---------------------------------------------------------------- the chef

/** The chef's fist round the wasabi root (the root's tip at the origin); his sleeve meets it at FIST_CUFF. */
export const FIST_CUFF = { x: -60, y: -126 } as const;
export function drawFist(pen: Pen): void {
  const back = path({ x: -62, y: -152 }, [{ x: -40, y: -164 }, { x: -14, y: -154 }], [{ x: -4, y: -124 }, { x: -14, y: -94 }], [{ x: -40, y: -86 }, { x: -62, y: -98 }], [{ x: -70, y: -126 }, { x: -62, y: -152 }]);
  wash(pen, back, SKIN, SKIN_GRAIN, { region: box(-80, -116, 0, -80), colour: SKIN_SHADE, alpha: 0.6 });
  shade(pen, back, box(-80, -114, 0, -80), 3.4, 0.8, 0.5, box(-80, -100, 0, -80));
  pen.stroke(back.slice(0, 20), 1.8);
  pen.stroke(back.slice(18), 3.4);
  // Fingers curled round the front of the root, knuckles to the right.
  for (const y of [-146, -131, -116, -101]) finger(pen, path({ x: -18, y }, [{ x: 4, y: y - 3 }, { x: 24, y: y + 3 }]), 7.6, 7, { dark: y > -110 });
  // The thumb over the top, its nail showing.
  finger(pen, path({ x: -44, y: -158 }, [{ x: -16, y: -174 }, { x: 14, y: -162 }]), 9.5, 7.6, { nail: true });
}

/** Where the chef's reaching arm leaves his shoulder, from his anchor (at full size). */
export const CHEF_SHOULDER = { x: 88, y: -98 } as const;

function drawJacket(pen: Pen): void {
  const jacket = path({ x: -120, y: 0 }, [{ x: -122, y: -82 }, { x: -72, y: -108 }], [{ x: -36, y: -124 }, { x: -12, y: -126 }], [{ x: 6, y: -128 }, { x: 26, y: -122 }],
    [{ x: 74, y: -118 }, { x: 98, y: -94 }], [{ x: 120, y: -60 }, { x: 124, y: 0 }]);
  const back = path({ x: -140, y: -130 }, [{ x: -60, y: -124 }, { x: -52, y: -70 }], [{ x: -48, y: -20 }, { x: -30, y: 10 }], [{ x: -90, y: 20 }, { x: -140, y: 10 }]);
  wash(pen, jacket, COAT, COAT_GRAIN, { region: back, colour: COAT_SHADE, alpha: 0.4 });
  shade(pen, jacket, back, 5, 0.85, 0.45, path({ x: -140, y: -70 }, [{ x: -96, y: -60 }, { x: -86, y: 10 }], [{ x: -120, y: 20 }, { x: -140, y: 10 }]));
  // The crossed collar: the left panel over the right, a deep fold under its edge.
  const lapel = path({ x: -14, y: -126 }, [{ x: 2, y: -80 }, { x: 40, y: -10 }]);
  const lapelIn = shifted(lapel, 17, -3);
  pen.fill(band(lapel, lapelIn), '#ebe8df', 1);
  shade(pen, band(shifted(lapel, 17, -3), shifted(lapel, 27, -3)), box(-40, -140, 90, 0), 3, 0.5, 0.55);
  pen.stroke(lapel, 3);
  pen.stroke(lapelIn, 2);
  pen.stroke(path({ x: 24, y: -122 }, [{ x: 12, y: -100 }, { x: 4, y: -82 }]), 1.8);
  // Drapes from the shoulders, and under the reaching arm.
  for (const [a, c, b] of [
    [{ x: -72, y: -106 }, { x: -70, y: -70 }, { x: -60, y: -30 }], [{ x: -100, y: -74 }, { x: -96, y: -40 }, { x: -86, y: -8 }],
    [{ x: 84, y: -76 }, { x: 64, y: -50 }, { x: 46, y: -18 }], [{ x: 96, y: -60 }, { x: 84, y: -34 }, { x: 74, y: 0 }],
  ] as const) {
    pen.stroke(path(a, [c, b]), 1.9, INK, 0.8, false);
    shade(pen, jacket, band(path(a, [c, b]), shifted(path(a, [c, b]), 9, 2)), 3, 0.3, 0.45);
  }
  contour(pen, jacket, 3.8, 2.4, 0.45);
}

/** His head, three-quarter view facing right, tipped forward to watch the grater, in a twisted headband. */
function drawHead(pen: Pen, ctx: CanvasRenderingContext2D): void {
  const neck = path({ x: -14, y: -122 }, [{ x: -10, y: -146 }, { x: -6, y: -170 }], [{ x: 14, y: -176 }, { x: 30, y: -160 }], [{ x: 26, y: -140 }, { x: 30, y: -120 }]);
  const jawShadow = path({ x: -20, y: -175 }, [{ x: 10, y: -160 }, { x: 40, y: -152 }], [{ x: 30, y: -138 }, { x: -20, y: -140 }]);
  wash(pen, neck, SKIN, SKIN_GRAIN, { region: jawShadow, colour: SKIN_SHADE, alpha: 0.5 });
  shade(pen, neck, jawShadow, 3.2, 0.8, 0.55, box(-30, -180, 0, -110));
  pen.stroke(neck.slice(0, 9), 2.6);
  pen.stroke(neck.slice(16), 1.8);
  ctx.save();
  ctx.translate(6, -160);
  ctx.rotate(0.14);
  ctx.translate(-6, 160);
  const head = path({ x: -34, y: -256 }, [{ x: 6, y: -274 }, { x: 42, y: -252 }], [{ x: 58, y: -236 }, { x: 58, y: -212 }], [{ x: 60, y: -205 }, { x: 64, y: -200 }],
    [{ x: 72, y: -190 }, { x: 74, y: -184 }], [{ x: 70, y: -179 }, { x: 62, y: -179 }], [{ x: 66, y: -174 }, { x: 63, y: -170 }], [{ x: 62, y: -166 }, { x: 62, y: -163 }],
    [{ x: 63, y: -156 }, { x: 54, y: -150 }], [{ x: 30, y: -140 }, { x: 6, y: -152 }], [{ x: -10, y: -160 }, { x: -16, y: -178 }], [{ x: -48, y: -190 }, { x: -50, y: -222 }],
    [{ x: -50, y: -248 }, { x: -34, y: -256 }]);
  const shadowSide = path({ x: 6, y: -270 }, [{ x: 18, y: -214 }, { x: 4, y: -176 }], [{ x: 24, y: -150 }, { x: 60, y: -150 }], [{ x: 0, y: -120 }, { x: -70, y: -150 }], [{ x: -80, y: -260 }, { x: 6, y: -270 }]);
  wash(pen, head, SKIN, SKIN_GRAIN, { region: shadowSide, colour: SKIN_SHADE, alpha: 0.32 });
  shade(pen, head, shadowSide, 3.6, 0.75, 0.4, path({ x: -10, y: -186 }, [{ x: 20, y: -160 }, { x: 56, y: -152 }], [{ x: 10, y: -130 }, { x: -60, y: -150 }], [{ x: -50, y: -190 }, { x: -10, y: -186 }]));
  // Modelling: the cheekbone, the hollow under it, the eye socket.
  shade(pen, head, path({ x: 34, y: -196 }, [{ x: 40, y: -184 }, { x: 34, y: -170 }], [{ x: 26, y: -182 }, { x: 34, y: -196 }]), 3, 0.5, 0.35);
  shade(pen, head, ellipse(46, -206, 14, 7, 12), 2.6, -0.6, 0.3);
  // Hair, short and dark, under the band and down past the ear.
  const hair = path({ x: -48, y: -226 }, [{ x: -50, y: -262 }, { x: 2, y: -272 }], [{ x: 40, y: -266 }, { x: 52, y: -240 }], [{ x: 18, y: -244 }, { x: -10, y: -236 }],
    [{ x: -28, y: -226 }, { x: -24, y: -196 }], [{ x: -40, y: -198 }, { x: -48, y: -226 }]);
  pen.fill(hair, '#26232b', 0.92);
  pen.hatch(hair, 3, -1.2, 0.6, { color: '#8c8794', alpha: 0.35 });
  // The ear.
  const ear = ellipse(-16, -196, 10, 15, 16);
  wash(pen, ear, SKIN, SKIN_GRAIN, { region: box(-30, -200, 0, -180), colour: SKIN_SHADE, alpha: 0.6 });
  pen.closed(ear, 2.2);
  pen.hair(path({ x: -12, y: -206 }, [{ x: -22, y: -198 }, { x: -14, y: -188 }]), 1.3, INK, 0.7);
  // The face: brow drawn down in concentration, eyes lowered to the grater.
  pen.stroke(path({ x: 32, y: -215 }, [{ x: 46, y: -221 }, { x: 59, y: -212 }]), 3.8);
  pen.hair(path({ x: 40, y: -209 }, [{ x: 47, y: -212 }, { x: 54, y: -208 }]), 1.2, INK, 0.45);
  pen.stroke(path({ x: 38, y: -202 }, [{ x: 46, y: -207 }, { x: 56, y: -200 }]), 2.8);
  pen.dot(51, -199, 2.6);
  pen.hair([{ x: 41, y: -197 }, { x: 52, y: -196 }], 1, INK, 0.4);
  pen.stroke([{ x: 65, y: -205 }, { x: 68, y: -201 }], 2);
  pen.hair(path({ x: 60, y: -184 }, [{ x: 63, y: -180 }, { x: 68, y: -182 }]), 1.4, INK, 0.8);
  pen.hair(path({ x: 55, y: -188 }, [{ x: 52, y: -181 }, { x: 54, y: -175 }]), 1.1, INK, 0.4);
  pen.stroke(path({ x: 49, y: -167 }, [{ x: 56, y: -169 }, { x: 62, y: -168 }]), 2.2);
  pen.hair([{ x: 53, y: -162 }, { x: 59, y: -162 }], 1, INK, 0.4);
  contour(pen, head, 2.2, 3.4, 0.55);
  drawHeadband(pen);
  ctx.restore();
}

/** A twisted hachimaki round the forehead, knotted at the back, its ends trailing. */
function drawHeadband(pen: Pen): void {
  const top = path({ x: -52, y: -240 }, [{ x: 4, y: -254 }, { x: 58, y: -238 }]);
  const bottom = path({ x: -50, y: -222 }, [{ x: 4, y: -238 }, { x: 58, y: -222 }]);
  const strip = band(top, bottom);
  wash(pen, strip, COAT, COAT_GRAIN, { region: box(-70, -236, 70, -210), colour: COAT_SHADE, alpha: 0.5 });
  for (let i = 1; i < top.length - 1; i += 2) pen.hair([top[i]!, bottom[Math.min(bottom.length - 1, i + 2)]!], 1.3, INK, 0.65);
  pen.stroke(top, 2.2);
  pen.stroke(bottom, 2.8);
  for (const spine of [path({ x: -54, y: -236 }, [{ x: -80, y: -250 }, { x: -98, y: -240 }]), path({ x: -54, y: -228 }, [{ x: -78, y: -222 }, { x: -92, y: -206 }])]) {
    const end = tube(spine, 6.5, 4.5);
    wash(pen, end, COAT, COAT_GRAIN, { region: band(spine, tubeSide(spine, 8, 6, 1)), colour: COAT_SHADE, alpha: 0.6 });
    contour(pen, end, 2.4, 1.6, 0.6);
  }
  const knot = ellipse(-54, -231, 11, 10, 14);
  wash(pen, knot, COAT, COAT_GRAIN, { region: box(-70, -232, -40, -218), colour: COAT_SHADE, alpha: 0.6 });
  pen.closed(knot, 2.4);
}

/** The sushi chef, head and shoulders. Anchor: the middle of his bottom edge. */
export function makeChef(): Prop {
  return bake(320, 330, 160, 310, 51, (pen, ctx) => {
    drawJacket(pen);
    drawHead(pen, ctx);
  });
}

/** His reaching arm in its white sleeve, shoulder to wrist (screen px, live, `r` its thickness at the shoulder). */
export function drawChefArm(pen: Pen, shoulder: Pt, wrist: Pt, r: number): void {
  const elbow = { x: (shoulder.x + wrist.x) / 2 - 10, y: Math.max(shoulder.y, wrist.y) + 70 };
  const spine = path(shoulder, [elbow, wrist]);
  const shape = tube(spine, r, r * 0.72);
  const under = band(shifted(spine, 0, r * 0.2), tubeSide(spine, r + 4, r * 0.72 + 4, 1));
  wash(pen, shape, COAT, COAT_GRAIN, { region: under, colour: COAT_SHADE, alpha: 0.6 });
  shade(pen, shape, under, 3.6, 0.6, 0.5);
  // Creases bunched at the elbow.
  for (const f of [0.38, 0.47, 0.56]) {
    const c = at(spine, f);
    const l = at(tubeSide(spine, r, r * 0.72, -1), f - 0.04);
    pen.stroke(path(l, [{ x: c.x - 4, y: c.y }, { x: c.x + 2, y: c.y + r * 0.6 }]), 1.6, INK, 0.7, false);
  }
  // The cuff.
  const n = spine.length;
  const a = tubeSide(spine, r, r * 0.72, -1)[n - 3]!;
  const b = tubeSide(spine, r, r * 0.72, 1)[n - 3]!;
  pen.stroke([a, b], 2.2);
  contour(pen, shape, 3.4, 2, 0.5);
}
