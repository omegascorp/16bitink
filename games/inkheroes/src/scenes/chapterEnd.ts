import { ourHeroes, playerTowns, type Adventure } from '../logic/adventure';
import { CHAPTERS, comingSoon, type ChapterDef } from '../level/maps';
import { lineText } from '../narration/lines';

/** What the card at the end of everything built of a chapter says (src/scenes/cards.ts draws it). Pure: no Phaser. */
export interface ChapterEnd {
  readonly title: string;
  /** Its paragraphs, in order. */
  readonly body: readonly string[];
  /** The chapter after it, when there is one to point on to. */
  readonly next?: ChapterDef;
}

/** The chapter after `c`, if the campaign has one. */
export const chapterAfter = (c: ChapterDef): ChapterDef | undefined => CHAPTERS.find((x) => x.n === c.n + 1);

/** Whether every part of `c` is built (its last part is among those named). */
export const chapterBuilt = (c: ChapterDef): boolean => c.parts.some((p) => p.n === c.last);

/**
 * The chapter's ending (its story read here unless the narrator `told` it),
 * how the whole march went, and what comes next: the next chapter (open to
 * an owner, `owned`, or the full game's), the next parts while the chapter
 * isn't all built, or the next chapter being made.
 */
export function chapterEnd(chapter: ChapterDef, adv: Adventure, told: boolean, owned: (c: ChapterDef) => boolean): ChapterEnd {
  const towns = playerTowns(adv).length;
  const heroes = ourHeroes(adv).length;
  const march = `${adv.day} days on the march, ${towns} ${towns === 1 ? 'town' : 'towns'} under your banner, ${heroes === 1 ? 'one hero' : `${heroes} heroes`} riding.`;
  const story = told || !chapter.ending ? [] : [lineText(chapter.ending)];
  const thanks = 'Thank you for playing!';
  if (!chapterBuilt(chapter)) {
    return { title: `Chapter ${chapter.n}: ${chapter.name}, so far`, body: [...story, march, `That is all of ${chapter.name} for now: its next parts are being made, and come to the full game as free updates.`, thanks] };
  }
  const next = chapterAfter(chapter);
  const title = `Chapter ${chapter.n} complete`;
  if (!next) return { title, body: [...story, march, `Chapter ${chapter.n + 1} is being made, and comes to the full game as a free update.`, thanks] };
  // A next chapter with no part built yet is still being made: it comes to the full game as a free update.
  const where = comingSoon(next) ? 'It is being made, and comes to the full game as a free update.' : owned(next) ? 'It waits for you now.' : 'It is part of the full game.';
  const onward = `Chapter ${next.n}, ${next.name}, ${next.teaser ?? ''} ${where}`.replace(/ {2,}/g, ' ');
  return { title, body: [...story, march, onward, thanks], next };
}
