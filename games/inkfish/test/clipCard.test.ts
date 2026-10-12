import { describe, expect, it } from 'vitest';
import { clipCard, clipFileName, CLIP_FOOTER } from '../src/logic/clips/card';

const stats = { seconds: 102, eaten: 23, progress: 0.4 };

describe('clip card', () => {
  it('writes an obituary for a lost level, blaming the killer', () => {
    const card = clipCard({ kind: 'lose', death: { cause: 'eaten', killer: 'pike' }, fishName: 'inkling', levelName: 'Tide Pool 3', ...stats });
    expect(card.title).toMatch(/inkling/);
    expect(card.lines.join(' ')).toMatch(/pike/);
    expect(card.lines.join(' ')).toMatch(/23 fish/);
    expect(card.lines.join(' ')).toMatch(/1:42/);
  });

  it('rubs it in when the fish was nearly full', () => {
    const close = clipCard({ kind: 'lose', death: { cause: 'eaten', killer: 'pike' }, fishName: 'goby', levelName: 'x', ...stats, progress: 0.9 });
    expect(close.lines.join(' ')).toMatch(/90%/);
    const far = clipCard({ kind: 'lose', death: { cause: 'eaten', killer: 'pike' }, fishName: 'goby', levelName: 'x', ...stats });
    expect(far.lines.join(' ')).not.toMatch(/%/);
  });

  it('cheers a won level', () => {
    const card = clipCard({ kind: 'win', fishName: 'goby', levelName: 'Kelp Forest 2', ...stats });
    expect(card.title).toBe('Full belly!');
    expect(card.lines.join(' ')).toMatch(/Kelp Forest 2/);
  });

  it('says one fish, not one fishes', () => {
    const card = clipCard({ kind: 'win', fishName: 'goby', levelName: 'x', seconds: 9, eaten: 1, progress: 1 });
    expect(card.lines.join(' ')).toMatch(/1 fish\b/);
    expect(card.lines.join(' ')).toMatch(/0:09/);
  });

  it('points viewers at the game', () => {
    expect(CLIP_FOOTER).toMatch(/16bit\.ink/);
  });

  it('names the file after the level and how it ended', () => {
    expect(clipFileName('Tide Pool 3', { cause: 'eaten', killer: 'pike' })).toBe('inkfish-tide-pool-3-eaten-by-pike.mp4');
    expect(clipFileName('Kelp Forest 2')).toBe('inkfish-kelp-forest-2-full-belly.mp4');
  });
});
