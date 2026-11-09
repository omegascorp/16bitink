import { describe, expect, it, vi } from 'vitest';
import type { GameEvent } from '@16bitink/game-sdk';

vi.mock('phaser', () => ({ default: { Events: { EventEmitter: class { emit(): boolean { return true; } on(): this { return this; } } } } }));

import { ASHFORD } from '../src/level/borderMarch';
import { startAdventure } from '../src/logic/adventure';
import { progressNote } from '../src/logic/runNote';
import { Session } from '../src/scenes/session';

function fake(track?: (e: GameEvent) => void) {
  const data = new Map<string, unknown>();
  const store = new Map<string, string>();
  const scene = { registry: { get: (k: string) => (k === 'host' ? host : data.get(k)), set: (k: string, v: unknown) => void data.set(k, v), remove: (k: string) => void data.delete(k) } };
  const host = { storage: { get: (k: string) => store.get(k) ?? null, set: (k: string, v: string) => void store.set(k, v), remove: (k: string) => void store.delete(k) }, track } as never;
  return { scene: scene as never, host };
}

describe('InkHeroes level tracking', () => {
  it('has a stable, short progress note', () => {
    const note = progressNote(startAdventure(ASHFORD));
    expect(note).toBe('day 1 · 1 town · 1 hero');
    expect(note.length).toBeLessThanOrEqual(60);
  });

  it('sends a start on open, a level_progress at each day end, and one end on quit', () => {
    const events: GameEvent[] = [];
    const { scene, host } = fake((e) => events.push(e));
    const s = Session.begin(scene, host, ASHFORD);
    s.endDay();
    expect(events.map((e) => e.type)).toEqual(['level_start', 'level_progress']);
    const p = events[1] as Extract<GameEvent, { type: 'level_progress' }>;
    expect(p.level).toBe(ASHFORD.id);
    expect(p.progress).toMatch(/^day 2 · \d+ towns? · \d+ heroe?s?$/);
    expect(typeof p.seconds).toBe('number');
    s.abandon(scene);
    const end = events[events.length - 1] as Extract<GameEvent, { type: 'level_end' }>;
    expect(end).toMatchObject({ type: 'level_end', result: 'quit' });
    expect(events.filter((e) => e.type === 'level_end')).toHaveLength(1);
  });

  it('never throws when the host tracker throws', () => {
    const { scene, host } = fake(() => {
      throw new Error('boom');
    });
    const s = Session.begin(scene, host, ASHFORD);
    expect(() => s.endDay()).not.toThrow();
  });
});
