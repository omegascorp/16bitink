import { describe, expect, it } from 'vitest';
import { BLACK_BANNER, OTHRYS } from '../src/level/borderMarch';
import type { MapDef } from '../src/level/types';
import { DELTA } from '../src/level/twoLands';
import { afterBattle, battleSides, checkGoal, endDay, frontRival, isSeen, rivalAt, rivalHeroes, startAdventure, stepHero, type Adventure } from '../src/logic/adventure';
import { armyOf } from '../src/logic/army';
import { autoBattle } from '../src/logic/autoBattle';
import { goalOf, goalStep, keepFor, planBuild, savingTown } from '../src/logic/lord/build';
import { gives } from '../src/logic/lord/day';
import { NO_MEMORY, remember } from '../src/logic/lord/knowledge';
import { mirrored, unmirrored } from '../src/logic/lord/mirror';
import { lordNews } from '../src/logic/lord/news';
import { comesBack, playLord, townless } from '../src/logic/lord/turn';
import { headStart, rivalTurn } from '../src/logic/rival';
import { parseAdventure } from '../src/logic/save';
import { armyStrength } from '../src/logic/strength';

const lordly = (def: MapDef): MapDef => ({ ...def, rival: { ...def.rival!, mind: 'lord' } });
const BANNER = lordly(BLACK_BANNER);

/** Plays `n` of the lord's nights (fights fought at once). */
function nights(adv: Adventure, def: MapDef, n: number): Adventure {
  let a = adv;
  for (let i = 0; i < n && a.status === 'playing'; i++) a = playLord(endDay(a, def), def, 'auto').adv;
  return a;
}

describe('the lord mind', () => {
  it('mirrors the adventure: his side as ours and back, unchanged', () => {
    const adv = { ...startAdventure(OTHRYS), rival: { ...startAdventure(OTHRYS).rival!, explored: '0'.repeat(startAdventure(OTHRYS).explored.length) } };
    const m = mirrored(adv);
    expect(m.hero.id).toBe('lykaon');
    expect(m.towns.find((t) => t.id === 'lykosoura-town')!.owner).toBe('player');
    expect(m.towns.find((t) => t.id === 'ashford-town')!.owner).toBe('rival');
    expect(m.rival!.hero!.id).toBe(adv.hero.id);
    expect(unmirrored(m, adv)).toEqual({ ...adv, rival: { ...adv.rival!, others: [] } });
  });

  it('knows only what he has seen, in his own fog, and remembers our hero where he saw him', () => {
    const adv = playLord(endDay(startAdventure(OTHRYS), OTHRYS), OTHRYS, 'auto').adv;
    const fog = adv.rival!.explored!;
    expect(fog).not.toBe(adv.explored);
    const seen = fog.split('').filter((c) => c === '1').length;
    expect(seen).toBeGreaterThan(50);
    expect(seen).toBeLessThan(fog.length / 2);
    // Our hero beside his: in his memory, with his strength.
    const m = mirrored(adv);
    const near = { ...m, rival: { ...m.rival!, hero: { ...m.rival!.hero!, x: m.hero.x + 2, y: m.hero.y } } };
    expect(remember(near, OTHRYS, NO_MEMORY).foes[adv.hero.id]).toMatchObject({ x: m.hero.x + 2, strength: armyStrength(adv.hero.army) });
  });

  it('hires a second hero at his Tavern by the part\'s third day, under our price', () => {
    const adv = nights(startAdventure(OTHRYS), OTHRYS, 3);
    expect(rivalHeroes(adv).length).toBeGreaterThanOrEqual(2);
    expect(rivalHeroes(adv)[0]!.id === 'lykaon' || rivalHeroes(adv).some((h) => h.id === 'lykaon')).toBe(true);
  });

  it('plans: a hall that pays back first, savings kept for the Seraph Spire, rare goods spared', () => {
    const lyko = startAdventure(OTHRYS).towns.find((t) => t.id === 'lykosoura-town')!;
    const rich = { gold: 30000, wood: 30, ore: 30, mercury: 10, sulfur: 10, crystal: 10, gems: 10 };
    expect(goalOf(lyko, OTHRYS.off)).toBe('seraphSpire');
    expect(planBuild(lyko, rich, OTHRYS.off, keepFor('seraphSpire', 0), 'seraphSpire')).toBe('seraphSpire');
    expect(planBuild(lyko, { ...rich, mercury: 4 }, OTHRYS.off, keepFor('seraphSpire', 0), 'seraphSpire')).toBe('cityHall');
    // Saving for it: nothing small is bought out of the savings.
    expect(planBuild({ ...lyko, built: [...lyko.built, 'cityHall'] }, { ...rich, gold: 21000, mercury: 4 }, OTHRYS.off, keepFor('seraphSpire', 20000), 'seraphSpire')).toBeNull();
  });

  it('builds Egypt’s way to the Benben Stone first: the Sphinx Terrace, out of the gold above the savings, its wood kept for it', () => {
    const avaris = startAdventure(DELTA).towns.find((t) => t.id === 'avaris-town')!;
    expect(goalOf(avaris, DELTA.off)).toBe('seraphSpire');
    expect(goalStep(avaris, 'seraphSpire', DELTA.off)).toBe('tiltyard');
    // The step's 20 wood are kept from the plan's other buildings.
    expect(keepFor('seraphSpire', 0, avaris, DELTA.off).wood).toBe(20);
    const purse = { gold: 30000, wood: 25, ore: 30, mercury: 10, sulfur: 10, crystal: 10, gems: 10 };
    expect(planBuild(avaris, purse, DELTA.off, keepFor('seraphSpire', 20000, avaris, DELTA.off), 'seraphSpire')).toBe('tiltyard');
    // Only the savings left: it waits.
    expect(planBuild(avaris, { ...purse, gold: 22000 }, DELTA.off, keepFor('seraphSpire', 20000, avaris, DELTA.off), 'seraphSpire')).not.toBe('tiltyard');
    // He saves in his capital, not in a town just taken.
    const taken = startAdventure(DELTA).towns.find((t) => t.id === 'per-bastet-town')!;
    expect(savingTown([taken, avaris], DELTA.off)?.id).toBe('avaris-town');
  });

  it('hands every company but the weakest to the main hero, where they fit', () => {
    const r = gives(armyOf([{ creature: 'spearman', count: 10 }, { creature: 'griffin', count: 4 }]), armyOf([{ creature: 'griffin', count: 6 }]))!;
    expect(r.to).toEqual(armyOf([{ creature: 'griffin', count: 10 }]));
    expect(r.from.filter((s) => s)).toEqual([{ creature: 'spearman', count: 10 }]);
    expect(gives(armyOf([{ creature: 'spearman', count: 10 }]), armyOf([]))).toBeNull();
  });

  it('plays the same way every time, and leaves Kassander\'s Black Banner and Sethi\'s rules alone', () => {
    const start = startAdventure(BANNER);
    expect(playLord(endDay(start, BANNER), BANNER, 'auto')).toEqual(playLord(endDay(start, BANNER), BANNER, 'auto'));
    // Without `mind`, the night is Kassander's (no fog, no other heroes) and his head start is played.
    const old = rivalTurn(endDay(startAdventure(BLACK_BANNER)), BLACK_BANNER).adv;
    expect(old.rival!.explored).toBeUndefined();
    expect(headStart({ ...start, day: 10 }, BANNER)).toEqual({ ...start, day: 10 });
  });

  it('stops at a fight with us for the player to play, his hero first', () => {
    const start = startAdventure(BANNER);
    // Our hero, alone and weak, two steps from his, out in the field.
    const ours = start.hero;
    const weak = { ...start, hero: { ...ours, army: armyOf([{ creature: 'spearman', count: 1 }]) }, rival: { ...start.rival!, hero: { ...start.rival!.hero!, x: ours.x + 2, y: ours.y } } };
    const r = playLord(endDay(weak, BANNER), BANNER, 'stop');
    expect(r.fight).toBe('rival');
    expect(rivalAt(r.adv, r.adv.rival!.hero!.x, r.adv.rival!.hero!.y)).toBe(true);
  });

  it('keeps several heroes of his through a save, and an old save without them still loads', () => {
    const adv = nights(startAdventure(OTHRYS), OTHRYS, 4);
    const reload = (a: Adventure): Adventure | null => parseAdventure(JSON.parse(JSON.stringify(a)), OTHRYS);
    expect(reload(adv)?.rival).toEqual(adv.rival);
    const { others: _o, explored: _e, memory: _m, ...old } = adv.rival!;
    expect(reload({ ...adv, rival: old })?.rival).toEqual(old);
  });

  it('fights his other heroes as the first: met on the map, beaten, the next rides on', () => {
    const adv = nights(startAdventure(OTHRYS), OTHRYS, 3);
    const second = adv.rival!.others![0]!;
    const fronted = frontRival(adv, second.x, second.y);
    expect(fronted.rival!.hero!.id).toBe(second.id);
    const s = battleSides(fronted, 'rival');
    const won = { ...autoBattle(s.attacker, s.defender, 1), winner: 0 as const, fled: undefined };
    const after = afterBattle(fronted, OTHRYS, 'rival', won);
    expect(rivalHeroes(after).map((h) => h.id)).not.toContain(second.id);
    expect(rivalHeroes(after).length).toBe(rivalHeroes(adv).length - 1);
  });

  it('tells the night\'s news: his buildings always, his flags only where we see', () => {
    const before = startAdventure(OTHRYS);
    const lyko = before.towns.find((t) => t.id === 'lykosoura-town')!;
    const after = { ...before, towns: before.towns.map((t) => (t.id === lyko.id ? { ...t, built: [...t.built, 'seraphSpire' as const] } : t)) };
    expect(lordNews(before, after, OTHRYS)).toEqual(['Lykaon raises the Seraph Spire in Lykosoura.']);
    const mine = before.objects.find((o) => o.kind === 'mine' && !isSeen(before, OTHRYS, o.x, o.y))!;
    const flagged = { ...before, objects: before.objects.map((o) => (o.id === mine.id ? { ...o, owner: 'rival' as const } : o)) };
    expect(lordNews(before, flagged, OTHRYS)).toEqual([]);
  });

  it('walks onto a hero of his other than the first: the fight is with that one', () => {
    const adv = nights(startAdventure(OTHRYS), OTHRYS, 3);
    const second = adv.rival!.others![0]!;
    const beside = { ...adv, hero: { ...adv.hero, x: second.x - 1, y: second.y, mp: 2000 } };
    const r = stepHero(beside, OTHRYS, { x: second.x, y: second.y, cost: 100, straight: 100, day: 0 });
    expect(r.battle).toBe('rival');
    expect(r.adv.rival!.hero!.id).toBe(second.id);
  });

  it('is won with all his towns taken and Lykaon beaten; his captains then leave, and a beaten Lykaon with a town is back next week', () => {
    const adv = nights(startAdventure(OTHRYS), OTHRYS, 3);
    const captain = adv.rival!.others![0]!;
    const theirs = (a: Adventure): Adventure => ({ ...a, towns: a.towns.map((t) => (t.owner === 'rival' ? { ...t, owner: 'player' as const } : t)) });
    // Towns taken, Lykaon still riding: not yet.
    expect(checkGoal(theirs(adv), OTHRYS).status).toBe('playing');
    // Lykaon beaten (his captain leads now) with a town left: he comes back the next week.
    const beaten = { ...adv, rival: { ...adv.rival!, hero: captain, others: adv.rival!.others!.slice(1), fallen: [{ hero: { ...adv.rival!.hero!, army: armyOf([]) }, day: adv.day }] } };
    expect(checkGoal(beaten, OTHRYS).status).toBe('playing');
    expect(rivalHeroes(comesBack(beaten, OTHRYS)).some((h) => h.id === 'lykaon')).toBe(false);
    const back = comesBack({ ...beaten, day: adv.day + 7 }, OTHRYS);
    const lykaon = rivalHeroes(back).find((h) => h.id === 'lykaon')!;
    expect(back.towns.find((t) => t.x === lykaon.x && t.y === lykaon.y)?.owner).toBe('rival');
    // Beaten with no town left: won, and the captains ride home.
    const won = checkGoal(theirs(beaten), OTHRYS);
    expect(won.status).toBe('won');
    expect(rivalHeroes(won)).toEqual([]);
    expect(won.prompts.at(-1)).toMatchObject({ kind: 'message', text: expect.stringContaining(captain.name) });
  });

  it('counts seven days for a lord with no town on our day card, then his banner falls and the part is won', () => {
    const adv = nights(startAdventure(OTHRYS), OTHRYS, 2);
    // Every town ours, and held too strongly for him to take one back.
    const held = armyOf([{ creature: 'seraph', count: 300 }]);
    const lost: Adventure = { ...adv, towns: adv.towns.map((t) => ({ ...t, owner: 'player' as const, garrison: held })) };
    let a = lost;
    const told: string[] = [];
    for (let n = 1; n <= 7; n++) {
      const r = playLord(endDay(a, OTHRYS), OTHRYS, 'auto');
      told.push(...r.notes.filter((x) => /no town|banner falls/.test(x)));
      a = r.adv;
    }
    expect(told[0]).toBe('Lykaon has no town: 7 days to take one back or his banner falls.');
    expect(rivalHeroes(a)).toEqual([]);
    // Still riding on the seventh night with no town: gone, he and his captains.
    const late = townless({ ...lost, rival: { ...lost.rival!, homeless: lost.day - 6 } }, OTHRYS);
    expect(late.fell).toBe(true);
    expect(late.notes).toEqual(['Lykaon found no town to hold: his banner falls, and his captains scatter.']);
    expect(rivalHeroes(late.adv)).toEqual([]);
    expect(townless({ ...lost, rival: { ...lost.rival!, homeless: lost.day - 5 } }, OTHRYS).notes).toEqual(['Lykaon has no town: 2 days to take one back or his banner falls.']);
    expect(a.status).toBe('won');
    // A town taken back stops the count.
    const back = playLord(endDay({ ...lost, rival: { ...lost.rival!, homeless: lost.day - 3 }, towns: lost.towns.map((t) => (t.id === 'tegea-town' ? { ...t, owner: 'rival' as const } : t)) }, OTHRYS), OTHRYS, 'auto').adv;
    expect(back.rival!.homeless).toBeUndefined();
  });
});
