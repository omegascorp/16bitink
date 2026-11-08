import { INK, PAPER } from '../../../src/art/pen';
import { smooth } from '../short';
import { drawYou } from '../swallowyou/art/people';
import { drawArrow, drawCard, drawPop, drawText, INK_ON_PAPER, PAPER_ON_INK, RED_ON_PAPER, YELLOW_ON_INK } from '../swallowyou/text';
import { SQUID_EYE } from './cast';
import { drawLegend, type Legend } from './art/legends';
import { frilledSharkMouth } from './art/frilledShark';
import { slotOf, toScreen, zoomOf } from './lineup';
import { YOU_FT } from './species';
import { monsterPoint, type StageKit, viewOf } from './stage';
import { sectionStart, T } from './timeline';

/**
 * Everything laid over the line-up: each animal's legend card (shown, stamped
 * REAL, then torn open so the real animal swims out from behind it), the
 * small inset cards (the calendar, the Japan card, the heartbeat), and the
 * rings and labels on the animals as their parts are named.
 */

const s = sectionStart;
const clamp01 = (v: number): number => Math.max(0, Math.min(1, v));
const fade = (t: number, from: number, to: number, f = 0.3): number => smooth((t - from) / f) * (1 - smooth((t - to) / f));

/** A legend card's moments: up, stamped, torn open. */
export interface LegendBeat {
  readonly legend: Legend;
  readonly from: number;
  readonly stamp: number;
  readonly tear: number;
  /** Extra animation the card plays (the island's eye, the serpent rising). */
  readonly eyeAt?: number;
}

export const LEGEND_BEATS: readonly LegendBeat[] = [
  { legend: 'serpent', from: s(2) - 0.3, stamp: T.frilled, tear: T.frilled + 0.45 },
  { legend: 'mermaid', from: s(3) - 0.3, stamp: T.manatees, tear: T.manatees + 0.35 },
  { legend: 'seaserpent', from: s(4) - 0.3, stamp: T.realSerpent + 0.6, tear: T.oarfish - 0.25 },
  { legend: 'carcass', from: s(6) - 0.3, stamp: T.mostLikely, tear: T.mostLikely + 0.35 },
  { legend: 'kraken', from: s(7) - 0.3, stamp: T.realOne, tear: T.realOne + 0.4, eyeAt: T.islandWord },
];

const TEAR_S = 0.8;
const CARD = { x: 300, y: 120, w: 1320, h: 780 } as const;

/** The legend card on now, if any. */
export function legendOn(t: number): LegendBeat | null {
  return LEGEND_BEATS.find((b) => t >= b.from && t < b.tear + TEAR_S) ?? null;
}

/** How much a legend card hides the HUD and the map: 1 while it's up, easing back as it tears. */
export function legendHide(t: number): number {
  const b = legendOn(t);
  return b ? smooth((t - b.from) / 0.3) * (1 - smooth((t - b.tear) / 0.5)) : 0;
}

/** The card, its captions, its stamp and its tear. The card scales up from the corner map as it comes on. */
export function drawLegendBeat(ctx: CanvasRenderingContext2D, t: number): void {
  const b = legendOn(t);
  if (!b) return;
  const up = smooth((t - b.from) / 0.45);
  const tear = clamp01((t - b.tear) / TEAR_S);
  // The stage behind it dims while the card is up.
  ctx.save();
  ctx.fillStyle = `rgba(6,10,18,${0.55 * up * (1 - tear)})`;
  ctx.fillRect(0, 0, 1920, 1080);
  ctx.restore();
  const k = 0.25 + 0.75 * up;
  const cx = 960 + (1 - up) * 700;
  const cy = 510 - (1 - up) * 330;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(k, k);
  ctx.translate(-CARD.w / 2, -CARD.h / 2);
  drawLegend(ctx, b.legend, 0, 0, CARD.w, CARD.h, t, {
    alpha: up,
    tear: smooth(tear),
    stamp: clamp01((t - b.stamp) / 0.35),
    eye: b.eyeAt ? smooth((t - b.eyeAt) / 0.6) : 0,
    rise: smooth((t - b.from - 0.2) / 2.5),
  });
  ctx.restore();
  drawLegendCaption(ctx, b, t, up * (1 - tear));
}

/** The words the narrator quotes, written under the card. */
function drawLegendCaption(ctx: CanvasRenderingContext2D, b: LegendBeat, t: number, alpha: number): void {
  if (alpha <= 0) return;
  const at = (text: string, from: number, ink = PAPER_ON_INK): void => drawText(ctx, text, { x: 960, y: 1000, size: 64, maxWidth: 1600 }, 700, alpha * smooth((t - from) / 0.3), ink);
  if (b.legend === 'mermaid') at('"not as pretty as they are painted" · Columbus, 1493', T.pretty - 0.3);
  if (b.legend === 'carcass') at('a long neck · a tiny head · four flippers', T.neck - 0.2);
  if (b.legend === 'kraken') at('"about a mile and a half AROUND" · 1750s', T.around - 0.6);
}

// ---------------------------------------------------------------- the inset cards

/** "You" measured: a height bar beside you. */
function drawYouBar(ctx: CanvasRenderingContext2D, kit: StageKit, t: number): void {
  const a = fade(t, T.fiveNine - 0.2, s(2) - 0.4);
  if (a <= 0) return;
  const v = viewOf(kit, t);
  const z = zoomOf(v);
  const foot = toScreen(v, 0, 0);
  const x = foot.x + YOU_FT * z * 0.32;
  const top = foot.y - YOU_FT * z * smooth((t - T.fiveNine) / 0.6);
  ctx.save();
  ctx.globalAlpha = a;
  ctx.strokeStyle = PAPER;
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(x, foot.y);
  ctx.lineTo(x, top);
  ctx.moveTo(x - 18, top);
  ctx.lineTo(x + 18, top);
  ctx.stroke();
  ctx.restore();
  drawText(ctx, '5 ft 9 in', { x: x + 40, y: (foot.y + top) / 2 - 20, size: 64, maxWidth: 400, left: true }, 700, a, YELLOW_ON_INK);
  drawText(ctx, '1.75 m', { x: x + 40, y: (foot.y + top) / 2 + 40, size: 44, maxWidth: 400, left: true }, 500, a, PAPER_ON_INK);
}

/** A ring round a part, with its label above. */
function drawRing(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, label: string, alpha: number, t: number): void {
  if (alpha <= 0) return;
  const grow = smooth(alpha);
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.lineWidth = 7;
  ctx.strokeStyle = '#ffcf33';
  ctx.setLineDash([]);
  ctx.beginPath();
  ctx.ellipse(x, y, r * grow, r * 0.82 * grow, 0.1 * Math.sin(t), -0.2, Math.PI * 2 * grow - 0.2);
  ctx.stroke();
  ctx.restore();
  drawText(ctx, label, { x, y: y - r - 50, size: 64, maxWidth: 800 }, 700, alpha, YELLOW_ON_INK);
}

/** The frilled shark's teeth, ringed. */
function drawTeethRing(ctx: CanvasRenderingContext2D, kit: StageKit, t: number): void {
  const a = fade(t, T.teeth, T.pregnant - 0.1);
  if (a <= 0) return;
  const v = viewOf(kit, t);
  const sl = slotOf('frilled');
  const z = zoomOf(v);
  const front = toScreen(v, sl.front, sl.y);
  const mouth = frilledSharkMouth(front.x, front.y, sl.feet * z, -1, 0.9);
  drawRing(ctx, mouth.x, mouth.y, 0.06 * sl.feet * z + 40, '~300 trident teeth', a, t);
}

/** A calendar flipping through three and a half years. */
function drawCalendar(ctx: CanvasRenderingContext2D, t: number): void {
  const a = fade(t, T.pregnant, T.scientist - 0.2);
  if (a <= 0) return;
  const x = 780;
  const y = 120;
  drawCard(ctx, x, y, 460, 400, a);
  const years = Math.min(3.5, 3.5 * clamp01((t - T.pregnant) / 1.6));
  const shown = years >= 3.5 ? '3½' : String(Math.floor(years) + 1 > 3 ? 3 : Math.floor(years) + 1);
  ctx.save();
  ctx.globalAlpha = a;
  ctx.fillStyle = '#d8312b';
  ctx.fillRect(x + 4, y + 4, 452, 90);
  ctx.restore();
  drawText(ctx, 'PREGNANT FOR', { x: x + 230, y: y + 50, size: 52, maxWidth: 420 }, 700, a, PAPER_ON_INK);
  drawText(ctx, shown, { x: x + 230, y: y + 220, size: 190, maxWidth: 420 }, 700, a, INK_ON_PAPER);
  drawText(ctx, 'YEARS', { x: x + 230, y: y + 345, size: 64, maxWidth: 420 }, 700, a, INK_ON_PAPER);
}

/** The manatee's mermaid moment and the oarfish's crest, ringed. */
function drawRings(ctx: CanvasRenderingContext2D, kit: StageKit, t: number): void {
  const crest = fade(t, T.crest, T.straightUp - 0.1);
  if (crest > 0) {
    const p = monsterPoint(kit, 'oarfish', t, 0.03, 0.05);
    drawRing(ctx, p.x, p.y, 90, 'bright red crest', crest, t);
  }
  const plate = fade(t, T.plates, T.colossal + 0.3);
  if (plate > 0) {
    const eye = monsterPoint(kit, 'squid', t, SQUID_EYE.along, SQUID_EYE.down);
    drawPlate(ctx, eye.x + 230, eye.y - 40, 120, plate);
    drawRing(ctx, eye.x, eye.y, 100, 'eye ≈ a dinner plate', plate, t);
  }
  const brain = fade(t, T.brain, T.y1820 - 0.1);
  if (brain > 0) {
    const head = monsterPoint(kit, 'sperm', t, 0.12, 0.42);
    drawRing(ctx, head.x, head.y, 120, 'the biggest brain on Earth', brain, t);
  }
}

/** A plain dinner plate, for scale beside the squid's eye. */
function drawPlate(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, alpha: number): void {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = '#f4f1e8';
  ctx.strokeStyle = INK;
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(x, y, r * 0.66, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

/** Japan's folklore, then the study: 336 sightings, no link. */
function drawJapanCard(ctx: CanvasRenderingContext2D, t: number): void {
  const a = fade(t, T.japan - 0.1, T.badDay - 0.5);
  if (a <= 0) return;
  const x = 200;
  const y = 170;
  drawCard(ctx, x, y, 1200, 560, a);
  const study = smooth((t - T.checked) / 0.4);
  drawText(ctx, 'ryūgū no tsukai', { x: x + 600, y: y + 110, size: 92, maxWidth: 1100 }, 700, a * (1 - study), INK_ON_PAPER);
  drawText(ctx, '"messenger from the sea god\'s palace"', { x: x + 600, y: y + 220, size: 58, maxWidth: 1100 }, 500, a * (1 - study), INK_ON_PAPER);
  drawText(ctx, 'washes ashore → earthquake?', { x: x + 600, y: y + 380, size: 72, maxWidth: 1100 }, 700, a * (1 - study) * smooth((t - T.earthquake) / 0.3), RED_ON_PAPER);
  if (study <= 0) return;
  drawText(ctx, '336 sightings of deep-sea fish, 1928–2011', { x: x + 600, y: y + 90, size: 60, maxWidth: 1100 }, 700, a * study, INK_ON_PAPER);
  drawSightings(ctx, x + 80, y + 170, 1040, 230, a * study, t);
  drawText(ctx, 'NO LINK', { x: x + 600, y: y + 480, size: 90, maxWidth: 1100 }, 700, a * smooth((t - T.noLink) / 0.3), RED_ON_PAPER);
}

/** Dots for sightings along a timeline, with a flat line where a link would be. */
function drawSightings(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, alpha: number, t: number): void {
  const shown = Math.floor(336 * clamp01((t - T.checked) / 1.6));
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = '#3a6d8c';
  for (let i = 0; i < shown; i++) {
    const u = ((i * 0.6180339) % 1);
    const v = ((i * 0.7548776) % 1);
    ctx.beginPath();
    ctx.arc(x + u * w, y + 20 + v * (h - 60), 5, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.strokeStyle = INK;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(x, y + h);
  ctx.lineTo(x + w, y + h);
  ctx.stroke();
  ctx.restore();
}

/** The blue whale's heart: a trace with two beats in a minute. */
function drawHeartCard(ctx: CanvasRenderingContext2D, t: number): void {
  const a = fade(t, T.heart - 0.1, T.biggestEver - 0.1);
  if (a <= 0) return;
  const x = 650;
  const y = 110;
  const w = 620;
  const h = 300;
  drawCard(ctx, x, y, w, h, a, '#10161f');
  const sweep = clamp01((t - T.heart) / 2.4);
  ctx.save();
  ctx.globalAlpha = a;
  ctx.strokeStyle = '#ff5a5a';
  ctx.lineWidth = 5;
  ctx.beginPath();
  const n = 200;
  for (let i = 0; i <= n * sweep; i++) {
    const u = i / n;
    const beat = (c: number): number => Math.exp(-(((u - c) * 60) ** 2)) * 90 - Math.exp(-(((u - c - 0.02) * 60) ** 2)) * 35;
    const px = x + 30 + u * (w - 60);
    const py = y + 180 - beat(0.25) - beat(0.75);
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.stroke();
  ctx.restore();
  drawText(ctx, '2 beats a minute', { x: x + w / 2, y: y + 260, size: 56, maxWidth: w - 40 }, 700, a, PAPER_ON_INK);
  drawText(ctx, '1 minute', { x: x + w / 2, y: y + 50, size: 40, maxWidth: w - 40 }, 500, a * 0.8, PAPER_ON_INK);
}

/** Seventeen "yous", head to toe along the blue whale's belly. */
function drawSeventeen(ctx: CanvasRenderingContext2D, kit: StageKit, t: number): void {
  const a = fade(t, T.seventeen - 0.1, T.wins + 0.2);
  if (a <= 0) return;
  const v = viewOf(kit, t);
  const z = zoomOf(v);
  const sl = slotOf('blue');
  const shown = Math.min(17, Math.ceil(17 * clamp01((t - T.seventeen) / 1.6)));
  const y = sl.y + 0.6 * 0.18 * sl.feet;
  for (let i = 0; i < shown; i++) {
    // Rotated a quarter turn, each "you" lies with its head towards the whale's snout and its feet at this point.
    const head = toScreen(v, sl.front + (i + 1) * YOU_FT + 0.3, y);
    ctx.save();
    ctx.translate(head.x, head.y);
    ctx.rotate(-Math.PI / 2);
    drawYou(ctx, 0, 0, YOU_FT * z, t, { fill: '#ffcf33', alpha: a, halo: 3 });
    ctx.restore();
  }
  if (shown >= 17) drawPop(ctx, '17 of you', 960, 300, 110, t, T.seventeen + 1.6, T.wins, YELLOW_ON_INK);
}

/** "One monster… or a crowd?" */
function drawCrowd(ctx: CanvasRenderingContext2D, t: number): void {
  drawPop(ctx, 'ONE MONSTER?', 620, 250, 110, t, T.crowd + 0.6, T.eitherWay - 0.2, YELLOW_ON_INK, -0.05);
  drawPop(ctx, 'OR A CROWD?', 1300, 380, 110, t, T.crowd + 1.7, T.eitherWay - 0.2, YELLOW_ON_INK, 0.05);
}

/** The siphonophore's name, pointing at it, once it's named. */
function drawSiphonophoreLabel(ctx: CanvasRenderingContext2D, t: number): void {
  const a = fade(t, T.siphonophore, T.clones - 0.1);
  if (a <= 0) return;
  drawText(ctx, 'a siphonophore', { x: 960, y: 200, size: 90, maxWidth: 1000 }, 700, a, YELLOW_ON_INK);
  drawText(ctx, 'length estimated from the ROV video', { x: 960, y: 270, size: 44, maxWidth: 1000 }, 500, a, PAPER_ON_INK);
  drawArrow(ctx, 960, 300, 1080, 400, a, '#ffcf33');
}

/** All the overlays on the stage at t, in order. */
export function drawOverlays(ctx: CanvasRenderingContext2D, kit: StageKit, t: number): void {
  drawYouBar(ctx, kit, t);
  drawTeethRing(ctx, kit, t);
  drawCalendar(ctx, t);
  drawRings(ctx, kit, t);
  drawJapanCard(ctx, t);
  drawHeartCard(ctx, t);
  drawSeventeen(ctx, kit, t);
  drawSiphonophoreLabel(ctx, t);
  drawCrowd(ctx, t);
}
