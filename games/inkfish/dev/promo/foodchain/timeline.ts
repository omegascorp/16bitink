import { FPS_LONG } from '../descent/frame';
import { SECTIONS, VOICE_S, WORDS } from './words';

/**
 * When everything happens, in seconds of the video, read off the narration
 * (words.ts) so every beat lands on the word that names it. Section numbers
 * follow script.md: 0 cold open, 1 diatom, 2 copepod, 3 anchovy, 4 mackerel,
 * 5 tuna, 6 the game, 7 orca, 8 why it stops, 9 the giants, 10 the payoff.
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

/** The beats, section by section. */
export const T = {
  // 0 · cold open: four gulps, the empty top, the blue whale, the orcas, the cut
  openAnchovy: said('eats', s(0)),
  openMackerel: said('eats the anchovy', s(0)),
  openTuna: said('eats the mackerel', s(0)),
  openOrca: said('eats the tuna', s(0)),
  biggerFish: said("there's always", s(0)),
  isnt: said("there isn't", s(0)),
  biggestEver: said('biggest animal', s(0)),
  paperclip: said('paperclip', s(0)),
  hunts: said('the one animal', s(0)),
  lessThanHalf: said('less than half', s(0)),
  climb: said("let's climb", s(0)),
  grainOfSalt: said('grain', s(0)),
  // 1 · diatom
  diatom: s(1),
  plant: said('plant', s(1)),
  glass: said('glass', s(1)),
  diatomName: said('diatom', s(1)),
  breath: said('one breath', s(1)),
  everyBite: said('every bite', s(1)),
  hundred: said('a hundred percent', s(1)),
  // 2 · copepod
  copepod: s(2),
  copepodName: said('copepod', s(2)),
  oneEye: said('one eye', s(2)),
  cyclops: said('cyclops', s(2)),
  eatsDiatom: said('eats the diatom', s(2)),
  catch: said("here's the catch", s(2)),
  tenth: said('tenth', s(2)),
  burns: said('burns', s(2)),
  downToTen: said('down to ten', s(2)),
  // 3 · anchovy
  anchovy: s(3),
  anchovyName: said('anchovy', s(3)),
  mouthOpen: said('mouth wide open', s(3)),
  net: said('net', s(3)),
  sieves: said('sieves', s(3)),
  bluefinMeal: said('bluefin', s(3)),
  holdThought: said('hold that thought', s(3)),
  onePercent: said('one percent', s(3)),
  // 4 · mackerel
  mackerel: s(4),
  mackerelName: said('mackerel', s(4)),
  fussy: said('fussy', s(4)),
  japan: said('japan', s(4)),
  krill: said('krill', s(4)),
  stepDown: said('a step down', s(4)),
  anchoviesSummer: said('anchovies', s(4)),
  holdOn: said('hold on', s(4)),
  stepBelow: said("you don't have", s(4)),
  tenthPercent: said('a tenth of a percent', s(4)),
  // 5 · tuna
  tuna: s(5),
  tunaName: said('atlantic', s(5)),
  record: said('the biggest one', s(5)),
  kilos: said('seventy-nine', s(5)),
  pounds: said('fifteen hundred', s(5)),
  piano: said('grand piano', s(5)),
  warm: said('warm', s(5)),
  notSupposed: said("fish aren't", s(5)),
  hundredth: said('one-hundredth', s(5)),
  // 6 · the game
  game: s(6),
  inkfish: said('inkfish', s(6)),
  puddle: said('puddle', s(6)),
  eatUp: said('eat your way up', s(6)),
  free: said('chapter', s(6)),
  jaws: said('and the shark', s(6)),
  sideDish: said('side dish', s(6)),
  // 7 · orca
  orca: s(7),
  orcaName: said('the orca', s(7)),
  gibraltar: said('strait', s(7)),
  halfHour: said('half an hour', s(7)),
  catchOne: said('catch one', s(7)),
  notAFish: said('yes', s(7)),
  allow: said("we'll allow", s(7)),
  southAfrica: said('south africa', s(7)),
  portStarboard: said('port', s(7)),
  greatWhites: said('great whites', s(7)),
  sharkFromJaws: said('the shark from jaws', s(7)),
  left: said('they left', s(7)),
  months: said('months', s(7)),
  whatEats: said('so what eats', s(7)),
  nothing: said('nothing', s(7)),
  untilIsnt: said("until there isn't", s(7)),
  // 8 · why the chain stops
  why: s(8),
  remember100: said('remember the hundred', s(8)),
  keepsTenth: said('keeps only', s(8)),
  thousandth: said('thousandth', s(8)),
  hunter: said('a hunter of orcas', s(8)),
  notEnough: said("isn't enough", s(8)),
  cantClimb: said("can't climb", s(8)),
  // 9 · the giants
  giants: s(9),
  giantsSame: said('the giants', s(9)),
  whaleShark: said('whale shark', s(9)),
  bus: said('bus', s(9)),
  eatsCopepods: said('copepods', s(9)),
  fishEggs: said('fish eggs', s(9)),
  stepTwo: said('step two', s(9)),
  blueWhale: said('the blue whale', s(9)),
  tonnes: said('a hundred and fifty', s(9)),
  lb330k: said('three hundred thousand', s(9)),
  eatsKrill: said('eats krill', s(9)),
  paperclip9: said('paperclip', s(9)),
  skips: said('skips', s(9)),
  thousandMore: said('a thousand times more', s(9)),
  sixteen: said('sixteen tonnes', s(9)),
  notTop: said("aren't at the top", s(9)),
  bottom: said('at the bottom', s(9)),
  // 10 · the payoff
  payoff: s(10),
  notSafe: said("isn't safe", s(10)),
  y2019: said('2019', s(10)),
  pod: said('a pod', s(10)),
  chaseDown: said('chase down', s(10)),
  win: said('win', s(10)),
  together: said('together', s(10)),
  alwaysBigger: said("there's always", s(10)),
  team: said("there's a team", s(10)),
  start: said('start at the bottom', s(10)),
  site: said('16bit.ink', s(10)),
} as const;
