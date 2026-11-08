import { describe, expect, it } from 'vitest';
import MANIFEST from '../narration/lines.json';
import { ASHFORD, BLACK_BANNER, THORNWOOD } from '../src/level/borderMarch';
import { MAPS } from '../src/level/maps';
import { NEKHEN } from '../src/level/twoLands';
import { answerPrompt, openingPrompt, startAdventure, takeTown, townById, withTown, type Adventure } from '../src/logic/adventure';
import { rideOn } from '../src/logic/chapter';
import { loadAdventure, saveAdventure } from '../src/logic/save';
import { mapById } from '../src/level/maps';
import { recordedLines } from '../src/narration/library';
import { CHAPTER1, LINE_IDS, lineText, LINES, spoken, tagsOf, type LineId } from '../src/narration/lines';
import { NARRATOR } from '../src/narration/script';
import { readingTime, sameWords, SUBTITLE_MAX, subtitleAt, subtitles } from '../src/narration/subtitles';
import { upcoming } from '../src/narration/upcoming';
import { buttonsW, defaultRoom, mapRoom, STRIP, stripBox, textWidth } from '../src/scenes/narrator/stripLayout';

/** Node's environment, as far as this test needs it (the project has no Node types). */
declare const process: { readonly env: Readonly<Record<string, string | undefined>> };

/** The game's own source, to find where each line is told. */
const SOURCE = import.meta.glob<string>('../src/**/*.ts', { query: '?raw', import: 'default', eager: true });

/** A recording, as narration/lines.json keeps it: the words and the script the voice read, how, and when (null: still to record). */
interface Recording {
  readonly line: string;
  readonly title: string;
  readonly text: string;
  readonly script: string;
  readonly voice: string;
  readonly model: string;
  readonly recorded: string | null;
}

/**
 * The manifest brought up to date with the scripts (NARRATION_DUMP=1): a
 * line with a recording keeps what it was recorded from (marked recorded
 * now if it's new); a line with none is listed to record, with its script.
 * Lines the game no longer has are dropped.
 */
function refreshed(old: readonly Recording[], files: ReadonlySet<string>, now: string): Recording[] {
  return LINE_IDS.map((line) => {
    const { title, script } = LINES[line];
    const was = old.find((r) => r.line === line);
    const fresh = { line, title, text: spoken(script), script, voice: NARRATOR.voice, model: NARRATOR.model };
    if (!files.has(line)) return { ...fresh, recorded: null };
    return was?.recorded ? { ...was, title } : { ...fresh, recorded: now };
  });
}

const memoryStore = (): { getItem(k: string): string | null; setItem(k: string, v: string): void } => {
  const m = new Map<string, string>();
  return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => void m.set(k, v) };
};

describe("the narrator's scripts", () => {
  it('are each told somewhere in the game, and only from here', () => {
    const elsewhere = Object.entries(SOURCE).filter(([path]) => !path.endsWith('narration/lines.ts')).map(([, text]) => text).join('\n');
    for (const id of LINE_IDS) expect(elsewhere.includes(`'${id}'`), `${id} is never told`).toBe(true);
  });

  it('read in the voice direction: lively tags from the start, a new mood every sentence or two, "!" or "…", never a whisper', () => {
    for (const id of LINE_IDS) {
      const { script } = LINES[id];
      expect(script.startsWith('['), id).toBe(true);
      const tags = tagsOf(script);
      const sentences = subtitles(spoken(script)).length;
      expect(tags.length, id).toBeGreaterThanOrEqual(Math.min(3, Math.ceil(sentences / 2)));
      expect(tags.some((t) => /whisper/i.test(t)), id).toBe(false);
      expect(/[!…]/.test(script), id).toBe(true);
      expect(spoken(script)).not.toMatch(/[[\]]/);
    }
  });

  it('cut into subtitles of two short lines at most, losing no words', () => {
    for (const id of LINE_IDS) {
      const text = lineText(id);
      const chunks = subtitles(text);
      for (const c of chunks) expect(c.length, c).toBeLessThanOrEqual(SUBTITLE_MAX);
      expect(chunks.join(' ')).toBe(text);
    }
  });

  it('show each subtitle in turn as the voice goes on', () => {
    const chunks = subtitles(lineText('part-thornwood'));
    const d = readingTime(lineText('part-thornwood'));
    const seen = Array.from({ length: 60 }, (_, i) => subtitleAt(chunks, (i / 59) * d, d));
    expect(seen[0]).toBe(0);
    expect(seen[59]).toBe(chunks.length - 1);
    for (let i = 1; i < seen.length; i++) expect(seen[i]).toBeGreaterThanOrEqual(seen[i - 1]!);
  });

  it('still fit their recording when only spacing, punctuation or capitals change, not when a word does', () => {
    expect(sameWords('Korax is yours!', 'korax  is yours…')).toBe(true);
    expect(sameWords('Korax is yours!', 'Korax is ours!')).toBe(false);
  });

  it('keep the take already recorded for the Black Banner word for word', () => {
    expect(LINES['part-blackBanner'].script).toBe("[grand, storytelling] Thornwood is free… and its foresters show Rowan an old trail, south, down through the trees. [mysterious] Somewhere below, a town called Eudora still keeps its gates shut against the Black Banner. [ominous] Kassander of Korax flies that banner, a red raven on black, and he serves no crown. [urgent] His riders want Eudora too. Get there first… or you'll be storming its walls! [wry] Beat him in the field, and he simply runs home and hires again. [resolute] So take Korax… then hunt him down!");
  });
});

describe('the recordings', () => {
  /**
   * What keeps CI green before everything is recorded, and catches a stale
   * take after: a line with no recording yet only fails with
   * NARRATION_REQUIRED=1 (the game shows its card meanwhile); a recording
   * whose words no longer match its script, or one no line tells, always fails.
   */
  it('match their scripts, and nothing recorded is left over', async () => {
    const files = recordedLines();
    let manifest = MANIFEST as readonly Recording[];
    if (process.env.NARRATION_DUMP) {
      manifest = refreshed(manifest, files, new Date().toISOString().replace(/\.\d+Z$/, 'Z'));
      const fs = (await import(/* @vite-ignore */ 'node:fs' as string)) as { writeFileSync(path: URL, data: string): void };
      fs.writeFileSync(new URL('../narration/lines.json', import.meta.url), `${JSON.stringify(manifest, null, 2)}\n`);
    }
    const howTo = '(docs/inkheroes-design.md, "Narration")';
    const kept = new Map(manifest.map((r) => [r.line, r]));
    expect([...files].filter((l) => !(LINE_IDS as string[]).includes(l)), 'recordings no line tells any more: delete them').toEqual([]);
    expect(manifest.map((r) => r.line).filter((l) => !(LINE_IDS as string[]).includes(l)), `in narration/lines.json, but no line has them: run with NARRATION_DUMP=1 ${howTo}`).toEqual([]);
    expect(LINE_IDS.filter((l) => !kept.has(l)), `not in narration/lines.json: run with NARRATION_DUMP=1 ${howTo}`).toEqual([]);
    expect(LINE_IDS.filter((l) => files.has(l) !== !!kept.get(l)?.recorded), `recorded, or marked recorded, but not both: run with NARRATION_DUMP=1 ${howTo}`).toEqual([]);
    const stale = LINE_IDS.filter((l) => kept.get(l)?.recorded && !sameWords(spoken(kept.get(l)!.script), lineText(l)));
    expect(stale, `words changed since they were recorded: delete the mp3 and record them again ${howTo}`).toEqual([]);
    const behind = LINE_IDS.filter((l) => !kept.get(l)?.recorded && kept.get(l)?.script !== LINES[l].script);
    expect(behind, `scripts changed since narration/lines.json was written: run with NARRATION_DUMP=1 ${howTo}`).toEqual([]);
    const missing = LINE_IDS.filter((l) => !files.has(l));
    if (process.env.NARRATION_REQUIRED) expect(missing, `not recorded yet ${howTo}`).toEqual([]);
    else if (missing.length) console.info(`Narration: ${missing.length} of ${LINE_IDS.length} lines still to record (shown on their cards meanwhile): ${missing.join(', ')}`);
  });
});

describe('narrated cards', () => {
  it('open each part with the brief and goal while the story is heard, and the story and goal when it is not', () => {
    for (const def of [...MAPS, NEKHEN]) {
      const p = openingPrompt(def);
      expect(p.kind).toBe('message');
      if (p.kind !== 'message') continue;
      expect(p.line, def.id).toBe(def.story);
      expect(p.brief).toBe(`${def.brief}\n\nGoal: ${def.goal.text}`);
      expect(p.text).toBe(`${lineText(def.story!)}\n\nGoal: ${def.goal.text}`);
      // Short: the card is read in a glance while the voice tells the rest.
      expect(def.brief.length, def.id).toBeLessThan(160);
    }
    expect(MAPS.map((m) => m.story)).toEqual(['part-ashford', 'part-thornwood', 'part-blackBanner']);
  });

  it('keep their line and brief through a save, and drop a line the game no longer has', () => {
    const store = memoryStore();
    const adv = startAdventure(ASHFORD);
    saveAdventure(store, { current: adv, dayStart: adv });
    expect(loadAdventure(store, mapById)?.current.prompts[0]).toEqual(openingPrompt(ASHFORD));
    const odd = { ...adv, prompts: [{ kind: 'message' as const, title: 'Old', text: 'Words', line: 'gone-line' as LineId, brief: 'Short' }] };
    saveAdventure(store, { current: odd, dayStart: odd });
    expect(loadAdventure(store, mapById)?.current.prompts[0]).toEqual({ kind: 'message', title: 'Old', text: 'Words' });
  });

  it('tell Korax falling, with the rival left with nowhere to run', () => {
    const adv = answerPrompt(startAdventure(BLACK_BANNER));
    const taken = takeTown(adv, CHAPTER1.korax);
    expect(taken.prompts.at(-1)).toEqual({ kind: 'message', title: LINES['korax-taken'].title, text: lineText('korax-taken'), line: 'korax-taken' });
  });
});

describe('the lines to come', () => {
  /** The Black Banner ridden on into from Thornwood: Eudora waits. */
  const ridden = (): Adventure => {
    const start = startAdventure(THORNWOOD);
    const won = withTown({ ...start, status: 'won', prompts: [] }, { ...townById(start, 'thornwood-town')!, owner: 'player' });
    return rideOn(won, THORNWOOD, BLACK_BANNER);
  };

  it('are the cards waiting first, then what the part tells next', () => {
    expect(upcoming(startAdventure(ASHFORD), 2)).toEqual(['part-ashford', 'part-thornwood']);
    expect(upcoming(answerPrompt(startAdventure(ASHFORD)), 2)).toEqual(['part-thornwood']);
    expect(upcoming(answerPrompt(startAdventure(THORNWOOD)), 2)).toEqual(['part-blackBanner']);
    const banner = ridden();
    expect(upcoming(banner, 2)).toEqual(['part-blackBanner', 'eudora-joins']);
    expect(upcoming(answerPrompt(banner), 3)).toEqual(['eudora-joins', 'eudora-lost', 'kassander-flees']);
  });

  it('come to the hunt and the ending once Eudora is decided and Korax taken', () => {
    const banner = answerPrompt(ridden());
    const eudora = townById(banner, CHAPTER1.eudora)!;
    const held = withTown(banner, { ...eudora, owner: 'player', ally: undefined });
    expect(upcoming(held, 2)).toEqual(['kassander-flees', 'korax-taken']);
    const korax = townById(held, CHAPTER1.korax)!;
    const hunted = withTown(held, { ...korax, owner: 'player' });
    expect(upcoming(hunted, 2)).toEqual(['kassander-beaten', 'chapter-won']);
  });
});

describe("the narrator's strip", () => {
  it('sits beside the hero panel on a laptop, and under the top bar on a phone', () => {
    expect(mapRoom({ w: 1280, h: 720 }, 912, 22)).toEqual({ x: 4, w: 904, y: 718, from: 'bottom' });
    expect(mapRoom({ w: 390, h: 844 }, 22, 40)).toEqual(defaultRoom({ w: 390 }, 40));
  });

  it('is never wider than its maximum, keeps to its room, and leaves the subtitle room for about 42 characters', () => {
    const wide = stripBox(mapRoom({ w: 1280, h: 720 }, 912, 22), 15, 31);
    expect(wide.w).toBe(STRIP.maxW);
    expect(wide.y + wide.h).toBe(718);
    expect(wide.x + wide.w).toBeLessThan(912);
    const phone = stripBox(defaultRoom({ w: 390 }, 40), 15, 31);
    expect(phone.x).toBeGreaterThanOrEqual(4);
    expect(phone.x + phone.w).toBeLessThanOrEqual(386);
    expect(phone.y).toBe(40);
    // Ark Pixel 12 runs about 6 px a character.
    expect(textWidth(phone.w)).toBeGreaterThanOrEqual(42 * 6);
    expect(buttonsW()).toBeLessThan(phone.w / 3);
  });
});
