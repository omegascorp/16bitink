import { describe, expect, it } from 'vitest';
import { chapterById, chapterOf, installPaidMaps, nextMap, partNumber, partsOf } from '../src/level/maps';
import { BLOODAXE, HALOGALAND, LONG_WINTER_PARTS } from '../src/level/longWinter';
import { HALOGALAND_LAND } from '../src/level/halogaland';
import { LONG_WINTER_UNLOCKS, lockedIn, soldOn } from '../src/level/unlocks';
import { parseMaps } from '../src/level/validate';
import {
  battleSides, checkGoal, endDay, gridOf, liveObjects, RIVAL, rivalHeroes, startAdventure, stepHero, townById, type Adventure,
} from '../src/logic/adventure';
import { act, activeStack, createBattle } from '../src/logic/battle';
import { chooseAction } from '../src/logic/battleAi';
import { buildingIdsOf } from '../src/logic/factions';
import { rideOn } from '../src/logic/chapter';
import { strengthOf } from '../src/logic/creatures';
import { lordBarred, tavernHeroes, weekOffer } from '../src/logic/heroes';
import { ITEMS, withGear } from '../src/logic/items';
import { kitted } from '../src/logic/lord/kit';
import { playLord } from '../src/logic/lord/turn';
import { inGrid, passable, tileIndex } from '../src/logic/map';
import { bankName, townFootprint } from '../src/logic/objects';
import { armyStrength } from '../src/logic/strength';
import { specialtyOf } from '../src/logic/roster';
import { NORSE_ROSTER } from '../src/logic/roster/norse';
import { parseAdventure } from '../src/logic/save';
import type { SpellId } from '../src/logic/spells';
import { trainingName, trainsFrom } from '../src/logic/training';
import { visitSite } from '../src/logic/visits';
import { LINES, lineText } from '../src/narration/lines';
import { upcoming } from '../src/narration/upcoming';
import { chapterEnd } from '../src/scenes/chapterEnd';

const def = HALOGALAND;
const BJARKOY = 'bjarkoy-town';
const STEIGEN = 'steigen-town';
const RACED = ['trondenes-town', 'vagar-town'];
/** Halogaland's tiles in the chapter's own. */
const hx = (x: number, y: number): { x: number; y: number } => ({ x: x + 32, y });

/** The Bloodaxe won as a rider leaves it (Avaldsnes and Kaupang ours, Eirik beaten and fled, `fallen`), unless `gone` (his banner fell). */
function bloodaxeWon(gone = false): Adventure {
  const fresh = { ...startAdventure(BLOODAXE), prompts: [] };
  const towns = fresh.towns.map((t) => ({ ...t, owner: 'player' as const }));
  const eirik = fresh.rival!.hero!;
  const rival = gone ? { ...fresh.rival!, hero: null, others: [], fallen: [], homeless: 50 } : { ...fresh.rival!, hero: null, others: [], fallen: [{ hero: { ...eirik, army: eirik.army.map(() => null) }, day: 50 }] };
  const av = townById(fresh, 'avaldsnes-town')!;
  return { ...fresh, towns, rival, day: 60, begun: 30, status: 'won', hero: { ...fresh.hero, x: av.x, y: av.y + 1 } };
}
/** The chapter ridden on into Halogaland, its cards still waiting. */
const openedCards = (gone = false): Adventure => rideOn(bloodaxeWon(gone), BLOODAXE, HALOGALAND);
const riddenOn = (gone = false): Adventure => ({ ...openedCards(gone), prompts: [] });

/** The tiles a hero can walk to from (x, y), objects aside, with `shut` tiles closed. */
function reach(x: number, y: number, shut: readonly { x: number; y: number }[] = []): Set<number> {
  const g = gridOf(def);
  const closed = new Set(shut.map((p) => tileIndex(g, p.x, p.y)));
  const seen = new Set([tileIndex(g, x, y)]);
  const todo = [{ x, y }];
  while (todo.length) {
    const p = todo.pop()!;
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const q = { x: p.x + dx, y: p.y + dy };
        if (!inGrid(g, q.x, q.y) || !passable(g, q.x, q.y) || seen.has(tileIndex(g, q.x, q.y)) || closed.has(tileIndex(g, q.x, q.y))) continue;
        seen.add(tileIndex(g, q.x, q.y));
        todo.push(q);
      }
    }
  }
  return seen;
}

/** The three ways in, as longWinter.ts cuts them: Hladir's east pines, Uppsala's, the fells north of Kaupang's bay. */
const WAYS = [[{ x: 31, y: 7 }], [{ x: 31, y: 38 }], [54, 55, 56].flatMap((y) => [{ x: 36, y }, { x: 37, y }])];

/** Plays `n` nights with the lord's fights fought at once. */
function nights(adv: Adventure, n: number): Adventure {
  let a = adv;
  for (let i = 0; i < n && a.status === 'playing'; i++) a = playNight(endDay(a, def));
  return a;
}
const playNight = (a: Adventure): Adventure => playLord(a, def, 'auto').adv;

/** Chapter 3, part 4 (docs/inkheroes-design.md, "Part 4 as built: Halogaland (Nov 11)"). */
describe('Halogaland, chapter 3’s last part', () => {
  it('is the Long Winter’s part 4, named on its card, opening the whole Norse tree and the Iron Ram', () => {
    expect(chapterOf(def)?.id).toBe('longWinter');
    expect(partNumber(def)).toBe(4);
    expect(chapterById('longWinter').parts[3]).toEqual({ id: 'halogaland', n: 12, name: 'Halogaland' });
    expect(def.off).toEqual(lockedIn(LONG_WINTER_UNLOCKS, 4));
    // Nothing of the Norse town is off: the dragons, the Capitol, Bifrost.
    for (const b of buildingIdsOf('norse')) expect(def.off, b).not.toContain(b);
    expect(soldOn(def.n)).toEqual(['ram', 'ram2']);
    expect(def.story).toBe('part-halogaland');
    // Its win ends the chapter: no `won` line of its own.
    expect(def.won).toBeUndefined();
    expect(def.goal).toMatchObject({ kind: 'overthrow', target: BJARKOY });
    expect(def.parDays).toBe(45);
    expect(def.recruits).toBeUndefined();
    installPaidMaps(LONG_WINTER_PARTS);
    expect(nextMap(BLOODAXE)?.id).toBe('halogaland');
    expect(partsOf(chapterById('longWinter')).at(-1)?.id).toBe('halogaland');
    installPaidMaps([]);
  });

  it('is served as the paid maps are, and every name in it is plain letters', () => {
    expect(parseMaps(JSON.parse(JSON.stringify([def])))).toEqual(JSON.parse(JSON.stringify([def])));
    const names = [def.name, ...(def.towns ?? []).map((t) => t.name), def.rival!.hero.name, ...(def.rival!.captains ?? []).map((c) => c.name)];
    for (const n of names) expect(n, n).toMatch(/^[A-Za-z ]+$/);
  });

  it('lies east of Hladir and Uppsala over the sound, 72 × 86, the parts before kept but the three ways cut', () => {
    const g = gridOf(def);
    expect([g.w, g.h]).toEqual([72, 86]);
    const changed = BLOODAXE.rows.flatMap((row, y) => [...row].flatMap((ch, x) => (def.rows[y]![x] === ch ? [] : [`${x},${y}`])));
    expect(changed.filter((p) => Number(p.split(',')[0]) < 32 || Number(p.split(',')[1]) >= 54).sort()).toEqual(WAYS.flat().map((p) => `${p.x},${p.y}`).sort());
    expect(def.rows.slice(0, 54).map((r) => r.slice(32))).toEqual(HALOGALAND_LAND.rows);
    // South-east of the Bloodaxe, the sea: never walked.
    expect(def.rows.slice(54).every((r) => r.slice(40) === '~'.repeat(32))).toBe(true);
    const count = (t: string): number => g.terrain.filter((x, i) => i % g.w >= 32 && x === t).length;
    expect(count('snow')).toBeGreaterThan(1200);
    expect(count('ice')).toBeGreaterThan(250);
    expect(count('grass') + count('sand')).toBe(0);
    for (const p of def.opening!.way) expect(passable(g, p.x, p.y), `${p.x},${p.y}`).toBe(true);
    expect(def.opening).toMatchObject({ apart: true });
  });

  it('places every object on open ground it can be walked to, clear of the towns, with the north’s monsters', () => {
    const g = gridOf(def);
    const towns = [def.town, ...(def.towns ?? [])];
    const under = new Set(towns.flatMap((t) => townFootprint(t.x, t.y).map((p) => tileIndex(g, p.x, p.y))));
    const walked = reach(def.hero.x, def.hero.y);
    const ids = new Set<string>();
    for (const o of def.objects) {
      expect(passable(g, o.x, o.y), o.id).toBe(true);
      expect(under.has(tileIndex(g, o.x, o.y)), o.id).toBe(false);
      expect(ids.has(o.id), o.id).toBe(false);
      ids.add(o.id);
      if (o.x < 32 || o.y >= 54) continue;
      expect(walked.has(tileIndex(g, o.x, o.y)), o.id).toBe(true);
      if (o.kind === 'monster') expect(['wolfWinter', 'draugr', 'troll', 'barrowKing', 'frostGiant', 'skoll'], o.id).toContain(o.creature);
      if (o.kind === 'lair') expect(passable(g, o.x, o.y + 1), `${o.id}'s door`).toBe(true);
    }
    for (const t of towns) expect(walked.has(tileIndex(g, t.x, t.y)), t.id).toBe(true);
    // As the Delta's: some 60 things to find.
    expect(HALOGALAND_LAND.objects.length).toBeGreaterThanOrEqual(60);
  });

  it('has three ways in, none forced: each alone reaches every town and site from the old land', () => {
    const g = gridOf(def);
    const av = townById(startAdventure(def), 'avaldsnes-town')!;
    for (const [i, way] of WAYS.entries()) {
      const shut = WAYS.filter((_, j) => j !== i).flat();
      const walked = reach(av.x, av.y + 1, shut);
      for (const o of HALOGALAND_LAND.objects) expect(walked.has(tileIndex(g, o.x + 32, o.y)), `way ${i + 1}: ${o.id}`).toBe(true);
      expect(way.every((p) => walked.has(tileIndex(g, p.x, p.y)))).toBe(true);
    }
    expect(reach(av.x, av.y + 1, WAYS.flat()).has(tileIndex(g, hx(21, 25).x, 25))).toBe(false);
  });

  it('opens with only where each way starts shown: Bjarkoy, Steigen, the well in the fog', () => {
    const a = riddenOn();
    const seen = (x: number, y: number): boolean => a.explored[tileIndex(gridOf(def), x, y)] === '1';
    for (const p of def.opening!.way) expect(seen(p.x, p.y)).toBe(true);
    for (const t of [BJARKOY, STEIGEN]) expect(seen(townById(a, t)!.x, townById(a, t)!.y), t).toBe(false);
    expect(seen(hx(21, 25).x, 25)).toBe(false);
  });
});

describe('Halogaland’s sites', () => {
  const site = (id: string) => def.objects.find((o) => o.id === id)!;

  it('names each by the look the map’s Norse pictures are picked by (src/scenes/map/pixelMapArt.ts): the well, the barrows, the pen, the hoard', () => {
    // pixelMapArt.ts's NORSE_LOOK_ART draws these looks (it needs a browser, so the names are checked here).
    expect(['mimirs-well', 'angantyr-barrow', 'treasure-barrow', 'boar-pen', 'dragon-hoard'].map((id) => site(id).look)).toEqual(['mimirsWell', 'angantyrBarrow', 'treasureBarrow', 'boarPen', 'dragonHoard']);
    expect(site('halo-barrow')).toMatchObject({ kind: 'lair', look: 'tomb' });
    expect((def.towns ?? []).every((t) => t.faction === 'norse')).toBe(true);
    // Nothing else is drawn as the well or Angantyr's barrow by its id.
    expect(def.objects.filter((o) => /mimir/i.test(o.id)).map((o) => o.id)).toEqual(['mimirs-well']);
    expect(def.objects.filter((o) => /angantyr/i.test(o.id)).map((o) => o.id)).toEqual(['angantyr-barrow', 'angantyr-draugr']);
  });

  it('Mimir’s Well is the chapter’s legendary site (Epic to Legendary), and Skoll guards it, a real fight', () => {
    const well = site('mimirs-well');
    expect(well).toMatchObject({ kind: 'sanctum', look: 'mimirsWell' });
    expect(trainingName(well)).toBe('Mimir’s Well');
    expect(trainsFrom(well)).toBe(4);
    const skoll = site('skoll');
    expect(skoll).toMatchObject({ creature: 'skoll', line: 'skoll' });
    expect(Math.max(Math.abs(skoll.x - well.x), Math.abs(skoll.y - well.y))).toBe(1);
    const strength = strengthOf('skoll', skoll.count!) + strengthOf(skoll.brood!.creature, skoll.brood!.count);
    // The strongest guard on the map, short of Gunnhild's towns.
    for (const o of def.objects.filter((x) => x.kind === 'monster' && x.id !== 'skoll')) {
      expect(strengthOf(o.creature!, o.count!) + (o.brood ? strengthOf(o.brood.creature, o.brood.count) : 0), o.id).toBeLessThan(strength);
    }
  });

  it('Angantyr’s barrow holds Tyrfing behind its draugr, hand-placed (in no set, nowhere else), and the narrator tells it', () => {
    const barrow = site('angantyr-barrow');
    expect(barrow).toMatchObject({ kind: 'bank', look: 'angantyrBarrow', item: 'tyrfing', line: 'tyrfing' });
    expect(bankName(barrow)).toBe('Angantyr’s Barrow');
    expect(ITEMS.tyrfing).toMatchObject({ slot: 'weapon', quality: 'gold' });
    const all = LONG_WINTER_PARTS.flatMap((m) => m.objects).filter((o) => o.item === 'tyrfing' || o.drop === 'tyrfing');
    expect(new Set(all.map((o) => o.id))).toEqual(new Set(['angantyr-barrow']));
    const guard = site('angantyr-draugr');
    expect(guard).toMatchObject({ creature: 'barrowKing', brood: { creature: 'draugr' } });
    // The guard beaten, the barrow opened: Tyrfing, and the line.
    const a = riddenOn();
    const at = { ...a, hero: { ...a.hero, x: barrow.x, y: barrow.y + 1 }, objects: a.objects.map((o) => (o.id === guard.id ? { ...o, gone: true } : o)) };
    const r = visitSite(at, at.objects.find((o) => o.id === barrow.id)!, def);
    expect(r.adv.prompts.some((p) => p.kind === 'message' && p.line === 'tyrfing')).toBe(true);
    const got = r.adv.hero.gear?.weapon === 'tyrfing' || (r.adv.hero.bag ?? []).includes('tyrfing');
    expect(got).toBe(true);
    expect(LINES.tyrfing.script).toMatch(/Hervor/);
  });

  it('gives the Ram of the Sea-Kings at the old boat sheds, the part’s prize', () => {
    const naust = def.objects.filter((o) => o.drop === 'ram3');
    expect(naust.map((o) => o.id)).toEqual(['naust-giants']);
    expect(ITEMS.ram3).toMatchObject({ slot: 'machine', machine: 'ram3' });
  });

  it('has an Arena, two learning stones, a boar pen, a dragon’s hoard (a forge to the lord) and a treasure barrow', () => {
    const kinds = (k: string) => HALOGALAND_LAND.objects.filter((o) => o.kind === k);
    expect(kinds('arena')).toHaveLength(1);
    expect(kinds('learningStone')).toHaveLength(2);
    expect(kinds('dwelling').map((o) => [o.look, o.creature])).toEqual([['dragonHoard', 'dragon'], ['boarPen', 'warBoar']]);
    expect(bankName(site('treasure-barrow'))).toBe('Treasure Barrow');
    // Every mine kind, Gunnhild's among them.
    expect(new Set(kinds('mine').map((o) => o.resource))).toEqual(new Set(['gold', 'wood', 'ore', 'mercury', 'sulfur', 'crystal', 'gems']));
    expect(kinds('mine').filter((o) => o.owner === 'rival').map((o) => o.id)).toEqual(['bjarkoy-gold-mine', 'steigen-ore-pit', 'steigen-sawmill']);
  });
});

describe('Gunnhild, the first Cleric lord', () => {
  it('is a Norse Cleric lord with the Isa specialty, holding Bjarkoy and Steigen, in Allfather gear that costs her balance nothing', () => {
    const r = def.rival!;
    expect(r).toMatchObject({ mind: 'lord', holds: BJARKOY, line: 'gunnhild', captainLine: 'eirik-returns' });
    expect(r.hero).toMatchObject({ id: 'gunnhild', name: 'Gunnhild', heroClass: 'cleric', faction: 'norse' });
    expect(specialtyOf(r.hero)).toEqual({ kind: 'spell', spell: 'isa' });
    expect(r.hero.spells).toContain('isa');
    const a = riddenOn();
    expect(a.towns.filter((t) => t.owner === 'rival').map((t) => t.id)).toEqual([BJARKOY, STEIGEN]);
    expect(a.towns.filter((t) => RACED.includes(t.id)).map((t) => t.owner)).toEqual(['neutral', 'neutral']);
    const her = rivalHeroes(a).find((h) => h.id === 'gunnhild')!;
    expect(her.gear).toMatchObject(r.kit!.gunnhild!);
    // The kit costs her nothing: worn, her stats are the map's (the rune staff's +1 Knowledge on top, as any hero's book).
    const worn = withGear(kitted(her, undefined));
    expect([worn.attack, worn.defense, worn.power, worn.knowledge]).toEqual([r.hero.attack, r.hero.defense, r.hero.power, r.hero.knowledge + 1]);
  });

  it('comes in as a lord when the chapter rides on, Eirik her captain because he fled north alive', () => {
    const a = openedCards();
    expect(a.mapId).toBe('halogaland');
    expect(a.prompts.at(-1)).toMatchObject({ kind: 'message', line: 'part-halogaland' });
    expect(a.rival!.hero!.id).toBe('gunnhild');
    expect(armyStrength(a.rival!.hero!.army)).toBeGreaterThan(0);
    expect((a.rival!.others ?? []).map((h) => h.id)).toEqual(['eirik']);
    expect(a.rival!.fallen ?? []).toEqual([]);
    // Played fresh, he lived: he rides too.
    expect((startAdventure(def).rival!.others ?? []).map((h) => h.id)).toEqual(['eirik']);
  });

  it('comes without Eirik if his banner fell in the Bloodaxe (he and his captains gone)', () => {
    const a = riddenOn(true);
    expect(a.rival!.hero!.id).toBe('gunnhild');
    expect(a.rival!.others ?? []).toEqual([]);
  });

  it('never gets our campaign heroes at her Taverns, hired or not (Hervor, Heid), nor Eirik a second time', () => {
    const a = riddenOn();
    expect([...lordBarred(def)].sort()).toEqual(['eirik', 'heid', 'hervor']);
    // Heid was never hired, and Hervor's place is empty: still never offered to Gunnhild, any week, at either town.
    const empty: Adventure = { ...a, others: [] };
    for (const week of [1, 2, 3, 4, 5, 6, 7, 8]) {
      for (const t of [BJARKOY, STEIGEN]) {
        const offer = weekOffer({ ...empty, day: (week - 1) * 7 + 1 }, def, townById(a, t)!, 'lord').map((h) => h.id);
        expect(offer.filter((id) => ['hervor', 'heid', 'eirik'].includes(id)), `week ${week} ${t}`).toEqual([]);
      }
    }
    // Ours never offer her or Eirik.
    const ours = tavernHeroes(a, def, townById(a, 'hladir-town')!).map((h) => h.id);
    expect(ours).not.toContain('gunnhild');
    expect(ours).not.toContain('eirik');
    expect(NORSE_ROSTER.some((h) => h.id === 'heid')).toBe(true);
  });

  it('casts her runes in battle, Isa above all, and her long Isa is worth more to her mind', () => {
    const a = riddenOn();
    const her = rivalHeroes(a).find((h) => h.id === 'gunnhild')!;
    // She stands beside our hero and fights him: her side casts as the lord mind's battles do.
    const met: Adventure = { ...a, hero: { ...a.hero, x: her.x, y: her.y + 1, army: a.hero.army }, rival: { ...a.rival!, hero: her, others: [] } };
    const s = battleSides(met, RIVAL, def);
    const cast: SpellId[] = [];
    let st = createBattle(s.attacker, s.defender, s.seed, s.siege).state;
    for (let i = 0; i < 600 && st.winner === null; i++) {
      const side = activeStack(st)?.side ?? 0;
      const act1 = chooseAction(st, true);
      if (act1.type === 'cast' && side === 1) cast.push(act1.spell);
      st = act(st, act1).state;
    }
    expect(cast.length).toBeGreaterThan(0);
    expect(cast[0]).toBe('isa');
  });

  it('is told the first time she is seen, and Eirik’s return when he is; both flags saved', () => {
    const a = riddenOn();
    expect(upcoming(a, 3)).toEqual(['gunnhild', 'eirik-returns', 'skoll']);
    const her = rivalHeroes(a).find((h) => h.id === 'gunnhild')!;
    const near = { ...a, hero: { ...a.hero, x: her.x - 3, y: her.y + 3, mp: 2000 } };
    const r = stepHero(near, def, { x: her.x - 2, y: her.y + 3, cost: 100, straight: 100, day: 0 });
    const lines = r.adv.prompts.flatMap((p) => (p.kind === 'message' && p.line ? [p.line] : []));
    expect(lines).toContain('gunnhild');
    expect(lines).toContain('eirik-returns');
    expect(r.adv.rival).toMatchObject({ seen: true, captainSeen: true });
    const again = stepHero({ ...r.adv, prompts: [] }, def, { x: her.x - 3, y: her.y + 3, cost: 100, straight: 100, day: 0 }).adv;
    expect(again.prompts.some((p) => p.kind === 'message' && (p.line === 'gunnhild' || p.line === 'eirik-returns'))).toBe(false);
    expect(parseAdventure(JSON.parse(JSON.stringify(again)), def)?.rival).toMatchObject({ seen: true, captainSeen: true });
    expect(LINES.gunnhild.script).toMatch(/Gunnhild/);
    expect(LINES['eirik-returns'].script).toMatch(/Eirik/);
  });

  it('keeps Bjarkoy’s huscarls behind its walls when she rides (`holds`)', () => {
    const a = riddenOn();
    const before = armyStrength(townById(a, BJARKOY)!.garrison);
    const later = nights(a, 5);
    expect(armyStrength(townById(later, BJARKOY)!.garrison)).toBeGreaterThanOrEqual(before);
  });
});

describe('the end of the Long Winter', () => {
  it('is Gunnhild overthrown: both her towns taken and her beaten; her captains then leave', () => {
    const a = riddenOn();
    const taken = a.towns.map((t) => (t.owner === 'rival' ? { ...t, owner: 'player' as const } : t));
    expect(checkGoal({ ...a, towns: taken }, def).status).toBe('playing');
    const eirikOnly = { ...a, towns: taken, rival: { ...a.rival!, hero: a.rival!.others![0]!, others: [] } };
    const won = checkGoal(eirikOnly, def);
    expect(won.status).toBe('won');
    expect(rivalHeroes(won)).toEqual([]);
  });

  it('tells the sunrise as the chapter’s ending, and its end card says chapter 4 is being made', () => {
    const c = chapterById('longWinter');
    expect(c.ending).toBe('longWinter-won');
    const script = LINES['longWinter-won'].script;
    for (const w of [/song stops/, /Skoll/, /sun's scent/, /sun comes up/, /fjord/]) expect(script).toMatch(w);
    const end = chapterEnd(c, { ...riddenOn(), status: 'won' }, false, () => true);
    expect(end.title).toBe('Chapter 3 complete');
    expect(end.body[0]).toBe(lineText('longWinter-won'));
    expect(end.body.join(' ')).toMatch(/Chapter 4 is being made, and comes to the full game as a free update\./);
    expect(upcoming({ ...riddenOn(), rival: { ...riddenOn().rival!, seen: true, captainSeen: true }, objects: riddenOn().objects.filter((o) => o.id !== 'skoll' && o.id !== 'angantyr-barrow') }, 3)).toEqual(['longWinter-won']);
    expect(liveObjects(riddenOn()).some((o) => o.id === 'skoll')).toBe(true);
  });
});
