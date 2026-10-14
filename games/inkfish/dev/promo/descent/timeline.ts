import { FPS_LONG } from './frame';
import { SECTIONS, VOICE_S, WORDS } from './words';

/**
 * When everything happens, in seconds of the video, read off the narration
 * (words.ts) so every beat lands on the word that names it. Section numbers
 * follow script.md: 0 cold open, 1 tide pool … 6 drop-off, 7 the game,
 * 8 twilight, 9 midnight, 10 abyss, 11 trench, 12 payoff.
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

/** When the word starting at `start` ends. */
export function endOf(start: number): number {
  const w = WORDS.find((x) => x.start === start);
  if (!w) throw new Error(`No word starts at ${start}s`);
  return w.end;
}

export const sectionStart = (i: number): number => SECTIONS[i]!.start;
export const sectionEnd = (i: number): number => SECTIONS[i]!.end;

/** How long the end card holds after the last word: YouTube's shortest end screen. */
export const END_HOLD_S = 5;
/** The video's length: the end card's hold after the last word (never past the narration track), in whole frames. */
export const VIDEO_S = Math.round(Math.min(WORDS[WORDS.length - 1]!.end + END_HOLD_S, VOICE_S) * FPS_LONG) / FPS_LONG;

const s = sectionStart;

/** The beats, section by section. */
export const T = {
  // 0 · cold open
  fangs: said('teeth', s(0)),
  heads: said('heads', s(0)),
  searchlights: said('searchlights', s(0)),
  keepGoing: said('but keep going', s(0)),
  theyStop: said('they stop', s(0)),
  line: said("there's a line", s(0)),
  in2022: said('in 2022', s(0)),
  camera: said('camera', s(0)),
  swam: said('swam into the light', s(0)),
  toSee: said('to see what', s(0)),
  puddle: said('puddle', s(0)),
  // 1 · tide pool
  tidePool: s(1),
  food: said('more food', s(1)),
  threeThings: said('three things', s(1)),
  lightFades: said('the light fades', s(1)),
  foodRunsOut: said('the food runs out', s(1)),
  pressureClimbs: said('and the pressure climbs', s(1)),
  eatSmaller: said('eat anything smaller', s(1)),
  dontGetEaten: said("don't get eaten", s(1)),
  bigger: said('bigger', s(1)),
  // 2 · seagrass
  seagrass: s(2),
  flowering: said('flowering', s(2)),
  pipefish: said('pipefish', s(2)),
  // 3 · kelp
  kelp: s(3),
  halfMetre: said('half', s(3)),
  sheephead: said('sheephead', s(3)),
  cracks: said('cracks', s(3)),
  // 4 · reef
  reef: s(4),
  onePercent: said('less than one percent', s(4)),
  quarter: said('quarter', s(4)),
  parrotfish: said('parrotfish', s(4)),
  grinds: said('grinds', s(4)),
  sand: said('sand', s(4)),
  beaches: said('tropical beaches', s(4)),
  // 5 · wreck
  wreck: s(5),
  firstDial: said('first dial', s(5)),
  redLight: said('red light first', s(5)),
  snapper: said('red snapper', s(5)),
  grey: said('grey', s(5)),
  rememberRed: said('remember that', s(5)),
  // 6 · drop-off
  dropoff: s(6),
  floorEnds: said('ends', s(6)),
  shelf: said('continental shelf', s(6)),
  twoHundred: said('two hundred', s(6)),
  nothingMakesFood: said('nothing makes food', s(6)),
  falls: said('falls from above', s(6)),
  // 7 · the game
  game: s(7),
  inkfish: said('inkfish', s(7)),
  chapterOne: said('chapter one', s(7)),
  site: said('16bit.ink', s(7)),
  lightsOff: said('lights off', s(7)),
  everythingChanges: said('everything changes', s(7)),
  // 8 · twilight
  twilight: s(8),
  ownLight: said('make their own light', s(8)),
  threeInFour: said('three out of every four', s(8)),
  barreleye: said('barreleye', s(8)),
  domes: said('green domes', s(8)),
  turn: said('turn', s(8)),
  lanternfish: said('lanternfish', s(8)),
  sinkBack: said('sink back down', s(8)),
  migration: said('biggest migration', s(8)),
  // 9 · midnight
  midnight: s(9),
  noSunlight: said('no sunlight', s(9)),
  fourDegrees: said('four degrees', s(9)),
  theyWait: said('they wait', s(9)),
  seadevil: said('black seadevil', s(9)),
  swallows: said('swallows whatever', s(9)),
  viperfish: said("viperfish's", s(9)),
  fangtooth: said('fangtooth', s(9)),
  sockets: said('sockets', s(9)),
  notice: said('notice something', s(9)),
  soft: said('soft', s(9)),
  holdOn: said('hold on to that', s(9)),
  // 10 · abyss
  abyss: s(10),
  mud: said('mud', s(10)),
  continents: said('continents', s(10)),
  tripodfish: said('tripodfish', s(10)),
  rememberRedLight: said('and remember the red light', s(10)),
  loosejaw: said('stoplight loosejaw', s(10)),
  searchlight: said('searchlight only it can see', s(10)),
  // 11 · trench
  trench: s(11),
  hadal: said('hadal', s(11)),
  everest: said('drop mount everest', s(11)),
  pressureWins: said('pressure dial wins', s(11)),
  rememberSoft: said('remember how soft', s(11)),
  nothingToCrush: said('nothing to crush', s(11)),
  invisible: said('the other half', s(11)),
  squeezes: said('squeezes', s(11)),
  molecule: said('fill their cells', s(11)),
  deeperMore: said('and the deeper they live', s(11)),
  around8200: said('somewhere around', s(11)),
  saltier: said('saltier', s(11)),
  pushIn: said('push its way in', s(11)),
  thatsTheLine: said("that's the line", s(11)),
  whereLook: said('so where would you look', s(11)),
  notDeepest: said('not in the deepest trench', s(11)),
  jamieson: said('alan jamieson', s(11)),
  japan: said('off japan', s(11)),
  warmer: said('warmth', s(11)),
  lowered: said('his team lowered', s(11)),
  record: said('eight thousand three hundred', s(11)),
  // 12 · payoff
  payoff: s(12),
  baby: said('a baby snailfish', s(12)),
  deepestFilmed: said('the deepest fish ever filmed', s(12)),
  belowIt: said('below it', s(12)),
  noMoreFish: said('just no more fish', s(12)),
  beThisFish: said('in the last chapter', s(12)),
  startTidePool: said('start in the tide pool', s(12)),
  freeEnd: said('chapter one is free', s(12)),
  end: VIDEO_S,
} as const;
