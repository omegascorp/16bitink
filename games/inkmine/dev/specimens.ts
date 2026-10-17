import { makeDraw } from '../src/art/kit';
import { drawLander, drawLanderAir, LANDER_H, LANDER_W } from '../src/art/landerArt';
import { drawProspector, POSES, PROSPECTOR_FRAME, PROSPECTOR_GROUND } from '../src/art/prospector';
import { ART_RES } from '../src/art/palette';
import { LANDER_FINISH, PROSPECTOR_FINISH, PROSPECTOR_RES, render } from '../src/art/textures';
import { evenLoadout, LOOK_NAMES, lookOf, MAX_MK, PIECES, prospectorLook, STARTER_LOADOUT, type Look, type ProspectorLook } from '../src/logic/gear';
import { MARKS } from '../src/art/prospector/marks';
import { drawWreck, WRECK_FRAME } from '../src/art/wreckArt';
import type { Wreck } from '../src/logic/repairs';
import { drawTech, TECH_FRAME } from '../src/art/techArt';
import { drawLamplighter, drawOutpost, LAMPLIGHTER, OUTPOST_ART } from '../src/art/lamplighterArt';
import { BLUE } from '../src/art/palette';
import { SHIP_MODULES, SHIP_SYSTEMS, STARSHIP_TECH, SUIT_TECH, techKey } from '../src/logic/tech';
import { TECH_RES } from '../src/art/textures';
import { BROKEN_SHIP, drawStarship, drawStarshipAir, STARSHIP_ART, type ShipLook } from '../src/art/starship';
import { SHIP_FINISH, SHIP_MAP_FINISH, SHIP_MAP_RES, SHIP_RES } from '../src/art/textures';
import { creatureSections } from './creatures';

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

function prospector(look: ProspectorLook, pose: (typeof POSES)[number], f = 0, res = SCALE): HTMLCanvasElement {
  const P = PROSPECTOR_FRAME;
  const canvas = render(P, P, P / 2, P / 2, res, (ctx) => drawProspector(makeDraw(ctx, 100 + f, f, PROSPECTOR_GROUND), pose, look), PROSPECTOR_FINISH);
  canvas.style.width = `${P * 3}px`;
  return canvas;
}

/** As in play: drawn at the game's resolution and shown at the size it stands on screen, on the sky's colours. */
function atPlaySize(row: HTMLElement, label: string, canvas: HTMLCanvasElement, px: number): void {
  canvas.style.width = `${px}px`;
  canvas.style.background = 'linear-gradient(#4b5583, #a59bab 70%, #ada79c 70%)';
  figure(row, label, canvas);
}

creatureSections(section, figure);

const starship = section('The starship', 'Your starship: as it first docks (every system broken, dark), part way mended, and whole. Then at the Starship tab\'s size, and the star map\'s little ship.');
function shipCanvas(look: ShipLook, res: number, finish = SHIP_FINISH): HTMLCanvasElement {
  const S = STARSHIP_ART;
  return render(S.w, S.h, S.w / 2, S.h / 2, res, (ctx) => drawStarship(makeDraw(ctx, 796, 0, 0), look), finish, (ctx) => drawStarshipAir(makeDraw(ctx, 797, 0, 0), look));
}
const WHOLE: ShipLook = { power: true, telescope: true, tank: true, engine: true };
for (const [name, look] of [['as it docks', BROKEN_SHIP], ['power and tank mended', { ...BROKEN_SHIP, power: true, tank: true }], ['whole', WHOLE]] as const) {
  const c = shipCanvas(look, SHIP_RES);
  c.style.width = `${Math.min(1400, window.innerWidth - 60)}px`;
  c.style.background = '#efe6cf';
  figure(starship, name, c);
}
for (const look of [BROKEN_SHIP, WHOLE]) {
  const c = shipCanvas(look, SHIP_RES);
  c.style.width = '500px';
  c.style.background = '#efe6cf';
  figure(starship, 'at the Starship tab\'s size', c);
}
{
  const m = shipCanvas(WHOLE, SHIP_MAP_RES, SHIP_MAP_FINISH);
  m.style.width = '60px';
  m.style.background = '#1d2140';
  figure(starship, 'on the star map', m);
  const s = shipCanvas(BROKEN_SHIP, SHIP_MAP_RES, SHIP_MAP_FINISH);
  s.style.height = '80px';
  s.style.background = '#efe6cf';
  figure(starship, 'on a story card', s);
}

const MKS = Array.from({ length: MAX_MK + 1 }, (_, mk) => mk);

const play = section('At play size', 'As the game draws them, at the size they stand on screen: every piece at the same mark, Mk 0 to Mk 10, idle and drilling.');
for (const mk of MKS) atPlaySize(play, `Mk ${mk}`, prospector(prospectorLook(evenLoadout(mk)), 'idle', 0, PROSPECTOR_RES), PROSPECTOR_FRAME * 0.82);
for (const mk of [0, 1, 2]) atPlaySize(play, `Mk ${mk} drilling`, prospector(prospectorLook(evenLoadout(mk)), 'drillSide', 0, PROSPECTOR_RES), PROSPECTOR_FRAME * 0.82);
atPlaySize(play, 'the wreck', landerCanvas(0, { printer: true, comms: true, hull: true, thrusters: true }, ART_RES), LANDER_W);

const every = section('Every mark', 'The whole set at each mark, big: Mk 0 the starter, then each planet\'s set in its materials.');
for (const mk of MKS) figure(every, `Mk ${mk} ${MARKS[mk]!.planet}`, prospector(prospectorLook(evenLoadout(mk)), 'idle'));

for (const mk of [0, 1, 2, 5, 9]) {
  const row = section(`Mk ${mk}: ${MARKS[mk]!.planet}, ${LOOK_NAMES[lookOf(mk)]}`, 'idle, walk, drilling sideways, down and up, on a ladder, flying');
  for (const pose of POSES) figure(row, pose, prospector(prospectorLook(evenLoadout(mk)), pose));
}

const mixed = section('Half-upgraded', 'Each piece changes on its own: the starter set with one Graphite piece at a time, then Graphite\'s set with Mycel\'s pieces coming in, then a mix across the families.');
for (const piece of PIECES) figure(mixed, `${piece} 1`, prospector({ ...STARTER_LOADOUT, [piece]: 1 }, 'idle'));
figure(mixed, 'Mk 1, drill and helmet 2', prospector({ ...evenLoadout(1), drill: 2, helmet: 2 }, 'idle'));
figure(mixed, 'Mk 1, suit and pack 2', prospector({ ...evenLoadout(1), suit: 2, pack: 2 }, 'idle'));
figure(mixed, 'drill 5, jetpack 6, rest 2', prospector({ ...evenLoadout(2), drill: 5, jetpack: 6 }, 'idle'));
figure(mixed, 'helmet 9, the rest 5', prospector({ ...evenLoadout(5), helmet: 9 }, 'idle'));

const ships = section('The lander', 'Refitted as the game goes on: the tin can (planets 1–3), refitted with a cargo pod, a solar wing and a floodlight (planets 4–7), the deep hauler with twin engines and a crane (planets 8–10). The hopper on the right is where the bag is tipped in.');
function landerCanvas(look: Look, wreck?: Wreck, res = 3): HTMLCanvasElement {
  const canvas = render(LANDER_W, LANDER_H, LANDER_W / 2, LANDER_H, res, (ctx) => drawLander(makeDraw(ctx, 200, 0, 0), look, wreck), LANDER_FINISH, (ctx) => drawLanderAir(makeDraw(ctx, 250, 0, 0), look, wreck));
  canvas.style.width = `${LANDER_W * 2.2}px`;
  return canvas;
}
for (const [look, name] of [[0, 'tin can'], [1, 'refitted'], [2, 'deep hauler']] as const) figure(ships, name, landerCanvas(look));

const wrecks = section('After the crash', 'The tin can as chapter 1 mends it, one system at a time: a dark cracked porthole until the printer runs, the dish snapped until the radio work, a gash and torn heat-shield tiles until the hull is plated, a crumpled bell until the thrusters are fixed.');
const BROKEN: Wreck = { printer: true, comms: true, hull: true, thrusters: true };
for (const [name, wreck] of [
  ['the wreck', BROKEN],
  ['printer running', { ...BROKEN, printer: false }],
  ['comms up', { ...BROKEN, printer: false, comms: false }],
  ['hull plated', { printer: false, comms: false, hull: false, thrusters: true }],
] as const) figure(wrecks, name, landerCanvas(0, wreck));

function tech(t: Parameters<typeof drawTech>[1], v: Parameters<typeof drawTech>[2]): HTMLCanvasElement {
  const F = TECH_FRAME;
  const canvas = render(F, F, F / 2, F / 2, TECH_RES, (ctx) => drawTech(makeDraw(ctx, 600, 0, 0), t, v), { line: 0.7, rim: 0.6 });
  canvas.style.width = `${F * 3}px`;
  canvas.style.background = '#efe6cf';
  return canvas;
}
function wreck(piece: (typeof PIECES)[number], mk: number): HTMLCanvasElement {
  const F = WRECK_FRAME;
  const canvas = render(F, F, F / 2, F / 2, 4, (ctx) => drawWreck(makeDraw(ctx, 460, 0, 0), piece, mk));
  canvas.style.width = `${F * 3}px`;
  canvas.style.background = '#c9c4b8';
  return canvas;
}
const lampRow = section('The Lamplighters', 'A Lamplighter in each boil frame, and their outpost on the far rim.');
for (const f of [0, 1, 2]) {
  const L = LAMPLIGHTER;
  const c = render(L.w, L.h, L.w * 0.62, L.h - 2, 4, (ctx) => drawLamplighter(makeDraw(ctx, 700 + f, f, 0, BLUE)), LANDER_FINISH);
  c.style.width = `${L.w * 3}px`;
  c.style.background = 'linear-gradient(#4b5583, #a59bab 85%, #ada79c 85%)';
  figure(lampRow, `lamplighter ${f}`, c);
}
{
  const O = OUTPOST_ART;
  const c = render(O.w, O.h, O.w / 2, O.h - 2, 3, (ctx) => drawOutpost(makeDraw(ctx, 720, 0, 0)), LANDER_FINISH);
  c.style.width = `${O.w * 2}px`;
  c.style.background = 'linear-gradient(#4b5583, #a59bab 90%, #ada79c 90%)';
  figure(lampRow, 'the outpost', c);
}
for (const piece of PIECES) {
  const row = section(`Technology: ${piece}`, 'The gear slot in the lander menu at every mark, Mk 0 to Mk 10.');
  for (const mk of MKS) figure(row, `Mk ${mk}`, tech({ kind: 'gear', piece }, mk));
}
const toolRow = section('Technology: tools', 'The receiver.');
for (const t of SUIT_TECH.filter((x) => x.kind !== 'gear')) figure(toolRow, techKey(t), tech(t, 'mended'));
const wreckRow = section('Broken parts', 'Gear lying in the world, tipped over in the dust: Graphite\'s (Mk 1, our own kind of gear) and Mycel\'s (Mk 2, the Aster\'s), then a few later marks.');
for (const mk of [1, 2]) for (const piece of PIECES) figure(wreckRow, `${piece} ${mk}`, wreck(piece, mk));
for (const [piece, mk] of [['drill', 4], ['helmet', 6], ['jetpack', 9]] as const) figure(wreckRow, `${piece} ${mk}`, wreck(piece, mk));
const shipRow = section('Technology: ship', 'Systems broken and mended, then the modules.');
for (const t of SHIP_SYSTEMS) for (const v of ['broken', 'mended'] as const) figure(shipRow, `${techKey(t)} ${v}`, tech(t, v));
for (const t of SHIP_MODULES) figure(shipRow, techKey(t), tech(t, 'mended'));
const starRow = section('Technology: starship', 'The starship\'s systems as the wormhole left them, then mended; the jump drive is past mending here.');
for (const t of STARSHIP_TECH) for (const v of ['broken', 'mended'] as const) figure(starRow, `${techKey(t)} ${v}`, tech(t, v));
