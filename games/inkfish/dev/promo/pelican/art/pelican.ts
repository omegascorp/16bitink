import { add, BILL_LEN, BILL_ROOT, BILL_TIP, headToOwn, HINGE, jawToHead, POUCH_LEN, pouchDepth, rot, type PelicanHead, type PelicanPose, type Pt } from '../rig';
import { dab, smoothLoop, softLine, taper } from '../../seal/art/paint';
import { band, cubic, fillShape, inkLine, seeded, unitPx, within } from './ink';

/**
 * The pelican, painted to the bar of ../../foodchain/art/greatWhite.ts and
 * ../../seal/art: a big white body in layered washes (warm white on the back,
 * a pale-pink blush on the breast, a buff-yellow patch at the base of the
 * neck, cool lilac shadow underneath with green bounce off the grass), the
 * folded wing with its black flight feathers at the tips, a long S neck, a
 * small head with a shaggy nape, bare pinkish skin round a dark red-brown eye
 * with a catchlight, a long pale-yellow to orange bill with a hooked red nail,
 * and the stretchy yellow-orange pouch with fine veins, which can hang slack,
 * bulge round three jugs, or stretch round a capybara pup's head and shoulders.
 *
 * Own units: facing right (+x forward), y down, feet on the ground at 0,0;
 * about 300 long without the bill and 330 tall standing.
 */

export interface PelicanExtras {
  /** Drawn in world space inside the open mouth, before the pouch's skin. */
  readonly inGape?: (ctx: CanvasRenderingContext2D) => void;
  /** Drawn in the lower jaw's frame (x along the jaw, y down into the pouch), under the pouch's skin. */
  readonly inPouch?: (ctx: CanvasRenderingContext2D) => void;
}

// ---------------------------------------------------------------- shapes

const BODY = smoothLoop([
  { x: 98, y: -190 }, { x: 62, y: -208 }, { x: 0, y: -212 }, { x: -62, y: -200 }, { x: -112, y: -176 }, { x: -142, y: -154 }, { x: -176, y: -142 },
  { x: -166, y: -126 }, { x: -122, y: -108 }, { x: -62, y: -84 }, { x: 0, y: -72 }, { x: 56, y: -80 }, { x: 102, y: -102 }, { x: 124, y: -134 }, { x: 122, y: -168 },
], 6);

const WING = smoothLoop([
  { x: 86, y: -180 }, { x: 56, y: -202 }, { x: 0, y: -208 }, { x: -62, y: -198 }, { x: -114, y: -176 }, { x: -158, y: -158 }, { x: -206, y: -146 },
  { x: -176, y: -134 }, { x: -122, y: -128 }, { x: -60, y: -124 }, { x: 0, y: -130 }, { x: 50, y: -146 }, { x: 78, y: -162 },
], 6);

const COVERTS = smoothLoop([
  { x: 86, y: -180 }, { x: 56, y: -202 }, { x: 0, y: -208 }, { x: -62, y: -198 }, { x: -110, y: -178 }, { x: -136, y: -164 },
  { x: -112, y: -154 }, { x: -64, y: -148 }, { x: -16, y: -150 }, { x: 32, y: -158 }, { x: 70, y: -168 },
], 6);

const NECK_BASE: Pt = { x: 74, y: -166 };
const LEAN_PIVOT: Pt = { x: 0, y: -90 };
const HIPS: readonly Pt[] = [{ x: -14, y: -86 }, { x: 22, y: -86 }];

const HEAD = smoothLoop([
  { x: -34, y: -2 }, { x: -30, y: -20 }, { x: -14, y: -30 }, { x: 6, y: -31 }, { x: 22, y: -23 }, { x: 33, y: -12 }, { x: 33, y: 8 }, { x: 20, y: 19 }, { x: 0, y: 23 }, { x: -20, y: 20 }, { x: -32, y: 10 },
], 5);
const FACE_SKIN = smoothLoop([{ x: -4, y: -14 }, { x: 10, y: -19 }, { x: 30, y: -13 }, { x: 33, y: 5 }, { x: 18, y: 7 }, { x: 2, y: 3 }, { x: -6, y: -5 }], 5);
const EYE: Pt = { x: 9, y: -7 };
const TIP = BILL_TIP;

const UPPER: Pt[] = [
  ...smoothLoop([
    { x: 24, y: -16 }, { x: 90, y: -14 }, { x: 180, y: -10 }, { x: TIP - 18, y: -7 }, { x: TIP - 4, y: -5 }, { x: TIP + 3, y: 1 }, { x: TIP + 1, y: 10 }, { x: TIP - 5, y: 14 },
    { x: TIP - 9, y: 8 }, { x: TIP - 16, y: 3 }, { x: 180, y: 5 }, { x: 90, y: 7 }, { x: 28, y: 9 },
  ], 4),
];
const NAIL = smoothLoop([{ x: TIP - 14, y: -6 }, { x: TIP - 3, y: -5 }, { x: TIP + 3, y: 1 }, { x: TIP + 1, y: 10 }, { x: TIP - 5, y: 14 }, { x: TIP - 9, y: 8 }, { x: TIP - 15, y: 3 }], 4);

const turnAbout = (p: Pt, o: Pt, a: number): Pt => add(o, rot({ x: p.x - o.x, y: p.y - o.y }, a));

// ---------------------------------------------------------------- legs

const LEG = '#eda35e';
const LEG_LIT = '#f7c487';
const LEG_DARK = '#c27a3e';

function paintLeg(ctx: CanvasRenderingContext2D, hip: Pt, foot: Pt, lift: number, boil: number, far: boolean): void {
  const knee = { x: (hip.x + foot.x) / 2 - 8, y: (hip.y + foot.y) / 2 - 4 };
  const tone = far ? LEG_DARK : LEG;
  taper(ctx, [hip, knee, { x: foot.x, y: foot.y - 6 }], 24, 14, tone, 1);
  taper(ctx, [{ x: hip.x + 3, y: hip.y }, { x: knee.x + 3, y: knee.y }, { x: foot.x + 2, y: foot.y - 6 }], 5, 3, far ? LEG : LEG_LIT, 0.7);
  // The webbed foot, toes forward, a little curled when lifted.
  const curl = lift * 8;
  const web = smoothLoop([
    { x: foot.x - 8, y: foot.y - 8 }, { x: foot.x + 18, y: foot.y - 6 - curl }, { x: foot.x + 40, y: foot.y - 2 - curl * 1.4 }, { x: foot.x + 36, y: foot.y + 2 - curl },
    { x: foot.x + 20, y: foot.y + 1 - curl * 0.6 }, { x: foot.x - 10, y: foot.y }, { x: foot.x - 14, y: foot.y - 4 },
  ], 4);
  const g = ctx.createLinearGradient(foot.x, foot.y - 10, foot.x, foot.y + 2);
  g.addColorStop(0, far ? LEG_DARK : LEG_LIT);
  g.addColorStop(1, LEG_DARK);
  fillShape(ctx, web, g);
  for (const dx of [14, 26]) inkLine(ctx, [{ x: foot.x - 4, y: foot.y - 5 }, { x: foot.x + dx, y: foot.y - 2 - curl * 0.8 }], 0.9, 0.35, boil);
  inkLine(ctx, web, 1.2, 0.6, boil, true);
  inkLine(ctx, [hip, knee, { x: foot.x, y: foot.y - 6 }].map((p) => ({ x: p.x - 8, y: p.y })), 1.1, 0.45, boil);
}

function feet(p: PelicanPose): { readonly foot: Pt; readonly lift: number }[] {
  const [step, walk] = [p.step, p.walk];
  return HIPS.map((hip, i) => {
    const ph = step + i * Math.PI;
    const lift = Math.max(0, Math.sin(ph)) * walk;
    return { foot: { x: hip.x + 4 + 26 * Math.cos(ph) * walk, y: -lift * 16 }, lift };
  });
}

// ---------------------------------------------------------------- body

function paintBody(ctx: CanvasRenderingContext2D, boil: number): void {
  const px = unitPx(ctx);
  within(ctx, BODY, () => {
    const g = ctx.createLinearGradient(0, -214, 0, -70);
    g.addColorStop(0, '#fffefa');
    g.addColorStop(0.35, '#fcf5f0');
    g.addColorStop(0.62, '#f4e4e1');
    g.addColorStop(0.85, '#d9d2df');
    g.addColorStop(1, '#c2c1d2');
    ctx.fillStyle = g;
    ctx.fillRect(-220, -230, 380, 180);
    dab(ctx, 100, -138, 62, '247,196,188', 0.5);
    dab(ctx, 114, -170, 30, '246,212,136', 0.55);
    dab(ctx, -10, -78, 90, '138,136,170', 0.32);
    dab(ctx, 10, -206, 100, '255,255,255', 0.7);
    dab(ctx, 30, -72, 60, '170,204,128', 0.2);
    dab(ctx, -150, -136, 30, '120,118,150', 0.3);
    // Soft breast feathers, rows of small arcs following the round of the body.
    ctx.lineCap = 'round';
    for (let row = 0; row < 6; row++) {
      for (let i = 0; i < 8; i++) {
        const x = 118 - row * 9 - i * 4;
        const y = -170 + i * 11 + row * 2;
        ctx.strokeStyle = (row + i) % 3 ? 'rgba(160,140,170,0.22)' : 'rgba(255,255,255,0.5)';
        ctx.lineWidth = 1.1 * px;
        ctx.beginPath();
        ctx.arc(x, y, 6, 0.3 * Math.PI, 1.05 * Math.PI);
        ctx.stroke();
      }
    }
  });
  inkLine(ctx, BODY, 1.7, 0.7, boil, true);
}

function paintWing(ctx: CanvasRenderingContext2D, boil: number): void {
  const px = unitPx(ctx);
  // The black flight feathers first, then the white coverts over them.
  const g = ctx.createLinearGradient(-200, -150, 60, -130);
  g.addColorStop(0, '#1d1c22');
  g.addColorStop(0.6, '#2c2a33');
  g.addColorStop(1, '#4a4652');
  fillShape(ctx, WING, g);
  within(ctx, WING, () => {
    for (let i = 0; i < 7; i++) {
      const x0 = 30 - i * 26;
      softLine(ctx, [{ x: x0, y: -150 + i * 1.5 }, { x: x0 - 60, y: -140 + i * 0.5 }, { x: -206 + i * 3, y: -146 + i * 0.6 }], 2.2 * px, '#8c8896', 0.5, 2);
    }
    softLine(ctx, [{ x: 40, y: -152 }, { x: -60, y: -140 }, { x: -180, y: -146 }], 10, '#6b6676', 0.35, 4);
  });
  inkLine(ctx, WING, 1.4, 0.7, boil, true);
  const c = ctx.createLinearGradient(0, -210, 0, -146);
  c.addColorStop(0, '#fffefb');
  c.addColorStop(0.7, '#f3ecee');
  c.addColorStop(1, '#ddd6e2');
  fillShape(ctx, COVERTS, c);
  within(ctx, COVERTS, () => {
    dab(ctx, 0, -204, 70, '255,255,255', 0.8);
    dab(ctx, -90, -162, 40, '170,160,190', 0.3);
    ctx.lineCap = 'round';
    for (let row = 0; row < 4; row++) {
      for (let i = 0; i < 9; i++) {
        const x = 70 - i * 22 - row * 6;
        const y = -190 + row * 11 + i * 2.2;
        ctx.strokeStyle = 'rgba(130,120,150,0.3)';
        ctx.lineWidth = 1.1 * px;
        ctx.beginPath();
        ctx.arc(x, y, 9, 0.25 * Math.PI, 0.95 * Math.PI);
        ctx.stroke();
      }
    }
  });
  // The scalloped edge where the coverts lie over the black.
  const edge = COVERTS.slice(Math.floor(COVERTS.length * 0.52));
  inkLine(ctx, edge, 1.3, 0.6, boil);
}

// ---------------------------------------------------------------- neck

function paintNeck(ctx: CanvasRenderingContext2D, base: Pt, h: PelicanHead, boil: number): void {
  const attach = headToOwn(h, { x: -12, y: 6 });
  const dist = Math.hypot(attach.x - base.x, attach.y - base.y);
  // One smooth arc, bowed up and back.
  const d = { x: (attach.x - base.x) / (dist || 1), y: (attach.y - base.y) / (dist || 1) };
  const n = -d.y - d.x > d.y + d.x ? { x: d.y, y: -d.x } : { x: -d.y, y: d.x };
  const mid = { x: (base.x + attach.x) / 2 + n.x * dist * 0.32, y: (base.y + attach.y) / 2 + n.y * dist * 0.32 };
  const line = cubic(base, { x: (base.x + 2 * mid.x) / 3, y: (base.y + 2 * mid.y) / 3 }, { x: (attach.x + 2 * mid.x) / 3, y: (attach.y + 2 * mid.y) / 3 }, attach, 22);
  const { shape, left, right } = band(line, 58, 30);
  fillShape(ctx, shape, '#fbf6f2');
  within(ctx, shape, () => {
    softLine(ctx, left, 16, '#ffffff', 0.85, 4);
    softLine(ctx, right, 18, '#cdc6d8', 0.55, 5);
    softLine(ctx, line.slice(0, 8), 40, '#f5d79a', 0.35, 4);
    for (let i = 3; i < line.length - 2; i += 2) {
      const p = line[i]!;
      dab(ctx, p.x, p.y, 10, i % 4 ? '255,255,255' : '200,190,210', 0.25);
    }
  });
  inkLine(ctx, left.slice(2, -1), 1.5, 0.62, boil);
  inkLine(ctx, right.slice(2, -1), 1.5, 0.62, boil);
}

// ---------------------------------------------------------------- head

function paintEye(ctx: CanvasRenderingContext2D, alarm: number, squint: number, boil: number): void {
  const { x, y } = EYE;
  const r = 5.4 * (1 + 0.4 * alarm);
  dab(ctx, x, y, 13, '238,160,132', 0.6);
  ctx.fillStyle = '#f2c09c';
  ctx.beginPath();
  ctx.arc(x, y, r + 2.4, 0, Math.PI * 2);
  ctx.fill();
  const iris = ctx.createRadialGradient(x - 1, y - 1, 0.5, x, y, r);
  iris.addColorStop(0, '#b4462c');
  iris.addColorStop(0.7, '#7a2616');
  iris.addColorStop(1, '#3e120a');
  ctx.fillStyle = iris;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#0a0606';
  ctx.beginPath();
  ctx.arc(x + 0.6, y, r * 0.48, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(x - r * 0.3, y - r * 0.38, Math.max(0.9, r * 0.22), 0, Math.PI * 2);
  ctx.fill();
  if (squint > 0.01) {
    // The lower lid comes up: a sly look.
    const lid = smoothLoop([{ x: x - r - 2.6, y: y + 1 }, { x: x, y: y + r * (1 - 1.15 * squint) }, { x: x + r + 2.6, y: y + 1 }, { x: x + r + 2, y: y + r + 3 }, { x: x - r - 2, y: y + r + 3 }], 4);
    fillShape(ctx, lid, '#f2c09c');
    inkLine(ctx, [{ x: x - r - 1.5, y: y + 0.5 }, { x, y: y + r * (1 - 1.15 * squint) }, { x: x + r + 1.5, y: y + 0.5 }], 1.2, 0.8, boil);
  }
  inkLine(ctx, smoothLoop([{ x: x - r - 1, y }, { x, y: y - r - 1 }, { x: x + r + 1, y }, { x, y: y + r + 1 }], 5), 1.1, 0.8, boil, true);
  if (alarm > 0.05) inkLine(ctx, [{ x: x - 9, y: y - r - 5 - 3 * alarm }, { x: x, y: y - r - 8 - 4 * alarm }, { x: x + 9, y: y - r - 5 - 2 * alarm }], 1.3, 0.75 * alarm, boil);
}

function paintHead(ctx: CanvasRenderingContext2D, h: PelicanHead, boil: number): void {
  // The shaggy nape: a few loose white plumes.
  for (const [dx, dy, len] of [[-30, -18, 22], [-33, -10, 18], [-26, -24, 16]] as const) {
    taper(ctx, [{ x: dx + 6, y: dy }, { x: dx - len * 0.6, y: dy - 4 }, { x: dx - len, y: dy - 2 }], 9, 1.5, '#f7f2f0', 1);
  }
  const g = ctx.createLinearGradient(0, -32, 0, 24);
  g.addColorStop(0, '#fffefb');
  g.addColorStop(0.6, '#f6eeee');
  g.addColorStop(1, '#d8d0dc');
  fillShape(ctx, HEAD, g);
  within(ctx, HEAD, () => {
    dab(ctx, -6, -26, 26, '255,255,255', 0.8);
    dab(ctx, -14, 16, 22, '150,146,180', 0.3);
  });
  const skin = ctx.createLinearGradient(0, -18, 30, 6);
  skin.addColorStop(0, '#f6cfae');
  skin.addColorStop(1, '#efab86');
  fillShape(ctx, FACE_SKIN, skin, 0.9);
  inkLine(ctx, HEAD, 1.5, 0.7, boil, true);
  paintEye(ctx, h.alarm, h.squint, boil);
}

function paintUpperBill(ctx: CanvasRenderingContext2D, boil: number): void {
  const g = ctx.createLinearGradient(BILL_ROOT, 0, TIP, 0);
  g.addColorStop(0, '#f5df9e');
  g.addColorStop(0.45, '#f4cc84');
  g.addColorStop(0.8, '#efae78');
  g.addColorStop(1, '#ea9a6a');
  fillShape(ctx, UPPER, g);
  within(ctx, UPPER, () => {
    softLine(ctx, [{ x: 30, y: 7 }, { x: 150, y: 4 }, { x: TIP - 12, y: 3 }], 7, '#c9864e', 0.45, 4);
    softLine(ctx, [{ x: 34, y: -13 }, { x: 150, y: -10 }, { x: TIP - 16, y: -6 }], 4, '#fff8dc', 0.7, 3);
    softLine(ctx, [{ x: 60, y: -3 }, { x: 160, y: -2 }, { x: TIP - 20, y: -1 }], 3, '#e98a62', 0.35, 3);
  });
  const n = ctx.createLinearGradient(TIP - 14, -6, TIP, 14);
  n.addColorStop(0, '#e8714a');
  n.addColorStop(1, '#b8402a');
  fillShape(ctx, NAIL, n);
  dab(ctx, TIP - 6, -2, 3, '255,230,210', 0.7);
  inkLine(ctx, UPPER, 1.5, 0.75, boil, true);
  // The ridge along the top of the bill.
  inkLine(ctx, [{ x: 36, y: -10 }, { x: 140, y: -8 }, { x: TIP - 18, y: -4 }], 0.9, 0.35, boil);
}

/** The inside of the open mouth, between the upper bill and the lower jaw (head frame). */
function paintThroat(ctx: CanvasRenderingContext2D, h: PelicanHead): void {
  if (h.gape < 0.04) return;
  const jaw = [0, 0.25, 0.5, 0.75, 0.95].map((u) => jawToHead(h, { x: u * (BILL_LEN - 6), y: -2 }));
  const shape = [{ x: 18, y: 4 }, { x: TIP - 12, y: 4 }, ...[...jaw].reverse()];
  const g = ctx.createLinearGradient(HINGE.x, 0, HINGE.x + 160, 0);
  g.addColorStop(0, '#9e4a3a');
  g.addColorStop(0.5, '#cf7a5a');
  g.addColorStop(1, '#e49a72');
  fillShape(ctx, shape, g);
}

function pouchShape(h: PelicanHead): Pt[] {
  const len = POUCH_LEN;
  const bottom = Array.from({ length: 61 }, (_, i) => {
    const x = (1 - i / 60) * len;
    return { x, y: 3 + pouchDepth(h, x) };
  });
  return [{ x: -6, y: 0 }, { x: len * 0.5, y: 1 }, { x: len, y: 2 }, ...bottom, { x: -14, y: 4 + h.sack * 0.08 }, { x: -16, y: 2 }];
}

/** The pouch's skin and the lower jaw, in the jaw's frame. */
function paintPouch(ctx: CanvasRenderingContext2D, h: PelicanHead, boil: number): void {
  const px = unitPx(ctx);
  const shape = pouchShape(h);
  const see = h.seeThrough;
  const g = ctx.createLinearGradient(0, 0, 0, Math.max(30, h.sack + 6));
  g.addColorStop(0, '#f8cd68');
  g.addColorStop(0.5, '#f1a94a');
  g.addColorStop(1, '#dc7c3a');
  // Stretched thin, the skin lets what is inside show through its middle; its rim stays thick.
  fillShape(ctx, shape, g, 1 - 0.72 * see);
  within(ctx, shape, () => {
    const bottom = shape.slice(3, shape.length - 2);
    softLine(ctx, bottom, Math.max(10, h.sack * 0.32), '#e8923e', 0.55 * see + 0.2, 6);
    softLine(ctx, [{ x: 0, y: 3 }, { x: BILL_LEN - 10, y: 3 }], Math.max(8, h.sack * 0.16), '#f6c060', 0.5 * see, 4);
    // Fine veins fanning down from the jaw, a sheen on the stretch, a warm shadow at the bottom.
    const rng = seeded(41);
    for (let i = 0; i < 9; i++) {
      const x0 = 20 + i * 24;
      const pts = [{ x: x0, y: 4 }, { x: x0 + (rng() - 0.5) * 20, y: 4 + h.sack * 0.4 }, { x: x0 + (rng() - 0.5) * 34, y: 4 + h.sack * 0.9 }];
      softLine(ctx, pts, 1.6 * px, '#b85a32', 0.3 - 0.12 * see, 2);
    }
    const len = BILL_LEN - 10;
    const peak = h.bulge * len;
    dab(ctx, peak - 40, h.sack * 0.3, Math.max(8, h.sack * 0.22), '255,250,225', 0.35);
    softLine(ctx, [{ x: peak - 90, y: h.sack * 0.95 }, { x: peak, y: h.sack + 2 }, { x: peak + 80, y: h.sack * 0.9 }], Math.max(5, h.sack * 0.14), '#b4582e', 0.3, 5);
  });
  inkLine(ctx, shape.slice(3), 1.3, 0.62, boil);
  // The lower jaw: a thin pale bone along the top of the pouch.
  const jaw = smoothLoop([{ x: -2, y: -4 }, { x: BILL_LEN - 8, y: -2 }, { x: BILL_LEN - 4, y: 1 }, { x: BILL_LEN - 8, y: 4 }, { x: -2, y: 5 }], 3);
  const j = ctx.createLinearGradient(0, 0, BILL_LEN, 0);
  j.addColorStop(0, '#f2d28e');
  j.addColorStop(1, '#ec9e6a');
  fillShape(ctx, jaw, j);
  inkLine(ctx, jaw, 1.2, 0.7, boil, true);
}

// ---------------------------------------------------------------- the whole bird

/** The painted pelican, placed. */
export function drawPelican(ctx: CanvasRenderingContext2D, p: PelicanPose, boil: number, extras: PelicanExtras = {}): void {
  const world = ctx.getTransform();
  const callWorld = (f?: (c: CanvasRenderingContext2D) => void): void => {
    if (!f) return;
    ctx.save();
    ctx.setTransform(world);
    f(ctx);
    ctx.restore();
  };
  const h = p.head;
  const lean = p.lean;
  const walk = p.walk;
  const bob = -5 * Math.abs(Math.sin(p.step)) * walk;
  const roll = 0.035 * Math.sin(p.step) * walk;
  const tilt = lean + roll;
  const legs = feet(p);
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.scale(p.face * p.k, p.k);
  // Shadow on the grass.
  dab(ctx, 0, 2, 150, '40,60,30', 0.28);
  const hips = HIPS.map((hp) => add(turnAbout(hp, LEAN_PIVOT, tilt), { x: 0, y: bob }));
  paintLeg(ctx, hips[0]!, legs[0]!.foot, legs[0]!.lift, boil, true);
  paintNeck(ctx, add(turnAbout(NECK_BASE, LEAN_PIVOT, tilt), { x: 0, y: bob }), h, boil);
  ctx.save();
  ctx.translate(0, bob);
  ctx.translate(LEAN_PIVOT.x, LEAN_PIVOT.y);
  ctx.rotate(tilt);
  ctx.translate(-LEAN_PIVOT.x, -LEAN_PIVOT.y);
  paintBody(ctx, boil);
  paintWing(ctx, boil);
  ctx.restore();
  paintLeg(ctx, hips[1]!, legs[1]!.foot, legs[1]!.lift, boil, false);
  ctx.save();
  ctx.translate(h.x, h.y);
  ctx.rotate(h.a);
  paintThroat(ctx, h);
  callWorld(extras.inGape);
  ctx.save();
  ctx.translate(HINGE.x, HINGE.y);
  ctx.rotate(h.gape);
  if (extras.inPouch) {
    ctx.save();
    extras.inPouch(ctx);
    ctx.restore();
  }
  paintPouch(ctx, h, boil);
  ctx.restore();
  paintHead(ctx, h, boil);
  paintUpperBill(ctx, boil);
  ctx.restore();
  ctx.restore();
}

