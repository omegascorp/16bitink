import type Phaser from 'phaser';
import { describe, expect, it } from 'vitest';
import { PLANET_2 } from '../content/planet2';
import { PLANET_3 } from '../content/planet3';
import { NEW_PROFILE, type Profile } from '../src/logic/economy';
import { FIRST_COURSE } from '../src/logic/starship';
import { BEATS, withBeat, type Beat } from '../src/logic/story';
import { tripFuel, TRIPS } from '../src/logic/travel';
import type { WorldId } from '../src/logic/worlds';
import { recordedLines } from '../src/narration/library';
import { readingTime, sameWords, SUBTITLE_MAX, subtitleAt, subtitles } from '../src/narration/lines';
import { readJournal, remember } from '../src/narration/journal';
import { NARRATOR, spokenScript } from '../src/narration/script';
import { ON_DEMAND, STORY_LINES, upcoming } from '../src/narration/upcoming';
import MANIFEST from '../narration/lines.json';
import { ASTER_CARD } from '../src/scenes/hud/asterCard';
import { craftSpec, crystalSpec, reefSpec } from '../src/scenes/hud/brineCards';
import { campSpec } from '../src/scenes/hud/campCards';
import { landingSpec, OPENING } from '../src/scenes/hud/opening';
import { talkSpec } from '../src/scenes/hud/talkCards';
import type { StoryCardSpec } from '../src/scenes/kit/storyCard';
import { brineOrbitCard, callCard, distressCard, dockedCard, firstLightCard, liftOffSpec, mycelOrbitCard } from '../src/scenes/ship/shipCards';
import { demoEndCard, firstCourseCard, flightCard, whereYouFellCard } from '../src/scenes/system/systemCards';

/** Node's environment, as far as this test needs it (the project has no Node types). */
declare const process: { readonly env: Readonly<Record<string, string | undefined>> };

/** A scene whose textures are all baked already, so the cards' builders only name them. */
const SCENE = { textures: { exists: () => true } } as unknown as Phaser.Scene;

const at = (world: WorldId, visited: readonly WorldId[], beats: readonly Beat[]): Profile => ({ ...beats.reduce(withBeat, NEW_PROFILE), at: world, visited: [...visited] });

/** The worlds you can fly between, in the order you first come to them (TRIPS lists them so). */
const WORLDS: readonly WorldId[] = [...new Set(TRIPS.flatMap((t) => t.between))];

/**
 * Every trip the story can make, as the profile before it and where to:
 * the first, from where you fell, and then from each world you've been to,
 * to each world you've been to or the next one, before and after the
 * Aster craft flies home from Brine, and after the crew meet again.
 */
function trips(): [Profile, WorldId][] {
  const out: [Profile, WorldId][] = [[at(WORLDS[0]!, [WORLDS[0]!], []), FIRST_COURSE.to]];
  for (let n = 2; n <= WORLDS.length; n++) {
    const visited = WORLDS.slice(0, n);
    const stages: Beat[][] = visited.includes('brine') ? [['course'], ['course', 'craftFlown'], ['course', 'craftFlown', 'asterReunion']] : [['course']];
    const open = WORLDS.slice(0, n + 1);
    for (const beats of stages) {
      for (const from of visited) {
        for (const to of open) if (to !== from && tripFuel(from, to) !== null) out.push([at(from, visited, beats), to]);
      }
    }
  }
  return out;
}

/**
 * Every card the narrator reads (spec, "Narration"): each story card,
 * and each landing card. A new card goes here, or this test can't say
 * it's recorded (the game says so too, in development).
 */
function allLines(): StoryCardSpec[] {
  const p = NEW_PROFILE;
  return [
    landingSpec(OPENING),
    ...[PLANET_2, PLANET_3].map((planet) => landingSpec({ world: planet.world.id, title: planet.name, arrival: planet.arrival! })),
    ...(['meet', 'want', 'paid', 'waitShip', 'core'] as const).map((s) => talkSpec(SCENE, s)),
    ASTER_CARD,
    ...(['camp', 'pod', 'woken', 'reunion'] as const).map((s) => campSpec(SCENE, s)),
    ...(['meet', 'want', 'paid', 'crew', 'patch', 'raised'] as const).map((s) => reefSpec(SCENE, s)),
    ...(['found', 'heart', 'mended', 'flight'] as const).map((s) => craftSpec(SCENE, s)),
    crystalSpec(SCENE),
    ...[callCard, mycelOrbitCard, brineOrbitCard, dockedCard, distressCard, firstLightCard, liftOffSpec].map((card) => card(SCENE, p)),
    whereYouFellCard(),
    ...trips().map(([was, to]) => flightCard(SCENE, was, to)),
    firstCourseCard(SCENE, p),
    demoEndCard('$4.99', () => undefined),
  ];
}

/** A recording, as narration/lines.json keeps it: the card's words when it was recorded, the script the voice read, and how. */
interface Recording {
  readonly line: string;
  readonly title: string;
  readonly text: string;
  readonly script: string;
  readonly voice: string;
  readonly model: string;
  /** When, or null while it's still to record. */
  readonly recorded: string | null;
}

/**
 * The manifest brought up to date with the cards (NARRATION_DUMP=1): a
 * line kept as recorded (with the card's words if only their punctuation
 * moved); a line whose file is new, recorded now from its script; a line
 * with no file, to record, with its script. Lines no card reads are dropped.
 */
function refreshed(old: readonly Recording[], cards: readonly StoryCardSpec[], files: ReadonlySet<string>, now: string): Recording[] {
  return cards.map((card) => {
    const line = card.line!;
    const was = old.find((r) => r.line === line);
    const fresh = { line, title: card.title, text: card.text, script: spokenScript(card.text), voice: NARRATOR.voice, model: NARRATOR.model };
    if (!files.has(line)) return { ...fresh, recorded: null };
    if (!was?.recorded) return { ...fresh, recorded: now };
    return sameWords(was.text, card.text) ? { ...was, title: card.title, text: card.text } : was;
  });
}

describe('the narrator\'s lines', () => {
  const cards = allLines();
  const byLine = new Map(cards.map((c) => [c.line, c]));
  const unique = [...byLine.values()];

  it('are many, and each card has words to read and its own line id', () => {
    expect(unique.length).toBeGreaterThan(40);
    for (const c of cards) {
      expect(c.text.length, c.title).toBeGreaterThan(20);
      expect(c.line, c.title).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
      expect(byLine.get(c.line)!.text, `two cards say different words as "${c.line}"`).toBe(c.text);
    }
  });

  it('are every one recorded as they read now, and nothing recorded is left over', async () => {
    const files = recordedLines();
    let manifest = MANIFEST as readonly Recording[];
    // NARRATION_DUMP=1 brings narration/lines.json up to date, with the script for each line still to record.
    if (process.env.NARRATION_DUMP) {
      manifest = refreshed(manifest, unique, files, new Date().toISOString().replace(/\.\d+Z$/, 'Z'));
      const fs = (await import(/* @vite-ignore */ 'node:fs' as string)) as { writeFileSync(path: URL, data: string): void };
      fs.writeFileSync(new URL('../narration/lines.json', import.meta.url), `${JSON.stringify(manifest, null, 2)}\n`);
    }
    const howTo = '(docs/inkmine-design.md, "Narration")';
    expect(unique.filter((c) => !files.has(c.line!)).map((c) => c.line), `not recorded yet ${howTo}`).toEqual([]);
    expect([...files].filter((l) => !byLine.has(l)), 'recordings no card reads any more: delete them').toEqual([]);
    const kept = new Map(manifest.map((r) => [r.line, r]));
    expect(unique.filter((c) => !kept.get(c.line!)?.recorded).map((c) => c.line), `not in narration/lines.json as recorded: run with NARRATION_DUMP=1 ${howTo}`).toEqual([]);
    expect(manifest.filter((r) => !byLine.has(r.line)).map((r) => r.line), 'in narration/lines.json, but no card reads them: run with NARRATION_DUMP=1').toEqual([]);
    const moved = unique.filter((c) => { const r = kept.get(c.line!); return r && !sameWords(r.text, c.text); }).map((c) => c.line);
    expect(moved, `words changed since they were recorded: record them again ${howTo}`).toEqual([]);
  });
});

describe('the lines to come', () => {
  it('place every card: in the story\'s order, as a reminder, or as a trip (the star map fetches those)', () => {
    const placed = [...STORY_LINES.map((s) => s.line), ...ON_DEMAND];
    expect(new Set(placed).size, 'a line placed twice').toBe(placed.length);
    const cards = [...new Set(allLines().map((c) => c.line!))];
    const trip = (l: string): boolean => l.startsWith('trip-') || l === 'demo-end';
    expect(cards.filter((l) => !trip(l) && !placed.includes(l)), 'cards not placed in src/narration/upcoming.ts').toEqual([]);
    expect(placed.filter((l) => !cards.includes(l)), 'placed, but no card reads them').toEqual([]);
  });

  it('are the next two the story tells, from the start to the end', () => {
    expect(upcoming(NEW_PROFILE, 2)).toEqual(['arrival-graphite', 'ship-call']);
    const started = { ...NEW_PROFILE, started: true };
    expect(upcoming((['called', 'met'] as Beat[]).reduce(withBeat, started), 2)).toEqual(['talk-paid', 'talk-core']);
    const allBut = (last: Beat): Profile => BEATS.filter((b) => b !== last).reduce(withBeat, started);
    expect(upcoming(allBut('asterReunion'), 2)).toEqual(['camp-reunion']);
    expect(upcoming(BEATS.reduce(withBeat, started), 2)).toEqual([]);
  });
});

describe('lines', () => {
  it('still fit their recording when only spacing, punctuation or capitals change, not when a word does', () => {
    expect(sameWords('A  sea the\ncolour of wine.', 'A sea, the colour of wine!')).toBe(true);
    expect(sameWords("Bring it, they're waiting.", 'bring it: they’re waiting')).toBe(true);
    expect(sameWords('A sea the colour of wine.', 'A sea the colour of plums.')).toBe(false);
  });

  it('are read from a script: tagged for the voice, with Mk said as Mark', () => {
    expect(spokenScript('Print the Drill Mk 3. Mk 10 later.')).toBe(`${NARRATOR.tag} Print the Drill Mark 3. Mark 10 later.`);
  });

  it('cut into subtitles of two short lines at most, losing no words', () => {
    for (const l of allLines()) {
      const chunks = subtitles(l.text);
      for (const c of chunks) expect(c.length, c).toBeLessThanOrEqual(SUBTITLE_MAX);
      expect(chunks.join(' ')).toBe(l.text.replace(/\s+/g, ' ').trim());
    }
  });

  it('show each subtitle in turn as the voice goes on', () => {
    const chunks = subtitles(ASTER_CARD.text);
    const d = readingTime(ASTER_CARD.text);
    const seen = Array.from({ length: 50 }, (_, i) => subtitleAt(chunks, (i / 49) * d, d));
    expect(seen[0]).toBe(0);
    expect(seen[49]).toBe(chunks.length - 1);
    for (let i = 1; i < seen.length; i++) expect(seen[i]).toBeGreaterThanOrEqual(seen[i - 1]!);
  });
});

describe('the journal', () => {
  it('keeps each line heard once, newest last', () => {
    const data = new Map<string, string>();
    const store = { getItem: (k: string) => data.get(k) ?? null, setItem: (k: string, v: string) => void data.set(k, v) };
    remember(store, { line: 'a', title: 'A', text: 'first line' });
    remember(store, { title: 'B', text: 'second line' });
    remember(store, { line: 'a', title: 'A', text: 'first line, touched up' });
    expect(readJournal(store).map((e) => e.text)).toEqual(['second line', 'first line, touched up']);
    expect(readJournal({ getItem: () => 'not json', setItem: () => undefined })).toEqual([]);
  });
});
