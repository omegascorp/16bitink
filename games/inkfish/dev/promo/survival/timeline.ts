import { FPS_LONG } from '../descent/frame';
import { SECTIONS, VOICE_S, WORDS } from './words';

/**
 * When everything happens, in seconds of the video, read off the narration
 * (words.ts) so every beat lands on the word that names it. Sections follow
 * script.md's blocks, 0-based: 0 cold open + line-up, 1 round 1, 2 the
 * speed-round break + the game, 3 round 2 (heat), 4 round 3 (sea water),
 * 5 round 4 (out of water), 6 the final, 7 the winner.
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

const s = (i: number): number => SECTIONS[i]!.start;
const e = (i: number): number => SECTIONS[i]!.end;

/** How long the end card holds after the last word: YouTube's shortest end screen. */
export const END_HOLD_S = 5;
export const LAST_WORD_S = Math.max(WORDS[WORDS.length - 1]!.end, VOICE_S - 0.2);
export const VIDEO_S = Math.round((LAST_WORD_S + END_HOLD_S) * FPS_LONG) / FPS_LONG;

const after = (text: string, from: string, at: number): number => said(text, said(from, at));

export const T = {
  // 0 · cold open
  hundred: said('hundred'),
  five: said('five'),
  only: said('only'),
  lineupStaged: said('line-up'),
  real: said('real'),
  wait: said('wait'),
  squid: said('squid'),
  mollusc: said('mollusc'),
  bye: said('bye'),
  okay: said('okay'),
  smallest: said('smallest'),
  three: said('three tiny'),
  desert: said('desert'),
  mudskippers: said('mudskippers'),
  family: said('family'),
  rivulus: said('mangrove'),
  remember: said('remember'),
  four: said('four inches'),
  goldfish: said('goldfish'),
  twenty: said('twenty'),
  eel: said('eel'),
  icefish: said('icefish'),
  salmon29: said('twenty-nine'),
  salmon: said('salmon'),
  tuna31: said('thirty-one'),
  ninety: said('ninety'),
  cod39: said('thirty-nine'),
  cod: said('cod'),
  serious: said('and then it gets'),
  mako9: said('nine feet'),
  white15: said('fifteen'),
  ton: said('ton'),
  white: said('great white'),
  pick: said('pick'),
  most: said('most'),
  // 1 · round 1: stop swimming
  round1: said('round one'),
  stop: said('stop swimming'),
  fiveMin: said('five minutes'),
  some: said('some fish'),
  waterRush: said('water has'),
  tunaStop: said('tunas', s(1)),
  skipjack1: said('skipjack', s(1)),
  yellowfin1: said('yellowfin', s(1)),
  bluefin1: said('bluefin', s(1)),
  ninetyOut: said('ninety', s(1)),
  andThen: said('and then', s(1)),
  gw: said('great white', s(1)),
  gwOut: after('out', 'shark is', s(1)),
  scientists: said('scientists', s(1)),
  trouble: said('trouble'),
  mako: said('mako', s(1)),
  makoOut: after('out', 'books', s(1)),
  nurse: said('nurse'),
  everyone: said('everyone else'),
  eight: said('eight fish'),
  // 2 · the speed round that got cancelled, and the game
  speed: said('speed round', s(2)),
  sailfish: said('sailfish', s(2)),
  mph68: said('sixty-eight'),
  kmh: said('kilometres'),
  tag: said('tag'),
  burst: said('burst'),
  never: said('never over'),
  cancelled: said('cancelled'),
  quick: said('quick one'),
  inkfish: said('InkFish', s(2)),
  eatUp: said('eat your way'),
  free: said('free', s(2)),
  now2: said('now', said('16bit.ink')),
  heat: said('turn up'),
  // 3 · round 2: hot water
  round2: said('round two'),
  warm: said('warm'),
  fahrenheit: said('fahrenheit'),
  lose: said('lose your balance'),
  f72: said('seventy-two'),
  codOut: after('out', 'cod is', s(3)),
  hotTub: said('hot tub'),
  f57: said('fifty-seven'),
  gone: said('wait', s(3)),
  iceOut: said('icefish', s(3)),
  f79: said('around seventy-nine'),
  salmonOut: after('out', 'salmon', s(3)),
  f99: said('ninety-nine'),
  f100: after('hundred', 'ninety-nine', s(3)),
  eelLimit: said("eel's"),
  scrapes: said('scrapes'),
  goldfish2: said('goldfish', s(3)),
  upright: said('upright'),
  pet: said('your pet', s(3)),
  five2: said('five fish'),
  // 4 · round 3: sea water
  round3: said('round three', s(4)),
  into: said('into', s(4)),
  mudFine: said('fine', s(4)),
  rivFine: after('fine', 'rivulus', s(4)),
  pupfish3: said('pupfish', s(4)),
  pupSea: said('sea', said('twice', s(4))),
  eel3: said('eel', s(4)),
  allowed: said('allowed'),
  goldfish3: said('goldfish', s(4)),
  halfSalty: said('half', s(4)),
  eightHours: said('eight hours'),
  gfOut: after('out', 'your goldfish', s(4)),
  four3: said('four fish'),
  // 5 · round 4: out of water
  round4: said('round four'),
  drain: said('drain'),
  h24: said('twenty-four'),
  flying: said('flying'),
  s45: said('forty-five'),
  no45: after('no', 'record', s(5)),
  lungfish: said("where's"),
  cocoon: said('cocoon'),
  invitations: said('invitations'),
  eelSlither: said('eel', s(5)),
  wholeDay: said('a whole day'),
  eelOut: said('out on the evidence'),
  pupfish4: said('pupfish', s(5)),
  pupOut: after('out', 'either', s(5)),
  cousin: said('mudskippers', s(5)),
  giant: said('giant'),
  mudFine4: said('fine', s(5)),
  tiny: said('and the tiny'),
  days66: said('sixty-six'),
  starving: said('starving'),
  two: said('two fish'),
  // 6 · the final
  final: said('final'),
  oneTest: said('one test'),
  brine: said('brine'),
  notOne: said('not one died'),
  mudBrineFine: said('fine', s(6)),
  rivBrine: said('rivulus', s(6)),
  threeTimes: said('three times'),
  fresh: said('fresh', said('now', s(6))),
  noProblem: said('no problem'),
  mudFresh: said('mudskipper', said('no problem')),
  halfDead: said('half of them'),
  fourDays: said('four days'),
  puddle: said('rain puddle'),
  mudOut: after('out', 'rain puddle', s(6)),
  // 7 · the winner
  winner: said('winner'),
  crab: said('crab'),
  logs: said('rotting'),
  air: said('takes in air'),
  beat: said('beat a great white'),
  whichFish: said('which fish', s(7)),
  wentOut: said('went out'),
} as const;

export const sectionStart = s;
export const sectionEnd = e;
