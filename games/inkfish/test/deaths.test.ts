import { describe, expect, it } from 'vitest';
import { causeOfBite, deathText, hitText } from '../src/logic/deaths';

describe('deaths', () => {
  it('tells spiky fish from biters', () => {
    expect(causeOfBite('puffer')).toBe('spiked');
    expect(causeOfBite('pike')).toBe('eaten');
    expect(causeOfBite('angler')).toBe('eaten');
  });

  it('names the cause on the result screen', () => {
    expect(deathText({ cause: 'hooked' }).title).toBe('Cooked!');
    expect(deathText({ cause: 'spiked', killer: 'puffer' }).title).toBe('Spiked!');
    expect(deathText({ cause: 'eaten', killer: 'pike' }).title).toBe('Eaten!');
  });

  it('blames the right fish', () => {
    expect(deathText({ cause: 'eaten', killer: 'angler' }).line).toMatch(/angler/);
    expect(deathText({ cause: 'eaten', killer: 'eel' }).line).toMatch(/eel/);
    expect(deathText({ cause: 'eaten' }).line.length).toBeGreaterThan(0);
  });

  it('names the bird that snatched you', () => {
    expect(deathText({ cause: 'snatched', bird: 'gannet' })).toEqual({ title: 'Snatched!', line: 'A gannet plucked you out of the sea.' });
    expect(hitText('snatched')).toBe('Peck!');
  });

  it('uses a lighter word for a hit you survive', () => {
    expect(hitText('spiked')).toBe('Ouch!');
    expect(hitText('eaten')).toBe('Chomp!');
    expect(hitText('hooked')).toBe('Hooked!');
  });
});
