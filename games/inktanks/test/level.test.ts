import { describe, expect, it } from 'vitest';
import { KINDS } from '../src/content/ch1/kinds';
import { CH1_LEVEL_DEFS, CH1_LEVELS } from '../src/content/ch1/levels';
import { loadLevel, parseTank } from '../src/logic/level/load';
import { fixture } from './fixtures/levels';

describe('level layouts', () => {
  it('chapter 1 has the ten levels of the design table, numbered 1–10', () => {
    expect(CH1_LEVELS.map((l) => l.def.type)).toEqual(['assault', 'raid', 'escort', 'hold', 'ace', 'rescue', 'ambush', 'salvage', 'breakout', 'fortress']);
    expect(CH1_LEVELS.map((l) => l.def.number)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    for (const l of CH1_LEVELS) {
      const { cols, rows } = l.def.map;
      expect(cols * rows, l.def.name).toBeGreaterThanOrEqual(4);
      expect(Math.max(cols, rows), l.def.name).toBeLessThanOrEqual(4);
      expect(l.def.bonus).toHaveLength(2);
      expect(l.crates.length, l.def.name).toBeGreaterThanOrEqual(3);
      expect(l.enemies.length, l.def.name).toBeGreaterThanOrEqual(4);
    }
  });
  it('parses tanks', () => {
    expect(parseTank('cannon2/medium1/halftracks1')).toEqual({ gun: { family: 'cannon', mk: 2 }, hull: { family: 'medium', mk: 1 }, drive: { family: 'halftracks', mk: 1 } });
    expect(() => parseTank('cannon2/medium1')).toThrow(/gun\/hull\/drive/);
    expect(() => parseTank('laser1/medium1/wheels1')).toThrow(/bad gun/);
    expect(() => parseTank('cannon4/medium1/wheels1')).toThrow(/bad gun/);
  });
  it('rejects bad layouts with every problem named', () => {
    const base = CH1_LEVEL_DEFS[0]!;
    const bad = { ...base, map: { ...base.map, structures: [...base.map.structures, { kind: 'castle', x: 10, y: 10 }, { kind: 'oak', x: 99999, y: 10 }] }, enemies: [...base.enemies, { role: 'patrol' as const, clan: 'boars' as const, tank: 'machinegun1/light1/wheels1', at: 'nowhere', route: 'noroad' }] };
    let msg = '';
    try {
      loadLevel(bad, KINDS);
    } catch (e) {
      msg = (e as Error).message;
    }
    expect(msg).toContain('level 1 First Tracks');
    expect(msg).toContain('unknown kind "castle"');
    expect(msg).toContain('off the 2880×1080 map');
    expect(msg).toContain('unknown point "nowhere"');
    expect(msg).toContain('unknown road "noroad"');
    expect(() => loadLevel(fixture({ kind: 'raid', tag: 'target', label: 'X' }), KINDS)).toThrow(/no structure tagged "target"/);
    expect(() => loadLevel(fixture({ kind: 'chase', base: 'c' }), KINDS)).toThrow(/role "runner"/);
    expect(() => loadLevel(fixture({ kind: 'assault' }, [{ role: 'wave', clan: 'boars', tank: 'machinegun1/light1/wheels1', at: 'a' }]), KINDS)).toThrow(/needs "when"/);
    expect(() => loadLevel(fixture({ kind: 'assault' }, [{ role: 'guard', clan: 'boars', tank: 'tank', at: 'a' }]), KINDS)).toThrow(/enemy 0/);
  });
});
