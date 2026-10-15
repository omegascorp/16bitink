import { makeDraw } from '../src/art/kit';
import { drawLander, LANDER_H, LANDER_W } from '../src/art/landerArt';
import { drawProspector, POSES, PROSPECTOR_FRAME, PROSPECTOR_GROUND } from '../src/art/prospector';
import { makeCanvas } from '../src/art/pen';
import { evenLoadout, LOOK_NAMES, lookOf, prospectorLook, type Look, type ProspectorLook } from '../src/logic/gear';
import type { Wreck } from '../src/logic/repairs';

// Dev page: the prospector in every look and pose, big enough to judge the drawing.
const root = document.getElementById('root');
if (!root) throw new Error('#root missing');

const SCALE = 5;

function section(title: string, note: string): HTMLDivElement {
  const h = document.createElement('h2');
  h.textContent = title;
  const p = document.createElement('p');
  p.textContent = note;
  const row = document.createElement('div');
  row.className = 'row';
  root!.append(h, p, row);
  return row;
}

function figure(row: HTMLElement, label: string, canvas: HTMLCanvasElement): void {
  const fig = document.createElement('figure');
  const cap = document.createElement('figcaption');
  cap.textContent = label;
  fig.append(canvas, cap);
  row.append(fig);
}

function prospector(look: ProspectorLook, pose: (typeof POSES)[number], f = 0): HTMLCanvasElement {
  const P = PROSPECTOR_FRAME;
  const { canvas, ctx } = makeCanvas(P * SCALE, P * SCALE);
  ctx.scale(SCALE, SCALE);
  ctx.translate(P / 2, P / 2);
  drawProspector(makeDraw(ctx, 100 + f, f, PROSPECTOR_GROUND), pose, look);
  canvas.style.width = `${P * 3}px`;
  return canvas;
}

for (const mk of [1, 5, 9]) {
  const row = section(`Mk ${mk}: ${LOOK_NAMES[lookOf(mk)]}`, 'idle, walk, drilling sideways, down and up, on a ladder, flying');
  for (const pose of POSES) figure(row, pose, prospector(prospectorLook(evenLoadout(mk)), pose));
}

const mixed = section('Half-upgraded', 'Each piece changes on its own: here a contractor drill and jetpack on the starter suit and helmet, then a deep-space helmet on contractor gear.');
figure(mixed, 'drill 5, jetpack 5', prospector({ drill: 1, suit: 0, helmet: 0, jetpack: 1 }, 'idle'));
figure(mixed, 'helmet 9, the rest 5', prospector({ drill: 1, suit: 1, helmet: 2, jetpack: 1 }, 'idle'));

const ships = section('The lander', 'Refitted as the game goes on: the tin can (planets 1–3), refitted with a cargo pod, a solar wing and a floodlight (planets 4–7), the deep hauler with twin engines and a crane (planets 8–10). The hopper on the right is where the bag is tipped in.');
const landerCanvas = (look: Look, wreck?: Wreck): HTMLCanvasElement => {
  const S = 3;
  const { canvas, ctx } = makeCanvas(LANDER_W * S, LANDER_H * S);
  ctx.scale(S, S);
  ctx.translate(LANDER_W / 2, LANDER_H);
  drawLander(makeDraw(ctx, 200, 0, 0), look, wreck);
  canvas.style.width = `${LANDER_W * 2.2}px`;
  return canvas;
};
for (const [look, name] of [[0, 'tin can'], [1, 'refitted'], [2, 'deep hauler']] as const) figure(ships, name, landerCanvas(look));

const wrecks = section('After the crash', 'The tin can as chapter 1 mends it, one system at a time: a dark cracked porthole until the printer runs, the dish snapped until the comms work, a gash and torn heat-shield tiles until the hull is plated, a crumpled bell until the thrusters are fixed.');
const BROKEN: Wreck = { printer: true, comms: true, hull: true, thrusters: true };
for (const [name, wreck] of [
  ['the wreck', BROKEN],
  ['printer running', { ...BROKEN, printer: false }],
  ['comms up', { ...BROKEN, printer: false, comms: false }],
  ['hull plated', { printer: false, comms: false, hull: false, thrusters: true }],
] as const) figure(wrecks, name, landerCanvas(0, wreck));
