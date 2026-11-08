import { PAPER } from '../../../src/art/pen';
import { drawTextLine } from '../captions';
import { VIDEO } from '../short';
import { drawBullShark } from './art/bullShark';
import { drawSaltCroc } from './art/saltCroc';
import {
  drawBar, drawBoat, drawBubble, drawBurp, drawMurkLight, drawRings, drawRipples, drawSpray, drawThrashSpray, drawWaterFront, RED,
} from './scene';
import { TEXT } from './script';
import {
  BURP_AT, boatX, burpTextAt, faceoffAt, feetAt, hookAt, HOOK_WATER_Y, JAWS_AT, LOOP_S, metresAt, nameAt, placeAt, placeRiverAt, questionAt, RIVER_WATER_Y, risePose, riseUpAt, SIZE_BAR_Y, SIZE_LEN,
  SIZE_WATER_Y, sharkTagAt, sharkTagUnderAt, sizeBarAt, sizeCrocAt, smugAt, type Rear, saltwaterAt, underShark, upriverAt, vsAt, WRONG_WATER_Y, wrongScene, wrongTextAt, yearAt, sprayAge,
} from './story';

/** The eight scenes, each drawn on its own layer over a backdrop it picks (made once by render.ts). */

export interface Backdrops {
  readonly dusk900: HTMLCanvasElement;
  readonly dusk640: HTMLCanvasElement;
  readonly dusk700: HTMLCanvasElement;
  readonly dusk520: HTMLCanvasElement;
  readonly murk: HTMLCanvasElement;
}

const PAPER_ON_DUSK = { fill: PAPER, halo: '#3a2418' };
const RED_ON_PAPER = { fill: RED, halo: PAPER };
const CX = VIDEO.width / 2;

function bg(ctx: CanvasRenderingContext2D, c: HTMLCanvasElement): void {
  ctx.drawImage(c, 0, 0);
}

/** The croc reared up with the shark across its jaws, thrashing it; the river in front hides the lower body. */
function drawRearing(ctx: CanvasRenderingContext2D, rear: Rear, t: number, boil: number, back: HTMLCanvasElement): void {
  bg(ctx, back);
  drawRipples(ctx, HOOK_WATER_Y - 200, HOOK_WATER_Y, t / LOOP_S);
  drawSaltCroc(ctx, rear.croc, { gape: rear.gape, part: 'jaw' }, boil);
  drawBullShark(ctx, rear.shark, { bend: rear.shark.bend, fear: 1 }, boil);
  drawSaltCroc(ctx, rear.croc, { gape: rear.gape, glare: 1, part: 'rest' }, boil);
  drawWaterFront(ctx, HOOK_WATER_Y, t, 0.9);
}

/** Frame 1: the croc's head and shoulders out of the brown river, the bull shark in its jaws, spray flying. */
export function drawHook(ctx: CanvasRenderingContext2D, t: number, boil: number, b: Backdrops): void {
  const rear = hookAt(t);
  drawRearing(ctx, rear, t, boil, b.dusk900);
  drawThrashSpray(ctx, rear.mouth, t / LOOP_S, 30);
  drawThrashSpray(ctx, { x: 250, y: HOOK_WATER_Y - 10 }, t / LOOP_S, 15);
  void sprayAge;
}

/** Wide, dusky: mangrove banks, a tour boat, a croc's eyes and back at the water, the place and the year written over it. */
export function drawRiver(ctx: CanvasRenderingContext2D, t: number, boil: number, b: Backdrops): void {
  bg(ctx, b.dusk640);
  drawRipples(ctx, RIVER_WATER_Y - 180, 1400, t / LOOP_S);
  drawBoat(ctx, boatX(t), 770, 300, t, boil);
  drawSaltCroc(ctx, { x: 830, y: 985, len: 520, rot: 0.01, face: -1, beat: t * 2 }, { lid: 0.3 }, boil);
  drawWaterFront(ctx, RIVER_WATER_Y + 110, t, 0.8);
  drawTextLine(ctx, 'AUSTRALIA', CX, TEXT.place.y, TEXT.place.size, 700, placeAt(t), PAPER_ON_DUSK);
  drawTextLine(ctx, 'Adelaide River', CX, TEXT.placeRiver.y, TEXT.placeRiver.size, 700, placeRiverAt(t), RED_ON_PAPER);
  const y = yearAt(t);
  drawTextLine(ctx, '2014', CX, TEXT.year.y, TEXT.year.size * (0.9 + 0.1 * y), 700, y, PAPER_ON_DUSK);
}

/** The whole croc along the water beside the boat, a measure bar over it, 18 ft over 5.5 m, the name. */
export function drawSize(ctx: CanvasRenderingContext2D, t: number, boil: number, b: Backdrops): void {
  bg(ctx, b.dusk700);
  drawRipples(ctx, SIZE_WATER_Y - 220, 1500, t / LOOP_S);
  drawBoat(ctx, 230, 752, 230, t, boil);
  const croc = sizeCrocAt(t);
  drawSaltCroc(ctx, croc, { lid: 0.1 }, boil);
  drawWaterFront(ctx, SIZE_WATER_Y, t, 0.82);
  const k = SIZE_LEN / 310;
  drawBar(ctx, croc.x - 168 * k, croc.x + 159 * k, SIZE_BAR_Y, sizeBarAt(t), boil);
  drawTextLine(ctx, 'saltwater croc', CX, TEXT.saltwater.y, TEXT.saltwater.size, 700, saltwaterAt(t), PAPER_ON_DUSK);
  drawTextLine(ctx, 'BRUTUS', CX, TEXT.name.y, TEXT.name.size, 700, nameAt(t), RED_ON_PAPER);
  drawTextLine(ctx, '18 ft', CX, TEXT.feet.y, TEXT.feet.size, 700, feetAt(t), PAPER_ON_DUSK);
  drawTextLine(ctx, '5.5 m', CX, TEXT.metres.y, TEXT.metres.size, 700, metresAt(t), PAPER_ON_DUSK);
}

/** The rise: the croc surges up out of the river, the shark across its jaws, a burst of spray on "JAWS". */
export function drawRise(ctx: CanvasRenderingContext2D, t: number, boil: number, b: Backdrops): void {
  const rear = risePose(t);
  drawRearing(ctx, rear, t, boil, b.dusk900);
  const age = t - JAWS_AT;
  const up = riseUpAt(t);
  drawRings(ctx, { x: 240, y: HOOK_WATER_Y + 20 }, (t - (JAWS_AT - 0.9)) * 0.9);
  if (up > 0.02 && age < 0) drawSpray(ctx, { x: 260, y: HOOK_WATER_Y - 20 }, (up - 0.02) * 0.9, 0.9, 1.7, 77);
  drawSpray(ctx, { x: rear.mouth.x - 60, y: rear.mouth.y + 60 }, age, 1.3, 2.6, 91);
  drawSpray(ctx, { x: 260, y: HOOK_WATER_Y - 20 }, age + 0.1, 1.1, 1.8, 33);
  if (age >= 0) drawThrashSpray(ctx, rear.mouth, t / LOOP_S, 30);
  drawTextLine(ctx, 'bull shark', CX, TEXT.sharkTag.y, TEXT.sharkTag.size, 700, sharkTagAt(t), RED_ON_PAPER);
}

/** Under the river: murky green-brown, a bull shark gliding upstream, the sky a bright wobbling lid above it. */
export function drawUnder(ctx: CanvasRenderingContext2D, t: number, boil: number, b: Backdrops): void {
  bg(ctx, b.murk);
  drawMurkLight(ctx, t / LOOP_S);
  const shark = underShark(t);
  drawBullShark(ctx, shark, { bend: shark.bend }, boil);
  // Silt drifting back as it swims on, and arrows pointing upstream.
  ctx.save();
  ctx.strokeStyle = 'rgba(244,237,220,0.55)';
  ctx.lineWidth = 8;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  const a = upriverAt(t);
  ctx.globalAlpha = a * (0.55 + 0.45 * Math.sin(t * 6));
  for (let i = 0; i < 3; i++) {
    const x = 640 + i * 90 + 10 * Math.sin(t * 5 + i);
    ctx.beginPath();
    ctx.moveTo(x, 590);
    ctx.lineTo(x + 40, 630);
    ctx.lineTo(x, 670);
    ctx.stroke();
  }
  ctx.restore();
  drawTextLine(ctx, 'bull shark', CX, TEXT.sharkTag.y, TEXT.sharkTag.size, 700, sharkTagUnderAt(t), RED_ON_PAPER);
  drawTextLine(ctx, 'upriver', 470, TEXT.upriver.y, TEXT.upriver.size, 700, upriverAt(t), { fill: PAPER, halo: '#1c2a18' });
}

/** The shark swims on; behind it a croc's eye and snout slip up at the surface, a half-lidded, sly look. */
export function drawWrong(ctx: CanvasRenderingContext2D, t: number, boil: number, b: Backdrops): void {
  const s = wrongScene(t);
  bg(ctx, b.dusk520);
  // The underwater half: murk below the surface.
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, WRONG_WATER_Y, VIDEO.width, VIDEO.height - WRONG_WATER_Y);
  ctx.clip();
  ctx.drawImage(b.murk, 0, 0);
  drawMurkLight(ctx, t / LOOP_S);
  ctx.restore();
  drawBullShark(ctx, s.shark, { bend: s.shark.bend }, boil);
  drawSaltCroc(ctx, s.croc, { lid: s.lid, gape: 0 }, boil);
  // The water over the croc's body and the shark: a murky film from the surface down, a foam line at the top.
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, WRONG_WATER_Y, VIDEO.width, VIDEO.height - WRONG_WATER_Y);
  ctx.clip();
  ctx.fillStyle = 'rgba(70,84,44,0.4)';
  ctx.fillRect(0, WRONG_WATER_Y, VIDEO.width, VIDEO.height);
  ctx.restore();
  ctx.save();
  ctx.strokeStyle = 'rgba(255,240,205,0.85)';
  ctx.lineWidth = 6;
  ctx.lineCap = 'round';
  ctx.beginPath();
  for (let x = -20; x <= VIDEO.width + 20; x += 16) {
    const y = WRONG_WATER_Y + 6 * Math.sin(x / 70 + t * 2.4) + 3 * Math.sin(x / 29 - t * 3);
    if (x < 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();
  ctx.restore();
  // Bubbles trailing off the croc's snout.
  for (let i = 0; i < 3; i++) drawBubble(ctx, s.croc.x + 540 + i * 24, WRONG_WATER_Y + 30 + 40 * ((t * 0.7 + i * 0.3) % 1), 9 + 3 * i, 0.9 * s.grin);
  drawTextLine(ctx, 'wrong river!', CX, TEXT.wrong.y, TEXT.wrong.size, 700, wrongTextAt(t), RED_ON_PAPER);
}

/** The croc's head, big and smug, its jaws shut, half-lidded, a burp of bubbles and "BRRP!". */
export function drawSmug(ctx: CanvasRenderingContext2D, t: number, boil: number, b: Backdrops): void {
  const s = smugAt(t);
  bg(ctx, b.dusk700);
  drawRipples(ctx, 1000, 1500, t / LOOP_S);
  drawSaltCroc(ctx, s.croc, { gape: s.gape, lid: s.lid }, boil);
  drawWaterFront(ctx, 1180, t, 0.8);
  drawBurp(ctx, { x: 800, y: 1040 }, t - BURP_AT);
  const a = burpTextAt(t);
  const pop = 0.8 + 0.3 * Math.sin(Math.PI * Math.min(1, (t - BURP_AT) / 0.4));
  drawTextLine(ctx, 'BRRP!', 780, TEXT.burp.y, TEXT.burp.size * pop, 700, a, RED_ON_PAPER);
}

/** A face-off: the bull shark on one side, the croc on the other, a big VS between them, a question mark. */
export function drawVs(ctx: CanvasRenderingContext2D, t: number, boil: number, b: Backdrops): void {
  bg(ctx, b.murk);
  drawMurkLight(ctx, t / LOOP_S);
  ctx.save();
  ctx.globalAlpha = 0.42;
  ctx.fillStyle = '#3a7aa8';
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(760, 0);
  ctx.lineTo(300, 1920);
  ctx.lineTo(0, 1920);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#d9822c';
  ctx.beginPath();
  ctx.moveTo(760, 0);
  ctx.lineTo(1080, 0);
  ctx.lineTo(1080, 1920);
  ctx.lineTo(300, 1920);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  const f = faceoffAt(t);
  drawBullShark(ctx, f.shark, { bend: f.shark.bend }, boil);
  drawSaltCroc(ctx, f.croc, { gape: f.gape, glare: 0.5 }, boil);
  const v = vsAt(t);
  const shake = 6 * Math.sin(t * 40) * (1 - v) + 3 * Math.sin(t * 29);
  drawTextLine(ctx, 'VS', CX + shake, TEXT.vs.y, TEXT.vs.size * (0.7 + 0.3 * v), 700, v, RED_ON_PAPER);
  const q = questionAt(t);
  drawTextLine(ctx, '?', 940, TEXT.question.y, TEXT.question.size * (0.85 + 0.15 * Math.sin(t * 8)), 700, q, RED_ON_PAPER);
}
