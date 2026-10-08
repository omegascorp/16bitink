import { describe, expect, it } from 'vitest';
import { DEMO_CHAPTER } from '../src/levels/demo';
import { PLAYER_STATS } from '../src/levels/playerStats';
import { describeLevel } from '../src/levels/twists';
import { PLAYER_FISH } from '../src/levels/zones';
import {
  ABILITY, ABILITY_INFO, ABILITY_KEY, abilityMeter, abilityUnlocked, canSwallow, freshDashes, INK_DEBUT, lightBoost, PLAYER_ABILITY, shrugsOff, spendDash,
} from '../src/logic/abilities';

const COOLDOWN = 1400;

describe('player abilities', () => {
  it('gives every chapter fish a different ability', () => {
    const abilities = PLAYER_FISH.map((f) => PLAYER_ABILITY[f]);
    expect(new Set(abilities).size).toBe(PLAYER_FISH.length);
  });

  it('keeps the mako\'s sense where the stats say it is', () => {
    for (const f of PLAYER_FISH) expect(PLAYER_ABILITY[f] === 'sense').toBe(PLAYER_STATS[f].sense === true);
  });

  it('explains every active ability\'s key and button where the fish is introduced', () => {
    for (const f of PLAYER_FISH) {
      const info = ABILITY_INFO[PLAYER_ABILITY[f]];
      if (!info.active) continue;
      expect(PLAYER_STATS[f].trait).toContain(`press ${ABILITY_KEY}`);
      expect(PLAYER_STATS[f].trait).toContain(`tap ${info.name}`);
    }
  });

  it('teaches the ink cloud on level 3, after the basics and the leap, and not before', () => {
    expect(abilityUnlocked('inkling', INK_DEBUT - 1)).toBe(false);
    expect(abilityUnlocked('inkling', INK_DEBUT)).toBe(true);
    expect(abilityUnlocked('lanternfish', 61)).toBe(true);
    const notes = DEMO_CHAPTER.levels.map((l) => describeLevel(l).notes.join(' '));
    expect(notes[INK_DEBUT - 1]).toContain(`press ${ABILITY_KEY}`);
    expect(notes.filter((n) => n.includes('squirt ink')).length).toBe(1);
  });

  it('dashes once per cooldown with one charge', () => {
    const a = spendDash(freshDashes(1), 0, 1, COOLDOWN)!;
    expect(spendDash(a, 500, 1, COOLDOWN)).toBeNull();
    expect(spendDash(a, COOLDOWN, 1, COOLDOWN)).not.toBeNull();
  });

  it('gives the tuna two dashes back to back, then the cooldown', () => {
    const first = spendDash(freshDashes(2), 0, 2, COOLDOWN)!;
    expect(spendDash(first, 100, 2, COOLDOWN)).toBeNull();
    const second = spendDash(first, ABILITY.chainGapMs, 2, COOLDOWN)!;
    expect(second).not.toBeNull();
    expect(spendDash(second, ABILITY.chainGapMs + 600, 2, COOLDOWN)).toBeNull();
    // Both back once the cooldown from the last dash is over.
    const later = ABILITY.chainGapMs + COOLDOWN;
    const third = spendDash(second, later, 2, COOLDOWN)!;
    expect(spendDash(third, later + ABILITY.chainGapMs, 2, COOLDOWN)).not.toBeNull();
  });

  it('lets only a huge gape swallow fish its own size', () => {
    expect(canSwallow('ink', 'prey')).toBe(true);
    expect(canSwallow('ink', 'peer')).toBe(false);
    expect(canSwallow('gape', 'peer')).toBe(true);
    expect(canSwallow('gape', 'predator')).toBe(false);
  });

  it('lets stings and spines slide off a jelly body, and nothing else', () => {
    expect(shrugsOff('jellyBody', 'sting')).toBe(true);
    expect(shrugsOff('jellyBody', 'spiked')).toBe(true);
    expect(shrugsOff('jellyBody', 'other')).toBe(false);
    expect(shrugsOff('spines', 'sting')).toBe(false);
  });

  it('shines further with the searchlight only', () => {
    expect(lightBoost('searchlight')).toBeGreaterThan(1);
    expect(lightBoost('flash')).toBe(1);
  });

  it('shows an active ability recharging on the HUD', () => {
    expect(abilityMeter('ink', 0, 100)).toEqual({ name: 'ink', ready: 1 });
    const half = abilityMeter('ink', ABILITY_INFO.ink.cooldownMs / 2, 0);
    expect(half.ready).toBeCloseTo(0.5);
  });
});
