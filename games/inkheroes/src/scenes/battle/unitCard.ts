import type { BattleState, Stack } from '../../logic/battleTypes';
import { creature } from '../../logic/creatures';
import { attackOf, defenseOf, speedOf } from '../../logic/damage';
import { SPELLS } from '../../logic/spells';
import type { CardSpec } from '../CardScene';

/** "7" or "7 (5 + 2)" when the battle changes the creature's own number. */
function stat(now: number, base: number): string {
  return now === base ? `${now}` : `${now} (${base} ${now > base ? '+' : '−'} ${Math.abs(now - base)})`;
}

/** What a stack's traits mean, in a word or two each. */
function traits(s: Stack): string[] {
  const c = creature(s.creature);
  const out: string[] = [];
  if (c.flies) out.push('flies');
  if (c.shots) out.push(`shoots (${s.shots} of ${c.shots} shots left)`);
  if (c.undead) out.push('undead');
  if (c.noRetaliation) out.push('strikes are never answered');
  if ((c.retaliations ?? 1) > 1) out.push(`answers ${c.retaliations} strikes a round`);
  if (c.charge) out.push('charges: +5% damage a hex moved');
  return out;
}

/** The stats card for a stack on the field (opened by clicking it under the "?" cursor, or right-clicking). */
export function unitCardSpec(state: BattleState, s: Stack): CardSpec {
  const c = creature(s.creature);
  const effects = s.effects.map((e) => {
    const spell = Object.values(SPELLS).find((d) => d.effect === e.kind);
    return `${spell?.name ?? e.kind} (${e.rounds} round${e.rounds === 1 ? '' : 's'})`;
  });
  const lines = [
    `Attack ${stat(attackOf(state, s, !c.shots), c.attack)} · Defense ${stat(defenseOf(state, s), c.defense)}`,
    `Damage ${c.minDmg === c.maxDmg ? c.minDmg : `${c.minDmg}–${c.maxDmg}`} · Health ${s.topHp} of ${c.hp}`,
    `Speed ${stat(speedOf(s), c.speed)}${s.defending ? ' · defending' : ''}`,
    ...(traits(s).length ? [`It ${traits(s).join(', ')}.`] : []),
    ...(effects.length ? [`Spells on it: ${effects.join(', ')}.`] : []),
  ];
  const whose = s.side === 0 ? 'Yours' : 'Enemy';
  return {
    title: `${s.count} ${s.count === 1 ? c.name : c.plural} · ${whose}`,
    body: lines.join('\n'),
    buttons: [{ label: 'Close', kind: 'plain', onClick: () => undefined }],
  };
}
