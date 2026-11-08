import { FPS_LONG } from '../descent/frame';
import type { Animal } from './species';
import { SECTIONS, VOICE_S, WORDS } from './words';

/**
 * When everything happens, in seconds of the video, read off the narration
 * (words.ts) so every beat lands on the word that names it. Sections follow
 * script.md's blocks, 0-based: 0 cold open + you, 1 jaguar/dog/lion,
 * 2 the game + bull shark, 3 alligator/crocodile, 4 great white/T. rex/
 * megalodon, 5 the piranha.
 */

const bare = (s: string): string => s.toLowerCase().replace(/[^a-z0-9'-]/g, '');

/** When `text` is first said at or after `after` seconds (a word or a few words in a row). */
export function said(text: string, after = 0): number {
  const want = text.split(/\s+/).map(bare);
  for (let i = 0; i + want.length <= WORDS.length; i++) {
    if (WORDS[i]!.start < after) continue;
    if (want.every((w, k) => bare(WORDS[i + k]!.text) === w)) return WORDS[i]!.start;
  }
  throw new Error(`"${text}" isn't said after ${after}s`);
}

/** When the words starting with `text` (said at or after `after`) end. */
export function saidEnd(text: string, after = 0): number {
  const start = said(text, after);
  const i = WORDS.findIndex((w) => w.start === start);
  return WORDS[i + text.split(/\s+/).length - 1]!.end;
}

export const sectionStart = (i: number): number => SECTIONS[i]!.start;
export const sectionEnd = (i: number): number => SECTIONS[i]!.end;

/** How long the end card holds after the last word: YouTube's shortest end screen. */
export const END_HOLD_S = 5;
/** The video's length: the end card's hold after the last word, in whole frames. */
export const VIDEO_S = Math.round((Math.max(WORDS[WORDS.length - 1]!.end, VOICE_S - 0.2) + END_HOLD_S) * FPS_LONG) / FPS_LONG;

const s = sectionStart;

/** The beats, block by block. */
export const T = {
  // 1 · cold open + you
  measuredOpen: said('measured', s(0)),
  crocodile: said('crocodile', s(0)),
  online: said('but a lot', s(0)),
  half: said('half', s(0)),
  psi: said('psi', s(0)),
  notBite: said('a bite', said('psi', s(0))),
  today: said('so today', s(0)),
  realNumbers: said('real numbers', s(0)),
  measured: said('measured', said('real numbers', s(0))),
  estimate: said('estimate', s(0)),
  forSize: said('and the strongest', s(0)),
  fish: said('fish', s(0)),
  holdOnto: said('hold onto', s(0)),
  startYou: said("let's start", s(0)),
  clench: said('clench', s(0)),
  person: said("that's like", s(0)),
  tooth: said('tooth', s(0)),
  // 2 · jaguar, dog, lion
  jaguar: said('now a jaguar', s(1)),
  shell: said('enough', s(1)),
  shellWord: said('shell', s(1)),
  dog: said('a big pet', s(1)),
  researchers: said('researchers', s(1)),
  hardest: said('the hardest', s(1)),
  average: said('the average', s(1)),
  lion: said('and a lion', s(1)),
  estimated: said('estimated', s(1)),
  lessThan: said('less than', s(1)),
  crush: said("doesn't crush", s(1)),
  holdsOn: said('holds on', s(1)),
  // 3 · the game, bull shark
  quick: said('quick one', s(2)),
  free: said('free', s(2)),
  biteUp: said('bite your way', s(2)),
  speaking: said('speaking', s(2)),
  jump: said('jump', s(2)),
  bull: said('a bull shark', s(2)),
  muscles: said('worked out', s(2)),
  forWeight: said('for its weight', s(2)),
  evenWhite: said('even the great white', s(2)),
  // 4 · alligator, crocodile
  alligator: said('an american', s(3)),
  smallCar: said('about the weight', s(3)),
  car: said('car', s(3)),
  record: said('and the record', s(3)),
  fifteen: said('fifteen', s(3)),
  strongest: said('the strongest', s(3)),
  anyAnimal: said('any animal', s(3)),
  funny: said('funny', s(3)),
  open: said('open', s(3)),
  weaker: said('weaker', s(3)),
  tape: said('tape', s(3)),
  remember: said('remember', s(3)),
  closer: said("we're getting closer", s(3)),
  // 5 · great white, T. rex, megalodon
  huge: said('now the estimates', s(4)),
  greatWhite: said('a great white', s(4)),
  model3d: said('3d model', s(4)),
  trex: said('tyrannosaurus', s(4)),
  higher: said('some studies', s(4)),
  elephant: said('either way', s(4)),
  elephantWord: said('elephant', s(4)),
  megalodon: said('and megalodon', s(4)),
  scaleUp: said('scale up', s(4)),
  tenTimes: said('ten', s(4)),
  anEstimate: said('an estimate', s(4)),
  // 6 · the piranha
  forSizeTwist: said('but for its', s(5)),
  this: said('this', said('nothing here', s(5))),
  piranha: said('a black piranha', s(5)),
  twoHalf: said('two and a half', s(5)),
  bitSensor: said('it bit', s(5)),
  thirty: said('more than', s(5)),
  bonyFish: said('the strongest', s(5)),
  poundForPound: said('so pound', s(5)),
  fitsHand: said('fits in one', s(5)),
  ifYouLike: said('and if you like', s(5)),
  inkfishFree: said('InkFish', said('and if you like', s(5))),
} as const;

/** One bite on the bar: the head slides in at `arrive`, chomps on the number (`at`), the counter lands at `land`, the stamp thumps at `stamp`. */
export interface Bite {
  readonly animal: Animal;
  readonly arrive: number;
  readonly at: number;
  readonly land: number;
  readonly stamp: number;
  /** When it backs off the bar (the next head's arrival, or a cut). */
  readonly leave: number;
  /** The head size this bite is drawn at (the cold open's croc is the record's, closer). */
  readonly size?: number;
  /** Counter rolls from 0 (true) or from the bite before. */
  readonly fromZero?: boolean;
  /** Not on the ladder (the cold open's preview of the record). */
  readonly preview?: boolean;
}

/** A bite whose number starts with `number`, said after `after`: chomp on the number, land on "pounds". */
function bite(animal: Animal, arrive: number, number: string, after: number, leave: number, extra: Partial<Bite> = {}): Bite {
  const at = said(number, after);
  const land = saidEnd('pounds', at);
  return { animal, arrive, at, land, stamp: land + 0.15, leave, ...extra };
}

export const BITES: readonly Bite[] = [
  // The cold open: the croc is already clamped on the bar, the counter racing, at 0.5 s.
  { animal: 'saltCroc', arrive: -1, at: 0.12, land: saidEnd('pounds', s(0)), stamp: T.measuredOpen, leave: T.startYou - 0.6, size: 700, fromZero: true, preview: true },
  bite('human', T.startYou, 'a hundred', T.clench, T.jaguar - 0.2, { fromZero: true }),
  bite('jaguar', T.jaguar, 'two hundred', T.jaguar, T.dog - 0.1),
  bite('dog', T.dog, 'three hundred', T.hardest, T.lion - 0.2),
  bite('lion', T.lion, 'about four', T.lion, T.quick - 0.3, { stamp: T.estimated }),
  bite('bullShark', T.bull - 0.4, 'up to', T.bull, T.alligator - 0.4),
  bite('alligator', T.alligator - 0.2, 'two thousand', T.alligator, T.record - 0.2),
  bite('saltCroc', T.record, 'three thousand', T.record, T.funny + 0.3),
  bite('greatWhite', T.greatWhite - 0.5, 'about four', T.greatWhite, T.trex - 0.3),
  bite('trex', T.trex - 0.2, 'up to', T.trex, T.megalodon - 0.3),
  { ...bite('megalodon', T.megalodon, 'up to about', T.megalodon, T.forSizeTwist), stamp: T.anEstimate },
  bite('piranha', T.this + 0.3, 'seventy-two', T.bitSensor, T.poundForPound, { fromZero: true }),
];

/** The bites on the ladder, in order (everything but the cold open's preview). */
export const LADDER: readonly Bite[] = BITES.filter((b) => !b.preview);

/** The bite on the bar at t (the latest one that has arrived and not left), if any. */
export function biteAt(t: number): Bite | null {
  let on: Bite | null = null;
  for (const b of BITES) if (t >= b.arrive && t < b.leave + 0.7) on = b;
  return on;
}
