import { INK, makeCanvas, Pen, type Pt } from '../../../../src/art/pen';
import { curve, dab, path, screenScale, softLine } from '../../seal/art/paint';
import { BOX as BODY_BOX, makeBodySheet, RES as BODY_RES } from './orcaBody';
import { drawCavity, drawTeeth, type Lips } from './orcaMouth';

/**
 * The close-up: an orca's head coming at us, a touch off head-on, jaws open far
 * past what ../../foodchain/art/orca.ts allows. Painted to that animal's
 * palette and brushwork: the black a deep blue-black with a cool sheen and thin
 * pale ink following the dome round; the big white oval eye patches; a white
 * chin and throat with no pleats (orcas are smooth); the black lip wrapping
 * round from the corners. Baked once where the jaw doesn't change the paint
 * (dome, chin, the body behind), live where it does (the lips, the mouth).
 *
 * Own units: 1000 across, the origin at the middle of the mouth, y down. The
 * mouth runs from corner to corner; `jaw` 0 is a closed smile, 1 the full gape.
 */

export const UNITS = 1000;

const BLACK = '#172033';
const DEEP = '#04070d';
const SHEEN = '#bfd2e8';
const IVORY = '#f3ead4';

/** The corners of the mouth, x and y. */
const W = 440;
const YC = 70;
/** How far the upper and lower lips travel at the full gape. */
const RISE = 420;
const DROP = 330;
const OUTER = W + 46;
const THICK = 205;
/** The small turn of the head: everything's middle pushed this far to the viewer's right. */
export const YAW = 44;

const DOME = { rx: 512, top: 610, cheek: 300, y: 60 } as const;
const EYE = { x: 402, y: -92, r: 31 } as const;

export interface HeadPlace {
  /** The middle of the mouth on screen. */
  readonly x: number;
  readonly y: number;
  /** Px across the head. */
  readonly size: number;
  readonly tilt: number;
  /** 0 closed .. 1 the full gape. */
  readonly jaw: number;
  /** A smug half-shut lid, 0 .. 1. */
  readonly lid: number;
}

/** The turn of the head: the far side pressed, the near side opened out. */
export const warp = (p: Pt): Pt => ({ x: p.x + YAW * Math.max(0, 1 - (p.x / 560) ** 2), y: p.y });

const smile = (x: number): number => 44 * (1 - (x / W) ** 2);
const bulge = (x: number): number => 1 - Math.abs(x / W) ** 3.4;
export const upperLip = (x: number, open: number): number => YC + smile(x) - open * RISE * bulge(x);
export const lowerLip = (x: number, open: number): number => YC + smile(x) + open * DROP * bulge(x);

const SPAN: readonly number[] = Array.from({ length: 45 }, (_, i) => -W + i * ((2 * W) / 44));

export function lipsAt(open: number): Lips {
  return {
    open,
    upper: SPAN.map((x) => warp({ x, y: upperLip(x, open) })),
    lower: SPAN.map((x) => warp({ x, y: lowerLip(x, open) })),
  };
}

function domeRim(): Pt[] {
  return Array.from({ length: 61 }, (_, i) => {
    const a = -0.34 + (i / 60) * (Math.PI + 0.68);
    const s = Math.sin(a);
    return warp({ x: DOME.rx * Math.cos(a), y: DOME.y - s * (s > 0 ? DOME.top : DOME.cheek) });
  });
}

/** The lower jaw's outline: along the lip from corner to corner, down round the outside and under the chin. */
function chinRim(open: number): Pt[] {
  const under = Array.from({ length: 41 }, (_, i) => {
    const x = OUTER - (i / 40) * (2 * OUTER);
    const u = Math.max(0, 1 - (x / OUTER) ** 2);
    const lip = lowerLip(Math.max(-W, Math.min(W, x)), open);
    return warp({ x, y: lip + 84 * (1 - u) + THICK * Math.sqrt(u) });
  });
  return [...SPAN.map((x) => warp({ x, y: lowerLip(x, open) })), ...under];
}

/** Just the underside of that outline, for the shadow it throws. */
const chinEdge = (open: number): Pt[] => chinRim(open).slice(SPAN.length + 4, -4);

// ---------------------------------------------------------------- the paint that never changes

const SHEET = { x0: -640, x1: 640, y0: -680, y1: 340, res: 1.25 } as const;
const CHIN_SHEET = { x0: -560, x1: 560, y0: 0, y1: 760, res: 1.1 } as const;

function eyePatch(ctx: CanvasRenderingContext2D, side: 1 | -1): void {
  const c = warp({ x: side * 262, y: -350 });
  const turn = side * 0.5;
  const shape = Array.from({ length: 49 }, (_, i) => {
    const a = (i / 48) * Math.PI * 2;
    const egg = 1 + 0.16 * Math.cos(a);
    const [x, y] = [side * 150 * Math.cos(a) * egg, 74 * Math.sin(a) * (1 - 0.12 * Math.cos(a))];
    return { x: c.x + x * Math.cos(turn) - y * Math.sin(turn), y: c.y + x * Math.sin(turn) + y * Math.cos(turn) };
  });
  path(ctx, shape);
  const g = ctx.createLinearGradient(c.x, c.y - 90, c.x, c.y + 90);
  g.addColorStop(0, '#fffaf0');
  g.addColorStop(0.6, IVORY);
  g.addColorStop(1, '#c3cad2');
  ctx.fillStyle = g;
  ctx.fill();
  ctx.save();
  ctx.clip();
  dab(ctx, c.x - side * 60, c.y + 62, 120, '120,140,165', 0.32);
  ctx.restore();
  path(ctx, shape);
  ctx.strokeStyle = 'rgba(8,12,20,0.75)';
  ctx.lineWidth = 2.4;
  ctx.stroke();
}

/** The thin pale ink and dark dry-brush following the dome round. */
function contours(pen: Pen): void {
  for (let r = 0; r < 16; r++) {
    const f = 0.42 + (0.56 * r) / 15;
    let a = 0.12 + pen.rng() * 0.3;
    while (a < Math.PI - 0.12) {
      const end = Math.min(Math.PI - 0.1, a + 0.1 + pen.rng() * 0.26);
      const pts = Array.from({ length: 7 }, (_, i) => {
        const u = a + ((end - a) * i) / 6;
        return warp({ x: f * DOME.rx * Math.cos(u), y: DOME.y - 20 - f * DOME.top * Math.sin(u) });
      });
      const light = pen.rng() < 0.62;
      pen.hair(pts, 1.3, light ? SHEEN : DEEP, light ? 0.1 + 0.24 * pen.rng() : 0.3);
      a = end + 0.03 + pen.rng() * 0.2;
    }
  }
}

function paintDome(ctx: CanvasRenderingContext2D, pen: Pen): void {
  const g = ctx.createRadialGradient(-110, -410, 30, 40, -120, 880);
  g.addColorStop(0, '#46587a');
  g.addColorStop(0.3, '#222e46');
  g.addColorStop(0.62, BLACK);
  g.addColorStop(1, '#090d17');
  ctx.fillStyle = g;
  ctx.fillRect(SHEET.x0, SHEET.y0, SHEET.x1 - SHEET.x0, SHEET.y1 - SHEET.y0);
  dab(ctx, -90, -500, 300, '150,178,210', 0.34);
  dab(ctx, 330, -60, 260, '70,98,130', 0.22);
  dab(ctx, -420, -40, 200, '4,7,13', 0.5);
  // The melon's shape: the core shadow sinking down to the lip.
  dab(ctx, 40, -150, 340, '4,7,13', 0.5);
  contours(pen);
  eyePatch(ctx, -1);
  eyePatch(ctx, 1);
  for (const s of [-1, 1] as const) {
    const c = warp({ x: s * EYE.x, y: EYE.y });
    dab(ctx, c.x, c.y, 76, '4,7,13', 0.7);
    softLine(ctx, curve({ x: c.x - 66, y: c.y - 36 }, { x: c.x, y: c.y - 74 }, { x: c.x + 66, y: c.y - 36 }, 10), 9, SHEEN, 0.17);
  }
  // The blowhole, a small crescent high on the crown.
  const b = warp({ x: 0, y: -540 });
  pen.hair([{ x: b.x - 26, y: b.y + 6 }, { x: b.x, y: b.y - 6 }, { x: b.x + 26, y: b.y + 6 }], 3, DEEP, 0.85);
  pen.hair([{ x: b.x - 22, y: b.y + 11 }, { x: b.x, y: b.y }, { x: b.x + 22, y: b.y + 11 }], 1.6, SHEEN, 0.4);
}

function paintChin(ctx: CanvasRenderingContext2D): void {
  const g = ctx.createLinearGradient(0, 330, 0, 700);
  g.addColorStop(0, '#d9dce0');
  g.addColorStop(0.2, '#fbf6ea');
  g.addColorStop(0.6, IVORY);
  g.addColorStop(1, '#a9b6c4');
  ctx.fillStyle = g;
  ctx.fillRect(CHIN_SHEET.x0, CHIN_SHEET.y0, CHIN_SHEET.x1 - CHIN_SHEET.x0, CHIN_SHEET.y1 - CHIN_SHEET.y0);
  // Smooth skin: only soft light and shade, the chin's round.
  dab(ctx, -60, 540, 220, '255,255,255', 0.55);
  dab(ctx, 330, 560, 200, '112,132,158', 0.34);
  dab(ctx, -360, 560, 170, '112,132,158', 0.3);
  dab(ctx, 40, 690, 300, '96,118,146', 0.3);
}

function bake(box: { x0: number; x1: number; y0: number; y1: number; res: number }, paint: (ctx: CanvasRenderingContext2D, pen: Pen) => void): HTMLCanvasElement {
  const { canvas, ctx } = makeCanvas(Math.ceil((box.x1 - box.x0) * box.res), Math.ceil((box.y1 - box.y0) * box.res));
  ctx.scale(box.res, box.res);
  ctx.translate(-box.x0, -box.y0);
  paint(ctx, new Pen(ctx, 901, 0.5));
  return canvas;
}

interface Sheets {
  readonly dome: HTMLCanvasElement;
  readonly chin: HTMLCanvasElement;
  readonly body: HTMLCanvasElement;
}

let sheets: Sheets | null = null;

function sheetsNow(): Sheets {
  sheets ??= { dome: bake(SHEET, paintDome), chin: bake(CHIN_SHEET, paintChin), body: makeBodySheet() };
  return sheets;
}

export const prepareHead = (): void => void sheetsNow();

// ---------------------------------------------------------------- the live parts

/** The small dark eye, a wet catchlight, the lid coming down for the smug look. */
function eye(ctx: CanvasRenderingContext2D, side: 1 | -1, lid: number, lw: number): void {
  const c = warp({ x: side * EYE.x, y: EYE.y });
  const r = EYE.r;
  ctx.save();
  ctx.translate(c.x, c.y);
  ctx.rotate(side * 0.2);
  ctx.beginPath();
  ctx.ellipse(0, 0, r * 1.14, r * 0.94, 0, 0, Math.PI * 2);
  ctx.fillStyle = '#79848c';
  ctx.fill();
  ctx.save();
  ctx.clip();
  const g = ctx.createRadialGradient(-side * 4, -3, 2, -side * 4, 0, r);
  g.addColorStop(0, '#05060a');
  g.addColorStop(0.62, '#141820');
  g.addColorStop(0.88, '#4a4438');
  g.addColorStop(1, '#6c6252');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(-side * 3, 0, r * 0.98, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.96)';
  ctx.beginPath();
  ctx.ellipse(-side * 12, -11, 7.5, 6, -0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.4)';
  ctx.beginPath();
  ctx.arc(side * 8, 10, 3, 0, Math.PI * 2);
  ctx.fill();
  // The lid: black skin coming down, its edge a little lit.
  const edge = -r * 1.1 + 2 * r * 0.95 * lid;
  ctx.fillStyle = '#0d1320';
  ctx.fillRect(-r * 2, -r * 2, r * 4, edge + r * 2);
  ctx.restore();
  ctx.beginPath();
  ctx.ellipse(0, 0, r * 1.14, r * 0.94, 0, 0, Math.PI * 2);
  ctx.strokeStyle = '#05070c';
  ctx.lineWidth = 3 * lw;
  ctx.stroke();
  if (lid > 0.05) {
    ctx.strokeStyle = 'rgba(191,210,232,0.75)';
    ctx.lineWidth = 2.4 * lw;
    ctx.beginPath();
    ctx.moveTo(-r * 1.1, edge + side * 2);
    ctx.lineTo(r * 1.1, edge - side * 2);
    ctx.stroke();
  }
  ctx.restore();
}

function blackLip(ctx: CanvasRenderingContext2D, open: number): void {
  // The black lip: a thin band at the front, widening to wrap the jaw at the corners.
  const band = (x: number): number => 16 + 120 * Math.max(0, (Math.abs(x) - 130) / 310) ** 1.5;
  const top = SPAN.map((x) => warp({ x, y: lowerLip(x, open) - 4 }));
  const under = [...SPAN].reverse().map((x) => warp({ x, y: lowerLip(x, open) + band(x) }));
  path(ctx, [...top, warp({ x: OUTER + 20, y: YC + 30 }), warp({ x: OUTER + 20, y: lowerLip(W, open) + 330 }), warp({ x: W, y: lowerLip(W, open) + 240 }), ...under, warp({ x: -W, y: lowerLip(W, open) + 240 }), warp({ x: -OUTER - 20, y: lowerLip(W, open) + 330 }), warp({ x: -OUTER - 20, y: YC + 30 })]);
  const g = ctx.createLinearGradient(-OUTER, 0, OUTER, 0);
  g.addColorStop(0, '#0a0f1a');
  g.addColorStop(0.3, '#2a3650');
  g.addColorStop(0.7, BLACK);
  g.addColorStop(1, '#090d17');
  ctx.fillStyle = g;
  ctx.fill();
  softLine(ctx, under, 26, '#6d7f96', 0.3);
}

function drawLower(ctx: CanvasRenderingContext2D, s: Sheets, open: number, lw: number): void {
  const rim = chinRim(open);
  const dy = (open - 1) * DROP;
  ctx.save();
  path(ctx, rim);
  ctx.clip();
  ctx.drawImage(s.chin, CHIN_SHEET.x0, CHIN_SHEET.y0 + dy, CHIN_SHEET.x1 - CHIN_SHEET.x0, CHIN_SHEET.y1 - CHIN_SHEET.y0);
  blackLip(ctx, open);
  ctx.restore();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 3.4 * lw;
  ctx.lineJoin = 'round';
  ctx.stroke(pathOf(rim));
}

const pathOf = (pts: readonly Pt[]): Path2D => {
  const p = new Path2D();
  pts.forEach((q, i) => (i ? p.lineTo(q.x, q.y) : p.moveTo(q.x, q.y)));
  p.closePath();
  return p;
};

function drawUpper(ctx: CanvasRenderingContext2D, s: Sheets, lips: Lips, lw: number): void {
  const rim = domeRim();
  const shape = [...rim, ...lips.upper];
  ctx.save();
  path(ctx, shape);
  ctx.clip();
  ctx.drawImage(s.dome, SHEET.x0, SHEET.y0, SHEET.x1 - SHEET.x0, SHEET.y1 - SHEET.y0);
  // The lit rim of the upper lip, following it as the jaw lifts.
  softLine(ctx, lips.upper.map((p) => ({ x: p.x, y: p.y - 30 })), 34, '#5f7490', 0.3);
  ctx.restore();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 3.6 * lw;
  ctx.lineJoin = 'round';
  ctx.stroke(pathOf(shape));
}

/** With the jaws shut, the smile's corners tuck up into the cheeks. */
function dimples(ctx: CanvasRenderingContext2D, l: Lips, lw: number): void {
  const shut = 1 - l.open * 3;
  if (shut <= 0) return;
  ctx.save();
  ctx.globalAlpha = shut;
  ctx.strokeStyle = INK;
  ctx.lineWidth = 3.6 * lw;
  ctx.lineCap = 'round';
  for (const [end, s] of [[l.upper[0]!, 1], [l.upper[l.upper.length - 1]!, -1]] as const) {
    ctx.beginPath();
    ctx.moveTo(end.x + s * 24, end.y + 6);
    ctx.quadraticCurveTo(end.x - s * 8, end.y - 2, end.x - s * 12, end.y - 40);
    ctx.stroke();
  }
  ctx.restore();
}

/** Puts the context into the head's own units. */
export function intoHead(ctx: CanvasRenderingContext2D, p: HeadPlace): void {
  ctx.translate(p.x, p.y);
  ctx.rotate(p.tilt);
  const k = p.size / UNITS;
  ctx.scale(k, k);
}

/** The whole head and the body falling away behind it. Food is drawn afterwards, in the head's units (intoHead). */
export function drawOrcaHead(ctx: CanvasRenderingContext2D, p: HeadPlace): void {
  const s = sheetsNow();
  const open = Math.max(0, p.jaw);
  const lips = lipsAt(open);
  ctx.save();
  intoHead(ctx, p);
  const lw = 1 / screenScale(ctx);
  ctx.drawImage(s.body, BODY_BOX.x0, BODY_BOX.y0, s.body.width / BODY_RES, s.body.height / BODY_RES);
  // The shadow the chin throws on the throat.
  softLine(ctx, chinEdge(open).map((q) => ({ x: q.x, y: q.y + 14 })), 84, '#0a1220', 0.3, 18);
  drawUpper(ctx, s, lips, lw);
  drawLower(ctx, s, open, lw);
  drawCavity(ctx, lips, lw);
  drawTeeth(ctx, lips, lw);
  dimples(ctx, lips, lw);
  eye(ctx, -1, p.lid, lw);
  eye(ctx, 1, p.lid, lw);
  ctx.restore();
}

