import { Pen, type Pt } from '../../../src/art/pen';
import { INK, PAPER, PAPER_FILL, RED } from '../../../src/art/palette';
import { drawTextLine } from '../captions';
import { clamp01, smooth } from '../short';

/**
 * "Every year on Christmas Island": a sketch map pinned over the scene, the
 * eastern Indian Ocean with Sumatra, Java and the islands east of it, the
 * top of Australia, and Christmas Island south of Java with a pin dropping
 * onto it. Coastlines are rough hand-traced outlines (lon, lat), plenty for
 * a sketch at this size.
 */
const CARD = { x: 540, y: 520, w: 780, h: 470 } as const;
const LON = [100, 128.5] as const;
const LAT = [-3, -20.2] as const;
const ISLAND = { lon: 105.65, lat: -10.48 } as const;

const SUMATRA: readonly (readonly [number, number])[] = [
  [95.3, 5.6], [97.5, 5.2], [100.4, 2.2], [103.8, -1], [106, -3], [105.8, -5.9], [104.5, -5.9], [102.3, -4], [100.3, -0.9], [98.6, 1.7], [95.2, 4],
];
const JAVA: readonly (readonly [number, number])[] = [
  [105.2, -6.8], [106, -5.9], [108.3, -6.3], [110.4, -6.9], [112.6, -6.9], [114.4, -7.7], [114.6, -8.7], [112, -8.3], [110, -8.1], [108, -7.8], [106.4, -7.4],
];
const AUSTRALIA: readonly (readonly [number, number])[] = [
  [113.4, -22.5], [114.1, -21.8], [116.7, -20.6], [118.8, -20.3], [121, -19.5], [122.3, -18], [122.2, -17], [123.6, -16.2], [124.4, -15.4], [125.2, -14.5],
  [126.9, -13.8], [128.2, -14.9], [129.5, -14.9], [130.5, -24], [113.4, -24],
];
/** Bali, Lombok, Sumbawa, Flores, Sumba and Timor, as rough ovals (centre lon, lat, half-width and half-height in degrees). */
const ISLANDS: readonly (readonly [number, number, number, number])[] = [
  [115.2, -8.4, 0.5, 0.3], [116.3, -8.6, 0.4, 0.3], [117.9, -8.6, 1, 0.35], [121, -8.6, 1.6, 0.35], [119.9, -9.7, 0.8, 0.3], [125.5, -9.3, 1.9, 0.45],
];

const toCard = (lon: number, lat: number): Pt => ({
  x: CARD.x - CARD.w / 2 + ((lon - LON[0]) / (LON[1] - LON[0])) * CARD.w,
  y: CARD.y - CARD.h / 2 + ((LAT[0] - lat) / (LAT[0] - LAT[1])) * CARD.h,
});

const LAND = '#c9b98a';
const SEA = '#bcd3df';

function land(pen: Pen, outline: readonly Pt[]): void {
  pen.fill(outline, PAPER_FILL, 1);
  pen.fill(outline, LAND, 0.75);
  pen.stroke([...outline, outline[0]!], 1.8, INK, 0.9);
}

/** The card at `show` (0 gone .. 1 pinned up), the pin dropped `pin` (0 .. 1), drawn with boil frame `boil`. */
export function drawMapCard(ctx: CanvasRenderingContext2D, show: number, pin: number, boil: number): void {
  if (show <= 0) return;
  const e = smooth(show);
  ctx.save();
  ctx.globalAlpha = clamp01(show * 3);
  // Slides down into place with a slight tilt, like a card pinned to the page.
  ctx.translate(CARD.x, CARD.y - (1 - e) * 120);
  ctx.rotate(-0.025 * e);
  ctx.translate(-CARD.x, -CARD.y);
  const x0 = CARD.x - CARD.w / 2;
  const y0 = CARD.y - CARD.h / 2;
  ctx.fillStyle = 'rgba(38,49,106,0.18)';
  ctx.fillRect(x0 + 10, y0 + 12, CARD.w, CARD.h);
  ctx.fillStyle = PAPER;
  ctx.fillRect(x0, y0, CARD.w, CARD.h);
  const pen = new Pen(ctx, 5100 + boil, 0.6);
  ctx.save();
  ctx.beginPath();
  ctx.rect(x0, y0, CARD.w, CARD.h);
  ctx.clip();
  ctx.globalAlpha *= 0.55;
  ctx.fillStyle = SEA;
  ctx.fillRect(x0, y0, CARD.w, CARD.h);
  ctx.globalAlpha /= 0.55;
  land(pen, SUMATRA.map(([lon, lat]) => toCard(lon, lat)));
  land(pen, JAVA.map(([lon, lat]) => toCard(lon, lat)));
  land(pen, AUSTRALIA.map(([lon, lat]) => toCard(lon, lat)));
  for (const [lon, lat, rx, ry] of ISLANDS) {
    land(pen, Array.from({ length: 14 }, (_, k) => toCard(lon + rx * Math.cos((k / 14) * Math.PI * 2), lat + ry * Math.sin((k / 14) * Math.PI * 2))));
  }
  ctx.restore();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 3;
  ctx.strokeRect(x0, y0, CARD.w, CARD.h);
  drawTextLine(ctx, 'Australia', toCard(124.5, -18.6).x, toCard(124.5, -18.6).y, 48, 700);
  drawTextLine(ctx, 'Java', toCard(110.2, -5.2).x, toCard(110.2, -5.2).y, 44, 700);
  drawTextLine(ctx, 'Indian Ocean', toCard(108.5, -17.8).x, toCard(108.5, -17.8).y, 50, 500);
  drawTextLine(ctx, 'every year', x0 + CARD.w - 150, y0 + 66, 56, 700, 1, { fill: RED, halo: PAPER });
  // Christmas Island, drawn big enough to see, and the pin dropping on it.
  const at = toCard(ISLAND.lon, ISLAND.lat);
  land(pen, Array.from({ length: 12 }, (_, k) => ({ x: at.x + 13 * Math.cos((k / 12) * Math.PI * 2), y: at.y + 9 * Math.sin((k / 12) * Math.PI * 2) })));
  if (pin > 0) {
    const drop = (1 - smooth(pin)) * 90;
    const head = { x: at.x, y: at.y - 46 - drop };
    ctx.globalAlpha *= clamp01(pin * 4);
    pen.stroke([{ x: at.x, y: at.y - drop }, head], 3.5, INK, 1, false);
    pen.fill(Array.from({ length: 16 }, (_, k) => ({ x: head.x + 15 * Math.cos((k / 16) * Math.PI * 2), y: head.y + 15 * Math.sin((k / 16) * Math.PI * 2) })), RED, 0.95);
    pen.stroke(Array.from({ length: 17 }, (_, k) => ({ x: head.x + 15 * Math.cos((k / 16) * Math.PI * 2), y: head.y + 15 * Math.sin((k / 16) * Math.PI * 2) })), 2, INK, 1);
    drawTextLine(ctx, 'Christmas Island', at.x + 175, at.y + 62, 62, 700, clamp01(pin * 2));
  }
  ctx.restore();
}
