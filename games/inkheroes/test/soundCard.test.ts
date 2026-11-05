import { describe, expect, it } from 'vitest';
import { parseSettings, settingsWith } from '../src/audio/soundSettings';
import type { CardSpec } from '../src/scenes/CardScene';
import { soundCard, type SoundSwitches } from '../src/scenes/soundCard';

describe('sound settings', () => {
  it('has everything on for a new player, or when the store holds nonsense', () => {
    const on = { music: true, effects: true };
    expect(parseSettings(null)).toEqual(on);
    expect(parseSettings(undefined)).toEqual(on);
    expect(parseSettings('not json')).toEqual(on);
    expect(parseSettings('null')).toEqual(on);
  });

  it('keeps music and effects apart', () => {
    expect(parseSettings(JSON.stringify({ music: false, effects: true }))).toEqual({ music: false, effects: true });
    expect(parseSettings(JSON.stringify({ music: true, effects: false }))).toEqual({ music: true, effects: false });
  });

  it('turns both off for a player who had muted the old single switch', () => {
    expect(parseSettings(JSON.stringify({ muted: true }))).toEqual({ music: false, effects: false });
    expect(parseSettings(JSON.stringify({ muted: false }))).toEqual({ music: true, effects: true });
  });

  it('changes one setting without touching the other', () => {
    const before = { music: true, effects: true };
    expect(settingsWith(before, 'music', false)).toEqual({ music: false, effects: true });
    expect(before.music).toBe(true);
  });
});

describe('the sound card', () => {
  const board = (): SoundSwitches => {
    let now = { music: true, effects: true };
    return { isOn: (k) => now[k], setOn: (k, on) => { now = settingsWith(now, k, on); } };
  };
  const labels = (s: CardSpec): string[] => s.buttons.map((b) => b.label);

  it('shows each switch as it stands', () => {
    const cards: CardSpec[] = [];
    const sound = board();
    sound.setOn('effects', false);
    soundCard(sound, (s) => cards.push(s));
    expect(labels(cards[0]!)).toEqual(['Music: on', 'Effects: off', 'Done']);
  });

  it('flips a switch and comes back with it changed, for the other to be set too', () => {
    const cards: CardSpec[] = [];
    const sound = board();
    soundCard(sound, (s) => cards.push(s));
    cards[0]!.buttons[0]!.onClick();
    expect(sound.isOn('music')).toBe(false);
    expect(sound.isOn('effects')).toBe(true);
    expect(labels(cards[1]!)).toEqual(['Music: off', 'Effects: on', 'Done']);
    cards[1]!.buttons[1]!.onClick();
    expect(labels(cards[2]!)).toEqual(['Music: off', 'Effects: off', 'Done']);
  });

  it('closes on Done without opening again', () => {
    const cards: CardSpec[] = [];
    soundCard(board(), (s) => cards.push(s));
    cards[0]!.buttons[2]!.onClick();
    expect(cards).toHaveLength(1);
  });
});
