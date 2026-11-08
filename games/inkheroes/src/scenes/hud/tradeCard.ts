import { ourHeroes } from '../../logic/adventure';
import type { Hero } from '../../logic/hero';
import { trade } from '../../logic/heroes';
import { cantGive, giveItem } from '../../logic/storage';
import type { CardSpec } from '../CardScene';
import type { Session } from '../session';

/** The card two heroes of ours meet on: the picked one and hero `otherId`, trading companies until Close. */
export function tradeCard(session: Session, otherId: string): CardSpec {
  const pair = (): readonly [Hero, Hero] => {
    const adv = session.adv;
    return [adv.hero, ourHeroes(adv).find((h) => h.id === otherId) ?? adv.hero];
  };
  const [a, b] = pair();
  return {
    title: `${a.name} meets ${b.name}`,
    body: '',
    trade: {
      heroes: pair,
      change: (armyA, armyB) => {
        const next = trade(session.adv, a.id, armyA, otherId, armyB);
        if (next) session.set(next);
        return !!next;
      },
      give: (side, i) => {
        const [from, to] = side === 0 ? [a.id, otherId] : [otherId, a.id];
        const why = cantGive(session.adv, from, { bag: i }, to);
        if (!why) session.set(giveItem(session.adv, from, { bag: i }, to)!);
        return why;
      },
    },
    buttons: [{ label: 'Close', kind: 'plain', onClick: () => undefined }],
  };
}
