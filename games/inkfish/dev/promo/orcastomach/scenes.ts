import { INK, PAPER } from '../../../src/art/pen';
import { drawTextLine } from '../captions';
import { drawBubble } from '../echidna/scene';
import type { Placed } from '../seal/story';
import { VIDEO } from '../short';
import { drawOrca } from '../foodchain/art/orca';
import { drawOrcaHead, intoHead } from './art/orcaHead';
import { drawPorpoise, porpoiseOutline } from './art/porpoise';
import { drawSealFront } from './art/sealFront';
import { drawScientist } from './art/scientist';
import { drawWindow, sealOutline } from './art/xray';
import { type Backdrops, drawRays } from './backdrops';
import { COUNTER_X, TEXT } from './script';
import {
  asideAt, bemusedAt, counterAt, countAt, driftersAt, type Hook, handsAt, hookAt, LOOP_S, moonAt, placeAt, porpoisesAt, questionAt, riseAge, SEA_LINE_Y, sealsAt, seaOrcaAt, shoreCameraAt, SHORE_ORCA,
  shoreScientistAt, skyDayAt, skyShownAt, stomachLabelAt, sunAt, TEN_AT, wiggleAt, windowAt, WINDOW, yearAt, STOMACH_AT, type Mouthful,
} from './story';

/** The four scenes, each drawn on its own layer over a backdrop it picks (made once by render.ts), and the words written over them. */

const CX = VIDEO.width / 2;
const ON_DARK = { fill: PAPER, halo: '#10202c' };
const ON_LIGHT = { fill: INK, halo: PAPER };

/** Bubbles and motes rising through the water. */
function motes(ctx: CanvasRenderingContext2D, t: number, count: number, alpha: number): void {
  for (let i = 0; i < count; i++) {
    const age = riseAge(t / 1, i, 2);
    const x = (i * 211 + 90 * Math.sin(age * 6 + i)) % VIDEO.width;
    drawBubble(ctx, x, 1800 - 1700 * age, 5 + (i % 4) * 3, alpha * Math.min(1, 3 * (1 - age)));
  }
}

// ---------------------------------------------------------------- the hook (and the cheeky beat)

/** Whole flipper waves a loop, so the seal is at the same point of its wave across the seam. */
const FLAPS = 36;

/** One animal at the jaws, in the head's own units. */
function drawFood(c: CanvasRenderingContext2D, m: Mouthful, h: Hook, t: number): void {
  c.save();
  c.globalAlpha = m.fade;
  if (m.kind === 'seal') drawSealFront(c, m.x, m.y, m.len, m.rot, { beat: (2 * Math.PI * FLAPS * t) / LOOP_S, sweat: h.sweat });
  else drawPorpoise(c, { x: m.x, y: m.y, len: m.len, rot: m.rot, face: -1, beat: t * 9 }, { fear: 1 }, 0);
  c.restore();
}

export function drawHook(c: CanvasRenderingContext2D, t: number, _boil: number, bd: Backdrops): void {
  const h = hookAt(t);
  c.drawImage(bd.dark, 0, 0);
  if (h.bright > 0.01) {
    c.save();
    c.globalAlpha = h.bright;
    c.drawImage(bd.bright, 0, 0);
    c.restore();
  }
  drawRays(c, bd.rays, t / LOOP_S, 0.55 + 0.35 * h.bright);
  motes(c, t, 12, 0.4);
  drawOrcaHead(c, h.orca);
  c.save();
  intoHead(c, h.orca);
  for (const m of h.food) drawFood(c, m, h, t);
  c.restore();
}

// ---------------------------------------------------------------- the shore, the x-ray

export function drawShore(c: CanvasRenderingContext2D, t: number, _boil: number, bd: Backdrops): void {
  const cam = shoreCameraAt(t);
  const sci = shoreScientistAt(t);
  c.save();
  c.transform(cam.zoom, 0, 0, cam.zoom, cam.dx, cam.dy);
  c.drawImage(bd.shore, 0, 0);
  // He stands behind the whale's head and looks down at it, then at us.
  drawScientist(c, { x: 826 + 360 * asideAt(t), y: 520, scale: 1.12 }, { mood: t < STOMACH_AT - 0.1 ? 'calm' : 'amazed', gaze: sci.gaze, hands: 0, tilt: sci.tilt, lid: sci.lid });
  const o = SHORE_ORCA;
  drawOrca(c, o.snout.x - o.len / 2, o.snout.y, o.len, o.angle, t, { jaw: 0, tail: 0 });
  c.drawImage(bd.shingle, 0, 0);
  c.restore();
  drawWindow(c, WINDOW, windowAt(t), countAt(t), t);
}

// ---------------------------------------------------------------- ten fingers

export function drawFingers(c: CanvasRenderingContext2D, t: number, _boil: number, bd: Backdrops): void {
  c.drawImage(bd.parchment, 0, 0);
  const bem = bemusedAt(t);
  const w = wiggleAt(t);
  drawScientist(c, { x: CX, y: 860, scale: 2.14 }, {
    mood: bem > 0.5 ? 'bemused' : 'amazed',
    gaze: bem > 0.5 ? 0.6 * Math.sin((t - TEN_AT) * 2.1) : 0,
    hands: handsAt(t),
    tilt: 0.05 * w + 0.07 * bem,
    lid: 0.15 * bem,
  });
  c.drawImage(bd.desk, 0, 0);
}

// ---------------------------------------------------------------- the dark sea

function sky(c: CanvasRenderingContext2D, t: number, shown: number): void {
  if (shown <= 0.01) return;
  const day = skyDayAt(t);
  c.save();
  c.globalAlpha = shown;
  c.beginPath();
  c.rect(0, 0, VIDEO.width, SEA_LINE_Y);
  c.clip();
  const g = c.createLinearGradient(0, 0, 0, SEA_LINE_Y);
  g.addColorStop(0, day > 0.5 ? '#6cbcf0' : '#1c2a4a');
  g.addColorStop(1, day > 0.5 ? '#e9f6ff' : '#566a92');
  c.fillStyle = g;
  c.fillRect(0, 0, VIDEO.width, SEA_LINE_Y);
  const [s, m] = [sunAt(t), moonAt(t)];
  if (s > -0.2 && s < 1.2) disc(c, -120 + 1320 * s, 300 - 190 * Math.sin(Math.PI * Math.min(1, Math.max(0, s))), 92, '#fff3b0', '#ff9a2e');
  if (m > -0.2 && m < 1.2) disc(c, -120 + 1320 * m, 300 - 190 * Math.sin(Math.PI * Math.min(1, Math.max(0, m))), 76, '#f4f1e4', '#9fb0c8');
  c.restore();
}

function disc(c: CanvasRenderingContext2D, x: number, y: number, r: number, inner: string, rim: string): void {
  const g = c.createRadialGradient(x - r * 0.3, y - r * 0.3, r * 0.1, x, y, r);
  g.addColorStop(0, inner);
  g.addColorStop(1, rim);
  c.fillStyle = g;
  c.beginPath();
  c.arc(x, y, r, 0, Math.PI * 2);
  c.fill();
  c.strokeStyle = INK;
  c.lineWidth = 3;
  c.stroke();
  c.fillStyle = 'rgba(255,255,255,0.35)';
  c.beginPath();
  c.arc(x - r * 0.35, y - r * 0.35, r * 0.2, 0, Math.PI * 2);
  c.fill();
}

export function drawSea(c: CanvasRenderingContext2D, t: number, _boil: number, bd: Backdrops): void {
  c.drawImage(bd.deep, 0, 0);
  const shown = skyShownAt(t);
  sky(c, t, shown);
  // The surface line, wavy, with a pale band under it.
  c.save();
  c.globalAlpha = Math.max(shown, 0.5);
  const band = c.createLinearGradient(0, SEA_LINE_Y - 8, 0, SEA_LINE_Y + 160);
  band.addColorStop(0, 'rgba(210,235,245,0.7)');
  band.addColorStop(1, 'rgba(210,235,245,0)');
  c.fillStyle = band;
  c.fillRect(0, SEA_LINE_Y - 8, VIDEO.width, 170);
  c.restore();
  motes(c, t, 10, 0.3);
  // The outlines of what was inside, drifting up through the dark.
  for (const d of driftersAt(t)) {
    const at: Placed = { x: d.x, y: d.y, len: d.len, rot: d.rot, face: 1, beat: t * 2 };
    c.save();
    c.globalAlpha = d.alpha;
    if (d.kind === 'seal') sealOutline(c, at, '#d8f4ff', 3);
    else porpoiseOutline(c, at, '#d8f4ff', 3);
    c.restore();
  }
  const o = seaOrcaAt(t);
  drawOrca(c, o.snout.x - (Math.cos(o.angle) * o.len) / 2, o.snout.y - (Math.sin(o.angle) * o.len) / 2, o.len, o.angle, t, { jaw: 0, tail: o.tail });
}

// ---------------------------------------------------------------- the words written over the picture

function counter(c: CanvasRenderingContext2D, x: number, n: number, label: string, alpha: number): void {
  drawTextLine(c, String(n), x, TEXT.counterN.y, TEXT.counterN.size, 700, alpha, ON_LIGHT);
  drawTextLine(c, label, x, TEXT.counterLabel.y, TEXT.counterLabel.size, 700, alpha, ON_LIGHT);
}

/** The place, the year, the stomach, the two counters and the big question mark. */
export function drawOverlay(c: CanvasRenderingContext2D, t: number): void {
  drawTextLine(c, 'Denmark', CX, TEXT.place.y, TEXT.place.size, 700, placeAt(t), ON_LIGHT);
  drawTextLine(c, '1861', CX, TEXT.year.y, TEXT.year.size, 700, yearAt(t), ON_LIGHT);
  drawTextLine(c, 'stomach', CX, TEXT.stomach.y, TEXT.stomach.size, 700, stomachLabelAt(t), ON_LIGHT);
  const k = counterAt(t);
  if (k > 0.01 && porpoisesAt(t) + sealsAt(t) > 0) {
    counter(c, COUNTER_X.porpoises, porpoisesAt(t), 'porpoises', k);
    counter(c, COUNTER_X.seals, sealsAt(t), 'seals', k);
  }
  const q = questionAt(t);
  if (q > 0.01) {
    const wob = 0.05 * Math.sin(t * 5);
    c.save();
    c.translate(CX, TEXT.question.y - 150);
    c.rotate(wob);
    c.scale(1 + 0.04 * Math.sin(t * 7), 1 + 0.04 * Math.sin(t * 7));
    drawTextLine(c, '?', 0, 150, TEXT.question.size, 700, q, ON_DARK);
    c.restore();
  }
}
