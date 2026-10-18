import type { Profile } from '../logic/economy';
import { hasBeat, type Beat } from '../logic/story';

/**
 * Which narrated lines come next in the story (spec, "Narration"), so
 * their recordings can be fetched before they're needed. Pure: no
 * Phaser, no audio.
 */

/** A line in the story, and whether it's been told for a profile. */
interface StoryLine {
  readonly line: string;
  readonly told: (p: Profile) => boolean;
}

const after = (line: string, beat: Beat): StoryLine => ({ line, told: (p) => hasBeat(p, beat) });

/**
 * The story's lines in the order they come, each told once its beat is
 * saved. Not here: the reminders (ON_DEMAND), and the trips, which are per
 * route (the star map fetches the ones it offers).
 */
export const STORY_LINES: readonly StoryLine[] = [
  { line: 'arrival-graphite', told: (p) => p.started },
  after('ship-call', 'called'),
  after('talk-meet', 'met'),
  after('talk-paid', 'paid'),
  after('talk-core', 'core'),
  after('ship-lift-off', 'flown'),
  after('ship-docked', 'aboard'),
  after('ship-first-light', 'firstLight'),
  after('map-where-you-fell', 'firstLight'),
  after('ship-mycel-orbit', 'mycelOrbit'),
  after('arrival-mycel', 'mycelLanded'),
  after('ship-distress', 'distress'),
  after('aster-lander', 'asterFound'),
  after('camp-camp', 'asterCamp'),
  after('camp-woken', 'asterWoken'),
  after('ship-brine-orbit', 'brineOrbit'),
  after('arrival-brine', 'brineLanded'),
  after('craft-found', 'craftFound'),
  after('reef-meet', 'reefMet'),
  after('reef-paid', 'reefPaid'),
  after('reef-crew', 'crewMet'),
  after('reef-raised', 'craftRaised'),
  after('craft-mended', 'craftMended'),
  after('crystal', 'crystalFound'),
  after('craft-flight', 'craftFlown'),
  after('camp-reunion', 'asterReunion'),
];

/** Reminders, heard only by coming back without what was asked for: fetched when they're said. */
export const ON_DEMAND: readonly string[] = ['talk-want', 'talk-wait-ship', 'camp-pod', 'reef-want', 'reef-patch', 'craft-heart'];

/** The next `n` lines the story will tell. */
export const upcoming = (p: Profile, n: number): string[] => STORY_LINES.filter((s) => !s.told(p)).slice(0, n).map((s) => s.line);
