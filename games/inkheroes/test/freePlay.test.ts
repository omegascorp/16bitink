import { describe, expect, it } from 'vitest';
import { ASHFORD, OTHRYS, THORNWOOD } from '../src/level/borderMarch';
import { CHAPTERS, mapById, partsOf } from '../src/level/maps';
import { checkGoal, endDay, playerTowns, startAdventure, withTown, type Adventure } from '../src/logic/adventure';
import { rideOn } from '../src/logic/chapter';
import { freePlaySave, keepExploring, savedStanding } from '../src/logic/freePlay';
import { rivalTurn } from '../src/logic/rival';
import { EMPTY_PROGRESS, loadAdventure, loadProgress, parseAdventure, recordWin, saveAdventure, saveProgress } from '../src/logic/save';
import { partStates } from '../src/scenes/menu/chapterProgress';

function memoryStore(): { getItem(k: string): string | null; setItem(k: string, v: string): void } {
  const m = new Map<string, string>();
  return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => void m.set(k, v) };
}

/** Ashford with its ogres beaten: the goal met, the part won. */
function ashfordWon(): { morning: Adventure; won: Adventure } {
  const morning = { ...startAdventure(ASHFORD), prompts: [] };
  const won = checkGoal({ ...morning, objects: morning.objects.map((o) => (o.id === 'ogres' ? { ...o, gone: true } : o)) }, ASHFORD);
  return { morning, won };
}

describe('free play after the chapter', () => {
  it('keeps exploring from a won part: play goes on, days pass, and the goal never fires again', () => {
    const { won } = ashfordWon();
    expect(won.status).toBe('won');
    const free = keepExploring(won);
    expect(free.status).toBe('playing');
    expect(free.freePlay).toBe(true);
    // The goal is still met on the map, yet the part isn't won twice.
    expect(checkGoal(free, ASHFORD).status).toBe('playing');
    let adv = free;
    for (let i = 0; i < 8; i++) adv = checkGoal(endDay(adv, ASHFORD), ASHFORD);
    expect(adv.day).toBe(free.day + 8);
    expect(adv.status).toBe('playing');
    expect(adv.freePlay).toBe(true);
    // Keeping on twice changes nothing.
    expect(keepExploring(free)).toBe(free);
  });

  it('still loses with the last town gone, and a lost day replays in free play', () => {
    const free = keepExploring(ashfordWon().won);
    const town = playerTowns(free)[0]!;
    const fallen = checkGoal(withTown(free, { ...town, owner: 'neutral' }), ASHFORD);
    expect(fallen.status).toBe('lost');
    expect(fallen.freePlay).toBe(true);
    // Closed on the defeat card, the saved game comes back to this morning, still in free play.
    const save = freePlaySave({ current: ashfordWon().won, dayStart: ashfordWon().morning });
    const at = savedStanding({ ...save, current: fallen }, undefined);
    expect(at?.kind).toBe('play');
    expect(at?.kind === 'play' && at.current.freePlay).toBe(true);
    expect(at?.kind === 'play' && at.current.status).toBe('playing');
  });

  it('lets the rival lord ride on in free play, and never wins the part for him', () => {
    let adv = keepExploring({ ...startAdventure(OTHRYS), prompts: [] });
    for (let i = 0; i < 6 && adv.status === 'playing'; i++) adv = rivalTurn(endDay(adv, OTHRYS), OTHRYS).adv;
    expect(adv.status).not.toBe('won');
    expect(adv.day).toBeGreaterThan(1);
    expect(adv.rival).toBeDefined();
  });

  it('saves and loads free play as free play, and drops a stray flag on a won save', () => {
    const store = memoryStore();
    const free = keepExploring(ashfordWon().won);
    saveAdventure(store, { current: free, dayStart: free });
    const loaded = loadAdventure(store, mapById)!;
    expect(loaded.current.freePlay).toBe(true);
    expect(loaded.current.status).toBe('playing');
    expect(savedStanding(loaded, undefined)).toEqual({ kind: 'play', current: loaded.current });
    const raw = JSON.parse(JSON.stringify({ ...ashfordWon().won, freePlay: true }));
    expect(parseAdventure(raw, ASHFORD)?.freePlay).toBeUndefined();
    expect(parseAdventure({ ...raw, status: 'playing', freePlay: 'yes' }, ASHFORD)?.freePlay).toBeUndefined();
  });

  it('resumes a chapter left on its last victory card into free play (an old save too)', () => {
    const { morning, won } = ashfordWon();
    const at = savedStanding({ current: won, dayStart: morning, partStart: morning }, undefined);
    expect(at?.kind).toBe('free');
    if (at?.kind !== 'free') return;
    expect(at.save.current.status).toBe('playing');
    expect(at.save.current.freePlay).toBe(true);
    // Replay the day stays in free play; starting the part again plays it anew.
    expect(at.save.dayStart.freePlay).toBe(true);
    expect(at.save.partStart?.freePlay).toBeUndefined();
  });

  it('rides on when the chapter grows a part after its last was won, out of free play', () => {
    const { morning, won } = ashfordWon();
    expect(savedStanding({ current: won, dayStart: morning }, THORNWOOD)?.kind).toBe('ride');
    const free = keepExploring(won);
    const at = savedStanding({ current: free, dayStart: free }, THORNWOOD);
    expect(at?.kind).toBe('ride');
    if (at?.kind !== 'ride') return;
    const next = rideOn(at.from, ASHFORD, at.next);
    expect(next.mapId).toBe(THORNWOOD.id);
    expect(next.status).toBe('playing');
    expect(next.freePlay).toBeUndefined();
  });

  it('keeps the chapter counted complete in free play, and Start over throws the game away', () => {
    const chapter = CHAPTERS[0]!;
    const parts = partsOf(chapter);
    const last = parts[parts.length - 1]!;
    const store = memoryStore();
    let progress = EMPTY_PROGRESS;
    for (const p of parts) progress = recordWin(progress, p.id, 3, 10);
    saveProgress(store, progress);
    const recorded = loadProgress(store);
    // On the menu: every part won, with the free-play game on the last part in play.
    expect(partStates(parts, last.id, progress.maps, true)).toEqual(parts.map(() => 'won'));
    expect(partStates(parts, last.id, progress.maps)).toEqual(parts.map((_, i) => (i === parts.length - 1 ? 'now' : 'won')));
    const free = keepExploring(ashfordWon().won);
    saveAdventure(store, { current: free, dayStart: free }, chapter.slot);
    expect(loadAdventure(store, mapById, chapter.slot)).not.toBeNull();
    // Start over (Session.discard / abandon): the game goes, the recorded wins stay.
    saveAdventure(store, null, chapter.slot);
    expect(loadAdventure(store, mapById, chapter.slot)).toBeNull();
    expect(loadProgress(store)).toEqual(recorded);
    expect(recorded.maps[last.id]).toBeDefined();
  });
});
