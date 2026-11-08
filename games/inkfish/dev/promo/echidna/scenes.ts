import { INK, PAPER, type Pt } from '../../../src/art/pen';
import { drawTextLine } from '../captions';
import { onAnimal, type Placed } from '../seal/story';
import { VIDEO } from '../short';
import { drawEchidna, ECHIDNA_AT, onEchidna } from './art/echidna';
import { drawPerson, drawResearchBoat } from './art/people';
import { drawSilhouette } from './art/silhouettes';
import { drawTigerShark } from './art/tigerShark';
import {
  BRIGHT, drawBubble, drawBubbleStream, drawCaustics, drawGlitter, drawShock, drawSurface, makeDeck, makeIsland, makeShore, makeWater, RED,
} from './scene';
import { TEXT } from './script';
import {
  coughAt, ECHIDNA_AT as ECHIDNA_SAID, echidnaLabelAt, everythingAt, fineSharkAt, fineTagAt, hookAt, HOOK_SURFACE_Y, islandLineAt, leanAt, legsAt, LOOP_S, metricAt, MOUTH_PART, mouthEchidna, placeLineAt,
  placeZoomAt, reefLineAt, riseAge, sadEchidna, sharkTagLabelAt, shockAge, sizeBarAt, spinesAt, tagOnAt, tagSharkAt, tagWordAt, TAG_SURFACE_Y, usAt, yearAt,
} from './story';

/** The six scenes, each drawn on its own layer over a backdrop it picks (made once by render.ts). */

export interface Backdrops {
  readonly shoreSoft: HTMLCanvasElement;
  readonly shoreSharp: HTMLCanvasElement;
  readonly waterHook: HTMLCanvasElement;
  readonly shoreTag: HTMLCanvasElement;
  readonly waterTag: HTMLCanvasElement;
  readonly waterDeep: HTMLCanvasElement;
  readonly island: HTMLCanvasElement;
  readonly deck: HTMLCanvasElement;
}

export function makeBackdrops(): Backdrops {
  return {
    shoreSoft: makeShore(HOOK_SURFACE_Y, true),
    shoreSharp: makeShore(HOOK_SURFACE_Y, false),
    waterHook: makeWater(HOOK_SURFACE_Y),
    shoreTag: makeShore(TAG_SURFACE_Y, false, 41),
    waterTag: makeWater(TAG_SURFACE_Y, BRIGHT, 23),
    waterDeep: makeWater(0, { top: '#6fe0d4', mid: '#27a6b6', deep: '#0a5a78', floor: '#b8aa7a' }, 29),
    island: makeIsland(),
    deck: makeDeck(),
  };
}

const CX = VIDEO.width / 2;
const ON_WATER = { fill: '#0b3a4a', halo: PAPER };
const RED_ON_PAPER = { fill: RED, halo: PAPER };
const PAPER_ON_DUSK = { fill: PAPER, halo: '#2a1840' };

const bg = (ctx: CanvasRenderingContext2D, c: HTMLCanvasElement): void => {
  ctx.drawImage(c, 0, 0);
};

/** Motes and bubbles rising through the water. */
function motes(ctx: CanvasRenderingContext2D, t: number, y0: number, count = 14): void {
  for (let i = 0; i < count; i++) {
    const age = riseAge(t, i);
    const x = (i * 211 + 90 * Math.sin(age * 6 + i)) % VIDEO.width;
    drawBubble(ctx, x, 1800 - (1800 - y0) * age, 5 + (i % 4) * 3, 0.55 * Math.min(1, 3 * (1 - age)));
  }
}

// ---------------------------------------------------------------- frame 1 and the montage

/** What's in the shark's open mouth, drawn in its own units: the echidna going in, and the things that pass. */
function mouthContents(t: number, boil: number): (ctx: CanvasRenderingContext2D) => void {
  const h = hookAt(t);
  return (c) => {
    if (h.push > -0.65) drawEchidna(c, { ...mouthEchidna(h.push), beat: t * 6 }, { bristle: 0.7 }, boil);
    for (const p of h.passes) {
      const e = 1 - (1 - p.u) ** 2;
      const s = 1 - Math.max(0, (p.u - 0.72) / 0.28) ** 1.5;
      c.save();
      c.translate(236 - 104 * e, 24 + 6 * Math.sin(Math.PI * p.u));
      c.scale(-s, s);
      drawSilhouette(c, p.kind, 0, 0, p.kind === 'tyre' ? 30 : 46, 0.2 * Math.sin(p.u * 9), t);
      c.restore();
    }
  };
}

/** The shore above the surface (soft until "LAND"), the turquoise water below, the shark close and big, jaws open, the echidna going in snout first. */
export function drawHook(ctx: CanvasRenderingContext2D, t: number, boil: number, b: Backdrops): void {
  const h = hookAt(t);
  bg(ctx, b.shoreSoft);
  if (h.focus > 0.01) {
    ctx.save();
    ctx.globalAlpha = h.focus;
    bg(ctx, b.shoreSharp);
    ctx.restore();
  }
  bg(ctx, b.waterHook);
  drawCaustics(ctx, HOOK_SURFACE_Y, t / LOOP_S);
  motes(ctx, t, HOOK_SURFACE_Y + 60);
  drawTigerShark(ctx, h.shark, { gape: h.gape, fear: h.fear, lid: h.lid, bend: h.shark.bend, inMouth: mouthContents(t, boil) }, boil);
  drawSurface(ctx, HOOK_SURFACE_Y, t);
  if (h.tint > 0.01) {
    ctx.save();
    ctx.globalCompositeOperation = 'multiply';
    ctx.globalAlpha = h.tint;
    ctx.fillStyle = '#b49be0';
    ctx.fillRect(0, 0, VIDEO.width, VIDEO.height);
    ctx.restore();
  }
}

// ---------------------------------------------------------------- Orpheus Island

export function drawPlace(ctx: CanvasRenderingContext2D, t: number, _boil: number, b: Backdrops): void {
  const z = 1 + 0.07 * placeZoomAt(t);
  ctx.save();
  ctx.translate(CX, 900);
  ctx.scale(z, z);
  ctx.translate(-CX, -900);
  bg(ctx, b.island);
  drawGlitter(ctx, t / LOOP_S);
  ctx.restore();
  drawTextLine(ctx, 'AUSTRALIA', CX, TEXT.place.y, TEXT.place.size, 700, placeLineAt(t), PAPER_ON_DUSK);
  drawTextLine(ctx, 'Orpheus Island', CX, TEXT.island.y, TEXT.island.size, 700, islandLineAt(t), RED_ON_PAPER);
  drawTextLine(ctx, 'Great Barrier Reef · Queensland', CX, TEXT.reef.y, TEXT.reef.size, 500, reefLineAt(t), PAPER_ON_DUSK);
  const y = yearAt(t);
  drawTextLine(ctx, '2022', CX, TEXT.year.y, TEXT.year.size * (0.9 + 0.1 * y), 700, y, PAPER_ON_DUSK);
}

// ---------------------------------------------------------------- the tagging

/** A ruler under the shark: caps and a bar drawn left to right by `u`. */
function drawBar(ctx: CanvasRenderingContext2D, x0: number, x1: number, y: number, u: number): void {
  if (u <= 0) return;
  const end = x0 + (x1 - x0) * u;
  ctx.save();
  ctx.lineCap = 'round';
  ctx.strokeStyle = PAPER;
  ctx.lineWidth = 12;
  ctx.beginPath();
  ctx.moveTo(x0, y);
  ctx.lineTo(end, y);
  ctx.stroke();
  ctx.strokeStyle = RED;
  ctx.lineWidth = 7;
  ctx.stroke();
  for (const x of u >= 0.995 ? [x0, x1] : [x0]) {
    ctx.beginPath();
    ctx.moveTo(x, y - 26);
    ctx.lineTo(x, y + 26);
    ctx.stroke();
  }
  ctx.restore();
}

/** The tag pole and the tag itself, on the fin. */
function drawPole(ctx: CanvasRenderingContext2D, hand: Pt, to: Pt, tagOn: number): void {
  ctx.save();
  ctx.lineCap = 'round';
  ctx.strokeStyle = INK;
  ctx.lineWidth = 11;
  ctx.beginPath();
  ctx.moveTo(hand.x - 12, hand.y - 70);
  ctx.lineTo(to.x, to.y);
  ctx.stroke();
  ctx.strokeStyle = '#8a98a2';
  ctx.lineWidth = 6;
  ctx.stroke();
  ctx.restore();
  if (tagOn > 0) {
    ctx.save();
    ctx.translate(to.x, to.y);
    const pop = 1 + 0.5 * Math.sin(Math.PI * Math.min(1, tagOn));
    ctx.strokeStyle = `rgba(255,236,170,${(0.9 * (1 - tagOn)).toFixed(2)})`;
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.arc(0, 0, 40 + 90 * tagOn, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
    void pop;
  }
}

export function drawTag(ctx: CanvasRenderingContext2D, t: number, boil: number, b: Backdrops): void {
  const s = TAG_SURFACE_Y;
  const shark = tagSharkAt(t);
  const lean = leanAt(t);
  bg(ctx, b.shoreTag);
  bg(ctx, b.waterTag);
  drawCaustics(ctx, s, t / LOOP_S, 0.8);
  // Where the tag goes on the dorsal fin, and the shark's back by the head.
  const finTag = onAnimal(shark, { x: -27, y: -43 });
  const flank = onAnimal(shark, { x: 70, y: -26 });
  const bob = 3 * Math.sin(t * 1.4);
  // The second researcher: head and shoulders above the surface, a teal-tinted torso and arm below it, a hand on the shark's back.
  const swimmer = { x: 850, y: s + 34 + bob, scale: 1.3, face: -1 as const, skin: '#8a5a3a', shirt: '#2f7a8c', hair: '#201510', mask: true, tilt: 0.05, hand: { x: flank.x, y: flank.y + 10 }, oh: 0 };
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, VIDEO.width, s + 2);
  ctx.clip();
  drawPerson(ctx, swimmer);
  ctx.restore();
  ctx.save();
  ctx.globalAlpha = 0.75;
  const tg = ctx.createLinearGradient(0, s, 0, s + 300);
  tg.addColorStop(0, '#3f9fae');
  tg.addColorStop(1, '#1f6a82');
  ctx.fillStyle = tg;
  ctx.strokeStyle = 'rgba(20,60,76,0.6)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(790, s + 2);
  ctx.bezierCurveTo(740, s + 50, 745, s + 190, 760, s + 290);
  ctx.lineTo(950, s + 290);
  ctx.bezierCurveTo(960, s + 190, 940, s + 50, 905, s + 2);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.lineCap = 'round';
  ctx.strokeStyle = '#3f9fae';
  ctx.lineWidth = 36;
  ctx.beginPath();
  ctx.moveTo(800, s + 40);
  ctx.quadraticCurveTo(780, s + 140, flank.x + 20, flank.y + 20);
  ctx.stroke();
  ctx.fillStyle = '#ff8a1f';
  ctx.beginPath();
  ctx.arc(flank.x + 20, flank.y + 24, 24, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  // The boat, the first researcher leaning out with the tag pole.
  const hand = { x: 440 + 20 * lean, y: 590 + 20 * lean };
  drawPerson(ctx, { x: 230 + 30 * lean, y: 520 + 8 * lean, scale: 1.4, face: 1, skin: '#e2b08a', shirt: '#f0f4f6', hair: '#6a3d20', hat: 'straw', tilt: 0.1 + 0.1 * lean, hand });
  drawResearchBoat(ctx, 250, s - 44, 620, t);
  drawPole(ctx, hand, finTag, tagOnAt(t));
  // The water over the swimmer's lower body and the boat's hull.
  ctx.save();
  ctx.fillStyle = 'rgba(80,205,205,0.5)';
  ctx.fillRect(0, s + 4, VIDEO.width, VIDEO.height);
  ctx.restore();
  drawTigerShark(ctx, shark, { bend: shark.bend, tag: tagOnAt(t), lid: 0.2, fear: 0.15 }, boil);
  drawSurface(ctx, s, t, 0.8);
  // The measure under the shark, and the size written big.
  const k = shark.len / 310;
  drawBar(ctx, shark.x - 172 * k, shark.x + 140 * k, 1238, sizeBarAt(t));
  drawTextLine(ctx, 'tiger shark', CX, TEXT.tigerShark.y, TEXT.tigerShark.size, 700, sharkTagLabelAt(t), ON_WATER);
  drawTextLine(ctx, 'TAG', 590, TEXT.tagWord.y, TEXT.tagWord.size, 700, tagWordAt(t), RED_ON_PAPER);
  drawTextLine(ctx, '10 ft', CX, TEXT.metric.y, TEXT.metric.size, 700, metricAt(t), ON_WATER);
  drawTextLine(ctx, '3 m', CX, TEXT.us.y, TEXT.us.size, 700, usAt(t), ON_WATER);
}

// ---------------------------------------------------------------- the cough and the echidna

/** A glowing ring round a part: pulsing, with a soft halo. */
function ring(ctx: CanvasRenderingContext2D, at: Pt, rx: number, ry: number, rot: number, a: number, t: number): void {
  if (a <= 0.01) return;
  const pulse = 1 + 0.05 * Math.sin(t * 12);
  ctx.save();
  ctx.translate(at.x, at.y);
  ctx.rotate(rot);
  ctx.globalAlpha = a;
  const g = ctx.createRadialGradient(0, 0, Math.min(rx, ry) * 0.5, 0, 0, Math.max(rx, ry) * 1.3);
  g.addColorStop(0, 'rgba(255,244,170,0)');
  g.addColorStop(0.7, 'rgba(255,244,170,0.45)');
  g.addColorStop(1, 'rgba(255,244,170,0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.ellipse(0, 0, rx * 1.3 * pulse, ry * 1.3 * pulse, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = PAPER;
  ctx.lineWidth = 12;
  ctx.beginPath();
  ctx.ellipse(0, 0, rx * pulse, ry * pulse, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = RED;
  ctx.lineWidth = 6;
  ctx.stroke();
  ctx.restore();
}

export function drawCough(ctx: CanvasRenderingContext2D, t: number, boil: number, b: Backdrops): void {
  const c = coughAt(t);
  bg(ctx, b.waterDeep);
  drawCaustics(ctx, 0, t / LOOP_S, 0.9);
  motes(ctx, t, 200, 12);
  const inside = c.fly < MOUTH_PART;
  const inMouth = inside ? (cc: CanvasRenderingContext2D): void => drawEchidna(cc, { ...c.echidna, beat: t * 6 }, { bristle: 0.8 }, boil) : undefined;
  drawTigerShark(ctx, c.shark, { gape: c.gape, fear: c.fear, bend: c.shark.bend, inMouth }, boil);
  const k = c.shark.len / 310;
  const mouth = onAnimal(c.shark, { x: 130, y: 25 });
  drawBubbleStream(ctx, mouth, t / LOOP_S, 10, 260, Math.min(1, c.gape * 2) * (1 - 0.5 * c.fly));
  if (!inside) {
    drawShock(ctx, onEchidna(c.echidna, ECHIDNA_AT.middle), shockAge(t), c.echidna.len * 0.8);
    drawEchidna(ctx, c.echidna, { bristle: c.bristle }, boil);
  }
  void k;
  // The parts, lit in turn as the narrator names them.
  const e = c.echidna;
  const rot = e.rot;
  ring(ctx, onEchidna(e, ECHIDNA_AT.spines), e.len * 0.36, e.len * 0.2, rot, spinesAt(t), t);
  ring(ctx, onEchidna(e, ECHIDNA_AT.legFront), e.len * 0.1, e.len * 0.1, 0, legsAt(t), t);
  ring(ctx, onEchidna(e, ECHIDNA_AT.legBack), e.len * 0.11, e.len * 0.1, 0, legsAt(t), t);
  ring(ctx, onEchidna(e, ECHIDNA_AT.middle), e.len * 0.78, e.len * 0.32, rot, everythingAt(t), t);
  const parts = [[spinesAt(t), 'spines'], [legsAt(t), 'legs'], [everythingAt(t), 'everything']] as const;
  for (const [a, word] of parts) drawTextLine(ctx, word, CX, TEXT.part.y, TEXT.part.size, 700, a, RED_ON_PAPER);
  drawTextLine(ctx, 'ECHIDNA', CX, TEXT.echidna.y, TEXT.echidna.size * (0.9 + 0.1 * Math.min(1, (t - ECHIDNA_SAID) * 4 + 1)), 700, echidnaLabelAt(t), RED_ON_PAPER);
}

// ---------------------------------------------------------------- the sad deck

export function drawSad(ctx: CanvasRenderingContext2D, t: number, boil: number, b: Backdrops): void {
  bg(ctx, b.deck);
  const e = sadEchidna(t);
  // A folded towel under it and a soft shadow, drawn for the echidna at y 1040 and moved with it (kept clear of the caption).
  ctx.save();
  ctx.translate(0, Math.round(e.y) - 1040);
  const tg = ctx.createLinearGradient(0, 1000, 0, 1330);
  tg.addColorStop(0, '#c9d3d8');
  tg.addColorStop(1, '#8fa0aa');
  ctx.fillStyle = tg;
  ctx.strokeStyle = INK;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.roundRect(70, 1040, 940, 270, 50);
  ctx.fill();
  ctx.stroke();
  ctx.strokeStyle = 'rgba(60,76,88,0.35)';
  ctx.lineWidth = 4;
  for (const y of [1100, 1170, 1240]) {
    ctx.beginPath();
    ctx.moveTo(110, y);
    ctx.quadraticCurveTo(540, y + 14, 970, y);
    ctx.stroke();
  }
  const sh = ctx.createRadialGradient(560, 1200, 10, 560, 1200, 520);
  sh.addColorStop(0, 'rgba(20,28,36,0.4)');
  sh.addColorStop(1, 'rgba(20,28,36,0)');
  ctx.fillStyle = sh;
  ctx.fillRect(0, 900, VIDEO.width, 500);
  ctx.restore();
  drawEchidna(ctx, { ...e, y: e.y + 130 }, { sad: 1 }, boil);
}

// ---------------------------------------------------------------- the shark swims off

export function drawFine(ctx: CanvasRenderingContext2D, t: number, boil: number, b: Backdrops): void {
  bg(ctx, b.shoreSharp);
  bg(ctx, b.waterHook);
  drawCaustics(ctx, HOOK_SURFACE_Y, t / LOOP_S, 1.2);
  motes(ctx, t, HOOK_SURFACE_Y + 60);
  const s = fineSharkAt(t);
  drawBubbleStream(ctx, onAnimal(s, { x: -150, y: -20 }), t / LOOP_S, 12, 320, 0.9);
  drawTigerShark(ctx, s, { bend: s.bend, lid: s.lid, tag: 1 }, boil);
  // The tag glints.
  const spot = onAnimal(s, { x: -27, y: -43 });
  const a = fineTagAt(t);
  const tw = 0.5 + 0.5 * Math.sin(t * 14);
  ctx.save();
  ctx.strokeStyle = `rgba(255,250,215,${(a * tw).toFixed(2)})`;
  ctx.lineWidth = 6;
  ctx.lineCap = 'round';
  const r = 46 * (0.6 + 0.4 * tw) * (s.len / 1700 + 0.4);
  for (const [dx, dy] of [[1, 0], [0, 1]] as const) {
    ctx.beginPath();
    ctx.moveTo(spot.x - dx * r, spot.y - dy * r);
    ctx.lineTo(spot.x + dx * r, spot.y + dy * r);
    ctx.stroke();
  }
  ctx.restore();
  drawSurface(ctx, HOOK_SURFACE_Y, t);
}

export type { Placed };
