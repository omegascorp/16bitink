import { SECTIONS, VOICE_S, WORDS } from './words';

/**
 * When everything happens, in seconds of the video, read off the narration
 * (words.ts) so every beat lands on the word that names it. Sections follow
 * script.md: 0 cold open, 1 corn snake, 2 olive python, 3 the game,
 * 4 Burmese + fawn, 5 Burmese + deer, 6 rock python + hyena, 7 the
 * egg-eater, 8 the end.
 */

const bare = (s: string): string => s.toLowerCase().replace(/[^a-z0-9'-]/g, '');

/** When `text` (a word or a few in a row) is first said at or after `after` seconds. */
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

/** The end card holds this long after the last word, then the video ends. */
export const END_HOLD_S = 5;
/** The video's length, in whole 30 fps frames. */
export const VIDEO_S = Math.round((VOICE_S + END_HOLD_S) * 30) / 30;

const s = sectionStart;

/** The beats, section by section. */
export const T = {
  // 0 · cold open
  seventySeven: said('seventy-seven', s(0)),
  notEven: said('not even', s(0)),
  lining: said('today', s(0)),
  mouse: said('mouse', s(0)),
  hyena: said('hyena', s(0)),
  unhinge: said('unhinge', s(0)),
  champion: said('but the real', s(0)),
  barely: said('barely', s(0)),
  // 1 · corn snake
  cornSnake: said('corn snake', s(1)),
  mice: said('mice', s(1)),
  ounce: said('ounce', s(1)),
  belly: said('belly', s(1)),
  cob: said('cob', s(1)),
  goUp: said("let's go up", s(1)),
  // 2 · olive python
  y2014: said('twenty fourteen', s(2)),
  olive: said('olive', s(2)),
  crocodile: said('crocodile', s(2)),
  coiled: said('coiled', s(2)),
  squeezed: said('squeezed', s(2)),
  tookDown: said('took', s(2)),
  hours: said('hours', s(2)),
  fiveOrSix: said('five or six', s(2)),
  snakeEating: said('a snake eating', s(2)),
  australia: said('australia', s(2) + 15),
  // 3 · the game
  inkSnake: said('inksnake', s(3)),
  tenReal: said('ten real', s(3)),
  free: said('free', s(3)),
  // 4 · Burmese + fawn
  next: said('next', s(4)),
  heavier: said('heavier', s(4)),
  y2015: said('twenty fifteen', s(4)),
  burmese: said('burmese', s(4)),
  thirtyOne: said('thirty-one', s(4)),
  thirtyFive: said('thirty-five', s(4)),
  howFit: said('so how', s(4)),
  forget: said('forget', s(4)),
  lowerJaw: said('lower jaw', s(4)),
  spread: said('spread', s(4)),
  creeping: said('creeping', s(4)),
  oneSide: said('one side', s(4)),
  windpipe: said('windpipe', s(4)),
  snorkel: said('snorkel', s(4)),
  // 5 · Burmese + deer
  remember: said('remember', s(5)),
  naples: said('naples', s(5)),
  fifteenFoot: said('fifteen-foot', s(5)),
  deer77: said('seventy-seven-pound', s(5)),
  measured: said('they measured', s(5)),
  tenInches: said('ten inches', s(5)),
  footWide: said('foot wide', s(5)),
  hundredTwenty: said('hundred and twenty', s(5)),
  thrilled: said("florida's", s(5)),
  heart: said('heart', s(5)),
  forty: said('forty', s(5)),
  // 6 · rock python + hyena
  heaviest: said('but the heaviest', s(6)),
  kenya: said('kenya', s(6)),
  rockPython: said('african rock', s(6)),
  swallowingHyena: said('swallowing', s(6)),
  hyenaSaid: said('hyena', s(6)),
  hundredFifty: said('hundred and fifty', s(6)),
  laughing: said('laughing', s(6)),
  wasnt: said("wasn't", s(6)),
  // 7 · the egg-eater
  biggestWins: said('so the biggest', s(7)),
  notClose: said('not even close', s(7)),
  y2023: said('twenty twenty-three', s(7)),
  thisOne: said('this', s(7) + 10),
  halfInch: said('half an inch', s(7)),
  twoInches: said('two inches', s(7)),
  twice: said('twice', s(7)),
  spikes: said('spikes', s(7)),
  crack: said('crack', s(7)),
  spits: said('spits', s(7)),
  flat: said('flat', s(7)),
  biggestMouth: said('so the biggest mouth', s(7)),
  barely7: said('barely', s(7)),
  // 8 · the end
  every: said('every', s(8)),
  start: said('start', s(8)),
} as const;

/** One meal step: when the meal's scene starts and ends (its swallow runs inside it). */
export interface StepTimes {
  readonly from: number;
  readonly to: number;
}
