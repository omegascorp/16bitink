import { describe, expect, it } from 'vitest';
import { newSave, parseSave, SAVE_VERSION, serializeSave } from '../src/logic/save';
import { addIntel, newProgress, unlock, type Progress } from '../src/logic/workshop';

const stored = (progress: unknown, extra: Record<string, unknown> = {}): string => JSON.stringify({ v: SAVE_VERSION, progress, sound: true, ...extra });

describe('save', () => {
  it('gives a fresh game when there is no save', () => {
    expect(parseSave(null)).toEqual({ save: newSave(), problem: null });
    expect(parseSave('')).toEqual({ save: newSave(), problem: null });
  });

  it('round-trips a played game', () => {
    const r = unlock(addIntel(newProgress(), { cannon: 7 }), 'cannon');
    if (!r.ok) throw new Error(r.reason);
    const p: Progress = {
      ...r.progress, xp: 900, research: { cannon: { damage: 2 } }, medals: { 1: [true, false, true], 2: [true, true, true] },
      loadout: { gun: { family: 'cannon', mk: 1 }, hull: { family: 'light', mk: 1 }, drive: { family: 'wheels', mk: 1 } },
    };
    const save = { v: SAVE_VERSION, progress: p, sound: false, seenBlueprints: true, gadget: 'oil' } as const;
    const back = parseSave(serializeSave(save));
    expect(back.problem).toBeNull();
    expect(back.save).toEqual(save);
  });

  it.each([
    ['not JSON', '{oops'],
    ['an array', '[]'],
    ['another version', JSON.stringify({ v: 99, progress: newProgress() })],
    ['a bad family', stored({ ...newProgress(), unlocked: ['laser'] })],
    ['negative intel', stored({ ...newProgress(), intel: { cannon: -3 } })],
    ['NaN xp', stored({ ...newProgress(), xp: 'lots' })],
    ['medals for level 0', stored({ ...newProgress(), medals: { 0: [true, true, true] } })],
    ['short medals', stored({ ...newProgress(), medals: { 1: [true] } })],
    ['a research step past 3', stored({ ...newProgress(), research: { cannon: { damage: 9 } } })],
    ['a line the family has not', stored({ ...newProgress(), research: { cannon: { speed: 1 } } })],
    ['a gun in the hull slot', stored({ ...newProgress(), loadout: { gun: { family: 'cannon', mk: 1 }, hull: { family: 'cannon', mk: 1 }, drive: { family: 'wheels', mk: 1 } } })],
    ['Mk 6', stored({ ...newProgress(), mk: { machinegun: 6 } })],
    ['no progress', stored(null)],
  ])('resets to defaults on %s, never throws', (_what, raw) => {
    const r = parseSave(raw);
    expect(r.save).toEqual(newSave());
    expect(r.problem).toMatch(/^bad save/);
  });

  it('keeps the save but refits a tank you no longer own', () => {
    const p = { ...newProgress(), loadout: { gun: { family: 'rockets', mk: 1 }, hull: { family: 'light', mk: 1 }, drive: { family: 'wheels', mk: 1 } }, xp: 120 };
    const r = parseSave(stored(p));
    expect(r.problem).toBeNull();
    expect(r.save.progress.xp).toBe(120);
    expect(r.save.progress.loadout.gun.family).toBe('machinegun');
  });

  it('always keeps the starter families unlocked', () => {
    const r = parseSave(stored({ ...newProgress(), unlocked: [] }));
    expect(r.save.progress.unlocked).toEqual(expect.arrayContaining(['machinegun', 'light', 'wheels']));
  });

  it('remembers the first-blueprints tip, and old saves without it have not seen it', () => {
    expect(newSave().seenBlueprints).toBe(false);
    const seen = parseSave(JSON.stringify({ v: SAVE_VERSION, progress: newProgress(), sound: true, seenBlueprints: true }));
    expect(seen.save.seenBlueprints).toBe(true);
    const old = parseSave(JSON.stringify({ v: SAVE_VERSION, progress: newProgress(), sound: true }));
    expect(old.problem).toBeNull();
    expect(old.save.seenBlueprints).toBe(false);
    expect(parseSave(JSON.stringify({ v: SAVE_VERSION, progress: newProgress(), seenBlueprints: 'yes' })).save.seenBlueprints).toBe(false);
  });
});
