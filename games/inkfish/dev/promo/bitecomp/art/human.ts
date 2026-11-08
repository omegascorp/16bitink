import { INK, type Pt } from '../../../../src/art/pen';
import { BOIL_FPS, BOIL_FRAMES } from '../../../../src/art/textures';
import type { KitEntry } from '../../foodchain/kit';
import { resample } from '../../kraken/whale';
import { type Box, type Brush, type Bucket, blit, dab, edgeAt, frames, lazily, path, px, screenScale, softLine, step01, taper, turn } from '../../seal/art/paint';
import type { DrawHead } from './contract';
import {
  BROW, CHIN, CORNER, CROWN, EAR, EYE_BACK, EYE_FRONT, FACE, FADE_FROM, FADE_TO, HAIR, HAIRLINE, HEAD, HEAD_BOX, HINGE, IRIS,
  JAW, JAW_BOX, JAW_MAX, LEN, LENS, LIP_BOT, LIP_TOP, LOWER_LID, LOWER_TEETH, MANDIBLE, NAPE, NECK, NECK_BOX, NECKLINE, SHIRT,
  SHIRT_BACK, SHIRT_FRONT, THROAT, type Tooth, UPPER_LID, UPPER_TEETH, lipBotAt, lipTopAt,
} from './humanShape';

/**
 * An adult in clean profile biting with the back teeth, painted like the
 * animals in ../../foodchain/art: skin laid in over one light (from the upper
 * front), warmed at the cheek, ear and nose, cooled into the shadow under the
 * jaw; short brown hair in strands; a realistic eye with a catchlight; the
 * lips parted to show the molars meeting. Neck and shoulders in a plain
 * T-shirt, fading out below.
 *
 * Three baked parts per line-boil frame: the neck and shirt, the head (all but
 * the lower jaw), and the lower jaw, which turns about its hinge under the ear
 * over the inside of the mouth (drawn live). The eye is live, so it can blink.
 */

// ---------------------------------------------------------------- colour

const SKIN = '#c58a66';
const LIP = '#b0645a';
const GUM = '#c87b76';
const HAIR_BASE = '#35251b';
const SHIRT_BASE = '#5d7b98';
const RIB = '#506d89';

/** Soft lights and shades shared by every part, so they match where they meet: [x, y, r, rgb, alpha]. */
const LIGHTS: readonly (readonly [number, number, number, string, number])[] = [
  [30, -160, 60, '255,228,200', 0.32],
  [66, -70, 13, '255,232,210', 0.4],
  [70, -49, 9, '255,236,215', 0.5],
  [14, -66, 30, '255,226,198', 0.28],
  [6, -36, 36, '196,78,66', 0.2],
  [66, -46, 13, '200,84,74', 0.18],
  [-94, -66, 26, '196,84,70', 0.22],
  [46, 46, 14, '255,226,198', 0.32],
  [50, 22, 8, '255,226,198', 0.25],
  [30, -95, 20, '90,45,30', 0.32],
  [-30, -122, 42, '90,50,35', 0.16],
  [-28, -22, 36, '100,55,38', 0.16],
  [-62, 4, 36, '80,40,28', 0.2],
  [48, -29, 9, '90,45,30', 0.3],
  [43, 31, 9, '90,45,30', 0.3],
  [-150, -60, 70, '70,36,24', 0.3],
  [-4, -60, 30, '255,226,198', 0.2],
];

/** Skin on a part: the base, the one light raking down from the upper front, then the shared dabs. */
function skinWash(k: Brush, shape: readonly Pt[]): void {
  const { ctx, pen } = k;
  pen.fill(shape, SKIN, 1);
  ctx.save();
  path(ctx, shape);
  ctx.clip();
  const g = ctx.createLinearGradient(80, -240, -230, 120);
  g.addColorStop(0, 'rgba(252,218,186,0.55)');
  g.addColorStop(0.38, 'rgba(252,218,186,0.06)');
  g.addColorStop(0.55, 'rgba(92,46,28,0)');
  g.addColorStop(1, 'rgba(92,46,28,0.5)');
  ctx.fillStyle = g;
  ctx.fillRect(-460, -290, 560, 660);
  for (const [x, y, r, rgb, a] of LIGHTS) dab(ctx, x, y, r, rgb, a);
  ctx.restore();
  // A fine stipple in the shade, the pen's texture under the paint.
  const xs = shape.map((p) => p.x);
  const ys = shape.map((p) => p.y);
  const area = (Math.max(...xs) - Math.min(...xs)) * (Math.max(...ys) - Math.min(...ys));
  pen.stipple(shape, Math.round(area * 0.03), (x, y) => 0.5 * step01(-(x + y * 0.6), 20, 200), px(k, 0.55), '#6b3a26');
}

// ---------------------------------------------------------------- teeth, gums and lips

/** How far a cusp stands off the tooth's baseline at u (0 back .. 1 front of the crown). */
function cuspAt(kind: Tooth[2], u: number): number {
  switch (kind) {
    case 'incisor': return 0.7;
    case 'canine': return 0.4 + 1.6 * (1 - Math.abs(2 * u - 1));
    case 'premolar': return 0.9 * Math.sin(Math.PI * u);
    case 'molar': return 0.9 * Math.abs(Math.sin(2 * Math.PI * u)) + 0.15;
  }
}

/** A row of crowns in the opening: `dir` 1 hangs from the upper gum, -1 stands on the lower. */
function paintTeeth(k: Brush, teeth: readonly Tooth[], dir: 1 | -1): void {
  const { ctx, pen } = k;
  const rootAt = dir === 1 ? (x: number): number => lipTopAt(x) - 4 : (x: number): number => lipBotAt(x) + 4;
  pen.clipped(LENS, () => {
    for (const [x0, x1, kind] of teeth) {
      const w = x0 - x1;
      const meet = kind === 'incisor' ? 2.4 : 0;
      const base = meet - dir * 0.95;
      const edge = Array.from({ length: 11 }, (_, i) => {
        const u = 0.06 + (0.88 * i) / 10;
        return { x: x1 + w * u, y: base + dir * cuspAt(kind, u) };
      });
      const crown: Pt[] = [
        { x: x1 + 0.35, y: rootAt(x1) }, { x: x1 + 0.15, y: base - dir * 2.2 }, ...edge,
        { x: x0 - 0.15, y: base - dir * 2.2 }, { x: x0 - 0.35, y: rootAt(x0) },
      ];
      const deep = step01(-x0, -46, 22);
      const g = ctx.createLinearGradient(0, rootAt((x0 + x1) / 2), 0, base);
      g.addColorStop(0, '#c4ad88');
      g.addColorStop(0.5, '#e6dac0');
      g.addColorStop(1, '#f3ebd9');
      ctx.save();
      path(ctx, crown);
      ctx.fillStyle = g;
      ctx.fill();
      ctx.fillStyle = `rgba(74,46,32,${0.55 * deep})`;
      ctx.fill();
      ctx.restore();
      // The light on the crown's front face, and the shadow on its back edge.
      pen.hair([{ x: x0 - w * 0.3, y: base - dir * 1.4 }, { x: x0 - w * 0.34, y: base - dir * 7 }], px(k, 1.4), '#ffffff', 0.45 * (1 - deep));
      pen.hair([{ x: x1 + 0.7, y: base - dir * 0.8 }, { x: x1 + 0.9, y: rootAt(x1) }], px(k, 1.2), '#8a6f55', 0.35);
      pen.hair(crown.slice(0, -1), px(k, 0.8), '#5a4030', 0.6);
      pen.hair(edge, px(k, 1), INK, 0.7);
    }
  });
}

/** The gum over the roots, scalloped, the papillae dipping between the teeth. */
function paintGum(k: Brush, teeth: readonly Tooth[], dir: 1 | -1): void {
  const { ctx, pen } = k;
  const lipAt = dir === 1 ? lipTopAt : lipBotAt;
  const line: Pt[] = [];
  for (let x = 50; x >= -16; x -= 0.5) {
    const t = teeth.find(([a, b]) => x <= a && x >= b) ?? teeth[teeth.length - 1]!;
    const u = (x - t[1]) / (t[0] - t[1]);
    line.push({ x, y: lipAt(x) + dir * (0.6 + 1.8 * (1 - Math.sin(Math.PI * u)) * step01(x, -16, 6)) });
  }
  const gum = [...line, ...[...line].reverse().map((p) => ({ x: p.x, y: lipAt(p.x) - dir * 3 }))];
  pen.clipped(LENS, () => {
    pen.fill(gum, GUM, 1);
    const g = ctx.createLinearGradient(0, lipAt(20), 0, lipAt(20) + dir * 5);
    g.addColorStop(0, 'rgba(110,40,40,0.4)');
    g.addColorStop(1, 'rgba(110,40,40,0)');
    ctx.fillStyle = g;
    path(ctx, gum);
    ctx.fill();
    pen.hair(line, px(k, 0.8), '#7a3434', 0.5);
  });
}

/** The far depth of the mouth: the teeth darken toward the corner, where the cheek closes over them. */
function shadeCorner(k: Brush): void {
  const { ctx, pen } = k;
  pen.clipped(LENS, () => {
    const g = ctx.createLinearGradient(46, 0, -16, 0);
    g.addColorStop(0, 'rgba(40,16,12,0)');
    g.addColorStop(0.6, 'rgba(40,16,12,0.12)');
    g.addColorStop(1, 'rgba(40,16,12,0.55)');
    ctx.fillStyle = g;
    ctx.fillRect(-20, -20, 70, 40);
    dab(ctx, CORNER.x, CORNER.y, 12, '30,10,8', 0.6);
  });
}

/** A lip's red edge along the opening: `thick` units at x, toward `dir` (-1 up for the upper lip). */
function paintLip(k: Brush, edge: readonly Pt[], dir: 1 | -1, thick: (x: number) => number, clip: readonly Pt[]): void {
  const { ctx, pen } = k;
  const band = [...edge, ...[...edge].reverse().map((p) => ({ x: p.x, y: p.y + dir * thick(p.x) }))];
  pen.clipped(clip, () => {
    pen.fill(band, LIP, 0.92);
    ctx.save();
    path(ctx, band);
    ctx.clip();
    const g = ctx.createLinearGradient(0, 0, 0, dir * 14);
    g.addColorStop(0, 'rgba(90,30,28,0.35)');
    g.addColorStop(1, 'rgba(90,30,28,0)');
    ctx.fillStyle = g;
    ctx.fillRect(-20, -30, 80, 60);
    ctx.restore();
    softLine(ctx, edge.filter((p) => p.x > 4).map((p) => ({ x: p.x, y: p.y + dir * thick(p.x) * 0.5 })), 2.4, '#e6aa98', 0.5, 4);
  });
}

// ---------------------------------------------------------------- the head

function paintEar(k: Brush): void {
  const { ctx, pen } = k;
  skinWash(k, EAR);
  pen.clipped(EAR, () => {
    dab(ctx, -100, -70, 24, '200,86,72', 0.25);
    // The hollow of the concha, deep in shade.
    const bowl = resample([{ x: -84, y: -80 }, { x: -94, y: -88 }, { x: -102, y: -76 }, { x: -100, y: -56 }, { x: -90, y: -46 }, { x: -85, y: -56 }], 16);
    softLine(ctx, [...bowl, bowl[0]!], 7, '#7a3f2a', 0.35, 5);
    dab(ctx, -92, -66, 13, '90,36,22', 0.5);
    dab(ctx, -90, -62, 7, '40,14,8', 0.45);
    // The helix rim catching the light, the shadow inside it.
    const rim = EAR.filter((p) => p.y < -36 && p.x < -86).map((p) => ({ x: p.x + (p.x < -105 ? 4 : 2), y: p.y + 3.5 }));
    softLine(ctx, rim, 4, '#5e2f1f', 0.4, 4);
    pen.hair(rim.map((p) => ({ x: p.x - 3, y: p.y - 2.5 })), px(k, 1.8), '#f2c4a4', 0.5);
  });
  const lines: readonly (readonly Pt[])[] = [
    [{ x: -88, y: -100 }, { x: -102, y: -101 }, { x: -112, y: -88 }, { x: -113, y: -66 }, { x: -106, y: -48 }],
    [{ x: -90, y: -94 }, { x: -101, y: -88 }, { x: -104, y: -70 }, { x: -100, y: -52 }, { x: -93, y: -42 }],
    [{ x: -82, y: -60 }, { x: -86, y: -64 }, { x: -85, y: -70 }],
  ];
  lines.forEach((l, i) => pen.hair(resample(l, 14), px(k, i === 2 ? 1.4 : 1.1), INK, 0.6));
  pen.stroke(EAR, px(k, 1.9), INK, 1, true);
}

/** Short hair growing out from the crown in strands, lit along the top. */
function paintHair(k: Brush): void {
  const { ctx, pen } = k;
  pen.fill(HAIR, HAIR_BASE, 1);
  pen.clipped(HAIR, () => {
    const g = ctx.createLinearGradient(40, -270, -200, -20);
    g.addColorStop(0, 'rgba(126,92,64,0.6)');
    g.addColorStop(0.45, 'rgba(126,92,64,0.1)');
    g.addColorStop(1, 'rgba(14,8,5,0.55)');
    ctx.fillStyle = g;
    ctx.fillRect(-240, -280, 310, 280);
    dab(ctx, -40, -258, 70, '170,130,96', 0.3);
    // Locks: broad soft strokes in the direction of growth, light on top, dark between.
    for (let i = 0; i < 60; i++) {
      const x = -230 + pen.rng() * 280;
      const y = -270 + pen.rng() * 250;
      const a = Math.atan2(y - CROWN.y, x - CROWN.x);
      const len = 18 + pen.rng() * 22;
      const lock = [{ x, y }, { x: x + Math.cos(a) * len, y: y + Math.sin(a) * len }];
      softLine(ctx, lock, 6, pen.rng() < 0.4 ? '#7a5a3e' : '#140c07', 0.1, 4);
    }
    for (let i = 0; i < 900; i++) {
      const x = -236 + pen.rng() * 296;
      const y = -274 + pen.rng() * 260;
      const a = Math.atan2(y - CROWN.y, x - CROWN.x) + (pen.rng() - 0.5) * 0.35;
      const len = 7 + pen.rng() * 13;
      const bend = (pen.rng() - 0.5) * 3;
      const light = pen.rng() < 0.45;
      const lit = step01(-(y + 200 - x * 0.3), 0, 120);
      pen.hair(
        [{ x, y }, { x: x + Math.cos(a) * len * 0.5 - Math.sin(a) * bend, y: y + Math.sin(a) * len * 0.5 + Math.cos(a) * bend }, { x: x + Math.cos(a) * len, y: y + Math.sin(a) * len }],
        px(k, 0.9),
        light ? '#9a7656' : '#140c08',
        light ? 0.16 + 0.22 * (1 - lit) : 0.4,
      );
    }
  });
  // The hairline thins onto the skin: fine short hairs over the edge.
  const edge = resample(HAIRLINE, 70);
  edge.forEach((p, i) => {
    const q = edge[Math.min(edge.length - 1, i + 1)]!;
    const a = Math.atan2(p.y - CROWN.y, p.x - CROWN.x);
    const len = 4 + pen.rng() * 4;
    taper(ctx, [{ x: (p.x + q.x) / 2 - Math.cos(a) * 3, y: (p.y + q.y) / 2 - Math.sin(a) * 3 }, { x: p.x + Math.cos(a) * len * 0.4, y: p.y + Math.sin(a) * len * 0.4 }], px(k, 1.3), px(k, 0.3), HAIR_BASE, 0.55);
  });
  const outer = HAIR.slice(0, HAIR.findIndex((p) => p.x === -196 && p.y === -18) + 1);
  pen.stroke(outer, px(k, 2.4), INK, 1, true);
  pen.hair(HAIRLINE.filter((p) => p.y < -110), px(k, 0.9), INK, 0.35);
}

function paintBrow(k: Brush): void {
  const { ctx, pen } = k;
  softLine(ctx, BROW, 6, '#3a281c', 0.6, 5);
  const pts = resample(BROW, 34);
  pts.forEach((p, i) => {
    const u = i / (pts.length - 1);
    const a = -0.35 + 0.25 * u + (pen.rng() - 0.5) * 0.3;
    const len = 4 + 3 * Math.sin(Math.PI * Math.min(1, u * 1.3)) + pen.rng() * 2;
    const off = (pen.rng() - 0.5) * 3;
    taper(ctx, [{ x: p.x - 2, y: p.y + off + 1.5 }, { x: p.x - 2 + Math.cos(a) * len, y: p.y + off + 1.5 + Math.sin(a) * len }], px(k, 1.6), px(k, 0.3), '#1c120c', 0.85);
  });
}

/** The modelling that makes it a face: nose wing and nostril, the fold to the mouth, the corner crease, the brow ridge. */
function paintFeatures(k: Brush): void {
  const { ctx, pen } = k;
  pen.clipped(HEAD, () => {
    // The nostril wing: a shaded curve, the nostril under it.
    const wing = resample([{ x: 58, y: -35 }, { x: 50, y: -37 }, { x: 46.5, y: -42.5 }, { x: 48, y: -48.5 }, { x: 54, y: -50.5 }], 14);
    softLine(ctx, wing.map((p) => ({ x: p.x - 2, y: p.y })), 5, '#6b3523', 0.35, 4);
    softLine(ctx, wing.map((p) => ({ x: p.x + 2.5, y: p.y - 1 })), 4, '#f0bf9c', 0.3, 4);
    pen.hair(wing, px(k, 1.5), INK, 0.8);
    ctx.fillStyle = 'rgba(40,16,10,0.5)';
    ctx.beginPath();
    ctx.ellipse(61, -37.2, 5.5, 1.7, -0.12, 0, Math.PI * 2);
    ctx.fill();
    // The fold from the nose to the mouth, lit on its front edge.
    const fold = resample([{ x: 45, y: -46 }, { x: 34, y: -36 }, { x: 22, y: -26 }, { x: 10, y: -18 }, { x: -2, y: -12 }], 18);
    softLine(ctx, fold.map((p) => ({ x: p.x - 3, y: p.y - 1 })), 7, '#7a3f28', 0.28, 5);
    softLine(ctx, fold.map((p) => ({ x: p.x + 3, y: p.y + 1 })), 5, '#f2c3a0', 0.25, 4);
    pen.hair(fold.slice(2, -4), px(k, 1), INK, 0.35);
    // The cheek bunching at the corner of the mouth.
    softLine(ctx, resample([{ x: -14, y: -2 }, { x: -20, y: -4 }, { x: -24, y: 0 }], 6), 4, '#6a3524', 0.35, 4);
    pen.hair(resample([{ x: -14, y: -1 }, { x: -19, y: -3.5 }, { x: -22, y: -1 }], 6), px(k, 1), INK, 0.4);
    // The brow ridge over the eye, the socket under it, the lid's fold.
    softLine(ctx, resample([{ x: 18, y: -104 }, { x: 34, y: -106 }, { x: 50, y: -104 }], 10), 6, '#6a3524', 0.3, 4);
    // The cheekbone's long light, the temple's shade, the line of the jaw muscle.
  });
  // The philtrum's ridge and the lip's border.
  pen.hair(resample([{ x: 49.5, y: -32 }, { x: 51, y: -27 }, { x: 55, y: -22 }], 6), px(k, 0.9), '#7a3c2c', 0.45);
}

function paintHead(k: Brush): void {
  const { pen } = k;
  skinWash(k, HEAD);
  paintFeatures(k);
  paintTeeth(k, UPPER_TEETH, 1);
  paintGum(k, UPPER_TEETH, 1);
  shadeCorner(k);
  paintLip(k, LIP_TOP, -1, (x) => 1.2 + 5.2 * step01(x, -14, 50), HEAD);
  paintHair(k);
  paintEar(k);
  paintBrow(k);
  pen.stroke(FACE, px(k, 2.4), INK, 1, true);
  pen.stroke(LIP_TOP, px(k, 1.4), INK, 0.9, false);
}

// ---------------------------------------------------------------- the lower jaw

function paintJaw(k: Brush): void {
  const { ctx, pen } = k;
  skinWash(k, JAW);
  pen.clipped(JAW, () => {
    // Under the bone the skin turns down, away from the light.
    softLine(ctx, MANDIBLE.map((p) => ({ x: p.x, y: p.y + 12 })), 26, '#6e3a26', 0.3, 7);
    softLine(ctx, MANDIBLE.map((p) => ({ x: p.x, y: p.y - 5 })), 8, '#f0c19e', 0.14, 5);
    // The fold under the lower lip, the round of the chin.
    softLine(ctx, resample([{ x: 46, y: 28 }, { x: 38, y: 30.5 }, { x: 28, y: 29 }], 8), 5, '#6a3524', 0.3, 4);
    dab(ctx, 44, 46, 12, '255,224,196', 0.25);
  });
  // Its top edge behind the corner of the mouth melts into the cheek above (the head's own skin runs on under it).
  ctx.save();
  ctx.globalCompositeOperation = 'destination-out';
  softLine(ctx, resample([HINGE, { x: CORNER.x - 6, y: CORNER.y - 5 }], 12), 12, '#000', 0.9, 6);
  ctx.restore();
  paintTeeth(k, LOWER_TEETH, -1);
  paintGum(k, LOWER_TEETH, -1);
  shadeCorner(k);
  paintLip(k, LIP_BOT, 1, (x) => 1.5 + 7.5 * step01(x, -14, 50), JAW);
  pen.hair(resample([{ x: 47, y: 28.5 }, { x: 41, y: 30.5 }, { x: 34, y: 29.5 }], 8), px(k, 1), INK, 0.4);
  pen.stroke(LIP_BOT, px(k, 1.4), INK, 0.9, false);
  const front = CHIN.filter((p) => p.x > 4);
  pen.stroke(front, px(k, 2.4), INK, 1, true);
}

// ---------------------------------------------------------------- the neck and shirt

function paintShirt(k: Brush): void {
  const { ctx, pen } = k;
  pen.fill(SHIRT, SHIRT_BASE, 1);
  pen.clipped(SHIRT, () => {
    const g = ctx.createLinearGradient(30, 150, -450, 330);
    g.addColorStop(0, 'rgba(206,224,240,0.4)');
    g.addColorStop(0.35, 'rgba(206,224,240,0.05)');
    g.addColorStop(0.6, 'rgba(18,28,42,0)');
    g.addColorStop(1, 'rgba(18,28,42,0.5)');
    ctx.fillStyle = g;
    ctx.fillRect(-460, 130, 480, 230);
    // The neck's shadow on the cloth, the light along the shoulder's top.
    softLine(ctx, NECKLINE.map((p) => ({ x: p.x, y: p.y + 14 })), 22, '#1e2a3a', 0.35, 6);
    softLine(ctx, SHIRT_BACK.filter((p) => p.y < 240).map((p) => ({ x: p.x + 6, y: p.y + 12 })), 22, '#dbe8f3', 0.3, 6);
    // Folds: drapes from the shoulder down across the chest, each a shade with a light beside it.
    const folds: readonly (readonly Pt[])[] = [
      [{ x: -300, y: 345 }, { x: -236, y: 250 }, { x: -160, y: 184 }],
      [{ x: -196, y: 345 }, { x: -150, y: 270 }, { x: -104, y: 194 }],
      [{ x: -70, y: 340 }, { x: -78, y: 270 }, { x: -72, y: 190 }],
      [{ x: -392, y: 340 }, { x: -382, y: 270 }, { x: -372, y: 210 }],
    ];
    for (const f of folds) {
      const line = resample(f, 16);
      softLine(ctx, line, 18, '#22324a', 0.14, 6);
      softLine(ctx, line.map((p) => ({ x: p.x + 10, y: p.y + 2 })), 9, '#d2e2f0', 0.1, 4);
      pen.hair(line.slice(4, -4), px(k, 0.8), '#1a2638', 0.18);
    }
    pen.stipple(SHIRT, 1800, () => 0.4, px(k, 0.5), '#2a3a52');
    // The sleeve's seam and the shoulder's.
    const sleeve = resample([{ x: -344, y: 162 }, { x: -358, y: 222 }, { x: -357, y: 290 }, { x: -350, y: 350 }], 20);
    pen.hair(sleeve, px(k, 1.1), '#1a2638', 0.6);
    pen.hair(sleeve.map((p) => ({ x: p.x + 2.5, y: p.y })), px(k, 1), '#dbe8f3', 0.3);
    pen.hair(resample([{ x: -212, y: 119 }, { x: -278, y: 140 }, { x: -344, y: 162 }], 12), px(k, 1), '#1a2638', 0.4);
  });
  // The ribbed crew neck.
  const band = [...NECKLINE, ...[...NECKLINE].reverse().map((p) => ({ x: p.x, y: p.y + 9 }))];
  pen.fill(band, RIB, 1);
  pen.clipped(band, () => {
    for (const p of resample(NECKLINE, 70)) pen.hair([{ x: p.x, y: p.y }, { x: p.x - 0.6, y: p.y + 9 }], px(k, 0.8), '#2b3e55', 0.35);
    softLine(ctx, NECKLINE.map((p) => ({ x: p.x, y: p.y + 2 })), 4, '#dbe8f3', 0.25, 3);
  });
  pen.hair(NECKLINE.map((p) => ({ x: p.x, y: p.y + 9 })), px(k, 1), INK, 0.55);
  pen.stroke(NECKLINE, px(k, 1.8), INK, 1, false);
  pen.stroke(SHIRT_FRONT, px(k, 2.4), INK, 1, true);
  pen.stroke(SHIRT_BACK, px(k, 2.4), INK, 1, true);
}

function paintNeck(k: Brush): void {
  const { ctx, pen } = k;
  skinWash(k, NECK);
  pen.clipped(NECK, () => {
    // Below the jaw the neck turns from the light: darker downward and toward the back, the throat's front lit.
    const down = ctx.createLinearGradient(0, 0, 0, 90);
    down.addColorStop(0, 'rgba(90,44,26,0)');
    down.addColorStop(1, 'rgba(90,44,26,0.18)');
    ctx.fillStyle = down;
    ctx.fillRect(-240, 0, 240, 240);
    const across = ctx.createLinearGradient(-20, 0, -200, 0);
    across.addColorStop(0, 'rgba(255,222,192,0.25)');
    across.addColorStop(0.3, 'rgba(255,222,192,0)');
    ctx.fillStyle = across;
    ctx.fillRect(-240, 40, 240, 200);
    // The jaw's shadow across the top of the neck.
    softLine(ctx, MANDIBLE.filter((p) => p.x > -50).map((p) => ({ x: p.x - 6, y: p.y + 14 })), 30, '#4a2416', 0.32, 7);
    // The long neck muscle from behind the ear to the notch of the collarbone.
    const muscle = resample([{ x: -100, y: 6 }, { x: -82, y: 40 }, { x: -56, y: 100 }, { x: -44, y: 150 }], 18);
    softLine(ctx, muscle, 16, '#e6b08c', 0.22, 5);
    softLine(ctx, muscle.map((p) => ({ x: p.x - 13, y: p.y + 2 })), 14, '#5a2e1c', 0.2, 5);
    pen.hair(muscle.slice(4).map((p) => ({ x: p.x - 7, y: p.y })), px(k, 0.9), INK, 0.2);
    dab(ctx, -27, 105, 8, '255,220,190', 0.3);
    softLine(ctx, NAPE.map((p) => ({ x: p.x + 8, y: p.y })), 16, '#4a2416', 0.25, 5);
  });
  pen.stroke(THROAT, px(k, 2.2), INK, 1, true);
  pen.stroke(NAPE, px(k, 2.2), INK, 1, true);
  paintShirt(k);
  // The bust fades out below.
  ctx.save();
  ctx.globalCompositeOperation = 'destination-out';
  const g = ctx.createLinearGradient(0, FADE_FROM, 0, FADE_TO);
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(1, 'rgba(0,0,0,1)');
  ctx.fillStyle = g;
  ctx.fillRect(NECK_BOX.x0, FADE_FROM, NECK_BOX.x1 - NECK_BOX.x0, NECK_BOX.y1 - FADE_FROM);
  ctx.restore();
}

// ---------------------------------------------------------------- sprites

const BUCKETS: readonly Bucket[] = [{ res: 0.5, w: 1.5 }, { res: 1.05, w: 1.2 }, { res: 2, w: 1 }, { res: 3.4, w: 1 }];
const bucketFor = (s: number): Bucket => BUCKETS.find((b) => b.res >= s * 0.92) ?? BUCKETS[BUCKETS.length - 1]!;

interface Sprites {
  readonly head: readonly HTMLCanvasElement[];
  readonly jaw: readonly HTMLCanvasElement[];
  readonly neck: readonly HTMLCanvasElement[];
}

const sprites = lazily((b: Bucket): Sprites => ({
  head: frames(HEAD_BOX, b, 41011, paintHead),
  jaw: frames(JAW_BOX, b, 42023, paintJaw),
  neck: frames(NECK_BOX, b, 43037, paintNeck),
}));

/** Bakes the middle size (the others bake the first time they're needed). */
export async function prepare(): Promise<void> {
  sprites(BUCKETS[2]!);
}

// ---------------------------------------------------------------- on screen

/** The inside of the mouth as the jaw drops: dark, the tongue low in it. */
function drawMouth(ctx: CanvasRenderingContext2D, open: number): void {
  const lower = [...LIP_BOT].reverse().map((p) => turn(p, HINGE, open));
  const top = LIP_TOP[0]!;
  const tip = lower[lower.length - 1]!;
  const far = Array.from({ length: 9 }, (_, i) => {
    const u = i / 8;
    return { x: tip.x + (top.x - tip.x) * u - 5 * Math.sin(Math.PI * u), y: tip.y + (top.y - tip.y) * u };
  });
  const shape = [...LIP_TOP, ...lower, ...far.slice(1, -1)];
  ctx.save();
  path(ctx, shape);
  const g = ctx.createLinearGradient(46, 0, -14, 0);
  g.addColorStop(0, '#6e2c2a');
  g.addColorStop(0.6, '#3a1312');
  g.addColorStop(1, '#1a0707');
  ctx.fillStyle = g;
  ctx.fill();
  ctx.clip();
  const tongue = turn({ x: 16, y: 7 }, HINGE, open);
  ctx.fillStyle = 'rgba(176,92,90,0.9)';
  ctx.beginPath();
  ctx.ellipse(tongue.x, tongue.y, 30, 7.5, open, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(232,150,140,0.35)';
  ctx.beginPath();
  ctx.ellipse(tongue.x + 4, tongue.y - 3, 16, 2, open, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  if (open > 0.01) line(ctx, far, 1.2 / screenScale(ctx), '#5a2a26', 0.8);
}

/** 0 open .. 1 shut: a quick blink every few seconds. */
function blinkAt(t: number): number {
  const phase = (((t - 3.3) % 3.9) + 3.9) % 3.9;
  return phase < 0.2 ? Math.sin((phase / 0.2) * Math.PI) : 0;
}

function line(ctx: CanvasRenderingContext2D, pts: readonly Pt[], width: number, colour: string, alpha: number): void {
  ctx.save();
  ctx.strokeStyle = colour;
  ctx.globalAlpha = alpha;
  ctx.lineWidth = width;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  pts.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
  ctx.stroke();
  ctx.restore();
}

/** The eye, live so it can blink: the white shaded toward the back, a brown iris seen side on, the catchlight; lids and lashes. */
function drawEye(ctx: CanvasRenderingContext2D, shut: number, lw: number): void {
  const lowAt = (x: number): number => edgeAt(LOWER_LID, x);
  const lid = UPPER_LID.map((p) => ({ x: p.x, y: p.y + (lowAt(p.x) - p.y) * shut * 0.96 }));
  const eye = [...lid, ...[...LOWER_LID].reverse().slice(1, -1)];
  ctx.save();
  path(ctx, eye);
  const white = ctx.createLinearGradient(EYE_BACK.x, 0, EYE_FRONT.x, 0);
  white.addColorStop(0, '#b9a596');
  white.addColorStop(0.55, '#ece4da');
  white.addColorStop(1, '#f4efe8');
  ctx.fillStyle = white;
  ctx.fill();
  ctx.clip();
  const iris = ctx.createRadialGradient(IRIS.x + 0.6, IRIS.y + 1.5, 0.3, IRIS.x, IRIS.y, 6);
  iris.addColorStop(0, '#8a5a30');
  iris.addColorStop(0.55, '#55361c');
  iris.addColorStop(1, '#22150b');
  ctx.fillStyle = iris;
  ctx.beginPath();
  ctx.ellipse(IRIS.x, IRIS.y, 3.6, 5.9, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#0a0605';
  ctx.beginPath();
  ctx.ellipse(IRIS.x + 1.2, IRIS.y, 1.5, 2.8, 0, 0, Math.PI * 2);
  ctx.fill();
  // The upper lid's shadow on the eye, then the catchlight.
  const shade = ctx.createLinearGradient(0, -100, 0, -90);
  shade.addColorStop(0, 'rgba(60,30,20,0.55)');
  shade.addColorStop(1, 'rgba(60,30,20,0)');
  ctx.fillStyle = shade;
  ctx.fillRect(EYE_BACK.x, -102, EYE_FRONT.x - EYE_BACK.x + 2, 12);
  ctx.fillStyle = 'rgba(255,255,255,0.95)';
  ctx.beginPath();
  ctx.ellipse(IRIS.x + 1.9, IRIS.y - 2.4, 1.05, 1.3, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  // The lid closing over it: skin, its edge inked.
  if (shut > 0.02) {
    const cover = [...UPPER_LID.map((p) => ({ x: p.x, y: p.y - 1.2 })), ...[...lid].reverse()];
    ctx.save();
    path(ctx, cover);
    ctx.fillStyle = '#c48663';
    ctx.fill();
    ctx.restore();
  }
  // The lid's fold above, lit under it.
  const fold = UPPER_LID.slice(2, -2).map((p) => ({ x: p.x + 0.5, y: p.y - 4.6 + shut * 2 }));
  line(ctx, fold, 1.1 * lw, INK, 0.45);
  line(ctx, fold.map((p) => ({ x: p.x, y: p.y + 1.6 })), 1.4 * lw, '#efc2a0', 0.35);
  line(ctx, lid, 2.1 * lw, INK, 1);
  line(ctx, LOWER_LID, 1 * lw, INK, 0.55);
  line(ctx, LOWER_LID.slice(1, -1).map((p) => ({ x: p.x, y: p.y + 1.3 })), 1.2 * lw, '#f0c8aa', 0.35);
  // Lashes off the front of the upper lid.
  lid.filter((p) => p.x > 28).forEach((p, i) => {
    const a = -1.1 + i * 0.12 + shut * 1.2;
    const len = 2.6 + (i % 2) * 0.8;
    line(ctx, [p, { x: p.x + Math.cos(a) * len * 0.6 + 0.6, y: p.y + Math.sin(a) * len * 0.5 }, { x: p.x + Math.cos(a) * len + 1.2, y: p.y + Math.sin(a) * len }], 0.9 * lw, INK, 0.85);
  });
}

/** The head in profile facing right, placed by its bite point (the first molars); see contract.ts. */
export const drawHuman: DrawHead = (ctx, p) => {
  const u = p.size / LEN;
  const screen = u * screenScale(ctx);
  const bucket = bucketFor(screen);
  const s = sprites(bucket);
  const f = ((Math.floor(p.t * BOIL_FPS) % BOIL_FRAMES) + BOIL_FRAMES) % BOIL_FRAMES;
  const open = Math.max(0, Math.min(1, p.jaw)) * JAW_MAX;
  const breath = 1.4 * Math.sin((p.t * Math.PI * 2) / 4.4);
  const box = (b: { readonly x0: number; readonly x1: number; readonly y0: number; readonly y1: number }): Box => b;
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.scale(u, u);
  ctx.save();
  ctx.translate(0, breath);
  blit(ctx, s.neck[f]!, box(NECK_BOX), bucket.res);
  ctx.restore();
  drawMouth(ctx, open);
  blit(ctx, s.head[f]!, box(HEAD_BOX), bucket.res);
  ctx.save();
  ctx.translate(HINGE.x, HINGE.y);
  ctx.rotate(open);
  ctx.translate(-HINGE.x, -HINGE.y);
  blit(ctx, s.jaw[f]!, box(JAW_BOX), bucket.res);
  ctx.restore();
  drawEye(ctx, blinkAt(p.t), 1 / screen);
  ctx.restore();
};

export const KIT: KitEntry = {
  name: 'human',
  draw: (ctx, w, h, t) => drawHuman(ctx, { x: w * 0.72, y: h * 0.55, size: Math.min(w, h) * 0.55, jaw: 0.5 + 0.5 * Math.sin(t * 2), t }),
};
