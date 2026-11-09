import { describe, expect, it } from 'vitest';
import { BLACK_BANNER, OTHRYS } from '../src/level/borderMarch';
import { rideOn } from '../src/logic/chapter';
import { startAdventure } from '../src/logic/adventure';
import { rideHere } from '../src/logic/rideHere';

describe('Ride here across a ridden-on chapter', () => {
  it('offers a multi-day way from the Othrys land to a town of ours far behind', () => {
    const bb = startAdventure(BLACK_BANNER);
    const won = { ...bb, status: 'won' as const, prompts: [], day: 30, towns: bb.towns.map((t) => ({ ...t, owner: 'player' as const })), hero: { ...bb.hero, x: 63, y: 41 } };
    const adv = rideOn(won, BLACK_BANNER, OTHRYS);
    const ashford = adv.towns.find((t) => t.id === 'ashford-town')!;
    // Unfought guards on the road stop the ride, and the town screen says so.
    expect(rideHere(adv, OTHRYS, ashford)).toMatchObject({ why: expect.stringContaining('guard') });
    // With the road clear, a multi-day way over the whole chapter is offered.
    const clear = { ...adv, objects: adv.objects.filter((o) => o.kind !== 'monster') };
    const r = rideHere(clear, OTHRYS, ashford);
    expect('path' in r && r.path.length > 60 && r.path[r.path.length - 1]!.day).toBeGreaterThanOrEqual(2);
    for (const id of ['thornwood-town', 'eudora-town']) expect('path' in rideHere(adv, OTHRYS, adv.towns.find((t) => t.id === id)!)).toBe(true);
  });
});
