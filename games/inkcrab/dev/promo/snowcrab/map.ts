import { oval, pt } from '../../../src/art/kit';
import { ICE, INK, PAPER_FILL, RED } from '../../../src/art/palette';
import { makeCanvas, Pen, type Pt } from '../../../src/art/pen';
import { drawTextLine } from '../captions';
import { clamp01, smooth } from '../short';
import { BOIL } from '../../../src/art/palette';

/**
 * A sketch map of Alaska and the Bering Sea on a taped-in card, drawn from
 * rough coastline points (longitude, latitude), squeezed east-west as a
 * map at 62°N would be. Russia's Chukotka on the left, the Aleutians
 * trailing off the bottom, and a pin on the snow crab grounds of the
 * eastern Bering Sea shelf.
 */
export const MAP = { w: 920, h: 500 } as const;
const LON0 = -155;
const LAT0 = 62;
const K = 23;
const SQUEEZE = 0.55;

const P = ([lon, lat]: readonly [number, number]): Pt => pt(MAP.w / 2 + (lon - LON0) * SQUEEZE * K, MAP.h / 2 - (lat - LAT0) * K);

/** Alaska's coast, round from the Arctic end of the Canada border, then back up the border. */
const ALASKA: readonly (readonly [number, number])[] = [
  [-141, 69.65], [-143.6, 70.1], [-146, 70.2], [-148.5, 70.35], [-151, 70.45], [-152.5, 70.85], [-154.5, 71.0], [-156.8, 71.35],
  [-158, 70.85], [-160, 70.6], [-161.9, 70.3], [-163, 69.9], [-164.5, 69.0], [-166.2, 68.85], [-166.8, 68.35], [-165.5, 68.0],
  [-164, 67.6], [-163.5, 67.1], [-162.6, 66.95], [-161.7, 66.4], [-162.4, 66.1], [-163.6, 66.55], [-164.5, 66.55], [-166, 66.2],
  [-168.1, 65.65], [-166.5, 65.2], [-166.2, 64.6], [-165, 64.45], [-163, 64.55], [-161.5, 64.45], [-160.8, 63.9], [-161.5, 63.45],
  [-163, 63.05], [-164.5, 63.1], [-165.2, 62.5], [-166.1, 61.8], [-165.5, 61.1], [-165, 60.6], [-164.2, 60.0], [-162.5, 59.95],
  [-161.9, 59.1], [-162.2, 58.65], [-161, 58.6], [-159.5, 58.85], [-158.4, 58.75], [-157, 58.6], [-157.5, 57.6], [-158.6, 56.9],
  [-160.3, 56.1], [-161.8, 55.9], [-162.8, 55.3], [-164.5, 54.9], [-163.3, 54.75], [-161.8, 55.1], [-160, 55.6], [-158.5, 56.0],
  [-157, 56.6], [-155.7, 57.3], [-154.3, 58.1], [-153.4, 58.9], [-153.0, 59.6], [-152, 60.4], [-150.2, 61.2], [-151.3, 60.6],
  [-151.9, 59.6], [-151, 59.2], [-149.9, 59.7], [-148.5, 60.0], [-147.5, 60.6], [-146.5, 60.9], [-145, 60.4], [-143.5, 60.05],
  [-141.5, 59.9], [-139.7, 59.6], [-138, 59.0], [-136.5, 58.3], [-135.5, 57.6], [-134.8, 56.8], [-133.6, 56.0], [-132, 55.2],
  [-130.6, 54.8], [-130.1, 55.9], [-131.8, 56.6], [-133.4, 58.4], [-135.5, 59.8], [-137.5, 59.2], [-139, 60.3], [-141, 60.3],
];
/** Chukotka, from the card's left edge round to Cape Dezhnev and down to the Gulf of Anadyr. */
const CHUKOTKA: readonly (readonly [number, number])[] = [
  [-181, 72.5], [-181, 68.9], [-177, 68.7], [-175, 67.7], [-172.5, 67.0], [-170.5, 66.3], [-169.7, 66.05], [-170.5, 65.6],
  [-171.5, 65.5], [-172.2, 64.8], [-173.2, 64.4], [-174.5, 64.7], [-176, 64.9], [-177.5, 65.0], [-178.8, 64.5], [-181, 64.2],
];
/** Islands: St Lawrence, Nunivak, St Matthew, Kodiak, the Pribilofs and the Aleutians: [lon, lat, half-width°, half-height°]. */
const ISLANDS: readonly (readonly [number, number, number, number])[] = [
  [-170, 63.4, 1.6, 0.28], [-166.3, 60.1, 0.8, 0.25], [-172.7, 60.4, 0.35, 0.12], [-153.4, 57.4, 1.0, 0.5], [-170.2, 57.15, 0.25, 0.1],
  [-166.5, 53.9, 0.7, 0.16], [-168.4, 53.3, 0.6, 0.12], [-170.2, 52.75, 0.4, 0.1], [-172.4, 52.3, 0.5, 0.1], [-174.3, 52.2, 0.6, 0.12],
  [-176.6, 51.85, 0.5, 0.12], [-178.4, 51.8, 0.4, 0.1],
];

/** Where the pin goes: the eastern Bering Sea shelf, between the Pribilofs and St Matthew. */
export const PIN = P([-170.6, 58.6]);
export const ALASKA_LABEL = P([-151, 65.6]);
export const RUSSIA_LABEL = P([-176.5, 67.2]);

const LAND = '#d9cba6';

/** The card with its coastlines, one canvas per boil frame. */
export function makeMapCard(): readonly HTMLCanvasElement[] {
  return Array.from({ length: BOIL }, (_, f) => {
    const { canvas, ctx } = makeCanvas(MAP.w + 40, MAP.h + 40);
    ctx.translate(20, 20);
    const pen = new Pen(ctx, 5100 + f, 0.7);
    const card = [pt(0, 0), pt(MAP.w, 0), pt(MAP.w, MAP.h), pt(0, MAP.h)];
    pen.fill(card.map((p) => pt(p.x + 8, p.y + 10)), INK, 0.25);
    pen.fill(card, PAPER_FILL, 1);
    // The sea, an icy blue.
    pen.fill(card, ICE, 0.75);
    pen.clipped(card, () => {
      for (const coast of [ALASKA, CHUKOTKA]) {
        const shape = coast.map(P);
        pen.fill(shape, PAPER_FILL, 1);
        pen.fill(shape, LAND, 0.7);
        pen.hatch(shape, 9, 0.9, 0.6, { color: INK, alpha: 0.18 });
        pen.stroke([...shape, shape[0]!], 2.4, INK, 0.95);
      }
      for (const [lon, lat, rx, ry] of ISLANDS) {
        const c = P([lon, lat]);
        const shape = oval(c.x, c.y, Math.max(3, rx * SQUEEZE * K), Math.max(2.5, ry * K), 12);
        pen.fill(shape, LAND, 0.8);
        pen.stroke([...shape, shape[0]!], 1.6, INK, 0.9, false);
      }
    });
    // The Canada border, dashed.
    ctx.save();
    ctx.setLineDash([10, 8]);
    ctx.strokeStyle = INK;
    ctx.globalAlpha = 0.6;
    ctx.lineWidth = 2;
    ctx.beginPath();
    const a = P([-141, 69.65]);
    const b = P([-141, 60.3]);
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
    ctx.restore();
    // Tape at two corners.
    for (const [x, y, r] of [[40, -6, -0.5], [MAP.w - 40, -6, 0.5]] as const) {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(r);
      ctx.globalAlpha = 0.55;
      ctx.fillStyle = '#efe6c8';
      ctx.fillRect(-45, -16, 90, 32);
      ctx.restore();
    }
    pen.stroke([...card, card[0]!], 3, INK, 0.9);
    return canvas;
  });
}

export interface MapState {
  readonly show: number;
  readonly alaska: number;
  readonly pin: number;
  readonly sea: number;
  /** The pin's ring, 0 .. 1 while spreading. */
  readonly ring: number;
}

/** The card dropped in from above (tilted a touch), with its labels and pin. Top-left at (x, y). */
export function drawMap(ctx: CanvasRenderingContext2D, card: readonly HTMLCanvasElement[], boil: number, x: number, y: number, s: MapState): void {
  if (s.show <= 0) return;
  const e = smooth(s.show);
  // Text sets its own alpha, so everything on the card is multiplied by the card's.
  const a = clamp01(s.show * 3);
  ctx.save();
  ctx.globalAlpha = a;
  ctx.translate(x + MAP.w / 2, y + MAP.h / 2 - 260 * (1 - e));
  ctx.rotate(-0.02 - 0.06 * (1 - e));
  ctx.translate(-MAP.w / 2, -MAP.h / 2);
  ctx.drawImage(card[boil % card.length]!, -20, -20);
  drawTextLine(ctx, 'ALASKA', ALASKA_LABEL.x, ALASKA_LABEL.y, 68, 700, a * s.alaska);
  drawTextLine(ctx, 'Russia', RUSSIA_LABEL.x, RUSSIA_LABEL.y, 44, 500, a * 0.7 * s.alaska);
  if (s.ring >= 0 && s.ring <= 1) {
    ctx.save();
    ctx.strokeStyle = RED;
    ctx.lineWidth = 5;
    ctx.globalAlpha *= 1 - s.ring;
    ctx.beginPath();
    ctx.arc(PIN.x, PIN.y, 16 + 70 * s.ring, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
  if (s.pin > 0) {
    // A map pin: red head on a short needle, dropped from above.
    const drop = (1 - Math.min(1, s.pin)) * 80;
    const k = Math.max(0.6, s.pin);
    ctx.save();
    ctx.translate(PIN.x, PIN.y - drop);
    ctx.scale(k, k);
    ctx.strokeStyle = INK;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(0, -38);
    ctx.stroke();
    ctx.fillStyle = RED;
    ctx.beginPath();
    ctx.arc(0, -46, 16, 0, Math.PI * 2);
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.fillStyle = PAPER_FILL;
    ctx.beginPath();
    ctx.arc(-5, -51, 4.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  drawTextLine(ctx, 'Bering Sea', PIN.x - 20, PIN.y + 68, 64, 700, a * s.sea);
  ctx.restore();
}
