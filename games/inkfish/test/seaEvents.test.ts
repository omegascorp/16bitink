import { describe, expect, it } from 'vitest';
import { INKFISH_FULL_CHAPTERS } from '../content/paid';
import { DEMO_CHAPTER } from '../src/levels/demo';
import { SPECIES_INFO } from '../src/levels/species';
import { ZONE_SKY } from '../src/levels/zones';
import type { LevelDef } from '../src/levels/types';
import { createRng } from '../src/logic/rng';
import {
  EVENT_TIMING, eventGap, eventPointer, eventStatus, eventsFor, pickEvent, prowlerSpecies, SEA_EVENTS, ZONE_EVENTS, type SeaEventId,
} from '../src/logic/seaEvents';

const chapters = [DEMO_CHAPTER, ...INKFISH_FULL_CHAPTERS];
const eventsOf = (ch: (typeof chapters)[number], l: LevelDef): readonly SeaEventId[] => eventsFor(l, ch.zone, ZONE_SKY[ch.zone]);

describe('sea events', () => {
  it('leaves the first two levels of every chapter, and its giant, alone', () => {
    for (const ch of chapters) {
      expect(eventsOf(ch, ch.levels[0]!)).toEqual([]);
      expect(eventsOf(ch, ch.levels[1]!)).toEqual([]);
      expect(eventsOf(ch, ch.levels.at(-1)!)).toEqual([]);
    }
  });

  it('gives every other level one or two events', () => {
    for (const ch of chapters) {
      for (const l of ch.levels.slice(2, -1)) {
        const n = eventsOf(ch, l).length;
        expect(n, `${ch.zone} level ${l.index + 1}`).toBeGreaterThanOrEqual(1);
        expect(n).toBeLessThanOrEqual(2);
      }
    }
  });

  it('gives each chapter its own set of events, all of which turn up', () => {
    const sets = chapters.map((ch) => [...ZONE_EVENTS[ch.zone]].sort().join('+'));
    expect(new Set(sets).size).toBe(chapters.length);
    for (const ch of chapters) {
      const used = new Set(ch.levels.flatMap((l) => eventsOf(ch, l)));
      expect([...used].sort()).toEqual([...ZONE_EVENTS[ch.zone]].sort());
    }
  });

  it('brings in new events as the chapter goes on: each one alone before it is paired', () => {
    for (const ch of chapters) {
      const seen = new Set<SeaEventId>();
      for (const l of ch.levels) {
        const events = eventsOf(ch, l);
        const fresh = events.filter((id) => !seen.has(id));
        // A new event never shares its first level with another.
        if (fresh.length) expect(events).toEqual(fresh.slice(0, 1));
        events.forEach((id) => seen.add(id));
      }
    }
  });

  it('keeps sky events under open sky and deep ones in the dark', () => {
    for (const ch of chapters) {
      for (const l of ch.levels) {
        for (const id of eventsOf(ch, l)) {
          const { waters } = SEA_EVENTS[id];
          if (waters === 'sky') expect(ZONE_SKY[ch.zone]).toBe(true);
          if (waters === 'deep') expect(ZONE_SKY[ch.zone]).toBe(false);
          if (id === 'fleet') expect(l.hazards.hookEverySec).toBeGreaterThan(0);
          if (id === 'riptide') expect(l.modifiers.current).toBeFalsy();
        }
      }
    }
  });

  it('sends the level\'s biggest open-water hunter, never the staple prey or a giant', () => {
    for (const l of chapters.flatMap((c) => c.levels)) {
      const s = prowlerSpecies(l);
      if (!s) continue;
      const info = SPECIES_INFO[s];
      expect(info.hunter).toBe(true);
      expect(info.giant ?? false).toBe(false);
      expect(s).not.toBe(l.spawns[0]!.species);
    }
  });

  it('never repeats the last event when there is a choice', () => {
    const rng = createRng(7);
    const options: SeaEventId[] = ['hatch', 'baitball'];
    let last: SeaEventId | null = null;
    for (let i = 0; i < 30; i++) {
      const next = pickEvent(options, last, rng);
      expect(next).not.toBe(last);
      last = next;
    }
    expect(pickEvent(['hatch'], 'hatch', rng)).toBe('hatch');
    expect(pickEvent([], null, rng)).toBeNull();
  });

  it('spaces events out', () => {
    const rng = createRng(3);
    for (let i = 0; i < 30; i++) {
      const first = eventGap(rng, true);
      const gap = eventGap(rng, false);
      expect(first).toBeGreaterThanOrEqual(EVENT_TIMING.first[0]);
      expect(first).toBeLessThanOrEqual(EVENT_TIMING.first[1]);
      expect(gap).toBeGreaterThanOrEqual(EVENT_TIMING.gap[0]);
      expect(gap).toBeLessThanOrEqual(EVENT_TIMING.gap[1]);
    }
  });

  it('counts down on the HUD', () => {
    expect(eventStatus('baitball', 11.2)).toBe('Bait ball 0:12');
    expect(eventStatus('hatch', -1)).toBe('Dragonfly hatch 0:00');
  });

  describe('pointing the way', () => {
    const view = { left: 0, right: 800, top: 0, bottom: 600 };
    const player = { x: 400, y: 300 };

    it('points at the nearest part of the event when none of it is in sight', () => {
      const far = { x: 2000, y: 300 };
      const near = { x: -300, y: 300 };
      expect(eventPointer([far, near], view, player)).toBe(near);
    });

    it('needs no pointer once any of it is in sight, or when it is nowhere in particular', () => {
      expect(eventPointer([{ x: 2000, y: 300 }, { x: 500, y: 200 }], view, player)).toBeNull();
      expect(eventPointer([], view, player)).toBeNull();
    });

    it('marks threats apart from treats', () => {
      expect(SEA_EVENTS.prowler.danger).toBe(true);
      expect(SEA_EVENTS.baitball.danger).toBe(false);
    });
  });
});
